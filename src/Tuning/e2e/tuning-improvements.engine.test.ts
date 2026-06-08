/**
 * Hermetic e2e — the tuning-loop improvements:
 *   - status-effect engagement metric + its place in the health objective
 *   - per-difficulty target bands
 *   - paired-cell significance + confidence in compareHealth
 *   - engagement-collapse regression guard
 *   - generalized, hint-driven, engagement-first heuristic + ledger cooldown
 *   - experiment ledger record / cooldown
 *   - status-leverage strategist learning
 *   - candidate-file validation (the analyst→actuator seam)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { scoreHealth, compareHealth, ENGAGEMENT_FLOOR } from '../health.metrics';
import { cellEngagementShare, cellActivityShare } from '../engagement.metrics';
import { bandFor } from '../difficulty.bands';
import { heuristicRecommendations, validateCandidates } from '../analyst.bridge';
import {
    emptyLedger, recordExperiments, cooldownDirections, saveLedger, loadLedger,
} from '../ledger';
import { emptyKnowledge, updateFromRun, recommendStance, recommendSkill } from '../strategist.knowledge';
import type {
    CellResult, Difficulty, ExperimentResult, HealthScore, TunableParam,
} from '../types';
import type { PlaytestRunSummary } from '../../Playtest/types';

// ─── Builders ─────────────────────────────────────────────────────────────────

type Ev = Record<string, unknown>;
function statusRound(
    action: 'attack' | 'skill', stance: 'heart' | 'body' | 'mind', events: Ev[], skillId?: string,
): unknown {
    return {
        round: 1,
        playerAction: { stance, action, ...(skillId ? { skillId } : {}) },
        enemyAction: { stance: 'heart', action: 'attack' },
        playerHp: 50, enemyHp: 50,
        combatEvents: events,
    };
}

/** A cell whose report carries `runs` so the engagement metric can read it. */
function cellWithRuns(
    cellId: string, difficulty: Difficulty, resolution: number, defeat: number,
    runs: { transcript: unknown[] }[], weight = 1,
): CellResult {
    return {
        cell: { cellId, level: 1, playstyle: 'strategist', difficulty, enemySlug: 'x', runs: runs.length, weight },
        report: { metrics: { resolutionSuccessRate: resolution, defeatRate: defeat }, runs },
    } as unknown as CellResult;
}

/** A transcript-free cell — engagement is "unknown" (no penalty). */
function bandCell(cellId: string, difficulty: Difficulty, resolution: number): CellResult {
    return {
        cell: { cellId, level: 1, playstyle: 'mixed', difficulty, enemySlug: 'x', runs: 10, weight: 1 },
        report: { metrics: { resolutionSuccessRate: resolution, defeatRate: 0.1 } },
    } as unknown as CellResult;
}

const EFFECT_EV: Ev = { phase: 'skill', kind: 'effect-applied', skillId: 'curse', appliedTo: 'enemy', effect: {}, message: '' };
const DMG_EV: Ev = { phase: 'scenario', kind: 'damage-applied', defender: 'enemy', finalDamage: 20 };

function runWith(rounds: unknown[], outcome?: string): { transcript: unknown[]; outcome?: string } {
    return { transcript: rounds, ...(outcome ? { outcome } : {}) };
}

// ─── Engagement metric (activity vs leverage) ─────────────────────────────────────

describe('engagement metric', () => {
    const oneInFour = () => [
        statusRound('skill', 'mind', [EFFECT_EV]), // status
        statusRound('attack', 'body', [DMG_EV]),   // no status
        statusRound('attack', 'body', [DMG_EV]),   // no status
        statusRound('attack', 'body', [DMG_EV]),   // no status
    ];

    it('activity measures the raw share of action rounds with status play', () => {
        const report = { runs: [runWith(oneInFour())] } as never;
        expect(cellActivityShare(report)).toBeCloseTo(0.25, 5);
    });

    it('leverage equals activity when the outcome is unknown (synthetic transcript)', () => {
        const report = { runs: [runWith(oneInFour())] } as never;
        expect(cellEngagementShare(report)).toBeCloseTo(0.25, 5);
    });

    it('leverage discounts status that timed out, but activity is unchanged', () => {
        const report = { runs: [runWith(oneInFour(), 'timeout')] } as never;
        // Same status activity...
        expect(cellActivityShare(report)).toBeCloseTo(0.25, 5);
        // ...but it converted nothing — leverage is heavily discounted (×0.25).
        expect(cellEngagementShare(report)).toBeCloseTo(0.25 * 0.25, 5);
    });

    it('leverage gives full credit when status play resolves the fight', () => {
        const report = { runs: [runWith(oneInFour(), 'victory')] } as never;
        expect(cellEngagementShare(report)).toBeCloseTo(0.25, 5);
    });

    it('is undefined when there is no transcript', () => {
        expect(cellEngagementShare({ } as never)).toBeUndefined();
        expect(cellActivityShare({ } as never)).toBeUndefined();
        expect(cellEngagementShare({ runs: [] } as never)).toBeUndefined();
    });
});

// ─── Witness metric (strategist vs aggressive) ────────────────────────────────────

describe('witness metric', () => {
    /** A transcript-free cell at a given playstyle/resolution (no engagement penalty). */
    function psCell(playstyle: string, resolution: number): CellResult {
        return {
            cell: { cellId: `l1-${playstyle}-normal`, level: 1, playstyle, enemySlug: 'x', difficulty: 'normal', runs: 10, weight: 1 },
            report: { metrics: { resolutionSuccessRate: resolution, defeatRate: 0.1 } },
        } as unknown as CellResult;
    }

    it('reports a positive edge when status play out-resolves basic play', () => {
        const h = scoreHealth([psCell('strategist', 0.7), psCell('aggressive', 0.5)]);
        expect(h.witness).toBeDefined();
        expect(h.witness!.strategistEdge).toBeCloseTo(0.2, 5);
    });

    it('is undefined unless both playstyles ran', () => {
        expect(scoreHealth([psCell('strategist', 0.7)]).witness).toBeUndefined();
    });

    it('rejects a candidate that lets basic attacks gain on status play', () => {
        const a = scoreHealth([psCell('strategist', 0.7), psCell('aggressive', 0.5)]); // edge +0.2
        const b = scoreHealth([psCell('strategist', 0.7), psCell('aggressive', 0.69)]); // edge +0.01
        const cmp = compareHealth(a, b);
        expect(cmp.witnessRegression).toBe(true);
        expect(cmp.winner).toBe('A');
    });
});

// ─── Per-difficulty bands ────────────────────────────────────────────────────────

describe('per-difficulty bands', () => {
    it('targets different success rates per difficulty', () => {
        expect(bandFor('easy').low).toBeGreaterThan(bandFor('normal').low);
        expect(bandFor('hard').high).toBeLessThan(bandFor('normal').high);
    });

    it('an 85% easy cell is in band, but an 85% normal cell is not', () => {
        const easy = scoreHealth([bandCell('a', 'easy', 0.85)]);
        const normal = scoreHealth([bandCell('a', 'normal', 0.85)]);
        expect(easy.aggregateBand).toBe(0);
        expect(normal.aggregateBand).toBeGreaterThan(0);
    });
});

// ─── Engagement in the objective ─────────────────────────────────────────────────

describe('engagement in the objective', () => {
    it('penalises a cell that is in band but below the engagement floor', () => {
        // In-band resolution, but only basic attacks (engagement 0).
        const lowEng = cellWithRuns('a', 'normal', 0.7, 0.1, [runWith([
            statusRound('attack', 'body', [DMG_EV]),
            statusRound('attack', 'body', [DMG_EV]),
        ])]);
        const h = scoreHealth([lowEng]);
        expect(h.aggregateBand).toBe(0);            // resolution is fine
        expect(h.aggregateEngagement).toBeGreaterThan(0); // but the fun collapsed
        expect(h.aggregate).toBeGreaterThan(0);
        expect(h.meanEngagement).toBeLessThan(ENGAGEMENT_FLOOR);
    });
});

// ─── compareHealth: significance + confidence ────────────────────────────────────

describe('compareHealth significance', () => {
    function band(cells: [string, number][]): HealthScore {
        return scoreHealth(cells.map(([id, res]) => bandCell(id, 'normal', res)));
    }

    it('a consistent improvement across many cells is significant with high confidence', () => {
        const ids = Array.from({ length: 10 }, (_, i) => `c${i}`);
        const a = band(ids.map(id => [id, 0.45] as [string, number])); // dev 0.04 each
        const b = band(ids.map(id => [id, 0.65] as [string, number])); // dev 0 each
        const cmp = compareHealth(a, b);
        expect(cmp.winner).toBe('B');
        expect(cmp.significant).toBe(true);
        expect(cmp.confidence).toBe('high');
    });

    it('a better aggregate that is within the noise is NOT kept', () => {
        // One cell improves a lot, the rest are unchanged → mean delta small,
        // spread wide → CI includes 0.
        const a = band([['c0', 0.45], ['c1', 0.65], ['c2', 0.65], ['c3', 0.65]]);
        const b = band([['c0', 0.65], ['c1', 0.65], ['c2', 0.65], ['c3', 0.65]]);
        const cmp = compareHealth(a, b);
        expect(cmp.delta).toBeGreaterThan(0);   // B has the better aggregate
        expect(cmp.significant).toBe(false);     // but not significantly so
        expect(cmp.winner).toBe('A');
    });

    it('falls back to the epsilon floor for a single cell', () => {
        const a = band([['c0', 0.4]]);
        const b = band([['c0', 0.7]]);
        expect(compareHealth(a, b).significant).toBe(true);
    });
});

// ─── compareHealth: engagement-collapse guard ────────────────────────────────────

describe('engagement regression guard', () => {
    it('rejects a band improvement that collapses status play', () => {
        const engaged = runWith([
            statusRound('skill', 'mind', [EFFECT_EV]),
            statusRound('skill', 'mind', [EFFECT_EV]),
        ]);
        const basic = runWith([
            statusRound('attack', 'body', [DMG_EV]),
            statusRound('attack', 'body', [DMG_EV]),
        ]);
        // A: slightly off-band but highly engaged. B: in-band but no status play.
        const a = scoreHealth([cellWithRuns('a', 'normal', 0.6, 0.1, [engaged])]);
        const b = scoreHealth([cellWithRuns('a', 'normal', 0.7, 0.1, [basic])]);
        const cmp = compareHealth(a, b);
        expect(cmp.engagementRegression).toBe(true);
        expect(cmp.winner).toBe('A');
    });
});

// ─── Generalized heuristic ───────────────────────────────────────────────────────

function tunable(id: string, effect: TunableParam['effect'], extra: Partial<TunableParam> = {}): TunableParam {
    return {
        id, kind: 'constant', category: 'fundamental', file: 'f',
        locator: { exportName: 'X' }, min: 0, max: 100, step: 1,
        magnitudeCapPct: 0.5, tags: [], rationale: `knob ${id}`, effect, ...extra,
    };
}

describe('generalized heuristic', () => {
    const enemyScaling = tunable('enemy.statPerLevel', { difficulty: 'raises' });
    const effectDuration = tunable('effect.maxDuration', { engagement: 'raises' });
    const ambiguous = tunable('mystery.knob', undefined);
    const tunables = [enemyScaling, effectDuration, ambiguous];
    const currentValues = { 'enemy.statPerLevel': 4, 'effect.maxDuration': 10, 'mystery.knob': 5 };

    it('corrects low engagement by raising an engagement knob, before difficulty', () => {
        // Low engagement (basic attacks only), in-band resolution.
        const baseline = scoreHealth([cellWithRuns('a', 'normal', 0.7, 0.1, [runWith([
            statusRound('attack', 'body', [DMG_EV]),
            statusRound('attack', 'body', [DMG_EV]),
        ])])]);
        const res = heuristicRecommendations({ baseline, cells: [], focus: {}, tunables, currentValues });
        const eng = res.candidates.find(c => c.paramId === 'effect.maxDuration');
        expect(eng).toBeDefined();
        expect(eng!.proposedValue).toBeGreaterThan(10); // raised to lift engagement
        expect(res.candidates[0]!.paramId).toBe('effect.maxDuration'); // doctrine first
    });

    it('corrects a too-hard matrix by lowering a difficulty-raising knob', () => {
        // Off-band hard (too hard), engagement healthy.
        const baseline = scoreHealth([cellWithRuns('a', 'normal', 0.4, 0.2, [runWith([
            statusRound('skill', 'mind', [EFFECT_EV]),
            statusRound('skill', 'mind', [EFFECT_EV]),
        ])])]);
        const res = heuristicRecommendations({ baseline, cells: [], focus: {}, tunables, currentValues });
        const diff = res.candidates.find(c => c.paramId === 'enemy.statPerLevel');
        expect(diff).toBeDefined();
        expect(diff!.proposedValue).toBeLessThan(4); // lowered to make it easier
    });

    it('skips a (param, direction) on cooldown and notes it', () => {
        const baseline = scoreHealth([cellWithRuns('a', 'normal', 0.4, 0.2, [runWith([
            statusRound('skill', 'mind', [EFFECT_EV]),
        ])])]);
        const cooldown = new Set(['enemy.statPerLevel:down']);
        const res = heuristicRecommendations({ baseline, cells: [], focus: {}, tunables, currentValues, cooldown });
        expect(res.candidates.find(c => c.paramId === 'enemy.statPerLevel')).toBeUndefined();
        expect(res.proposeOnly.some(p => p.summary.includes('cooldown'))).toBe(true);
    });

    it('leaves ambiguous knobs as propose-only', () => {
        const baseline = scoreHealth([bandCell('a', 'normal', 0.4)]);
        const res = heuristicRecommendations({ baseline, cells: [], focus: {}, tunables, currentValues });
        expect(res.candidates.some(c => c.paramId === 'mystery.knob')).toBe(false);
        expect(res.proposeOnly.some(p => p.paramId === 'mystery.knob')).toBe(true);
    });
});

// ─── Ledger ─────────────────────────────────────────────────────────────────────

function experiment(paramId: string, oldV: number, newV: number, kept: boolean): ExperimentResult {
    return {
        candidate: { paramId, proposedValue: newV, rationale: 't', source: 'heuristic' },
        paramId, oldValue: oldV, newValue: newV,
        variantA: {} as never, variantB: {} as never,
        comparison: { winner: kept ? 'B' : 'A', delta: 0.01, significant: kept, confidence: 'medium', regression: false, engagementRegression: false, witnessRegression: false, stats: { meanDelta: 0.01, stdErr: 0, n: 4, ciMargin: 0 }, note: '' },
        kept, verifyPassed: kept, notes: [],
    };
}

describe('experiment ledger', () => {
    it('puts a recently-rejected direction on cooldown', () => {
        const l = emptyLedger();
        recordExperiments(l, [experiment('enemy.statPerLevel', 4, 3.5, false)], { timestamp: 't1' });
        const cd = cooldownDirections(l);
        expect(cd.has('enemy.statPerLevel:down')).toBe(true);
    });

    it('a later keep clears the cooldown', () => {
        const l = emptyLedger();
        recordExperiments(l, [experiment('enemy.statPerLevel', 4, 3.5, false)], { timestamp: 't1' });
        recordExperiments(l, [experiment('enemy.statPerLevel', 4, 3.5, true)], { timestamp: 't2' });
        expect(cooldownDirections(l).has('enemy.statPerLevel:down')).toBe(false);
    });

    it('round-trips through save/load', () => {
        const file = path.join(os.tmpdir(), `ledger-${Date.now()}.json`);
        const l = emptyLedger();
        recordExperiments(l, [experiment('x', 1, 2, false)], { timestamp: 't1' });
        saveLedger(l, file);
        expect(cooldownDirections(loadLedger(file)).has('x:up')).toBe(true);
        fs.rmSync(file, { force: true });
    });
});

// ─── Status-leverage strategist ──────────────────────────────────────────────────

describe('status-leverage strategist', () => {
    it('prefers the high-status stance/skill over the high-damage one', () => {
        const k = emptyKnowledge();
        const run = {
            transcript: [
                // mind: low damage but applies status every time
                statusRound('skill', 'mind', [EFFECT_EV, { phase: 'scenario', kind: 'damage-applied', defender: 'enemy', finalDamage: 2 }], 'curse'),
                statusRound('skill', 'mind', [EFFECT_EV, { phase: 'scenario', kind: 'damage-applied', defender: 'enemy', finalDamage: 2 }], 'curse'),
                statusRound('skill', 'mind', [EFFECT_EV, { phase: 'scenario', kind: 'damage-applied', defender: 'enemy', finalDamage: 2 }], 'curse'),
                // body: high damage, no status
                statusRound('attack', 'body', [DMG_EV]),
                statusRound('attack', 'body', [DMG_EV]),
                statusRound('attack', 'body', [DMG_EV]),
            ],
        } as unknown as PlaytestRunSummary;
        updateFromRun(k, 'rat', run);
        expect(recommendStance(k, 'rat')).toBe('mind');   // status first
        expect(recommendSkill(k, 'rat')).toBe('curse');
    });

    it('falls back to damage when no status was observed', () => {
        const k = emptyKnowledge();
        const run = {
            transcript: [
                statusRound('attack', 'body', [DMG_EV]),
                statusRound('attack', 'body', [DMG_EV]),
                statusRound('attack', 'body', [DMG_EV]),
                statusRound('attack', 'mind', [{ phase: 'scenario', kind: 'damage-applied', defender: 'enemy', finalDamage: 1 }]),
                statusRound('attack', 'mind', [{ phase: 'scenario', kind: 'damage-applied', defender: 'enemy', finalDamage: 1 }]),
                statusRound('attack', 'mind', [{ phase: 'scenario', kind: 'damage-applied', defender: 'enemy', finalDamage: 1 }]),
            ],
        } as unknown as PlaytestRunSummary;
        updateFromRun(k, 'rat', run);
        expect(recommendStance(k, 'rat')).toBe('body'); // damage fallback
    });
});

// ─── Candidate-file validation (analyst → actuator seam) ──────────────────────────

describe('validateCandidates', () => {
    const tunables = [tunable('enemy.statPerLevel', { difficulty: 'raises' })];

    it('keeps only legal, finite candidates and tags them analyst', () => {
        const raw = [
            { paramId: 'enemy.statPerLevel', proposedValue: 3.5, rationale: 'r' },
            { paramId: 'not.real', proposedValue: 1 },
            { paramId: 'enemy.statPerLevel', proposedValue: 'NaN' },
        ];
        const out = validateCandidates(raw, tunables);
        expect(out).toHaveLength(1);
        expect(out[0]!.source).toBe('analyst');
    });

    it('accepts the {candidates:[...]} envelope too', () => {
        const out = validateCandidates({ candidates: [{ paramId: 'enemy.statPerLevel', proposedValue: 3 }] }, tunables);
        expect(out).toHaveLength(1);
    });
});
