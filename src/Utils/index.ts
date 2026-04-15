/**
 * Utility functions used across the application
 */

import { Advantage } from "Combat/types";
import { STAT_MULTIPLIERS, RESOURCE_MULTIPLIERS } from "../Game/game-mechanics.constants";
import { BaseStats, DerivedStats, NonCombatStats } from "Character/types";

// ===============================================
// MATH
// ===============================================

/**
 * Clamps a number between min and max values
 * @param value - The value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns The clamped value
 * @example clamp(15, 0, 10) // 10
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generates a random integer between min and max (inclusive)
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Random integer in the range [min, max]
 * @example randomInt(1, 6) // a number between 1 and 6 (like a die roll)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Deep clones an object using JSON serialization
 * @param obj - The object to clone
 * @returns A deep copy of the object
 * @remarks Does not preserve functions, symbols, undefined values, or circular references
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Calculates the average of an array of numbers
 * @param numbers - Numbers to average
 * @returns The average value, or 0 if no numbers provided
 */
export function average(...numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

/** Sums all numbers in an array */
export const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

/** Returns the largest number in an array */
export const max = (arr: number[]) => Math.max(...arr);

/** Returns the smallest number in an array */
export const min = (arr: number[]) => Math.min(...arr);

/**
 * Checks if a value is within a range (inclusive)
 * @param value - The value to check
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns True if value is within range
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// ===============================================
// STRING
// ===============================================

/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns The string with the first letter capitalized
 */
export function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a number as a percentage string
 * @param value - The value to format (0-100)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

// ===============================================
// DIE ROLLING
// ===============================================

/**
 * Determines the modifier to apply to a roll based on the advantage
 * @param advantage - The advantage to apply to the roll
 * @returns A function that selects the appropriate value from a roll array
 */
export const determineRollAdvantageModifier = (advantage: Advantage): (arr: number[]) => number => {
  switch (advantage) {
    case 'advantage':    return max;
    case 'disadvantage': return min;
    default:             return sum;
  }
}

/**
 * Creates a die roll function
 * @param sides - Number of sides on the die
 * @param timesRolled - Number of times to roll the die
 * @param func - Function to apply to the resulting array (default: sum)
 * @returns A function that returns the result of the die roll
 * @example
 * const d20 = createDie(20, 1)
 * const advAtk = createDie(20, 2, max)   // roll 2d20, keep highest
 * const disadvAtk = createDie(20, 2, min) // roll 2d20, keep lowest
 */
export function createDie(sides: number, timesRolled: number, func?: (arr: number[]) => number) {
  return () => {
    const rolls = Array.from({ length: timesRolled }, () => randomInt(1, sides));
    return (func ?? sum)(rolls);
  }
}

/**
 * Creates a d20 roll respecting advantage/disadvantage.
 * Advantage: roll 2d20 keep highest. Disadvantage: roll 2d20 keep lowest.
 * Neutral: roll 1d20.
 * @param advantage - The advantage to create a die roll for
 * @returns A function that returns the result of the die roll
 */
export function createDieRoll(advantage: Advantage) {
  const rollCount = advantage === 'neutral' ? 1 : 2;
  return createDie(20, rollCount, determineRollAdvantageModifier(advantage));
}

// ===============================================
// ENTITY STAT CALCULATIONS
// ===============================================

/**
 * Derives the combat stats of an entity based on their base stats.
 * Shared between Characters and Enemies.
 * @param baseStats - The base stats of the entity
 * @returns The derived combat stats
 */
export const deriveStats = ({ body, heart, mind }: BaseStats): DerivedStats => ({
  physicalAttack:    body  * STAT_MULTIPLIERS.ATTACK,
  physicalSkill:     body  * STAT_MULTIPLIERS.SKILL,
  physicalDefense:   body  * STAT_MULTIPLIERS.DEFENSE,
  mentalAttack:      mind  * STAT_MULTIPLIERS.ATTACK,
  mentalSkill:       mind  * STAT_MULTIPLIERS.SKILL,
  mentalDefense:     mind  * STAT_MULTIPLIERS.DEFENSE,
  emotionalAttack:   heart * STAT_MULTIPLIERS.ATTACK,
  emotionalSkill:    heart * STAT_MULTIPLIERS.SKILL,
  emotionalDefense:  heart * STAT_MULTIPLIERS.DEFENSE,
  luck: average(body, heart, mind),
});

/**
 * Derives the non-combat stats of a Character from their base stats.
 * Enemies do not have these — they are only relevant outside of combat
 * (saving throws, ability tests).
 * @param baseStats - The base stats of the character
 * @returns The non-combat stats
 */
export const deriveNonCombatStats = ({ body, heart, mind }: BaseStats): NonCombatStats => ({
  physicalSave:   body  * STAT_MULTIPLIERS.SAVE,
  physicalTest:   body  * STAT_MULTIPLIERS.TEST,
  mentalSave:     mind  * STAT_MULTIPLIERS.SAVE,
  mentalTest:     mind  * STAT_MULTIPLIERS.TEST,
  emotionalSave:  heart * STAT_MULTIPLIERS.SAVE,
  emotionalTest:  heart * STAT_MULTIPLIERS.TEST,
});

/**
 * Calculates the maximum health of an entity based on level and base stats.
 * Equation: level × average(body, heart) × HEALTH_PER_STAT
 * @param level - The level of the entity
 * @param healthStats - The stats that contribute to max health (body and heart)
 * @returns The maximum health value
 */
export function calculateMaxHealth(level: number, healthStats: Pick<BaseStats, 'body' | 'heart'>): number {
  const avg = (healthStats.body + healthStats.heart) / 2;
  return level * avg * RESOURCE_MULTIPLIERS.HEALTH_PER_STAT;
}

/**
 * Calculates the maximum mana of an entity based on level and base stats.
 * Equation: level × average(mind, heart) × MANA_PER_STAT
 * @param level - The level of the entity
 * @param manaStats - The stats that contribute to max mana (mind and heart)
 * @returns The maximum mana value
 */
export function calculateMaxMana(level: number, manaStats: Pick<BaseStats, 'mind' | 'heart'>): number {
  const avg = (manaStats.mind + manaStats.heart) / 2;
  return level * avg * RESOURCE_MULTIPLIERS.MANA_PER_STAT;
}
