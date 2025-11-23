import { BaseStats, DerivedStats, Character } from "./types";

/* Used for creating a new character */
interface CreateCharacterOptions {
    name: string;
    level: number;
    baseStats: BaseStats;
}

/**
 * Derives the stats of a character based on their base stats
 * @param baseStats - The base stats of the character
 * @returns The derived stats of the character
 */
const deriveStats: (baseStats: BaseStats) => DerivedStats = ({ body, heart, mind }) => ({
    // TODO: Determine the calculations for these stats
    /* Body-derived stats */
    physicalSkill: body,
    physicalDefense: body * 3,
    physicalSave: body * 2,
    physicalTest: body * 4,

    /* Mind-derived stats */
    mentalSkill: mind,
    mentalDefense: mind * 3,
    mentalSave: mind * 2,
    mentalTest: mind * 4,

    /* Heart-derived stats */
    emotionalSkill: heart,
    emotionalDefense: heart * 3,
    emotionalSave: heart * 2,
    emotionalTest: heart * 4,

    /* Shared stats */
    luck: (body + heart + mind) / 3, // Average of the three stats
})

/**
 * Determines the maximum health of a character based on their level and health stats
 * @param level - The level of the character
 * @param healthStats - The stats that determine your max health
 * Equation to determine max health: level x (Average of body and heart x 10)
 * @returns The maximum health of the character
 */
const detMaxHealthByLevel = (level: number) => (healthStats: Omit<BaseStats, 'mind'>) => {
    const averageOfHealthStats = (healthStats.body + healthStats.heart) / 2;
    return level * (averageOfHealthStats * 10);
}

/**
 * Determines the maximum mana of a character based on their level and mana stats
 * @param level - The level of the character
 * @param manaStats - The stats that determine your max mana
 * Equation to determine max mana: level x (Average of mind and heart x 10)
 * @returns The maximum mana of the character
 */
const detMaxManaByLevel = (level: number) => (manaStats: Omit<BaseStats, 'body'>) => {
    const averageOfManaStats = (manaStats.mind + manaStats.heart) / 2;
    return level * (averageOfManaStats * 10);
}

/**
 * Creates a new character based on level, name, and given base stats
 * @param options - The options for creating a new character
 * @returns The new character
 */ // Note: "given stats" are not the same as "starting stats"
export function createCharacter(options: CreateCharacterOptions): Character {
    const { name, level, baseStats } = options;

    const maxHealth = detMaxHealthByLevel(level)(baseStats);
    const health = maxHealth;

    const maxMana = detMaxManaByLevel(level)(baseStats);
    const mana = maxMana;

    return {
        name,
        level,
        health,
        maxHealth,
        mana,
        maxMana,
        baseStats,
        derivedStats: deriveStats(baseStats),
    }
}