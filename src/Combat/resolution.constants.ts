/**
 * Combat Resolution Threshold Constants
 * 
 * Phase 142 — Centralized resolution thresholds based on matrix evidence
 * from Phases 125/126/130. These values determine when status effects
 * trigger alternative victory conditions (friendship or DoT erosion).
 */

// Re-export from game mechanics constants for backward compatibility
export { 
    EFFECTS_RESOLUTION_DEBUFF_INTENSITY_THRESHOLD,
    EFFECTS_RESOLUTION_DOT_DAMAGE_THRESHOLD,
    EFFECTS_RESOLUTION_DOT_MAX_ROUNDS_TO_KILL
} from '../Game/game-mechanics.constants';

/**
 * Status Effect Resolution Analysis
 * 
 * Based on tuning evidence from Phase 126/130:
 * - Current DEBUFF_INTENSITY_THRESHOLD = 3 (lowered from 8→6→4→3)
 * - Current DOT_DAMAGE_THRESHOLD = 2 (lowered from 5→3→2)
 * - Remaining timeout cells: l15-mixed-easy, l15-strategist-normal
 * 
 * These thresholds were tuned to close engagement-without-resolution
 * gaps where STRATEGIST status play was heavily engaged (43-55% of
 * actions) but fights never resolved (0% resolution, 100% timeout).
 */

/** 
 * Minimum combined intensity of control/debuff effects needed to trigger
 * the saturation friendship route. Lower values make status effects more
 * decisive for resolution.
 * 
 * Tuning history (Phase 126/130):
 * - Original: 8 (too high, timeout cells at 0% resolution)
 * - Phase 126: 8→6 (kept by tuning)
 * - Phase 130: 6→4→3 (manual override to close l15 timeout cells)
 * 
 * Current value balances status-effect engagement with resolution impact.
 */
export const STATUS_RESOLUTION_DEBUFF_THRESHOLD = 3;

/** 
 * Minimum DoT damage per round needed to trigger the erosion victory route.
 * This represents cumulative damage from all DoT effects per round.
 * 
 * Tuning history (Phase 126/130):
 * - Original: 5 (too high, DoT never resolved fights)
 * - Phase 126: 5→3 (manual override)
 * - Phase 130: 3→2 (further lowered to enable DoT victories)
 * 
 * Lower values make DoT-focused builds more viable for resolution.
 */
export const STATUS_RESOLUTION_DOT_THRESHOLD = 2;

/**
 * Maximum rounds for DoT damage to accumulate before triggering erosion
 * victory. This prevents infinite DoT accumulation and ensures timely
 * resolution when DoT threshold is met consistently.
 * 
 * Typical DoT scenarios:
 * - poison (4 dmg/round) + bleed (3 dmg/round) = 7 total ≥ threshold
 * - Single high-intensity poison (intensity 3+ = 6+ dmg/round) ≥ threshold
 * - Combination DoT effects from status-heavy STRATEGIST play
 */
export const STATUS_RESOLUTION_DOT_MAX_ROUNDS = 15;

/**
 * Engagement floor for STRATEGIST playstyle. Status-effect actions must
 * comprise at least this percentage of rounds to maintain doctrine
 * compliance (CLAUDE.md: status effects are the MAIN fun).
 * 
 * Values below this floor indicate a regression to basic-attack trading,
 * which works against the game's vision.
 */
export const STATUS_ENGAGEMENT_FLOOR_PERCENT = 40;

/**
 * Interaction amplification bounds for Phase 142 effect combinations.
 * These limits prevent runaway amplification while allowing meaningful
 * synergy bonuses.
 */
export const INTERACTION_AMPLIFICATION = {
    /** Maximum intensity multiplier for effect interactions. */
    MAX_INTENSITY_MULTIPLIER: 2.0,
    /** Maximum duration multiplier for effect interactions. */
    MAX_DURATION_MULTIPLIER: 2.5,
    /** Maximum damage amplification for DoT interactions. */
    MAX_DAMAGE_MULTIPLIER: 2.0,
    /** Minimum amplification to be worthwhile (prevents tiny bonuses). */
    MIN_MEANINGFUL_AMPLIFICATION: 1.1
} as const;

/**
 * Priority thresholds for interaction evaluation. Higher-priority
 * interactions trigger first when multiple combos are possible.
 */
export const INTERACTION_PRIORITY = {
    /** Critical interactions that should always trigger first. */
    CRITICAL: 100,
    /** Important interactions with significant gameplay impact. */
    HIGH: 80,
    /** Standard interactions with moderate impact. */
    MEDIUM: 60,
    /** Minor interactions with small bonuses. */
    LOW: 40
} as const;