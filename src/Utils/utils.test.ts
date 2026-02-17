/**
 * Utils Module Tests
 * Tests for all utility functions used across the application
 */

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
import { Advantage } from '../Combat/types';

// ============================================================================
// clamp
// ============================================================================

describe('clamp', () => {
    it('should return the value when within range', () => {
        const result: number = clamp(5, 0, 10);
        expect(result).toBe(5);
    });

    it('should return the min when value is below range', () => {
        const result: number = clamp(-5, 0, 10);
        expect(result).toBe(0);
    });

    it('should return the max when value is above range', () => {
        const result: number = clamp(15, 0, 10);
        expect(result).toBe(10);
    });

    it('should return the boundary value when value equals min', () => {
        const result: number = clamp(0, 0, 10);
        expect(result).toBe(0);
    });

    it('should return the boundary value when value equals max', () => {
        const result: number = clamp(10, 0, 10);
        expect(result).toBe(10);
    });

    it('should handle negative ranges', () => {
        const result: number = clamp(-3, -10, -1);
        expect(result).toBe(-3);
    });
});

// ============================================================================
// randomInt
// ============================================================================

describe('randomInt', () => {
    it('should return a number within the specified range', () => {
        for (let i = 0; i < 100; i++) {
            const result: number = randomInt(1, 6);
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(6);
        }
    });

    it('should return an integer', () => {
        const result: number = randomInt(1, 100);
        expect(Number.isInteger(result)).toBe(true);
    });

    it('should return the only value when min equals max', () => {
        const result: number = randomInt(5, 5);
        expect(result).toBe(5);
    });

    it('should handle a range of 1 to 1', () => {
        const result: number = randomInt(1, 1);
        expect(result).toBe(1);
    });
});

// ============================================================================
// deepClone
// ============================================================================

describe('deepClone', () => {
    it('should create a deep copy of an object', () => {
        const original = { name: 'Hero', stats: { hp: 100, mp: 50 } };
        const clone = deepClone(original);

        expect(clone).toEqual(original);
        expect(clone).not.toBe(original);
    });

    it('should not share nested references', () => {
        const original = { name: 'Hero', stats: { hp: 100 } };
        const clone = deepClone(original);

        clone.stats.hp = 50;
        expect(original.stats.hp).toBe(100);
    });

    it('should clone arrays', () => {
        const original: number[] = [1, 2, 3];
        const clone: number[] = deepClone(original);

        expect(clone).toEqual(original);
        clone.push(4);
        expect(original).toHaveLength(3);
    });

    it('should clone nested arrays', () => {
        const original = { items: [{ id: 1 }, { id: 2 }] };
        const clone = deepClone(original);

        clone.items[0].id = 99;
        expect(original.items[0].id).toBe(1);
    });

    it('should handle null values', () => {
        const original = { value: null };
        const clone = deepClone(original);
        expect(clone.value).toBeNull();
    });

    it('should handle primitive values', () => {
        expect(deepClone(42)).toBe(42);
        expect(deepClone('hello')).toBe('hello');
        expect(deepClone(true)).toBe(true);
    });
});

// ============================================================================
// average
// ============================================================================

describe('average', () => {
    it('should calculate the average of multiple numbers', () => {
        const result: number = average(1, 2, 3, 4, 5);
        expect(result).toBe(3);
    });

    it('should return the value when given a single number', () => {
        const result: number = average(10);
        expect(result).toBe(10);
    });

    it('should return 0 when given no numbers', () => {
        const result: number = average();
        expect(result).toBe(0);
    });

    it('should handle two numbers', () => {
        const result: number = average(10, 20);
        expect(result).toBe(15);
    });

    it('should handle decimal results', () => {
        const result: number = average(1, 2);
        expect(result).toBe(1.5);
    });
});

// ============================================================================
// sum, max, min
// ============================================================================

describe('sum', () => {
    it('should return the sum of an array of numbers', () => {
        const result: number = sum([1, 2, 3, 4, 5]);
        expect(result).toBe(15);
    });

    it('should return the single element for a one-element array', () => {
        const result: number = sum([42]);
        expect(result).toBe(42);
    });

    it('should return 0 for an empty array', () => {
        const result: number = sum([]);
        expect(result).toBe(0);
    });
});

describe('max', () => {
    it('should return the maximum value from an array', () => {
        const result: number = max([1, 5, 3, 9, 2]);
        expect(result).toBe(9);
    });

    it('should return the single element for a one-element array', () => {
        const result: number = max([7]);
        expect(result).toBe(7);
    });

    it('should handle negative numbers', () => {
        const result: number = max([-5, -2, -10]);
        expect(result).toBe(-2);
    });
});

describe('min', () => {
    it('should return the minimum value from an array', () => {
        const result: number = min([5, 1, 3, 9, 2]);
        expect(result).toBe(1);
    });

    it('should return the single element for a one-element array', () => {
        const result: number = min([7]);
        expect(result).toBe(7);
    });
});

// ============================================================================
// determineRollAdvantageModifier
// ============================================================================

describe('determineRollAdvantageModifier', () => {
    it('should return max function for advantage', () => {
        const modifier = determineRollAdvantageModifier('advantage');
        const result: number = modifier([3, 7, 1]);
        expect(result).toBe(7);
    });

    it('should return min function for disadvantage', () => {
        const modifier = determineRollAdvantageModifier('disadvantage');
        const result: number = modifier([3, 7, 1]);
        expect(result).toBe(1);
    });

    it('should return sum function for neutral', () => {
        const modifier = determineRollAdvantageModifier('neutral');
        const result: number = modifier([3, 7, 1]);
        expect(result).toBe(11);
    });
});

// ============================================================================
// createDie
// ============================================================================

describe('createDie', () => {
    it('should return a function', () => {
        const die = createDie(6, 1);
        expect(typeof die).toBe('function');
    });

    it('should return values within range for a d6', () => {
        const d6 = createDie(6, 1);
        for (let i = 0; i < 100; i++) {
            const result: number = d6();
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(6);
        }
    });

    it('should sum multiple dice rolls by default', () => {
        const twod6 = createDie(6, 2);
        for (let i = 0; i < 100; i++) {
            const result: number = twod6();
            expect(result).toBeGreaterThanOrEqual(2);
            expect(result).toBeLessThanOrEqual(12);
        }
    });

    it('should apply custom function when provided', () => {
        const advD20 = createDie(20, 2, max);
        for (let i = 0; i < 100; i++) {
            const result: number = advD20();
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(20);
        }
    });
});

// ============================================================================
// createDieRoll
// ============================================================================

describe('createDieRoll', () => {
    it('should return a function', () => {
        const roll = createDieRoll('neutral');
        expect(typeof roll).toBe('function');
    });

    it('should return values between 1 and 20 for neutral', () => {
        const roll = createDieRoll('neutral');
        for (let i = 0; i < 100; i++) {
            const result: number = roll();
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(20);
        }
    });

    it('should return values between 1 and 20 for advantage', () => {
        const roll = createDieRoll('advantage');
        for (let i = 0; i < 100; i++) {
            const result: number = roll();
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(20);
        }
    });

    it('should return values between 1 and 20 for disadvantage', () => {
        const roll = createDieRoll('disadvantage');
        for (let i = 0; i < 100; i++) {
            const result: number = roll();
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(20);
        }
    });
});

// ============================================================================
// capitalize
// ============================================================================

describe('capitalize', () => {
    it('should capitalize the first letter of a lowercase string', () => {
        const result: string = capitalize('hello');
        expect(result).toBe('Hello');
    });

    it('should not change an already capitalized string', () => {
        const result: string = capitalize('Hello');
        expect(result).toBe('Hello');
    });

    it('should not change an all-uppercase string', () => {
        const result: string = capitalize('WORLD');
        expect(result).toBe('WORLD');
    });

    it('should handle an empty string', () => {
        const result: string = capitalize('');
        expect(result).toBe('');
    });

    it('should handle a single character', () => {
        const result: string = capitalize('a');
        expect(result).toBe('A');
    });
});

// ============================================================================
// formatPercent
// ============================================================================

describe('formatPercent', () => {
    it('should format a whole number as a percentage', () => {
        const result: string = formatPercent(75);
        expect(result).toBe('75%');
    });

    it('should format with specified decimal places', () => {
        const result: string = formatPercent(33.333, 1);
        expect(result).toBe('33.3%');
    });

    it('should format zero correctly', () => {
        const result: string = formatPercent(0);
        expect(result).toBe('0%');
    });

    it('should format 100 correctly', () => {
        const result: string = formatPercent(100);
        expect(result).toBe('100%');
    });

    it('should handle two decimal places', () => {
        const result: string = formatPercent(66.667, 2);
        expect(result).toBe('66.67%');
    });
});

// ============================================================================
// inRange
// ============================================================================

describe('inRange', () => {
    it('should return true when value is within range', () => {
        const result: boolean = inRange(5, 1, 10);
        expect(result).toBe(true);
    });

    it('should return true when value equals min', () => {
        const result: boolean = inRange(1, 1, 10);
        expect(result).toBe(true);
    });

    it('should return true when value equals max', () => {
        const result: boolean = inRange(10, 1, 10);
        expect(result).toBe(true);
    });

    it('should return false when value is below range', () => {
        const result: boolean = inRange(0, 1, 10);
        expect(result).toBe(false);
    });

    it('should return false when value is above range', () => {
        const result: boolean = inRange(15, 1, 10);
        expect(result).toBe(false);
    });
});
