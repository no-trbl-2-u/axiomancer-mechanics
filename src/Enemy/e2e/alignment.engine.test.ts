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

import { describe, expect, it } from 'vitest';
import { ENEMY_REGISTRY, type EnemySlug } from '../enemy.library';
import { getAlignmentCell, bucketAxis } from '../../Philosophy';

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
