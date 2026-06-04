/**
 * Combat retrigger lock fix (Phase 103) — hermetic e2e test.
 *
 * Reproduces and verifies the fix for playtest jot #89(a): after WIN or
 * FRIENDSHIP outcomes, players cannot trigger new combat encounters. Only
 * DEFEAT/restart properly clears the encounter lock.
 *
 * Each terminal combat outcome should allow re-triggering new encounters.
 */

import { describe, it, expect } from 'vitest';
import { createGameStore } from '../store';
import { nullAdapter } from '../persistence/null.adapter';
import { createCharacter } from '../../Character';
import { TidepoolCrab, MournfulGull } from '../../Enemy/enemy.library';

describe('Phase 103 — Combat retrigger lock fix', () => {
    it('victory outcome allows new combat trigger', () => {
        const character = createCharacter({
            name: 'TestPlayer',
            level: 10,
            baseStats: { heart: 15, body: 15, mind: 15 },
        });

        const store = createGameStore(nullAdapter, { player: character });

        // Start first combat
        store.getState().startCombat(TidepoolCrab);
        expect(store.getState().combat).toBeTruthy();

        // Force victory by setting enemy health to 0 and ending combat
        const combatWithDeadEnemy = {
            ...store.getState().combat!,
            enemy: { ...store.getState().combat!.enemy, health: 0 },
        };
        store.getState().updateCombat(combatWithDeadEnemy);

        // End combat - should result in victory
        const report = store.getState().endCombat();
        expect(report.outcome).toBe('victory');
        expect(store.getState().combat).toBeNull();
        expect(store.getState().currentEncounter).toBeUndefined();

        // Should be able to start new combat
        store.getState().startCombat(MournfulGull);
        expect(store.getState().combat).toBeTruthy();
        expect(store.getState().combat!.enemy.name).toBe('Mournful Gull');
    });

    it('friendship outcome allows new combat trigger', () => {
        const character = createCharacter({
            name: 'TestPlayer',
            level: 10,
            baseStats: { heart: 15, body: 15, mind: 15 },
        });

        const store = createGameStore(nullAdapter, { player: character });

        // Start first combat with a befriendable enemy
        store.getState().startCombat(MournfulGull);
        expect(store.getState().combat).toBeTruthy();

        // Force friendship by maxing friendship counter and explicitly
        // authorizing the spare/mercy resolution.
        const combatWithMaxFriendship = {
            ...store.getState().combat!,
            friendshipCounter: 10, // Above threshold
            friendshipResolutionAuthorized: true,
        };
        store.getState().updateCombat(combatWithMaxFriendship);

        // End combat - should result in friendship
        const report = store.getState().endCombat();
        expect(report.outcome).toBe('friendship');
        expect(store.getState().combat).toBeNull();
        expect(store.getState().currentEncounter).toBeUndefined();

        // Should be able to start new combat
        store.getState().startCombat(TidepoolCrab);
        expect(store.getState().combat).toBeTruthy();
        expect(store.getState().combat!.enemy.name).toBe('Tidepool Crab');
    });

    it('defeat outcome allows new combat trigger (regression guard)', () => {
        const character = createCharacter({
            name: 'TestPlayer',
            level: 1,
            baseStats: { heart: 1, body: 1, mind: 1 },
        });

        const store = createGameStore(nullAdapter, { player: character });

        // Start first combat
        store.getState().startCombat(TidepoolCrab);
        expect(store.getState().combat).toBeTruthy();

        // Force defeat by setting player health to 0
        const combatWithDeadPlayer = {
            ...store.getState().combat!,
            player: { ...store.getState().combat!.player, health: 0 },
        };
        store.getState().updateCombat(combatWithDeadPlayer);

        // End combat - should result in defeat
        const report = store.getState().endCombat();
        expect(report.outcome).toBe('defeat');
        expect(store.getState().combat).toBeNull();
        expect(store.getState().currentEncounter).toBeUndefined();

        // Should be able to start new combat (this was already working)
        store.getState().startCombat(MournfulGull);
        expect(store.getState().combat).toBeTruthy();
        expect(store.getState().combat!.enemy.name).toBe('Mournful Gull');
    });

    it('all terminal outcomes clear encounter lock for map-based triggers', () => {
        // Test the scenario where combat is triggered via map events,
        // not just direct startCombat calls
        const character = createCharacter({
            name: 'TestPlayer',
            level: 5,
            baseStats: { heart: 10, body: 10, mind: 10 },
        });

        const store = createGameStore(nullAdapter, { player: character });

        // Test victory → new encounter sequence
        store.getState().startCombat({ enemies: [TidepoolCrab], origin: 'test-node-1' });
        const combat1 = { ...store.getState().combat!, enemy: { ...store.getState().combat!.enemy, health: 0 } };
        store.getState().updateCombat(combat1);
        const report1 = store.getState().endCombat();
        expect(report1.outcome).toBe('victory');

        // Test that we can start a new encounter immediately
        store.getState().startCombat({ enemies: [MournfulGull], origin: 'test-node-2' });
        expect(store.getState().combat).toBeTruthy();
        expect(store.getState().currentEncounter?.origin).toBe('test-node-2');

        // Test friendship → new encounter sequence
        const combat2 = {
            ...store.getState().combat!,
            friendshipCounter: 10,
            friendshipResolutionAuthorized: true,
        };
        store.getState().updateCombat(combat2);
        const report2 = store.getState().endCombat();
        expect(report2.outcome).toBe('friendship');

        // Test that we can start a new encounter after friendship
        store.getState().startCombat({ enemies: [TidepoolCrab], origin: 'test-node-3' });
        expect(store.getState().combat).toBeTruthy();
        expect(store.getState().currentEncounter?.origin).toBe('test-node-3');
    });

    it('sequential combat encounters work after any outcome', () => {
        // Test that multiple combat encounters can be triggered in sequence
        // regardless of the outcome of previous combats
        const character = createCharacter({
            name: 'TestPlayer', 
            level: 5,
            baseStats: { heart: 10, body: 10, mind: 10 },
        });

        const store = createGameStore(nullAdapter, { player: character });

        // First encounter: victory
        store.getState().startCombat({ enemies: [TidepoolCrab], origin: 'encounter-1' });
        const combat1 = { ...store.getState().combat!, enemy: { ...store.getState().combat!.enemy, health: 0 } };
        store.getState().updateCombat(combat1);
        const report1 = store.getState().endCombat();
        expect(report1.outcome).toBe('victory');
        expect(store.getState().combat).toBeNull();

        // Second encounter: friendship
        store.getState().startCombat({ enemies: [MournfulGull], origin: 'encounter-2' });
        const combat2 = {
            ...store.getState().combat!,
            friendshipCounter: 10,
            friendshipResolutionAuthorized: true,
        };
        store.getState().updateCombat(combat2);
        const report2 = store.getState().endCombat();
        expect(report2.outcome).toBe('friendship');
        expect(store.getState().combat).toBeNull();

        // Third encounter: defeat
        store.getState().startCombat({ enemies: [TidepoolCrab], origin: 'encounter-3' });
        const combat3 = { ...store.getState().combat!, player: { ...store.getState().combat!.player, health: 0 } };
        store.getState().updateCombat(combat3);
        const report3 = store.getState().endCombat();
        expect(report3.outcome).toBe('defeat');
        expect(store.getState().combat).toBeNull();

        // Fourth encounter: verify all outcomes clear the lock
        store.getState().startCombat({ enemies: [MournfulGull], origin: 'encounter-4' });
        expect(store.getState().combat).toBeTruthy();
        expect(store.getState().currentEncounter?.origin).toBe('encounter-4');
    });
});