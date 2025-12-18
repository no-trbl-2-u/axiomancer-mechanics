import { describe, it, expect } from 'vitest';
import { getEnemyRelatedStat } from './index';
import { randomLogic } from './enemy.logic';
import { Enemy, EnemyStats } from './types';
import { Disatree_01 } from './enemy.library';

// ============================================================================
// TEST DATA
// ============================================================================

const mockEnemyStats: EnemyStats = {
    maxHealth: 100,
    maxMana: 50,
    physicalAttack: 10,
    physicalSkill: 5,
    physicalDefense: 8,
    mentalAttack: 12,
    mentalSkill: 6,
    mentalDefense: 7,
    emotionalAttack: 8,
    emotionalSkill: 4,
    emotionalDefense: 9,
};

const mockEnemy: Enemy = {
    id: 'test-enemy-001',
    name: 'Test Enemy',
    description: 'A test enemy for unit testing',
    level: 5,
    health: 100,
    mana: 50,
    enemyStats: mockEnemyStats,
    mapLocation: { name: 'fishing-village' },
    logic: 'random',
};

// ============================================================================
// getEnemyRelatedStat
// ============================================================================

describe('getEnemyRelatedStat', () => {
    describe('when not defending (attack stats)', () => {
        it('should return physicalAttack for body type', () => {
            const result = getEnemyRelatedStat(mockEnemy, 'body', false);
            expect(result).toBe(mockEnemy.enemyStats.physicalAttack);
        });

        it('should return mentalAttack for mind type', () => {
            const result = getEnemyRelatedStat(mockEnemy, 'mind', false);
            expect(result).toBe(mockEnemy.enemyStats.mentalAttack);
        });

        it('should return emotionalAttack for heart type', () => {
            const result = getEnemyRelatedStat(mockEnemy, 'heart', false);
            expect(result).toBe(mockEnemy.enemyStats.emotionalAttack);
        });
    });

    describe('when defending (defense stats)', () => {
        it('should return physicalDefense for body type', () => {
            const result = getEnemyRelatedStat(mockEnemy, 'body', true);
            expect(result).toBe(mockEnemy.enemyStats.physicalDefense);
        });

        it('should return mentalDefense for mind type', () => {
            const result = getEnemyRelatedStat(mockEnemy, 'mind', true);
            expect(result).toBe(mockEnemy.enemyStats.mentalDefense);
        });

        it('should return emotionalDefense for heart type', () => {
            const result = getEnemyRelatedStat(mockEnemy, 'heart', true);
            expect(result).toBe(mockEnemy.enemyStats.emotionalDefense);
        });
    });

    describe('with real enemy data (Disatree_01)', () => {
        it('should correctly retrieve attack stats', () => {
            expect(getEnemyRelatedStat(Disatree_01, 'body', false)).toBe(Disatree_01.enemyStats.physicalAttack);
            expect(getEnemyRelatedStat(Disatree_01, 'mind', false)).toBe(Disatree_01.enemyStats.mentalAttack);
            expect(getEnemyRelatedStat(Disatree_01, 'heart', false)).toBe(Disatree_01.enemyStats.emotionalAttack);
        });

        it('should correctly retrieve defense stats', () => {
            expect(getEnemyRelatedStat(Disatree_01, 'body', true)).toBe(Disatree_01.enemyStats.physicalDefense);
            expect(getEnemyRelatedStat(Disatree_01, 'mind', true)).toBe(Disatree_01.enemyStats.mentalDefense);
            expect(getEnemyRelatedStat(Disatree_01, 'heart', true)).toBe(Disatree_01.enemyStats.emotionalDefense);
        });
    });
});

// ============================================================================
// randomLogic
// ============================================================================

describe('randomLogic', () => {
    it('should return a valid CombatAction object', () => {
        const action = randomLogic();
        expect(action).toHaveProperty('type');
        expect(action).toHaveProperty('action');
    });

    it('should return a valid action type (heart, body, or mind)', () => {
        for (let i = 0; i < 50; i++) {
            const action = randomLogic();
            expect(['heart', 'body', 'mind']).toContain(action.type);
        }
    });

    it('should return a valid action (attack or defend)', () => {
        for (let i = 0; i < 50; i++) {
            const action = randomLogic();
            expect(['attack', 'defend']).toContain(action.action);
        }
    });

    it('should produce different results over multiple calls (randomness test)', () => {
        const results = new Set<string>();
        for (let i = 0; i < 100; i++) {
            const action = randomLogic();
            results.add(`${action.type}-${action.action}`);
        }
        // With 6 possible combinations (3 types × 2 actions), we should see variety
        expect(results.size).toBeGreaterThan(1);
    });
});
