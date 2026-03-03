/**
 * Enemy module type definitions
 *
 * This module contains types for enemy characters, including:
 * - Enemy base interface
 * - Enemy AI and behavior patterns
 * - Enemy classifications and types
 * - Loot tables and rewards
 */

import { Item } from 'Items';
import { Skill } from '../Skills/types';
import { Map } from '../World/types';
import { ActionType } from '../Combat/types';
import { BaseStats, DerivedStats } from '../Character/types';

/**
 * Enemy logic type representing the enemy's decision-making process
 * - 'random': The enemy will choose an action randomly
 * - 'aggressive': The enemy will choose an action that is likely to deal damage
 * - 'defensive': The enemy will choose an action that is likely to reduce damage
 * - 'balanced': The enemy will choose an action that is likely to deal damage and reduce damage
 * @todo: Add logic types keeping "Game Theory" in mind
 * @todo: Add and adjust logic types when skills are implemented
 */
export type EnemyLogic = 'random' | 'aggressive' | 'defensive' | 'balanced';

/**
 * Per-enemy Tier 1 effect map.
 * Overrides the default TIER1_EFFECT_MAP for any action the enemy performs.
 * If an action key is absent, the default map is used as a fallback.
 * Eventually each unique enemy will have thematic effects (debate, rhetoric,
 * philosophy) instead of the generic player stances.
 */
export type EnemyTier1EffectMap = Partial<Record<ActionType, Partial<Record<'attack' | 'defend', string>>>>;

/**
 * Enemy represents an adversary that can be encountered in combat
 * @property id - Unique identifier for this enemy instance
 * @property name - Display name of the enemy
 * @property level - Enemy level (affects difficulty and rewards)
 * @property health - Current health points
 * @property maxHealth - Maximum health points (calculated from level and base stats)
 * @property mana - Current mana points
 * @property maxMana - Maximum mana points (calculated from level and base stats)
 * @property baseStats - Raw base stats (body/mind/heart) — used for resist rolls
 * @property derivedStats - Combat statistics, same shape as Character.derivedStats
 * @property mapLocation - Reference to the map where this enemy can be encountered
 * @property enemyTier - Optional difficulty tier: 'normal' (standard), 'elite', or 'boss'
 * @property description - Flavor text or lore description of the enemy
 * @property logic - The enemy's decision-making process
 * @property tier1Effects - Optional: overrides for automatic Tier 1 stance effects
 * @property skills - Optional: list of skills the enemy can use
 * @property loot - Optional: list of items the enemy can drop
 * @todo: **FRONTEND ONLY**: image - Optional: visual representation of the enemy
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
    currentActiveEffects: ActiveEffect[] | [];
    /* For Frontend Display */
    // image: Image; { alt: string, src: string }
}
