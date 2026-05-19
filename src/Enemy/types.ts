import { Skill } from '../Skills/types';
import { MapName } from '../World/map.library';
import { Stance } from '../Combat/types';
import { BaseStats, DerivedStats } from '../Character/types';
import { ActiveEffect } from '../Effects/types';
import { ProcOverrides, ProcUnlocks } from '../Combat/combat-effects';
import { Item } from '../Items/types';
import { PhilosophicalAlignment } from '../Philosophy/types';

/**
 * Decision-making strategy used by an enemy each round (Spec 07).
 *
 * - `random`     — picks any stance and any action uniformly.
 * - `aggressive` — attacks ~75% of the time; favours the stance that beats
 *                  the player's last stance (rock-paper-scissors counter).
 * - `defensive`  — defends until HP > 50% of max; then attacks the stance
 *                  the player has the *lowest* base stat in.
 * - `balanced`   — attacks while HP > 50%; defends below that threshold.
 * - `strategic`  — inspects the player's active effects and exploits
 *                  matching vulnerabilities (e.g. `debuff_vulnerability_body`
 *                  pulls Body attacks). Falls back to `aggressive` heuristics
 *                  when no exploit is on the board.
 * - `boss`       — deterministic phase script keyed off `state.round`. Used
 *                  by `bossLogic` enemies for telegraphed signature patterns.
 */
export type EnemyLogic =
    | 'random' | 'aggressive' | 'defensive' | 'balanced' | 'strategic' | 'boss';

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
 * Weighted drop entry on an `Enemy.loot` table (Spec 07 Q7B).
 *
 * Each entry contributes its `weight` to the roll; the rolled bucket spawns
 * the entry's `item` (or, if `item` is `null`, nothing — that bucket is the
 * empty / no-drop slot). Library authors can express "nothing 60%, herb 30%,
 * potion 10%" with `[ { item: null, weight: 60 }, { item: herb, weight: 30 },
 * { item: potion, weight: 10 } ]`. Weights are unitless integers; the runtime
 * normalises them at roll time.
 *
 * `loot` on the `Enemy` is intentionally a runtime-mutable variable: encounters
 * can splice in extra entries (e.g. quest-driven guaranteed drops, biome
 * tables) before combat starts. See `rollLoot` in `Enemy/loot.ts`.
 */
export interface LootTableEntry {
    /** Item to drop when this bucket rolls. `null` represents a no-drop slot. */
    item: Item | null;
    /** Positive integer weight; normalised across the table at roll time. */
    weight: number;
}

/**
 * An adversary that can be encountered in combat.
 *
 * @property id           - Unique identifier (used for save/load and tracking).
 * @property mapName      - The map this enemy belongs to.
 * @property logic        - AI strategy.
 * @property difficulty   - Optional encounter classification.
 * @property tier1Overrides - Optional Tier 1 effect ID overrides per stance.
 * @property skills       - Optional skill list the enemy can use.
 * @property loot         - Optional weighted drop table (Spec 07 Q7B). Each
 *                          successful kill rolls the table once. May be empty
 *                          / undefined for enemies that don't drop anything.
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
    /** Weighted drop table — see {@link LootTableEntry}. */
    loot?: LootTableEntry[];
    /** Flat experience-point award on kill. Defaults computed by difficulty. */
    xpReward?: number;
    effects: ActiveEffect[];
    /**
     * Phase 45 — per-enemy pin on the 3-axis philosophical alignment cube.
     * Optional; legacy enemies without a pin behave exactly as before.
     * When set, `decideEnemyAction` applies an outlook-driven bias on top of
     * the per-strategy decision (pessimistic enemies sometimes defend when
     * they would attack; optimistic enemies sometimes attack when they would
     * defend). See `docs/enemy.md` "Alignment-driven AI tuning".
     */
    philosophicalAlignment?: PhilosophicalAlignment;
}
