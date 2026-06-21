/**
 * Spec 25 — Hazard-Pattern Combat: balance simulator (§11 acceptance).
 *
 * Drives full encounters through the pure engine with a scripted greedy policy
 * so balance can be asserted in hermetic tests and tuned with evidence —
 * analogous to the Hazard balance sim (`hazard.sim.ts`). Every run is
 * reproducible from its seed (the global RNG singleton is re-seeded per run).
 *
 * The greedy bot reads the active threat phase, races the cheaper-to-clear
 * track, prefers advantaged (free) cards, and powers status-effect bottom
 * actions while dice last — exercising the self-reinforcing die loop, the RPS
 * scaling, and the pressure tracks end to end.
 */

import type { Character } from '../Character/types';
import type { Enemy } from '../Enemy/types';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard,
    resolveThreatPhase, handCards, cardDieCostPreview,
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
}

/** Greedy: play the best card in hand toward clearing the current phase. */
function greedyPlayPhase(state: CombatEncounterState): { state: CombatEncounterState; plays: number; statusPlays: number } {
    let working = state;
    let plays = 0;
    let statusPlays = 0;
    const phase = working.threatPhases[Math.min(working.currentPhaseIndex, working.threatPhases.length - 1)];

    // Up to one pass through the hand (hand is finite, so this terminates).
    let guard = 0;
    while (working.phase === 'phase-play' && working.hand.length > 0 && guard < 12) {
        guard++;
        // Cleared already? Stop and resolve.
        if (working.phaseProgress.dot >= phase.dotPressureRequired
            || working.phaseProgress.control >= phase.controlPressureRequired) {
            break;
        }

        const cards = handCards(working);
        // Which track is cheaper to finish this phase right now?
        const dotGap = Math.max(0, phase.dotPressureRequired - working.phaseProgress.dot);
        const controlGap = Math.max(0, phase.controlPressureRequired - working.phaseProgress.control);
        const targetTrack: 'dot' | 'control' = dotGap <= controlGap ? 'dot' : 'control';

        // Rank candidate offensive cards: target-track first, advantaged (free)
        // first, then by pressure preview.
        const ranked = cards
            .filter(c => c.card.track === 'dot' || c.card.track === 'control' || c.card.verbClass === 'befriend')
            .map(c => ({ ...c, dieCost: cardDieCostPreview(working, c.card) }))
            .sort((a, b) => {
                const at = a.card.track === targetTrack ? 0 : 1;
                const bt = b.card.track === targetTrack ? 0 : 1;
                if (at !== bt) return at - bt;
                if (a.dieCost.cost !== b.dieCost.cost) return a.dieCost.cost - b.dieCost.cost;
                return b.card.bottomPressurePreview - a.card.bottomPressurePreview;
            });

        let played = false;
        for (const cand of ranked) {
            const affordable = cand.dieCost.cost === 0 || availableMatching(working, cand.card.stance) >= cand.dieCost.cost;
            if (affordable) {
                const before = working.pressureTracks;
                const res = playCombatCard(working, { uid: cand.uid }, true);
                // Only count a play that wasn't a fizzle (state changed meaningfully).
                if (res.state !== working) {
                    working = res.state;
                    plays++;
                    if (res.state.pressureTracks.dot > before.dot || res.state.pressureTracks.control > before.control) {
                        const landed = res.events.some(e => e.kind === 'effect-landed' && e.target === 'enemy');
                        if (landed) statusPlays++;
                    }
                    played = true;
                    break;
                }
            }
        }

        if (!played) {
            // No affordable bottom — fall back to a free top action for chip pressure.
            const top = cards.find(c => c.card.track === 'dot' || c.card.track === 'control');
            if (top) {
                const res = playCombatCard(working, { uid: top.uid }, false);
                working = res.state;
                plays++;
            } else if (working.hand.length > 0) {
                // Nothing useful — play the first card's top action to drain the hand.
                const res = playCombatCard(working, { uid: working.hand[0].uid }, false);
                working = res.state;
                plays++;
            } else {
                break;
            }
        }
        if (working.finalOutcome) break;
    }

    return { state: working, plays, statusPlays };
}

function availableMatching(state: CombatEncounterState, color: string): number {
    return state.dice.filter(d => d.state === 'available' && (d.color === color || d.color === 'wild')).length;
}

/** Runs a single seeded encounter and returns its outcome + per-phase marks. */
export function runOneEncounter(
    player: Character,
    enemy: Enemy,
    seed: number,
): { outcome: CombatOutcome; rounds: number; phaseMarks: ('clear' | 'overwhelmed' | 'pending')[]; plays: number; statusPlays: number } {
    let state = initializeCombatEncounter(player, enemy, undefined, seed);
    state = rollEncounterDice(state).state;

    let plays = 0;
    let statusPlays = 0;
    let guard = 0;
    while (state.phase !== 'complete' && state.phase !== 'mercy-choice' && guard < 80) {
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

    return {
        outcome: state.finalOutcome ?? 'defeat',
        rounds: state.round,
        phaseMarks: state.threatMarks,
        plays,
        statusPlays,
    };
}

/**
 * Monte-Carlo simulation: runs `count` seeded encounters and reports
 * Clear/Overwhelmed rates per phase + win/mercy/defeat distribution (§11).
 */
export function simulateHazardPatternCombat(
    player: Character,
    enemy: Enemy,
    count = 300,
    startSeed = 1,
    _policy: CombatSimPolicyId = 'greedy',
): CombatSimStats {
    let victories = 0, mercies = 0, defeats = 0, retreats = 0;
    let totalRounds = 0, totalPlays = 0, totalStatusPlays = 0;
    const phaseCount = Math.max(1, enemy ? 1 : 1);
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
        r.phaseMarks.forEach((m, idx) => {
            phaseSeen[idx] = (phaseSeen[idx] ?? 0) + 1;
            if (m === 'clear') clears[idx] = (clears[idx] ?? 0) + 1;
        });
    }
    void phaseCount;

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
    };
}
