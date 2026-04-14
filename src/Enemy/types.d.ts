import { Skill } from '../Skills/types';
import { Map } from '../World/types';
import { Stance } from '../Combat/types';
import { BaseStats, DerivedStats } from '../Character/types';
import { ActiveEffect } from '../Effects/types';
import { Item } from '../Items/types';

export type EnemyLogic = 'random' | 'aggressive' | 'defensive' | 'balanced';

/**
 * Per-enemy Tier 1 effect overrides.
 * If an action key is absent, the default TIER1_EFFECT_MAP is used.
 */
export type EnemyTier1EffectMap = Partial<Record<Stance, Partial<Record<'attack' | 'defend', string>>>>;

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
