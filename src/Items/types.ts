/**
 * Item System Types
 * Discriminated union of all item types with type guards.
 */

import type { StatModifier } from '../Effects/types';
import type { CombatEffectTrigger } from '../Combat/types';

/** Item categories */
export type ItemCategory = 'equipment' | 'consumable' | 'material' | 'quest-item';

/** Tier classification mirroring effects/skills. */
export type ItemTeir = 'Teir 1' | 'Teir 2' | 'Teir 3';

/**
 * Base properties shared by all items
 * @property id - Unique identifier for this item
 * @property name - Display name of the item
 * @property description - Flavor text or lore description
 * @property category - Discriminator for the item union type
 */
export interface BaseItem {
    id: string;
    name: string;
    description: string;
    category: ItemCategory;
}

/** Equipment slots available on a character */
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory' | 'head' | 'body' | 'hands' | 'feet';

/**
 * Equipment item that can be equipped by the player.
 *
 * @property category - Always 'equipment'
 * @property slot - The equipment slot this item occupies
 * @property statModifiers - Static stat changes applied while equipped
 * @property passiveEffects - Effect IDs applied on equip and removed on
 *   unequip (e.g. permanent regen rings, reflect cloaks)
 * @property onHitEffects - Triggers fired when the wearer lands an attack
 * @property onDefendEffects - Triggers fired when the wearer is hit
 *   while defending
 * @property teir - Tier classification driving rarity / scaling
 */
export interface Equipment extends BaseItem {
    category: 'equipment';
    slot: EquipmentSlot;
    statModifiers?: StatModifier[];
    passiveEffects?: string[];
    onHitEffects?: CombatEffectTrigger[];
    onDefendEffects?: CombatEffectTrigger[];
    teir?: ItemTeir;
}

/**
 * Consumable item that can be used once (quantity decrements).
 *
 * @property category - Always 'consumable'
 * @property effect - Human-readable effect description (legacy field)
 * @property quantity - Number of this item in the stack
 * @property effectId - Effect ID from the buffs/debuffs library applied on use
 * @property heal - Optional flat HP restored on use
 * @property restoreMana - Optional flat MP restored on use
 * @property duration - Optional override for the applied effect's duration
 * @property power - Optional override for intensity (defaults to 1)
 */
export interface Consumable extends BaseItem {
    category: 'consumable';
    effect: string;
    quantity: number;
    effectId?: string;
    heal?: number;
    restoreMana?: number;
    duration?: number;
    power?: number;
}

/**
 * Material item used for crafting
 * @property category - Always 'material'
 * @property quantity - Number of this material in the stack
 */
export interface Material extends BaseItem {
    category: 'material';
    quantity: number;
}

/**
 * Quest item that is used in quests
 * @property category - Always 'quest-item'
 * @property questId - The quest this item is associated with
 */
export interface QuestItem extends BaseItem {
    category: 'quest-item';
    questId: string;
}

/** Discriminated union of all item types */
export type Item = Equipment | Consumable | Material | QuestItem;

// ============================================================================
// ITEM TYPE GUARDS
// ============================================================================

/** Type guard to check if an item is Equipment */
export function isEquipment(item: Item): item is Equipment {
    return item.category === 'equipment';
}

/** Type guard to check if an item is Consumable */
export function isConsumable(item: Item): item is Consumable {
    return item.category === 'consumable';
}

/** Type guard to check if an item is Material */
export function isMaterial(item: Item): item is Material {
    return item.category === 'material';
}

/** Type guard to check if an item is a Quest Item */
export function isQuestItem(item: Item): item is QuestItem {
    return item.category === 'quest-item';
}
