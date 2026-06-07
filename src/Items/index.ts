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
    previewTemplateAtRarity, previewTemplateAtAllRarities,
    dropItemWithAffixes,
} from './item.factory';
export type { DropWithAffixesOptions } from './item.factory';
export {
    prefixes, suffixes, allAffixes, getAffixById,
    composeItemName, affixesForSlot, AFFIX_RARITY_WEIGHTS,
} from './affix.library';
export type { Affix, AffixRole } from './modifier.types';
export { consumableLibrary, getConsumableById } from './consumable.library';
export { buyItem, sellItem, defaultSellPrice } from './shop.reducer';
export type { SetBonus, ItemSet } from './set.types';
export {
    getActiveSetBonuses,
    getActiveSetBonusesForCharacter,
    aggregateSetStartTokens,
    applySetGenerationBonus,
    getActiveSetPassiveEffectIds,
    getEquippedItemSets,
} from './set.engine';
export { itemSetLibrary, getItemSetById } from './set.library';
export type { ShopWare, ShopInventory } from './shop.types';
