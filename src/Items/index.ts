// ============================================================================
// ITEM UTILITIES
// ============================================================================

export {
    isEquipment,
    isConsumable,
    isMaterial,
    isQuestItem,
    isStackable,
} from './types';

export type {
    Item,
    Equipment,
    Consumable,
    Material,
    QuestItem,
    EquipmentSlot,
    EquippedItems,
    ConsumableEffect,
    ItemCategory,
    BaseItem,
} from './types';

export {
    lookupConsumable,
    lookupEquipment,
    getConsumablesByEffect,
    getAllConsumables,
    getAllEquipment,
    getEquipmentBySlot,
} from './item.library';

export {
    addItemToInventory,
    removeItemFromInventory,
    useConsumable,
    stackItem,
    equipItem,
    unequipItem,
    getEquipmentStatBonuses,
    findInventoryItem,
    getInventoryByCategory,
    mergeStackableItem,
} from './item.reducer';
