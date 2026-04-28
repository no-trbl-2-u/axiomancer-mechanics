import { Character, BaseStats } from "./types";
import { ActiveEffect } from "Effects/types";
import { Item } from "Items/types";
import { Stance } from "Combat/types";
import { Enemy } from "Enemy/types";
import { deriveStats, deriveNonCombatStats, calculateMaxHealth, calculateMaxMana } from "Utils";
import { EXPERIENCE_PER_LEVEL } from "Game/game-mechanics.constants";

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
 * @property availableStatPoints - Starting unspent stat points (default 0)
 * @property knownSkills - Skill IDs the character starts knowing
 * @property equippedSkills - Skill IDs equipped for combat use
 */
interface CreateCharacterOptions {
    name: string;
    level: number;
    baseStats: BaseStats;
    inventory?: Item[];
    currentActiveEffects?: ActiveEffect[];
    availableStatPoints?: number;
    knownSkills?: string[];
    equippedSkills?: string[];
}

/**
 * Creates a new Character from base inputs, deriving all stats automatically.
 * @param options - Name, level, base stats, and optional starting inventory/effects
 * @returns A fully initialised Character
 */
export function createCharacter(options: CreateCharacterOptions): Character {
    const {
        name, level, baseStats,
        inventory = [], currentActiveEffects = [],
        availableStatPoints = 0,
        knownSkills = [],
        equippedSkills = [],
    } = options;

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
        availableStatPoints,
        knownSkills,
        equippedSkills,
    };
}

// ===============================================
// STAT LOOKUP
// ===============================================

// ===============================================
// PROGRESSION RE-EXPORTS
// ===============================================

export {
    calculateExperienceToNextLevel,
    grantExperience,
    levelUp,
    allocateStatPoint,
    getAvailableSkills,
    learnSkill,
    equipSkill,
    unequipSkill,
    MAX_EQUIPPED_SKILLS,
} from './progression';

/**
 * Gets the resist stat value of a target when resisting an effect.
 * Maps each stance to the corresponding defense derived stat.
 * @param target - The character or enemy to look up
 * @param resistedBy - Which stance the effect is resisted by
 * @returns The derived defense stat value
 */
export const getResistStatFromResistedBy = (target: Character | Enemy, resistedBy: Stance): number => {
    switch (resistedBy) {
        case 'body':  return target.derivedStats.physicalDefense;
        case 'mind':  return target.derivedStats.mentalDefense;
        case 'heart': return target.derivedStats.emotionalDefense;
        default:      return target.derivedStats.luck;
    }
}
