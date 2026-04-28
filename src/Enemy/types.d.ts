/**
 * Enemy module type definitions
 *
 * This module contains types for enemy characters, including:
 * - Enemy base interface
 * - Enemy AI and behavior patterns
 * - Enemy classifications and types
 * - Loot tables and rewards
 */

import { Skill } from '../Skills/types';
import { Map } from '../World/types';
import { Stance } from '../Combat/types';
import { BaseStats, DerivedStats } from '../Character/types';
import { ActiveEffect } from '../Effects/types';
import { Item } from '../Items/types';

/**
 * Enemy logic type representing the enemy's decision-making process
 * - 'random'     : Picks stance and action uniformly
 * - 'aggressive' : Always attacks; favours its highest base stat
 * - 'defensive'  : Defends at high HP %, attacks at low HP %
 * - 'balanced'   : Mixes attack/defend ~50/50 based on simple heuristics
 * - 'strategic'  : Picks the stance with type advantage over the player's last move
 * - 'boss'       : Strategic + threshold-driven gear changes (attacks more aggressively below 50% HP)
 */
export type EnemyLogic =
    | 'random'
    | 'aggressive'
    | 'defensive'
    | 'balanced'
    | 'strategic'
    | 'boss';

/**
 * Aux state passed to AI logic functions so they can branch on context
 * (player's last stance, enemy HP %, friendship counter, etc.).
 *
 * All fields are optional because the simpler AIs (`random`, `aggressive`,
 * `defensive`) do not need them. Strategic / boss AIs use them.
 */
export interface EnemyLogicContext {
    enemyHpPercent?: number;
    playerLastStance?: Stance;
    round?: number;
}

/**
 * Per-enemy Tier 1 effect map.
 * Overrides the default TIER1_EFFECT_MAP for any action the enemy performs.
 * If an action key is absent, the default map is used as a fallback.
 * Eventually each unique enemy will have thematic effects (debate, rhetoric,
 * philosophy) instead of the generic player stances.
 */
export type EnemyTier1EffectMap = Partial<Record<Stance, Partial<Record<'attack' | 'defend', string>>>>;

/**
 * Enemy represents an adversary that can be encountered in combat
 * @property id - Unique identifier for this enemy instance
 * @property name - Display name of the enemy
 * @property description - Flavor text or lore description of the enemy
 * @property enemyTier - Optional difficulty tier: 'simple', 'normal', 'elite', 'boss', or 'unique'
 * @property level - Enemy level (affects difficulty and rewards)
 * @property health - Current health points
 * @property maxHealth - Maximum health points (calculated from level and base stats)
 * @property mana - Current mana points
 * @property maxMana - Maximum mana points (calculated from level and base stats)
 * @property baseStats - Raw base stats (body/mind/heart) — used for resist rolls
 * @property derivedStats - Combat statistics, same shape as Character.derivedStats
 * @property mapLocation - Reference to the map where this enemy can be encountered
 * @property logic - The enemy's decision-making process
 * @property tier1Effects - Optional: overrides for automatic Tier 1 stance effects
 * @property skills - Optional: list of skills the enemy can use
 * @property loot - Optional: list of items the enemy can drop
 * @property currentActiveEffects - Status effects currently active on this enemy
 */
export interface Enemy {
    id: string;
    name: string;
    description: string;
    enemyTier?: 'simple' | 'normal' | 'elite' | 'boss' | 'unique';
    level: number;
    health: number;
    maxHealth: number;
    mana: number;
    maxMana: number;
    baseStats: BaseStats;
    derivedStats: DerivedStats;
    mapLocation: Pick<Map, 'name'>;
    logic: EnemyLogic;
    tier1Effects?: EnemyTier1EffectMap;
    skills?: Skill[];
    loot?: Item[];
    currentActiveEffects: ActiveEffect[];
}
