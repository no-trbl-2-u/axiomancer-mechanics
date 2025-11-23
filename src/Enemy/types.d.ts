/**
 * Enemy module type definitions
 *
 * This module contains types for enemy characters, including:
 * - Enemy base interface
 * - Enemy AI and behavior patterns
 * - Enemy classifications and types
 * - Loot tables and rewards
 */

import { BaseStats, DerivedStats } from '@Character/types';

export interface Enemy {
    id: string;
    name: string;
    level: number;
    health: number;
    maxHealth: number;
    mana: number;
    maxMana: number;
    baseStats: BaseStats;
    derivedStats: DerivedStats;
    // skills: Skill[];
    enemyTier?: 'normal' | 'elite' | 'boss';
    description: string;
}
