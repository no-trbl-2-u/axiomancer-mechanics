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
 * @property derivedStats - Calculated combat stats shared with enemies
 * @property nonCombatStats - Player-only stats used outside of combat (saves, ability tests)
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
    nonCombatStats: NonCombatStats;
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
 * @property body - Physical strength and consjtitution (affects physical skills, health, and body-type combat)
 * @property mind - Intelligence, reflexes, and perception (affects mental skills and mind-type combat)
 */
export interface BaseStats {
    heart: number;
    body: number;
    mind: number;
}

/**
 * Derived combat stats shared between Characters and Enemies.
 * Each stat type (body/mind/heart) produces three combat values.
 *
 * ATTACK vs SKILL distinction:
 * @property physicalAttack   - Body-type combat roll modifier. Used in attack rolls.
 * @property physicalSkill    - How well the entity uses body-based skills in combat.
 * @property physicalDefense  - Defense value against body-type attacks.
 * (same pattern for mental* and emotional*)
 * @property luck - Average of all three base stats (crits, random events)
 */
export interface DerivedStats {
    // Body-derived
    physicalAttack: number;
    physicalSkill: number;
    physicalDefense: number;

    // Mind-derived
    mentalAttack: number;
    mentalSkill: number;
    mentalDefense: number;

    // Heart-derived
    emotionalAttack: number;
    emotionalSkill: number;
    emotionalDefense: number;

    // Shared
    luck: number;
}

/**
 * Non-combat stats derived from base stats. Character-only — enemies do not have these.
 * Used for out-of-combat skill checks, saving throws, and ability tests.
 *
 * @property physicalSave  - Saving throw for resisting body-type effects
 * @property physicalTest  - General body ability tests (lifting, endurance, etc.)
 * (same pattern for mental* and emotional*)
 */
export interface NonCombatStats {
    physicalSave: number;
    physicalTest: number;
    mentalSave: number;
    mentalTest: number;
    emotionalSave: number;
    emotionalTest: number;
}