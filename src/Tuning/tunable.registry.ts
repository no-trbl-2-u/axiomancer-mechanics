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
const DEBUFFS_FILE = 'src/Effects/debuffs.library.json';

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
        id: 'loot.statusAffixDrawBias',
        kind: 'multiplier',
        category: 'loot',
        file: CONSTANTS_FILE,
        locator: { exportName: 'STATUS_AFFIX_DRAW_BIAS' },
        min: 1, max: 6, step: 0.5,
        magnitudeCapPct: 0.5,
        tags: ['loot', 'affix', 'status-effect', 'engagement'],
        rationale: 'Draw-weight multiplier for offensive status-applying affixes '
            + '(weapon/hands, status-tagged, non-defensive). At 1 the affix pool is '
            + 'flat-stat dominated (a doctrine failure); raising it makes status '
            + 'weapons/gauntlets the expected affix roll so loot feeds status-effect '
            + 'play. Engagement-positive; touches drop naming/mods only, not combat math.',
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
    {
        id: 'effect.tier1_heart_defend.healthPerRound',
        kind: 'constant',
        category: 'effect',
        file: BUFFS_FILE,
        locator: { idField: 'id', id: 'tier1_heart_defend', field: ['payload', 'regeneration', 'healthPerRound'] },
        min: 1, max: 4, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['effect', 'regeneration', 'status-effect', 'tier-1'],
        rationale: 'Base healing per round for tier 1 Heart self-buff - crucial for L1 survival.',
        effect: { difficulty: 'lowers', engagement: 'raises' },
    },
    {
        id: 'effect.tier1_body_attack.duration',
        kind: 'effect-duration',
        category: 'effect',
        file: BUFFS_FILE,
        locator: { idField: 'id', id: 'tier1_body_attack', field: ['duration'] },
        min: 1, max: 5, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['effect', 'stat', 'status-effect', 'tier-1'],
        rationale: 'Base duration for tier 1 Body self-buff - impacts early game viability.',
        effect: { difficulty: 'lowers', engagement: 'raises' },
    },
    {
        id: 'effect.debuff_confusion.rollModifier',
        kind: 'constant',
        category: 'effect',
        file: 'src/Effects/debuffs.library.json',
        locator: { idField: 'id', id: 'debuff_confusion', field: ['payload', 'rollModifier'] },
        min: -8, max: -2, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['effect', 'control', 'status-effect', 'debuff'],
        rationale: 'Roll penalty for confusion debuff - key strategist control effect.',
        effect: { difficulty: 'raises', engagement: 'raises' },
    },
    {
        id: 'effect.debuff_fear.rollModifier',
        kind: 'constant',
        category: 'effect',
        file: 'src/Effects/debuffs.library.json',
        locator: { idField: 'id', id: 'debuff_fear', field: ['payload', 'rollModifier'] },
        min: -6, max: -2, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['effect', 'control', 'status-effect', 'debuff'],
        rationale: 'Roll penalty for fear debuff - important for status-effect engagement.',
        effect: { difficulty: 'raises', engagement: 'raises' },
    },
    {
        id: 'effect.resolutionDebuffIntensityThreshold',
        kind: 'constant',
        category: 'effect',
        file: CONSTANTS_FILE,
        locator: { exportName: 'EFFECTS_RESOLUTION_DEBUFF_INTENSITY_THRESHOLD' },
        min: 4, max: 15, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['effect', 'control', 'status-effect', 'resolution', 'timeout'],
        rationale: 'Combined debuff/control intensity needed to force saturation yield (friendship route).',
        effect: { difficulty: 'lowers', engagement: 'raises' },
    },
    {
        id: 'effect.resolutionDotDamageThreshold',
        kind: 'constant',
        category: 'effect',
        file: CONSTANTS_FILE,
        locator: { exportName: 'EFFECTS_RESOLUTION_DOT_DAMAGE_THRESHOLD' },
        min: 2, max: 12, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['effect', 'damage', 'status-effect', 'resolution', 'timeout'],
        rationale: 'Minimum DoT damage per round to force erosion victory route.',
        effect: { difficulty: 'lowers', engagement: 'raises' },
    },
    {
        id: 'effect.resolutionDotMaxRoundsToKill',
        kind: 'constant',
        category: 'effect',
        file: CONSTANTS_FILE,
        locator: { exportName: 'EFFECTS_RESOLUTION_DOT_MAX_ROUNDS_TO_KILL' },
        min: 5, max: 40, step: 5,
        magnitudeCapPct: 1.0,
        tags: ['effect', 'damage', 'status-effect', 'resolution', 'timeout', 'dot'],
        rationale: 'Rounds-to-kill horizon for the DoT erosion route. The binding '
            + 'constraint at L30+ (rounds-to-kill scales with enemy HP, so the default '
            + '10 is unreachable on high-HP enemies). Raising it lets a strong, '
            + 'sustained DoT resolve a fight it will demonstrably win before the cap.',
        effect: { difficulty: 'lowers', engagement: 'raises' },
    },
    {
        id: 'effect.baseProcIntensity',
        kind: 'constant',
        category: 'effect',
        file: CONSTANTS_FILE,
        locator: { exportName: 'EFFECT_BASE_PROC_INTENSITY' },
        min: 1, max: 3, step: 1,
        magnitudeCapPct: 1.0,
        tags: ['effect', 'control', 'status-effect', 'intensity', 'resolution'],
        rationale: 'Base intensity per proc-applied effect. Control effects stack by '
            + 'duration (intensity stays at this base), so the saturation-yield route '
            + 'is only reachable when this is raised or several control effects stack. '
            + 'Symmetric across combatants — the defeat-regression guard bounds it.',
        effect: { engagement: 'raises' },
    },

    // ── Per-effect potency (the levers the resolution routes actually read) ────
    // The resolution routes in src/Combat/effect-resolution.ts sum per-effect
    // DoT damage and effect duration/intensity, then compare to the thresholds
    // above. Tuning the thresholds alone does nothing if no authored effect's
    // values approach them — so expose the workhorse DoT/control effects' base
    // values directly. This is the registry gap the 2026-06-08 focused tick
    // surfaced: status play can only become DECISIVE if the loop can scale the
    // effects themselves toward the erosion / saturation routes.
    {
        id: 'effect.debuff_poison.damagePerRound',
        kind: 'constant',
        category: 'effect',
        file: DEBUFFS_FILE,
        locator: { idField: 'id', id: 'debuff_poison', field: ['payload', 'damageOverTime', 'damagePerRound'] },
        min: 2, max: 8, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['effect', 'damage', 'status-effect', 'debuff', 'dot', 'resolution'],
        rationale: 'Base DoT/round of poison — the workhorse damage effect feeding the erosion victory route.',
        effect: { difficulty: 'lowers', engagement: 'raises' },
    },
    {
        id: 'effect.debuff_poison.duration',
        kind: 'effect-duration',
        category: 'effect',
        file: DEBUFFS_FILE,
        locator: { idField: 'id', id: 'debuff_poison', field: ['duration'] },
        min: 2, max: 8, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['effect', 'damage', 'status-effect', 'debuff', 'dot', 'resolution'],
        rationale: 'Base duration of poison — longer DoT accumulates toward the erosion route before timeout.',
        effect: { difficulty: 'lowers', engagement: 'raises' },
    },
    {
        id: 'effect.debuff_bleed.damagePerRound',
        kind: 'constant',
        category: 'effect',
        file: DEBUFFS_FILE,
        locator: { idField: 'id', id: 'debuff_bleed', field: ['payload', 'damageOverTime', 'damagePerRound'] },
        min: 2, max: 8, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['effect', 'damage', 'status-effect', 'debuff', 'dot', 'resolution'],
        rationale: 'Base DoT/round of bleed — a second workhorse DoT for the erosion route.',
        effect: { difficulty: 'lowers', engagement: 'raises' },
    },
    {
        id: 'effect.debuff_burn.damagePerRound',
        kind: 'constant',
        category: 'effect',
        file: DEBUFFS_FILE,
        locator: { idField: 'id', id: 'debuff_burn', field: ['payload', 'damageOverTime', 'damagePerRound'] },
        min: 2, max: 9, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['effect', 'damage', 'status-effect', 'debuff', 'dot', 'resolution'],
        rationale: 'Base DoT/round of burn — high-tempo DoT for the erosion route.',
        effect: { difficulty: 'lowers', engagement: 'raises' },
    },
    {
        id: 'effect.debuff_strong_poison.damagePerRound',
        kind: 'constant',
        category: 'effect',
        file: DEBUFFS_FILE,
        locator: { idField: 'id', id: 'debuff_strong_poison', field: ['payload', 'damageOverTime', 'damagePerRound'] },
        min: 3, max: 12, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['effect', 'damage', 'status-effect', 'debuff', 'dot', 'resolution'],
        rationale: 'Base DoT/round of strong poison — the heavy DoT meant to finish enemies via erosion.',
        effect: { difficulty: 'lowers', engagement: 'raises' },
    },
    {
        id: 'effect.debuff_confusion.duration',
        kind: 'effect-duration',
        category: 'effect',
        file: DEBUFFS_FILE,
        locator: { idField: 'id', id: 'debuff_confusion', field: ['duration'] },
        min: 2, max: 7, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['effect', 'control', 'status-effect', 'debuff', 'resolution'],
        rationale: 'Base duration of confusion — longer control persists toward the saturation yield route.',
        effect: { difficulty: 'lowers', engagement: 'raises' },
    },
    {
        id: 'effect.debuff_fear.duration',
        kind: 'effect-duration',
        category: 'effect',
        file: DEBUFFS_FILE,
        locator: { idField: 'id', id: 'debuff_fear', field: ['duration'] },
        min: 2, max: 6, step: 1,
        magnitudeCapPct: 0.5,
        tags: ['effect', 'control', 'status-effect', 'debuff', 'resolution'],
        rationale: 'Base duration of fear — longer control persists toward the saturation yield route.',
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
