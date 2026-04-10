import { DerivedStats } from '../Character/types';

// ============================================================================
// CONSUMABLE EFFECT TYPE
// ============================================================================

/**
 * Discriminated effect types for consumable items.
 * Each consumable carries exactly one of these to describe what happens on use.
 */
export type ConsumableEffect =
    | 'heal'
    | 'heal-large'
    | 'heal-full'
    | 'restore-mana'
    | 'restore-mana-large'
    | 'restore-mana-full'
    | 'restore-all'
    | 'buff-body'
    | 'buff-mind'
    | 'buff-heart'
    | 'buff-all-stats'
    | 'buff-defense'
    | 'buff-attack'
    | 'cure-debuff'
    | 'damage-bomb'
    | 'damage-poison'
    | 'damage-fire'
    | 'revive';

// ============================================================================
// ITEM CATEGORY
// ============================================================================

/**
 * Item categories
 */
export type ItemCategory = 'equipment' | 'consumable' | 'material' | 'quest-item';

// ============================================================================
// BASE ITEM
// ============================================================================

/**
 * Base properties shared by all items
 * @property id - Unique identifier for this item
 * @property name - Display name of the item
 * @property description - Flavor text or lore description
 * @property category - Discriminator for the item union
 */
export interface BaseItem {
    id: string;
    name: string;
    description: string;
    category: ItemCategory;
}

// ============================================================================
// EQUIPMENT
// ============================================================================

/**
 * Equipment slots available on a character
 */
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory' | 'head' | 'body' | 'hands' | 'feet';

/**
 * Equipment item that can be equipped by the player.
 * Modifies derived stats while worn.
 * @property slot - Which equipment slot this occupies
 * @property statModifiers - Partial derived stat bonuses applied while equipped
 */
export interface Equipment extends BaseItem {
    category: 'equipment';
    slot: EquipmentSlot;
    statModifiers: Partial<DerivedStats>;
}

// ============================================================================
// CONSUMABLE
// ============================================================================

/**
 * Consumable item that can be used from inventory.
 * Quantity decrements on use; removed at zero.
 * @property effect - The type of effect applied on use
 * @property potency - Numeric strength of the effect (HP healed, damage dealt, stat bonus, etc.)
 * @property duration - How many combat rounds a buff/debuff lasts (0 for instant effects)
 * @property quantity - Current stack count in inventory
 */
export interface Consumable extends BaseItem {
    category: 'consumable';
    effect: ConsumableEffect;
    potency: number;
    duration: number;
    quantity: number;
}

// ============================================================================
// MATERIAL
// ============================================================================

/**
 * Material item used for crafting (future system)
 * @property quantity - Current stack count in inventory
 */
export interface Material extends BaseItem {
    category: 'material';
    quantity: number;
}

// ============================================================================
// QUEST ITEM
// ============================================================================

/**
 * Quest item tied to a specific quest. Cannot be sold or discarded.
 * @property questId - The quest this item is associated with
 */
export interface QuestItem extends BaseItem {
    category: 'quest-item';
    questId: string;
}

// ============================================================================
// ITEM UNION
// ============================================================================

/**
 * Discriminated union of all item types
 */
export type Item = Equipment | Consumable | Material | QuestItem;

// ============================================================================
// EQUIPPED ITEMS MAP
// ============================================================================

/**
 * Tracks which equipment a character currently has worn.
 * Each slot holds at most one Equipment item (or undefined if empty).
 */
export type EquippedItems = Partial<Record<EquipmentSlot, Equipment>>;

// ============================================================================
// ITEM TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if an item is Equipment
 */
export function isEquipment(item: Item): item is Equipment {
    return item.category === 'equipment';
}

/**
 * Type guard to check if an item is Consumable
 */
export function isConsumable(item: Item): item is Consumable {
    return item.category === 'consumable';
}

/**
 * Type guard to check if an item is Material
 */
export function isMaterial(item: Item): item is Material {
    return item.category === 'material';
}

/**
 * Type guard to check if an item is a Quest Item
 */
export function isQuestItem(item: Item): item is QuestItem {
    return item.category === 'quest-item';
}

/**
 * Type guard to check if an item is stackable (has a quantity field)
 */
export function isStackable(item: Item): item is Consumable | Material {
    return item.category === 'consumable' || item.category === 'material';
}
