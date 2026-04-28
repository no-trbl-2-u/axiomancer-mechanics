import { Character, BaseStats } from "./types";
import { ActiveEffect } from "../effects/types";
import { Item } from "../items/types";
import { deriveStats, deriveNonCombatStats, calculateMaxHealth, calculateMaxMana } from "../utils";
import { EXPERIENCE_PER_LEVEL } from "../game/game-mechanics.constants";

// ===============================================
// CHARACTER FACTORY
// ===============================================

/**
 * Options for creating a new Character
 * @property name - Character's display name
 * @property level - Starting level (affects stat scaling)
 * @property baseStats - Core body/mind/heart stats
 * @property inventory - Optional starting items
 * @property currentActiveEffects - Optional starting status effects
 */
interface CreateCharacterOptions {
    name: string;
    level: number;
    baseStats: BaseStats;
    inventory?: Item[];
    currentActiveEffects?: ActiveEffect[];
}

/**
 * Creates a new Character from base inputs, deriving all stats automatically.
 * @param options - Name, level, base stats, and optional starting inventory/effects
 * @returns A fully initialised Character
 */
export function createCharacter(options: CreateCharacterOptions): Character {
    const { name, level, baseStats, inventory = [], currentActiveEffects = [] } = options;

    const maxHealth = calculateMaxHealth(level, baseStats);
    const maxMana = calculateMaxMana(level, baseStats);

    return {
        name,
        level,
        experience: (level - 1) * EXPERIENCE_PER_LEVEL,
        experienceToNextLevel: level * EXPERIENCE_PER_LEVEL,
        health: maxHealth,
        maxHealth,
        mana: maxMana,
        maxMana,
        baseStats,
        derivedStats: deriveStats(baseStats),
        nonCombatStats: deriveNonCombatStats(baseStats),
        inventory,
        currentActiveEffects,
    };
}

// ===============================================
// RE-EXPORT (for backwards compatibility — canonical home is effects/resistance.ts)
// ===============================================

export { getResistStatFromResistedBy } from '../effects/resistance';

// ===============================================
// TYPE RE-EXPORTS — character subpath consumers can pull types from here
// ===============================================

export type { Character, BaseStats, DerivedStats, NonCombatStats } from './types';
