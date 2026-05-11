import { Skill } from '../Skills/types';
import { MapName } from '../World/map.library';
import { Stance } from '../Combat/types';
import { BaseStats, DerivedStats } from '../Character/types';
import { ActiveEffect } from '../Effects/types';
import { ProcOverrides, ProcUnlocks } from '../Combat/combat-effects';
import { Item } from '../Items/types';

/**
 * Decision-making strategy used by an enemy each round.
 * - `random`     — picks any stance and action uniformly.
 * - `aggressive` — favours attacking.
 * - `defensive`  — favours defending.
 * - `balanced`   — mixes attack and defence based on state.
 */
export type EnemyLogic = 'random' | 'aggressive' | 'defensive' | 'balanced';

/**
 * Difficulty classification used by the world to seed encounters.
 */
export type EnemyDifficulty = 'simple' | 'normal' | 'elite' | 'boss' | 'unique';

/**
 * Per-enemy override for the default Tier 1 stance-effect map. Only the
 * effect ID is overridden; the action's target (self/opponent) and stacking
 * options are preserved from the global map.
 */
export type Tier1EffectOverrides =
    Partial<Record<Stance, Partial<Record<'attack' | 'defend', string>>>>;

/**
 * An adversary that can be encountered in combat.
 *
 * @property id           - Unique identifier (used for save/load and tracking).
 * @property mapName      - The map this enemy belongs to.
 * @property logic        - AI strategy.
 * @property difficulty   - Optional encounter classification.
 * @property tier1Overrides - Optional Tier 1 effect ID overrides per stance.
 * @property skills       - Optional skill list the enemy can use.
 * @property loot         - Optional drops.
 * @property effects      - Active status effects on the enemy.
 */
export interface Enemy {
    id: string;
    name: string;
    description: string;
    level: number;
    health: number;
    maxHealth: number;
    baseStats: BaseStats;
    derivedStats: DerivedStats;
    mapName: MapName;
    logic: EnemyLogic;
    difficulty?: EnemyDifficulty;
    tier1Overrides?: Tier1EffectOverrides;
    /**
     * Spec 03 — per-cell proc unlock caps for this enemy. Default cap is
     * tier 1; elite / boss enemies bump the cap to enable higher-tier procs.
     */
    procUnlocks?: ProcUnlocks;
    /**
     * Spec 03 — per-cell custom proc tables that fully replace the global
     * entries for that Stance × action combo. Bosses get unique tables here;
     * elite / basic enemies receive map-themed overrides (Q7).
     */
    procOverrides?: ProcOverrides;
    skills?: Skill[];
    loot?: Item[];
    effects: ActiveEffect[];
}
