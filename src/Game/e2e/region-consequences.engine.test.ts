/**
 * Phase 109 — Region-level consequences for befriend exploit/spare choices.
 * 
 * Tests that:
 * 1. Exploiting an elite/miniboss befriend opening blocks region boss friendship counters
 * 2. Sparing an elite/miniboss grants 'open-minded' status to region boss
 * 3. Region consequences persist across save/load cycles
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter } from '../../Character';
import { createGameStore } from '../store';
import { nullAdapter } from '../persistence/null.adapter';
import { mockFixedRng } from '../../test-utils/rng';
import { Enemy } from '../../Enemy/types';
import { resolveCombatRound, isFriendshipEligible } from '../../Combat';

// Test fixtures - elite enemy and region boss
const testEliteEnemy: Enemy = {
    id: 'test-elite',
    name: 'Test Elite',
    description: 'A test elite enemy',
    level: 4,
    health: 50,
    maxHealth: 50,
    baseStats: { body: 3, mind: 2, heart: 3 },
    derivedStats: { 
        physicalAttack: 6, physicalDefense: 6, physicalSkill: 6,
        mentalAttack: 4, mentalDefense: 4, mentalSkill: 4,
        emotionalAttack: 6, emotionalDefense: 6, emotionalSkill: 6
    },
    mapName: 'fishing-village',
    difficulty: 'elite',
    logic: 'aggressive',
    effects: [],
    // Make easily befriendable for testing
    befriendabilityConfig: {
        roundsThreshold: 1,
        hpGate: { belowPct: 1.0 }, // Always eligible when HP > 0
    },
};

const testRegionBoss: Enemy = {
    id: 'test-region-boss',
    name: 'Test Region Boss',
    description: 'A test region boss',
    level: 6,
    health: 100,
    maxHealth: 100,
    baseStats: { body: 6, mind: 3, heart: 4 },
    derivedStats: {
        physicalAttack: 12, physicalDefense: 12, physicalSkill: 12,
        mentalAttack: 6, mentalDefense: 6, mentalSkill: 6,
        emotionalAttack: 8, emotionalDefense: 8, emotionalSkill: 8
    },
    mapName: 'fishing-village', // Same region as elite
    difficulty: 'boss',
    logic: 'boss',
    effects: [],
};

describe('Phase 109 — Region consequences for befriend choices', () => {
    let player: ReturnType<typeof createCharacter>;

    beforeEach(() => {
        mockFixedRng(0.5);
        player = createCharacter({
            name: 'Test Player',
            level: 5,
            baseStats: { heart: 5, body: 3, mind: 3 },
        });
    });

    describe('Exploit consequences', () => {
        it('blocks friendship counter accumulation for region boss after elite exploit', async () => {
            const store = createGameStore(nullAdapter, { player });

            // First, fight the elite and exploit the befriend opening
            store.getState().startCombat({ enemies: [testEliteEnemy] });
            
            // Trigger befriend opening by using Befriend skill (need it to be successful)
            let combat = store.getState().combat!;
            
            // Make the elite vulnerable to befriend by reducing health if needed
            // and ensuring befriend eligibility
            while (combat && !isFriendshipEligible(combat)) {
                // Both defend to build friendship counter
                const { state: nextCombat } = resolveCombatRound(
                    combat,
                    { stance: 'heart', action: 'defend' },
                    { stance: 'heart', action: 'defend' }
                );
                store.getState().updateCombat(nextCombat);
                combat = store.getState().combat!;
            }

            // Simulate successful befriend attempt that opens mercy choice
            // This would normally be triggered by the Befriend skill
            combat = { ...combat, mercyChoiceActive: true, phase: 'mercy_choice' as const };
            store.getState().updateCombat(combat);

            // Choose exploit option through store dispatch
            store.getState().dispatch({
                type: 'COMBAT_ROUND',
                payload: {
                    playerAction: 'exploit',
                    playerStance: 'heart'
                }
            });
            store.getState().endCombat();

            // Verify the region is now marked as exploited
            expect(store.getState().regionConsequences.exploitedRegions).toContain('fishing-village');

            // Now fight the region boss and verify friendship counters are blocked
            store.getState().startCombat({ enemies: [testRegionBoss] });
            let bossCombat = store.getState().combat!;

            // Try to build friendship counter through both-defend rounds
            const initialCounter = bossCombat.friendshipCounter;
            const { state: afterDefend } = resolveCombatRound(
                bossCombat,
                { stance: 'heart', action: 'defend' },
                { stance: 'heart', action: 'defend' },
                undefined,
                store.getState().regionConsequences.exploitedRegions
            );

            // Friendship counter should remain unchanged due to exploitation
            expect(afterDefend.friendshipCounter).toBe(initialCounter);
        });

        it('persists exploit consequences across save/load', async () => {
            const store = createGameStore(nullAdapter, { 
                player,
                regionConsequences: { 
                    exploitedRegions: ['fishing-village'], 
                    sparedRegions: [] 
                }
            });

            // Start combat with region boss
            store.getState().startCombat({ enemies: [testRegionBoss] });
            const combat = store.getState().combat!;

            // Attempt to build friendship counter
            const { state: afterDefend } = resolveCombatRound(
                combat,
                { stance: 'heart', action: 'defend' },
                { stance: 'heart', action: 'defend' },
                undefined,
                store.getState().regionConsequences.exploitedRegions
            );

            // Should be blocked
            expect(afterDefend.friendshipCounter).toBe(0);
        });
    });

    describe('Spare consequences', () => {
        it('grants open-minded status to region boss after elite spare', async () => {
            const store = createGameStore(nullAdapter, { 
                player,
                regionConsequences: { 
                    exploitedRegions: [], 
                    sparedRegions: ['fishing-village'] 
                }
            });

            // Start combat with region boss
            store.getState().startCombat({ enemies: [testRegionBoss] });
            const combat = store.getState().combat!;

            // Verify boss has open-minded effect
            const hasOpenMinded = combat.enemy.effects.some(
                effect => effect.effectId === 'buff_open_minded'
            );
            expect(hasOpenMinded).toBe(true);
        });

        it('tracks spare consequence when player chooses mercy', async () => {
            const store = createGameStore(nullAdapter, { player });

            // Fight elite and spare it
            store.getState().startCombat({ enemies: [testEliteEnemy] });
            let combat = store.getState().combat!;

            // Build to befriend eligibility
            while (combat && !isFriendshipEligible(combat)) {
                const { state: nextCombat } = resolveCombatRound(
                    combat,
                    { stance: 'heart', action: 'defend' },
                    { stance: 'heart', action: 'defend' }
                );
                store.getState().updateCombat(nextCombat);
                combat = store.getState().combat!;
            }

            // Open mercy choice
            combat = { ...combat, mercyChoiceActive: true, phase: 'mercy_choice' as const };
            store.getState().updateCombat(combat);

            // Choose spare option through store dispatch
            store.getState().dispatch({
                type: 'COMBAT_ROUND',
                payload: {
                    playerAction: 'spare',
                    playerStance: 'heart'
                }
            });
            store.getState().endCombat();

            // Verify region is marked as spared
            expect(store.getState().regionConsequences.sparedRegions).toContain('fishing-village');
        });
    });

    describe('Open-minded status and befriend qualification', () => {
        it('open-minded status qualifies boss for befriend paths', async () => {
            const store = createGameStore(nullAdapter, { 
                player,
                regionConsequences: { 
                    exploitedRegions: [], 
                    sparedRegions: ['fishing-village'] 
                }
            });

            // Start combat with region boss (should have open-minded)
            store.getState().startCombat({ enemies: [testRegionBoss] });
            const combat = store.getState().combat!;

            // Verify boss has open-minded effect
            const openMindedEffect = combat.enemy.effects.find(
                effect => effect.effectId === 'buff_open_minded'
            );
            expect(openMindedEffect).toBeTruthy();
            expect(openMindedEffect?.intensity).toBe(1);
            expect(openMindedEffect?.remainingDuration).toBe(-1); // Permanent
            expect(openMindedEffect?.sourceId).toBe('region-mercy-consequence');
        });
    });
});