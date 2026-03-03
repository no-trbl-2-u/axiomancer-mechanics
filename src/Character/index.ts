import { Character, BaseStats } from "./types";
import { ActiveEffect } from "Effects/types";
import { Item } from "Items/types";
import { Enemy } from "Enemy/types";
import { ActionType } from "Combat/types";
import { deriveStats, deriveNonCombatStats, calculateMaxHealth, calculateMaxMana } from "Utils";
import { EXPERIENCE_PER_LEVEL } from "Game/game-mechanics.constants";

// ===============================================
// CHARACTER FACTORY
// ===============================================

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
// COMBAT HELPERS
// ===============================================

export function getTargetsResistStatValue(character: Character, effect: ActiveEffect): number {
    return getResistStatFromResistedBy(character, effect.resistedBy as ActionType);
}

/**
 * Gets the resist stat value of a target when resisting an effect
 * @param target - The target to get the resist stat value of
 * @param effect - The effect to get the resist stat value of
 * @returns The resist stat value of the target
 */
export const getResistStatFromResistedBy = (target: Character | Enemy, resistedBy: ActionType): number => {
    if (resistedBy === 'body') {
        return target.derivedStats.physicalDefense;
    } else if (resistedBy === 'mind') {
        return target.derivedStats.mentalDefense;
    } else if (resistedBy === 'heart') {
        return target.derivedStats.emotionalDefense;
    } else {
        return target.derivedStats.luck as number;
    }

}