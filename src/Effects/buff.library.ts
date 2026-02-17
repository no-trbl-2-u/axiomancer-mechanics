/**
 * Buff Library
 * Static data definitions for all buff effects in the game
 */

import { Effect } from './types';
import buffsData from './buffs.library.json';

/**
 * All buff effects loaded from the JSON library
 */
export const BUFF_LIBRARY: Effect[] = buffsData.buffs as Effect[];

/**
 * Retrieves a buff by its unique ID
 * @param id - The buff ID to look up
 * @returns The matching Effect or undefined if not found
 */
export function getBuffById(id: string): Effect | undefined {
    return BUFF_LIBRARY.find((buff: Effect) => buff.id === id);
}

/**
 * Retrieves all buffs matching a given category
 * @param category - The effect category to filter by
 * @returns Array of matching buffs
 */
export function getBuffsByCategory(category: string): Effect[] {
    return BUFF_LIBRARY.filter((buff: Effect) => buff.category === category);
}
