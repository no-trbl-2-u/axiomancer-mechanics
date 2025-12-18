import { describe, it, expect } from 'vitest';
import {
    determineEnemyAction,
    determineAdvantage,
    getAdvantageModifier,
    hasAdvantage,
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
    processPlayerTurn,
    processEnemyTurn,
    determineTurnOrder,
    rollInitiative,
    createBattleLogEntry,
    formatAllBattleLogs,
    generateCombatResultMessage,
    isCombatOngoing,
    determineCombatEnd,
    resolveAttackVsAttack,
    resolveAttackVsDefend,
    resolvePlayerAttackVsEnemyDefend,
    resolveEnemyAttackVsPlayerDefend,
    resolveDefendVsDefend,
    resolveCombatRoundLogic,
} from './index';
import { ActionType, Advantage, CombatState, CombatAction } from './types';
import { createCharacter } from '../Character';
import { Disatree_01 } from '../Enemy/enemy.library';

// ============================================================================
// TEST DATA
// ============================================================================

const mockPlayer = createCharacter({
    name: 'Test Hero',
    level: 1,
    baseStats: { heart: 5, body: 5, mind: 5 }
});

const mockEnemy = { ...Disatree_01 };

const mockCombatState: CombatState = {
    active: true,
    phase: 'resolving',
    round: 1,
    friendshipCounter: 0,
    player: mockPlayer,
    enemy: mockEnemy,
    playerChoice: { type: 'body', action: 'attack' },
    enemyChoice: { type: 'heart', action: 'attack' },
    logEntry: [],
};

// ============================================================================
// COMBAT END CONDITIONS
// ============================================================================

describe.skip('isCombatOngoing', () => {
    it('should return true when both combatants have health > 0', () => {
        const state = { ...mockCombatState };
        expect(isCombatOngoing(state)).toBe(true);
    });

    it('should return false when player health <= 0', () => {
        const state = {
            ...mockCombatState,
            player: { ...mockPlayer, health: 0 }
        };
        expect(isCombatOngoing(state)).toBe(false);
    });

    it('should return false when enemy health <= 0', () => {
        const state = {
            ...mockCombatState,
            enemy: { ...mockEnemy, health: 0 }
        };
        expect(isCombatOngoing(state)).toBe(false);
    });
});

describe('determineCombatEnd', () => {
    it('should return "player" when enemy health <= 0', () => {
        const state = {
            ...mockCombatState,
            enemy: { ...mockEnemy, health: 0 }
        };
        expect(determineCombatEnd(state)).toBe('player');
    });

    it('should return "ko" when player health <= 0', () => {
        const state = {
            ...mockCombatState,
            player: { ...mockPlayer, health: 0 }
        };
        expect(determineCombatEnd(state)).toBe('ko');
    });

    it('should return "friendship" when friendship counter reaches 3', () => {
        const state = {
            ...mockCombatState,
            friendshipCounter: 3
        };
        expect(determineCombatEnd(state)).toBe('friendship');
    });

    it('should return "ongoing" when combat should continue', () => {
        const state = { ...mockCombatState };
        expect(determineCombatEnd(state)).toBe('ongoing');
    });
});

// ============================================================================
// TYPE ADVANTAGE SYSTEM
// ============================================================================

describe('determineAdvantage', () => {
    it('should return "neutral" when both types are the same', () => {
        expect(determineAdvantage('heart', 'heart')).toBe('neutral');
        expect(determineAdvantage('body', 'body')).toBe('neutral');
        expect(determineAdvantage('mind', 'mind')).toBe('neutral');
    });

    it('should return "advantage" for heart vs body', () => {
        expect(determineAdvantage('heart', 'body')).toBe('advantage');
    });

    it('should return "advantage" for body vs mind', () => {
        expect(determineAdvantage('body', 'mind')).toBe('advantage');
    });

    it('should return "advantage" for mind vs heart', () => {
        expect(determineAdvantage('mind', 'heart')).toBe('advantage');
    });

    it('should return "disadvantage" for body vs heart', () => {
        expect(determineAdvantage('body', 'heart')).toBe('disadvantage');
    });

    it('should return "disadvantage" for mind vs body', () => {
        expect(determineAdvantage('mind', 'body')).toBe('disadvantage');
    });

    it('should return "disadvantage" for heart vs mind', () => {
        expect(determineAdvantage('heart', 'mind')).toBe('disadvantage');
    });
});

describe.skip('getAdvantageModifier', () => {
    it('should return 1.5 for advantage', () => {
        expect(getAdvantageModifier('advantage')).toBe(1.5);
    });

    it('should return 0.75 for disadvantage', () => {
        expect(getAdvantageModifier('disadvantage')).toBe(0.75);
    });

    it('should return 1.0 for neutral', () => {
        expect(getAdvantageModifier('neutral')).toBe(1.0);
    });
});

describe.skip('hasAdvantage', () => {
    it('should return true for heart vs body', () => {
        expect(hasAdvantage('heart', 'body')).toBe(true);
    });

    it('should return true for body vs mind', () => {
        expect(hasAdvantage('body', 'mind')).toBe(true);
    });

    it('should return true for mind vs heart', () => {
        expect(hasAdvantage('mind', 'heart')).toBe(true);
    });

    it('should return false for same types', () => {
        expect(hasAdvantage('heart', 'heart')).toBe(false);
    });

    it('should return false for disadvantaged matchups', () => {
        expect(hasAdvantage('body', 'heart')).toBe(false);
    });
});

// ============================================================================
// ENEMY ACTIONS
// ============================================================================

describe('determineEnemyAction', () => {
    it('should return a valid combat action for random logic', () => {
        const action = determineEnemyAction('random');
        expect(['heart', 'body', 'mind']).toContain(action.type);
        expect(['attack', 'defend']).toContain(action.action);
    });

    it('should default to random logic for unknown logic types', () => {
        const action = determineEnemyAction('balanced');
        expect(['heart', 'body', 'mind']).toContain(action.type);
        expect(['attack', 'defend']).toContain(action.action);
    });
});

describe.skip('generateEnemyAttackType', () => {
    it('should return a valid action type', () => {
        const type = generateEnemyAttackType(mockCombatState, mockEnemy);
        expect(['heart', 'body', 'mind']).toContain(type);
    });
});

describe.skip('generateEnemyAction', () => {
    it('should return a valid action', () => {
        const action = generateEnemyAction(mockCombatState, mockEnemy);
        expect(['attack', 'defend', 'skill', 'item', 'flee', 'back']).toContain(action);
    });
});

describe.skip('isValidCombatAction', () => {
    it('should return true for a complete combat action', () => {
        const action: CombatAction = { type: 'body', action: 'attack' };
        expect(isValidCombatAction(action)).toBe(true);
    });

    it('should return false for an incomplete combat action', () => {
        const action: Partial<CombatAction> = { type: 'body' };
        expect(isValidCombatAction(action)).toBe(false);
    });

    it('should return false for an empty object', () => {
        const action: Partial<CombatAction> = {};
        expect(isValidCombatAction(action)).toBe(false);
    });
});

// ============================================================================
// DICE ROLLING SYSTEM
// ============================================================================

describe.skip('rollDie', () => {
    it('should return a number between 1 and the specified sides', () => {
        for (let i = 0; i < 100; i++) {
            const result = rollDie(20);
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(20);
        }
    });

    it('should always return 1 for a d1', () => {
        expect(rollDie(1)).toBe(1);
    });
});

describe.skip('rollDice', () => {
    it('should return the correct number of dice rolls', () => {
        const result = rollDice(3, 6);
        expect(result.rolls).toHaveLength(3);
    });

    it('should return a sum equal to the sum of individual rolls', () => {
        const result = rollDice(3, 6);
        const calculatedSum = result.rolls.reduce((a, b) => a + b, 0);
        expect(result.sum).toBe(calculatedSum);
    });

    it('should have all individual rolls within valid range', () => {
        const result = rollDice(5, 8);
        result.rolls.forEach(roll => {
            expect(roll).toBeGreaterThanOrEqual(1);
            expect(roll).toBeLessThanOrEqual(8);
        });
    });
});

describe.skip('rollD20', () => {
    it('should return a number between 1 and 20', () => {
        for (let i = 0; i < 100; i++) {
            const result = rollD20();
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(20);
        }
    });
});

describe.skip('rollWithAdvantage', () => {
    it('should return the higher of two rolls', () => {
        for (let i = 0; i < 50; i++) {
            const result = rollWithAdvantage(20);
            expect(result.result).toBe(Math.max(...result.rolls));
        }
    });

    it('should return exactly two rolls', () => {
        const result = rollWithAdvantage(20);
        expect(result.rolls).toHaveLength(2);
    });
});

describe.skip('rollWithDisadvantage', () => {
    it('should return the lower of two rolls', () => {
        for (let i = 0; i < 50; i++) {
            const result = rollWithDisadvantage(20);
            expect(result.result).toBe(Math.min(...result.rolls));
        }
    });

    it('should return exactly two rolls', () => {
        const result = rollWithDisadvantage(20);
        expect(result.rolls).toHaveLength(2);
    });
});

describe.skip('rollSkillCheck', () => {
    it('should include the base stat as modifier', () => {
        const result = rollSkillCheck(5, 'neutral');
        expect(result.modifier).toBe(5);
    });

    it('should calculate total as roll plus modifier', () => {
        const result = rollSkillCheck(3, 'neutral');
        expect(result.total).toBe(result.roll + result.modifier);
    });
});

// ============================================================================
// STAT-BASED CALCULATIONS
// ============================================================================

describe.skip('getSkillStatForType', () => {
    it('should return physicalSkill for body type', () => {
        expect(getSkillStatForType(mockPlayer, 'body')).toBe(mockPlayer.derivedStats.physicalSkill);
    });

    it('should return mentalSkill for mind type', () => {
        expect(getSkillStatForType(mockPlayer, 'mind')).toBe(mockPlayer.derivedStats.mentalSkill);
    });

    it('should return emotionalSkill for heart type', () => {
        expect(getSkillStatForType(mockPlayer, 'heart')).toBe(mockPlayer.derivedStats.emotionalSkill);
    });
});

describe.skip('getDefenseStatForType', () => {
    it('should return physicalDefense for body type', () => {
        expect(getDefenseStatForType(mockPlayer, 'body')).toBe(mockPlayer.derivedStats.physicalDefense);
    });

    it('should return mentalDefense for mind type', () => {
        expect(getDefenseStatForType(mockPlayer, 'mind')).toBe(mockPlayer.derivedStats.mentalDefense);
    });

    it('should return emotionalDefense for heart type', () => {
        expect(getDefenseStatForType(mockPlayer, 'heart')).toBe(mockPlayer.derivedStats.emotionalDefense);
    });
});

describe.skip('getSaveStatForType', () => {
    it('should return physicalSave for body type', () => {
        expect(getSaveStatForType(mockPlayer, 'body')).toBe(mockPlayer.derivedStats.physicalSave);
    });

    it('should return mentalSave for mind type', () => {
        expect(getSaveStatForType(mockPlayer, 'mind')).toBe(mockPlayer.derivedStats.mentalSave);
    });

    it('should return emotionalSave for heart type', () => {
        expect(getSaveStatForType(mockPlayer, 'heart')).toBe(mockPlayer.derivedStats.emotionalSave);
    });
});

describe.skip('getBaseStatForType', () => {
    it('should return body stat for body type', () => {
        expect(getBaseStatForType(mockPlayer, 'body')).toBe(mockPlayer.baseStats.body);
    });

    it('should return mind stat for mind type', () => {
        expect(getBaseStatForType(mockPlayer, 'mind')).toBe(mockPlayer.baseStats.mind);
    });

    it('should return heart stat for heart type', () => {
        expect(getBaseStatForType(mockPlayer, 'heart')).toBe(mockPlayer.baseStats.heart);
    });
});

// ============================================================================
// ATTACK ROLL CALCULATIONS
// ============================================================================

describe.skip('performAttackRoll', () => {
    it('should return a total, roll, modifier, and details', () => {
        const result = performAttackRoll(mockPlayer, 'body', 'neutral');
        expect(result).toHaveProperty('total');
        expect(result).toHaveProperty('roll');
        expect(result).toHaveProperty('modifier');
        expect(result).toHaveProperty('details');
    });

    it('should calculate total as roll plus modifier', () => {
        const result = performAttackRoll(mockPlayer, 'body', 'neutral');
        expect(result.total).toBe(result.roll + result.modifier);
    });
});

describe.skip('performDefenseRoll', () => {
    it('should return a total, roll, modifier, and details', () => {
        const result = performDefenseRoll(mockPlayer, 'body', false);
        expect(result).toHaveProperty('total');
        expect(result).toHaveProperty('roll');
        expect(result).toHaveProperty('modifier');
        expect(result).toHaveProperty('details');
    });

    it('should have higher modifier when actively defending', () => {
        const normalDefense = performDefenseRoll(mockPlayer, 'body', false);
        const activeDefense = performDefenseRoll(mockPlayer, 'body', true);
        expect(activeDefense.modifier).toBeGreaterThan(normalDefense.modifier);
    });
});

describe.skip('isAttackSuccessful', () => {
    it('should return true when attack roll > defense roll', () => {
        expect(isAttackSuccessful(15, 10)).toBe(true);
    });

    it('should return false when attack roll < defense roll', () => {
        expect(isAttackSuccessful(10, 15)).toBe(false);
    });

    it('should return false on a tie', () => {
        expect(isAttackSuccessful(10, 10)).toBe(false);
    });
});

describe.skip('isCriticalHit', () => {
    it('should return true for a natural 20', () => {
        expect(isCriticalHit(20)).toBe(true);
    });

    it('should return false for any other roll', () => {
        expect(isCriticalHit(19)).toBe(false);
        expect(isCriticalHit(1)).toBe(false);
    });
});

describe.skip('isCriticalMiss', () => {
    it('should return true for a natural 1', () => {
        expect(isCriticalMiss(1)).toBe(true);
    });

    it('should return false for any other roll', () => {
        expect(isCriticalMiss(2)).toBe(false);
        expect(isCriticalMiss(20)).toBe(false);
    });
});

// ============================================================================
// DAMAGE CALCULATIONS
// ============================================================================

describe.skip('calculateBaseDamage', () => {
    it('should return a positive damage value', () => {
        const damage = calculateBaseDamage(mockPlayer, 'body', 'neutral');
        expect(damage).toBeGreaterThan(0);
    });

    it('should factor in advantage', () => {
        const neutralDamage = calculateBaseDamage(mockPlayer, 'body', 'neutral');
        const advantageDamage = calculateBaseDamage(mockPlayer, 'body', 'advantage');
        expect(advantageDamage).toBeGreaterThanOrEqual(neutralDamage);
    });
});

describe.skip('calculateDamageReduction', () => {
    it('should return a positive reduction value', () => {
        const reduction = calculateDamageReduction(mockPlayer, 'body', false);
        expect(reduction).toBeGreaterThanOrEqual(0);
    });

    it('should be higher when defending', () => {
        const normalReduction = calculateDamageReduction(mockPlayer, 'body', false);
        const defendingReduction = calculateDamageReduction(mockPlayer, 'body', true);
        expect(defendingReduction).toBeGreaterThan(normalReduction);
    });
});

describe.skip('calculateFinalDamage', () => {
    it('should return base damage minus reduction', () => {
        expect(calculateFinalDamage(20, 5, false)).toBe(15);
    });

    it('should never return negative damage', () => {
        expect(calculateFinalDamage(5, 20, false)).toBe(0);
    });

    it('should apply critical multiplier when critical is true', () => {
        const normalDamage = calculateFinalDamage(20, 5, false);
        const criticalDamage = calculateFinalDamage(20, 5, true);
        expect(criticalDamage).toBeGreaterThan(normalDamage);
    });
});

describe.skip('applyCriticalMultiplier', () => {
    it('should double the base damage', () => {
        expect(applyCriticalMultiplier(10)).toBe(20);
    });

    it('should work with zero damage', () => {
        expect(applyCriticalMultiplier(0)).toBe(0);
    });
});

describe.skip('calculateAttackDamage', () => {
    it('should return a complete damage calculation result', () => {
        const result = calculateAttackDamage(
            mockPlayer,
            mockEnemy,
            'body',
            'neutral',
            false
        );
        expect(result).toHaveProperty('damage');
        expect(result).toHaveProperty('attackRoll');
        expect(result).toHaveProperty('defenseRoll');
        expect(result).toHaveProperty('hit');
        expect(result).toHaveProperty('critical');
        expect(result).toHaveProperty('details');
    });
});

// ============================================================================
// HEALTH MANAGEMENT
// ============================================================================

describe.skip('applyDamage', () => {
    it('should reduce health by the damage amount', () => {
        const result = applyDamage(mockPlayer, 10);
        expect(result.health).toBe(mockPlayer.health - 10);
    });

    it('should not reduce health below 0', () => {
        const result = applyDamage(mockPlayer, 9999);
        expect(result.health).toBe(0);
    });

    it('should return a new character object (immutable)', () => {
        const result = applyDamage(mockPlayer, 10);
        expect(result).not.toBe(mockPlayer);
    });
});

describe.skip('healCharacter', () => {
    it('should increase health by the heal amount', () => {
        const damagedPlayer = { ...mockPlayer, health: 10 };
        const result = healCharacter(damagedPlayer, 5);
        expect(result.health).toBe(15);
    });

    it('should not exceed maxHealth', () => {
        const result = healCharacter(mockPlayer, 9999);
        expect(result.health).toBe(mockPlayer.maxHealth);
    });

    it('should return a new character object (immutable)', () => {
        const result = healCharacter(mockPlayer, 10);
        expect(result).not.toBe(mockPlayer);
    });
});

describe.skip('isAlive', () => {
    it('should return true when health > 0', () => {
        expect(isAlive(mockPlayer)).toBe(true);
    });

    it('should return false when health <= 0', () => {
        const deadPlayer = { ...mockPlayer, health: 0 };
        expect(isAlive(deadPlayer)).toBe(false);
    });
});

describe.skip('isDefeated', () => {
    it('should return false when health > 0', () => {
        expect(isDefeated(mockPlayer)).toBe(false);
    });

    it('should return true when health <= 0', () => {
        const deadPlayer = { ...mockPlayer, health: 0 };
        expect(isDefeated(deadPlayer)).toBe(true);
    });
});

describe.skip('getHealthPercentage', () => {
    it('should return 100 when at full health', () => {
        expect(getHealthPercentage(mockPlayer)).toBe(100);
    });

    it('should return 50 when at half health', () => {
        const halfHealthPlayer = { ...mockPlayer, health: mockPlayer.maxHealth / 2 };
        expect(getHealthPercentage(halfHealthPlayer)).toBe(50);
    });

    it('should return 0 when at zero health', () => {
        const deadPlayer = { ...mockPlayer, health: 0 };
        expect(getHealthPercentage(deadPlayer)).toBe(0);
    });
});

// ============================================================================
// COMBAT ROUND PROCESSING
// ============================================================================

describe.skip('processPlayerTurn', () => {
    it('should return damage, roll, and roll details', () => {
        const result = processPlayerTurn(mockCombatState);
        expect(result).toHaveProperty('damageToEnemy');
        expect(result).toHaveProperty('playerRoll');
        expect(result).toHaveProperty('playerRollDetails');
    });
});

describe.skip('processEnemyTurn', () => {
    it('should return damage, roll, and roll details', () => {
        const result = processEnemyTurn(mockCombatState);
        expect(result).toHaveProperty('damageToPlayer');
        expect(result).toHaveProperty('enemyRoll');
        expect(result).toHaveProperty('enemyRollDetails');
    });
});

describe.skip('determineTurnOrder', () => {
    it('should return either "player" or "enemy"', () => {
        const result = determineTurnOrder(mockPlayer, mockEnemy);
        expect(['player', 'enemy']).toContain(result);
    });
});

describe.skip('rollInitiative', () => {
    it('should return a positive number', () => {
        const result = rollInitiative(mockPlayer);
        expect(result).toBeGreaterThan(0);
    });
});

// ============================================================================
// BATTLE LOG UTILITIES
// ============================================================================

describe.skip('createBattleLogEntry', () => {
    it('should create a battle log entry with all required fields', () => {
        const result = createBattleLogEntry(mockCombatState, {
            advantage: 'neutral',
            playerRoll: 15,
            playerRollDetails: 'Roll: 15',
            enemyRoll: 10,
            enemyRollDetails: 'Roll: 10',
            damageToPlayer: 0,
            damageToEnemy: 5,
        });
        expect(result).toHaveProperty('round');
        expect(result).toHaveProperty('playerAction');
        expect(result).toHaveProperty('enemyAction');
        expect(result).toHaveProperty('advantage');
        expect(result).toHaveProperty('playerRoll');
        expect(result).toHaveProperty('enemyRoll');
        expect(result).toHaveProperty('damageToPlayer');
        expect(result).toHaveProperty('damageToEnemy');
    });
});

describe.skip('formatAllBattleLogs', () => {
    it('should return an array of strings', () => {
        const result = formatAllBattleLogs(mockCombatState);
        expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when no logs exist', () => {
        const result = formatAllBattleLogs(mockCombatState);
        expect(result).toHaveLength(0);
    });
});

describe.skip('generateCombatResultMessage', () => {
    it('should return a string message', () => {
        const result = generateCombatResultMessage(mockCombatState);
        expect(typeof result).toBe('string');
    });
});

// ============================================================================
// COMBAT RESOLUTION LOGIC (IMPLEMENTED)
// ============================================================================

describe('resolveAttackVsAttack', () => {
    it('should return player as winner when player roll is higher', () => {
        const result = resolveAttackVsAttack({
            playerRoll: 15,
            playerRollModifier: 5,
            playerDamageRoll: 12,
            enemyRoll: 10,
            enemyRollModifier: 3,
            enemyDamageRoll: 8,
            playerDefenseStat: 5,
            enemyDefenseStat: 4,
        });
        expect(result.winner).toBe('player');
        expect(result.damageToEnemy).toBeGreaterThan(0);
        expect(result.damageToPlayer).toBe(0);
    });

    it('should return enemy as winner when enemy roll is higher', () => {
        const result = resolveAttackVsAttack({
            playerRoll: 10,
            playerRollModifier: 3,
            playerDamageRoll: 8,
            enemyRoll: 15,
            enemyRollModifier: 5,
            enemyDamageRoll: 12,
            playerDefenseStat: 4,
            enemyDefenseStat: 5,
        });
        expect(result.winner).toBe('enemy');
        expect(result.damageToPlayer).toBeGreaterThan(0);
        expect(result.damageToEnemy).toBe(0);
    });

    it('should return tie when rolls are equal', () => {
        const result = resolveAttackVsAttack({
            playerRoll: 10,
            playerRollModifier: 5,
            playerDamageRoll: 10,
            enemyRoll: 10,
            enemyRollModifier: 5,
            enemyDamageRoll: 10,
            playerDefenseStat: 5,
            enemyDefenseStat: 5,
        });
        expect(result.winner).toBe('tie');
        expect(result.damageToPlayer).toBe(0);
        expect(result.damageToEnemy).toBe(0);
    });

    it('should not deal negative damage (minimum 0)', () => {
        const result = resolveAttackVsAttack({
            playerRoll: 20,
            playerRollModifier: 5,
            playerDamageRoll: 5,
            enemyRoll: 1,
            enemyRollModifier: 1,
            enemyDamageRoll: 5,
            playerDefenseStat: 100,
            enemyDefenseStat: 100,
        });
        expect(result.damageToEnemy).toBe(0);
    });

    it('should include roll totals in result', () => {
        const result = resolveAttackVsAttack({
            playerRoll: 10,
            playerRollModifier: 5,
            playerDamageRoll: 10,
            enemyRoll: 8,
            enemyRollModifier: 3,
            enemyDamageRoll: 10,
            playerDefenseStat: 5,
            enemyDefenseStat: 5,
        });
        expect(result.playerRoll).toBe(15);
        expect(result.enemyRoll).toBe(11);
    });
});

describe('resolveAttackVsDefend', () => {
    it('should apply defense multiplier to defender stat', () => {
        const result = resolveAttackVsDefend({
            attackerDamageRoll: 20,
            defenderDefenseStat: 10,
            defenseMultiplier: 1.5,
        });
        // 20 - (10 * 1.5) = 20 - 15 = 5
        expect(result.damage).toBe(5);
    });

    it('should use default 1.5x multiplier if not specified', () => {
        const result = resolveAttackVsDefend({
            attackerDamageRoll: 20,
            defenderDefenseStat: 10,
        });
        expect(result.damage).toBe(5);
    });

    it('should not deal negative damage', () => {
        const result = resolveAttackVsDefend({
            attackerDamageRoll: 5,
            defenderDefenseStat: 20,
        });
        expect(result.damage).toBe(0);
    });
});

describe('resolvePlayerAttackVsEnemyDefend', () => {
    it('should return player as winner when damage is dealt', () => {
        const result = resolvePlayerAttackVsEnemyDefend(20, 5);
        expect(result.winner).toBe('player');
        expect(result.damageToEnemy).toBeGreaterThan(0);
        expect(result.damageToPlayer).toBe(0);
    });

    it('should return tie when no damage is dealt', () => {
        const result = resolvePlayerAttackVsEnemyDefend(5, 20);
        expect(result.winner).toBe('tie');
        expect(result.damageToEnemy).toBe(0);
    });

    it('should apply 1.5x defense bonus', () => {
        // 15 - (10 * 1.5) = 15 - 15 = 0
        const result = resolvePlayerAttackVsEnemyDefend(15, 10);
        expect(result.damageToEnemy).toBe(0);
    });
});

describe('resolveEnemyAttackVsPlayerDefend', () => {
    it('should return enemy as winner when damage is dealt', () => {
        const result = resolveEnemyAttackVsPlayerDefend(20, 5);
        expect(result.winner).toBe('enemy');
        expect(result.damageToPlayer).toBeGreaterThan(0);
        expect(result.damageToEnemy).toBe(0);
    });

    it('should return tie when no damage is dealt', () => {
        const result = resolveEnemyAttackVsPlayerDefend(5, 20);
        expect(result.winner).toBe('tie');
        expect(result.damageToPlayer).toBe(0);
    });
});

describe('resolveDefendVsDefend', () => {
    it('should increment friendship counter by 1', () => {
        const result = resolveDefendVsDefend(0);
        expect(result.newFriendship).toBe(1);
    });

    it('should continue incrementing from current value', () => {
        const result = resolveDefendVsDefend(2);
        expect(result.newFriendship).toBe(3);
    });

    it('should include a description mentioning friendship', () => {
        const result = resolveDefendVsDefend(0);
        expect(result.description.toLowerCase()).toContain('friend');
    });
});

describe('resolveCombatRoundLogic', () => {
    const baseParams = {
        playerType: 'body' as ActionType,
        playerRoll: 10,
        playerRollModifier: 5,
        playerDamageRoll: 15,
        playerDefenseStat: 8,
        enemyType: 'heart' as ActionType,
        enemyRoll: 8,
        enemyRollModifier: 4,
        enemyDamageRoll: 12,
        enemyDefenseStat: 6,
        currentFriendship: 0,
    };

    it('should handle attack vs attack', () => {
        const result = resolveCombatRoundLogic({
            ...baseParams,
            playerAction: 'attack',
            enemyAction: 'attack',
        });
        expect(['player', 'enemy', 'tie']).toContain(result.winner);
        expect(result.friendshipChange).toBe(0);
    });

    it('should handle player attack vs enemy defend', () => {
        const result = resolveCombatRoundLogic({
            ...baseParams,
            playerAction: 'attack',
            enemyAction: 'defend',
        });
        expect(result.damageToPlayer).toBe(0);
        expect(result.friendshipChange).toBe(0);
    });

    it('should handle player defend vs enemy attack', () => {
        const result = resolveCombatRoundLogic({
            ...baseParams,
            playerAction: 'defend',
            enemyAction: 'attack',
        });
        expect(result.damageToEnemy).toBe(0);
        expect(result.friendshipChange).toBe(0);
    });

    it('should handle defend vs defend with friendship increase', () => {
        const result = resolveCombatRoundLogic({
            ...baseParams,
            playerAction: 'defend',
            enemyAction: 'defend',
        });
        expect(result.winner).toBe('tie');
        expect(result.damageToPlayer).toBe(0);
        expect(result.damageToEnemy).toBe(0);
        expect(result.friendshipChange).toBe(1);
        expect(result.newFriendship).toBe(1);
    });

    it('should handle other action types as no combat', () => {
        const result = resolveCombatRoundLogic({
            ...baseParams,
            playerAction: 'skill',
            enemyAction: 'item',
        });
        expect(result.winner).toBe('tie');
        expect(result.friendshipChange).toBe(0);
    });
});
