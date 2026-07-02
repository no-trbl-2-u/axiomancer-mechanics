/**
 * Hermetic E2E Tests — World progression (D4, 2026-07).
 *
 * `applyBossProgression` + `travelToMap` driven through the World barrel:
 *   - victory over the current map's boss completes the map + unlocks the next,
 *   - the mercy path progresses identically (mercy is a first-class ending
 *     per VISION.md),
 *   - non-boss foes / other maps' bosses / double-completion return null,
 *   - travelToMap validates availableMaps, resets map progress on re-entry.
 *
 * Hermetic = self-contained + deterministic + isolated (docs/testing.md).
 * Pure reducers — no RNG, no IO.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
    createStartingWorld, applyBossProgression, travelToMap, IllegalTravelError,
    MAP_PROGRESSION, moveToNode, completeCurrentNode, unlockMap,
} from '../index';
import { WorldState } from '../types';

afterEach(() => vi.restoreAllMocks());

/** Starting world with northern-forest already unlocked (post-boss shape). */
function unlockedWorld(): WorldState {
    return unlockMap(createStartingWorld(), 'northern-forest');
}

// ── MAP_PROGRESSION authored content pins ────────────────────────────────────

describe('MAP_PROGRESSION table', () => {
    it('pins fishing-village to the Coastal Tyrant, unlocking northern-forest', () => {
        expect(MAP_PROGRESSION['fishing-village']).toEqual({
            bossEnemyId: 'enemy-coastal-tyrant',
            unlocks: 'northern-forest',
        });
    });

    it('pins northern-forest to its strongest authored encounter (elite Mistwalker Shade), unlocking nothing', () => {
        // northern-forest authors no isBoss:true pool; the nf-19 Mistwalker
        // Shade (level 5, elite) is the de-facto climax. Nothing further is
        // authored on the continent → unlocks: null.
        expect(MAP_PROGRESSION['northern-forest']).toEqual({
            bossEnemyId: 'enemy-mistwalker-shade',
            unlocks: null,
        });
    });
});

// ── applyBossProgression ─────────────────────────────────────────────────────

describe('applyBossProgression: boss dealt with', () => {
    it('victory over the Coastal Tyrant completes fishing-village and unlocks northern-forest', () => {
        const world = createStartingWorld();
        const before = JSON.stringify(world);

        const next = applyBossProgression(world, 'enemy-coastal-tyrant', 'victory');

        expect(next).not.toBeNull();
        expect(next!.currentContinent.completedMaps).toContain('fishing-village');
        expect(next!.currentContinent.availableMaps).toContain('northern-forest');
        expect(next!.currentContinent.lockedMaps).not.toContain('northern-forest');
        // Input world untouched (pure reducer).
        expect(JSON.stringify(world)).toBe(before);
    });

    it('the mercy path (spare / befriend) progresses exactly like victory', () => {
        const world = createStartingWorld();
        const next = applyBossProgression(world, 'enemy-coastal-tyrant', 'mercy');

        expect(next).not.toBeNull();
        expect(next!.currentContinent.completedMaps).toContain('fishing-village');
        expect(next!.currentContinent.availableMaps).toContain('northern-forest');
    });

    it('completes a map whose entry unlocks nothing (northern-forest) without touching availableMaps', () => {
        const world = travelToMap(unlockedWorld(), 'northern-forest');
        const availableBefore = [...world.currentContinent.availableMaps];

        const next = applyBossProgression(world, 'enemy-mistwalker-shade', 'victory');

        expect(next).not.toBeNull();
        expect(next!.currentContinent.completedMaps).toContain('northern-forest');
        expect(next!.currentContinent.availableMaps).toEqual(availableBefore);
        expect(next!.currentContinent.lockedMaps).toEqual([]);
    });
});

describe('applyBossProgression: no-fire cases', () => {
    it('returns null for a non-boss kill on the current map', () => {
        const world = createStartingWorld();
        expect(applyBossProgression(world, 'enemy-tidepool-crab', 'victory')).toBeNull();
    });

    it('returns null when the enemy is the boss of ANOTHER map', () => {
        // Mistwalker Shade is northern-forest's climax; killing it while the
        // current map is fishing-village must not complete anything.
        const world = createStartingWorld();
        expect(world.currentMap.name).toBe('fishing-village');
        expect(applyBossProgression(world, 'enemy-mistwalker-shade', 'victory')).toBeNull();
    });

    it('double-completion is idempotent — the second resolution returns null', () => {
        const world = createStartingWorld();
        const first = applyBossProgression(world, 'enemy-coastal-tyrant', 'victory');
        expect(first).not.toBeNull();

        const second = applyBossProgression(first!, 'enemy-coastal-tyrant', 'victory');
        expect(second).toBeNull();
        // And a later mercy resolution against the already-cleared map is
        // equally a no-op.
        expect(applyBossProgression(first!, 'enemy-coastal-tyrant', 'mercy')).toBeNull();

        expect(first!.currentContinent.completedMaps
            .filter(m => m === 'fishing-village')).toHaveLength(1);
    });
});

// ── travelToMap ──────────────────────────────────────────────────────────────

describe('travelToMap', () => {
    it('switches to an available map with a fresh MapState', () => {
        const world = unlockedWorld();
        const next = travelToMap(world, 'northern-forest');

        expect(next.currentMap.name).toBe('northern-forest');
        // Fresh createMapState: standing on the authored starting node with
        // zero progress.
        expect(next.currentMap.currentNode).toBe('nf-1');
        expect(next.currentMap.completedNodes).toEqual([]);
        expect(next.currentMap.consumedNodes).toEqual([]);
        expect(next.currentMap.discoveredNodes).toEqual(['nf-1']);
        // Continent bookkeeping untouched by travel itself.
        expect(next.currentContinent).toBe(world.currentContinent);
    });

    it('rejects a locked map with IllegalTravelError', () => {
        const world = createStartingWorld();
        expect(world.currentContinent.lockedMaps).toContain('northern-forest');
        expect(() => travelToMap(world, 'northern-forest')).toThrow(IllegalTravelError);
        expect(() => travelToMap(world, 'northern-forest')).toThrow(/still locked/);
    });

    it('rejects a map that is not part of the current continent', () => {
        const world = createStartingWorld();
        expect(() => travelToMap(world, 'caverns')).toThrow(IllegalTravelError);
        expect(() => travelToMap(world, 'caverns')).toThrow(/not a map of this continent/);
    });

    it('is an idempotent no-op when already on the destination map', () => {
        const world = createStartingWorld();
        expect(travelToMap(world, 'fishing-village')).toBe(world);
    });

    it('re-entering a map resets its node progress (documented behaviour)', () => {
        // Make progress on fishing-village, travel away, travel back.
        let world = unlockedWorld();
        world = moveToNode(world, 'fv-2');
        world = completeCurrentNode(world);
        expect(world.currentMap.completedNodes).toContain('fv-2');

        world = travelToMap(world, 'northern-forest');
        world = travelToMap(world, 'fishing-village');

        // WorldState only persists currentMap — the departed map's progress
        // is discarded, so re-entry starts from the authored initial state.
        expect(world.currentMap.currentNode).toBe('fv-1');
        expect(world.currentMap.completedNodes).toEqual([]);
    });
});
