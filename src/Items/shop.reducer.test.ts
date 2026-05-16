/**
 * Unit tests — shop reducers (Phase 37).
 *
 * The hermetic e2e at `src/Items/e2e/shop.engine.test.ts` drives the
 * reducers through the `village` MapEvent surface; these tests pin the
 * reducer behaviour in isolation.
 */

import { describe, it, expect } from 'vitest';
import { buyItem, sellItem } from './shop.reducer';
import type { Character } from '../Character/types';
import type { Consumable } from './types';

function freshCharacter(overrides: Partial<Character> = {}): Character {
    return {
        id: 'char-test',
        name: 'Buyer',
        level: 1,
        experience: 0,
        experienceToNextLevel: 100,
        health: 10,
        maxHealth: 10,
        baseStats: { heart: 1, body: 1, mind: 1 },
        derivedStats: {
            physicalAttack: 1, magicAttack: 1,
            physicalDefense: 1, magicDefense: 1,
            saveAttempt: 1, saveDefense: 1,
            resistAttempt: 1, resistDefense: 1,
        },
        nonCombatStats: { courage: 1, lore: 1, perception: 1, charm: 1, willpower: 1, fortitude: 1 },
        inventory: [],
        currency: 0,
        equipment: {},
        effects: [],
        knownSkills: [],
        equippedSkills: [],
        availableStatPoints: 0,
        ...overrides,
    };
}

function potion(id = 'healing-potion'): Consumable {
    return {
        id,
        name: 'Healing Potion',
        description: 'Test',
        category: 'consumable',
        healAmount: 20,
        quantity: 1,
    };
}

describe('buyItem', () => {
    it('decrements currency and appends a cloned item when affordable', () => {
        const player = freshCharacter({ currency: 50 });
        const ware = potion();
        const next = buyItem(player, ware, 20);

        expect(next.currency).toBe(30);
        expect(next.inventory).toHaveLength(1);
        expect(next.inventory[0].id).toBe('healing-potion');
        // deepClone — mutating the inventory entry doesn't bleed back into the ware.
        (next.inventory[0] as Consumable).quantity = 99;
        expect((ware as Consumable).quantity).toBe(1);
        // Input character unchanged.
        expect(player.currency).toBe(50);
        expect(player.inventory).toHaveLength(0);
    });

    it('returns the character unchanged when funds are insufficient', () => {
        const player = freshCharacter({ currency: 10 });
        const next = buyItem(player, potion(), 20);
        expect(next).toBe(player);
    });

    it('returns the character unchanged on a negative price', () => {
        const player = freshCharacter({ currency: 50 });
        const next = buyItem(player, potion(), -5);
        expect(next).toBe(player);
    });
});

describe('sellItem', () => {
    it('increments currency and removes the matching inventory entry', () => {
        const player = freshCharacter({ currency: 5, inventory: [potion()] });
        const next = sellItem(player, 'healing-potion', 10);
        expect(next.currency).toBe(15);
        expect(next.inventory).toHaveLength(0);
        // Input unchanged.
        expect(player.currency).toBe(5);
        expect(player.inventory).toHaveLength(1);
    });

    it('returns the character unchanged when the item is not in inventory', () => {
        const player = freshCharacter({ currency: 5, inventory: [potion()] });
        const next = sellItem(player, 'nonexistent', 10);
        expect(next).toBe(player);
    });

    it('returns the character unchanged on a negative price', () => {
        const player = freshCharacter({ currency: 5, inventory: [potion()] });
        const next = sellItem(player, 'healing-potion', -5);
        expect(next).toBe(player);
    });

    it('only removes one stack entry when duplicates are present', () => {
        const player = freshCharacter({
            currency: 0,
            inventory: [potion(), potion()],
        });
        const next = sellItem(player, 'healing-potion', 7);
        expect(next.inventory).toHaveLength(1);
        expect(next.currency).toBe(7);
    });
});
