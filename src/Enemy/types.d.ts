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

interface EnemyStats {
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
