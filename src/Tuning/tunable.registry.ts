/**
 * Tunable Parameter Registry — the safety core of the tuning workflow.
 *
 * This hand-authored allow-list is the ONLY set of values the A/B loop may
 * mutate autonomously. Each entry carries a structured, machine-resolvable
 * locator (export + key path for TS constants, or id + field for JSON data),
 * hard min/max bounds, a per-run magnitude cap, and focus tags. Anything not
 * listed here is "propose-only" — there is no locator, so the applier
 * physically cannot change it.
 *
 * Adding a tunable is a deliberate, reviewed act: only genuinely safe numeric
 * knobs (values, not formulas or schema) belong here.
 */

import type { FocusFilter, TunableParam } from './types';

const CONSTANTS_FILE = 'src/Game/game-mechanics.constants.ts';
const BUFFS_FILE = 'src/Effects/buffs.library.json';

export const TUNABLE_REGISTRY: TunableParam[] = [
    {
        id: 'enemy.statPerLevel',
        kind: 'enemy-stat',
        category: 'enemy',
        file: CONSTANTS_FILE,
        locator: { exportName: 'ENEMY_STAT_PER_LEVEL' },
        min: 2, max: 6, step: 0.5,
        magnitudeCapPct: 0.25,
        tags: ['enemy', 'scaling', 'difficulty'],
        rationale: 'Global enemy power scaling; the headline difficulty knob.',
        effect: { difficulty: 'raises' },
    },
    {
        id: 'enemy.gearTierPerLevel',
        kind: 'enemy-stat',
        category: 'enemy',
        file: CONSTANTS_FILE,
        locator: { exportName: 'ENEMY_GEAR_TIER_PER_LEVEL' },
        min: 0, max: 0.05, step: 0.005,
        magnitudeCapPct: 0.25,
        tags: ['enemy', 'scaling', 'difficulty', 'late-game'],
        rationale: 'Off-budget gear tier counterweight to player power accumulation.',
        effect: { difficulty: 'raises' },
    },
    {
        id: 'combat.skillStatMultiplier',
        kind: 'multiplier',
        category: 'fundamental',
        file: CONSTANTS_FILE,
        locator: { exportName: 'SKILL_STAT_MULTIPLIER' },
        min: 0.25, max: 1, step: 0.05,
        magnitudeCapPct: 0.25,
        tags: ['skill', 'damage', 'scaling'],
        rationale: 'Scales skill damage off the scaling stat; a value, not a formula.',
        effect: { difficulty: 'lowers', engagement: 'raises' },
    },
    {
        id: 'combat.healthPerStat',
        kind: 'constant',
        category: 'fundamental',
        file: CONSTANTS_FILE,
        locator: { exportName: 'RESOURCE_MULTIPLIERS', keyPath: ['HEALTH_PER_STAT'] },
        min: 3, max: 8, step: 1,
        magnitudeCapPct: 0.25,
        tags: ['health', 'survivability'],
        rationale: 'HP per base-stat point; governs time-to-kill on both sides.',
        effect: { difficulty: 'lowers', engagement: 'raises' },
    },
    {
        id: 'combat.defense.advantage',
        kind: 'multiplier',
        category: 'fundamental',
        file: CONSTANTS_FILE,
        locator: { exportName: 'DEFENSE_MULTIPLIERS', keyPath: ['advantage'] },
        min: 1.5, max: 3, step: 0.25,
        magnitudeCapPct: 0.25,
        tags: ['defense', 'stance'],
        rationale: 'Reward for defending with the advantaged stance.',
        effect: { difficulty: 'lowers', engagement: 'lowers' },
    },
    {
        id: 'combat.defense.neutral',
        kind: 'multiplier',
        category: 'fundamental',
        file: CONSTANTS_FILE,
        locator: { exportName: 'DEFENSE_MULTIPLIERS', keyPath: ['neutral'] },
        min: 1, max: 2.5, step: 0.25,
        magnitudeCapPct: 0.25,
        tags: ['defense', 'stance'],
        rationale: 'Defending with a neutral stance.',
        effect: { difficulty: 'lowers', engagement: 'lowers' },
    },
    {
        id: 'combat.resourceGen.attackHit',
        kind: 'constant',
        category: 'fundamental',
        file: CONSTANTS_FILE,
        locator: { exportName: 'RESOURCE_GENERATION', keyPath: ['ATTACK_HIT'] },
        min: 1, max: 6, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['resource', 'economy', 'skill'],
        rationale: 'Tokens generated on a landed attack; paces skill access.',
        effect: { difficulty: 'lowers', engagement: 'raises' },
    },
    {
        id: 'combat.resourceGen.defend',
        kind: 'constant',
        category: 'fundamental',
        file: CONSTANTS_FILE,
        locator: { exportName: 'RESOURCE_GENERATION', keyPath: ['DEFEND'] },
        min: 2, max: 8, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['resource', 'economy', 'defense'],
        rationale: 'Tokens generated on defend; paces defensive playstyles.',
        effect: { difficulty: 'lowers', engagement: 'raises' },
    },
    {
        id: 'combat.friendshipCounterMax',
        kind: 'constant',
        category: 'fundamental',
        file: CONSTANTS_FILE,
        locator: { exportName: 'FRIENDSHIP_COUNTER_MAX' },
        min: 2, max: 6, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['friendship', 'mercy'],
        rationale: 'Both-defend rounds needed for a peaceful resolution.',
        effect: { difficulty: 'raises' },
    },
    {
        id: 'effect.maxIntensity',
        kind: 'constant',
        category: 'effect',
        file: CONSTANTS_FILE,
        locator: { exportName: 'MAX_EFFECT_INTENSITY' },
        min: 5, max: 20, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['effect', 'stacking', 'status-effect'],
        rationale: 'Ceiling on effect intensity stacking.',
        effect: { engagement: 'raises' },
    },
    {
        id: 'effect.maxDuration',
        kind: 'constant',
        category: 'effect',
        file: CONSTANTS_FILE,
        locator: { exportName: 'MAX_EFFECT_DURATION' },
        min: 5, max: 20, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['effect', 'stacking', 'status-effect'],
        rationale: 'Ceiling on effect remaining-duration stacking.',
        effect: { engagement: 'raises' },
    },
    {
        id: 'progression.statPointsPerLevel',
        kind: 'constant',
        category: 'fundamental',
        file: CONSTANTS_FILE,
        locator: { exportName: 'STAT_POINTS_PER_LEVEL' },
        min: 1, max: 6, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['progression', 'player-power'],
        rationale: 'Stat points granted per level; player power curve.',
        effect: { difficulty: 'lowers' },
    },
    {
        // JSON-data tunable — exercises the applier's JSON path. Targets a
        // stable, long-lived effect's base duration.
        id: 'effect.buff_regeneration.duration',
        kind: 'effect-duration',
        category: 'effect',
        file: BUFFS_FILE,
        locator: { idField: 'id', id: 'buff_regeneration', field: ['duration'] },
        min: 1, max: 8, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['effect', 'regeneration', 'status-effect'],
        rationale: 'Base duration of the regeneration buff.',
        effect: { difficulty: 'lowers', engagement: 'raises' },
    },
];

const REGISTRY_BY_ID = new Map(TUNABLE_REGISTRY.map(p => [p.id, p]));

/** O(1) lookup. Returns undefined for non-registry (propose-only) ids. */
export function getTunable(id: string): TunableParam | undefined {
    return REGISTRY_BY_ID.get(id);
}

/** All registry entries (read-only). */
export function listTunables(): readonly TunableParam[] {
    return TUNABLE_REGISTRY;
}

/**
 * Filters the registry by a focus directive. With an empty focus, returns the
 * whole registry. Category, tag, and `addedAfter` filters are AND-composed;
 * within a dimension the match is existential (any-of).
 */
export function filterTunablesByFocus(focus: FocusFilter): TunableParam[] {
    return TUNABLE_REGISTRY.filter(param => {
        if (focus.categories?.length && !focus.categories.includes(param.category)) {
            return false;
        }
        if (focus.tags?.length && !focus.tags.some(t => param.tags.includes(t))) {
            return false;
        }
        if (focus.addedAfter) {
            if (!param.addedIn || param.addedIn < focus.addedAfter) return false;
        }
        return true;
    });
}

/**
 * Clamps a proposed value to the param's hard bounds, the per-run magnitude
 * cap (relative to `currentValue`), and the snap `step`.
 */
export function clampCandidate(
    param: TunableParam,
    proposed: number,
    currentValue: number,
): number {
    const cap = Math.abs(currentValue) * param.magnitudeCapPct;
    // When current is 0 the relative cap collapses; fall back to one step.
    const effectiveCap = cap > 0 ? cap : (param.step ?? 1);
    const low = Math.max(param.min, currentValue - effectiveCap);
    const high = Math.min(param.max, currentValue + effectiveCap);
    let value = Math.max(low, Math.min(high, proposed));
    if (param.step) {
        let snapped = Math.round(value / param.step) * param.step;
        // Snapping must not push the value back outside the [low, high] window.
        if (snapped > high) snapped -= param.step;
        if (snapped < low) snapped += param.step;
        if (snapped > high) snapped = high;
        if (snapped < low) snapped = low;
        value = snapped;
    }
    // Avoid -0 and floating dust.
    return Math.round(value * 1e6) / 1e6 || 0;
}
