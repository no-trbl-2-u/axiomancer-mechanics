/**
 * Spec 25 / 26b — Hazard-Pattern Combat: balance simulator.
 *
 * Drives full encounters through the pure engine with a competent scripted
 * policy so balance can be asserted in hermetic tests and tuned with evidence.
 * Every run is reproducible from its seed (the global RNG singleton is re-seeded
 * per run).
 *
 * The policy models a *competent, read-playing* human under the Spec 26b turn
 * model: each turn it rolls 2 dice, drafts the one that wins the hidden-stance
 * read (preferring a color-match), powers the highest-pressure card toward the
 * cheaper-to-clear track, rides the status-combo loop while statuses land, banks
 * Conviction, and spends it on Signature Skills when they help. This exercises
 * the draft, the read multiplier, the color-match bonus, the combo loop, the
 * token economy, and both win paths end to end.
 */

import type { Character } from '../Character/types';
import type { Enemy } from '../Enemy/types';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard,
    resolveThreatPhase, startTurn, draftStanceDie, endTurn, chooseDraft,
    playSignatureSkill, getDraftedDie, handCards, isPhaseStanceRevealed,
} from './combat.engine';
import type { CombatEncounterState, CombatOutcome } from './combat.encounter.types';

export type CombatSimPolicyId = 'greedy';

export interface CombatSimStats {
    runs: number;
    victories: number;       // DoT Erosion (or HP/exploit kill)
    mercies: number;         // Control Saturation
    defeats: number;
    retreats: number;
    /** Win rate = (victories + mercies) / runs. */
    winRate: number;
    /** Clear rate per authored phase index (0-based). */
    clearRateByPhase: number[];
    avgRounds: number;
    /** Average share of plays that landed a status effect (engagement witness). */
    statusEngagement: number;
    /** Average Conviction spent on Signature Skills per run. */
    avgConvictionSpent: number;
}

const currentPhase = (s: CombatEncounterState) =>
    s.threatPhases[Math.min(s.currentPhaseIndex, s.threatPhases.length - 1)];

const phaseCleared = (s: CombatEncounterState): boolean => {
    const p = currentPhase(s);
    return s.phaseProgress.dot >= p.dotPressureRequired || s.phaseProgress.control >= p.controlPressureRequired;
};

/** Best bottom-action preview the hand offers for a track (0 if none). */
function bestPreviewFor(s: CombatEncounterState, track: 'dot' | 'control'): number {
    let best = 0;
    for (const c of handCards(s)) {
        if (c.card.track === track || (track === 'control' && c.card.verbClass === 'befriend')) {
            best = Math.max(best, c.card.bottomPressurePreview || 1);
        }
    }
    return best;
}

/**
 * How much faster control must look before the bot abandons the DoT line. DoT
 * Erosion converts to a victory reliably (every land is lasting cumulative
 * pressure toward the global threshold); Control Saturation is a flakier, higher
 * bar (it must fully saturate before the enemy's HP is chipped out from under it).
 * So a competent player defaults to racing DoT and only commits to control when
 * it is DECISIVELY the shorter line — which is exactly the control-weak / mercy
 * enemies. Without this bias the bot chases a low nominal control threshold,
 * starves its DoT, and loses fights a pure-DoT deck wins outright.
 */
const CONTROL_BIAS = 1.4;

/**
 * Which track to race THIS phase: the line the hand can actually FINISH soonest
 * (gap ÷ best available card for that track ≈ plays to clear), with a standing
 * preference for DoT unless control is decisively faster (see `CONTROL_BIAS`).
 */
function targetTrack(s: CombatEncounterState): 'dot' | 'control' {
    const p = currentPhase(s);
    const dotGap = Math.max(0, p.dotPressureRequired - s.phaseProgress.dot);
    const controlGap = Math.max(0, p.controlPressureRequired - s.phaseProgress.control);
    const dotBest = bestPreviewFor(s, 'dot');
    const controlBest = bestPreviewFor(s, 'control');
    // No real DoT card in hand → control is the only line worth racing.
    if (dotBest <= 1 && controlBest > 1) return 'control';
    const dotPlays = dotGap / Math.max(1, dotBest);
    const controlPlays = controlGap / Math.max(1, controlBest);
    return controlPlays * CONTROL_BIAS < dotPlays ? 'control' : 'dot';
}

/**
 * The best offensive card in hand for the target track. Prefers the target track,
 * then highest preview. Token-gated cards (which fizzle without a banked
 * Fallacy/Paradox token) are NOT excluded here — `greedyPlayPhase` drains a
 * fizzled card via its free top action and moves on, so an unplayable card never
 * stalls the turn. `notUids` lets the caller skip cards already shown to fizzle
 * this turn.
 */
function bestCard(s: CombatEncounterState, track: 'dot' | 'control', notUids?: Set<string>) {
    const cards = handCards(s)
        .filter(c => (c.card.track === 'dot' || c.card.track === 'control' || c.card.verbClass === 'befriend')
            && !(notUids && notUids.has(c.uid)))
        .sort((a, b) => {
            const at = a.card.track === track ? 0 : 1;
            const bt = b.card.track === track ? 0 : 1;
            if (at !== bt) return at - bt;
            return b.card.bottomPressurePreview - a.card.bottomPressurePreview;
        });
    return cards[0] ?? null;
}

/** Plays a single threat phase to a clear (or hand exhaustion). */
function greedyPlayPhase(state: CombatEncounterState): { state: CombatEncounterState; plays: number; statusPlays: number } {
    let working = state;
    let plays = 0;
    let statusPlays = 0;
    let guard = 0;
    // Cards shown to fizzle this phase (token-gated with no banked token) so the
    // bot stops re-picking an unplayable card.
    const fizzledUids = new Set<string>();

    while (working.phase === 'phase-play' && guard < 60) {
        guard++;
        if (phaseCleared(working)) break;

        // Spend banked Conviction on a Signature Skill when it accelerates the
        // target track or refills a dead hand.
        if (working.conviction >= 4 && handCards(working).length <= 1) {
            const sw = playSignatureSkill(working, 'sig-second-wind');
            if (sw.state !== working) { working = sw.state; continue; }
        }
        if (working.conviction >= 5) {
            const sig = targetTrack(working) === 'control' ? 'sig-overwhelming-argument' : 'sig-conviction-strike';
            const cast = playSignatureSkill(working, sig);
            if (cast.state !== working) { working = cast.state; if (working.finalOutcome) break; continue; }
        }

        // Ensure a drafted die for this turn.
        let drafted = getDraftedDie(working);
        if (!drafted || drafted.state !== 'available' || drafted.color === 'x') {
            if (working.draftedDieId !== null) working = endTurn(working).state;
            if (working.dice.length === 0) {
                const started = startTurn(working);
                working = started.state;
                if (working.phase !== 'phase-play') break;
            }
            const want = bestCard(working, targetTrack(working), fizzledUids);
            const wantStance = want?.card.stance ?? 'wild';
            // Read tax: only seek the advantage die once the phase stance is
            // revealed (after the first contest). Blind on first contact, the bot
            // drafts for a color-match and accepts whatever read luck gives.
            let pick: string | null;
            if (isPhaseStanceRevealed(working, working.currentPhaseIndex)) {
                pick = chooseDraft(working.dice, wantStance, currentPhase(working).enemyStance);
            } else {
                const usable = working.dice.filter(d => d.state === 'available' && d.color !== 'x');
                pick = (usable.find(d => d.color === 'wild' || d.color === wantStance) ?? usable[0] ?? working.dice[0])?.id ?? null;
            }
            if (!pick) break;
            working = draftStanceDie(working, pick).state;
            drafted = getDraftedDie(working);
            if (!drafted || drafted.state !== 'available' || drafted.color === 'x') {
                // Forced X draft — bank the token, drain a card via top, end the turn.
                const top = handCards(working)[0];
                if (top) { working = playCombatCard(working, { uid: top.uid }, false).state; plays++; }
                working = endTurn(working).state;
                if (handCards(working).length === 0 && working.dice.length === 0) break;
                continue;
            }
        }

        // Power the best playable card with the drafted die; ride the combo loop.
        const want = bestCard(working, targetTrack(working), fizzledUids);
        if (!want) {
            // Nothing playable left — chip with a free top, then end the turn.
            const top = handCards(working)[0];
            if (top) { working = playCombatCard(working, { uid: top.uid }, false).state; plays++; }
            working = endTurn(working).state;
            if (handCards(working).length === 0 && working.dice.length === 0) break;
            continue;
        }

        const before = working.pressureTracks;
        const res = playCombatCard(working, { uid: want.uid }, true);
        const fizzled = res.events.some(e => e.kind === 'effect-fizzled');
        if (fizzled) {
            // Token-gated (needs a banked Fallacy/Paradox token the player lacks) —
            // drain THIS card via its free top action (+1 to its track) and keep the
            // drafted die for a playable card. It's discarded, so it won't re-appear.
            fizzledUids.add(want.uid);
            working = playCombatCard(working, { uid: want.uid }, false).state;
            plays++;
            continue;
        }
        working = res.state;
        plays++;
        const landed = res.events.some(e => e.kind === 'effect-landed' && e.target === 'enemy');
        if (landed && (working.pressureTracks.dot > before.dot || working.pressureTracks.control > before.control)) {
            statusPlays++;
        }
        if (working.finalOutcome) break;

        // If the die was spent (no status land), end the turn to re-roll.
        const after = getDraftedDie(working);
        if (!after || after.state !== 'available') working = endTurn(working).state;
    }

    return { state: working, plays, statusPlays };
}

/** Runs a single seeded encounter and returns its outcome + per-phase marks. */
export function runOneEncounter(
    player: Character,
    enemy: Enemy,
    seed: number,
): { outcome: CombatOutcome; rounds: number; phaseMarks: ('clear' | 'overwhelmed' | 'pending')[]; plays: number; statusPlays: number; convictionSpent: number } {
    let state = initializeCombatEncounter(player, enemy, undefined, seed);
    state = rollEncounterDice(state).state; // opens phase-play + rolls turn 1

    let plays = 0;
    let statusPlays = 0;
    let guard = 0;
    while (state.phase !== 'complete' && state.phase !== 'mercy-choice' && guard < 120) {
        guard++;
        if (state.phase === 'phase-play') {
            const r = greedyPlayPhase(state);
            state = r.state;
            plays += r.plays;
            statusPlays += r.statusPlays;
            if (state.finalOutcome) break;
            if (state.phase === 'phase-play') {
                state = resolveThreatPhase(state).state;
            }
        } else {
            break;
        }
    }

    // Conviction earned ≈ one per turn + read wins; spent = earned − leftover. We
    // approximate spend via the cap of earned: track leftover only.
    const convictionSpent = Math.max(0, state.turn - state.conviction);

    return {
        outcome: state.finalOutcome ?? 'defeat',
        rounds: state.round,
        phaseMarks: state.threatMarks,
        plays,
        statusPlays,
        convictionSpent,
    };
}

/**
 * Monte-Carlo simulation: runs `count` seeded encounters and reports
 * Clear/Overwhelmed rates per phase + win/mercy/defeat distribution.
 */
export function simulateHazardPatternCombat(
    player: Character,
    enemy: Enemy,
    count = 300,
    startSeed = 1,
    _policy: CombatSimPolicyId = 'greedy',
): CombatSimStats {
    let victories = 0, mercies = 0, defeats = 0, retreats = 0;
    let totalRounds = 0, totalPlays = 0, totalStatusPlays = 0, totalConviction = 0;
    const clears: number[] = [];
    const phaseSeen: number[] = [];

    for (let i = 0; i < count; i++) {
        const r = runOneEncounter(player, enemy, startSeed + i);
        if (r.outcome === 'victory') victories++;
        else if (r.outcome === 'mercy') mercies++;
        else if (r.outcome === 'retreat') retreats++;
        else defeats++;
        totalRounds += r.rounds;
        totalPlays += r.plays;
        totalStatusPlays += r.statusPlays;
        totalConviction += r.convictionSpent;
        r.phaseMarks.forEach((m, idx) => {
            phaseSeen[idx] = (phaseSeen[idx] ?? 0) + 1;
            if (m === 'clear') clears[idx] = (clears[idx] ?? 0) + 1;
        });
    }

    const clearRateByPhase = phaseSeen.map((seen, idx) => (seen > 0 ? (clears[idx] ?? 0) / seen : 0));

    return {
        runs: count,
        victories,
        mercies,
        defeats,
        retreats,
        winRate: (victories + mercies) / count,
        clearRateByPhase,
        avgRounds: totalRounds / count,
        statusEngagement: totalPlays > 0 ? totalStatusPlays / totalPlays : 0,
        avgConvictionSpent: totalConviction / count,
    };
}
