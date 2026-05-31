/**
 * Hermetic e2e — Phase 24 content.
 *
 * Walks the fishing-village and northern-forest pools authored in
 * `src/World/MapEvents/content.ts` and asserts the expected event
 * kind fires at each node. Verifies the side-effect import path
 * registers the pools and that the dispatcher routes each authored
 * node to its declared kind.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveMapEvent } from '../resolve-map-event';
import { mockSequentialRng } from '../../../test-utils/rng';
import { createStartingWorld } from '../../index';
import { createNewGameState } from '../../../Game/game.reducer';
import { getMapDefinition } from '../../map.registry';
import { createMapState } from '../../map.registry';
import type { GameState, MapState } from '../../../Game/types';
// Import for side effect — registers the pools when the test loads.
import '../content';

function freshWorldAt(mapName: 'fishing-village' | 'northern-forest'): GameState {
    const base = { ...createNewGameState(), world: createStartingWorld() };
    const def = getMapDefinition('coastal-continent', mapName);
    const map: MapState = createMapState(def);
    return { ...base, world: { ...base.world, currentMap: map } };
}

function visit(state: GameState, nodeId: string): { state: GameState; kind: string } {
    const next: GameState = {
        ...state,
        world: { ...state.world, currentMap: { ...state.world.currentMap, currentNode: nodeId } },
    };
    const result = resolveMapEvent(next);
    return { state: result.state, kind: result.event.kind };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('fishing-village content (Phase 24)', () => {
    it('each authored node resolves to its declared MapEventKind', () => {
        mockSequentialRng(0.5);
        let state = freshWorldAt('fishing-village');

        const expected: Array<[string, string]> = [
            ['fv-1',  'cutscene'],
            ['fv-2',  'interaction'],
            ['fv-3',  'village'],
            ['fv-4',  'encounter'],
            ['fv-5',  'loot-cache'],
            ['fv-6',  'encounter'],
            ['fv-7',  'interaction'],
            ['fv-8',  'gathering'],
            ['fv-9',  'rest'],
            ['fv-10', 'hazard'],
        ];

        for (const [node, kind] of expected) {
            const r = visit(state, node);
            expect(r.kind, `node ${node} should resolve to ${kind}`).toBe(kind);
            state = r.state;
        }
    });

    it('boss flag is set on fv-6', () => {
        mockSequentialRng(0.5);
        const state = freshWorldAt('fishing-village');
        const r = visit(state, 'fv-6');
        expect(r.kind).toBe('encounter');
        const result = resolveMapEvent({
            ...state,
            world: { ...state.world, currentMap: { ...state.world.currentMap, currentNode: 'fv-6', consumedNodes: [] } },
        });
        if (result.event.kind === 'encounter') {
            expect(result.event.isBoss).toBe(true);
        }
    });
});

describe('northern-forest content (Phase 24)', () => {
    it('each authored node resolves to its declared MapEventKind', () => {
        mockSequentialRng(0.5);
        let state = freshWorldAt('northern-forest');

        const expected: Array<[string, string]> = [
            ['nf-1',  'cutscene'],
            ['nf-2',  'gathering'],
            ['nf-3',  'hazard'],
            ['nf-4',  'rest'],
            ['nf-5',  'loot-cache'],
            ['nf-6',  'encounter'],
            ['nf-7',  'interaction'],
            ['nf-8',  'village'],
            ['nf-9',  'encounter'],
            ['nf-10', 'cutscene'],
        ];

        for (const [node, kind] of expected) {
            const r = visit(state, node);
            expect(r.kind, `node ${node} should resolve to ${kind}`).toBe(kind);
            state = r.state;
        }
    });
});

describe('Phase 37 shop content', () => {
    it('both authored village payloads carry shop inventories with consumable IDs that resolve', async () => {
        mockSequentialRng(0.5);
        const { getConsumableById } = await import('../../../Items/consumable.library');
        for (const map of ['fishing-village', 'northern-forest'] as const) {
            const state = freshWorldAt(map);
            const def = getMapDefinition('coastal-continent', map);
            const villageNode = def.nodes.find(n =>
                (map === 'fishing-village' && n.id === 'fv-3') ||
                (map === 'northern-forest'  && n.id === 'nf-8'),
            );
            expect(villageNode, `${map} must have an authored village node`).toBeDefined();
            const r = visit(state, villageNode!.id);
            expect(r.kind).toBe('village');
            // Re-resolve to inspect the shop field on the event payload.
            const next: GameState = {
                ...state,
                world: { ...state.world, currentMap: { ...state.world.currentMap, currentNode: villageNode!.id } },
            };
            const result = resolveMapEvent(next);
            expect(result.event.kind).toBe('village');
            if (result.event.kind !== 'village') return; // type narrowing
            expect(result.event.shop, `${map} village should carry a shop`).toBeDefined();
            expect(result.event.shop!.wares.length).toBeGreaterThan(0);
            for (const ware of result.event.shop!.wares) {
                expect(getConsumableById(ware.itemId), `ware ${ware.itemId} must resolve in consumableLibrary`).toBeDefined();
                expect(ware.price).toBeGreaterThanOrEqual(0);
            }
        }
    });
});

describe('all 8 MapEventKind values are covered by Phase 24 content', () => {
    it('each kind appears at least once across the two maps', () => {
        mockSequentialRng(0.5);
        const kinds = new Set<string>();
        for (const map of ['fishing-village', 'northern-forest'] as const) {
            let state = freshWorldAt(map);
            const def = getMapDefinition('coastal-continent', map);
            for (const node of def.nodes) {
                const r = visit(state, node.id);
                kinds.add(r.kind);
                state = r.state;
            }
        }
        const required = [
            'encounter', 'interaction', 'gathering', 'rest',
            'village', 'cutscene', 'hazard', 'loot-cache',
        ];
        for (const k of required) {
            expect(kinds, `Phase 24 content should fire ${k} at least once`).toContain(k);
        }
    });
});
