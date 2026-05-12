export {
    type Item, type ItemCategory, type Equipment, type Consumable, type Material, type QuestItem,
    type EquipmentSlot, type BaseItem,
    type EquipmentProcTrigger, type ResourceInteraction, type ResourceGenerationBonus,
    type ItemRarity, type RolledModifier, type EquipmentTemplate, type UniqueItemTemplate,
    isEquipment, isConsumable, isMaterial, isQuestItem,
} from './types';
export {
    type HiddenModRarity, type ModValueTier, type ModifierPayload, type Modifier,
    HIDDEN_MOD_RARITY_WEIGHTS,
} from './modifier.types';
export {
    addItem, removeItem, useConsumable, stackItem,
    addItemToInventory, removeItemFromInventory,
} from './item.reducer';
export {
    aggregateCombatStartTokens, applyEquipmentGenerationBonus,
    getEquipmentProcTriggers, useConsumableEffect,
} from './equipment.engine';
export type { ConsumableUseResult } from './equipment.engine';
export {
    equipmentTemplates, getEquipmentTemplate, getTemplatesBySlot,
} from './equipment.templates';
export {
    uniqueTemplates, getUniqueTemplate,
} from './unique.templates';
export {
    weaponModPool, headModPool, bodyModPool, handsModPool, feetModPool,
    accessoryModPool, armorModPool, uniqueModPool,
    MOD_POOLS, getModifierById, pickValueTier, allModifiers,
} from './modifier.catalogue';
export {
    dropItem, rollModifiers, resolveModifiers, rarityWeightTable,
} from './item.factory';
export { consumableLibrary, getConsumableById } from './consumable.library';
