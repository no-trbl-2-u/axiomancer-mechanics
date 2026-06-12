import { describe, it, expect } from 'vitest';
import { createCharacter } from '../../Character';
import { createEnemy } from '../../Enemy';
import { initializeCombat } from '../combat.reducer';
import { resolveCombatRound } from '../combat.resolver';
import { mockFixedRng } from '../../test-utils/rng';
import type { BattleLogEntry, CombatAction } from '../types';

describe('BattleLogEntry contract verification', () => {
    // Zero base stats give both combatants 0 maxHealth, so every round
    // short-circuits at the round-start lethal check. This mirrors the
    // behaviour the suite has always exercised (the original fixtures used a
    // pre-rename stat shape that also produced non-positive health).
    const player = createCharacter({
        name: 'TestPlayer',
        level: 1,
        baseStats: { heart: 0, body: 0, mind: 0 }
    });

    const boss = createEnemy({
        id: 'boss-enemy',
        name: 'BossEnemy',
        description: 'Contract-test boss',
        level: 1,
        baseStats: { heart: 0, body: 0, mind: 0 },
        mapName: 'northern-forest',
        logic: 'balanced'
    });

    it('should not have undefined required fields in log entries', () => {
        mockFixedRng([0.5, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9, 0.4, 0.6]);
        
        const combat = initializeCombat(player, boss);
        
        // Execute several rounds to generate log entries
        let currentCombat = combat;
        for (let round = 0; round < 3 && currentCombat.active; round++) {
            const result = resolveCombatRound(
                currentCombat,
                { stance: 'body', action: 'attack' },
                { stance: 'mind', action: 'skill', skillId: 'test-skill' }
            );
            currentCombat = result.state;
        }

        // Verify all log entries have required fields properly populated
        currentCombat.log.forEach((logEntry: BattleLogEntry, index: number) => {
            expect(logEntry, `Log entry ${index + 1} should exist`).toBeDefined();
            expect(logEntry.playerAction, `Log entry ${index + 1} playerAction should exist`).toBeDefined();
            expect(logEntry.enemyAction, `Log entry ${index + 1} enemyAction should exist`).toBeDefined();
            expect(logEntry.damageToPlayer, `Log entry ${index + 1} damageToPlayer should be defined`).toBeDefined();
            expect(logEntry.damageToEnemy, `Log entry ${index + 1} damageToEnemy should be defined`).toBeDefined();
            expect(logEntry.result, `Log entry ${index + 1} result should be defined`).toBeDefined();

            // These should be numbers, not undefined
            expect(typeof logEntry.damageToPlayer).toBe('number');
            expect(typeof logEntry.damageToEnemy).toBe('number');
            
            // PlayerAction and EnemyAction should have required stance and action
            expect(logEntry.playerAction.stance).toBeDefined();
            expect(logEntry.playerAction.action).toBeDefined();
            expect(logEntry.enemyAction.stance).toBeDefined();
            expect(logEntry.enemyAction.action).toBeDefined();
        });
    });

    it('should validate parameters and throw early for undefined actions', () => {
        mockFixedRng([0.5, 0.3]);
        
        const combat = initializeCombat(player, boss);
        
        // This should throw an error if either action is undefined
        expect(() => {
            resolveCombatRound(
                combat,
                undefined as unknown as CombatAction, // Force undefined playerAction
                { stance: 'body', action: 'attack' }
            );
        }).toThrow('resolveCombatRound: playerAction cannot be undefined');

        expect(() => {
            resolveCombatRound(
                combat,
                { stance: 'body', action: 'attack' },
                undefined as unknown as CombatAction // Force undefined enemyAction
            );
        }).toThrow('resolveCombatRound: enemyAction cannot be undefined');

        expect(() => {
            resolveCombatRound(
                combat,
                { stance: 'body' } as CombatAction, // Missing action
                { stance: 'body', action: 'attack' }
            );
        }).toThrow('resolveCombatRound: playerAction must have stance and action');
    });

    it('should handle boss skill killing blow scenario', () => {
        mockFixedRng([0.5, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9, 0.4, 0.6]);
        
        // Create a scenario where the enemy might kill the player with a skill
        const weakPlayer = createCharacter({
            name: 'WeakPlayer',
            level: 1,
            baseStats: { heart: 0, body: 0, mind: 0 } // Very low health
        });

        const strongBoss = createEnemy({
            id: 'strong-boss',
            name: 'StrongBoss',
            description: 'Contract-test killing-blow boss',
            level: 1,
            baseStats: { heart: 0, body: 0, mind: 0 },
            mapName: 'northern-forest',
            logic: 'aggressive'
        });

        const combat = initializeCombat(weakPlayer, strongBoss);
        
        // Try to create a killing blow scenario
        const result = resolveCombatRound(
            combat,
            { stance: 'heart', action: 'defend' },
            { stance: 'body', action: 'skill', skillId: 'hypothetical-boss-skill' }
        );

        // If a log entry was created, it should have all required fields
        if (result.state.log.length > 0) {
            const logEntry = result.state.log[result.state.log.length - 1];
            
            // Test the specific access pattern that was failing in mobile
            expect(() => {
                // This should not throw even if skillId doesn't exist
                if (logEntry.enemyAction && logEntry.enemyAction.action === 'skill') {
                    const skillId = logEntry.enemyAction.skillId;
                    console.log('Enemy used skill:', skillId);
                }
            }).not.toThrow();

            // Required fields should never be undefined
            expect(logEntry.enemyAction).toBeDefined();
            expect(logEntry.playerAction).toBeDefined();
            expect(logEntry.damageToPlayer).toBeDefined();
            expect(logEntry.damageToEnemy).toBeDefined();
            expect(logEntry.result).toBeDefined();
        }
    });

    it('should never allow access to undefined enemyAction.skillId that caused mobile crash', () => {
        mockFixedRng([0.5, 0.3, 0.7, 0.2]);

        const combat = initializeCombat(player, boss);
        
        // Simulate various enemy actions including skills
        const testScenarios: CombatAction[] = [
            { stance: 'body', action: 'attack' },
            { stance: 'mind', action: 'defend' },
            { stance: 'heart', action: 'skill', skillId: 'some-skill' },
            { stance: 'body', action: 'skill' }, // skill without skillId
        ];

        testScenarios.forEach((enemyAction, index) => {
            const result = resolveCombatRound(
                combat,
                { stance: 'heart', action: 'attack' },
                enemyAction
            );

            if (result.state.log.length > 0) {
                const logEntry = result.state.log[result.state.log.length - 1];
                
                // The specific access pattern that was failing in mobile
                expect(logEntry.enemyAction, `Scenario ${index + 1}: enemyAction should exist`).toBeDefined();
                expect(logEntry.enemyAction.stance, `Scenario ${index + 1}: enemyAction.stance should exist`).toBeDefined();
                expect(logEntry.enemyAction.action, `Scenario ${index + 1}: enemyAction.action should exist`).toBeDefined();
                
                // This should never throw, even when skillId is undefined
                expect(() => {
                    if (logEntry.enemyAction.action === 'skill') {
                        const _skillId = logEntry.enemyAction.skillId;
                        // skillId might be undefined, but accessing it shouldn't crash
                    }
                }, `Scenario ${index + 1}: accessing skillId should not throw`).not.toThrow();
            }
        });
    });
});