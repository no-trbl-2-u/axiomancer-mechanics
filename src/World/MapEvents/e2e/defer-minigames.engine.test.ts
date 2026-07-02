/**
 * Hermetic e2e — `resolveMapEvent`'s `deferMinigames` option (2026-07).
 *
 * With `deferMinigames: true` the minigame-backed kinds (hazard /
 * gathering / rest / loot-cache) leave `state.player` untouched and mark
 * their resolved event `deferred: true`, carrying the authored config the
 * host needs to run the REAL minigame. Default mode stays bit-identical
 * to the historical flat-baseline behaviour, and the bare-rng second
 * argument keeps working.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
    resolveMapEvent,
    registerMapEventPool,
    setDefaultMapEventPool,
    _clearMapEventPoolRegistry,
} from '../resolve-map-event';
import { mockSequentialRng, restoreOriginalRng } from '../../../test-utils/rng';
import { createStartingWorld } from '../../index';
import { createNewGameState } from '../../../Game/game.reducer';
import type { GameState } from '../../../Game/types';
import type { MapEventPool } from '../types';
import type { Item } from '../../../Items/types';

function freshState(): GameState {
    return { ...createNewGameState(), world: createStartingWorld() };
}

function withPool(state: GameState, pool: MapEventPool): GameState {
    _clearMapEventPoolRegistry();
    registerMapEventPool(pool);
    setDefaultMapEventPool(state.world.currentMap.continent, state.world.currentMap.name, pool.id);
    return state;
}

const DRIFTWOOD: Item = {
    id: 'driftwood', name: 'Driftwood',
    description: 'Salt-bleached.', category: 'material',
    quantity: 1,
} as Item;

afterEach(() => {
    vi.restoreAllMocks();
    restoreOriginalRng();
    _clearMapEventPoolRegistry();
});

describe('resolveMapEvent — deferMinigames', () => {
    it('hazard: leaves the player untouched and carries the effect/damage config', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.hazard.defer',
            entries: [{
                kind: 'hazard', weight: 1,
                payload: { kind: 'hazard', effectIds: ['debuff_bleed'], damage: 3 },
            }],
        });
        const result = resolveMapEvent(state, { deferMinigames: true });

        expect(result.state.player).toBe(state.player);
        expect(result.event).toEqual({
            kind: 'hazard',
            effects: [],
            damage: 3,
            effectIds: ['debuff_bleed'],
            deferred: true,
        });
        // Dispatcher duties still ran: the node is consumed.
        expect(result.state.world.currentMap.consumedNodes)
            .toContain(state.world.currentMap.currentNode);
    });

    it('gathering: leaves the inventory untouched and carries the authored items', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.gathering.defer',
            entries: [{
                kind: 'gathering', weight: 1,
                payload: { kind: 'gathering', items: [DRIFTWOOD] },
            }],
        });
        const result = resolveMapEvent(state, { deferMinigames: true });

        expect(result.state.player).toBe(state.player);
        expect(result.event.kind).toBe('gathering');
        if (result.event.kind === 'gathering') {
            expect(result.event.deferred).toBe(true);
            expect(result.event.items).toHaveLength(1);
            expect(result.event.items[0].id).toBe('driftwood');
            // Cloned config — not the authored object itself.
            expect(result.event.items[0]).not.toBe(DRIFTWOOD);
        }
    });

    it('rest: heals nothing and carries the authored baseline fraction', () => {
        mockSequentialRng(0.5);
        const before = freshState();
        const damaged: GameState = { ...before, player: { ...before.player, health: 5 } };
        const state = withPool(damaged, {
            id: 'pool.rest.defer',
            entries: [{ kind: 'rest', weight: 1, payload: { kind: 'rest', healFraction: 0.5 } }],
        });
        const result = resolveMapEvent(state, { deferMinigames: true });

        expect(result.state.player).toBe(state.player);
        expect(result.state.player.health).toBe(5);
        expect(result.event).toEqual({
            kind: 'rest', healed: 0, healFraction: 0.5, deferred: true,
        });
    });

    it('loot-cache: grants nothing and carries the authored items + currency', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.loot.defer',
            entries: [{
                kind: 'loot-cache', weight: 1,
                payload: { kind: 'loot-cache', items: [DRIFTWOOD], currency: 7 },
            }],
        });
        const result = resolveMapEvent(state, { deferMinigames: true });

        expect(result.state.player).toBe(state.player);
        expect(result.event.kind).toBe('loot-cache');
        if (result.event.kind === 'loot-cache') {
            expect(result.event.deferred).toBe(true);
            expect(result.event.currency).toBe(7);
            expect(result.event.items.map(i => i.id)).toEqual(['driftwood']);
        }
    });

    it('does not touch non-minigame kinds (cutscene resolves as ever)', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.cutscene.defer',
            entries: [{ kind: 'cutscene', weight: 1, payload: { kind: 'cutscene', lines: ['dawn.'] } }],
        });
        const result = resolveMapEvent(state, { deferMinigames: true });
        expect(result.event).toEqual({ kind: 'cutscene', lines: ['dawn.'] });
    });
});

describe('resolveMapEvent — default mode stays bit-identical', () => {
    it('applies the flat hazard baseline with no deferred marker (options bag, defer off)', () => {
        mockSequentialRng(0.5);
        const before = freshState();
        const startHp = before.player.health;
        const state = withPool(before, {
            id: 'pool.hazard.default',
            entries: [{ kind: 'hazard', weight: 1, payload: { kind: 'hazard', damage: 3 } }],
        });
        const result = resolveMapEvent(state, {});
        expect(result.event).toEqual({ kind: 'hazard', effects: [], damage: 3 });
        expect(result.state.player.health).toBe(startHp - 3);
    });

    it('still accepts a bare rng function as the second argument (back-compat)', () => {
        const before = freshState();
        const startCount = before.player.inventory.length;
        const state = withPool(before, {
            id: 'pool.gathering.rngfn',
            entries: [{ kind: 'gathering', weight: 1, payload: { kind: 'gathering', items: [DRIFTWOOD] } }],
        });
        const result = resolveMapEvent(state, () => 0.5);
        expect(result.event.kind).toBe('gathering');
        if (result.event.kind === 'gathering') {
            expect(result.event.deferred).toBeUndefined();
        }
        expect(result.state.player.inventory).toHaveLength(startCount + 1);
    });

    it('applies the flat rest heal when called with no second argument at all', () => {
        mockSequentialRng(0.5);
        const before = freshState();
        const damaged: GameState = { ...before, player: { ...before.player, health: 5 } };
        const state = withPool(damaged, {
            id: 'pool.rest.default',
            entries: [{ kind: 'rest', weight: 1, payload: { kind: 'rest', healFraction: 1.0 } }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('rest');
        if (result.event.kind === 'rest') {
            expect(result.event.healed).toBeGreaterThan(0);
            expect(result.event.deferred).toBeUndefined();
        }
        expect(result.state.player.health).toBeGreaterThan(5);
    });
});
