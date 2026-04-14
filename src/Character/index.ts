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

interface CreateCharacterOptions {
    name: string;
    level: number;
    baseStats: BaseStats;
    inventory?: Item[];
    currentActiveEffects?: ActiveEffect[];
}

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
// STAT LOOKUP
// ===============================================

/** Returns the defense stat value for a target when resisting an effect by the given stance. */
export const getResistStatFromResistedBy = (target: Character | Enemy, resistedBy: Stance): number => {
    switch (resistedBy) {
        case 'body':  return target.derivedStats.physicalDefense;
        case 'mind':  return target.derivedStats.mentalDefense;
        case 'heart': return target.derivedStats.emotionalDefense;
        default:      return target.derivedStats.luck;
    }
}
