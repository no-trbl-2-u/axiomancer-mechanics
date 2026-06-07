/**
 * Hermetic e2e — status-effect doctrine detection in the analyst.
 *
 * Verifies the analyst flags "basic actions out-weigh skills" and emits remedy
 * suggestions (plus a registry-backed skill-payoff candidate) when aggressive
 * out-resolves strategist or skill-action share is low.
 */

import { describe, it, expect } from 'vitest';

import { doctrineSuggestions, heuristicRecommendations } from '../analyst.bridge';
import type { AnalystRequest, CellResult, HealthScore, TunableParam } from '../types';

function cell(playstyle: string, resolution: number, skillShare: number): CellResult {
    return {
        cell: {
            cellId: `${playstyle}-c`, level: 15, playstyle: playstyle as never,
            difficulty: 'normal', enemySlug: 'e', runs: 10, weight: 1,
        },
        report: {
            metrics: {
                resolutionSuccessRate: resolution,
                actionUse: {
                    skill: Math.round(skillShare * 100),
                    attack: Math.round((1 - skillShare) * 100),
                },
            },
        } as unknown as CellResult['report'],
    };
}

const BASELINE: HealthScore = {
    perCell: [],
    aggregate: 0.1,
    targetBand: { low: 0.65, high: 0.75 },
    maxDefeatRate: 0.1,
    summary: 'test baseline',
};

const SKILL_MUL: TunableParam = {
    id: 'combat.skillStatMultiplier', kind: 'multiplier', category: 'fundamental',
    file: 'src/Game/game-mechanics.constants.ts',
    locator: { exportName: 'SKILL_STAT_MULTIPLIER' },
    min: 0.25, max: 1, step: 0.05, magnitudeCapPct: 0.25,
    tags: ['skill'], rationale: 'skill damage scaling',
};

function req(cells: CellResult[]): AnalystRequest {
    return {
        baseline: BASELINE,
        cells,
        focus: {},
        tunables: [SKILL_MUL],
        currentValues: { 'combat.skillStatMultiplier': 0.5 },
    };
}

describe('analyst — status-effect doctrine', () => {
    it('flags basic-attack dominance when aggressive out-resolves strategist', () => {
        const out = doctrineSuggestions(req([
            cell('aggressive', 0.85, 0.6),
            cell('strategist', 0.72, 0.6),
        ]));
        expect(out.proposeOnly.some(p => /out-weigh skills/i.test(p.summary))).toBe(true);
        // Registry-backed remedy: raise skill payoff.
        expect(out.candidates.find(c => c.paramId === 'combat.skillStatMultiplier')?.proposedValue)
            .toBeCloseTo(0.55);
    });

    it('flags low skill-action share even when resolutions are close', () => {
        const out = doctrineSuggestions(req([
            cell('aggressive', 0.7, 0.3),
            cell('strategist', 0.71, 0.3),
        ]));
        expect(out.proposeOnly.some(p => /minority of actions/i.test(p.summary))).toBe(true);
    });

    it('emits a structural meta-remedy when flagged', () => {
        const out = doctrineSuggestions(req([
            cell('aggressive', 0.9, 0.3),
            cell('strategist', 0.7, 0.3),
        ]));
        expect(out.proposeOnly.some(p => /does not yet|cannot auto-correct|engagement term/i.test(p.summary + p.rationale))).toBe(true);
    });

    it('stays quiet when skill play is healthy', () => {
        const out = doctrineSuggestions(req([
            cell('aggressive', 0.70, 0.6),
            cell('strategist', 0.74, 0.62),
        ]));
        expect(out.proposeOnly).toHaveLength(0);
        expect(out.candidates).toHaveLength(0);
    });

    it('surfaces the doctrine remedy through heuristicRecommendations', () => {
        const res = heuristicRecommendations(req([
            cell('aggressive', 0.86, 0.4),
            cell('strategist', 0.74, 0.4),
        ]));
        expect(res.proposeOnly.some(p => /out-weigh skills|minority of actions/i.test(p.summary))).toBe(true);
    });
});
