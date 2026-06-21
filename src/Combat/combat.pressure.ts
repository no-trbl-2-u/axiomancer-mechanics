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
