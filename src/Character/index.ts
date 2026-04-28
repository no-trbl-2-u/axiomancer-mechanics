import { Character, BaseStats } from './types';
import { ActiveEffect } from '../Effects/types';
import { Item } from '../Items/types';
import { deriveStats, deriveNonCombatStats, calculateMaxHealth, calculateMaxMana } from '../Utils';
import { EXPERIENCE_PER_LEVEL } from '../Game/game-mechanics.constants';

/**
 * Inputs required to create a new Character.
 */
export interface CreateCharacterOptions {
    name: string;
    level: number;
    baseStats: BaseStats;
    inventory?: Item[];
    effects?: ActiveEffect[];
}

/**
 * Builds a fully-initialised Character. Resources and derived stats are
 * computed automatically from `baseStats` and `level`.
 */
export function createCharacter(options: CreateCharacterOptions): Character {
    const { name, level, baseStats, inventory = [], effects = [] } = options;

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
        effects,
    };
}

export type { Character, BaseStats, DerivedStats, NonCombatStats } from './types';
