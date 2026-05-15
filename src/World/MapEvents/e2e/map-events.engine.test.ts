/**
 * Hermetic e2e — Spec 23 MapEvents engine.
 *
 * Covers each of the eight kinds via `resolveMapEvent`, plus an
 * integration walkthrough that drives discover → reveal → roll →
 * resolve → consumed-noop.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
    resolveMapEvent,
    registerMapEventPool,
    setDefaultMapEventPool,
    _clearMapEventPoolRegistry,
} from '../resolve-map-event';
import { mockSequentialRng } from '../../../test-utils/rng';
import { createStartingWorld } from '../../index';
import { createNewGameState } from '../../../Game/game.reducer';
import type { GameState } from '../../../Game/types';
import type { MapEventPool } from '../types';

function freshState(): GameState {
    return { ...createNewGameState(), world: createStartingWorld() };
}

function withPool(state: GameState, pool: MapEventPool): GameState {
    _clearMapEventPoolRegistry();
    registerMapEventPool(pool);
    setDefaultMapEventPool(state.world.currentMap.continent, state.world.currentMap.name, pool.id);
    return state;
}

afterEach(() => {
    vi.restoreAllMocks();
    _clearMapEventPoolRegistry();
});

describe('resolveMapEvent — per-kind', () => {
    it('resolves an encounter event into an Encounter', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.encounter',
            entries: [{
                kind: 'encounter',
                weight: 1,
                payload: { kind: 'encounter', enemySlug: 'tidepool-crab' },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('encounter');
        if (result.event.kind === 'encounter') {
            expect(result.event.encounter.enemies).toHaveLength(1);
            expect(result.event.isBoss).toBe(false);
        }
    });

    it('resolves an interaction event by NPC name', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.interaction',
            entries: [{
                kind: 'interaction',
                weight: 1,
                payload: { kind: 'interaction', npcName: 'Old Marrow' },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('interaction');
        if (result.event.kind === 'interaction') {
            expect(result.event.npcName).toBeTruthy();
        }
    });

    it('resolves a gathering event by adding cloned items to inventory', () => {
        mockSequentialRng(0.5);
        const before = freshState();
        const beforeCount = before.player.inventory.length;
        const state = withPool(before, {
            id: 'pool.gathering',
            entries: [{
                kind: 'gathering',
                weight: 1,
                payload: {
                    kind: 'gathering',
                    items: [{
                        id: 'driftwood', name: 'Driftwood',
                        description: 'Salt-bleached.', category: 'material',
                        quantity: 1,
                    }],
                },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('gathering');
        expect(result.state.player.inventory).toHaveLength(beforeCount + 1);
    });

    it('resolves a rest event by healing the player', () => {
        mockSequentialRng(0.5);
        const before = freshState();
        // Damage the player so heal is observable.
        const damaged: GameState = {
            ...before,
            player: { ...before.player, health: 5 },
        };
        const state = withPool(damaged, {
            id: 'pool.rest',
            entries: [{
                kind: 'rest', weight: 1,
                payload: { kind: 'rest', healFraction: 1.0 },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('rest');
        if (result.event.kind === 'rest') {
            expect(result.event.healed).toBeGreaterThan(0);
        }
        expect(result.state.player.health).toBeGreaterThan(5);
    });

    it('resolves a village event with merchants', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.village',
            entries: [{
                kind: 'village', weight: 1,
                payload: {
                    kind: 'village',
                    villageName: 'Salt Hollow',
                    merchants: [{ name: 'Briny Trader', isShopkeeper: true }],
                },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('village');
        if (result.event.kind === 'village') {
            expect(result.event.villageName).toBe('Salt Hollow');
            expect(result.event.merchants).toHaveLength(1);
        }
    });

    it('resolves a cutscene by surfacing its lines', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.cutscene',
            entries: [{
                kind: 'cutscene', weight: 1,
                payload: { kind: 'cutscene', lines: ['The tide pulls back.', 'Something glitters.'] },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('cutscene');
        if (result.event.kind === 'cutscene') {
            expect(result.event.lines).toHaveLength(2);
        }
    });

    it('resolves a hazard event with damage', () => {
        mockSequentialRng(0.5);
        const before = freshState();
        const startHp = before.player.health;
        const state = withPool(before, {
            id: 'pool.hazard',
            entries: [{
                kind: 'hazard', weight: 1,
                payload: { kind: 'hazard', damage: 3 },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('hazard');
        if (result.event.kind === 'hazard') {
            expect(result.event.damage).toBe(3);
        }
        expect(result.state.player.health).toBe(startHp - 3);
    });

    it('resolves a loot-cache by adding items and currency', () => {
        mockSequentialRng(0.5);
        const before = freshState();
        const startCurrency = before.player.currency;
        const state = withPool(before, {
            id: 'pool.loot',
            entries: [{
                kind: 'loot-cache', weight: 1,
                payload: {
                    kind: 'loot-cache',
                    items: [{
                        id: 'sea-pearl', name: 'Sea Pearl',
                        description: 'A small luminous bead.', category: 'material',
                        quantity: 1,
                    }],
                    currency: 12,
                },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('loot-cache');
        if (result.event.kind === 'loot-cache') {
            expect(result.event.currency).toBe(12);
        }
        expect(result.state.player.currency).toBe(startCurrency + 12);
    });
});

describe('resolveMapEvent — discovery + one-shot', () => {
    it('reveals adjacent nodes after resolution', () => {
        mockSequentialRng(0.5);
        const before = freshState();
        const startId = before.world.currentMap.currentNode;
        expect(before.world.currentMap.discoveredNodes).toContain(startId);

        const state = withPool(before, {
            id: 'pool.tiny',
            entries: [{
                kind: 'cutscene', weight: 1,
                payload: { kind: 'cutscene', lines: ['…'] },
            }],
        });
        const result = resolveMapEvent(state);
        const map = result.state.world.currentMap;
        expect(map.consumedNodes).toContain(startId);
        expect(map.discoveredNodes.length).toBeGreaterThan(1);
    });

    it('returns { kind: "none" } on a consumed node', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.cutscene-only',
            entries: [{
                kind: 'cutscene', weight: 1,
                payload: { kind: 'cutscene', lines: ['Once.'] },
            }],
        });
        const first = resolveMapEvent(state);
        expect(first.event.kind).toBe('cutscene');

        // Second resolution against the same (now consumed) node.
        const second = resolveMapEvent(first.state);
        expect(second.event.kind).toBe('none');
    });

    it('returns { kind: "none" } when no pool is registered', () => {
        mockSequentialRng(0.5);
        const state = freshState();
        _clearMapEventPoolRegistry();
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('none');
        // Discovery still advances even without a pool.
        expect(result.state.world.currentMap.consumedNodes).toContain(state.world.currentMap.currentNode);
    });
});

// ── Phase 31 — resolveMapEvent unlocks adjacents into availableNodes ─────────

describe('resolveMapEvent — Phase 31 traversal fix', () => {
    it('moves resolved-node adjacents from lockedNodes into availableNodes', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.cutscene',
            entries: [{
                kind: 'cutscene', weight: 1,
                payload: { kind: 'cutscene', lines: ['…'] },
            }],
        });
        const startId = state.world.currentMap.currentNode;
        const startNode = state.world.currentMap;

        // Before resolution: fv-1's adjacent (fv-2) is already available,
        // but fv-3 is locked.
        expect(startNode.availableNodes).toContain('fv-2');
        expect(startNode.lockedNodes).toContain('fv-3');

        const afterFv1 = resolveMapEvent(state).state.world.currentMap;
        expect(afterFv1.consumedNodes).toContain(startId);
        // fv-2 was already available — still there; no regression.
        expect(afterFv1.availableNodes).toContain('fv-2');
        // fv-1's only adjacent IS fv-2 (no new unlock from fv-1 itself).
        expect(afterFv1.lockedNodes).toContain('fv-3');
    });

    it('unlocks the next-step adjacent when the player resolves the just-walked node', () => {
        mockSequentialRng(0.5);
        // Reach fv-2 by moving (legal — fv-2 is in initial availableNodes).
        let state = withPool(freshState(), {
            id: 'pool.cutscene',
            entries: [{
                kind: 'cutscene', weight: 1,
                payload: { kind: 'cutscene', lines: ['…'] },
            }],
        });
        state = { ...state, world: { ...state.world, currentMap: { ...state.world.currentMap, currentNode: 'fv-2' } } };

        // Before resolving fv-2: fv-3 is locked.
        expect(state.world.currentMap.lockedNodes).toContain('fv-3');
        expect(state.world.currentMap.availableNodes).not.toContain('fv-3');

        const afterFv2 = resolveMapEvent(state).state.world.currentMap;

        // After resolving fv-2: fv-3 has moved from locked → available.
        expect(afterFv2.availableNodes).toContain('fv-3');
        expect(afterFv2.lockedNodes).not.toContain('fv-3');
    });

    it('idempotent — re-resolving a consumed node does not re-promote unlocked adjacents', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.cutscene',
            entries: [{
                kind: 'cutscene', weight: 1,
                payload: { kind: 'cutscene', lines: ['…'] },
            }],
        });
        const first = resolveMapEvent(state).state;
        const second = resolveMapEvent(first).state;
        expect(second.world.currentMap.availableNodes).toEqual(
            first.world.currentMap.availableNodes,
        );
    });

    it('still unlocks adjacents when no pool is registered for the node', () => {
        mockSequentialRng(0.5);
        const state = freshState();
        _clearMapEventPoolRegistry();
        // Move to fv-2 first (legal — fv-2 is already available; no pool needed
        // to move).
        const atFv2 = { ...state, world: { ...state.world, currentMap: { ...state.world.currentMap, currentNode: 'fv-2' } } };
        expect(atFv2.world.currentMap.lockedNodes).toContain('fv-3');
        const result = resolveMapEvent(atFv2);
        expect(result.event.kind).toBe('none');
        // Discovery + traversal both advance even without a pool.
        expect(result.state.world.currentMap.availableNodes).toContain('fv-3');
        expect(result.state.world.currentMap.lockedNodes).not.toContain('fv-3');
    });
});
