/**
 * Enemy Module
 * Factory and stat lookup utilities for enemy entities.
 */

import { Stance } from "../combat/types";
import { Item } from "../items/types";
import { Skill } from "../skills/types";
import { Map } from "../world/types";
import { ActiveEffect } from "../effects/types";
import { BaseStats } from "../character/types";
import { deriveStats, calculateMaxHealth, calculateMaxMana } from "../utils";
import { Enemy, EnemyLogic, EnemyTier1EffectMap } from "./types";

// ===============================================
// ENEMY FACTORY
// ===============================================

/**
 * Options for creating a new Enemy
 * @property id - Unique identifier for this enemy
 * @property name - Display name
 * @property description - Flavor text or lore description
 * @property level - Enemy level (affects stat scaling)
 * @property baseStats - Core body/mind/heart stats
 * @property mapLocation - Which map this enemy appears on
 * @property logic - AI behavior pattern
 * @property enemyTier - Optional difficulty classification
 * @property tier1Effects - Optional Tier 1 effect overrides
 * @property skills - Optional skill list
 * @property loot - Optional loot table
 * @property currentActiveEffects - Optional starting status effects
 */
interface CreateEnemyOptions {
    id: string;
    name: string;
    description: string;
    level: number;
    baseStats: BaseStats;
    mapLocation: Pick<Map, 'name'>;
    logic: EnemyLogic;
    enemyTier?: Enemy['enemyTier'];
    tier1Effects?: EnemyTier1EffectMap;
    skills?: Skill[];
    loot?: Item[];
    currentActiveEffects?: ActiveEffect[];
}

/**
 * Creates a new Enemy from base inputs, deriving all stats automatically.
 * @param options - Identity, level, base stats, location, and optional overrides
 * @returns A fully initialised Enemy
 */
export function createEnemy(options: CreateEnemyOptions): Enemy {
    const {
        id, name, description, level, baseStats, mapLocation, logic,
        enemyTier, tier1Effects, skills, loot, currentActiveEffects = [],
    } = options;

    const maxHealth = calculateMaxHealth(level, baseStats);
    const maxMana = calculateMaxMana(level, baseStats);

    return {
        id, name, description, level,
        health: maxHealth, maxHealth,
        mana: maxMana, maxMana,
        baseStats,
        derivedStats: deriveStats(baseStats),
        mapLocation, logic,
        enemyTier, tier1Effects, skills, loot,
        currentActiveEffects,
    };
}

// ===============================================
// STAT LOOKUP
// ===============================================

/**
 * Gets the enemy's attack or defense stat for the given stance
 * @param enemy - The enemy to get the stat for
 * @param base - The stance (body, mind, heart)
 * @param isDefending - Whether to return the defense stat (true) or attack stat (false)
 * @returns The relevant derived stat value
 */
export const getEnemyRelatedStat = (enemy: Enemy, base: Stance, isDefending: boolean): number => {
    if (!isDefending) {
        switch (base) {
            case 'body':  return enemy.derivedStats.physicalAttack;
            case 'mind':  return enemy.derivedStats.mentalAttack;
            case 'heart': return enemy.derivedStats.emotionalAttack;
        }
    }
    switch (base) {
        case 'body':  return enemy.derivedStats.physicalDefense;
        case 'mind':  return enemy.derivedStats.mentalDefense;
        case 'heart': return enemy.derivedStats.emotionalDefense;
    }
}

// ===============================================
// TYPE & LIBRARY RE-EXPORTS
// ===============================================

export type { Enemy, EnemyLogic, EnemyTier1EffectMap } from './types';
export { Disatree_01, EnemyLibrary } from './enemy.library';
