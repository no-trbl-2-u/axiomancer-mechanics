/**
 * Spec 25 — Hazard-Pattern Combat: pressure tracks + attribution (§5, §7.7).
 *
 * The two Pressure Tracks are the only practical win conditions. They are a
 * *leading indicator* of the Phase 125 resolution math — the per-effect
 * contribution here mirrors `analyzeDotErosion` / `analyzeDebuffSaturation`
 * (`effect-resolution.ts`) so the meter the player watches and the resolution
 * the engine fires never disagree.
 *
 * Pure math only: no RNG, no I/O. The engine owns when these fire.
 */

import { effectPressure } from './combat.cards';
import type {
    CombatAttributionRow, CombatEncounterState, CombatOutcome, CombatPressureTracks,
    CombatSummary, LandedEffect,
} from './combat.encounter.types';

/** Momentum surplus that carries into the next phase: ⌊surplus/2⌋ capped at 3 (§4.5). */
export const MOMENTUM_CAP = 3;

export function momentumCarry(surplus: number): number {
    return Math.max(0, Math.min(MOMENTUM_CAP, Math.floor(surplus / 2)));
}

// ── Spec 26b tuning §3 — "variety snowballs, repetition decays" ──────────────
// The whole engagement thesis (and the project doctrine) is that EXPLOITING A
// VARIETY of status effects is the fun, and winning by spamming one card is not.
// Three levers enforce it: same-effect diminishing returns (below) punish
// repetition; the escalating diversity synergy (`diversitySynergy`) rewards
// stacking DISTINCT statuses into a snowballing combo; and the variety-gated
// combo loop in the engine (a re-applied status no longer refreshes the die)
// makes a long "big turn" come from playing DIFFERENT cards, not the same one.

/** Each re-application of the SAME effect this combat loses this much of its
 *  base. Steepened (0.2→0.3) so leaning on one card decays fast — by the 3rd
 *  cast it's at the floor. */
export const DIMINISH_STEP = 0.3;
/** …but never below this fraction of the base, so a thin starter deck that must
 *  reuse its single status card can still chip (a new player is never walled). */
export const DIMINISH_FLOOR = 0.4;
/** Per-extra-distinct-status increment for the diversity synergy (see
 *  `diversitySynergy`). */
export const SYNERGY_BONUS = 3;

/** Marginal multiplier for the Nth application of one effect (0-indexed prior). */
export function diminishFactor(priorCount: number): number {
    return Math.max(DIMINISH_FLOOR, 1 - DIMINISH_STEP * Math.max(0, priorCount));
}

/** Escalating diversity synergy: with `distinctOffensive` distinct offensive
 *  statuses live on the enemy, each land earns `(distinctOffensive − 1) ×
 *  SYNERGY_BONUS` bonus pressure. One status → +0 (single-card spam earns no
 *  synergy); two → +3; three → +6; four → +9. This is the combo snowball that
 *  makes a varied kit decisively out-pace mono-spam (the Mage-Knight big turn). */
export function diversitySynergy(distinctOffensive: number): number {
    return SYNERGY_BONUS * Math.max(0, distinctOffensive - 1);
}

/**
 * The pressure a card's landed effect actually contributes after: diminishing
 * returns (priorCount of the same effect), the stance-read multiplier, the
 * color-match flat bonus, and the diversity synergy bonus. Single source for the
 * engine (live) and `projectCardPressure` (the UI preview) so they never drift.
 */
export function marginalPressure(
    base: number,
    priorCount: number,
    readMult: number,
    colorMatchBonus: number,
    synergyBonus: number,
): number {
    const diminished = base * diminishFactor(priorCount);
    return Math.max(1, Math.round(diminished * readMult) + colorMatchBonus + synergyBonus);
}

/** Pressure a single landed effect contributes to its track. */
export function pressureForLanded(landed: LandedEffect): { track: 'dot' | 'control' | 'none'; amount: number } {
    if (landed.target !== 'enemy') return { track: 'none', amount: 0 };
    return effectPressure(landed.effect, landed.active.intensity, landed.active.remainingDuration);
}

/** DoT Erosion fires when the cumulative dot track meets its threshold (§5.1). */
export function dotErosionReached(tracks: CombatPressureTracks): boolean {
    return tracks.dot >= tracks.dotThreshold;
}

/** Control Saturation fires when the cumulative control track meets its threshold (§5.2). */
export function controlSaturationReached(tracks: CombatPressureTracks): boolean {
    return tracks.control >= tracks.controlThreshold;
}

/**
 * Folds a landed effect into the attribution ledger keyed by the card that
 * applied it (powers the §7.7 post-combat summary). DoT cards accrue projected
 * `damagePerRound × intensity × remainingDuration`; every card accrues the
 * pressure it contributed.
 */
export function recordAttribution(
    attribution: Record<string, CombatAttributionRow>,
    cardId: string,
    cardName: string,
    landed: LandedEffect,
    pressure: number,
): Record<string, CombatAttributionRow> {
    const prev = attribution[cardId] ?? {
        cardId, name: cardName, dotDamage: 0, pressureContributed: 0, phases: 0,
    };
    const dot = landed.effect.payload.damageOverTime;
    const projected = dot
        ? dot.damagePerRound * Math.max(1, landed.active.intensity) * Math.max(1, landed.active.remainingDuration)
        : 0;
    return {
        ...attribution,
        [cardId]: {
            ...prev,
            dotDamage: prev.dotDamage + projected,
            pressureContributed: prev.pressureContributed + pressure,
            phases: prev.phases + 1,
        },
    };
}

const HEADLINES: Record<CombatOutcome, string> = {
    victory: 'Victory via DoT Erosion',
    mercy: 'Mercy via Control Saturation',
    defeat: 'Defeat',
    retreat: 'Retreat',
};

/**
 * Builds the post-combat attribution summary (§7.7). Names the single card
 * that contributed most to the winning track. Shown for wins AND losses
 * ("Effects contributed before defeat").
 */
export function buildCombatSummary(state: CombatEncounterState): CombatSummary {
    const outcome = state.finalOutcome ?? 'defeat';
    const rows = Object.values(state.attribution).sort((a, b) => b.pressureContributed - a.pressureContributed);
    const totalDotDamage = rows.reduce((s, r) => s + r.dotDamage, 0);

    // The winning track decides which card is "best": DoT for victory, control
    // for mercy; otherwise whichever pressured most.
    const winTrack = outcome === 'mercy' ? 'control' : 'dot';
    const best = rows.slice().sort((a, b) => {
        if (winTrack === 'dot') return b.dotDamage - a.dotDamage || b.pressureContributed - a.pressureContributed;
        return b.pressureContributed - a.pressureContributed;
    })[0];

    return {
        outcome,
        headline: HEADLINES[outcome],
        rows,
        totalDotDamage,
        directDamage: state.directDamageDealt,
        controlPeak: state.pressureTracks.control,
        controlThreshold: state.pressureTracks.controlThreshold,
        bestCard: best?.name ?? '',
    };
}
