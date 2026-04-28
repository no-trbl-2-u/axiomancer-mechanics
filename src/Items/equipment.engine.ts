/**
 * Equipment Engine
 *
 * Pure helpers that equip / unequip items on a Character and aggregate
 * the modifiers contributed by every equipped slot.
 *
 * Because `Character/types.d.ts` does not yet declare an `equipment`
 * slot map (the field is added structurally for now), these helpers all
 * accept and return a `Character & { equipment }` shape so callers stay
 * type-safe without forcing a Phase-5b style migration of the Character
 * type itself.
 */

import { Character } from '../Character/types';
import { Equipment, EquipmentSlot } from './types';
import { lookupEffect } from '../Effects/effects.library';
import { CombatEffectTrigger } from '../Combat/types';
import type { StatModifier, EffectStatTarget } from '../Effects/types';

/**
 * Map of slot → equipped Equipment (or undefined if empty).
 *
 * Each Character can have at most one equipment item per slot.
 */
export type EquipmentLoadout = Partial<Record<EquipmentSlot, Equipment>>;

/**
 * Augmented Character shape that carries an `equipment` loadout. Returned
 * by every helper in this file.
 */
export type CharacterWithEquipment = Character & {
    equipment: EquipmentLoadout;
};

/**
 * Coerces any Character (with or without `equipment`) into the augmented
 * shape, ensuring an `equipment` object is present on the result.
 *
 * If the input already has an `equipment` field, the original reference
 * is returned to keep helpers reference-stable on no-op paths.
 */
function ensureEquipment(character: Character | CharacterWithEquipment): CharacterWithEquipment {
    if ((character as CharacterWithEquipment).equipment) {
        return character as CharacterWithEquipment;
    }
    return { ...character, equipment: {} };
}

/**
 * Equips an item into its declared slot.
 *
 * Idempotent — if the same item is already in the slot, returns the
 * character unchanged. If a different item is in the slot, that item is
 * implicitly unequipped (callers can read `equipment[slot]` before the
 * call to capture the previous occupant).
 *
 * @param character - The character receiving the gear
 * @param item - The Equipment item to wear
 * @returns The augmented character with the loadout updated
 */
export function equipItem(
    character: Character | CharacterWithEquipment,
    item: Equipment,
): CharacterWithEquipment {
    const c = ensureEquipment(character);
    if (c.equipment[item.slot]?.id === item.id) return c;
    return {
        ...c,
        equipment: { ...c.equipment, [item.slot]: item },
    };
}

/**
 * Removes whatever is in the given slot. Returns the character
 * untouched if the slot is already empty.
 *
 * @param character - The character to update
 * @param slot - The slot to clear
 * @returns The augmented character with the slot cleared
 */
export function unequipItem(
    character: Character | CharacterWithEquipment,
    slot: EquipmentSlot,
): CharacterWithEquipment {
    const c = ensureEquipment(character);
    if (!c.equipment[slot]) return c;
    const next: EquipmentLoadout = { ...c.equipment };
    delete next[slot];
    return { ...c, equipment: next };
}

/**
 * Aggregated read-only summary of every modifier the character's
 * currently-equipped gear contributes.
 *
 * @property statModifiers - Additive stat changes keyed by `EffectStatTarget`
 * @property statMultipliers - Multiplier stat changes (chained product)
 * @property passiveEffects - All effect IDs from equipped passiveEffects arrays
 * @property onHitEffects - Triggers fired when the wearer lands an attack
 * @property onDefendEffects - Triggers fired when the wearer is hit while defending
 */
export interface AggregatedEquipmentModifiers {
    statModifiers: Partial<Record<EffectStatTarget, number>>;
    statMultipliers: Partial<Record<EffectStatTarget, number>>;
    passiveEffects: string[];
    onHitEffects: CombatEffectTrigger[];
    onDefendEffects: CombatEffectTrigger[];
}

/**
 * Aggregates every modifier currently contributed by the character's
 * equipped gear. Pure — does not mutate the input.
 *
 * Multiplier modifiers (`isMultiplier === true`) are chained
 * multiplicatively into `statMultipliers`; additive modifiers are
 * summed into `statModifiers`.
 *
 * @param character - The character whose loadout is read
 * @returns Aggregated equipment modifiers
 */
export function getEquipmentModifiers(
    character: Character | CharacterWithEquipment,
): AggregatedEquipmentModifiers {
    const c = ensureEquipment(character);
    const statModifiers: Partial<Record<EffectStatTarget, number>> = {};
    const statMultipliers: Partial<Record<EffectStatTarget, number>> = {};
    const passiveEffects: string[] = [];
    const onHitEffects: CombatEffectTrigger[] = [];
    const onDefendEffects: CombatEffectTrigger[] = [];

    for (const slot of Object.keys(c.equipment) as EquipmentSlot[]) {
        const item = c.equipment[slot];
        if (!item) continue;
        if (item.statModifiers) {
            for (const sm of item.statModifiers) {
                if (sm.isMultiplier) {
                    const prev = statMultipliers[sm.stat] ?? 1;
                    statMultipliers[sm.stat] = prev * sm.value;
                } else {
                    const prev = statModifiers[sm.stat] ?? 0;
                    statModifiers[sm.stat] = prev + sm.value;
                }
            }
        }
        if (item.passiveEffects) {
            for (const pid of item.passiveEffects) {
                if (lookupEffect(pid)) passiveEffects.push(pid);
            }
        }
        if (item.onHitEffects) onHitEffects.push(...item.onHitEffects);
        if (item.onDefendEffects) onDefendEffects.push(...item.onDefendEffects);
    }

    return {
        statModifiers,
        statMultipliers,
        passiveEffects,
        onHitEffects,
        onDefendEffects,
    };
}
