import { Advantage } from "Combat/types";
import { STAT_MULTIPLIERS, RESOURCE_MULTIPLIERS } from "../Game/game-mechanics.constants";
import { BaseStats, DerivedStats, NonCombatStats } from "Character/types";

// ===============================================
// MATH
// ===============================================

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function average(...numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

export const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
export const max = (arr: number[]) => Math.max(...arr);
export const min = (arr: number[]) => Math.min(...arr);

export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// ===============================================
// STRING
// ===============================================

export function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatPercent(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

// ===============================================
// DIE ROLLING
// ===============================================

export const determineRollAdvantageModifier = (advantage: Advantage): (arr: number[]) => number => {
  switch (advantage) {
    case 'advantage':    return max;
    case 'disadvantage': return min;
    default:             return sum;
  }
}

/**
 * Creates a die roll function.
 * @example createDie(20, 2, max)() // roll 2d20, keep highest
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
 */
export function createDieRoll(advantage: Advantage) {
  const rollCount = advantage === 'neutral' ? 1 : 2;
  return createDie(20, rollCount, determineRollAdvantageModifier(advantage));
}

// ===============================================
// ENTITY STAT CALCULATIONS
// ===============================================

/** Derives combat stats from base stats. Shared between Characters and Enemies. */
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

/** Derives non-combat stats (saves, tests). Character-only — enemies don't have these. */
export const deriveNonCombatStats = ({ body, heart, mind }: BaseStats): NonCombatStats => ({
  physicalSave:   body  * STAT_MULTIPLIERS.SAVE,
  physicalTest:   body  * STAT_MULTIPLIERS.TEST,
  mentalSave:     mind  * STAT_MULTIPLIERS.SAVE,
  mentalTest:     mind  * STAT_MULTIPLIERS.TEST,
  emotionalSave:  heart * STAT_MULTIPLIERS.SAVE,
  emotionalTest:  heart * STAT_MULTIPLIERS.TEST,
});

/** Formula: level × average(body, heart) × HEALTH_PER_STAT */
export function calculateMaxHealth(level: number, healthStats: Pick<BaseStats, 'body' | 'heart'>): number {
  const avg = (healthStats.body + healthStats.heart) / 2;
  return level * avg * RESOURCE_MULTIPLIERS.HEALTH_PER_STAT;
}

/** Formula: level × average(mind, heart) × MANA_PER_STAT */
export function calculateMaxMana(level: number, manaStats: Pick<BaseStats, 'mind' | 'heart'>): number {
  const avg = (manaStats.mind + manaStats.heart) / 2;
  return level * avg * RESOURCE_MULTIPLIERS.MANA_PER_STAT;
}
