import { Item } from '../items/types';
import { ActiveEffect } from '../effects/types';

/**
 * Character represents a player character with stats, resources, and progression
 * @property name - The character's display name
 * @property level - Current character level (affects stat scaling and abilities)
 * @property experience - Current experience points accumulated
 * @property experienceToNextLevel - Experience threshold for the next level
 * @property health - Current health points (0 = defeated)
 * @property maxHealth - Maximum health points (calculated from level and base stats)
 * @property mana - Current mana points (used for skills and abilities)
 * @property maxMana - Maximum mana points (calculated from level and base stats)
 * @property baseStats - Core attributes that define the character's capabilities
 * @property derivedStats - Calculated combat stats shared with enemies
 * @property nonCombatStats - Player-only stats used outside of combat (saves, ability tests)
 * @property inventory - Items currently held by the character
 * @property currentActiveEffects - Status effects currently active on this character
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
    currentActiveEffects: ActiveEffect[];
}

/**
 * Base stats representing the three core attributes.
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
 * Derived combat stats shared between Characters and Enemies.
 * Each stat type (body/mind/heart) produces three combat values.
 *
 * ATTACK vs SKILL distinction:
 * - Attack stats are used in combat rolls (e.g. physicalAttack for body-type attacks)
 * - Skill stats govern skill usage and the philosophy bar
 * - Defense stats reduce incoming damage of that type
 *
 * @property physicalAttack - Body-type combat roll modifier
 * @property physicalSkill - Body-based skill usage modifier
 * @property physicalDefense - Defense value against body-type attacks
 * @property mentalAttack - Mind-type combat roll modifier
 * @property mentalSkill - Mind-based skill usage modifier
 * @property mentalDefense - Defense value against mind-type attacks
 * @property emotionalAttack - Heart-type combat roll modifier
 * @property emotionalSkill - Heart-based skill usage modifier
 * @property emotionalDefense - Defense value against heart-type attacks
 * @property luck - Average of all three base stats (crits, random events)
 */
export interface DerivedStats {
    physicalAttack: number;
    physicalSkill: number;
    physicalDefense: number;
    mentalAttack: number;
    mentalSkill: number;
    mentalDefense: number;
    emotionalAttack: number;
    emotionalSkill: number;
    emotionalDefense: number;
    luck: number;
}

/**
 * Non-combat stats derived from base stats. Character-only — enemies do not have these.
 * Used for out-of-combat skill checks, saving throws, and ability tests.
 * @property physicalSave - Saving throw for resisting body-type effects
 * @property physicalTest - General body ability tests (lifting, endurance, etc.)
 * @property mentalSave - Saving throw for resisting mind-type effects
 * @property mentalTest - General mind ability tests (puzzles, perception, etc.)
 * @property emotionalSave - Saving throw for resisting heart-type effects
 * @property emotionalTest - General heart ability tests (persuasion, charm, etc.)
 */
export interface NonCombatStats {
    physicalSave: number;
    physicalTest: number;
    mentalSave: number;
    mentalTest: number;
    emotionalSave: number;
    emotionalTest: number;
}
