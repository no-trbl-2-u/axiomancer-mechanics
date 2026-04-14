import { Stance } from "Combat/types";
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
