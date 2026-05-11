import { Item } from '../Items/types';
import { Skill } from '../Skills/types';
import { MapName } from '../World/map.library';
import { ActiveEffect } from '../Effects/types';
import { BaseStats } from '../Character/types';
import { deriveStats, calculateMaxHealth, calculateMaxMana } from '../Utils';
import { ProcOverrides, ProcUnlocks } from '../Combat/combat-effects';
import { Enemy, EnemyLogic, EnemyDifficulty, Tier1EffectOverrides } from './types';

/**
 * Inputs required to create a new Enemy.
 */
export interface CreateEnemyOptions {
    id: string;
    name: string;
    description: string;
    level: number;
    baseStats: BaseStats;
    mapName: MapName;
    logic: EnemyLogic;
    difficulty?: EnemyDifficulty;
    tier1Overrides?: Tier1EffectOverrides;
    procUnlocks?: ProcUnlocks;
    procOverrides?: ProcOverrides;
    skills?: Skill[];
    loot?: Item[];
    effects?: ActiveEffect[];
}

/**
 * Builds a fully-initialised Enemy. Derived stats and resources are
 * computed automatically from `baseStats` and `level`.
 */
export function createEnemy(options: CreateEnemyOptions): Enemy {
    const {
        id, name, description, level, baseStats, mapName, logic,
        difficulty, tier1Overrides, procUnlocks, procOverrides,
        skills, loot, effects = [],
    } = options;

    const maxHealth = calculateMaxHealth(level, baseStats);
    const maxMana = calculateMaxMana(level, baseStats);

    return {
        id, name, description, level,
        health: maxHealth, maxHealth,
        mana: maxMana, maxMana,
        baseStats,
        derivedStats: deriveStats(baseStats),
        mapName, logic,
        difficulty, tier1Overrides,
        procUnlocks, procOverrides,
        skills, loot,
        effects,
    };
}

export { randomLogic, decideEnemyAction } from './enemy.logic';
export type { Enemy, EnemyLogic, EnemyDifficulty, Tier1EffectOverrides } from './types';
