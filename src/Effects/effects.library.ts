import buffsLibrary from './buffs.library.json';
import debuffsLibrary from './debuffs.library.json';
import { ActiveEffect, Effect, EffectType } from './types';

const buffs = buffsLibrary.buffs as Effect[];
const debuffs = debuffsLibrary.debuffs as Effect[];

// Unified registry: build a map once at module load for O(1) lookups
const effectRegistry = new Map<string, Effect>();

// Populate the registry
[...buffs, ...debuffs].forEach(effect => {
    effectRegistry.set(effect.id, effect);
});

export const effectsLibrary = {
    buffs,
    debuffs,
    registry: effectRegistry,
};

// ===============================================
// EFFECT LOOKUP FUNCTIONS
// ===============================================

/**
 * Resolve an effect ID to its full Effect definition.
 * Used by the effect engine to look up mechanical data.
 * @param effectId - The effect ID to look up
 * @returns The Effect definition, or undefined if not found
 */
export const lookupEffect = (effectId: string): Effect | undefined => {
    return effectRegistry.get(effectId);
};

/**
 * Find an effect by its display name.
 * Slower than ID lookup; use sparingly.
 * @param name - The effect's display name
 * @returns The Effect definition, or undefined if not found
 */
export const getEffectByName = (name: string): Effect | undefined => {
    return [...effectRegistry.values()].find(effect => effect.name === name);
};

/**
 * Find an effect by its ID.
 * @param id - The effect's ID
 * @returns The Effect definition, or undefined if not found
 */
export const getEffectById = (id: string): Effect | undefined => {
    return effectRegistry.get(id);
};


// ===============================================
// EFFECT STAT AND VALUE LOOKUP FUNCTIONS
// ===============================================
/**
 * Get all effects of a specific type (buff or debuff).
 * @param type - 'buff' or 'debuff'
 * @returns Array of effects matching the type
 */
export const getEffectType = (type: EffectType): Effect[] => {
    return [...effectRegistry.values()].filter(effect => effect.type === type);
};

/**
 * Get the teir of an effect
 * @param teir - The teir of the effect to get
 * @returns Array of effects matching the teir
 * @example getEffectTeir('Teir 1') // Returns all effects with teir 'Teir 1'
 */
export const getEffectTeir = (effect: ActiveEffect): ActiveEffect['teir'] => {
    return effect.teir
}