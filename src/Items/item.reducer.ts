/**
 * Item Reducer
 * Functions that modify GameState related to items
 * All functions here are pure and return new state objects
 */

import { GameState } from "../Game/types";
import { Item, Consumable, isConsumable } from "./types";

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
 * Uses a consumable item, applying its effect and reducing quantity
 * @param state - The current game state
 * @param itemId - The ID of the consumable to use
 * @returns The new game state after using the consumable
 */
export function useConsumable(state: GameState, itemId: string): GameState {
    const item = state.player.inventory.find(i => i.id === itemId);

    if (!item || !isConsumable(item)) {
        return state;
    }

    // TODO: Apply consumable effect based on item.effect

    // Reduce quantity or remove if last one
    if (item.quantity <= 1) {
        return removeItemFromInventory(state, itemId);
    }

    return {
        ...state,
        player: {
            ...state.player,
            inventory: state.player.inventory.map(i =>
                i.id === itemId && isConsumable(i)
                    ? { ...i, quantity: i.quantity - 1 }
                    : i
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
                if (item.id === itemId && (item.category === 'consumable' || item.category === 'material')) {
                    return { ...item, quantity: (item as any).quantity + amount };
                }
                return item;
            }),
        },
    };
}
