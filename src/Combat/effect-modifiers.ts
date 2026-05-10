/**
 * Aggregated effect modifiers.
 *
 * One pass over a combatant's `ActiveEffect[]` builds a single
 * `AggregatedEffectModifiers` object the rest of the combat module reads from
 * (effective stats, defense bonus, advantage grants, action restrictions, DoT
 * totals, regen / drain). Per-application stacking caps and intensity scaling
 * (Q2) are applied here so the consumers stay simple.
 */

import { ActiveEffect, DotTickPhase, EffectStatTarget } from '../Effects/types';
import { lookupEffect } from '../Effects/effects.library';
import { Stance, Combatant } from './types';
import { BaseStats, DerivedStats, NonCombatStats } from '../Character/types';
import { deriveStats, deriveNonCombatStats } from '../Utils';
import { isCharacter } from '../Utils/typeGuards';

const STANCE_KEYS: ReadonlyArray<EffectStatTarget> = ['body', 'mind', 'heart'];
export const isBaseStatTarget = (t: EffectStatTarget): t is Stance =>
    (STANCE_KEYS as readonly string[]).includes(t);

/**
 * Aggregated, intensity-scaled modifiers from every active effect on a combatant.
 *
 * - `statFlat` and `statMultBonus` are keyed by `EffectStatTarget` and are summed
 *   across every modifier targeting that stat.
 * - Multipliers compose **additively** per Q3: `final = base × (1 + Σ (m - 1))`.
 * - Every numeric is intensity-scaled per Q2: a value of `v` at intensity `n`
 *   contributes `v × n` (multipliers contribute `(m - 1) × n` to `statMultBonus`).
 * - DoT damage is split by tick phase (Q4). Drain is kept separate from regen
 *   so the consumer can render them differently (Q6).
 */
export interface AggregatedEffectModifiers {
    statFlat: Map<EffectStatTarget, number>;
    statMultBonus: Map<EffectStatTarget, number>;
    defenseDelta: number;
    advantageGrants: Set<Stance>;
    advantageDenies: Set<Stance>;
    skipTurn: boolean;
    forcedStance: Stance | null;
    blockedStances: Set<Stance>;
    dotStart: number;
    dotEnd: number;
    healthRegen: number;
    healthDrain: number;
    manaRegen: number;
}

const emptyAgg = (): AggregatedEffectModifiers => ({
    statFlat:        new Map(),
    statMultBonus:   new Map(),
    defenseDelta:    0,
    advantageGrants: new Set(),
    advantageDenies: new Set(),
    skipTurn:        false,
    forcedStance:    null,
    blockedStances:  new Set(),
    dotStart:        0,
    dotEnd:          0,
    healthRegen:     0,
    healthDrain:     0,
    manaRegen:       0,
});

const addToMap = (map: Map<EffectStatTarget, number>, key: EffectStatTarget, value: number): void => {
    map.set(key, (map.get(key) ?? 0) + value);
};

/**
 * Walks `effects` once and returns the aggregated modifier bundle. Pure.
 * Effects whose definition isn't in the library are skipped silently — they
 * may exist as data-only placeholders.
 */
export function getActiveEffectModifiers(effects: ActiveEffect[]): AggregatedEffectModifiers {
    const agg = emptyAgg();

    for (const ae of effects) {
        const def = lookupEffect(ae.effectId);
        if (!def) continue;

        const intensity = ae.intensity ?? 1;
        const payload = def.payload;

        for (const mod of payload.statModifiers ?? []) {
            const scaled = mod.value * intensity;
            if (mod.isMultiplier) {
                // Convert to bonus-over-1.0 and accumulate additively (Q3).
                addToMap(agg.statMultBonus, mod.stat, (mod.value - 1) * intensity);
            } else {
                addToMap(agg.statFlat, mod.stat, scaled);
            }
        }

        if (payload.defenseModifier) {
            agg.defenseDelta += payload.defenseModifier * intensity;
        }

        if (payload.advantageModifier?.grantAdvantage) {
            for (const s of payload.advantageModifier.grantAdvantage) agg.advantageGrants.add(s);
        }
        if (payload.advantageModifier?.grantDisadvantage) {
            for (const s of payload.advantageModifier.grantDisadvantage) agg.advantageDenies.add(s);
        }

        const restriction = payload.actionRestriction;
        if (restriction) {
            if (restriction.skipTurn) agg.skipTurn = true;
            if (restriction.forcedStance && !agg.forcedStance) {
                // Last-write-wins is unstable — keep the first; ties resolved by effect order.
                agg.forcedStance = restriction.forcedStance;
            }
            for (const s of restriction.blockedStances ?? []) agg.blockedStances.add(s);
        }

        const dot = payload.damageOverTime;
        if (dot) {
            const total = dot.damagePerRound * intensity;
            const phase: DotTickPhase = dot.tickPhase ?? 'start';
            if (phase === 'start') agg.dotStart += total;
            else                   agg.dotEnd   += total;
        }

        const regen = payload.regeneration;
        if (regen) {
            const hp = (regen.healthPerRound ?? 0) * intensity;
            if (hp > 0) agg.healthRegen += hp;
            else if (hp < 0) agg.healthDrain += -hp;

            const mana = (regen.manaPerRound ?? 0) * intensity;
            if (mana > 0) agg.manaRegen += mana;
        }
    }

    return agg;
}

/**
 * Effective stats for a combatant after applying every active effect's stat
 * modifiers. Per Q1, modifiers explicitly target either a base stat
 * (`heart`/`body`/`mind`) — which re-derives every dependent derived stat — or
 * a specific derived stat — which is patched directly.
 *
 * Pipeline:
 *   1. Effective base stat = (base + Σ flat × intensity) × (1 + Σ (mult - 1) × intensity)
 *   2. Re-derive `derivedStats` from the effective base stats.
 *   3. Add per-derived-stat flat / multiplier modifiers on top.
 *   4. `nonCombatStats` for Characters re-derives from effective base stats and
 *      then folds in any per-save flat modifiers (e.g. `buff_resistance_*`).
 */
export interface EffectiveStats {
    baseStats: BaseStats;
    derivedStats: DerivedStats;
    nonCombatStats: NonCombatStats | null;
    /** Stance-agnostic flat defense bonus from `defenseModifier` payloads. */
    defenseDelta: number;
}

const applyFlatAndMult = (
    base: number,
    flat: number,
    multBonus: number,
): number => (base + flat) * (1 + multBonus);

const stanceFlat = (mods: AggregatedEffectModifiers, stance: Stance): number =>
    mods.statFlat.get(stance) ?? 0;
const stanceMult = (mods: AggregatedEffectModifiers, stance: Stance): number =>
    mods.statMultBonus.get(stance) ?? 0;

const derivedFlat = (mods: AggregatedEffectModifiers, key: keyof DerivedStats): number =>
    mods.statFlat.get(key as EffectStatTarget) ?? 0;
const derivedMult = (mods: AggregatedEffectModifiers, key: keyof DerivedStats): number =>
    mods.statMultBonus.get(key as EffectStatTarget) ?? 0;
const ncsFlat = (mods: AggregatedEffectModifiers, key: keyof NonCombatStats): number =>
    mods.statFlat.get(key as EffectStatTarget) ?? 0;

/**
 * Computes the combatant's effective stats with active-effect modifiers applied.
 * Pure; recomputes on every call. Combat is small so the work is negligible.
 */
export function getEffectiveStats(combatant: Combatant): EffectiveStats {
    const mods = getActiveEffectModifiers(combatant.effects);

    const baseStats: BaseStats = {
        body:  applyFlatAndMult(combatant.baseStats.body,  stanceFlat(mods, 'body'),  stanceMult(mods, 'body')),
        mind:  applyFlatAndMult(combatant.baseStats.mind,  stanceFlat(mods, 'mind'),  stanceMult(mods, 'mind')),
        heart: applyFlatAndMult(combatant.baseStats.heart, stanceFlat(mods, 'heart'), stanceMult(mods, 'heart')),
    };

    const reDerived = deriveStats(baseStats);
    const derivedStats: DerivedStats = {
        physicalAttack:   applyFlatAndMult(reDerived.physicalAttack,   derivedFlat(mods, 'physicalAttack'),   derivedMult(mods, 'physicalAttack')),
        physicalSkill:    applyFlatAndMult(reDerived.physicalSkill,    derivedFlat(mods, 'physicalSkill'),    derivedMult(mods, 'physicalSkill')),
        physicalDefense:  applyFlatAndMult(reDerived.physicalDefense,  derivedFlat(mods, 'physicalDefense'),  derivedMult(mods, 'physicalDefense')),
        mentalAttack:     applyFlatAndMult(reDerived.mentalAttack,     derivedFlat(mods, 'mentalAttack'),     derivedMult(mods, 'mentalAttack')),
        mentalSkill:      applyFlatAndMult(reDerived.mentalSkill,      derivedFlat(mods, 'mentalSkill'),      derivedMult(mods, 'mentalSkill')),
        mentalDefense:    applyFlatAndMult(reDerived.mentalDefense,    derivedFlat(mods, 'mentalDefense'),    derivedMult(mods, 'mentalDefense')),
        emotionalAttack:  applyFlatAndMult(reDerived.emotionalAttack,  derivedFlat(mods, 'emotionalAttack'),  derivedMult(mods, 'emotionalAttack')),
        emotionalSkill:   applyFlatAndMult(reDerived.emotionalSkill,   derivedFlat(mods, 'emotionalSkill'),   derivedMult(mods, 'emotionalSkill')),
        emotionalDefense: applyFlatAndMult(reDerived.emotionalDefense, derivedFlat(mods, 'emotionalDefense'), derivedMult(mods, 'emotionalDefense')),
        luck:             applyFlatAndMult(reDerived.luck,             derivedFlat(mods, 'luck'),             derivedMult(mods, 'luck')),
    };

    let nonCombatStats: NonCombatStats | null = null;
    if (isCharacter(combatant)) {
        const reNcs = deriveNonCombatStats(baseStats);
        nonCombatStats = {
            physicalSave:   reNcs.physicalSave   + ncsFlat(mods, 'physicalSave'),
            physicalTest:   reNcs.physicalTest   + ncsFlat(mods, 'physicalTest'),
            mentalSave:     reNcs.mentalSave     + ncsFlat(mods, 'mentalSave'),
            mentalTest:     reNcs.mentalTest     + ncsFlat(mods, 'mentalTest'),
            emotionalSave:  reNcs.emotionalSave  + ncsFlat(mods, 'emotionalSave'),
            emotionalTest:  reNcs.emotionalTest  + ncsFlat(mods, 'emotionalTest'),
        };
    }

    return { baseStats, derivedStats, nonCombatStats, defenseDelta: mods.defenseDelta };
}

/**
 * Resolves Q7's action-restriction precedence into a final canAct outcome.
 *
 * Rules (per Q7 default):
 *   1. `skipTurn` wins outright — bearer loses their action regardless of stance.
 *   2. `forcedStance` overrides the requested stance and trumps `blockedStances`.
 *   3. If the requested stance is in `blockedStances`, bearer cannot use it.
 *
 * @param effects        - The bearer's active effects.
 * @param requestedStance - Stance the bearer wants to use this round (`null` if not yet chosen).
 *
 * @returns
 *   - `canAct`         — false when stunned/slept/petrified or the requested stance is blocked.
 *   - `resolvedStance` — the stance that will actually be used (forced > requested).
 *   - `reason`         — short hint for the UI when blocked.
 */
export function canAct(
    effects: ActiveEffect[],
    requestedStance: Stance | null = null,
): { canAct: boolean; resolvedStance: Stance | null; reason: string | null } {
    const mods = getActiveEffectModifiers(effects);

    if (mods.skipTurn) {
        return { canAct: false, resolvedStance: null, reason: 'skipTurn' };
    }

    if (mods.forcedStance) {
        // Forced stance trumps a block — charm overrides silence on its own stance.
        return { canAct: true, resolvedStance: mods.forcedStance, reason: null };
    }

    if (requestedStance && mods.blockedStances.has(requestedStance)) {
        return { canAct: false, resolvedStance: null, reason: 'blockedStance' };
    }

    return { canAct: true, resolvedStance: requestedStance, reason: null };
}
