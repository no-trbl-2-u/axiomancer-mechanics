/**
 * Enemy System Types
 * NPCs and creatures that can be encountered in combat
 */

import { BaseStats, DerivedStats } from '../character/types';
import { Skill } from '../skills/types';

/**
 * Enemy tier classification
 */
export type EnemyTier = 'normal' | 'elite' | 'boss';

/**
 * Enemy entity
 */
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
  skills: Skill[];
  enemyTier?: EnemyTier;
  description: string;
}
