import { Item } from '../Items/types';

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
    inventory: Item[] | [];
    equipped?: null // TODO: Implement Equipment types
    skills?: null // TODO: Implement Skills types
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
 * Derived stats calculated from base stats
 * Used in combat and skill checks. Each stat type has four derived values.
 * @property physicalSkill - (Guess) Modifier for physical skill checks and body-type attack rolls
 * @property physicalDefense - (Guess) Defense value against physical/body-type attacks
 * @property physicalSave - (Guess) Saving throw modifier for resisting physical effects
 * @property physicalTest - (Guess) Modifier for physical ability tests and challenges
 * @property mentalSkill - (Guess) Modifier for mental skill checks and mind-type attack rolls
 * @property mentalDefense - (Guess) Defense value against mental/mind-type attacks
 * @property mentalSave - (Guess) Saving throw modifier for resisting mental effects
 * @property mentalTest - (Guess) Modifier for mental ability tests and challenges
 * @property emotionalSkill - (Guess) Modifier for emotional skill checks and heart-type attack rolls
 * @property emotionalDefense - (Guess) Defense value against emotional/heart-type attacks
 * @property emotionalSave - (Guess) Saving throw modifier for resisting emotional effects
 * @property emotionalTest - (Guess) Modifier for emotional ability tests and challenges
 * @property luck - Average of all three base stats (affects critical hits and random events)
 */
export interface DerivedStats {
    // Body-derived
    physicalSkill: number;
    physicalDefense: number;
    physicalSave: number;
    physicalTest: number;

    // Mind-derived
    mentalSkill: number;
    mentalDefense: number;
    mentalSave: number;
    mentalTest: number;

    // Heart-derived
    emotionalSkill: number;
    emotionalDefense: number;
    emotionalSave: number;
    emotionalTest: number;

    // Shared
    luck: number;
}