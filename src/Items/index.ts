// ============================================================================
// ITEM UTILITIES
// ============================================================================

// NOTE: Any functions related to items that do not involve updating any state

// Re-export types
export type {
    ItemCategory,
    BaseItem,
    EquipmentSlot,
    Equipment,
    Consumable,
    Material,
    QuestItem,
    Item,
} from './types';

// ============================================================================
// ITEM TYPE GUARDS
// ============================================================================

import type { Item, Equipment, Consumable, Material, QuestItem } from './types';

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