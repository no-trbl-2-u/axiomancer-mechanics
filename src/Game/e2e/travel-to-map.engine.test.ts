/**
 * Hermetic e2e — continent map travel (`TRAVEL_TO_MAP`).
 *
 * A run must be able to cross from one map to another on the same continent
 * so every map's authored events become reachable. Before this wiring the
 * game store had no way to leave the starting map, so `northern-forest` — and
 * with it the only `village` + `cutscene` map events — was permanently locked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGameStore } from '../store';
import { nullAdapter } from '../persistence/null.adapter';
import { resolveMapEvent } from '../../World';
import { setSeed } from '../../Utils/rng';

// Seed the engine RNG so the store bootstrap (createNewGameState -> generateRunId)
// and any encounter rolls are deterministic + hermetic (no real Math.random).
beforeEach(() => setSeed('travel-to-map-seed'));
afterEach(() => vi.restoreAllMocks());

describe('TRAVEL_TO_MAP — continent map travel', () => {
    it('starts locked into fishing-village with northern-forest unavailable', () => {
        const store = createGameStore(nullAdapter);
        const { world } = store.getState();
        expect(world.currentMap.name).toBe('fishing-village');
        expect(world.currentContinent.availableMaps).toContain('fishing-village');
        expect(world.currentContinent.lockedMaps).toContain('northern-forest');
        expect(world.currentContinent.completedMaps).not.toContain('fishing-village');
    });

    it('travels to northern-forest: completes the old map, unlocks + switches to a fresh MapState', () => {
        const store = createGameStore(nullAdapter);

        store.getState().travelToMap('northern-forest');

        const { world } = store.getState();
        // Switched to a fresh MapState for the target map.
        expect(world.currentMap.name).toBe('northern-forest');
        expect(world.currentMap.currentNode).toBe('nf-1');
        expect(world.currentMap.completedNodes).toEqual([]);
        // nf-1's neighbours are open; everything else is locked.
        expect(world.currentMap.availableNodes).toEqual(
            expect.arrayContaining(['nf-2', 'nf-3']),
        );
        // Continent bookkeeping: old map completed, target moved locked → available.
        expect(world.currentContinent.completedMaps).toContain('fishing-village');
        expect(world.currentContinent.availableMaps).toContain('northern-forest');
        expect(world.currentContinent.lockedMaps).not.toContain('northern-forest');
    });

    it('makes northern-forest content reachable — its village + cutscene events resolve after travel', () => {
        const store = createGameStore(nullAdapter);
        store.getState().travelToMap('northern-forest');

        // nf-8 authors the Glen Market `village` event; nf-10 authors the
        // cave-mouth `cutscene`. Both were unreachable before TRAVEL_TO_MAP.
        // Walk the spine nf-1 → nf-2 → nf-4 → nf-6 → nf-7 → nf-8, resolving
        // each node as we arrive (mirrors the CLI's move+resolve loop).
        const kinds: string[] = [];
        for (const node of ['nf-2', 'nf-4', 'nf-6', 'nf-7', 'nf-8']) {
            store.getState().moveToNode(node);
            const resolved = resolveMapEvent(store.getState());
            store.setState({
                player: resolved.state.player,
                world: resolved.state.world,
                quests: resolved.state.quests,
                flags: resolved.state.flags,
            });
            kinds.push(resolved.event.kind);
        }
        expect(kinds).toContain('village');
    });

    it('is idempotent-safe: travelling back reissues a fresh MapState for the origin map', () => {
        const store = createGameStore(nullAdapter);
        store.getState().travelToMap('northern-forest');
        store.getState().travelToMap('fishing-village');

        const { world } = store.getState();
        expect(world.currentMap.name).toBe('fishing-village');
        expect(world.currentMap.currentNode).toBe('fv-1');
        // Both maps end up completed after a round trip; neither remains locked.
        expect(world.currentContinent.completedMaps).toEqual(
            expect.arrayContaining(['fishing-village', 'northern-forest']),
        );
        expect(world.currentContinent.lockedMaps).not.toContain('northern-forest');
    });
});
