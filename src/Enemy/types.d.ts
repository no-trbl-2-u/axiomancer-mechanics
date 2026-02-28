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

/**
 * EnemyStats represents the combat statistics for enemy characters
 * Simplified compared to player stats - enemies don't have base stats, only derived combat stats.
 * @property maxHealth - Maximum health points for the enemy
 * @property maxMana - Maximum mana points for the enemy (used for special abilities)
 * @property physicalSkill - (Guess) Modifier for physical/body-type attacks
 * @property physicalDefense - (Guess) Defense value against physical/body-type attacks
 * @property mentalSkill - (Guess) Modifier for mental/mind-type attacks
 * @property mentalDefense - (Guess) Defense value against mental/mind-type attacks
 * @property emotionalSkill - (Guess) Modifier for emotional/heart-type attacks
 * @property emotionalDefense - (Guess) Defense value against emotional/heart-type attacks
 */
export interface EnemyBaseStats {
    body: number;
    mind: number;
    heart: number;
}

export interface EnemyDerivedStats {
    /* Root Stats */
    maxHealth: number;
    maxMana: number;

    /* Body-themed stats */
    physicalAttack: number;
    physicalSkill: number;
    physicalDefense: number;

    /* Mind-themed stats */
    mentalAttack: number;
    mentalSkill: number;
    mentalDefense: number;

    /* Heart-themed stats */
    emotionalAttack: number;
    emotionalSkill: number;
    emotionalDefense: number;

    /* Shared stats */
    luck: number;
}

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
 * Enemy represents an adversary that can be encountered in combat
 * @property id - Unique identifier for this enemy instance
 * @property name - Display name of the enemy
 * @property level - Enemy level (affects difficulty and rewards)
 * @property health - Current health points
 * @property mana - Current mana points
 * @property enemyStats - Combat statistics for this enemy
 * @property mapLocation - Reference to the map where this enemy can be encountered
 * @property enemyTier - Optional difficulty tier: 'normal' (standard enemy), 'elite' (stronger), or 'boss' (major encounter)
 * @property description - Flavor text or lore description of the enemy
 * @property logic - The enemy's decision-making process
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
    mana: number;
    derivedStats: EnemyDerivedStats;
    baseStats: EnemyBaseStats;
    mapLocation: Pick<Map, 'name'>;
    logic: EnemyLogic;
    skills?: Skill[];
    loot?: Item[];
    currentActiveEffects: ActiveEffect[] | [];
    /* For Frontend Display */
    // image: Image; { alt: string, src: string }
}
