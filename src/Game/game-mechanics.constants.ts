/**
 * Game Mechanics Constants
 * Single source of truth for all numeric values that control game rules.
 * Import from here instead of hardcoding magic numbers across the codebase.
 */

// ============================================================================
// CHARACTER — STAT DERIVATION MULTIPLIERS
// ============================================================================
// Applied to each base stat (body / mind / heart) to produce the four
// derived combat stats for that attribute category.

export const STAT_MULTIPLIERS = {
    SKILL:   1,
    DEFENSE: 3,
    SAVE:    2,
    TEST:    4,
} as const;

// ============================================================================
// CHARACTER — RESOURCE CALCULATIONS
// ============================================================================
// Scaling factor applied after the base-stat average when computing the
// maximum pool for each resource.
// Formula:  max = level × average(relevantStats) × PER_STAT multiplier

export const RESOURCE_MULTIPLIERS = {
    HEALTH_PER_STAT: 10,
    MANA_PER_STAT:   10,
} as const;

// ============================================================================
// PROGRESSION — EXPERIENCE & LEVELING
// ============================================================================

export const EXPERIENCE_PER_LEVEL = 1000;

// ============================================================================
// COMBAT — DEFENSE MULTIPLIERS
// ============================================================================
// Applied to a combatant's base defense stat when they choose the 'defend'
// action.  The multiplier is selected based on the defender's type-advantage
// relative to the attacker (heart > body > mind > heart).
//
//   Defending with ADVANTAGE    → 3× defense  (picked the right counter-type)
//   Defending with NEUTRAL      → 2× defense  (same type, no bonus)
//   Defending with DISADVANTAGE → 1.5× defense (picked the wrong type, weaker)
//
// Keys deliberately match the Advantage union type so they can be used as
// a direct lookup: DEFENSE_MULTIPLIERS[advantage].

export const DEFENSE_MULTIPLIERS: Record<'advantage' | 'neutral' | 'disadvantage', number> = {
    advantage:    3,
    neutral:      2,
    disadvantage: 1.5,
} as const;

// Applied when a combatant did NOT choose the 'defend' action (i.e. they are
// taking damage after losing an attack contest with no active defense bonus).
export const PASSIVE_DEFENSE_MULTIPLIER = 1;

// ============================================================================
// COMBAT — FRIENDSHIP MECHANIC
// ============================================================================
// When both combatants choose 'defend' on the same turn the friendship
// counter increments.  Reaching the maximum ends combat peacefully.

export const FRIENDSHIP_COUNTER_MAX = 3;
