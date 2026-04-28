import { describe, it, expect } from 'vitest';
import {
  equipItem, unequipItem, getEquipmentModifiers,
} from './equipment.engine';
import {
  equipmentLibrary, lookupEquipment, getEquipmentBySlot,
} from './equipment.library';
import { createCharacter } from '../Character';

const char = () => createCharacter({
  name: 'Tester', level: 1,
  baseStats: { heart: 5, body: 5, mind: 5 },
});

describe('equipment library', () => {
  it('contains 18 items: 6 weapons, 6 armor, 6 accessories', () => {
    expect(equipmentLibrary).toHaveLength(18);
    expect(getEquipmentBySlot('weapon')).toHaveLength(6);
    expect(getEquipmentBySlot('armor')).toHaveLength(6);
    expect(getEquipmentBySlot('accessory')).toHaveLength(6);
  });

  it('lookupEquipment finds items by ID', () => {
    expect(lookupEquipment('wpn-body-1')?.name).toBe('Iron Mace');
  });
});

describe('equipItem', () => {
  it('places the item into its declared slot', () => {
    const item = lookupEquipment('wpn-body-1')!;
    const equipped = equipItem(char(), item);
    expect(equipped.equipment.weapon?.id).toBe('wpn-body-1');
  });

  it('replaces an existing item in the slot', () => {
    const a = lookupEquipment('wpn-body-1')!;
    const b = lookupEquipment('wpn-body-2')!;
    const after = equipItem(equipItem(char(), a), b);
    expect(after.equipment.weapon?.id).toBe('wpn-body-2');
  });

  it('is idempotent for the same item', () => {
    const a = lookupEquipment('wpn-body-1')!;
    const c1 = equipItem(char(), a);
    const c2 = equipItem(c1, a);
    expect(c2.equipment.weapon?.id).toBe('wpn-body-1');
    expect(c2).toEqual(c1);
  });
});

describe('unequipItem', () => {
  it('clears the slot', () => {
    const a = lookupEquipment('wpn-body-1')!;
    const equipped = equipItem(char(), a);
    const after = unequipItem(equipped, 'weapon');
    expect(after.equipment.weapon).toBeUndefined();
  });

  it('is a no-op when the slot is empty', () => {
    const c = equipItem(char(), lookupEquipment('wpn-body-1')!);
    const after = unequipItem(c, 'armor');
    expect(after.equipment).toEqual(c.equipment);
  });
});

describe('getEquipmentModifiers', () => {
  it('aggregates statModifiers from every slot', () => {
    let c = char();
    c = equipItem(c, lookupEquipment('wpn-body-2')!); // +4 phyAtk, +1 body
    c = equipItem(c, lookupEquipment('arm-body-2')!); // +6 phyDef, +1 body
    const mods = getEquipmentModifiers(c);
    expect(mods.statModifiers.physicalAttack).toBe(4);
    expect(mods.statModifiers.physicalDefense).toBe(6);
    expect(mods.statModifiers.body).toBe(2);
  });

  it('collects passiveEffects across slots', () => {
    let c = char();
    c = equipItem(c, lookupEquipment('arm-body-2')!); // buff_regeneration
    c = equipItem(c, lookupEquipment('acc-heart-2')!); // buff_regeneration
    const mods = getEquipmentModifiers(c);
    expect(mods.passiveEffects.length).toBe(2);
  });

  it('aggregates onHitEffects and onDefendEffects', () => {
    let c = char();
    c = equipItem(c, lookupEquipment('wpn-body-2')!); // onHit: bleed
    c = equipItem(c, lookupEquipment('acc-body-2')!); // onDefend: tier1_body_defend
    const mods = getEquipmentModifiers(c);
    expect(mods.onHitEffects.some(t => t.effectId === 'debuff_bleed')).toBe(true);
    expect(mods.onDefendEffects.some(t => t.effectId === 'tier1_body_defend')).toBe(true);
  });
});
