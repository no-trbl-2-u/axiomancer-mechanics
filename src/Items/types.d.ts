/**
 * Items module type definitions
 * 
 * This module contains types for items including equipment, consumables,
 * materials, and quest items using discriminated unions for type safety.
 */

/**
 * Item categories
 */
export type ItemCategory = 'equipment' | 'consumable' | 'material' | 'quest-item';

/**
 * Base properties shared by all items
 */
export interface BaseItem {
    id: string;
    name: string;
    description: string;
    category: ItemCategory;
}

/**
 * Equipment slots
 */
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory' | 'head' | 'body' | 'hands' | 'feet';

/**
 * Equipment item that can be equipped by the player
 */
export interface Equipment extends BaseItem {
    category: 'equipment';
    slot: EquipmentSlot;
    // TODO: Add stat modifiers
    // statModifiers?: Partial<DerivedStats>;
}

/**
 * Consumable item that can be used once
 */
export interface Consumable extends BaseItem {
    category: 'consumable';
    effect: string;
    quantity: number;
    // TODO: Add effect types
}

/**
 * Material item used for crafting
 */
export interface Material extends BaseItem {
    category: 'material';
    quantity: number;
    // TODO: Add crafting recipes
}

/**
 * Quest item that is used in quests
 */
export interface QuestItem extends BaseItem {
    category: 'quest-item';
    questId: string;
}

/**
 * Discriminated union of all item types
 */
export type Item = Equipment | Consumable | Material | QuestItem;

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

// TODO: Add items to EquipmentLibrary and then Enumerate
// TODO: Add items to ConsumableLibrary and then Enumerate
// TODO: Add items to MaterialLibrary and then Enumerate
// TODO: Add items to QuestItemLibrary and then Enumerate