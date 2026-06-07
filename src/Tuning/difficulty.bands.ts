/**
 * Per-difficulty target bands.
 *
 * A single 65–75% success band for every cell was a modeling bug: "easy" and
 * "hard" presets are not supposed to resolve at the same rate. Each difficulty
 * targets its own band, so an easy fight reading 85% and a hard fight reading
 * 55% are BOTH healthy — and the optimiser stops trying to drag them to a
 * common, wrong number.
 *
 * The `normal` band stays at the historical 65–75% so existing expectations and
 * the human-facing `deriveFindings` notion of "balanced" still line up.
 */

import type { Difficulty, TargetBand } from './types';

export const DIFFICULTY_BANDS: Record<Difficulty, TargetBand> = {
    easy: { low: 0.75, high: 0.88 },
    normal: { low: 0.65, high: 0.75 },
    hard: { low: 0.5, high: 0.65 },
};

/** The reference (normal) band, used for display and back-compat. */
export const NORMAL_BAND: TargetBand = DIFFICULTY_BANDS.normal;

/** Resolve the target band for a difficulty, defaulting to the normal band. */
export function bandFor(difficulty: Difficulty | undefined): TargetBand {
    return (difficulty && DIFFICULTY_BANDS[difficulty]) || NORMAL_BAND;
}

/** Squared distance of a rate from a band (0 ⇒ inside the band). */
export function bandDeviation(rate: number, band: TargetBand): number {
    if (rate < band.low) return (band.low - rate) ** 2;
    if (rate > band.high) return (rate - band.high) ** 2;
    return 0;
}
