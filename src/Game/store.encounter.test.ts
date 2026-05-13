/**
 * Spec 07 — Store integration for encounter rewards.
 *
 * Verifies the Encounter ↔ store contract:
 *   - startCombat accepts Enemy | Encounter (back-compat).
 *   - endCombat grants XP + loot only on victory.
 *   - Loot drops merge into existing inventory stacks.
 *   - Defeat / flee outcomes don't leak loot.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createGameStore } from './store';
import { nullAdapter } from './persistence/null.adapter';
import { Player } from '../Character/characters.mock';
import { TidepoolCrab, CoastalTyrant } from '../Enemy/enemy.library';
import { Encounter } from '../World/types';
import { Item } from '../Items/types';

afterEach(() => vi.restoreAllMocks());

describe('store.startCombat — accepts Enemy or Encounter', () => {
    it('back-compat: bare Enemy initialises a combat snapshot', () => {
        const store = createGameStore(nullAdapter, { player: Player });
        store.getState().startCombat(TidepoolCrab);
        const combat = store.getState().combat!;
        expect(combat.enemy.id).toBe(TidepoolCrab.id);
        expect(combat.player.name).toBe(Player.name);
    });

    it('Encounter: consumes the first enemy of the list', () => {
        const enc: Encounter = { enemies: [CoastalTyrant], origin: 'test:fv-1' };
        const store = createGameStore(nullAdapter, { player: Player });
        store.getState().startCombat(enc);
        expect(store.getState().combat!.enemy.id).toBe(CoastalTyrant.id);
    });

    it('throws for an empty encounter', () => {
        const store = createGameStore(nullAdapter, { player: Player });
        expect(() => store.getState().startCombat({ enemies: [] })).toThrow(/no enemies/);
    });
});

describe('store.endCombat — grants XP + loot on victory', () => {
    it('victory grants xpReward and adds rolled loot to inventory', () => {
        // Fix the RNG so the loot table always lands on a non-null bucket.
        // TidepoolCrab's table: [none(80), drop(minor-healing-potion, 20)].
        // A roll of 0.99 lands at the right edge → second (item) bucket.
        vi.spyOn(Math, 'random').mockReturnValue(0.99);

        const store = createGameStore(nullAdapter, { player: Player });
        store.getState().startCombat(TidepoolCrab);

        // Simulate a kill: zero the enemy HP on the combat snapshot.
        const combat = store.getState().combat!;
        store.getState().updateCombat({
            ...combat,
            enemy: { ...combat.enemy, health: 0 },
        });

        const report = store.getState().endCombat();
        expect(report.outcome).toBe('victory');
        expect(report.xpGained).toBe(TidepoolCrab.xpReward);
        expect(report.loot.length).toBeGreaterThan(0);

        // Player got the XP and the item.
        const player = store.getState().player;
        expect(player.experience).toBe(Player.experience + TidepoolCrab.xpReward!);
        const got = player.inventory.find(i => i.id === 'minor-healing-potion');
        expect(got).toBeDefined();
    });

    it('defeat grants nothing', () => {
        const store = createGameStore(nullAdapter, { player: Player });
        store.getState().startCombat(TidepoolCrab);

        const combat = store.getState().combat!;
        store.getState().updateCombat({
            ...combat,
            player: { ...combat.player, health: 0 },
        });

        const report = store.getState().endCombat();
        expect(report.outcome).toBe('defeat');
        expect(report.xpGained).toBe(0);
        expect(report.loot).toEqual([]);
    });

    it('flee (combat ended without KO) grants nothing', () => {
        const store = createGameStore(nullAdapter, { player: Player });
        store.getState().startCombat(TidepoolCrab);

        // Both still alive — the friendship-counter exit hits this path.
        const report = store.getState().endCombat();
        expect(report.outcome).toBe('flee');
        expect(report.xpGained).toBe(0);
    });

    it('victory loot stacks into an existing inventory entry', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.99);

        const seededInventory: Item[] = [
            { id: 'minor-healing-potion', name: 'Minor Healing Potion',
              description: 'x', category: 'consumable', quantity: 2,
              healAmount: 10 },
        ];
        const store = createGameStore(nullAdapter, {
            player: { ...Player, inventory: seededInventory },
        });

        store.getState().startCombat(TidepoolCrab);
        const combat = store.getState().combat!;
        store.getState().updateCombat({ ...combat, enemy: { ...combat.enemy, health: 0 } });
        store.getState().endCombat();

        const stack = store.getState().player.inventory.find(i => i.id === 'minor-healing-potion');
        expect(stack && 'quantity' in stack ? stack.quantity : 0).toBe(3);
        // No duplicate entry.
        expect(
            store.getState().player.inventory.filter(i => i.id === 'minor-healing-potion'),
        ).toHaveLength(1);
    });
});
