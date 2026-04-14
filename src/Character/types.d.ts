import { Item } from '../Items/types';
import { ActiveEffect } from '../Effects/types';

export interface Character {
    name: string;
    level: number;
    experience: number;
    experienceToNextLevel: number;
    health: number;
    maxHealth: number;
    mana: number;
    maxMana: number;
    baseStats: BaseStats;
    derivedStats: DerivedStats;
    nonCombatStats: NonCombatStats;
    inventory: Item[];
    currentActiveEffects: ActiveEffect[];
}

/** The three core attributes. All other stats derive from these. */
export interface BaseStats {
    heart: number;
    body: number;
    mind: number;
}

/**
 * Combat stats shared between Characters and Enemies.
 * Derived from base stats via STAT_MULTIPLIERS.
 */
export interface DerivedStats {
    physicalAttack: number;
    physicalSkill: number;
    physicalDefense: number;
    mentalAttack: number;
    mentalSkill: number;
    mentalDefense: number;
    emotionalAttack: number;
    emotionalSkill: number;
    emotionalDefense: number;
    luck: number;
}

/** Character-only stats used outside combat (saves, ability tests). */
export interface NonCombatStats {
    physicalSave: number;
    physicalTest: number;
    mentalSave: number;
    mentalTest: number;
    emotionalSave: number;
    emotionalTest: number;
}
