// ================================
// Enemy Module
// ================================

import { ActionType } from "Combat/types";
import { Item } from "Items/types";
import { Skill } from "Skills/types";
import { Map } from "World/types";
import { ActiveEffect } from "Effects/types";
import { BaseStats } from "Character/types";
import { deriveStats, calculateMaxHealth, calculateMaxMana } from "Utils";
import { Enemy, EnemyLogic, EnemyTier1EffectMap } from "./types";

// ===============================================
// ENEMY FACTORY
// ===============================================

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
        id,
        name,
        description,
        level,
        health: maxHealth,
        maxHealth,
        mana: maxMana,
        maxMana,
        baseStats,
        derivedStats: deriveStats(baseStats),
        mapLocation,
        logic,
        enemyTier,
        tier1Effects,
        skills,
        loot,
        currentActiveEffects,
    };
}

// ===============================================
// COMBAT HELPERS
// ===============================================

/**
 * Gets the enemy's related stat for the given base and action type
 * @param enemy - The enemy to get the stat for 
 * @param base - Decision enemy made (body, mind, heart)
 * @param isDefending - Whether the enemy is defending
 * @returns 
 */
export const getEnemyRelatedStat = (enemy: Enemy, base: ActionType, isDefending: boolean) => {
  if (!isDefending) {
    switch (base) {
      case 'body':
        return enemy.derivedStats.physicalAttack;
      case 'mind':
        return enemy.derivedStats.mentalAttack;
      case 'heart':
        return enemy.derivedStats.emotionalAttack;
    }
  } else {
    switch (base) {
      case 'body':
        return enemy.derivedStats.physicalDefense;
      case 'mind':
        return enemy.derivedStats.mentalDefense;
      case 'heart':
        return enemy.derivedStats.emotionalDefense;
    }
  }
}