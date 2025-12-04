import { BaseStats, DerivedStats, Character } from "./types";
import { average } from "../Utils";

/* Used for creating a new character */
interface CreateCharacterOptions {
    name: string;
    level: number;
    baseStats: BaseStats;
}

/**
 * Constants for derived stat calculations
 */
const STAT_MULTIPLIERS = {
    SKILL: 1,
    DEFENSE: 3,
    SAVE: 2,
    TEST: 4,
} as const;

const RESOURCE_MULTIPLIERS = {
    HEALTH_PER_STAT: 10,
    MANA_PER_STAT: 10,
} as const;

const EXPERIENCE_PER_LEVEL = 1000;

/**
 * Derives the stats of a character based on their base stats
 * @param baseStats - The base stats of the character
 * @returns The derived stats of the character
 */
const deriveStats = ({ body, heart, mind }: BaseStats): DerivedStats => ({
    // TODO: Determine the calculations for these stats
    /* Body-derived stats */
    physicalSkill: body * STAT_MULTIPLIERS.SKILL,
    physicalDefense: body * STAT_MULTIPLIERS.DEFENSE,
    physicalSave: body * STAT_MULTIPLIERS.SAVE,
    physicalTest: body * STAT_MULTIPLIERS.TEST,

    /* Mind-derived stats */
    mentalSkill: mind * STAT_MULTIPLIERS.SKILL,
    mentalDefense: mind * STAT_MULTIPLIERS.DEFENSE,
    mentalSave: mind * STAT_MULTIPLIERS.SAVE,
    mentalTest: mind * STAT_MULTIPLIERS.TEST,

    /* Heart-derived stats */
    emotionalSkill: heart * STAT_MULTIPLIERS.SKILL,
    emotionalDefense: heart * STAT_MULTIPLIERS.DEFENSE,
    emotionalSave: heart * STAT_MULTIPLIERS.SAVE,
    emotionalTest: heart * STAT_MULTIPLIERS.TEST,

    /* Shared stats */
    luck: average(body, heart, mind),
})

/**
 * Calculates the maximum health of a character based on their level and health stats
 * @param level - The level of the character
 * @param healthStats - The stats that determine max health (body and heart)
 * @returns The maximum health of the character
 * @remarks Equation: level × (average of body and heart) × HEALTH_PER_STAT
 */
function calculateMaxHealth(level: number, healthStats: Pick<BaseStats, 'body' | 'heart'>): number {
    const averageHealthStats = (healthStats.body + healthStats.heart) / 2;
    return level * averageHealthStats * RESOURCE_MULTIPLIERS.HEALTH_PER_STAT;
}

/**
 * Calculates the maximum mana of a character based on their level and mana stats
 * @param level - The level of the character
 * @param manaStats - The stats that determine max mana (mind and heart)
 * @returns The maximum mana of the character
 * @remarks Equation: level × (average of mind and heart) × MANA_PER_STAT
 */
function calculateMaxMana(level: number, manaStats: Pick<BaseStats, 'mind' | 'heart'>): number {
    const averageManaStats = (manaStats.mind + manaStats.heart) / 2;
    return level * averageManaStats * RESOURCE_MULTIPLIERS.MANA_PER_STAT;
}

/**
 * Creates a new character based on level, name, and given base stats
 * @param options - The options for creating a new character
 * @returns The new character
 * @remarks "given stats" are not the same as "starting stats" - these are the base stats at the specified level
 */
export function createCharacter(options: CreateCharacterOptions): Character {
    const { name, level, baseStats } = options;

    const maxHealth = calculateMaxHealth(level, baseStats);
    const health = maxHealth;

    const maxMana = calculateMaxMana(level, baseStats);
    const mana = maxMana;

    const experience = (level - 1) * EXPERIENCE_PER_LEVEL;
    const experienceToNextLevel = level * EXPERIENCE_PER_LEVEL;

    return {
        name,
        level,
        experience,
        experienceToNextLevel,
        health,
        maxHealth,
        mana,
        maxMana,
        baseStats,
        derivedStats: deriveStats(baseStats),
        inventory: [],
    }
}