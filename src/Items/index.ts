/**
 * Items System Module
 * Handles equipment and consumables
 * Note: Item types are not yet fully defined - these are placeholders
 */

import { Item } from './types';

// Export all types
export * from './types';

// ============================================================================
// PLACEHOLDER INTERFACES
// ============================================================================

/**
 * Base item interface (placeholder)
 */
export interface BaseItem {
    id: string;
    name: string;
    description: string;
    type: Item;
}

/**
 * Consumable item interface (placeholder)
 */
export interface Consumable extends BaseItem {
    type: 'consumable';
    healAmount?: number;
    manaAmount?: number;
}

// ============================================================================
// ITEM CREATION
// ============================================================================

/**
 * Creates a new consumable item
 * @param id - Unique identifier
 * @param name - Display name
 * @param description - Item description
 * @param healAmount - Amount of health restored
 * @returns A new consumable item
 */
export function createConsumable(
    id: string,
    name: string,
    description: string,
    healAmount: number
): Consumable {
    return undefined as any;
}

// ============================================================================
// ITEM USAGE
// ============================================================================

/**
 * Uses a consumable and returns its effects
 * @param consumable - The consumable being used
 * @returns Object describing the effects (heal, mana, etc.)
 */
export function useConsumable(consumable: Consumable): { heal: number; mana: number } {
    return undefined as any;
}
