/**
 * Hermetic e2e tests for health.metrics.ts — health scoring and A/B comparison.
 * Tests band deviation calculations, engagement scoring, and paired test analysis.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
    calculateHealthScore,
    compareHealthScores,
    ENGAGEMENT_FLOOR,
    WITNESS_REGRESSION_DELTA,
} from '../health.metrics';
import type { CellResult } from '../types';
import { mockFixedRng, restoreOriginalRng } from '../../test-utils/rng';

describe('health.metrics', () => {
    afterEach(() => {
        restoreOriginalRng();
    });

    // Test fixture data
    const createMockCellResult = (overrides: Partial<CellResult> = {}): CellResult => ({
        cellId: 'test-cell',
        difficulty: 'normal',
        weight: 1.0,
        resolutionSuccessRate: 0.6,
        defeatRate: 0.4,
        engagementShare: 0.4,
        band: { low: 0.5, high: 0.7 },
        deviation: 0,
        runs: 50,
        playstyle: 'mixed',
        level: 15,
        enemySlug: 'test-enemy' as const,
        witnessMetric: {
            strategistRate: 0.65,
            aggressiveRate: 0.55,
            edge: 0.10,
        },
        ...overrides,
    });

    describe('calculateHealthScore', () => {
        it('calculates baseline health score correctly', () => {
            mockFixedRng([0.5, 0.3, 0.7]); // deterministic for any internal RNG

            const cells: CellResult[] = [
                createMockCellResult({
                    cellId: 'cell-1',
                    resolutionSuccessRate: 0.6, // within normal band [0.5, 0.7]
                    engagementShare: 0.4, // above engagement floor 0.35
                    deviation: 0.0,
                    weight: 1.0,
                }),
                createMockCellResult({
                    cellId: 'cell-2',
                    difficulty: 'easy',
                    resolutionSuccessRate: 0.85,
                    engagementShare: 0.3, // below engagement floor
                    deviation: 0.05,
                    weight: 1.0,
                    band: { low: 0.8, high: 0.95 },
                }),
            ];

            const result = calculateHealthScore(cells);

            expect(result.meanEngagement).toBeCloseTo((0.4 + 0.3) / 2);
            expect(result.engagementFloor).toBe(ENGAGEMENT_FLOOR);
            expect(result.aggregateBand).toBeGreaterThan(0); // some band deviation from cell-2
            expect(result.summary).toContain('engagement');
            expect(result.perCell).toHaveLength(2);
            expect(result.perCell[0].cellId).toBe('cell-1');
            expect(result.perCell[1].cellId).toBe('cell-2');
        });

        it('penalizes engagement below floor', () => {
            const lowEngagementCells: CellResult[] = [
                createMockCellResult({
                    resolutionSuccessRate: 0.6,
                    engagementShare: 0.2, // well below floor
                    deviation: 0.0,
                }),
            ];

            const highEngagementCells: CellResult[] = [
                createMockCellResult({
                    resolutionSuccessRate: 0.6,
                    engagementShare: 0.5, // above floor
                    deviation: 0.0,
                }),
            ];

            const lowScore = calculateHealthScore(lowEngagementCells);
            const highScore = calculateHealthScore(highEngagementCells);

            expect(lowScore.meanEngagement).toBeLessThan(highScore.meanEngagement);
            expect(lowScore.summary).toContain('20%'); // engagement percentage
            expect(highScore.summary).toContain('50%');
        });

        it('handles band deviations across difficulties', () => {
            const cells: CellResult[] = [
                createMockCellResult({
                    difficulty: 'easy',
                    resolutionSuccessRate: 0.7, // below easy band [0.8, 0.95]
                    band: { low: 0.8, high: 0.95 },
                    deviation: 0.1,
                }),
                createMockCellResult({
                    difficulty: 'hard',
                    resolutionSuccessRate: 0.4, // above hard band [0.25, 0.5]
                    band: { low: 0.25, high: 0.5 },
                    deviation: 0.0,
                }),
            ];

            const result = calculateHealthScore(cells);

            expect(result.aggregateBand).toBeGreaterThan(0);
            expect(result.perCell[0].deviation).toBeCloseTo(0.1);
            expect(result.perCell[1].deviation).toBeCloseTo(0.0);
        });

        it('weights cells properly in calculations', () => {
            const cells: CellResult[] = [
                createMockCellResult({
                    cellId: 'heavy-weight',
                    engagementShare: 0.2,
                    weight: 3.0, // heavily weighted
                }),
                createMockCellResult({
                    cellId: 'light-weight',
                    engagementShare: 0.8,
                    weight: 1.0,
                }),
            ];

            const result = calculateHealthScore(cells);

            // Weighted average should be closer to the heavy-weight cell
            const expectedWeightedMean = (0.2 * 3.0 + 0.8 * 1.0) / (3.0 + 1.0);
            expect(result.meanEngagement).toBeCloseTo(expectedWeightedMean);
        });
    });

    describe('compareHealthScores', () => {
        const baseline = {
            meanEngagement: 0.35,
            engagementFloor: ENGAGEMENT_FLOOR,
            aggregateBand: 0.05,
            summary: 'Baseline',
            perCell: [createMockCellResult()],
        };

        it('detects improvement when metrics get better', () => {
            const improved = {
                ...baseline,
                meanEngagement: 0.45, // better engagement
                aggregateBand: 0.03, // less band deviation
            };

            const result = compareHealthScores(baseline, improved);

            expect(result.verdict).toBe('improvement');
            expect(result.confidence).toBe('high');
            expect(result.summary).toContain('improvement');
            expect(result.engagementDelta).toBeCloseTo(0.1);
            expect(result.bandDelta).toBeCloseTo(-0.02); // negative = improvement
        });

        it('detects regression when engagement drops significantly', () => {
            const regressed = {
                ...baseline,
                meanEngagement: 0.25, // dropped below regression threshold
            };

            const result = compareHealthScores(baseline, regressed);

            expect(result.verdict).toBe('regression');
            expect(result.confidence).toBe('high');
            expect(result.summary).toContain('regression');
            expect(result.engagementDelta).toBeLessThan(-WITNESS_REGRESSION_DELTA);
        });

        it('detects regression when defeat rate worsens significantly', () => {
            const baselineWithDefeat = {
                ...baseline,
                perCell: [createMockCellResult({ defeatRate: 0.3 })],
            };

            const regressed = {
                ...baselineWithDefeat,
                perCell: [createMockCellResult({ defeatRate: 0.5 })], // much higher defeat rate
            };

            const result = compareHealthScores(baselineWithDefeat, regressed);

            expect(result.verdict).toBe('regression');
            expect(result.summary).toContain('defeat rate');
        });

        it('detects marginal changes as inconclusive', () => {
            const marginal = {
                ...baseline,
                meanEngagement: 0.36, // tiny improvement
                aggregateBand: 0.051, // tiny worsening
            };

            const result = compareHealthScores(baseline, marginal);

            expect(result.verdict).toBe('inconclusive');
            expect(result.confidence).toBe('low');
            expect(result.summary).toContain('marginal');
        });

        it('handles witness metric regression detection', () => {
            const baselineWithWitness = {
                ...baseline,
                perCell: [createMockCellResult({
                    witnessMetric: {
                        strategistRate: 0.65,
                        aggressiveRate: 0.55,
                        edge: 0.10,
                    },
                })],
            };

            const regressedWitness = {
                ...baselineWithWitness,
                perCell: [createMockCellResult({
                    witnessMetric: {
                        strategistRate: 0.60,
                        aggressiveRate: 0.58,
                        edge: 0.02, // witness edge collapsed
                    },
                })],
            };

            const result = compareHealthScores(baselineWithWitness, regressedWitness);

            expect(result.verdict).toBe('regression');
            expect(result.summary).toContain('witness');
        });

        it('provides detailed deltas in comparison result', () => {
            const improved = {
                ...baseline,
                meanEngagement: 0.42,
                aggregateBand: 0.03,
            };

            const result = compareHealthScores(baseline, improved);

            expect(result.engagementDelta).toBeCloseTo(0.07);
            expect(result.bandDelta).toBeCloseTo(-0.02);
            expect(typeof result.defeatDelta).toBe('number');
            expect(result.details).toBeDefined();
            expect(Array.isArray(result.cellComparisons)).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('handles empty cell arrays gracefully', () => {
            const result = calculateHealthScore([]);

            expect(result.meanEngagement).toBe(0);
            expect(result.aggregateBand).toBe(0);
            expect(result.perCell).toHaveLength(0);
            expect(result.summary).toContain('No cells');
        });

        it('handles single cell correctly', () => {
            const singleCell = [createMockCellResult({
                engagementShare: 0.5,
                resolutionSuccessRate: 0.6,
            })];

            const result = calculateHealthScore(singleCell);

            expect(result.meanEngagement).toBe(0.5);
            expect(result.perCell).toHaveLength(1);
        });

        it('handles zero-weight cells', () => {
            const cells = [
                createMockCellResult({ weight: 0, engagementShare: 0.9 }),
                createMockCellResult({ weight: 1, engagementShare: 0.3 }),
            ];

            const result = calculateHealthScore(cells);

            expect(result.meanEngagement).toBe(0.3); // zero-weight cell ignored
        });
    });
});