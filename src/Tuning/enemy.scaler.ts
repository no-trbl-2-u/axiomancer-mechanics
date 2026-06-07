/**
 * Enemy scaler — produces a difficulty-scaled enemy instance for a matrix cell.
 *
 * Reuses an authored enemy as the archetype (logic, skills, map, befriend
 * config) but recomputes level + baseStats from the tunable
 * `ENEMY_STAT_PER_LEVEL` budget, then applies a per-difficulty multiplier.
 * This means the tuner's A/B on `ENEMY_STAT_PER_LEVEL` flows through to every
 * scaled enemy without touching authored content.
 */

import { ENEMY_REGISTRY, type EnemySlug } from '../Enemy/enemy.library';
import { createEnemy, enemyStatBudget } from '../Enemy';
import type { Enemy } from '../Enemy/types';
import type { BaseStats } from '../Character/types';
import { ENEMY_STAT_PER_LEVEL, ENEMY_GEAR_TIER_PER_LEVEL } from '../Game/game-mechanics.constants';
import type { Difficulty } from './types';

const DIFFICULTY_STAT_MULT: Record<Difficulty, number> = {
    easy: 0.8,
    normal: 1.0,
    hard: 1.25,
};

/** Small level nudge per difficulty so harder cells field tougher foes. */
const DIFFICULTY_LEVEL_DELTA: Record<Difficulty, number> = {
    easy: -1,
    normal: 0,
    hard: 2,
};

/**
 * Build a scaled enemy for a cell. `perLevel` and `gearTierPerLevel` let the A/B 
 * harness inject candidate values; they default to the live constants.
 */
export function scaleEnemyForCell(
    slug: EnemySlug,
    difficulty: Difficulty,
    playerLevel: number,
    perLevel: number = ENEMY_STAT_PER_LEVEL,
    gearTierPerLevel: number = ENEMY_GEAR_TIER_PER_LEVEL,
): Enemy {
    const base = ENEMY_REGISTRY[slug];
    if (!base) throw new Error(`scaleEnemyForCell: unknown enemy slug '${slug}'.`);

    const level = Math.max(1, playerLevel + DIFFICULTY_LEVEL_DELTA[difficulty]);
    // Use the archetype's authored stat split as the distribution weights so a
    // brute stays a brute after rescaling.
    const weights: BaseStats = {
        heart: Math.max(1, base.baseStats.heart),
        body: Math.max(1, base.baseStats.body),
        mind: Math.max(1, base.baseStats.mind),
    };
    const effectivePerLevel = perLevel * DIFFICULTY_STAT_MULT[difficulty];
    const baseStats = enemyStatBudget(level, weights, effectivePerLevel, gearTierPerLevel);

    return createEnemy({
        id: `${base.id}__${difficulty}-l${level}`,
        name: `${base.name} (${difficulty})`,
        description: base.description,
        level,
        baseStats,
        mapName: base.mapName,
        logic: base.logic,
        difficulty: base.difficulty,
        tier1Overrides: base.tier1Overrides,
        procUnlocks: base.procUnlocks,
        procOverrides: base.procOverrides,
        skills: base.skills,
        loot: base.loot,
        effects: [],
        philosophicalAlignment: base.philosophicalAlignment,
        friendshipReward: base.friendshipReward,
        befriendabilityConfig: base.befriendabilityConfig,
        addedIn: base.addedIn,
        tags: base.tags,
    });
}
