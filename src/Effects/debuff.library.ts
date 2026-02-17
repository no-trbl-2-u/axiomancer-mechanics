/**
 * Debuff Library
 * Static data definitions for all debuff effects in the game
 */

import { Effect } from './types';
import debuffsData from './debuffs.library.json';

/**
 * All debuff effects loaded from the JSON library
 */
export const DEBUFF_LIBRARY: Effect[] = debuffsData.debuffs as Effect[];

/**
 * Retrieves a debuff by its unique ID
 * @param id - The debuff ID to look up
 * @returns The matching Effect or undefined if not found
 */
export function getDebuffById(id: string): Effect | undefined {
    return DEBUFF_LIBRARY.find((debuff: Effect) => debuff.id === id);
}

/**
 * Retrieves all debuffs matching a given category
 * @param category - The effect category to filter by
 * @returns Array of matching debuffs
 */
export function getDebuffsByCategory(category: string): Effect[] {
    return DEBUFF_LIBRARY.filter((debuff: Effect) => debuff.category === category);
}
