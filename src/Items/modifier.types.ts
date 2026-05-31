/**
 * Modifier Types — Spec 05d.
 *
 * Defines the data layer for the modifier catalogue that `rollModifiers` /
 * `resolveModifiers` (Spec 05c) operate on. Per Spec 05d Q1 the payload is
 * plain data — no functions on `Modifier` — so mods stay serialisable for
 * save files and Spec 11's seeded-RNG harness.
 *
 * The substitution contract (Spec 05d Q3):
 *   - `value: 0` in `payload.statModifiers` entries is a sentinel replaced
 *     by the rolled value at resolve time.
 *   - `bonus: 0` in `payload.resourceInteraction.generationBonus` entries is
 *     similarly replaced.
 *   - `0` values inside `payload.resourceInteraction.combatStartTokens` are
 *     replaced by the rolled value, then summed across mods (Spec 05b Q2).
 *   - `passiveEffects`, `onHitEffects`, `onDefendEffects` are presence-only:
 *     the array is concatenated, the rolled value is just a presence marker.
 */

import { EquipmentSlot, Equipment } from './types';

/**
 * Roll-time rarity tier for a mod (orthogonal to instance `ItemRarity`).
 * Drives the weighted sample inside `rollModifiers` — common mods dominate
 * the pool, rare mods are chase rolls.
 */
export type HiddenModRarity = 'common_mod' | 'uncommon_mod' | 'rare_mod';

/**
 * Roll weight per hidden rarity (Spec 05d §1). Used by `rollModifiers` for
 * the without-replacement weighted sample.
 */
export const HIDDEN_MOD_RARITY_WEIGHTS: Record<HiddenModRarity, number> = {
    common_mod:   10,
    uncommon_mod: 3,
    rare_mod:     1,
};

/**
 * One value-band tier on a `Modifier`. The factory picks the highest tier
 * whose `levelReq <= playerLevel`, then rolls uniformly within `range`.
 */
export interface ModValueTier {
    levelReq: number;
    /** Inclusive `[min, max]`. Equal min/max means a fixed presence value. */
    range: [number, number];
}

/**
 * Sub-shape of `Equipment` a `Modifier` may contribute to. `resolveModifiers`
 * concatenates array fields and merges `resourceInteraction` additively
 * across all rolled mods on an instance.
 */
export type ModifierPayload = Partial<Pick<Equipment,
    | 'statModifiers'
    | 'passiveEffects'
    | 'onHitEffects'
    | 'onDefendEffects'
    | 'resourceInteraction'
>>;

/**
 * A single catalogue entry (Spec 05d). Authored once in
 * `modifier.catalogue.ts`; never mutated.
 *
 * @property id            - Stable identifier referenced by `RolledModifier.modId`
 *                           and (for unique mods) `UniqueItemTemplate.fixedModIds`.
 * @property name          - Display name shown on item tooltips.
 * @property hiddenRarity  - Drop-time rarity weight (`common_mod` etc.).
 * @property validSlots    - Equipment slots this mod may roll on. Unique mods
 *                           keep their own pool; this list is treated as the
 *                           pool of slots the unique can be hosted on.
 * @property levelTiers    - Ascending by `levelReq`; at least one entry. The
 *                           highest tier with `levelReq <= playerLevel` wins.
 * @property payload       - Template payload with `value: 0` / `bonus: 0`
 *                           sentinels that `resolveModifiers` substitutes.
 */
export interface Modifier {
    id: string;
    name: string;
    hiddenRarity: HiddenModRarity;
    validSlots: EquipmentSlot[];
    levelTiers: ModValueTier[];
    payload: ModifierPayload;
}
