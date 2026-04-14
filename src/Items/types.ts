export type ItemCategory = 'equipment' | 'consumable' | 'material' | 'quest-item';

export interface BaseItem {
    id: string;
    name: string;
    description: string;
    category: ItemCategory;
}

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory' | 'head' | 'body' | 'hands' | 'feet';

export interface Equipment extends BaseItem {
    category: 'equipment';
    slot: EquipmentSlot;
}

export interface Consumable extends BaseItem {
    category: 'consumable';
    effect: string;
    quantity: number;
}

export interface Material extends BaseItem {
    category: 'material';
    quantity: number;
}

export interface QuestItem extends BaseItem {
    category: 'quest-item';
    questId: string;
}

export type Item = Equipment | Consumable | Material | QuestItem;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isEquipment(item: Item): item is Equipment {
    return item.category === 'equipment';
}

export function isConsumable(item: Item): item is Consumable {
    return item.category === 'consumable';
}

export function isMaterial(item: Item): item is Material {
    return item.category === 'material';
}

export function isQuestItem(item: Item): item is QuestItem {
    return item.category === 'quest-item';
}
