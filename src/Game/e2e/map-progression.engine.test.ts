/**
 * Hermetic E2E Tests — Map progression through the Game store (D4, 2026-07).
 *
 * Drives `createGameStore(nullAdapter)` through `startCombat` / `endCombat`
 * and the new `travelToMap` verb:
 *   - victory over the Coastal Tyrant completes fishing-village and unlocks
 *     northern-forest,
 *   - the friendship (mercy / spare / befriend) outcome progresses identically
 *     — mercy is a first-class ending per VISION.md,
 *   - non-boss kills, other maps' bosses, and defeat/flee never progress,
 *   - double-completion is idempotent,
 *   - travelToMap switches to available maps and rejects locked ones.
 *
 * Hermetic = self-contained + deterministic + isolated (docs/testing.md).
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createGameStore } from '../store';
import { createEventEmitter, GameEvent } from '../events';
import { nullAdapter } from '../persistence/null.adapter';
import { CoastalTyrant, TidepoolCrab, MistwalkerShade } from '../../Enemy/enemy.library';
import { IllegalTravelError } from '../../World';
import { GameState } from '../types';
import { mockSequentialRng } from '../../test-utils/rng';

afterEach(() => vi.restoreAllMocks());

describe('endCombat boss progression: victory', () => {
    it('completes fishing-village and unlocks northern-forest on a boss kill', () => {
        mockSequentialRng(0.5);
        const store = createGameStore(nullAdapter);
        expect(store.getState().world.currentMap.name).toBe('fishing-village');
        expect(store.getState().world.currentContinent.lockedMaps).toContain('northern-forest');

        store.getState().startCombat(CoastalTyrant);
        const report = store.getState().endCombat('victory');

        expect(report.outcome).toBe('victory');
        const continent = store.getState().world.currentContinent;
        expect(continent.completedMaps).toContain('fishing-village');
        expect(continent.availableMaps).toContain('northern-forest');
        expect(continent.lockedMaps).not.toContain('northern-forest');
    });

    it('the durable END_COMBAT autosave persists the progressed world', () => {
        mockSequentialRng(0.5);
        const save = vi.spyOn(nullAdapter, 'save');
        const store = createGameStore(nullAdapter);

        store.getState().startCombat(CoastalTyrant);
        store.getState().endCombat('victory');

        expect(save).toHaveBeenCalled();
        const persisted: GameState = save.mock.calls[save.mock.calls.length - 1]![0];
        expect(persisted.world.currentContinent.completedMaps).toContain('fishing-village');
        expect(persisted.world.currentContinent.availableMaps).toContain('northern-forest');
    });

    it('double-completion is idempotent — a second boss resolution adds nothing', () => {
        mockSequentialRng(0.5);
        const store = createGameStore(nullAdapter);

        store.getState().startCombat(CoastalTyrant);
        store.getState().endCombat('victory');
        store.getState().startCombat(CoastalTyrant);
        store.getState().endCombat('victory');

        const continent = store.getState().world.currentContinent;
        expect(continent.completedMaps.filter(m => m === 'fishing-village')).toHaveLength(1);
        expect(continent.availableMaps.filter(m => m === 'northern-forest')).toHaveLength(1);
    });
});

describe('endCombat boss progression: mercy path', () => {
    it('befriending the Coastal Tyrant also completes the map (mercy is a first-class ending)', () => {
        mockSequentialRng(0.5);
        const store = createGameStore(nullAdapter);

        store.getState().startCombat(CoastalTyrant);
        const report = store.getState().endCombat('friendship');

        expect(report.outcome).toBe('friendship');
        const continent = store.getState().world.currentContinent;
        expect(continent.completedMaps).toContain('fishing-village');
        expect(continent.availableMaps).toContain('northern-forest');
        // The befriend content arc still fires alongside progression.
        expect(store.getState().flags).toContain('befriended-coastal-tyrant');
    });
});

describe('endCombat boss progression: no-fire cases', () => {
    it('a non-boss kill does not complete the map', () => {
        mockSequentialRng(0.5);
        const store = createGameStore(nullAdapter);

        store.getState().startCombat(TidepoolCrab);
        store.getState().endCombat('victory');

        const continent = store.getState().world.currentContinent;
        expect(continent.completedMaps).toEqual([]);
        expect(continent.lockedMaps).toContain('northern-forest');
    });

    it('a boss of ANOTHER map does not complete the current one', () => {
        mockSequentialRng(0.5);
        const store = createGameStore(nullAdapter);
        expect(store.getState().world.currentMap.name).toBe('fishing-village');

        // Mistwalker Shade is northern-forest's climax entry.
        store.getState().startCombat(MistwalkerShade);
        store.getState().endCombat('victory');

        expect(store.getState().world.currentContinent.completedMaps).toEqual([]);
    });

    it('defeat and flee against the boss do not progress', () => {
        const store = createGameStore(nullAdapter);

        store.getState().startCombat(CoastalTyrant);
        store.getState().endCombat('defeat');
        expect(store.getState().world.currentContinent.completedMaps).toEqual([]);

        store.getState().startCombat(CoastalTyrant);
        store.getState().endCombat('flee');
        expect(store.getState().world.currentContinent.completedMaps).toEqual([]);
        expect(store.getState().world.currentContinent.lockedMaps).toContain('northern-forest');
    });
});

describe('travelToMap store verb', () => {
    it('travels to an unlocked map and emits world:moved', () => {
        mockSequentialRng(0.5);
        const emitter = createEventEmitter();
        const moved: GameEvent[] = [];
        emitter.on('world:moved', e => moved.push(e));
        const store = createGameStore(nullAdapter, undefined, emitter);

        store.getState().startCombat(CoastalTyrant);
        store.getState().endCombat('victory');
        store.getState().travelToMap('northern-forest');

        const world = store.getState().world;
        expect(world.currentMap.name).toBe('northern-forest');
        expect(world.currentMap.currentNode).toBe('nf-1');
        expect(world.currentMap.completedNodes).toEqual([]);
        expect(moved.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects a locked map with IllegalTravelError and leaves state unchanged', () => {
        const store = createGameStore(nullAdapter);
        expect(store.getState().world.currentContinent.lockedMaps).toContain('northern-forest');

        expect(() => store.getState().travelToMap('northern-forest')).toThrow(IllegalTravelError);
        expect(store.getState().world.currentMap.name).toBe('fishing-village');
    });

    it('rejects a map from another continent', () => {
        const store = createGameStore(nullAdapter);
        expect(() => store.getState().travelToMap('caverns')).toThrow(IllegalTravelError);
    });

    it('travelling back after progression restarts the map but keeps continent progress', () => {
        mockSequentialRng(0.5);
        const store = createGameStore(nullAdapter);

        store.getState().startCombat(CoastalTyrant);
        store.getState().endCombat('victory');
        store.getState().travelToMap('northern-forest');
        store.getState().travelToMap('fishing-village');

        const world = store.getState().world;
        // Re-entry resets node progress (documented on the verb)…
        expect(world.currentMap.name).toBe('fishing-village');
        expect(world.currentMap.currentNode).toBe('fv-1');
        expect(world.currentMap.completedNodes).toEqual([]);
        // …but continent-level completion persists.
        expect(world.currentContinent.completedMaps).toContain('fishing-village');
        expect(world.currentContinent.availableMaps).toContain('northern-forest');
    });
});
