/**
 * Hazard-Pattern Combat — balance simulator (HP model).
 *
 * Drives full encounters through the pure engine with a competent scripted policy
 * so balance can be asserted in hermetic tests and tuned with evidence. The win
 * condition is enemy HP → 0; status effects do the heavy lifting (DoT erodes HP;
 * control hinders the enemy's turn), strikes are the weak baseline. Every run is
 * reproducible from its seed.
 *
 * The policy models a read-playing human: each turn it rolls 2 dice, drafts the
 * one that wins the hidden-stance read (preferring a color-match), powers the best
 * STATUS card (favouring a NEW distinct status for the combo refresh), rides the
 * combo loop, banks Conviction and spends it on damaging Signatures, and Befriends
 * a low-HP foe to take the mercy/spare path.
 */

import type { Character } from '../Character/types';
import type { Enemy } from '../Enemy/types';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard,
    resolveThreatPhase, startTurn, draftStanceDie, endTurn, chooseDraft,
    playSignatureSkill, getDraftedDie, handCards, selectMercyChoice, getSignatureSkill,
} from './combat.engine';
import type { CombatEncounterState, CombatOutcome } from './combat.encounter.types';

export type CombatSimPolicyId = 'greedy';

export interface CombatSimStats {
    runs: number;
    victories: number;       // enemy HP → 0
    mercies: number;         // spared a low-HP foe via Befriend
    defeats: number;
    retreats: number;
    /** Win rate = (victories + mercies) / runs. */
    winRate: number;
    avgRounds: number;
    /** Average share of plays that landed a status effect on the enemy (engagement witness). */
    statusEngagement: number;
    /** Average Conviction spent on Signature Skills per run. */
    avgConvictionSpent: number;
}

const currentPhase = (s: CombatEncounterState) =>
    s.threatPhases[Math.min(s.currentPhaseIndex, s.threatPhases.length - 1)];

/**
 * The best card in hand to POWER now: Befriend a low-HP foe (to open mercy);
 * else prefer a status NEW to the board (combo refresh + fresh DoT), then any
 * status card over a pure strike, then the highest preview. Token-gated cards
 * that fizzle are skipped via `notUids`.
 */
function bestCard(s: CombatEncounterState, notUids?: Set<string>) {
    const activeIds = new Set(s.enemy.effects.map(e => e.effectId));
    const lowHp = s.enemy.health <= s.enemy.maxHealth * 0.30;
    const cards = handCards(s)
        .filter(c => c.card.verbClass !== 'retreat' && !(notUids && notUids.has(c.uid)))
        .sort((a, b) => {
            if (lowHp) {
                const ab = a.card.verbClass === 'befriend' ? 0 : 1;
                const bb = b.card.verbClass === 'befriend' ? 0 : 1;
                if (ab !== bb) return ab - bb;
            }
            // Variety: a status the enemy doesn't yet carry refreshes the die.
            const af = a.card.primaryEffectId && !activeIds.has(a.card.primaryEffectId) ? 0 : 1;
            const bf = b.card.primaryEffectId && !activeIds.has(b.card.primaryEffectId) ? 0 : 1;
            if (af !== bf) return af - bf;
            // Status (DoT/control) beats a pure strike (status is the efficient damage).
            const at = a.card.track !== 'none' ? 0 : 1;
            const bt = b.card.track !== 'none' ? 0 : 1;
            if (at !== bt) return at - bt;
            return b.card.bottomPressurePreview - a.card.bottomPressurePreview;
        });
    return cards[0] ?? null;
}

/** An affordable damaging/control Signature to spend banked Conviction on. */
function bestSignature(s: CombatEncounterState): string | null {
    for (const id of s.signatures) {
        const sig = getSignatureSkill(id);
        if (!sig || s.conviction < sig.cost) continue;
        if (['dot', 'strike', 'pressure', 'control', 'mercy'].includes(sig.kind)) return id;
    }
    return null;
}

/** Plays a single threat phase to a stop (enemy dead, mercy opened, or hand/dice out). */
function greedyPlayPhase(state: CombatEncounterState): { state: CombatEncounterState; plays: number; statusPlays: number } {
    let working = state;
    let plays = 0;
    let statusPlays = 0;
    let guard = 0;
    const fizzledUids = new Set<string>();

    while (working.phase === 'phase-play' && guard < 60) {
        guard++;
        if (working.finalOutcome || working.mercyChoiceActive) break;

        // Spend banked Conviction on a damaging Signature when flush.
        if (working.conviction >= 7) {
            const sigId = bestSignature(working);
            if (sigId) {
                const cast = playSignatureSkill(working, sigId);
                if (cast.state !== working) { working = cast.state; if (working.finalOutcome) break; continue; }
            }
        }

        // Ensure a usable drafted die for this turn.
        let drafted = getDraftedDie(working);
        if (!drafted || drafted.state !== 'available' || drafted.color === 'x') {
            if (working.draftedDieId !== null) working = endTurn(working).state;
            if (working.dice.length === 0) {
                working = startTurn(working).state;
                if (working.phase !== 'phase-play') break;
            }
            const want = bestCard(working, fizzledUids);
            const pick = chooseDraft(working.dice, want?.card.stance ?? 'wild', currentPhase(working).enemyStance);
            if (!pick) break;
            working = draftStanceDie(working, pick).state;
            drafted = getDraftedDie(working);
            if (!drafted || drafted.state !== 'available' || drafted.color === 'x') {
                // Forced X — chip with a free top, then end the turn.
                const top = handCards(working)[0];
                if (top) { working = playCombatCard(working, { uid: top.uid }, false).state; plays++; }
                working = endTurn(working).state;
                if (handCards(working).length === 0 && working.dice.length === 0) break;
                continue;
            }
        }

        const want = bestCard(working, fizzledUids);
        if (!want) {
            const top = handCards(working)[0];
            if (top) { working = playCombatCard(working, { uid: top.uid }, false).state; plays++; }
            working = endTurn(working).state;
            if (handCards(working).length === 0 && working.dice.length === 0) break;
            continue;
        }

        const res = playCombatCard(working, { uid: want.uid }, true);
        if (res.events.some(e => e.kind === 'effect-fizzled')) {
            // Token-gated with no banked token — drain via the free top and skip it.
            fizzledUids.add(want.uid);
            working = playCombatCard(working, { uid: want.uid }, false).state;
            plays++;
            continue;
        }
        working = res.state;
        plays++;
        if (res.events.some(e => e.kind === 'effect-landed' && e.target === 'enemy')) statusPlays++;
        if (working.finalOutcome || working.mercyChoiceActive) break;

        const after = getDraftedDie(working);
        if (!after || after.state !== 'available') working = endTurn(working).state;
    }

    return { state: working, plays, statusPlays };
}

/** Runs a single seeded encounter and returns its outcome. */
export function runOneEncounter(
    player: Character,
    enemy: Enemy,
    seed: number,
): { outcome: CombatOutcome; rounds: number; plays: number; statusPlays: number; convictionSpent: number } {
    let state = initializeCombatEncounter(player, enemy, undefined, seed);
    state = rollEncounterDice(state).state;

    let plays = 0;
    let statusPlays = 0;
    let guard = 0;
    while (state.phase !== 'complete' && guard < 200) {
        guard++;
        // A Befriend success opens the spare/exploit choice — take mercy (spare).
        if (state.mercyChoiceActive) {
            state = selectMercyChoice(state, 'spare').state;
            break;
        }
        if (state.phase === 'phase-play') {
            const r = greedyPlayPhase(state);
            state = r.state;
            plays += r.plays;
            statusPlays += r.statusPlays;
            if (state.finalOutcome) break;
            if (state.mercyChoiceActive) { state = selectMercyChoice(state, 'spare').state; break; }
            if (state.phase === 'phase-play') state = resolveThreatPhase(state).state;
        } else {
            break;
        }
    }

    const convictionSpent = Math.max(0, state.turn - state.conviction);

    return {
        outcome: state.finalOutcome ?? 'defeat',
        rounds: state.round,
        plays,
        statusPlays,
        convictionSpent,
    };
}

/**
 * Monte-Carlo simulation: runs `count` seeded encounters and reports the
 * win/mercy/defeat distribution + engagement witnesses.
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
    }

    return {
        runs: count,
        victories,
        mercies,
        defeats,
        retreats,
        winRate: (victories + mercies) / count,
        avgRounds: totalRounds / count,
        statusEngagement: totalPlays > 0 ? totalStatusPlays / totalPlays : 0,
        avgConvictionSpent: totalConviction / count,
    };
}
