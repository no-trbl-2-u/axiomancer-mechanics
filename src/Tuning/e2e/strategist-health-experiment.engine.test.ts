/**
 * Hermetic e2e — strategist knowledge, health scoring, and the A/B experiment
 * runner (with fully injected, in-memory dependencies).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
    emptyKnowledge, updateFromRun, recommendStance, recommendSkill,
    saveKnowledge, loadKnowledge,
} from '../strategist.knowledge';
import { scoreHealth, compareHealth } from '../health.metrics';
import { runExperiment, type ExperimentDeps } from '../experiment.runner';
import type { CellResult, MatrixPlan } from '../types';
import type { PlaytestRunSummary } from '../../Playtest/types';
import type { ApplyResult } from '../tunable.applier';

// ─── Strategist knowledge ──────────────────────────────────────────────────────

function synthRun(stanceDamage: { stance: 'heart' | 'body' | 'mind'; dmg: number; skillId?: string }[]): PlaytestRunSummary {
    const transcript = stanceDamage.map((s, i) => ({
        round: i + 1,
        playerAction: { stance: s.stance, action: 'attack' as const, ...(s.skillId ? { action: 'skill' as const, skillId: s.skillId } : {}) },
        enemyAction: { stance: 'heart' as const, action: 'attack' as const },
        playerHp: 50, enemyHp: 50,
        combatEvents: [
            { phase: 'scenario', kind: 'damage-applied', defender: 'enemy', finalDamage: s.dmg },
        ],
    }));
    return { transcript } as unknown as PlaytestRunSummary;
}

describe('strategist knowledge', () => {
    it('learns the highest-damage stance and skill across runs', () => {
        const k = emptyKnowledge();
        // Body deals far more than mind/heart over enough samples.
        updateFromRun(k, 'rat', synthRun([
            { stance: 'body', dmg: 20, skillId: 'big-hit' },
            { stance: 'body', dmg: 22, skillId: 'big-hit' },
            { stance: 'body', dmg: 18, skillId: 'big-hit' },
            { stance: 'mind', dmg: 2 },
            { stance: 'mind', dmg: 3 },
            { stance: 'mind', dmg: 1 },
        ]));
        expect(recommendStance(k, 'rat')).toBe('body');
        expect(recommendSkill(k, 'rat')).toBe('big-hit');
    });

    it('returns undefined below the minimum sample threshold', () => {
        const k = emptyKnowledge();
        updateFromRun(k, 'rat', synthRun([{ stance: 'body', dmg: 9 }]));
        expect(recommendStance(k, 'rat')).toBeUndefined();
    });

    it('round-trips through save/load', () => {
        const file = path.join(os.tmpdir(), `know-${Date.now()}.json`);
        const k = emptyKnowledge();
        updateFromRun(k, 'rat', synthRun([
            { stance: 'mind', dmg: 10 }, { stance: 'mind', dmg: 11 }, { stance: 'mind', dmg: 12 },
        ]));
        saveKnowledge(k, file);
        const loaded = loadKnowledge(file);
        expect(recommendStance(loaded, 'rat')).toBe('mind');
        fs.rmSync(file, { force: true });
    });
});

// ─── Health scoring ─────────────────────────────────────────────────────────────

function cell(cellId: string, resolution: number, defeat: number, weight = 1): CellResult {
    return {
        cell: { cellId, level: 1, playstyle: 'mixed', difficulty: 'normal', enemySlug: 'x', runs: 10, weight },
        report: { metrics: { resolutionSuccessRate: resolution, defeatRate: defeat } },
    } as unknown as CellResult;
}

describe('health scoring', () => {
    it('scores 0 deviation when all cells sit in the band (no transcript ⇒ no engagement penalty)', () => {
        const h = scoreHealth([cell('a', 0.7, 0.2), cell('b', 0.68, 0.25)]);
        expect(h.aggregate).toBe(0);
        // Synthetic reports carry no runs, so engagement is unknown, not penalised.
        expect(h.meanEngagement).toBe(1);
    });

    it('compareHealth prefers the lower-deviation variant', () => {
        const a = scoreHealth([cell('a', 0.4, 0.5)]); // far below band
        const b = scoreHealth([cell('a', 0.7, 0.2)]); // in band
        expect(compareHealth(a, b).winner).toBe('B');
    });

    it('rejects a candidate that spikes worst-cell defeat (regression)', () => {
        const a = scoreHealth([cell('a', 0.5, 0.2)]);
        const b = scoreHealth([cell('a', 0.72, 0.6)]); // better band, but defeat exploded
        const cmp = compareHealth(a, b);
        expect(cmp.regression).toBe(true);
        expect(cmp.winner).toBe('A');
    });
});

// ─── Experiment runner ──────────────────────────────────────────────────────────

const PLAN: MatrixPlan = { cells: [], baseSeed: 's', focus: {} };

function makeDeps(over: Partial<ExperimentDeps>): ExperimentDeps {
    return {
        runVariant: () => scoreHealth([cell('a', 0.7, 0.2)]),
        read: () => 3,
        apply: (id, value): ApplyResult => ({
            ok: true,
            param: { id } as never,
            oldValue: 3,
            newValue: value,
            diff: `${id}: 3 → ${value}`,
            backup: { file: 'fake', content: 'orig' },
        }),
        restore: () => { /* noop */ },
        verify: () => true,
        ...over,
    };
}

describe('experiment runner', () => {
    const baselineA = scoreHealth([cell('a', 0.4, 0.5)]); // unhealthy baseline

    it('keeps a winning, verify-passing candidate', () => {
        const deps = makeDeps({ runVariant: () => scoreHealth([cell('a', 0.7, 0.2)]) });
        const r = runExperiment(PLAN, { paramId: 'enemy.statPerLevel', proposedValue: 2.5, rationale: 't', source: 'heuristic' }, baselineA, deps);
        expect(r.comparison.winner).toBe('B');
        expect(r.kept).toBe(true);
        expect(r.verifyPassed).toBe(true);
    });

    it('restores a losing candidate', () => {
        let restored = false;
        const deps = makeDeps({
            runVariant: () => scoreHealth([cell('a', 0.3, 0.6)]), // worse than baseline
            restore: () => { restored = true; },
        });
        const r = runExperiment(PLAN, { paramId: 'enemy.statPerLevel', proposedValue: 5, rationale: 't', source: 'heuristic' }, baselineA, deps);
        expect(r.kept).toBe(false);
        expect(restored).toBe(true);
    });

    it('restores when B wins but verify fails', () => {
        let restored = false;
        const deps = makeDeps({
            runVariant: () => scoreHealth([cell('a', 0.7, 0.2)]),
            verify: () => false,
            restore: () => { restored = true; },
        });
        const r = runExperiment(PLAN, { paramId: 'enemy.statPerLevel', proposedValue: 2.5, rationale: 't', source: 'heuristic' }, baselineA, deps);
        expect(r.kept).toBe(false);
        expect(r.verifyPassed).toBe(false);
        expect(restored).toBe(true);
    });

    it('treats an unregistered param as propose-only without applying', () => {
        let applied = false;
        const deps = makeDeps({ apply: () => { applied = true; return { ok: false } as unknown as ApplyResult; } });
        const r = runExperiment(PLAN, { paramId: 'not.a.real.param', proposedValue: 1, rationale: 't', source: 'analyst' }, baselineA, deps);
        expect(r.kept).toBe(false);
        expect(applied).toBe(false);
    });
});
