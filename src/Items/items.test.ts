/**
 * Items Module Tests
 * Tests for item type guards and item reducer functions
 */

import {
    isEquipment,
    isConsumable,
    isMaterial,
    isQuestItem,
    Item,
    Equipment,
    Consumable,
    Material,
    QuestItem,
} from './types';
import {
    addItemToInventory,
    removeItemFromInventory,
    useConsumable,
    stackItem,
} from './item.reducer';
import { GameState } from '../Game/types';
import { createCharacter } from '../Character/index';
import { createStartingWorld } from '../World/index';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockEquipment(): Equipment {
    return {
        id: 'equip-01',
        name: 'Iron Sword',
        description: 'A basic iron sword',
        category: 'equipment',
        slot: 'weapon',
    };
}

function createMockConsumable(quantity: number = 3): Consumable {
    return {
        id: 'consume-01',
        name: 'Healing Potion',
        description: 'Restores 10 HP',
        category: 'consumable',
        effect: 'heal',
        quantity,
    };
}

function createMockMaterial(quantity: number = 5): Material {
    return {
        id: 'material-01',
        name: 'Iron Ore',
        description: 'Used for smithing',
        category: 'material',
        quantity,
    };
}

function createMockQuestItem(): QuestItem {
    return {
        id: 'quest-item-01',
        name: 'Ancient Key',
        description: 'Unlocks the forbidden door',
        category: 'quest-item',
        questId: 'starting-quest',
    };
}

function createMockGameState(inventory: Item[] = []): GameState {
    const player = createCharacter({
        name: 'Test Hero',
        level: 1,
        baseStats: { heart: 2, body: 3, mind: 1 },
    });

    return {
        player: { ...player, inventory },
        world: createStartingWorld(),
        combatState: null,
    };
}

// ============================================================================
// ITEM TYPE GUARDS
// ============================================================================

describe('isEquipment', () => {
    it('should return true for equipment items', () => {
        const item: Item = createMockEquipment();
        const result: boolean = isEquipment(item);
        expect(result).toBe(true);
    });

    it('should return false for consumable items', () => {
        const item: Item = createMockConsumable();
        const result: boolean = isEquipment(item);
        expect(result).toBe(false);
    });

    it('should return false for material items', () => {
        const item: Item = createMockMaterial();
        const result: boolean = isEquipment(item);
        expect(result).toBe(false);
    });

    it('should return false for quest items', () => {
        const item: Item = createMockQuestItem();
        const result: boolean = isEquipment(item);
        expect(result).toBe(false);
    });
});

describe('isConsumable', () => {
    it('should return true for consumable items', () => {
        const item: Item = createMockConsumable();
        const result: boolean = isConsumable(item);
        expect(result).toBe(true);
    });

    it('should return false for equipment items', () => {
        const item: Item = createMockEquipment();
        const result: boolean = isConsumable(item);
        expect(result).toBe(false);
    });
});

describe('isMaterial', () => {
    it('should return true for material items', () => {
        const item: Item = createMockMaterial();
        const result: boolean = isMaterial(item);
        expect(result).toBe(true);
    });

    it('should return false for equipment items', () => {
        const item: Item = createMockEquipment();
        const result: boolean = isMaterial(item);
        expect(result).toBe(false);
    });
});

describe('isQuestItem', () => {
    it('should return true for quest items', () => {
        const item: Item = createMockQuestItem();
        const result: boolean = isQuestItem(item);
        expect(result).toBe(true);
    });

    it('should return false for consumable items', () => {
        const item: Item = createMockConsumable();
        const result: boolean = isQuestItem(item);
        expect(result).toBe(false);
    });
});

// ============================================================================
// ITEM REDUCER: addItemToInventory
// ============================================================================

describe('addItemToInventory', () => {
    it('should add an item to an empty inventory', () => {
        const state: GameState = createMockGameState();
        const item: Item = createMockEquipment();
        const updated: GameState = addItemToInventory(state, item);
        expect(updated.player.inventory).toHaveLength(1);
        expect(updated.player.inventory[0]).toEqual(item);
    });

    it('should add an item to an existing inventory', () => {
        const existingItem: Item = createMockEquipment();
        const state: GameState = createMockGameState([existingItem]);
        const newItem: Item = createMockConsumable();
        const updated: GameState = addItemToInventory(state, newItem);
        expect(updated.player.inventory).toHaveLength(2);
    });

    it('should not mutate the original state', () => {
        const state: GameState = createMockGameState();
        const item: Item = createMockEquipment();
        addItemToInventory(state, item);
        expect(state.player.inventory).toHaveLength(0);
    });

    it('should preserve other game state properties', () => {
        const state: GameState = createMockGameState();
        const item: Item = createMockEquipment();
        const updated: GameState = addItemToInventory(state, item);
        expect(updated.player.name).toBe(state.player.name);
        expect(updated.world).toBe(state.world);
        expect(updated.combatState).toBe(state.combatState);
    });
});

// ============================================================================
// ITEM REDUCER: removeItemFromInventory
// ============================================================================

describe('removeItemFromInventory', () => {
    it('should remove an item by ID', () => {
        const item: Item = createMockEquipment();
        const state: GameState = createMockGameState([item]);
        const updated: GameState = removeItemFromInventory(state, item.id);
        expect(updated.player.inventory).toHaveLength(0);
    });

    it('should only remove the item with matching ID', () => {
        const item1: Item = createMockEquipment();
        const item2: Item = createMockConsumable();
        const state: GameState = createMockGameState([item1, item2]);
        const updated: GameState = removeItemFromInventory(state, item1.id);
        expect(updated.player.inventory).toHaveLength(1);
        expect(updated.player.inventory[0].id).toBe(item2.id);
    });

    it('should return unchanged state if item ID not found', () => {
        const item: Item = createMockEquipment();
        const state: GameState = createMockGameState([item]);
        const updated: GameState = removeItemFromInventory(state, 'nonexistent-id');
        expect(updated.player.inventory).toHaveLength(1);
    });

    it('should not mutate the original state', () => {
        const item: Item = createMockEquipment();
        const state: GameState = createMockGameState([item]);
        removeItemFromInventory(state, item.id);
        expect(state.player.inventory).toHaveLength(1);
    });
});

// ============================================================================
// ITEM REDUCER: useConsumable
// ============================================================================

describe('useConsumable', () => {
    it('should reduce quantity by 1 when quantity > 1', () => {
        const consumable: Consumable = createMockConsumable(3);
        const state: GameState = createMockGameState([consumable]);
        const updated: GameState = useConsumable(state, consumable.id);
        const updatedItem = updated.player.inventory[0] as Consumable;
        expect(updatedItem.quantity).toBe(2);
    });

    it('should remove the item when quantity is 1', () => {
        const consumable: Consumable = createMockConsumable(1);
        const state: GameState = createMockGameState([consumable]);
        const updated: GameState = useConsumable(state, consumable.id);
        expect(updated.player.inventory).toHaveLength(0);
    });

    it('should return unchanged state for non-consumable items', () => {
        const equipment: Equipment = createMockEquipment();
        const state: GameState = createMockGameState([equipment]);
        const updated: GameState = useConsumable(state, equipment.id);
        expect(updated.player.inventory).toHaveLength(1);
    });

    it('should return unchanged state for non-existent item', () => {
        const state: GameState = createMockGameState();
        const updated: GameState = useConsumable(state, 'nonexistent');
        expect(updated).toBe(state);
    });

    it('should not mutate the original state', () => {
        const consumable: Consumable = createMockConsumable(3);
        const state: GameState = createMockGameState([consumable]);
        useConsumable(state, consumable.id);
        const originalItem = state.player.inventory[0] as Consumable;
        expect(originalItem.quantity).toBe(3);
    });
});

// ============================================================================
// ITEM REDUCER: stackItem
// ============================================================================

describe('stackItem', () => {
    it('should increase consumable quantity', () => {
        const consumable: Consumable = createMockConsumable(2);
        const state: GameState = createMockGameState([consumable]);
        const updated: GameState = stackItem(state, consumable.id, 3);
        const updatedItem = updated.player.inventory[0] as Consumable;
        expect(updatedItem.quantity).toBe(5);
    });

    it('should increase material quantity', () => {
        const material: Material = createMockMaterial(5);
        const state: GameState = createMockGameState([material]);
        const updated: GameState = stackItem(state, material.id, 10);
        const updatedItem = updated.player.inventory[0] as Material;
        expect(updatedItem.quantity).toBe(15);
    });

    it('should not stack equipment items', () => {
        const equipment: Equipment = createMockEquipment();
        const state: GameState = createMockGameState([equipment]);
        const updated: GameState = stackItem(state, equipment.id, 5);
        expect(updated.player.inventory[0]).toEqual(equipment);
    });

    it('should not stack quest items', () => {
        const questItem: QuestItem = createMockQuestItem();
        const state: GameState = createMockGameState([questItem]);
        const updated: GameState = stackItem(state, questItem.id, 5);
        expect(updated.player.inventory[0]).toEqual(questItem);
    });

    it('should not mutate the original state', () => {
        const consumable: Consumable = createMockConsumable(2);
        const state: GameState = createMockGameState([consumable]);
        stackItem(state, consumable.id, 3);
        const originalItem = state.player.inventory[0] as Consumable;
        expect(originalItem.quantity).toBe(2);
    });
});
