/**
 * Enemy Module Tests
 * Tests for enemy stat retrieval, random logic, and enemy library
 */

import { getEnemyRelatedStat } from './index';
import { randomLogic } from './enemy.logic';
import { Disatree_01, EnemyLibrary } from './enemy.library';
import { Enemy, EnemyStats } from './types';
import { ActionType } from '../Combat/types';

// ============================================================================
// Test Fixtures
// ============================================================================

/** Creates a mock enemy with distinct stat values for testing */
function createMockEnemy(): Enemy {
    return {
        id: 'test-enemy-01',
        name: 'Test Monster',
        description: 'A creature built for testing',
        level: 3,
        health: 30,
        mana: 15,
        enemyStats: {
            maxHealth: 30,
            maxMana: 15,
            physicalAttack: 5,
            physicalSkill: 3,
            physicalDefense: 4,
            mentalAttack: 7,
            mentalSkill: 6,
            mentalDefense: 8,
            emotionalAttack: 2,
            emotionalSkill: 1,
            emotionalDefense: 9,
        },
        mapLocation: { name: 'northern-forest' },
        logic: 'random',
    };
}

// ============================================================================
// getEnemyRelatedStat
// ============================================================================

describe('getEnemyRelatedStat', () => {
    const enemy: Enemy = createMockEnemy();

    describe('when not defending (attack stats)', () => {
        it('should return physicalAttack for body type', () => {
            const result: number = getEnemyRelatedStat(enemy, 'body', false);
            expect(result).toBe(enemy.enemyStats.physicalAttack);
        });

        it('should return mentalAttack for mind type', () => {
            const result: number = getEnemyRelatedStat(enemy, 'mind', false);
            expect(result).toBe(enemy.enemyStats.mentalAttack);
        });

        it('should return emotionalAttack for heart type', () => {
            const result: number = getEnemyRelatedStat(enemy, 'heart', false);
            expect(result).toBe(enemy.enemyStats.emotionalAttack);
        });
    });

    describe('when defending (defense stats)', () => {
        it('should return physicalDefense for body type', () => {
            const result: number = getEnemyRelatedStat(enemy, 'body', true);
            expect(result).toBe(enemy.enemyStats.physicalDefense);
        });

        it('should return mentalDefense for mind type', () => {
            const result: number = getEnemyRelatedStat(enemy, 'mind', true);
            expect(result).toBe(enemy.enemyStats.mentalDefense);
        });

        it('should return emotionalDefense for heart type', () => {
            const result: number = getEnemyRelatedStat(enemy, 'heart', true);
            expect(result).toBe(enemy.enemyStats.emotionalDefense);
        });
    });
});

// ============================================================================
// randomLogic
// ============================================================================

describe('randomLogic', () => {
    it('should return a CombatAction with type and action', () => {
        const action = randomLogic();
        expect(action).toHaveProperty('type');
        expect(action).toHaveProperty('action');
    });

    it('should return a valid ActionType', () => {
        const validTypes: ActionType[] = ['heart', 'body', 'mind'];
        for (let i = 0; i < 50; i++) {
            const action = randomLogic();
            expect(validTypes).toContain(action.type);
        }
    });

    it('should return a valid Action (attack or defend)', () => {
        const validActions: string[] = ['attack', 'defend'];
        for (let i = 0; i < 50; i++) {
            const action = randomLogic();
            expect(validActions).toContain(action.action);
        }
    });

    it('should produce varying results (not always the same)', () => {
        const results = new Set<string>();
        for (let i = 0; i < 50; i++) {
            const action = randomLogic();
            results.add(`${action.type}-${action.action}`);
        }
        expect(results.size).toBeGreaterThan(1);
    });
});

// ============================================================================
// Enemy Library
// ============================================================================

describe('EnemyLibrary', () => {
    describe('Disatree_01', () => {
        it('should have the correct name', () => {
            expect(Disatree_01.name).toBe('Disatree');
        });

        it('should have a unique id', () => {
            expect(Disatree_01.id).toBe('ent-enemy-01');
        });

        it('should be level 1', () => {
            expect(Disatree_01.level).toBe(1);
        });

        it('should have health equal to maxHealth', () => {
            expect(Disatree_01.health).toBe(Disatree_01.enemyStats.maxHealth);
        });

        it('should have mana equal to maxMana', () => {
            expect(Disatree_01.mana).toBe(Disatree_01.enemyStats.maxMana);
        });

        it('should have random logic', () => {
            expect(Disatree_01.logic).toBe('random');
        });

        it('should be a normal tier enemy', () => {
            expect(Disatree_01.enemyTier).toBe('normal');
        });

        it('should have a map location', () => {
            expect(Disatree_01.mapLocation.name).toBe('northern-forest');
        });

        it('should have all enemy stats defined', () => {
            const stats: EnemyStats = Disatree_01.enemyStats;
            expect(stats.physicalAttack).toBeDefined();
            expect(stats.physicalSkill).toBeDefined();
            expect(stats.physicalDefense).toBeDefined();
            expect(stats.mentalAttack).toBeDefined();
            expect(stats.mentalSkill).toBeDefined();
            expect(stats.mentalDefense).toBeDefined();
            expect(stats.emotionalAttack).toBeDefined();
            expect(stats.emotionalSkill).toBeDefined();
            expect(stats.emotionalDefense).toBeDefined();
        });
    });

    describe('EnemyLibrary structure', () => {
        it('should contain northernForest enemies', () => {
            expect(EnemyLibrary.northernForest).toBeDefined();
            expect(Array.isArray(EnemyLibrary.northernForest)).toBe(true);
        });

        it('should include Disatree_01 in northernForest', () => {
            expect(EnemyLibrary.northernForest).toContain(Disatree_01);
        });

        it('should have at least one enemy in northernForest', () => {
            expect(EnemyLibrary.northernForest.length).toBeGreaterThanOrEqual(1);
        });
    });
});
