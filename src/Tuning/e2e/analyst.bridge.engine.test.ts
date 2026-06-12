/**
 * Hermetic e2e tests for analyst.bridge.ts — balance recommendation engine.
 * Tests heuristic generation, API path validation, and candidate filtering.
 */

import { describe, it, expect, vi } from 'vitest';
import type {
    AnalystRequest,
} from '../analyst.bridge';
import {
    heuristicRecommendations,
    validateCandidates,
    requestRecommendations,
} from '../analyst.bridge';
import type { HealthScore, CellHealth, FocusFilter, TunableParam } from '../types';

describe('analyst.bridge', () => {
    // Test fixture data
    // Registry plumbing fields (kind/category/file/locator/magnitudeCapPct/tags)
    // are required by TunableParam but unread by the analyst bridge.
    const mockTunables: TunableParam[] = [
        {
            id: 'player.baseHealth',
            kind: 'constant',
            category: 'fundamental',
            file: 'src/Utils/index.ts',
            locator: { exportName: 'PLAYER_BASE_HEALTH' },
            min: 80,
            max: 150,
            step: 5,
            magnitudeCapPct: 0.25,
            tags: [],
            rationale: 'Player starting health pool',
            effect: { difficulty: 'lowers' }, // more health = easier
        },
        {
            id: 'enemy.damageMultiplier',
            kind: 'multiplier',
            category: 'enemy',
            file: 'src/Enemy/enemy.scaler.ts',
            locator: { exportName: 'DAMAGE_MULTIPLIER' },
            min: 0.5,
            max: 2.0,
            step: 0.1,
            magnitudeCapPct: 0.25,
            tags: [],
            rationale: 'Enemy damage scaling factor',
            effect: { difficulty: 'raises' }, // more damage = harder
        },
        {
            id: 'statusEffect.procChance',
            kind: 'constant',
            category: 'effect',
            file: 'src/Effects/effect.library.ts',
            locator: { exportName: 'PROC_CHANCE' },
            min: 0.1,
            max: 0.9,
            step: 0.05,
            magnitudeCapPct: 0.25,
            tags: [],
            rationale: 'Base status effect proc rate',
            effect: { engagement: 'raises' }, // more procs = more engagement
        },
        {
            id: 'ambiguousParam',
            kind: 'constant',
            category: 'fundamental',
            file: 'src/Utils/index.ts',
            locator: { exportName: 'AMBIGUOUS_PARAM' },
            min: 1,
            max: 10,
            step: 1,
            magnitudeCapPct: 0.25,
            tags: [],
            rationale: 'Parameter with no declared effect direction',
        },
    ];

    const mockCurrentValues = {
        'player.baseHealth': 100,
        'enemy.damageMultiplier': 1.0,
        'statusEffect.procChance': 0.3,
        'ambiguousParam': 5,
    };

    const createMockHealthScore = (
        meanEngagement: number,
        engagementFloor: number,
        aggregateBand: number,
        cells: Partial<CellHealth>[],
    ): HealthScore => ({
        meanEngagement,
        engagementFloor,
        aggregateBand,
        aggregate: aggregateBand,
        aggregateEngagement: 0,
        meanActivity: meanEngagement,
        targetBand: { low: 0.5, high: 0.7 },
        maxDefeatRate: 0.4,
        summary: `Test baseline: engagement ${(meanEngagement * 100).toFixed(0)}%`,
        perCell: cells.map((partial, i) => ({
            cellId: `cell-${i + 1}`,
            level: 5,
            playstyle: 'mixed' as const,
            difficulty: 'normal' as const,
            weight: 1.0,
            resolutionSuccessRate: 0.6,
            defeatRate: 0.4,
            engagementShare: meanEngagement,
            band: { low: 0.5, high: 0.7 },
            bandDeviation: 0,
            engagementDeviation: 0,
            deviation: 0,
            ...partial,
        })),
    });

    const mockFocus: FocusFilter = { categories: [], difficulties: [], enemies: [] };

    describe('heuristicRecommendations', () => {
        it('generates engagement candidates when below floor', () => {
            const baseline = createMockHealthScore(
                0.25, // mean engagement 25%
                0.30, // floor 30%
                0.001, // minimal band deviation
                [{ engagementShare: 0.25 }],
            );

            const req: AnalystRequest = {
                baseline,
                cells: [],
                focus: mockFocus,
                tunables: mockTunables,
                currentValues: mockCurrentValues,
            };

            const result = heuristicRecommendations(req);

            expect(result.mode).toBe('heuristic');
            expect(result.candidates).toHaveLength(1);
            expect(result.candidates[0].paramId).toBe('statusEffect.procChance');
            expect(result.candidates[0].proposedValue).toBeGreaterThan(0.3);
            expect(result.candidates[0].rationale).toContain('status-effect engagement');
            expect(result.reasoning).toContain('engagement 25.0%');
        });

        it('generates difficulty candidates when too hard', () => {
            const baseline = createMockHealthScore(
                0.35, // engagement above floor
                0.30,
                0.002, // significant band deviation
                [
                    { resolutionSuccessRate: 0.3, band: { low: 0.5, high: 0.7 }, weight: 1.0 }, // below band = too hard
                ],
            );

            const req: AnalystRequest = {
                baseline,
                cells: [],
                focus: mockFocus,
                tunables: mockTunables,
                currentValues: mockCurrentValues,
            };

            const result = heuristicRecommendations(req);

            expect(result.candidates).toHaveLength(2);
            const healthCandidate = result.candidates.find(c => c.paramId === 'player.baseHealth');
            const damageCandidate = result.candidates.find(c => c.paramId === 'enemy.damageMultiplier');

            expect(healthCandidate?.proposedValue).toBeGreaterThan(100); // increase health = easier
            expect(damageCandidate?.proposedValue).toBeLessThan(1.0); // reduce damage = easier
        });

        it('generates difficulty candidates when too easy', () => {
            const baseline = createMockHealthScore(
                0.35, // engagement above floor
                0.30,
                0.002, // significant band deviation
                [
                    { resolutionSuccessRate: 0.8, band: { low: 0.5, high: 0.7 }, weight: 1.0 }, // above band = too easy
                ],
            );

            const req: AnalystRequest = {
                baseline,
                cells: [],
                focus: mockFocus,
                tunables: mockTunables,
                currentValues: mockCurrentValues,
            };

            const result = heuristicRecommendations(req);

            expect(result.candidates).toHaveLength(2);
            const healthCandidate = result.candidates.find(c => c.paramId === 'player.baseHealth');
            const damageCandidate = result.candidates.find(c => c.paramId === 'enemy.damageMultiplier');

            expect(healthCandidate?.proposedValue).toBeLessThan(100); // reduce health = harder
            expect(damageCandidate?.proposedValue).toBeGreaterThan(1.0); // increase damage = harder
        });

        it('prioritizes engagement over difficulty when both triggered', () => {
            const baseline = createMockHealthScore(
                0.25, // below engagement floor
                0.30,
                0.002, // also outside difficulty band
                [{ resolutionSuccessRate: 0.3, engagementShare: 0.25 }],
            );

            const req: AnalystRequest = {
                baseline,
                cells: [],
                focus: mockFocus,
                tunables: mockTunables,
                currentValues: mockCurrentValues,
            };

            const result = heuristicRecommendations(req);

            // Engagement candidate should come first
            expect(result.candidates[0].paramId).toBe('statusEffect.procChance');
            expect(result.candidates[0].rationale).toContain('status-effect engagement');
        });

        it('respects cooldown restrictions', () => {
            const baseline = createMockHealthScore(0.25, 0.30, 0.001, []);
            const cooldown = new Set(['statusEffect.procChance:up']);

            const req: AnalystRequest = {
                baseline,
                cells: [],
                focus: mockFocus,
                tunables: mockTunables,
                currentValues: mockCurrentValues,
                cooldown,
            };

            const result = heuristicRecommendations(req);

            expect(result.candidates).toHaveLength(0);
            expect(result.proposeOnly).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        summary: expect.stringContaining('statusEffect.procChance:up'),
                    }),
                ]),
            );
        });

        it('adds propose-only notes for ambiguous parameters', () => {
            const baseline = createMockHealthScore(0.35, 0.30, 0.001, []);

            const req: AnalystRequest = {
                baseline,
                cells: [],
                focus: mockFocus,
                tunables: mockTunables,
                currentValues: mockCurrentValues,
            };

            const result = heuristicRecommendations(req);

            expect(result.proposeOnly).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        paramId: 'ambiguousParam',
                        summary: expect.stringContaining('no declared direction'),
                    }),
                ]),
            );
        });

        it('identifies worst cells for structural analysis', () => {
            const baseline = createMockHealthScore(0.35, 0.30, 0.001, [
                {
                    cellId: 'problematic-cell',
                    resolutionSuccessRate: 0.2,
                    defeatRate: 0.8,
                    deviation: 0.5,
                    engagementShare: 0.15,
                },
            ]);

            const req: AnalystRequest = {
                baseline,
                cells: [],
                focus: mockFocus,
                tunables: mockTunables,
                currentValues: mockCurrentValues,
            };

            const result = heuristicRecommendations(req);

            expect(result.proposeOnly).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        summary: expect.stringContaining('problematic-cell is off-band'),
                    }),
                ]),
            );
        });
    });

    describe('validateCandidates', () => {
        it('accepts valid candidate objects', () => {
            const rawCandidates = [
                {
                    paramId: 'player.baseHealth',
                    proposedValue: 120,
                    rationale: 'Test rationale',
                },
                {
                    paramId: 'enemy.damageMultiplier',
                    proposedValue: 0.9,
                },
            ];

            const result = validateCandidates(rawCandidates, mockTunables);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                paramId: 'player.baseHealth',
                proposedValue: 120,
                rationale: 'Test rationale',
                source: 'analyst',
            });
            expect(result[1]).toEqual({
                paramId: 'enemy.damageMultiplier',
                proposedValue: 0.9,
                rationale: 'Analyst recommendation.',
                source: 'analyst',
            });
        });

        it('filters out invalid parameter ids', () => {
            const rawCandidates = [
                { paramId: 'valid.param', proposedValue: 100 },
                { paramId: 'invalid.param', proposedValue: 50 },
            ];

            const validTunables: TunableParam[] = [
                {
                    id: 'valid.param',
                    kind: 'constant',
                    category: 'fundamental',
                    file: 'src/Utils/index.ts',
                    locator: { exportName: 'VALID_PARAM' },
                    min: 0,
                    max: 200,
                    magnitudeCapPct: 0.25,
                    tags: [],
                    rationale: 'Valid',
                },
            ];

            const result = validateCandidates(rawCandidates, validTunables);

            expect(result).toHaveLength(1);
            expect(result[0].paramId).toBe('valid.param');
        });

        it('filters out non-finite values', () => {
            const rawCandidates = [
                { paramId: 'player.baseHealth', proposedValue: NaN },
                { paramId: 'enemy.damageMultiplier', proposedValue: Infinity },
                { paramId: 'statusEffect.procChance', proposedValue: 0.5 },
            ];

            const result = validateCandidates(rawCandidates, mockTunables);

            expect(result).toHaveLength(1);
            expect(result[0].paramId).toBe('statusEffect.procChance');
        });

        it('handles nested candidates object format', () => {
            const rawData = {
                candidates: [
                    { paramId: 'player.baseHealth', proposedValue: 110 },
                ],
                proposeOnly: [],
            };

            const result = validateCandidates(rawData, mockTunables);

            expect(result).toHaveLength(1);
            expect(result[0].paramId).toBe('player.baseHealth');
        });

        it('returns empty array for invalid input', () => {
            expect(validateCandidates(null, mockTunables)).toEqual([]);
            expect(validateCandidates('invalid', mockTunables)).toEqual([]);
            expect(validateCandidates({}, mockTunables)).toEqual([]);
        });
    });

    describe('requestRecommendations', () => {
        it('falls back to heuristic when API disabled', async () => {
            const baseline = createMockHealthScore(0.25, 0.30, 0.001, []);
            const req: AnalystRequest = {
                baseline,
                cells: [],
                focus: mockFocus,
                tunables: mockTunables,
                currentValues: mockCurrentValues,
            };

            const result = await requestRecommendations(req, { useApi: false });

            expect(result.mode).toBe('heuristic');
            expect(result.candidates).toHaveLength(1);
            expect(result.candidates[0].source).toBe('heuristic');
        });

        it('falls back to heuristic when API key missing', async () => {
            const baseline = createMockHealthScore(0.25, 0.30, 0.001, []);
            const req: AnalystRequest = {
                baseline,
                cells: [],
                focus: mockFocus,
                tunables: mockTunables,
                currentValues: mockCurrentValues,
            };

            const result = await requestRecommendations(req, { useApi: true });

            expect(result.mode).toBe('heuristic');
        });

        it('uses API when configured and available', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    content: [{
                        text: JSON.stringify({
                            candidates: [
                                { paramId: 'player.baseHealth', proposedValue: 115, rationale: 'API recommendation' },
                            ],
                            proposeOnly: [],
                        }),
                    }],
                }),
            });

            const baseline = createMockHealthScore(0.25, 0.30, 0.001, []);
            const req: AnalystRequest = {
                baseline,
                cells: [],
                focus: mockFocus,
                tunables: mockTunables,
                currentValues: mockCurrentValues,
            };

            const result = await requestRecommendations(req, {
                useApi: true,
                apiKey: 'test-key',
                fetchImpl: mockFetch as unknown as typeof fetch,
            });

            expect(result.mode).toBe('api');
            expect(result.candidates).toHaveLength(1);
            expect(result.candidates[0].source).toBe('api');
            expect(result.candidates[0].rationale).toBe('API recommendation');
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.anthropic.com/v1/messages',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'x-api-key': 'test-key',
                    }),
                }),
            );
        });

        it('falls back to heuristic when API request fails', async () => {
            const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const baseline = createMockHealthScore(0.25, 0.30, 0.001, []);
            const req: AnalystRequest = {
                baseline,
                cells: [],
                focus: mockFocus,
                tunables: mockTunables,
                currentValues: mockCurrentValues,
            };

            const result = await requestRecommendations(req, {
                useApi: true,
                apiKey: 'test-key',
                fetchImpl: mockFetch as unknown as typeof fetch,
            });

            expect(result.mode).toBe('heuristic');
            expect(result.candidates[0].source).toBe('heuristic');
        });

        it('respects cooldown on API candidates', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    content: [{
                        text: JSON.stringify({
                            candidates: [
                                { paramId: 'player.baseHealth', proposedValue: 105 }, // increase = 'up'
                            ],
                            proposeOnly: [],
                        }),
                    }],
                }),
            });

            const baseline = createMockHealthScore(0.25, 0.30, 0.001, []);
            const req: AnalystRequest = {
                baseline,
                cells: [],
                focus: mockFocus,
                tunables: mockTunables,
                currentValues: mockCurrentValues,
                cooldown: new Set(['player.baseHealth:up']),
            };

            const result = await requestRecommendations(req, {
                useApi: true,
                apiKey: 'test-key',
                fetchImpl: mockFetch as unknown as typeof fetch,
            });

            expect(result.mode).toBe('api');
            expect(result.candidates).toHaveLength(0); // filtered out by cooldown
        });
    });
});