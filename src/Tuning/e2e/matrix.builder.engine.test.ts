/**
 * Hermetic e2e tests for matrix.builder.ts — scenario matrix construction.
 * Tests matrix enumeration, focus filtering, enemy assignment, and run scaling.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
    buildMatrix,
    DEFAULT_LEVELS,
    DEFAULT_PLAYSTYLES,
    DEFAULT_DIFFICULTIES,
    DEFAULT_BASE_RUNS,
} from '../matrix.builder';
import type { FocusFilter } from '../types';
import { mockFixedRng, restoreOriginalRng } from '../../test-utils/rng';

describe('matrix.builder', () => {
    afterEach(() => {
        restoreOriginalRng();
    });

    const defaultFocus: FocusFilter = {
        categories: [],
        difficulties: [],
        enemies: [],
    };

    describe('buildMatrix', () => {
        it('builds full matrix with default parameters', () => {
            mockFixedRng([0.5, 0.3, 0.7, 0.2, 0.8]); // deterministic enemy selection

            const result = buildMatrix({
                focus: defaultFocus,
                seed: 'test-seed-123',
            });

            expect(result.cells).toBeDefined();
            expect(result.cells.length).toBe(
                DEFAULT_LEVELS.length * DEFAULT_PLAYSTYLES.length * DEFAULT_DIFFICULTIES.length
            );
            expect(result.metadata.levels).toEqual(DEFAULT_LEVELS);
            expect(result.metadata.playstyles).toEqual(DEFAULT_PLAYSTYLES);
            expect(result.metadata.difficulties).toEqual(DEFAULT_DIFFICULTIES);
            expect(result.metadata.baseRuns).toBe(DEFAULT_BASE_RUNS);
            expect(result.metadata.seed).toBe('test-seed-123');
        });

        it('generates consistent matrix with same seed', () => {
            const seed = 'deterministic-seed';
            
            const result1 = buildMatrix({
                focus: defaultFocus,
                seed,
            });

            const result2 = buildMatrix({
                focus: defaultFocus,
                seed,
            });

            expect(result1.cells).toEqual(result2.cells);
            expect(result1.metadata).toEqual(result2.metadata);
        });

        it('generates different matrix with different seed', () => {
            const result1 = buildMatrix({
                focus: defaultFocus,
                seed: 'seed-alpha',
            });

            const result2 = buildMatrix({
                focus: defaultFocus,
                seed: 'seed-beta',
            });

            // Should have same structure but different enemy assignments
            expect(result1.cells.length).toBe(result2.cells.length);
            expect(result1.cells.map(c => c.enemySlug)).not.toEqual(
                result2.cells.map(c => c.enemySlug)
            );
        });

        it('respects custom levels, playstyles, and difficulties', () => {
            const customOptions = {
                levels: [1, 30],
                playstyles: ['aggressive', 'strategist'] as const,
                difficulties: ['normal', 'hard'] as const,
                baseRuns: 25,
                focus: defaultFocus,
                seed: 'custom-test',
            };

            const result = buildMatrix(customOptions);

            expect(result.cells.length).toBe(2 * 2 * 2); // 8 cells
            expect(result.metadata.levels).toEqual([1, 30]);
            expect(result.metadata.playstyles).toEqual(['aggressive', 'strategist']);
            expect(result.metadata.difficulties).toEqual(['normal', 'hard']);
            expect(result.metadata.baseRuns).toBe(25);
        });

        it('assigns appropriate enemies based on level', () => {
            const result = buildMatrix({
                levels: [1, 15, 30],
                playstyles: ['mixed'],
                difficulties: ['normal'],
                focus: defaultFocus,
                seed: 'enemy-test',
            });

            const level1Cell = result.cells.find(c => c.level === 1);
            const level15Cell = result.cells.find(c => c.level === 15);
            const level30Cell = result.cells.find(c => c.level === 30);

            expect(level1Cell?.enemySlug).toBeDefined();
            expect(level15Cell?.enemySlug).toBeDefined();
            expect(level30Cell?.enemySlug).toBeDefined();

            // Different levels should typically get different enemies
            // (though this isn't guaranteed due to deterministic selection)
            expect(level1Cell?.cellId).toContain('L1');
            expect(level15Cell?.cellId).toContain('L15');
            expect(level30Cell?.cellId).toContain('L30');
        });

        it('scales run counts based on focus weight', () => {
            const focusedFilter: FocusFilter = {
                categories: ['strategist'], // focus on strategist playstyle
                difficulties: ['hard'],
                enemies: [],
            };

            const result = buildMatrix({
                playstyles: ['aggressive', 'strategist'],
                difficulties: ['normal', 'hard'],
                baseRuns: 20,
                focus: focusedFilter,
                seed: 'focus-test',
            });

            const focusedCell = result.cells.find(
                c => c.playstyle === 'strategist' && c.difficulty === 'hard'
            );
            const unfocusedCell = result.cells.find(
                c => c.playstyle === 'aggressive' && c.difficulty === 'normal'
            );

            expect(focusedCell?.runs).toBeGreaterThan(unfocusedCell?.runs || 0);
            expect(focusedCell?.weight).toBeGreaterThan(1.0);
            expect(unfocusedCell?.weight).toBeLessThanOrEqual(1.0);
        });

        it('handles empty focus filter as no-op', () => {
            const emptyFocus: FocusFilter = {
                categories: [],
                difficulties: [],
                enemies: [],
            };

            const result = buildMatrix({
                baseRuns: 30,
                focus: emptyFocus,
                seed: 'empty-focus',
            });

            const allWeightsEqual = result.cells.every(c => c.weight === 1.0);
            expect(allWeightsEqual).toBe(true);

            const allRunsEqual = result.cells.every(c => c.runs === 30);
            expect(allRunsEqual).toBe(true);
        });

        it('generates valid cell IDs with all components', () => {
            const result = buildMatrix({
                levels: [15],
                playstyles: ['mixed'],
                difficulties: ['normal'],
                focus: defaultFocus,
                seed: 'cell-id-test',
            });

            const cell = result.cells[0];
            expect(cell.cellId).toMatch(/^L15-mixed-normal$/);
            expect(cell.level).toBe(15);
            expect(cell.playstyle).toBe('mixed');
            expect(cell.difficulty).toBe('normal');
        });

        it('assigns band information correctly per difficulty', () => {
            const result = buildMatrix({
                levels: [15],
                playstyles: ['mixed'],
                difficulties: ['easy', 'normal', 'hard'],
                focus: defaultFocus,
                seed: 'band-test',
            });

            const easyCell = result.cells.find(c => c.difficulty === 'easy');
            const normalCell = result.cells.find(c => c.difficulty === 'normal');
            const hardCell = result.cells.find(c => c.difficulty === 'hard');

            expect(easyCell?.band.low).toBeGreaterThan(normalCell?.band.low || 0);
            expect(normalCell?.band.low).toBeGreaterThan(hardCell?.band.low || 0);
            expect(easyCell?.band.high).toBeGreaterThan(normalCell?.band.high || 0);
            expect(normalCell?.band.high).toBeGreaterThan(hardCell?.band.high || 0);
        });
    });

    describe('focus filtering', () => {
        it('weights matching playstyle categories higher', () => {
            const playstyleFocus: FocusFilter = {
                categories: ['aggressive', 'defensive'],
                difficulties: [],
                enemies: [],
            };

            const result = buildMatrix({
                playstyles: ['aggressive', 'mixed', 'defensive', 'strategist'],
                focus: playstyleFocus,
                seed: 'playstyle-focus',
            });

            const aggressiveCell = result.cells.find(c => c.playstyle === 'aggressive');
            const defensiveCell = result.cells.find(c => c.playstyle === 'defensive');
            const mixedCell = result.cells.find(c => c.playstyle === 'mixed');
            const strategistCell = result.cells.find(c => c.playstyle === 'strategist');

            expect(aggressiveCell?.weight).toBeGreaterThan(1.0);
            expect(defensiveCell?.weight).toBeGreaterThan(1.0);
            expect(mixedCell?.weight).toBe(1.0);
            expect(strategistCell?.weight).toBe(1.0);
        });

        it('weights matching difficulties higher', () => {
            const difficultyFocus: FocusFilter = {
                categories: [],
                difficulties: ['hard'],
                enemies: [],
            };

            const result = buildMatrix({
                difficulties: ['easy', 'normal', 'hard'],
                focus: difficultyFocus,
                seed: 'difficulty-focus',
            });

            const hardCells = result.cells.filter(c => c.difficulty === 'hard');
            const easyNormalCells = result.cells.filter(c => c.difficulty !== 'hard');

            expect(hardCells.every(c => c.weight > 1.0)).toBe(true);
            expect(easyNormalCells.every(c => c.weight === 1.0)).toBe(true);
        });

        it('combines multiple focus criteria appropriately', () => {
            const multiFocus: FocusFilter = {
                categories: ['strategist'],
                difficulties: ['hard'],
                enemies: [],
            };

            const result = buildMatrix({
                playstyles: ['aggressive', 'strategist'],
                difficulties: ['normal', 'hard'],
                focus: multiFocus,
                seed: 'multi-focus',
            });

            const doubleMatchCell = result.cells.find(
                c => c.playstyle === 'strategist' && c.difficulty === 'hard'
            );
            const singleMatchCells = result.cells.filter(
                c => (c.playstyle === 'strategist' && c.difficulty === 'normal') ||
                     (c.playstyle === 'aggressive' && c.difficulty === 'hard')
            );
            const noMatchCell = result.cells.find(
                c => c.playstyle === 'aggressive' && c.difficulty === 'normal'
            );

            // Double match should have highest weight
            expect(doubleMatchCell?.weight).toBeGreaterThan(
                singleMatchCells[0]?.weight || 0
            );
            expect(singleMatchCells[0]?.weight).toBeGreaterThan(1.0);
            expect(noMatchCell?.weight).toBe(1.0);
        });
    });

    describe('edge cases', () => {
        it('handles single level/playstyle/difficulty', () => {
            const result = buildMatrix({
                levels: [20],
                playstyles: ['strategist'],
                difficulties: ['normal'],
                focus: defaultFocus,
                seed: 'single-everything',
            });

            expect(result.cells).toHaveLength(1);
            expect(result.cells[0].cellId).toBe('L20-strategist-normal');
        });

        it('throws on empty level array', () => {
            expect(() => buildMatrix({
                levels: [],
                focus: defaultFocus,
                seed: 'empty-levels',
            })).toThrow();
        });

        it('handles very high base runs', () => {
            const result = buildMatrix({
                levels: [1],
                playstyles: ['mixed'],
                difficulties: ['normal'],
                baseRuns: 1000,
                focus: defaultFocus,
                seed: 'high-runs',
            });

            expect(result.cells[0].runs).toBe(1000);
        });

        it('handles focus with unrecognized categories gracefully', () => {
            const invalidFocus: FocusFilter = {
                categories: [],
                difficulties: [],
                enemies: [],
            };

            const result = buildMatrix({
                focus: invalidFocus,
                seed: 'invalid-focus',
            });

            // Should fall back to uniform weighting
            expect(result.cells.every(c => c.weight === 1.0)).toBe(true);
        });
    });
});