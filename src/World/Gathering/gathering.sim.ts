/**
 * Gathering minigame — deterministic simulation harness.
 *
 * Drives full sessions through the pure engine with scripted player
 * policies so balance can be asserted in hermetic tests (and tuned with
 * evidence, mirroring the hazard sim). No I/O, no Math.random — every
 * run is reproducible from its seed.
 *
 * Policies:
 *  - `timid`    — gleans, pays what the place asks, takes only cheap
 *                 plots, leaves early. The restraint baseline.
 *  - `balanced` — gleans, descends deliberately, pays offerings under
 *                 pressure, leaves before despoilment.
 *  - `greedy`   — strips, takes the richest plot every time, never pays,
 *                 never leaves. The eruption baseline.
 */

import { getGatherPlotDef, GATHERING_SITES } from './gathering.content';
import {
    acknowledgeGatheringOutcome,
    canPayGatheringOffering,
    claimGatheringSpoils,
    continueGatheringAfterReprisal,
    createGatheringSession,
    descendGathering,
    gatheringHarvestWrath,
    gatheringHarvestYield,
    harvestGatheringPlot,
    payGatheringOffering,
    selectGatheringApproach,
    withdrawFromGathering,
} from './gathering.engine';
import type { GatherOutcome, GatherOutcomeTier, GatherPlotEntry, GatheringSessionState } from './gathering.types';

export type GatherPolicyId = 'timid' | 'balanced' | 'greedy';

type PolicyAction =
    | { type: 'harvest'; uid: string }
    | { type: 'descend' }
    | { type: 'offer'; id: string }
    | { type: 'withdraw' };

interface PolicyCtx {
    /** Taking harvests made at the current depth (resets on descend). */
    harvestsAtDepth: number;
}

function scoredPlots(s: GatheringSessionState): { entry: GatherPlotEntry; yieldR: number; wrath: number; breath: boolean }[] {
    return s.spread.map((entry) => {
        const def = getGatherPlotDef(entry.plotId);
        return {
            entry,
            yieldR: gatheringHarvestYield(s, def),
            wrath: gatheringHarvestWrath(s, def),
            breath: def.trait === 'breath',
        };
    });
}

function firstPayableOffering(s: GatheringSessionState): string | null {
    for (const o of s.offerings) {
        if (o.paid) continue;
        if (canPayGatheringOffering(s, o.id).payable) return o.id;
    }
    return null;
}

function timidPolicy(s: GatheringSessionState): PolicyAction {
    if (s.wrath >= 4) {
        const offer = firstPayableOffering(s);
        if (offer) return { type: 'offer', id: offer };
    }
    if (s.wrath >= 5 || s.turn >= 6) return { type: 'withdraw' };
    const plots = scoredPlots(s);
    const cheap = plots
        .filter((p) => !p.breath && p.wrath <= 1 && p.yieldR > 0)
        .sort((a, b) => b.yieldR - a.yieldR || a.wrath - b.wrath)[0];
    if (cheap) return { type: 'harvest', uid: cheap.entry.uid };
    const breath = plots.find((p) => p.breath);
    if (breath && s.wrath > 0) return { type: 'harvest', uid: breath.entry.uid };
    return { type: 'withdraw' };
}

function balancedPolicy(s: GatheringSessionState, ctx: PolicyCtx): PolicyAction {
    if (s.wrath >= 5) {
        const offer = firstPayableOffering(s);
        if (offer) return { type: 'offer', id: offer };
    }
    // Leave BELOW the despoilment line (8) — the scar is never worth it.
    if (s.wrath >= 7 || s.turn >= 9) return { type: 'withdraw' };
    if (ctx.harvestsAtDepth >= 3 && s.depth < 2) return { type: 'descend' };
    const plots = scoredPlots(s);
    if (s.wrath >= 6) {
        const breath = plots.find((p) => p.breath);
        if (breath) return { type: 'harvest', uid: breath.entry.uid };
    }
    // Only take what keeps wrath below the despoilment line — the
    // preview cost is on the card; a sensible player reads it.
    const best = plots
        .filter((p) => !p.breath && p.yieldR > 0 && s.wrath + p.wrath < 8)
        .sort((a, b) => b.yieldR - a.yieldR - (b.wrath - a.wrath) || a.wrath - b.wrath)[0];
    if (best) return { type: 'harvest', uid: best.entry.uid };
    const soothe = plots.find((p) => p.breath);
    if (soothe && s.wrath >= 3) return { type: 'harvest', uid: soothe.entry.uid };
    if (s.depth < 2 && s.wrath < 6) return { type: 'descend' };
    return { type: 'withdraw' };
}

function greedyPolicy(s: GatheringSessionState): PolicyAction {
    const plots = scoredPlots(s);
    const best = plots
        .filter((p) => !p.breath && p.yieldR > 0)
        .sort((a, b) => b.yieldR - a.yieldR)[0];
    if (best) return { type: 'harvest', uid: best.entry.uid };
    if (s.depth < 2) return { type: 'descend' };
    return { type: 'withdraw' };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export interface GatherSimRunResult {
    seed: number;
    siteId: string;
    policy: GatherPolicyId;
    outcome: GatherOutcome;
    turns: number;
    keptRichness: number;
}

const POLICY_APPROACH: Record<GatherPolicyId, 'glean' | 'strip'> = {
    timid: 'glean',
    balanced: 'glean',
    greedy: 'strip',
};

/** Plays one full session to `done` and returns the outcome. */
export function simulateGathering(seed: number, siteId: string, policy: GatherPolicyId): GatherSimRunResult {
    let s = createGatheringSession(seed, siteId);
    s = selectGatheringApproach(s, POLICY_APPROACH[policy]);
    const ctx: PolicyCtx = { harvestsAtDepth: 0 };
    let guard = 0;
    while (s.phase !== 'done' && guard++ < 400) {
        if (s.phase === 'reprisal') {
            s = continueGatheringAfterReprisal(s);
            continue;
        }
        if (s.phase === 'outcome') {
            s = acknowledgeGatheringOutcome(s);
            continue;
        }
        if (s.phase === 'rewards') {
            s = claimGatheringSpoils(s);
            continue;
        }
        // foraging
        const action =
            policy === 'timid' ? timidPolicy(s) : policy === 'balanced' ? balancedPolicy(s, ctx) : greedyPolicy(s);
        if (action.type === 'harvest') {
            const before = s.metrics.harvests;
            s = harvestGatheringPlot(s, action.uid);
            if (s.metrics.harvests > before) ctx.harvestsAtDepth += 1;
        } else if (action.type === 'descend') {
            const next = descendGathering(s);
            if (next === s) {
                s = withdrawFromGathering(s);
            } else {
                s = next;
                ctx.harvestsAtDepth = 0;
            }
        } else if (action.type === 'offer') {
            const next = payGatheringOffering(s, action.id);
            // A refused offering must not stall the loop.
            s = next === s ? withdrawFromGathering(s) : next;
        } else {
            s = withdrawFromGathering(s);
        }
    }
    const outcome = s.outcome;
    if (!outcome) throw new Error(`Sim did not finish (seed ${seed}, ${policy})`);
    return {
        seed,
        siteId,
        policy,
        outcome,
        turns: s.turn,
        keptRichness: outcome.kept.reduce((sum, p) => sum + p.richness, 0),
    };
}

export interface GatherSimSummary {
    runs: number;
    policy: GatherPolicyId;
    tiers: Record<GatherOutcomeTier, number>;
    eruptionRate: number;
    communionRate: number;
    avgKeptRichness: number;
    avgTurns: number;
    avgShillings: number;
    avgBitten: number;
}

export interface RunGatheringSimOptions {
    runs: number;
    policy: GatherPolicyId;
    /** Pin one site; omitted = rotate through the library. */
    siteId?: string;
    startSeed?: number;
}

export function runGatheringSim(options: RunGatheringSimOptions): GatherSimSummary {
    const { runs, policy, siteId, startSeed = 1 } = options;
    const tiers: Record<GatherOutcomeTier, number> = { communion: 0, laden: 0, despoiled: 0, routed: 0 };
    let keptRichness = 0;
    let turns = 0;
    let shillings = 0;
    let bitten = 0;
    for (let i = 0; i < runs; i++) {
        const site = siteId ?? GATHERING_SITES[i % GATHERING_SITES.length].id;
        const result = simulateGathering(startSeed + i * 7919, site, policy);
        tiers[result.outcome.tier] += 1;
        keptRichness += result.keptRichness;
        turns += result.turns;
        shillings += result.outcome.shillings;
        bitten += result.outcome.bittenVitae;
    }
    return {
        runs,
        policy,
        tiers,
        eruptionRate: tiers.routed / runs,
        communionRate: tiers.communion / runs,
        avgKeptRichness: keptRichness / runs,
        avgTurns: turns / runs,
        avgShillings: shillings / runs,
        avgBitten: bitten / runs,
    };
}
