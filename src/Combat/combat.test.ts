/**
 * Combat Module Tests
 * Tests for combat mechanics: advantage system, dice rolling, damage,
 * health management, and combat round processing
 */

import {
    determineAdvantage,
    getAdvantageModifier,
    hasAdvantage,
    determineCombatEnd,
    isCombatOngoing,
    determineEnemyAction,
    generateEnemyAttackType,
    generateEnemyAction,
    isValidCombatAction,
    rollDie,
    rollDice,
    rollD20,
    rollWithAdvantage,
    rollWithDisadvantage,
    rollSkillCheck,
    getSkillStatForType,
    getDefenseStatForType,
    getSaveStatForType,
    getBaseStatForType,
    performAttackRoll,
    performDefenseRoll,
    isAttackSuccessful,
    isCriticalHit,
    isCriticalMiss,
    calculateBaseDamage,
    calculateDamageReduction,
    calculateFinalDamage,
    applyCriticalMultiplier,
    calculateAttackDamage,
    applyDamage,
    healCharacter,
    isAlive,
    isDefeated,
    getHealthPercentage,
    determineTurnOrder,
    rollInitiative,
    createBattleLogEntry,
    formatAllBattleLogs,
    generateCombatResultMessage,
} from './index';
import {
    ActionType,
    Action,
    Advantage,
    CombatAction,
    CombatState,
    BattleLogEntry,
} from './types';
import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { createCharacter } from '../Character/index';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestCharacter(): Character {
    return createCharacter({
        name: 'Test Hero',
        level: 3,
        baseStats: { heart: 4, body: 5, mind: 3 },
    });
}

function createTestEnemy(): Enemy {
    return {
        id: 'test-enemy-01',
        name: 'Test Monster',
        description: 'A test monster',
        level: 2,
        health: 50,
        mana: 20,
        enemyStats: {
            maxHealth: 50,
            maxMana: 20,
            physicalAttack: 4,
            physicalSkill: 3,
            physicalDefense: 5,
            mentalAttack: 3,
            mentalSkill: 2,
            mentalDefense: 4,
            emotionalAttack: 5,
            emotionalSkill: 4,
            emotionalDefense: 3,
        },
        mapLocation: { name: 'northern-forest' },
        logic: 'random',
    };
}

function createTestCombatState(overrides?: Partial<CombatState>): CombatState {
    return {
        active: true,
        phase: 'choosing_type',
        round: 1,
        friendshipCounter: 0,
        player: createTestCharacter(),
        enemy: createTestEnemy(),
        playerChoice: { type: 'body', action: 'attack' },
        enemyChoice: { type: 'mind', action: 'attack' },
        logEntry: [],
        ...overrides,
    };
}

// ============================================================================
// TYPE ADVANTAGE SYSTEM
// ============================================================================

describe('determineAdvantage', () => {
    it('should return neutral for same types', () => {
        const types: ActionType[] = ['heart', 'body', 'mind'];
        types.forEach((type: ActionType) => {
            const result: Advantage = determineAdvantage(type, type);
            expect(result).toBe('neutral');
        });
    });

    it('should return advantage for heart vs body', () => {
        const result: Advantage = determineAdvantage('heart', 'body');
        expect(result).toBe('advantage');
    });

    it('should return advantage for body vs mind', () => {
        const result: Advantage = determineAdvantage('body', 'mind');
        expect(result).toBe('advantage');
    });

    it('should return advantage for mind vs heart', () => {
        const result: Advantage = determineAdvantage('mind', 'heart');
        expect(result).toBe('advantage');
    });

    it('should return disadvantage for heart vs mind', () => {
        const result: Advantage = determineAdvantage('heart', 'mind');
        expect(result).toBe('disadvantage');
    });

    it('should return disadvantage for body vs heart', () => {
        const result: Advantage = determineAdvantage('body', 'heart');
        expect(result).toBe('disadvantage');
    });

    it('should return disadvantage for mind vs body', () => {
        const result: Advantage = determineAdvantage('mind', 'body');
        expect(result).toBe('disadvantage');
    });
});

describe('getAdvantageModifier', () => {
    it('should return 1.5 for advantage', () => {
        const result: number = getAdvantageModifier('advantage');
        expect(result).toBe(1.5);
    });

    it('should return 0.75 for disadvantage', () => {
        const result: number = getAdvantageModifier('disadvantage');
        expect(result).toBe(0.75);
    });

    it('should return 1.0 for neutral', () => {
        const result: number = getAdvantageModifier('neutral');
        expect(result).toBe(1.0);
    });
});

describe('hasAdvantage', () => {
    it('should return true for heart vs body', () => {
        const result: boolean = hasAdvantage('heart', 'body');
        expect(result).toBe(true);
    });

    it('should return true for body vs mind', () => {
        const result: boolean = hasAdvantage('body', 'mind');
        expect(result).toBe(true);
    });

    it('should return true for mind vs heart', () => {
        const result: boolean = hasAdvantage('mind', 'heart');
        expect(result).toBe(true);
    });

    it('should return false for same types', () => {
        const result: boolean = hasAdvantage('heart', 'heart');
        expect(result).toBe(false);
    });

    it('should return false for disadvantage matchups', () => {
        const result: boolean = hasAdvantage('heart', 'mind');
        expect(result).toBe(false);
    });
});

// ============================================================================
// COMBAT END CONDITIONS
// ============================================================================

describe('determineCombatEnd', () => {
    it('should return player when enemy health is 0', () => {
        const state: CombatState = createTestCombatState({
            enemy: { ...createTestEnemy(), health: 0 },
        });
        expect(determineCombatEnd(state)).toBe('player');
    });

    it('should return ko when player health is 0', () => {
        const state: CombatState = createTestCombatState({
            player: { ...createTestCharacter(), health: 0 },
        });
        expect(determineCombatEnd(state)).toBe('ko');
    });

    it('should return friendship when friendshipCounter is 3', () => {
        const state: CombatState = createTestCombatState({
            friendshipCounter: 3,
        });
        expect(determineCombatEnd(state)).toBe('friendship');
    });

    it('should return ongoing when combat continues', () => {
        const state: CombatState = createTestCombatState();
        expect(determineCombatEnd(state)).toBe('ongoing');
    });

    it('should prioritize player victory over friendship', () => {
        const state: CombatState = createTestCombatState({
            enemy: { ...createTestEnemy(), health: 0 },
            friendshipCounter: 3,
        });
        expect(determineCombatEnd(state)).toBe('player');
    });
});

describe('isCombatOngoing', () => {
    it('should return true when both combatants are alive and friendship < 3', () => {
        const state: CombatState = createTestCombatState();
        const result: boolean = isCombatOngoing(state);
        expect(result).toBe(true);
    });

    it('should return false when player health is 0', () => {
        const state: CombatState = createTestCombatState({
            player: { ...createTestCharacter(), health: 0 },
        });
        const result: boolean = isCombatOngoing(state);
        expect(result).toBe(false);
    });

    it('should return false when enemy health is 0', () => {
        const state: CombatState = createTestCombatState({
            enemy: { ...createTestEnemy(), health: 0 },
        });
        const result: boolean = isCombatOngoing(state);
        expect(result).toBe(false);
    });

    it('should return false when friendship counter reaches 3', () => {
        const state: CombatState = createTestCombatState({
            friendshipCounter: 3,
        });
        const result: boolean = isCombatOngoing(state);
        expect(result).toBe(false);
    });
});

// ============================================================================
// COMBAT ACTION UTILITIES
// ============================================================================

describe('determineEnemyAction', () => {
    it('should return a CombatAction for random logic', () => {
        const action: CombatAction = determineEnemyAction('random');
        expect(action).toHaveProperty('type');
        expect(action).toHaveProperty('action');
    });

    it('should fallback to random logic for unknown types', () => {
        const action: CombatAction = determineEnemyAction('balanced');
        expect(action).toHaveProperty('type');
        expect(action).toHaveProperty('action');
    });
});

describe('generateEnemyAttackType', () => {
    it('should return a valid ActionType', () => {
        const state: CombatState = createTestCombatState();
        const enemy: Enemy = createTestEnemy();
        const validTypes: ActionType[] = ['heart', 'body', 'mind'];

        for (let i = 0; i < 20; i++) {
            const result: ActionType = generateEnemyAttackType(state, enemy);
            expect(validTypes).toContain(result);
        }
    });
});

describe('generateEnemyAction', () => {
    it('should return a valid Action', () => {
        const state: CombatState = createTestCombatState();
        const enemy: Enemy = createTestEnemy();
        const validActions: Action[] = ['attack', 'defend', 'skill', 'item', 'flee', 'back'];

        for (let i = 0; i < 20; i++) {
            const result: Action = generateEnemyAction(state, enemy);
            expect(validActions).toContain(result);
        }
    });
});

describe('isValidCombatAction', () => {
    it('should return true for a complete combat action', () => {
        const action: CombatAction = { type: 'body', action: 'attack' };
        const result: boolean = isValidCombatAction(action);
        expect(result).toBe(true);
    });

    it('should return false when type is missing', () => {
        const action: Partial<CombatAction> = { action: 'attack' };
        const result: boolean = isValidCombatAction(action);
        expect(result).toBe(false);
    });

    it('should return false when action is missing', () => {
        const action: Partial<CombatAction> = { type: 'body' };
        const result: boolean = isValidCombatAction(action);
        expect(result).toBe(false);
    });

    it('should return false for an empty object', () => {
        const action: Partial<CombatAction> = {};
        const result: boolean = isValidCombatAction(action);
        expect(result).toBe(false);
    });
});

// ============================================================================
// DICE ROLLING SYSTEM
// ============================================================================

describe('rollDie', () => {
    it('should return values within range for a d6', () => {
        for (let i = 0; i < 100; i++) {
            const result: number = rollDie(6);
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(6);
        }
    });

    it('should return values within range for a d20', () => {
        for (let i = 0; i < 100; i++) {
            const result: number = rollDie(20);
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(20);
        }
    });

    it('should always return 1 for a d1', () => {
        const result: number = rollDie(1);
        expect(result).toBe(1);
    });
});

describe('rollDice', () => {
    it('should return the correct number of rolls', () => {
        const result = rollDice(3, 6);
        expect(result.rolls).toHaveLength(3);
    });

    it('should return a sum matching the rolls', () => {
        const result = rollDice(4, 6);
        const expectedSum: number = result.rolls.reduce((a, b) => a + b, 0);
        expect(result.sum).toBe(expectedSum);
    });

    it('should have all rolls within range', () => {
        const result = rollDice(5, 8);
        result.rolls.forEach((roll: number) => {
            expect(roll).toBeGreaterThanOrEqual(1);
            expect(roll).toBeLessThanOrEqual(8);
        });
    });

    it('should return sum in valid range for 2d6', () => {
        for (let i = 0; i < 50; i++) {
            const result = rollDice(2, 6);
            expect(result.sum).toBeGreaterThanOrEqual(2);
            expect(result.sum).toBeLessThanOrEqual(12);
        }
    });
});

describe('rollD20', () => {
    it('should return values between 1 and 20', () => {
        for (let i = 0; i < 100; i++) {
            const result: number = rollD20();
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(20);
        }
    });
});

describe('rollWithAdvantage', () => {
    it('should return the higher of two rolls', () => {
        for (let i = 0; i < 100; i++) {
            const result = rollWithAdvantage(20);
            expect(result.result).toBe(Math.max(result.rolls[0], result.rolls[1]));
        }
    });

    it('should return exactly two rolls', () => {
        const result = rollWithAdvantage(20);
        expect(result.rolls).toHaveLength(2);
    });

    it('should have all rolls within range', () => {
        const result = rollWithAdvantage(6);
        result.rolls.forEach((roll: number) => {
            expect(roll).toBeGreaterThanOrEqual(1);
            expect(roll).toBeLessThanOrEqual(6);
        });
    });
});

describe('rollWithDisadvantage', () => {
    it('should return the lower of two rolls', () => {
        for (let i = 0; i < 100; i++) {
            const result = rollWithDisadvantage(20);
            expect(result.result).toBe(Math.min(result.rolls[0], result.rolls[1]));
        }
    });

    it('should return exactly two rolls', () => {
        const result = rollWithDisadvantage(20);
        expect(result.rolls).toHaveLength(2);
    });
});

describe('rollSkillCheck', () => {
    it('should add the baseStat as modifier', () => {
        const result = rollSkillCheck(5, 'neutral');
        expect(result.modifier).toBe(5);
        expect(result.total).toBe(result.roll + result.modifier);
    });

    it('should produce a roll within d20 range', () => {
        for (let i = 0; i < 50; i++) {
            const result = rollSkillCheck(3, 'neutral');
            expect(result.roll).toBeGreaterThanOrEqual(1);
            expect(result.roll).toBeLessThanOrEqual(20);
        }
    });

    it('should still produce valid rolls with advantage', () => {
        for (let i = 0; i < 50; i++) {
            const result = rollSkillCheck(2, 'advantage');
            expect(result.roll).toBeGreaterThanOrEqual(1);
            expect(result.roll).toBeLessThanOrEqual(20);
        }
    });

    it('should still produce valid rolls with disadvantage', () => {
        for (let i = 0; i < 50; i++) {
            const result = rollSkillCheck(2, 'disadvantage');
            expect(result.roll).toBeGreaterThanOrEqual(1);
            expect(result.roll).toBeLessThanOrEqual(20);
        }
    });
});

// ============================================================================
// STAT-BASED CALCULATIONS
// ============================================================================

describe('getSkillStatForType', () => {
    it('should return physicalSkill for body type (Character)', () => {
        const character: Character = createTestCharacter();
        const result: number = getSkillStatForType(character, 'body');
        expect(result).toBe(character.derivedStats.physicalSkill);
    });

    it('should return mentalSkill for mind type (Character)', () => {
        const character: Character = createTestCharacter();
        const result: number = getSkillStatForType(character, 'mind');
        expect(result).toBe(character.derivedStats.mentalSkill);
    });

    it('should return emotionalSkill for heart type (Character)', () => {
        const character: Character = createTestCharacter();
        const result: number = getSkillStatForType(character, 'heart');
        expect(result).toBe(character.derivedStats.emotionalSkill);
    });

    it('should return physicalSkill for body type (Enemy)', () => {
        const enemy: Enemy = createTestEnemy();
        const result: number = getSkillStatForType(enemy, 'body');
        expect(result).toBe(enemy.enemyStats.physicalSkill);
    });

    it('should return mentalSkill for mind type (Enemy)', () => {
        const enemy: Enemy = createTestEnemy();
        const result: number = getSkillStatForType(enemy, 'mind');
        expect(result).toBe(enemy.enemyStats.mentalSkill);
    });

    it('should return emotionalSkill for heart type (Enemy)', () => {
        const enemy: Enemy = createTestEnemy();
        const result: number = getSkillStatForType(enemy, 'heart');
        expect(result).toBe(enemy.enemyStats.emotionalSkill);
    });
});

describe('getDefenseStatForType', () => {
    it('should return physicalDefense for body type (Character)', () => {
        const character: Character = createTestCharacter();
        const result: number = getDefenseStatForType(character, 'body');
        expect(result).toBe(character.derivedStats.physicalDefense);
    });

    it('should return mentalDefense for mind type (Enemy)', () => {
        const enemy: Enemy = createTestEnemy();
        const result: number = getDefenseStatForType(enemy, 'mind');
        expect(result).toBe(enemy.enemyStats.mentalDefense);
    });

    it('should return emotionalDefense for heart type (Enemy)', () => {
        const enemy: Enemy = createTestEnemy();
        const result: number = getDefenseStatForType(enemy, 'heart');
        expect(result).toBe(enemy.enemyStats.emotionalDefense);
    });
});

describe('getSaveStatForType', () => {
    it('should return physicalSave for body type (Character)', () => {
        const character: Character = createTestCharacter();
        const result: number = getSaveStatForType(character, 'body');
        expect(result).toBe(character.derivedStats.physicalSave);
    });

    it('should return mentalSave for mind type (Character)', () => {
        const character: Character = createTestCharacter();
        const result: number = getSaveStatForType(character, 'mind');
        expect(result).toBe(character.derivedStats.mentalSave);
    });

    it('should fallback to defense for enemies', () => {
        const enemy: Enemy = createTestEnemy();
        const result: number = getSaveStatForType(enemy, 'body');
        expect(result).toBe(enemy.enemyStats.physicalDefense);
    });
});

describe('getBaseStatForType', () => {
    it('should return body stat for body type (Character)', () => {
        const character: Character = createTestCharacter();
        const result: number = getBaseStatForType(character, 'body');
        expect(result).toBe(character.baseStats.body);
    });

    it('should return mind stat for mind type (Character)', () => {
        const character: Character = createTestCharacter();
        const result: number = getBaseStatForType(character, 'mind');
        expect(result).toBe(character.baseStats.mind);
    });

    it('should return heart stat for heart type (Character)', () => {
        const character: Character = createTestCharacter();
        const result: number = getBaseStatForType(character, 'heart');
        expect(result).toBe(character.baseStats.heart);
    });

    it('should return attack stat for enemy', () => {
        const enemy: Enemy = createTestEnemy();
        const result: number = getBaseStatForType(enemy, 'body');
        expect(result).toBe(enemy.enemyStats.physicalAttack);
    });
});

// ============================================================================
// ATTACK ROLL CALCULATIONS
// ============================================================================

describe('isAttackSuccessful', () => {
    it('should return true when attack roll equals defense roll', () => {
        const result: boolean = isAttackSuccessful(15, 15);
        expect(result).toBe(true);
    });

    it('should return true when attack roll exceeds defense roll', () => {
        const result: boolean = isAttackSuccessful(18, 12);
        expect(result).toBe(true);
    });

    it('should return false when attack roll is below defense roll', () => {
        const result: boolean = isAttackSuccessful(8, 15);
        expect(result).toBe(false);
    });
});

describe('isCriticalHit', () => {
    it('should return true for a roll of 20', () => {
        const result: boolean = isCriticalHit(20);
        expect(result).toBe(true);
    });

    it('should return false for any other roll', () => {
        for (let i = 1; i < 20; i++) {
            expect(isCriticalHit(i)).toBe(false);
        }
    });
});

describe('isCriticalMiss', () => {
    it('should return true for a roll of 1', () => {
        const result: boolean = isCriticalMiss(1);
        expect(result).toBe(true);
    });

    it('should return false for any other roll', () => {
        for (let i = 2; i <= 20; i++) {
            expect(isCriticalMiss(i)).toBe(false);
        }
    });
});

describe('performAttackRoll', () => {
    it('should include the skill modifier for the attacker', () => {
        const character: Character = createTestCharacter();
        const result = performAttackRoll(character, 'body', 'neutral');
        expect(result.modifier).toBe(character.derivedStats.physicalSkill);
    });

    it('should return a total that is roll + modifier', () => {
        const character: Character = createTestCharacter();
        const result = performAttackRoll(character, 'body', 'neutral');
        expect(result.total).toBe(result.roll + result.modifier);
    });

    it('should include details as a string', () => {
        const character: Character = createTestCharacter();
        const result = performAttackRoll(character, 'mind', 'neutral');
        expect(typeof result.details).toBe('string');
        expect(result.details.length).toBeGreaterThan(0);
    });
});

describe('performDefenseRoll', () => {
    it('should include the defense stat', () => {
        const enemy: Enemy = createTestEnemy();
        const result = performDefenseRoll(enemy, 'body', false);
        expect(result.modifier).toBe(enemy.enemyStats.physicalDefense);
    });

    it('should apply defend bonus when defending', () => {
        const character: Character = createTestCharacter();
        const resultNotDefending = performDefenseRoll(character, 'body', false);
        const expectedBonus: number = Math.floor(character.derivedStats.physicalDefense * 1.5);
        /* When defending, the modifier should be the floored 1.5x value */
        const resultDefending = performDefenseRoll(character, 'body', true);
        expect(resultDefending.modifier).toBe(expectedBonus);
    });
});

// ============================================================================
// DAMAGE CALCULATIONS
// ============================================================================

describe('calculateBaseDamage', () => {
    it('should calculate damage based on base stat and advantage modifier', () => {
        const character: Character = createTestCharacter();
        const result: number = calculateBaseDamage(character, 'body', 'neutral');
        expect(result).toBe(Math.floor(character.baseStats.body * 1.0));
    });

    it('should apply advantage modifier', () => {
        const character: Character = createTestCharacter();
        const adv: number = calculateBaseDamage(character, 'body', 'advantage');
        const neutral: number = calculateBaseDamage(character, 'body', 'neutral');
        expect(adv).toBeGreaterThanOrEqual(neutral);
    });

    it('should apply disadvantage modifier', () => {
        const character: Character = createTestCharacter();
        const disadv: number = calculateBaseDamage(character, 'body', 'disadvantage');
        const neutral: number = calculateBaseDamage(character, 'body', 'neutral');
        expect(disadv).toBeLessThanOrEqual(neutral);
    });
});

describe('calculateDamageReduction', () => {
    it('should return the defense stat when not defending', () => {
        const character: Character = createTestCharacter();
        const result: number = calculateDamageReduction(character, 'body', false);
        expect(result).toBe(character.derivedStats.physicalDefense);
    });

    it('should return a higher value when defending', () => {
        const character: Character = createTestCharacter();
        const normal: number = calculateDamageReduction(character, 'body', false);
        const defending: number = calculateDamageReduction(character, 'body', true);
        expect(defending).toBeGreaterThanOrEqual(normal);
    });

    it('should never return a negative value', () => {
        const enemy: Enemy = createTestEnemy();
        const result: number = calculateDamageReduction(enemy, 'body', false);
        expect(result).toBeGreaterThanOrEqual(0);
    });
});

describe('calculateFinalDamage', () => {
    it('should return base damage minus reduction for non-critical', () => {
        const result: number = calculateFinalDamage(10, 3, false);
        expect(result).toBe(7);
    });

    it('should double damage on critical hit before applying reduction', () => {
        const result: number = calculateFinalDamage(10, 3, true);
        expect(result).toBe(17);
    });

    it('should never return a negative value', () => {
        const result: number = calculateFinalDamage(2, 10, false);
        expect(result).toBe(0);
    });

    it('should return 0 when base damage equals reduction', () => {
        const result: number = calculateFinalDamage(5, 5, false);
        expect(result).toBe(0);
    });
});

describe('applyCriticalMultiplier', () => {
    it('should double the base damage', () => {
        const result: number = applyCriticalMultiplier(10);
        expect(result).toBe(20);
    });

    it('should return 0 for 0 base damage', () => {
        const result: number = applyCriticalMultiplier(0);
        expect(result).toBe(0);
    });
});

// ============================================================================
// HEALTH MANAGEMENT
// ============================================================================

describe('applyDamage', () => {
    it('should reduce character health by damage amount', () => {
        const character: Character = createTestCharacter();
        const result = applyDamage(character, 10) as Character;
        expect(result.health).toBe(character.health - 10);
    });

    it('should not reduce health below 0', () => {
        const character: Character = createTestCharacter();
        const result = applyDamage(character, character.health + 100) as Character;
        expect(result.health).toBe(0);
    });

    it('should not mutate the original character', () => {
        const character: Character = createTestCharacter();
        const originalHealth: number = character.health;
        applyDamage(character, 10);
        expect(character.health).toBe(originalHealth);
    });

    it('should work with enemies', () => {
        const enemy: Enemy = createTestEnemy();
        const result = applyDamage(enemy, 15) as Enemy;
        expect(result.health).toBe(enemy.health - 15);
    });
});

describe('healCharacter', () => {
    it('should increase character health', () => {
        const character: Character = { ...createTestCharacter(), health: 10 };
        const result = healCharacter(character, 5) as Character;
        expect(result.health).toBe(15);
    });

    it('should not exceed maxHealth', () => {
        const character: Character = createTestCharacter();
        const result = healCharacter(character, 999) as Character;
        expect(result.health).toBe(character.maxHealth);
    });

    it('should not mutate the original character', () => {
        const character: Character = { ...createTestCharacter(), health: 10 };
        const originalHealth: number = character.health;
        healCharacter(character, 5);
        expect(character.health).toBe(originalHealth);
    });

    it('should work with enemies', () => {
        const enemy: Enemy = { ...createTestEnemy(), health: 5 };
        const result = healCharacter(enemy, 10) as Enemy;
        expect(result.health).toBe(15);
    });

    it('should not exceed enemy maxHealth', () => {
        const enemy: Enemy = createTestEnemy();
        const result = healCharacter(enemy, 999) as Enemy;
        expect(result.health).toBe(enemy.enemyStats.maxHealth);
    });
});

describe('isAlive', () => {
    it('should return true when health > 0', () => {
        const character: Character = createTestCharacter();
        expect(isAlive(character)).toBe(true);
    });

    it('should return false when health is 0', () => {
        const character: Character = { ...createTestCharacter(), health: 0 };
        expect(isAlive(character)).toBe(false);
    });
});

describe('isDefeated', () => {
    it('should return false when health > 0', () => {
        const character: Character = createTestCharacter();
        expect(isDefeated(character)).toBe(false);
    });

    it('should return true when health is 0', () => {
        const character: Character = { ...createTestCharacter(), health: 0 };
        expect(isDefeated(character)).toBe(true);
    });
});

describe('getHealthPercentage', () => {
    it('should return 100 at full health', () => {
        const character: Character = createTestCharacter();
        const result: number = getHealthPercentage(character);
        expect(result).toBe(100);
    });

    it('should return 50 at half health', () => {
        const character: Character = createTestCharacter();
        character.health = character.maxHealth / 2;
        const result: number = getHealthPercentage({ ...character });
        expect(result).toBe(50);
    });

    it('should return 0 when health is 0', () => {
        const character: Character = { ...createTestCharacter(), health: 0 };
        const result: number = getHealthPercentage(character);
        expect(result).toBe(0);
    });

    it('should never exceed 100', () => {
        const character: Character = createTestCharacter();
        const result: number = getHealthPercentage(character);
        expect(result).toBeLessThanOrEqual(100);
    });
});

// ============================================================================
// COMBAT ROUND PROCESSING
// ============================================================================

describe('determineTurnOrder', () => {
    it('should return either player or enemy', () => {
        const player: Character = createTestCharacter();
        const enemy: Enemy = createTestEnemy();
        const results = new Set<string>();

        for (let i = 0; i < 50; i++) {
            results.add(determineTurnOrder(player, enemy));
        }

        expect(results.has('player') || results.has('enemy')).toBe(true);
    });
});

describe('rollInitiative', () => {
    it('should return a positive number for a character', () => {
        const character: Character = createTestCharacter();
        for (let i = 0; i < 50; i++) {
            const result: number = rollInitiative(character);
            expect(result).toBeGreaterThan(0);
        }
    });

    it('should return a positive number for an enemy', () => {
        const enemy: Enemy = createTestEnemy();
        for (let i = 0; i < 50; i++) {
            const result: number = rollInitiative(enemy);
            expect(result).toBeGreaterThan(0);
        }
    });
});

// ============================================================================
// BATTLE LOG UTILITIES
// ============================================================================

describe('createBattleLogEntry', () => {
    it('should create a log entry with the correct round', () => {
        const state: CombatState = createTestCombatState();
        const roundResults = {
            advantage: 'advantage' as Advantage,
            playerRoll: 15,
            playerRollDetails: 'Player rolls 15',
            enemyRoll: 10,
            enemyRollDetails: 'Enemy rolls 10',
            damageToPlayer: 2,
            damageToEnemy: 5,
        };

        const entry: BattleLogEntry = createBattleLogEntry(state, roundResults);
        expect(entry.round).toBe(state.round);
    });

    it('should include damage values', () => {
        const state: CombatState = createTestCombatState();
        const roundResults = {
            advantage: 'neutral' as Advantage,
            playerRoll: 12,
            playerRollDetails: 'roll details',
            enemyRoll: 8,
            enemyRollDetails: 'enemy details',
            damageToPlayer: 3,
            damageToEnemy: 7,
        };

        const entry: BattleLogEntry = createBattleLogEntry(state, roundResults);
        expect(entry.damageToPlayer).toBe(3);
        expect(entry.damageToEnemy).toBe(7);
    });

    it('should calculate HP after correctly', () => {
        const state: CombatState = createTestCombatState();
        const roundResults = {
            advantage: 'neutral' as Advantage,
            playerRoll: 12,
            playerRollDetails: 'roll details',
            enemyRoll: 8,
            enemyRollDetails: 'enemy details',
            damageToPlayer: 10,
            damageToEnemy: 15,
        };

        const entry: BattleLogEntry = createBattleLogEntry(state, roundResults);
        expect(entry.playerHPAfter).toBe(Math.max(0, state.player.health - 10));
        expect(entry.enemyHPAfter).toBe(Math.max(0, state.enemy.health - 15));
    });

    it('should include a result string', () => {
        const state: CombatState = createTestCombatState();
        const roundResults = {
            advantage: 'advantage' as Advantage,
            playerRoll: 15,
            playerRollDetails: 'details',
            enemyRoll: 10,
            enemyRollDetails: 'details',
            damageToPlayer: 0,
            damageToEnemy: 5,
        };

        const entry: BattleLogEntry = createBattleLogEntry(state, roundResults);
        expect(typeof entry.result).toBe('string');
        expect(entry.result.length).toBeGreaterThan(0);
    });
});

describe('formatAllBattleLogs', () => {
    it('should return an empty array when no logs exist', () => {
        const state: CombatState = createTestCombatState();
        const result: string[] = formatAllBattleLogs(state);
        expect(result).toEqual([]);
    });

    it('should return formatted strings for each log entry', () => {
        const entry: BattleLogEntry = {
            round: 1,
            playerAction: { type: 'body', action: 'attack' },
            enemyAction: { type: 'mind', action: 'defend' },
            advantage: 'advantage',
            playerRoll: 15,
            playerRollDetails: 'details',
            enemyRoll: 10,
            enemyRollDetails: 'details',
            damageToPlayer: 0,
            damageToEnemy: 5,
            playerHPAfter: 100,
            enemyHPAfter: 45,
            result: 'Round 1 result',
        };
        const state: CombatState = createTestCombatState({ logEntry: [entry] });
        const result: string[] = formatAllBattleLogs(state);
        expect(result).toHaveLength(1);
        expect(result[0]).toBe('Round 1 result');
    });
});

// ============================================================================
// COMBAT RESULT MESSAGES
// ============================================================================

describe('generateCombatResultMessage', () => {
    it('should generate a victory message when enemy is defeated', () => {
        const state: CombatState = createTestCombatState({
            enemy: { ...createTestEnemy(), health: 0 },
        });
        const result: string = generateCombatResultMessage(state);
        expect(result).toContain('Victory');
    });

    it('should generate a defeat message when player is defeated', () => {
        const state: CombatState = createTestCombatState({
            player: { ...createTestCharacter(), health: 0 },
        });
        const result: string = generateCombatResultMessage(state);
        expect(result).toContain('Defeat');
    });

    it('should generate a friendship message when friendship counter reaches 3', () => {
        const state: CombatState = createTestCombatState({
            friendshipCounter: 3,
        });
        const result: string = generateCombatResultMessage(state);
        expect(result).toContain('Friendship');
    });

    it('should generate an ongoing message when combat continues', () => {
        const state: CombatState = createTestCombatState();
        const result: string = generateCombatResultMessage(state);
        expect(result).toContain('ongoing');
    });
});
