/**
 * Hazard balance simulator — a greedy bot that plays full hazards
 * through the real engine. Used by `e2e/hazard.balance.sim.test.ts` to
 * keep the tuned thresholds inside their target winrate bands.
 *
 * The bot is deliberately decent-but-not-optimal: it stages the best
 * value cards for the unmet meters, fires draw/convert utilities when
 * they obviously help, and spends matching dice only while still short
 * of the round threshold (dice are precious — they never re-cast).
 *
 * Faithful port of the mobile v2 source of truth
 * (`../axiomancer-mobile/state/hazard/sim.ts`).
 */

import {
    continueHazardAfterResolve,
    createHazardSession,
    discardHazardCard,
    finishHazardRolling,
    hazardCardValue,
    hazardProjectedProgress,
    powerHazardCard,
    resolveHazardRound,
    selectHazardRoute,
    stageHazardCard,
} from './hazard.engine';
import { getHazardCardDef, getHazardDef } from './hazard.content';
import {
    type HazardOutcomeTier,
    type HazardRouteKey,
    type HazardSessionState,
} from './hazard.types';

interface RoundNeed {
    needF: number;
    needE: number;
    combined: boolean;
}

function roundNeed(s: HazardSessionState): RoundNeed {
    const def = getHazardDef(s.hazardId);
    if (s.route === 'risk') {
        const [needF, needE] = def.risk.thresholds[s.round - 1];
        return { needF, needE, combined: false };
    }
    return { needF: def.safe.thresholds[s.round - 1], needE: 0, combined: true };
}

function shortfall(s: HazardSessionState): number {
    const need = roundNeed(s);
    const p = hazardProjectedProgress(s);
    if (need.combined) return Math.max(0, need.needF - (p.force + p.escape));
    return Math.max(0, need.needF - p.force) + Math.max(0, need.needE - p.escape);
}

/** Value of a card's FREE row toward whatever is still needed. Hybrids
 *  (purple/gold) count their numbers too — gold's free row is 0/0, so it
 *  contributes nothing until a die is applied. */
function freeValueToward(s: HazardSessionState, cardId: string): number {
    const def = getHazardCardDef(cardId);
    if (def.dead) return 0;
    const need = roundNeed(s);
    const p = hazardProjectedProgress(s);
    if (need.combined) return def.f + def.e;
    const fGap = Math.max(0, need.needF - p.force);
    const eGap = Math.max(0, need.needE - p.escape);
    return Math.min(def.f, fGap + 2) + Math.min(def.e, eGap + 2);
}

function playGreedyRound(s: HazardSessionState, bag: readonly string[]): HazardSessionState {
    // 1. Fire free draw utilities first — more options.
    for (const h of s.hand.slice()) {
        const def = getHazardCardDef(h.cardId);
        if (def.effect === 'draw') s = stageHazardCard(s, h.uid, bag);
    }
    // 2. Convert hex dice when present and we hold cards of that colour.
    const hexCount = s.dice.filter((d) => d.kind === 'hex' && d.state === 'available').length;
    if (hexCount > 0) {
        for (const h of s.hand.slice()) {
            const def = getHazardCardDef(h.cardId);
            if (def.effect === 'convert') {
                const holdsColour = s.hand.some((x) => {
                    const d = getHazardCardDef(x.cardId);
                    return !d.effect && !d.dead && d.kind === def.kind;
                });
                if (holdsColour) s = stageHazardCard(s, h.uid, bag);
            }
        }
    }
    // 3. Stage value cards, best contribution first (the play area is
    //    uncapped; the guard only bounds the loop).
    let guard = 0;
    while (guard++ < 20) {
        const candidates = s.hand
            .map((h) => ({ h, v: freeValueToward(s, h.cardId) }))
            .filter((c) => c.v > 0)
            .sort((a, b) => b.v - a.v);
        if (candidates.length === 0) break;
        s = stageHazardCard(s, candidates[0].h.uid, bag);
    }
    // 4. Scrap the dead weight: hand cards contributing nothing this
    //    round go to the bin for their salvage. Convert cards are held
    //    while hex dice could still appear from a re-cast.
    const anyHex = s.dice.some((d) => d.kind === 'hex');
    for (const h of s.hand.slice()) {
        const def = getHazardCardDef(h.cardId);
        const worthless = def.dead || (!def.effect && freeValueToward(s, h.cardId) === 0);
        const staleUtility =
            (def.effect === 'convert' && !anyHex) || def.effect === 'recast';
        if (worthless || staleUtility) s = discardHazardCard(s, h.uid);
    }
    // 5. Spend matching dice while still short. Best powered delta first.
    guard = 0;
    while (shortfall(s) > 0 && guard++ < 12) {
        const need = roundNeed(s);
        const p = hazardProjectedProgress(s);
        let best: { uid: string; dieId: string; delta: number } | null = null;
        for (const e of s.play) {
            if (e.dieId) continue;
            const def = getHazardCardDef(e.cardId);
            if (def.dead) continue;
            // Prefer an exact-colour die; fall back to the wild gold die.
            const die =
                s.dice.find((d) => d.kind === def.kind && d.state === 'available') ??
                s.dice.find((d) => d.kind === 'gold' && d.state === 'available');
            if (!die) continue;
            const free = hazardCardValue(e);
            const powered = { force: def.fp ?? def.f, escape: def.ep ?? def.e };
            let delta: number;
            if (need.combined) {
                delta = powered.force + powered.escape - (free.force + free.escape);
            } else {
                const fGap = Math.max(0, need.needF - p.force);
                const eGap = Math.max(0, need.needE - p.escape);
                delta =
                    Math.min(powered.force - free.force, fGap) +
                    Math.min(powered.escape - free.escape, eGap);
            }
            if (delta > 0 && (!best || delta > best.delta)) {
                best = { uid: e.uid, dieId: die.id, delta };
            }
        }
        if (!best) break;
        s = powerHazardCard(s, best.uid, best.dieId, bag);
    }
    return s;
}

export interface SimStats {
    runs: number;
    perfect: number;
    complete: number;
    failure: number;
    avgWins: number;
    /** Fractions in [0,1]. */
    perfectRate: number;
    atLeastOneWinRate: number;
    failureRate: number;
}

export function simulateHazard(
    hazardId: string,
    route: HazardRouteKey,
    bag: readonly string[],
    runs: number,
    seedBase = 1000,
): SimStats {
    const tally: Record<HazardOutcomeTier, number> = { perfect: 0, complete: 0, failure: 0 };
    let totalWins = 0;
    for (let i = 0; i < runs; i++) {
        let s = createHazardSession(seedBase + i, bag, hazardId);
        s = finishHazardRolling(selectHazardRoute(s, route, bag));
        while (s.phase === 'playing') {
            s = playGreedyRound(s, bag);
            // resolveHazardRound auto-applies any un-applied staged cards.
            const resolved = resolveHazardRound(s, bag);
            // A round with nothing stageable still has to resolve: stage the
            // least-bad card so the engine can judge it.
            if (resolved === s) {
                if (s.hand.length > 0) {
                    s = stageHazardCard(s, s.hand[0].uid, bag);
                    s = resolveHazardRound(s, bag);
                } else {
                    break;
                }
            } else {
                s = resolved;
            }
            s = continueHazardAfterResolve(s, bag);
        }
        if (s.outcome) {
            tally[s.outcome.tier] += 1;
            totalWins += s.outcome.wins;
        }
    }
    return {
        runs,
        perfect: tally.perfect,
        complete: tally.complete,
        failure: tally.failure,
        avgWins: totalWins / runs,
        perfectRate: tally.perfect / runs,
        atLeastOneWinRate: (tally.perfect + tally.complete) / runs,
        failureRate: tally.failure / runs,
    };
}
