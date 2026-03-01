import { Item } from '../Items/types';
import { ActiveEffect } from '../Effects/types';
/**
 * Character module type definitions
 *
 * This module contains types for player characters, including:
 * - Character 
 * - Character stats and attributes
 * - TODO: Acquired Skills
 * - TODO: Equipped Skills
 * - TODO: Equipped Items
 * - TODO: Inventory
 */


/**
 * Character System Types
 * Core types for character attributes
 */

/**
 * Character represents a player character with stats, resources, and progression
 * @property name - The character's display name
 * @property level - Current character level (affects stat scaling and abilities)
 * @property health - Current health points (0 = defeated)
 * @property maxHealth - Maximum health points (calculated from level and base stats)
 * @property mana - Current mana points (used for skills and abilities)
 * @property maxMana - Maximum mana points (calculated from level and base stats)
 * @property baseStats - Core attributes that define the character's capabilities
 * @property derivedStats - Calculated stats used in combat and skill checks
 */
export interface Character {
    name: string;
    level: number;
    experience: number;
    experienceToNextLevel: number;
    health: number;
    maxHealth: number;
    mana: number;
    maxMana: number;
    baseStats: BaseStats;
    derivedStats: DerivedStats;
    inventory: Item[];
    currentActiveEffects: ActiveEffect[] | [];
    // TODO: Implement Equipment types
    // TODO: Implement Skills types
    // availableStatPoints: number;
}

/**
 * Base stats representing the three core attributes
 * These are the fundamental stats that all other stats derive from.
 * @property heart - Emotion, willpower, and charisma (affects emotional skills, mana, and heart-type combat)
 * @property body - Physical strength and constitution (affects physical skills, health, and body-type combat)
 * @property mind - Intelligence, reflexes, and perception (affects mental skills and mind-type combat)
 */
export interface BaseStats {
    heart: number;
    body: number;
    mind: number;
}

/**
 * Derived stats calculated from base stats.
 * Each stat type (body/mind/heart) produces five derived values.
 *
 * ATTACK vs SKILL distinction:
 * @property physicalAttack   - Body-type combat roll modifier. Used in attack rolls.
 * @property physicalSkill    - How well the character uses body-based skills.
 *                              Feeds the philosophy bar and skill-usage system.
 * @property physicalDefense  - Defense value against body-type attacks
 * @property physicalSave     - Saving throw for resisting body-type effects
 * @property physicalTest     - General body ability tests (lifting, endurance, etc.)
 * (same pattern for mental* and emotional*)
 * @property luck - Average of all three base stats (crits, random events)
 */
export interface DerivedStats {
    // Body-derived
    physicalAttack: number;
    physicalSkill: number;
    physicalDefense: number;
    physicalSave: number;
    physicalTest: number;

    // Mind-derived
    mentalAttack: number;
    mentalSkill: number;
    mentalDefense: number;
    mentalSave: number;
    mentalTest: number;

    // Heart-derived
    emotionalAttack: number;
    emotionalSkill: number;
    emotionalDefense: number;
    emotionalSave: number;
    emotionalTest: number;

    // Shared
    luck: number;
}