/**
 * Item Reducer
 * Functions that modify GameState related to items
 * All functions here are pure and return new state objects
 */

import { GameState } from "../Game/types";
import { Item, Consumable, Material, isConsumable } from "./types";
import { healCharacter } from "../Combat";
import { applyEffect } from "../Effects";
import { lookupEffect } from "../Effects/effects.library";

// ============================================================================
// INVENTORY MANAGEMENT (GameState level)
// ============================================================================

/**
 * Adds an item to the player's inventory
 * @param state - The current game state
 * @param item - The item to add to the inventory
 * @returns The new game state with the item added to the inventory
 */
export function addItemToInventory(state: GameState, item: Item): GameState {
    return {
        ...state,
        player: {
            ...state.player,
            inventory: [...state.player.inventory, item],
        },
    };
}

/**
 * Removes an item from the player's inventory by ID
 * @param state - The current game state
 * @param itemId - The ID of the item to remove
 * @returns The new game state with the item removed from inventory
 */
export function removeItemFromInventory(state: GameState, itemId: string): GameState {
    return {
        ...state,
        player: {
            ...state.player,
            inventory: state.player.inventory.filter(item => item.id !== itemId),
        },
    };
}

/**
 * Uses a consumable item, applying its effect and reducing quantity.
 *
 * Effects applied (when the relevant fields are set):
 *   - `heal` numeric  → healCharacter(player, heal)
 *   - `restoreMana`   → adds to player.mana, clamped to maxMana
 *   - `effectId`      → applyEffect via the effects engine, with optional
 *                       `power` (intensity) and `duration`. The same
 *                       effect runs through stacking rules (none /
 *                       intensity / duration) per the library entry.
 *
 * Pure — input state is never mutated. Quantity decrements; a stack at
 * 0 is removed from the inventory.
 *
 * @param state - The current game state
 * @param itemId - The ID of the consumable to use
 * @returns The new game state after using the consumable
 */
export function useConsumable(state: GameState, itemId: string): GameState {
    const item = state.player.inventory.find(i => i.id === itemId);

    if (!item || !isConsumable(item)) {
        return state;
    }

    let player = state.player;

    if (typeof item.heal === 'number' && item.heal > 0) {
        player = healCharacter(player, item.heal);
    }
    if (typeof item.restoreMana === 'number' && item.restoreMana > 0) {
        player = { ...player, mana: Math.min(player.maxMana, player.mana + item.restoreMana) };
    }
    if (item.effectId) {
        const effectDef = lookupEffect(item.effectId);
        if (effectDef) {
            const round = state.combatState?.round ?? 0;
            const overrides = item.duration !== undefined
                ? { intensityDelta: item.power ?? 1, durationMode: 'reset' as const }
                : { intensityDelta: item.power ?? 1 };
            const adjustedEffect = item.duration !== undefined
                ? { ...effectDef, duration: item.duration }
                : effectDef;
            const { activeEffects } = applyEffect(player.currentActiveEffects, adjustedEffect, round, overrides);
            player = { ...player, currentActiveEffects: activeEffects };
        }
    }

    const stateWithPlayer: GameState = { ...state, player };

    if (item.quantity <= 1) {
        return removeItemFromInventory(stateWithPlayer, itemId);
    }

    return {
        ...stateWithPlayer,
        player: {
            ...stateWithPlayer.player,
            inventory: stateWithPlayer.player.inventory.map(i =>
                i.id === itemId && isConsumable(i)
                    ? { ...i, quantity: i.quantity - 1 }
                    : i,
            ),
        },
    };
}

/**
 * Increases the quantity of a stackable item in inventory
 * @param state - The current game state
 * @param itemId - The ID of the item to stack
 * @param amount - Amount to add to the stack
 * @returns The new game state with updated item quantity
 */
export function stackItem(state: GameState, itemId: string, amount: number): GameState {
    return {
        ...state,
        player: {
            ...state.player,
            inventory: state.player.inventory.map(item => {
                if (item.id === itemId && isConsumable(item)) {
                    return { ...item, quantity: item.quantity + amount };
                }
                if (item.id === itemId && item.category === 'material') {
                    return { ...item, quantity: (item as Material).quantity + amount };
                }
                return item;
            }),
        },
    };
}
