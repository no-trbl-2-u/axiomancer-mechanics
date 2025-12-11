// ============================================================================
// ITEM REDUCERS
// ============================================================================

import { GameState } from "Game/types";
import { Item } from "./types";

/**
 * Adds an item to the player's inventory
 * @param state - The current game state
 * @param item - The item to add to the inventory
 * @returns The new game state with the item added to the inventory
 */
export const addItemToInventory = (state: GameState, item: Item) => {
    return {
        ...state,
        player: {
            ...state.player,
            inventory: [...state.player.inventory, item],
        },
    };
}