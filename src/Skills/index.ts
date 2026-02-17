/**
 * Skills System Module
 * Handles skill management and usage in combat
 */

import { Skill, SkillCategory, SkillsStatType } from './types';
import { Character } from '../Character/types';

// ============================================================================
// SKILL CREATION
// ============================================================================

/**
 * Creates a new skill with specified properties
 * @param id - Unique identifier for the skill
 * @param name - Display name of the skill
 * @param description - Flavor text description
 * @param level - Skill level or power tier
 * @param manaCost - Mana required to use the skill
 * @param type - Skill category (fallacy or paradox)
 * @param philosophicalAspect - Which stat type the skill aligns with
 * @returns A new Skill instance
 */
export function createSkill(
    id: string,
    name: string,
    description: string,
    level: number,
    manaCost: number,
    type: SkillCategory,
    philosophicalAspect: SkillsStatType = 'mind'
): Skill {
    return {
        id,
        name,
        description,
        level,
        manaCost,
        category: type,
        philosophicalAspect,
    };
}

// ============================================================================
// SKILL UTILITIES
// ============================================================================

/**
 * Checks if a character can use a skill (has enough mana)
 * @param character - The character attempting to use the skill
 * @param skill - The skill to use
 * @returns True if character has sufficient mana
 */
export function canUseSkill(character: Character, skill: Skill): boolean {
    return character.mana >= skill.manaCost;
}

/**
 * Calculates the damage a skill would deal
 * @param skill - The skill being used
 * @param character - The character using the skill
 * @returns Calculated damage value
 */
export function calculateSkillDamage(skill: Skill, character: Character): number {
    const baseStat: number = character.baseStats[skill.philosophicalAspect];
    return Math.floor(skill.level * baseStat * 1.5);
}
