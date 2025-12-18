import { describe, it, expect } from 'vitest';
import {
    addItemToInventory,
    removeItemFromInventory,
    useConsumable,
    stackItem,
} from './item.reducer';
import {
    isEquipment,
    isConsumable,
    isMaterial,
    isQuestItem,
} from './index';
import { createNewGameState } from '../Game/game.reducer';
import type {
    Item,
    Equipment,
    Consumable,
    Material,
    QuestItem,
} from './types';

// ============================================================================
// TEST DATA
// ============================================================================

const mockEquipment: Equipment = {
    id: 'sword-001',
    name: 'Iron Sword',
    description: 'A basic iron sword',
    category: 'equipment',
    slot: 'weapon',
};

const mockConsumable: Consumable = {
    id: 'potion-001',
    name: 'Health Potion',
    description: 'Restores 50 HP',
    category: 'consumable',
    effect: 'heal',
    quantity: 3,
};

const mockMaterial: Material = {
    id: 'iron-ore-001',
    name: 'Iron Ore',
    description: 'Raw iron ore for crafting',
    category: 'material',
    quantity: 10,
};

const mockQuestItem: QuestItem = {
    id: 'ancient-key-001',
    name: 'Ancient Key',
    description: 'A mysterious key from ancient times',
    category: 'quest-item',
    questId: 'find-ancient-key',
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

describe('isEquipment', () => {
    it('should return true for equipment items', () => {
        expect(isEquipment(mockEquipment)).toBe(true);
    });

    it('should return false for consumable items', () => {
        expect(isEquipment(mockConsumable)).toBe(false);
    });

    it('should return false for material items', () => {
        expect(isEquipment(mockMaterial)).toBe(false);
    });

    it('should return false for quest items', () => {
        expect(isEquipment(mockQuestItem)).toBe(false);
    });
});

describe('isConsumable', () => {
    it('should return true for consumable items', () => {
        expect(isConsumable(mockConsumable)).toBe(true);
    });

    it('should return false for equipment items', () => {
        expect(isConsumable(mockEquipment)).toBe(false);
    });

    it('should return false for material items', () => {
        expect(isConsumable(mockMaterial)).toBe(false);
    });

    it('should return false for quest items', () => {
        expect(isConsumable(mockQuestItem)).toBe(false);
    });
});

describe('isMaterial', () => {
    it('should return true for material items', () => {
        expect(isMaterial(mockMaterial)).toBe(true);
    });

    it('should return false for equipment items', () => {
        expect(isMaterial(mockEquipment)).toBe(false);
    });

    it('should return false for consumable items', () => {
        expect(isMaterial(mockConsumable)).toBe(false);
    });

    it('should return false for quest items', () => {
        expect(isMaterial(mockQuestItem)).toBe(false);
    });
});

describe('isQuestItem', () => {
    it('should return true for quest items', () => {
        expect(isQuestItem(mockQuestItem)).toBe(true);
    });

    it('should return false for equipment items', () => {
        expect(isQuestItem(mockEquipment)).toBe(false);
    });

    it('should return false for consumable items', () => {
        expect(isQuestItem(mockConsumable)).toBe(false);
    });

    it('should return false for material items', () => {
        expect(isQuestItem(mockMaterial)).toBe(false);
    });
});

// ============================================================================
// INVENTORY MANAGEMENT (item.reducer.ts)
// ============================================================================

describe('addItemToInventory', () => {
    it('should add an item to an empty inventory', () => {
        const state = createNewGameState();
        const newState = addItemToInventory(state, mockEquipment);
        expect(newState.player.inventory).toHaveLength(1);
        expect(newState.player.inventory[0]).toEqual(mockEquipment);
    });

    it('should add an item to an existing inventory', () => {
        let state = createNewGameState();
        state = addItemToInventory(state, mockEquipment);
        state = addItemToInventory(state, mockConsumable);
        expect(state.player.inventory).toHaveLength(2);
    });

    it('should return a new state object (immutable)', () => {
        const state = createNewGameState();
        const newState = addItemToInventory(state, mockEquipment);
        expect(newState).not.toBe(state);
        expect(newState.player).not.toBe(state.player);
        expect(newState.player.inventory).not.toBe(state.player.inventory);
    });

    it('should preserve other player properties', () => {
        const state = createNewGameState();
        const newState = addItemToInventory(state, mockEquipment);
        expect(newState.player.name).toBe(state.player.name);
        expect(newState.player.level).toBe(state.player.level);
        expect(newState.player.health).toBe(state.player.health);
    });
});

describe('removeItemFromInventory', () => {
    it('should remove an item by ID from inventory', () => {
        let state = createNewGameState();
        state = addItemToInventory(state, mockEquipment);
        state = addItemToInventory(state, mockConsumable);
        
        const newState = removeItemFromInventory(state, mockEquipment.id);
        expect(newState.player.inventory).toHaveLength(1);
        expect(newState.player.inventory[0].id).toBe(mockConsumable.id);
    });

    it('should handle removing non-existent item gracefully', () => {
        const state = createNewGameState();
        const newState = removeItemFromInventory(state, 'non-existent-id');
        expect(newState.player.inventory).toHaveLength(0);
    });

    it('should return a new state object (immutable)', () => {
        let state = createNewGameState();
        state = addItemToInventory(state, mockEquipment);
        const newState = removeItemFromInventory(state, mockEquipment.id);
        expect(newState).not.toBe(state);
    });
});

describe('useConsumable', () => {
    it('should reduce quantity when consumable has multiple', () => {
        let state = createNewGameState();
        const consumableWithQuantity = { ...mockConsumable, quantity: 3 };
        state = addItemToInventory(state, consumableWithQuantity);
        
        const newState = useConsumable(state, consumableWithQuantity.id);
        const item = newState.player.inventory.find(i => i.id === consumableWithQuantity.id);
        expect(item).toBeDefined();
        expect((item as Consumable).quantity).toBe(2);
    });

    it('should remove item when quantity reaches 0', () => {
        let state = createNewGameState();
        const lastConsumable = { ...mockConsumable, quantity: 1 };
        state = addItemToInventory(state, lastConsumable);
        
        const newState = useConsumable(state, lastConsumable.id);
        expect(newState.player.inventory).toHaveLength(0);
    });

    it('should do nothing if item is not found', () => {
        const state = createNewGameState();
        const newState = useConsumable(state, 'non-existent-id');
        expect(newState).toBe(state);
    });

    it('should do nothing if item is not a consumable', () => {
        let state = createNewGameState();
        state = addItemToInventory(state, mockEquipment);
        const newState = useConsumable(state, mockEquipment.id);
        expect(newState).toBe(state);
    });
});

describe('stackItem', () => {
    it('should increase quantity of consumable items', () => {
        let state = createNewGameState();
        state = addItemToInventory(state, mockConsumable);
        
        const newState = stackItem(state, mockConsumable.id, 5);
        const item = newState.player.inventory.find(i => i.id === mockConsumable.id);
        expect((item as Consumable).quantity).toBe(8); // 3 + 5
    });

    it('should increase quantity of material items', () => {
        let state = createNewGameState();
        state = addItemToInventory(state, mockMaterial);
        
        const newState = stackItem(state, mockMaterial.id, 5);
        const item = newState.player.inventory.find(i => i.id === mockMaterial.id);
        expect((item as Material).quantity).toBe(15); // 10 + 5
    });

    it('should not modify equipment items', () => {
        let state = createNewGameState();
        state = addItemToInventory(state, mockEquipment);
        
        const newState = stackItem(state, mockEquipment.id, 5);
        const item = newState.player.inventory.find(i => i.id === mockEquipment.id);
        expect(item).toEqual(mockEquipment);
    });

    it('should not modify quest items', () => {
        let state = createNewGameState();
        state = addItemToInventory(state, mockQuestItem);
        
        const newState = stackItem(state, mockQuestItem.id, 5);
        const item = newState.player.inventory.find(i => i.id === mockQuestItem.id);
        expect(item).toEqual(mockQuestItem);
    });

    it('should return a new state object (immutable)', () => {
        let state = createNewGameState();
        state = addItemToInventory(state, mockConsumable);
        const newState = stackItem(state, mockConsumable.id, 1);
        expect(newState).not.toBe(state);
    });
});

// ============================================================================
// ITEM TYPE STRUCTURE TESTS
// ============================================================================

describe('Item Types', () => {
    it('should have required properties for Equipment', () => {
        const equipment: Equipment = {
            id: 'test-equipment',
            name: 'Test Equipment',
            description: 'Test description',
            category: 'equipment',
            slot: 'weapon',
        };
        expect(equipment.slot).toBeDefined();
        expect(['weapon', 'armor', 'accessory', 'head', 'body', 'hands', 'feet']).toContain(equipment.slot);
    });

    it('should have required properties for Consumable', () => {
        const consumable: Consumable = {
            id: 'test-consumable',
            name: 'Test Consumable',
            description: 'Test description',
            category: 'consumable',
            effect: 'heal',
            quantity: 1,
        };
        expect(consumable.effect).toBeDefined();
        expect(consumable.quantity).toBeGreaterThanOrEqual(1);
    });

    it('should have required properties for Material', () => {
        const material: Material = {
            id: 'test-material',
            name: 'Test Material',
            description: 'Test description',
            category: 'material',
            quantity: 1,
        };
        expect(material.quantity).toBeGreaterThanOrEqual(1);
    });

    it('should have required properties for QuestItem', () => {
        const questItem: QuestItem = {
            id: 'test-quest-item',
            name: 'Test Quest Item',
            description: 'Test description',
            category: 'quest-item',
            questId: 'test-quest',
        };
        expect(questItem.questId).toBeDefined();
    });
});
