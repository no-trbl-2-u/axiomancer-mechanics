/**
 * Enemy module type definitions
 *
 * This module contains types for enemy characters, including:
 * - Enemy base interface
 * - Enemy AI and behavior patterns
 * - Enemy classifications and types
 * - Loot tables and rewards
 */

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
export interface EnemyStats {
    /* Root Stats */
    maxHealth: number;
    maxMana: number;

    /* Body-themed stats */
    physicalSkill: number;
    physicalDefense: number;

    /* Mind-themed stats */
    mentalSkill: number;
    mentalDefense: number;

    /* Heart-themed stats */
    emotionalSkill: number;
    emotionalDefense: number;
}

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
 */
export interface Enemy {
    id: string;
    name: string;
    level: number;
    health: number;
    mana: number;
    enemyStats: EnemyStats;
    mapLocation: Pick<Map, 'name'>;
    enemyTier?: 'normal' | 'elite' | 'boss';
    description: string;
    // TODO:
    // image: Image; { alt: string, src: string }
    // skills: Skill[];
    // loot: LootTable;
}
