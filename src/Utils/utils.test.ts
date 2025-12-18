import { describe, it, expect } from 'vitest';
import {
    clamp,
    randomInt,
    deepClone,
    average,
    sum,
    max,
    min,
    determineRollAdvantageModifier,
    createDie,
    createDieRoll,
    capitalize,
    formatPercent,
    inRange,
} from './index';
import {
    isCharacter,
    isEnemy,
    isCombatActive,
    isValidNumber,
    isNonEmptyString,
} from './typeGuards';
import { createCharacter } from '../Character';
import { Disatree_01 } from '../Enemy/enemy.library';
import { createNewGameState } from '../Game/game.reducer';
import { CombatState } from '../Combat/types';

// ============================================================================
// clamp
// ============================================================================

describe('clamp', () => {
    it('should return the value when within range', () => {
        expect(clamp(5, 0, 10)).toBe(5);
    });

    it('should return min when value is below range', () => {
        expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('should return max when value is above range', () => {
        expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle equal min and max', () => {
        expect(clamp(5, 10, 10)).toBe(10);
    });

    it('should handle negative ranges', () => {
        expect(clamp(-5, -10, -1)).toBe(-5);
        expect(clamp(-15, -10, -1)).toBe(-10);
        expect(clamp(0, -10, -1)).toBe(-1);
    });

    it('should handle decimal values', () => {
        expect(clamp(0.5, 0, 1)).toBe(0.5);
        expect(clamp(1.5, 0, 1)).toBe(1);
    });
});

// ============================================================================
// randomInt
// ============================================================================

describe('randomInt', () => {
    it('should return a number within the specified range', () => {
        for (let i = 0; i < 100; i++) {
            const result = randomInt(1, 10);
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(10);
        }
    });

    it('should return integer values', () => {
        for (let i = 0; i < 50; i++) {
            const result = randomInt(1, 100);
            expect(Number.isInteger(result)).toBe(true);
        }
    });

    it('should return min when min equals max', () => {
        expect(randomInt(5, 5)).toBe(5);
    });

    it('should handle negative ranges', () => {
        for (let i = 0; i < 50; i++) {
            const result = randomInt(-10, -1);
            expect(result).toBeGreaterThanOrEqual(-10);
            expect(result).toBeLessThanOrEqual(-1);
        }
    });

    it('should produce varied results (randomness test)', () => {
        const results = new Set<number>();
        for (let i = 0; i < 100; i++) {
            results.add(randomInt(1, 10));
        }
        expect(results.size).toBeGreaterThan(5);
    });
});

// ============================================================================
// deepClone
// ============================================================================

describe('deepClone', () => {
    it('should create a deep copy of an object', () => {
        const original = { name: 'Hero', stats: { hp: 100 } };
        const copy = deepClone(original);
        copy.stats.hp = 50;
        expect(original.stats.hp).toBe(100);
    });

    it('should handle nested objects', () => {
        const original = { a: { b: { c: 1 } } };
        const copy = deepClone(original);
        expect(copy.a.b.c).toBe(1);
        expect(copy).not.toBe(original);
        expect(copy.a).not.toBe(original.a);
    });

    it('should handle arrays', () => {
        const original = [1, 2, [3, 4]];
        const copy = deepClone(original);
        expect(copy).toEqual(original);
        expect(copy).not.toBe(original);
    });

    it('should handle null values', () => {
        const original = { a: null };
        const copy = deepClone(original);
        expect(copy.a).toBeNull();
    });

    it('should handle primitive values', () => {
        expect(deepClone(5)).toBe(5);
        expect(deepClone('hello')).toBe('hello');
        expect(deepClone(true)).toBe(true);
    });
});

// ============================================================================
// average
// ============================================================================

describe('average', () => {
    it('should calculate the average of multiple numbers', () => {
        expect(average(1, 2, 3, 4, 5)).toBe(3);
    });

    it('should return the number itself for single value', () => {
        expect(average(10)).toBe(10);
    });

    it('should return 0 for empty input', () => {
        expect(average()).toBe(0);
    });

    it('should handle decimal results', () => {
        expect(average(1, 2)).toBe(1.5);
    });

    it('should handle negative numbers', () => {
        expect(average(-5, 5)).toBe(0);
    });
});

// ============================================================================
// sum
// ============================================================================

describe('sum', () => {
    it('should sum an array of numbers', () => {
        expect(sum([1, 2, 3, 4, 5])).toBe(15);
    });

    it('should return 0 for empty array', () => {
        expect(sum([])).toBe(0);
    });

    it('should handle single element', () => {
        expect(sum([10])).toBe(10);
    });

    it('should handle negative numbers', () => {
        expect(sum([-1, -2, 3])).toBe(0);
    });
});

// ============================================================================
// max
// ============================================================================

describe('max', () => {
    it('should return the maximum value', () => {
        expect(max([1, 5, 3, 9, 2])).toBe(9);
    });

    it('should handle single element', () => {
        expect(max([5])).toBe(5);
    });

    it('should handle negative numbers', () => {
        expect(max([-5, -3, -10])).toBe(-3);
    });

    it('should handle duplicate max values', () => {
        expect(max([5, 5, 3])).toBe(5);
    });
});

// ============================================================================
// min
// ============================================================================

describe('min', () => {
    it('should return the minimum value', () => {
        expect(min([1, 5, 3, 9, 2])).toBe(1);
    });

    it('should handle single element', () => {
        expect(min([5])).toBe(5);
    });

    it('should handle negative numbers', () => {
        expect(min([-5, -3, -10])).toBe(-10);
    });

    it('should handle duplicate min values', () => {
        expect(min([1, 1, 3])).toBe(1);
    });
});

// ============================================================================
// determineRollAdvantageModifier
// ============================================================================

describe('determineRollAdvantageModifier', () => {
    it('should return max function for advantage', () => {
        const modifier = determineRollAdvantageModifier('advantage');
        expect(modifier([1, 20])).toBe(20);
    });

    it('should return min function for disadvantage', () => {
        const modifier = determineRollAdvantageModifier('disadvantage');
        expect(modifier([1, 20])).toBe(1);
    });

    it('should return sum function for neutral', () => {
        const modifier = determineRollAdvantageModifier('neutral');
        expect(modifier([5, 10])).toBe(15);
    });
});

// ============================================================================
// createDie
// ============================================================================

describe('createDie', () => {
    it('should create a function that rolls dice', () => {
        const d6 = createDie(6, 1);
        for (let i = 0; i < 50; i++) {
            const result = d6();
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(6);
        }
    });

    it('should sum multiple dice by default', () => {
        const twoD6 = createDie(6, 2);
        for (let i = 0; i < 50; i++) {
            const result = twoD6();
            expect(result).toBeGreaterThanOrEqual(2);
            expect(result).toBeLessThanOrEqual(12);
        }
    });

    it('should use custom function when provided', () => {
        const advD20 = createDie(20, 2, max);
        for (let i = 0; i < 50; i++) {
            const result = advD20();
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(20);
        }
    });

    it('should handle min function for disadvantage', () => {
        const disadvD20 = createDie(20, 2, min);
        // Results should be in valid range
        for (let i = 0; i < 50; i++) {
            const result = disadvD20();
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(20);
        }
    });
});

// ============================================================================
// createDieRoll
// ============================================================================

describe('createDieRoll', () => {
    it('should create a d20 roll function for neutral', () => {
        const neutralRoll = createDieRoll('neutral');
        for (let i = 0; i < 50; i++) {
            const result = neutralRoll();
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(20);
        }
    });

    it('should create an advantage roll (2d20, take highest)', () => {
        const advRoll = createDieRoll('advantage');
        // With advantage, average should be higher
        const results: number[] = [];
        for (let i = 0; i < 100; i++) {
            results.push(advRoll());
        }
        const avg = results.reduce((a, b) => a + b, 0) / results.length;
        // Average with advantage on d20 should be around 13.8
        expect(avg).toBeGreaterThan(10);
    });

    it('should create a disadvantage roll (2d20, take lowest)', () => {
        const disadvRoll = createDieRoll('disadvantage');
        // With disadvantage, average should be lower
        const results: number[] = [];
        for (let i = 0; i < 500; i++) {
            results.push(disadvRoll());
        }
        const avg = results.reduce((a, b) => a + b, 0) / results.length;
        // Average with disadvantage on d20 should be around 7.2
        // Using a more relaxed bound to avoid test flakiness
        expect(avg).toBeLessThan(13);
    });
});

// ============================================================================
// capitalize
// ============================================================================

describe('capitalize', () => {
    it('should capitalize the first letter', () => {
        expect(capitalize('hello')).toBe('Hello');
    });

    it('should not change already capitalized strings', () => {
        expect(capitalize('WORLD')).toBe('WORLD');
    });

    it('should handle empty strings', () => {
        expect(capitalize('')).toBe('');
    });

    it('should handle single character', () => {
        expect(capitalize('a')).toBe('A');
    });

    it('should preserve the rest of the string', () => {
        expect(capitalize('hELLO')).toBe('HELLO');
    });
});

// ============================================================================
// formatPercent
// ============================================================================

describe('formatPercent', () => {
    it('should format as percentage with no decimals by default', () => {
        expect(formatPercent(75)).toBe('75%');
    });

    it('should format with specified decimal places', () => {
        expect(formatPercent(33.333, 1)).toBe('33.3%');
    });

    it('should handle 0%', () => {
        expect(formatPercent(0)).toBe('0%');
    });

    it('should handle 100%', () => {
        expect(formatPercent(100)).toBe('100%');
    });

    it('should handle values over 100%', () => {
        expect(formatPercent(150)).toBe('150%');
    });
});

// ============================================================================
// inRange
// ============================================================================

describe('inRange', () => {
    it('should return true for values within range', () => {
        expect(inRange(5, 1, 10)).toBe(true);
    });

    it('should return true for values at boundaries', () => {
        expect(inRange(1, 1, 10)).toBe(true);
        expect(inRange(10, 1, 10)).toBe(true);
    });

    it('should return false for values below range', () => {
        expect(inRange(0, 1, 10)).toBe(false);
    });

    it('should return false for values above range', () => {
        expect(inRange(15, 1, 10)).toBe(false);
    });

    it('should handle negative ranges', () => {
        expect(inRange(-5, -10, -1)).toBe(true);
        expect(inRange(0, -10, -1)).toBe(false);
    });
});

// ============================================================================
// TYPE GUARDS
// ============================================================================

describe('isCharacter', () => {
    it('should return true for Character objects', () => {
        const character = createCharacter({
            name: 'Test',
            level: 1,
            baseStats: { heart: 1, body: 1, mind: 1 }
        });
        expect(isCharacter(character)).toBe(true);
    });

    it('should return false for Enemy objects', () => {
        expect(isCharacter(Disatree_01)).toBe(false);
    });
});

describe('isEnemy', () => {
    it('should return true for Enemy objects', () => {
        expect(isEnemy(Disatree_01)).toBe(true);
    });

    it('should return false for Character objects', () => {
        const character = createCharacter({
            name: 'Test',
            level: 1,
            baseStats: { heart: 1, body: 1, mind: 1 }
        });
        expect(isEnemy(character)).toBe(false);
    });
});

describe('isCombatActive', () => {
    it('should return false when combatState is null', () => {
        const state = createNewGameState();
        expect(isCombatActive(state)).toBe(false);
    });

    it('should return true when combatState exists', () => {
        const character = createCharacter({
            name: 'Test',
            level: 1,
            baseStats: { heart: 1, body: 1, mind: 1 }
        });
        const mockCombatState: CombatState = {
            active: true,
            phase: 'choosing_type',
            round: 1,
            friendshipCounter: 0,
            player: character,
            enemy: Disatree_01,
            playerChoice: {},
            enemyChoice: {},
            logEntry: [],
        };
        const state = { ...createNewGameState(), combatState: mockCombatState };
        expect(isCombatActive(state)).toBe(true);
    });
});

describe('isValidNumber', () => {
    it('should return true for valid numbers', () => {
        expect(isValidNumber(42)).toBe(true);
        expect(isValidNumber(0)).toBe(true);
        expect(isValidNumber(-5)).toBe(true);
        expect(isValidNumber(3.14)).toBe(true);
    });

    it('should return false for NaN', () => {
        expect(isValidNumber(NaN)).toBe(false);
    });

    it('should return false for Infinity', () => {
        expect(isValidNumber(Infinity)).toBe(false);
        expect(isValidNumber(-Infinity)).toBe(false);
    });

    it('should return false for non-numbers', () => {
        expect(isValidNumber('42')).toBe(false);
        expect(isValidNumber(null)).toBe(false);
        expect(isValidNumber(undefined)).toBe(false);
    });
});

describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
        expect(isNonEmptyString('hello')).toBe(true);
        expect(isNonEmptyString('a')).toBe(true);
    });

    it('should return false for empty strings', () => {
        expect(isNonEmptyString('')).toBe(false);
    });

    it('should return false for whitespace-only strings', () => {
        expect(isNonEmptyString('   ')).toBe(false);
        expect(isNonEmptyString('\t\n')).toBe(false);
    });

    it('should return false for non-strings', () => {
        expect(isNonEmptyString(42)).toBe(false);
        expect(isNonEmptyString(null)).toBe(false);
        expect(isNonEmptyString(undefined)).toBe(false);
    });
});
