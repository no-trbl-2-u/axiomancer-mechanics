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
import { Enemy, LootTableEntry } from '../Enemy/types';
import { rollLoot } from '../Enemy/loot';
import { CombatState } from '../Combat/types';
import { initializeCombat } from '../Combat/combat.reducer';
import { Encounter } from '../World/types';
import {
    Item, Equipment, EquipmentSlot, isConsumable, isMaterial,
} from '../Items/types';
import {
    addItem, removeItem, useConsumable as useConsumableItem,
    stackItem as stackInventoryItem,
} from '../Items/item.reducer';
import { useConsumableEffect } from '../Items/equipment.engine';
import {
    equipItem as equipItemReducer,
    unequipItem as unequipItemReducer,
} from '../Character/equipment.reducer';
import { lookupEffect } from '../Effects/effects.library';
import { GameState } from './types';
import { createNewGameState } from './game.reducer';
import { PersistenceAdapter } from './persistence/types';
import { killObjectives, progressQuest, findQuest } from '../World/quest.engine';
import { QuestLog } from '../World/types';

/**
 * Summary of what an `endCombat` call granted to the player (Spec 07).
 *
 * Returned from `endCombat()` so the CLI / UI can render an after-action
 * report. Spec 06 will turn this into the level-up prompt; today the store
 * already applies the XP delta to `player.experience` and adds the rolled
 * loot to `player.inventory`.
 *
 * - `outcome` — `'victory'` when the player killed the enemy, `'defeat'`
 *   when the player went down first, `'flee'` when combat ended without
 *   either combatant being KO'd (covers the friendship-counter exit).
 * - `xpGained` — flat XP added to `player.experience` this turn. Zero on
 *   defeat or when no encounter was active.
 * - `loot` — items added to `player.inventory` (post stack-merge).
 */
export interface CombatEndReport {
    outcome: 'victory' | 'defeat' | 'flee';
    xpGained: number;
    loot: Item[];
}

/**
 * Every operation that mutates the root GameState. Grouped by domain.
 */
export interface GameActions {
    // ── Combat ───────────────────────────────────────────────────────────────
    /**
     * Begins a combat encounter. Accepts either a bare `Enemy` (back-compat)
     * or an `Encounter` produced by `generateEncounter`. When given an
     * `Encounter`, only the first enemy is consumed by the 1v1 resolver
     * today; the rest are retained on the encounter and will be picked up
     * by multi-enemy combat in a later spec.
     */
    startCombat: (target: Enemy | Encounter) => void;
    /** Replaces the in-progress combat snapshot. */
    updateCombat: (combat: CombatState) => void;
    /**
     * Promotes the combat snapshot's player back to root and clears combat.
     * Returns a {@link CombatEndReport} summarising XP + loot grants so the
     * CLI / UI can show an after-action panel. Spec 06 progression consumes
     * the XP delta; until level-up math lands, the store just adds the
     * delta to `player.experience` and stack-merges the rolled loot into
     * `player.inventory`.
     */
    endCombat: () => CombatEndReport;

    // ── Inventory ────────────────────────────────────────────────────────────
    addItem: (item: Item) => void;
    removeItem: (itemId: string) => void;
    /**
     * Uses a consumable from the player's inventory: applies its
     * `healAmount` and/or `effectId` / `inlineEffect` payload via
     * `useConsumableEffect`, then decrements the stack. No-op if `itemId`
     * is unknown or refers to a non-consumable item.
     */
    useConsumable: (itemId: string) => void;
    stackItem: (itemId: string, amount: number) => void;

    // ── Equipment ────────────────────────────────────────────────────────────
    /**
     * Equips the given `Equipment` onto the player. If another item is
     * already in the slot, it is dropped (caller is responsible for first
     * pushing it back into inventory if desired).
     */
    equipItem: (item: Equipment) => void;
    /** Unequips the item in the given slot (no-op if empty). */
    unequipItem: (slot: EquipmentSlot) => void;

    // ── Persistence ──────────────────────────────────────────────────────────
    save: () => void;
}

/** Full store type — state + actions. */
export type GameStore = GameState & GameActions;

/**
 * Internal — type-guard for the `Enemy | Encounter` overload. A bare
 * `Enemy` carries `level` / `baseStats` directly; an `Encounter` carries
 * the `enemies` array.
 */
function isEncounter(target: Enemy | Encounter): target is Encounter {
    return Array.isArray((target as Encounter).enemies);
}

/**
 * Stack-aware inventory append. If `item` is a stackable kind (consumable /
 * material) and an entry with the same `id` already exists, its quantity
 * is bumped; otherwise the item is appended.
 */
function addItemStacking(inventory: Item[], item: Item): Item[] {
    if (isConsumable(item) || isMaterial(item)) {
        const existing = inventory.find(i => i.id === item.id);
        if (existing && (isConsumable(existing) || isMaterial(existing))) {
            return stackInventoryItem(inventory, item.id, item.quantity);
        }
    }
    return addItem(inventory, item);
}

/**
 * Rolls one drop per enemy in the encounter, returning the non-null items.
 * Each enemy's loot table is rolled independently.
 */
function rollEncounterLoot(encounter: Encounter, rng: () => number = Math.random): Item[] {
    const drops: Item[] = [];
    for (const enemy of encounter.enemies) {
        const drop = rollLoot(enemy.loot as LootTableEntry[] | undefined, rng);
        if (drop) drops.push(drop);
    }
    return drops;
}

/**
 * Sums every enemy's `xpReward` to produce the encounter-level XP grant.
 * Missing values fall through as zero so old enemies without `xpReward`
 * are still safe to encounter.
 */
function totalXpReward(encounter: Encounter): number {
    return encounter.enemies.reduce(
        (sum, e) => sum + (e.xpReward ?? 0),
        0,
    );
}

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

    // `currentEncounter` lives outside `GameState` so it doesn't leak into
    // save files (encounters are re-rolled on load). It tracks the currently
    // active fight so `endCombat` can grant XP + loot per Spec 07.
    let currentEncounter: Encounter | null = null;

    return createStore<GameStore>()((set, get) => ({
        ...initial,

        // ── Combat ───────────────────────────────────────────────────────────
        startCombat(target) {
            const encounter: Encounter = isEncounter(target)
                ? target
                : { enemies: [target] };
            if (encounter.enemies.length === 0) {
                throw new Error('startCombat: encounter has no enemies.');
            }
            currentEncounter = encounter;
            set({ combat: initializeCombat(get().player, encounter.enemies[0]) });
        },

        updateCombat(combat) {
            set({ combat });
        },

        endCombat() {
            const { combat, player } = get();
            if (!combat) {
                return { outcome: 'flee', xpGained: 0, loot: [] };
            }

            // Decide outcome from the combat snapshot.
            const outcome: CombatEndReport['outcome'] =
                combat.enemy.health <= 0 ? 'victory'
                : combat.player.health <= 0 ? 'defeat'
                : 'flee';

            // Promote the combat snapshot's player back to root.
            let nextPlayer: Character = combat.player;

            // Victory grant: roll loot, sum XP, fold into the player.
            let xpGained = 0;
            const loot: Item[] = [];
            let nextQuests: QuestLog = get().quests;
            if (outcome === 'victory' && currentEncounter) {
                xpGained = totalXpReward(currentEncounter);
                const rolled = rollEncounterLoot(currentEncounter);
                let nextInventory = nextPlayer.inventory;
                for (const drop of rolled) {
                    nextInventory = addItemStacking(nextInventory, drop);
                    loot.push(drop);
                }
                nextPlayer = {
                    ...nextPlayer,
                    experience: nextPlayer.experience + xpGained,
                    inventory: nextInventory,
                };
                // Advance any active `kill` objectives whose target matches.
                // Quest objectives compare against the enemy's display `name`
                // (avoids needing a separate slug field on every enemy).
                for (const enemy of currentEncounter.enemies) {
                    const kills = killObjectives(nextQuests, enemy.name);
                    for (const k of kills) {
                        const res = progressQuest(nextQuests, k.questName, k.objectiveId, 1);
                        nextQuests = res.log;
                        if (res.completedName) {
                            const q = findQuest(get().quests, res.completedName);
                            if (q && typeof q.reward !== 'string' && q.reward && 'kind' in q.reward) {
                                if (q.reward.kind === 'currency') {
                                    nextPlayer = { ...nextPlayer, currency: nextPlayer.currency + q.reward.amount };
                                } else if (q.reward.kind === 'experience') {
                                    nextPlayer = { ...nextPlayer, experience: nextPlayer.experience + q.reward.amount };
                                }
                            }
                        }
                    }
                }
            } else {
                // Use the existing root inventory so loot doesn't leak when
                // the player is KO'd or flees.
                nextPlayer = { ...nextPlayer, inventory: player.inventory };
            }

            currentEncounter = null;
            set({ player: nextPlayer, combat: null, quests: nextQuests });
            return { outcome, xpGained, loot };
        },

        // ── Inventory ────────────────────────────────────────────────────────
        addItem(item) {
            set(state => ({ player: { ...state.player, inventory: addItem(state.player.inventory, item) } }));
        },

        removeItem(itemId) {
            set(state => ({ player: { ...state.player, inventory: removeItem(state.player.inventory, itemId) } }));
        },

        useConsumable(itemId) {
            const { player } = get();
            const item = player.inventory.find(i => i.id === itemId);
            if (!item || !isConsumable(item)) return;
            const { player: nextPlayer } = useConsumableEffect(player, item, 0, lookupEffect);
            const nextInventory = useConsumableItem(nextPlayer.inventory, itemId);
            set({ player: { ...nextPlayer, inventory: nextInventory } });
        },

        stackItem(itemId, amount) {
            set(state => ({ player: { ...state.player, inventory: stackInventoryItem(state.player.inventory, itemId, amount) } }));
        },

        // ── Equipment ────────────────────────────────────────────────────────
        equipItem(item) {
            set(state => ({ player: equipItemReducer(state.player, item) }));
        },

        unequipItem(slot) {
            set(state => ({ player: unequipItemReducer(state.player, slot) }));
        },

        // ── Persistence ──────────────────────────────────────────────────────
        save() {
            const { version, player, world, combat, quests, flags } = get();
            adapter.save({ version, player, world, combat, quests, flags });
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
