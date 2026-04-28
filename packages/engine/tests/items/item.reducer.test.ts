import { describe, it, expect } from 'vitest';
import { addItemToInventory, removeItemFromInventory, useConsumable, stackItem } from '../../src/items/item.reducer';
import { createNewGameState } from '../../src/game/game.reducer';
import { Consumable, Item } from '../../src/items/types';

const state = () => createNewGameState();

const potion: Consumable = { id: 'hp1', name: 'Potion', description: '', category: 'consumable', effect: 'heal', quantity: 3 };

describe('addItemToInventory', () => {
  it('adds item', () => {
    const s = addItemToInventory(state(), potion);
    expect(s.player.inventory).toHaveLength(1);
    expect(s.player.inventory[0].id).toBe('hp1');
  });
});

describe('removeItemFromInventory', () => {
  it('removes by id', () => {
    const s = addItemToInventory(state(), potion);
    const s2 = removeItemFromInventory(s, 'hp1');
    expect(s2.player.inventory).toHaveLength(0);
  });
});

describe('useConsumable', () => {
  it('decrements quantity', () => {
    const s = addItemToInventory(state(), potion);
    const s2 = useConsumable(s, 'hp1');
    expect((s2.player.inventory[0] as Consumable).quantity).toBe(2);
  });
  it('removes when last one', () => {
    const s = addItemToInventory(state(), { ...potion, quantity: 1 });
    const s2 = useConsumable(s, 'hp1');
    expect(s2.player.inventory).toHaveLength(0);
  });
  it('no-op for non-consumable', () => {
    const s = state();
    expect(useConsumable(s, 'nonexistent')).toBe(s);
  });
});

describe('stackItem', () => {
  it('increases quantity', () => {
    const s = addItemToInventory(state(), potion);
    const s2 = stackItem(s, 'hp1', 5);
    expect((s2.player.inventory[0] as Consumable).quantity).toBe(8);
  });
});
