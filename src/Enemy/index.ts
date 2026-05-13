import { Skill } from '../Skills/types';
import { MapName } from '../World/map.library';
import { ActiveEffect } from '../Effects/types';
import { BaseStats } from '../Character/types';
import { deriveStats, calculateMaxHealth } from '../Utils';
import { ProcOverrides, ProcUnlocks } from '../Combat/combat-effects';
import {
    Enemy, EnemyLogic, EnemyDifficulty, Tier1EffectOverrides, LootTableEntry,
} from './types';

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
    loot?: LootTableEntry[];
    xpReward?: number;
    effects?: ActiveEffect[];
}

/**
 * Default XP grant on kill by difficulty band (Spec 07). Mirrors the
 * suggested table in Spec 06 Q2 — strategy authors can override per-enemy
 * with `xpReward`.
 */
export const DEFAULT_XP_BY_DIFFICULTY: Record<EnemyDifficulty, number> = {
    simple: 10,
    normal: 20,
    elite:  50,
    boss:   200,
    unique: 500,
};

/**
 * Builds a fully-initialised Enemy. Derived stats and resources are
 * computed automatically from `baseStats` and `level`. `xpReward` defaults
 * to `level × DEFAULT_XP_BY_DIFFICULTY[difficulty]` when not supplied.
 */
export function createEnemy(options: CreateEnemyOptions): Enemy {
    const {
        id, name, description, level, baseStats, mapName, logic,
        difficulty, tier1Overrides, procUnlocks, procOverrides,
        skills, loot, xpReward, effects = [],
    } = options;

    const maxHealth = calculateMaxHealth(level, baseStats);
    const resolvedXp =
        xpReward ?? (difficulty ? level * DEFAULT_XP_BY_DIFFICULTY[difficulty] : level * DEFAULT_XP_BY_DIFFICULTY.normal);

    return {
        id, name, description, level,
        health: maxHealth, maxHealth,
        baseStats,
        derivedStats: deriveStats(baseStats),
        mapName, logic,
        difficulty, tier1Overrides,
        procUnlocks, procOverrides,
        skills,
        loot,
        xpReward: resolvedXp,
        effects,
    };
}

export {
    randomLogic, decideEnemyAction,
    aggressiveLogic, defensiveLogic, balancedLogic, strategicLogic, bossLogic,
    counterStanceOf, weakestStanceOf,
} from './enemy.logic';
export { rollLoot, rollLootMany } from './loot';
export type { LootRng } from './loot';
export type {
    Enemy, EnemyLogic, EnemyDifficulty, Tier1EffectOverrides, LootTableEntry,
} from './types';
