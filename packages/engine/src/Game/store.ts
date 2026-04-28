/**
 * Game Store
 *
 * Single Zustand vanilla store for the entire game state.
 * Framework-agnostic — works in Node.js CLI today, React Native tomorrow.
 *
 * ── Architectural rule ───────────────────────────────────────────────────────
 * Any function that modifies the ROOT GameState must be a store action here.
 * Functions that operate on sub-state (CombatState, Character, WorldState, etc.)
 * remain pure functions in their own modules — they're called from within these
 * actions, or from the game loop, and their results flow back through the store.
 *
 * ── Usage (Node.js / CLI) ────────────────────────────────────────────────────
 *   import { createGameStore } from './Game/store';
 *   import { createNodeAdapter } from './Game/persistence/node.adapter';
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
import { Item, Consumable, isConsumable } from '../Items/types';
import { GameState } from './types';
import { initializeCombat } from '../Combat/combat.reducer';
import { createNewGameState, GAME_STATE_VERSION } from './game.reducer';
import { PersistenceAdapter } from './persistence/types';

// ─── Store Shape ──────────────────────────────────────────────────────────────

/**
 * GameActions — every operation that mutates the root GameState.
 * Grouped by domain to make it easy to find the right action.
 */
export type GameActions = {

    // ── Combat ───────────────────────────────────────────────────────────────

    /**
     * Begins a combat encounter.
     * Snapshots the current player into a fresh CombatState so combat
     * mutations never bleed back into the top-level player until the fight ends.
     */
    startCombat: (enemy: Enemy) => void;

    /**
     * Applies the result of one resolved combat turn.
     * Call after each runCombatTurn() in the game loop.
     */
    applyCombatTurn: (updatedCombat: CombatState) => void;

    /**
     * Ends the current combat encounter.
     * The player's final state from combat is written back to root,
     * and combatState is cleared.
     */
    endCombat: () => void;

    // ── Inventory ────────────────────────────────────────────────────────────

    /** Adds an item to the player's inventory. */
    addItemToInventory: (item: Item) => void;

    /** Removes an item from the player's inventory by ID. */
    removeItemFromInventory: (itemId: string) => void;

    /**
     * Uses a consumable item, reducing its quantity (or removing it if
     * the last one). Effect application is TODO until the effects engine lands.
     */
    useConsumable: (itemId: string) => void;

    /**
     * Increases the quantity of a stackable item (consumable or material).
     * Typically called when the player picks up more of an item they already carry.
     */
    stackItem: (itemId: string, amount: number) => void;

    // ── Persistence ──────────────────────────────────────────────────────────

    /** Persist the current state snapshot via the injected adapter. */
    save: () => void;
};

/** Full store type — state + actions in one object (standard Zustand pattern). */
export type GameStore = GameState & GameActions;

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * createGameStore
 *
 * Constructs a Zustand vanilla store backed by the provided persistence adapter.
 *
 * @param adapter   - Where to load from / save to (Node.js fs, AsyncStorage, etc.)
 * @param overrides - Optional partial state to merge on top of the loaded / default state.
 *                    Useful in tests and CLIs to inject a specific player or world.
 */
export function createGameStore(
    adapter: PersistenceAdapter,
    overrides?: Partial<GameState>,
): StoreApi<GameStore> {
    const saved   = adapter.load();
    const base    = saved ?? createNewGameState();
    const initial: GameState = { ...base, ...overrides };

    return createStore<GameStore>()((set, get) => ({
        // ── Initial state ────────────────────────────────────────────────────
        ...initial,

        // ── Combat ───────────────────────────────────────────────────────────

        startCombat(enemy: Enemy): void {
            const { player } = get();
            set({ combatState: initializeCombat(player, enemy) });
        },

        applyCombatTurn(updatedCombat: CombatState): void {
            set({ combatState: updatedCombat });
        },

        endCombat(): void {
            const { combatState } = get();
            if (!combatState) return;
            // Promote the player's final state from combat back to root.
            set({ player: combatState.player, combatState: null });
        },

        // ── Inventory ────────────────────────────────────────────────────────

        addItemToInventory(item: Item): void {
            set(state => ({
                player: {
                    ...state.player,
                    inventory: [...state.player.inventory, item],
                },
            }));
        },

        removeItemFromInventory(itemId: string): void {
            set(state => ({
                player: {
                    ...state.player,
                    inventory: state.player.inventory.filter(i => i.id !== itemId),
                },
            }));
        },

        useConsumable(itemId: string): void {
            const { player } = get();
            const item = player.inventory.find(i => i.id === itemId);
            if (!item || !isConsumable(item)) return;

            // TODO: Apply consumable effect via the effects engine (Phase 1).

            const consumable = item as Consumable;
            if (consumable.quantity <= 1) {
                // Last one — remove entirely
                set(state => ({
                    player: {
                        ...state.player,
                        inventory: state.player.inventory.filter(i => i.id !== itemId),
                    },
                }));
            } else {
                // Decrement quantity
                set(state => ({
                    player: {
                        ...state.player,
                        inventory: state.player.inventory.map(i =>
                            i.id === itemId && isConsumable(i)
                                ? { ...i, quantity: i.quantity - 1 }
                                : i
                        ),
                    },
                }));
            }
        },

        stackItem(itemId: string, amount: number): void {
            set(state => ({
                player: {
                    ...state.player,
                    inventory: state.player.inventory.map(i =>
                        i.id === itemId && (i.category === 'consumable' || i.category === 'material')
                            ? { ...i, quantity: (i as Consumable).quantity + amount }
                            : i
                    ),
                },
            }));
        },

        // ── Persistence ──────────────────────────────────────────────────────

        save(): void {
            const { version, player, world, combatState } = get();
            adapter.save({ version, player, world, combatState });
        },
    }));
}

// ─── Selectors ────────────────────────────────────────────────────────────────
// Convenience selectors for React Native's useStore hook.
// e.g.  const player = useStore(store, selectPlayer);

export type { StoreApi };

export const selectPlayer      = (s: GameStore): Character          => s.player;
export const selectCombatState = (s: GameStore): CombatState | null => s.combatState;
export const selectIsInCombat  = (s: GameStore): boolean            => s.combatState !== null;
export const selectInventory   = (s: GameStore): Item[]             => s.player.inventory;
export const selectVersion     = (s: GameStore): number             => s.version;
