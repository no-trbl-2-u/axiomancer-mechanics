/**
 * Character Progression Module
 *
 * Pure functions covering experience gain, level-ups, stat point
 * allocation, and skill learning. All functions accept and return
 * `Character` objects without mutation.
 */

import { Character, BaseStats } from './types';
import { Skill } from '../Skills/types';
import { EXPERIENCE_PER_LEVEL } from '../Game/game-mechanics.constants';
import { deriveStats, deriveNonCombatStats, calculateMaxHealth, calculateMaxMana } from '../Utils';

// ============================================================================
// EXPERIENCE & LEVELING
// ============================================================================

/**
 * Cumulative experience required to reach the start of `level`.
 *
 * Curve: simple linear `level × EXPERIENCE_PER_LEVEL`. Exponential or
 * tiered curves can swap in here without changing the rest of the
 * progression API.
 *
 * @param level - The level being checked (1, 2, 3, ...)
 * @returns The XP threshold (xp ≥ this means the character has reached `level`)
 */
export function calculateExperienceToNextLevel(level: number): number {
    return level * EXPERIENCE_PER_LEVEL;
}

/**
 * Awards experience to a character. Pure — does NOT trigger level-ups
 * (use `levelUp` for that, ideally in a loop until the character no
 * longer qualifies).
 *
 * @param character - The character receiving XP
 * @param amount - Amount to add (clamped to ≥ 0)
 * @returns A new Character with `experience` increased
 */
export function grantExperience(character: Character, amount: number): Character {
    if (amount <= 0) return character;
    return {
        ...character,
        experience: character.experience + amount,
    };
}

const STAT_POINTS_PER_LEVEL = 2;

/**
 * Levels up a character if they have enough experience. Idempotent when
 * underqualified — returns the input unchanged. When the character does
 * level up, this function:
 *
 *   1. Increments `level` by 1.
 *   2. Recomputes `maxHealth` / `maxMana` from the new level.
 *   3. Awards `STAT_POINTS_PER_LEVEL` (= 2) unspent stat points.
 *   4. Updates `experienceToNextLevel` for the new level.
 *
 * Repeat calls handle multiple level-ups when granted XP overflows two
 * thresholds in one go:
 *
 *   while (canLevelUp(c)) c = levelUp(c);
 *
 * @param character - The character to level up
 * @returns Updated character or the input when underqualified
 */
export function levelUp(character: Character): Character {
    const threshold = calculateExperienceToNextLevel(character.level);
    if (character.experience < threshold) return character;

    const newLevel = character.level + 1;
    const maxHealth = calculateMaxHealth(newLevel, character.baseStats);
    const maxMana = calculateMaxMana(newLevel, character.baseStats);

    return {
        ...character,
        level: newLevel,
        experienceToNextLevel: calculateExperienceToNextLevel(newLevel),
        maxHealth,
        maxMana,
        health: maxHealth,
        mana: maxMana,
        availableStatPoints: (character.availableStatPoints ?? 0) + STAT_POINTS_PER_LEVEL,
    };
}

// ============================================================================
// STAT ALLOCATION
// ============================================================================

/**
 * Spends one of the character's `availableStatPoints` to permanently
 * raise a single base stat by 1.
 *
 * Recomputes `derivedStats`, `nonCombatStats`, `maxHealth`, and `maxMana`
 * to reflect the new value. Returns the input character unchanged when
 * the stat point pool is empty.
 *
 * @param character - The character whose stat is being raised
 * @param stat - 'heart' | 'body' | 'mind'
 * @returns Updated character with one fewer stat point and the chosen
 *   stat increased by 1
 */
export function allocateStatPoint(
    character: Character,
    stat: keyof BaseStats,
): Character {
    const available = character.availableStatPoints ?? 0;
    if (available <= 0) return character;

    const newBase: BaseStats = {
        ...character.baseStats,
        [stat]: character.baseStats[stat] + 1,
    };

    const maxHealth = calculateMaxHealth(character.level, newBase);
    const maxMana = calculateMaxMana(character.level, newBase);

    return {
        ...character,
        baseStats: newBase,
        derivedStats: deriveStats(newBase),
        nonCombatStats: deriveNonCombatStats(newBase),
        maxHealth,
        maxMana,
        health: Math.min(character.health, maxHealth),
        mana: Math.min(character.mana, maxMana),
        availableStatPoints: available - 1,
    };
}

// ============================================================================
// SKILL LEARNING & EQUIPPING
// ============================================================================

/**
 * Returns every skill from `availableSkills` this character is currently
 * eligible to learn:
 *   - level requirement met
 *   - any stat requirement met
 *   - prerequisite skill (if any) already known
 *   - skill not already in `knownSkills`
 *
 * The skill library is passed in to avoid a forward dep from Character
 * to Skills. Pass `skillLibrary` from `Skills/skill.library.ts`.
 *
 * @param character - The character to check
 * @param availableSkills - The full skill catalog to filter
 * @returns The eligible skills
 */
export function getAvailableSkills(
    character: Character,
    availableSkills: Skill[],
): Skill[] {
    const known = new Set(character.knownSkills ?? []);
    return availableSkills.filter(skill => {
        if (known.has(skill.id)) return false;
        const req = skill.learningRequirement;
        if (!req) return true;
        if (character.level < req.level) return false;
        if (req.statRequirementType && req.statRequirementValue !== undefined) {
            if (character.baseStats[req.statRequirementType] < req.statRequirementValue) return false;
        }
        if (req.prerequisiteSkill && !known.has(req.prerequisiteSkill)) return false;
        return true;
    });
}

/**
 * Marks a skill as learned. Updates `knownSkills` if requirements pass.
 * Returns the input unchanged otherwise.
 *
 * Accepts the skill object directly (rather than looking it up by ID) so
 * this module stays library-agnostic.
 *
 * @param character - The character learning the skill
 * @param skill - The Skill object being learned
 * @returns Updated character
 */
export function learnSkill(character: Character, skill: Skill): Character {
    const known = character.knownSkills ?? [];
    if (known.includes(skill.id)) return character;

    const req = skill.learningRequirement;
    if (req) {
        if (character.level < req.level) return character;
        if (req.statRequirementType && req.statRequirementValue !== undefined) {
            if (character.baseStats[req.statRequirementType] < req.statRequirementValue) return character;
        }
        if (req.prerequisiteSkill && !known.includes(req.prerequisiteSkill)) return character;
    }

    return { ...character, knownSkills: [...known, skill.id] };
}

/**
 * Maximum skills a character may have equipped at once. Mirrors a
 * common TTRPG hotbar slot count.
 */
export const MAX_EQUIPPED_SKILLS = 4;

/**
 * Equips a known skill into the equipped-skills slot list.
 *
 * Returns the character unchanged if:
 *   - the skill is not known
 *   - the equipped list is full
 *   - the skill is already equipped
 *
 * @param character - The character whose hotbar to update
 * @param skillId - Skill ID to equip
 * @returns Updated character
 */
export function equipSkill(character: Character, skillId: string): Character {
    const known = character.knownSkills ?? [];
    if (!known.includes(skillId)) return character;
    const equipped = character.equippedSkills ?? [];
    if (equipped.includes(skillId)) return character;
    if (equipped.length >= MAX_EQUIPPED_SKILLS) return character;
    return { ...character, equippedSkills: [...equipped, skillId] };
}

/**
 * Removes a skill from the equipped list. Returns the character unchanged
 * if the skill is not currently equipped.
 *
 * @param character - The character whose hotbar to update
 * @param skillId - Skill ID to unequip
 * @returns Updated character
 */
export function unequipSkill(character: Character, skillId: string): Character {
    const equipped = character.equippedSkills ?? [];
    if (!equipped.includes(skillId)) return character;
    return { ...character, equippedSkills: equipped.filter(id => id !== skillId) };
}
