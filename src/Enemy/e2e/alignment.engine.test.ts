/**
 * Hermetic e2e for the Phase 45 enemy alignment + AI tuning.
 *
 * Unit 1 — every authored enemy in `ENEMY_REGISTRY` carries a
 * `philosophicalAlignment` value whose triple resolves to a real
 * cell in the 27-cell library.
 *
 * Unit 2 — outlook-bias dispatcher cases (flip / no-flip / mid-bucket)
 * land in the same file once the bias helper is wired.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENEMY_REGISTRY, type EnemySlug } from '../enemy.library';
import { getAlignmentCell, bucketAxis } from '../../Philosophy';
import { decideEnemyAction } from '../enemy.logic';
import { createEnemy } from '../index';
import { mockSequentialRng } from '../../test-utils';
import type { Enemy } from '../types';

afterEach(() => vi.restoreAllMocks());

function makeEnemy(outlook: number, logic: Enemy['logic'] = 'aggressive'): Enemy {
    return createEnemy({
        id: `phase45-test-outlook-${outlook}`,
        name: 'Phase 45 Test',
        description: 'Synthetic test enemy.',
        level: 1,
        baseStats: { body: 5, mind: 1, heart: 1 },
        mapName: 'fishing-village',
        logic,
        philosophicalAlignment: { epistemology: 0, outlook, scope: 0 },
    });
}

describe('Phase 45 — decideEnemyAction outlook bias', () => {
    it('pessimistic enemy: aggressive `attack` flips to `defend` when RNG rolls inside the 0.25 flip window', () => {
        // mockSequentialRng(0.1):
        //   aggressiveLogic: chance(0.75) → 0.1 < 0.75 → 'attack';
        //                    pickRandom(STANCES) → 0.1 → stance 'heart'.
        //   applyOutlookBias: 0.1 < 0.25 → flip.
        mockSequentialRng(0.1);
        const decided = decideEnemyAction(makeEnemy(-67));
        expect(decided.action).toBe('defend');
    });

    it('pessimistic enemy: bias does NOT flip when RNG rolls outside the 0.25 flip window', () => {
        // mockSequentialRng(0.5):
        //   chance(0.75) → 0.5 < 0.75 → 'attack'.
        //   applyOutlookBias: 0.5 >= 0.25 → no flip.
        mockSequentialRng(0.5);
        const decided = decideEnemyAction(makeEnemy(-67));
        expect(decided.action).toBe('attack');
    });

    it('optimistic enemy: defensive `defend` flips to `attack` when RNG rolls inside the flip window', () => {
        // defensiveLogic at full HP picks a random stance and `defend`;
        // applyOutlookBias flips it on the next RNG call.
        mockSequentialRng(0.1);
        const decided = decideEnemyAction(makeEnemy(67, 'defensive'));
        expect(decided.action).toBe('attack');
    });

    it('mid-bucket enemy: bias never flips regardless of RNG', () => {
        mockSequentialRng(0.1);
        const decided = decideEnemyAction(makeEnemy(0));
        expect(decided.action).toBe('attack'); // aggressive at 0.1 → attack
    });

    it('legacy single-arg dispatch (decideEnemyAction(logic)) is unaffected', () => {
        mockSequentialRng(0.1);
        const decided = decideEnemyAction('aggressive');
        // No enemy → no alignment → no bias possible.
        expect(['attack', 'defend']).toContain(decided.action);
    });
});

describe('Phase 45 — every authored enemy carries a valid alignment pin', () => {
    it('all ENEMY_REGISTRY entries have philosophicalAlignment set', () => {
        for (const slug of Object.keys(ENEMY_REGISTRY) as EnemySlug[]) {
            const enemy = ENEMY_REGISTRY[slug];
            expect(enemy.philosophicalAlignment, `enemy ${slug} missing alignment`).toBeDefined();
            const a = enemy.philosophicalAlignment!;
            for (const axis of ['epistemology', 'outlook', 'scope'] as const) {
                expect(Number.isInteger(a[axis])).toBe(true);
                expect(a[axis]).toBeGreaterThanOrEqual(-100);
                expect(a[axis]).toBeLessThanOrEqual(100);
            }
        }
    });

    it('every enemy alignment triple round-trips through philosophicalAlignmentLibrary', () => {
        for (const slug of Object.keys(ENEMY_REGISTRY) as EnemySlug[]) {
            const enemy = ENEMY_REGISTRY[slug];
            const cell = getAlignmentCell(enemy.philosophicalAlignment!);
            expect(cell, `cell missing for enemy ${slug}`).toBeDefined();
            // Sanity: the cell's bucket labels match the bucketed axes.
            expect(cell.epistemology).toBe(bucketAxis(enemy.philosophicalAlignment!.epistemology));
            expect(cell.outlook).toBe(bucketAxis(enemy.philosophicalAlignment!.outlook));
            expect(cell.scope).toBe(bucketAxis(enemy.philosophicalAlignment!.scope));
        }
    });
});
