export {
    type Item, type ItemCategory, type Equipment, type Consumable, type Material, type QuestItem,
    type EquipmentSlot, type BaseItem, type ItemTeir,
    isEquipment, isConsumable, isMaterial, isQuestItem,
} from './types';
export { addItemToInventory, removeItemFromInventory, useConsumable, stackItem } from './item.reducer';
export {
    equipmentLibrary, lookupEquipment, getAllEquipment, getEquipmentBySlot,
} from './equipment.library';
export {
    equipItem, unequipItem, getEquipmentModifiers,
} from './equipment.engine';
export type {
    EquipmentLoadout, CharacterWithEquipment, AggregatedEquipmentModifiers,
} from './equipment.engine';
