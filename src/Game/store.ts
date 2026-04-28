/**
 * Game Store
 *
 * A framework-agnostic Zustand vanilla store. Works in Node.js today and
 * in React Native via the `useStore` hook.
 *
 * ── Architectural rule ───────────────────────────────────────────────────────
 * Functions that modify the ROOT GameState live here as store actions.
 * Pure functions that operate on sub-state (CombatState, Character, WorldState)
 * stay in their own modules and are composed inside these actions.
 *
 * ── Usage (Node.js) ──────────────────────────────────────────────────────────
 *   import { createGameStore, createNodeAdapter } from 'axiomancer-mechanics';
 *
 *   const store = createGameStore(createNodeAdapter());
 *   store.getState().startCombat(someEnemy);
 *
 * ── Usage (React Native) ─────────────────────────────────────────────────────
 *   import { createGameStore } from 'axiomancer-mechanics';
 *   import { useStore } from 'zustand';
 *
 *   const store = createGameStore(asyncStorageAdapter);
 *   const player = useStore(store, s => s.player);
 */

import { createStore, StoreApi } from 'zustand/vanilla';
import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { CombatState } from '../Combat/types';
import { initializeCombat } from '../Combat/combat.reducer';
import { Item } from '../Items/types';
import { addItem, removeItem, useConsumable as useConsumableItem, stackItem as stackInventoryItem } from '../Items/item.reducer';
import { GameState } from './types';
import { createNewGameState } from './game.reducer';
import { PersistenceAdapter } from './persistence/types';

/**
 * Every operation that mutates the root GameState. Grouped by domain.
 */
export interface GameActions {
    // ── Combat ───────────────────────────────────────────────────────────────
    /** Begins a combat encounter against `enemy`, snapshotting the player. */
    startCombat: (enemy: Enemy) => void;
    /** Replaces the in-progress combat snapshot. */
    updateCombat: (combat: CombatState) => void;
    /** Promotes the combat snapshot's player back to root and clears combat. */
    endCombat: () => void;

    // ── Inventory ────────────────────────────────────────────────────────────
    addItem: (item: Item) => void;
    removeItem: (itemId: string) => void;
    useConsumable: (itemId: string) => void;
    stackItem: (itemId: string, amount: number) => void;

    // ── Persistence ──────────────────────────────────────────────────────────
    save: () => void;
}

/** Full store type — state + actions. */
export type GameStore = GameState & GameActions;

/**
 * Constructs a Zustand vanilla store backed by `adapter`.
 *
 * @param adapter   - Persistence backend (Node fs, AsyncStorage, null for tests).
 * @param overrides - Optional partial state to merge over the loaded/default state.
 */
export function createGameStore(
    adapter: PersistenceAdapter,
    overrides?: Partial<GameState>,
): StoreApi<GameStore> {
    const saved   = adapter.load();
    const base    = saved ?? createNewGameState();
    const initial: GameState = { ...base, ...overrides };

    return createStore<GameStore>()((set, get) => ({
        ...initial,

        // ── Combat ───────────────────────────────────────────────────────────
        startCombat(enemy) {
            set({ combat: initializeCombat(get().player, enemy) });
        },

        updateCombat(combat) {
            set({ combat });
        },

        endCombat() {
            const { combat } = get();
            if (!combat) return;
            set({ player: combat.player, combat: null });
        },

        // ── Inventory ────────────────────────────────────────────────────────
        addItem(item) {
            set(state => ({ player: { ...state.player, inventory: addItem(state.player.inventory, item) } }));
        },

        removeItem(itemId) {
            set(state => ({ player: { ...state.player, inventory: removeItem(state.player.inventory, itemId) } }));
        },

        useConsumable(itemId) {
            set(state => ({ player: { ...state.player, inventory: useConsumableItem(state.player.inventory, itemId) } }));
        },

        stackItem(itemId, amount) {
            set(state => ({ player: { ...state.player, inventory: stackInventoryItem(state.player.inventory, itemId, amount) } }));
        },

        // ── Persistence ──────────────────────────────────────────────────────
        save() {
            const { version, player, world, combat } = get();
            adapter.save({ version, player, world, combat });
        },
    }));
}

// ─── Selectors ────────────────────────────────────────────────────────────────

export type { StoreApi };

export const selectPlayer      = (s: GameStore): Character          => s.player;
export const selectCombat      = (s: GameStore): CombatState | null => s.combat;
export const selectIsInCombat  = (s: GameStore): boolean            => s.combat !== null;
export const selectInventory   = (s: GameStore): Item[]             => s.player.inventory;
export const selectVersion     = (s: GameStore): number             => s.version;

// Backwards-compat alias.
export const selectCombatState = selectCombat;
