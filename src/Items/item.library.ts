/**
 * Item Library
 *
 * Loads item definitions from JSON and provides O(1) lookups by ID.
 * Mirrors the pattern used in Effects/effects.library.ts.
 */

import consumableData from './consumable.library.json';
import equipmentData from './equipment.library.json';
import { Consumable, Equipment, EquipmentSlot, ConsumableEffect } from './types';

// ============================================================================
// RAW DATA
// ============================================================================

const consumables = consumableData.consumables as Consumable[];
const equipment   = equipmentData.equipment   as Equipment[];

// ============================================================================
// REGISTRIES
// ============================================================================

const consumableRegistry = new Map<string, Consumable>();
consumables.forEach(c => consumableRegistry.set(c.id, c));

const equipmentRegistry = new Map<string, Equipment>();
equipment.forEach(e => equipmentRegistry.set(e.id, e));

// ============================================================================
// CONSUMABLE LOOKUPS
// ============================================================================

/**
 * Look up a consumable template by ID.
 * Returns a fresh copy so callers can safely set quantity without
 * mutating the library reference.
 */
export function lookupConsumable(id: string): Consumable | undefined {
    const found = consumableRegistry.get(id);
    return found ? { ...found } : undefined;
}

/**
 * Get all consumable templates that match a given effect type.
 */
export function getConsumablesByEffect(effect: ConsumableEffect): Consumable[] {
    return consumables.filter(c => c.effect === effect);
}

/**
 * Returns a copy of every consumable in the library.
 */
export function getAllConsumables(): Consumable[] {
    return consumables.map(c => ({ ...c }));
}

// ============================================================================
// EQUIPMENT LOOKUPS
// ============================================================================

/**
 * Look up an equipment template by ID.
 * Returns a fresh copy.
 */
export function lookupEquipment(id: string): Equipment | undefined {
    const found = equipmentRegistry.get(id);
    return found ? { ...found, statModifiers: { ...found.statModifiers } } : undefined;
}

/**
 * Get all equipment templates for a given slot.
 */
export function getEquipmentBySlot(slot: EquipmentSlot): Equipment[] {
    return equipment.filter(e => e.slot === slot);
}

/**
 * Returns a copy of every equipment piece in the library.
 */
export function getAllEquipment(): Equipment[] {
    return equipment.map(e => ({ ...e, statModifiers: { ...e.statModifiers } }));
}
