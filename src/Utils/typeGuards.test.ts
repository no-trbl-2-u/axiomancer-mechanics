/**
 * Type Guards Module Tests
 * Tests for runtime type checking utilities
 */

import {
    isCharacter,
    isEnemy,
    isCombatActive,
    isValidNumber,
    isNonEmptyString,
} from './typeGuards';
import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { GameState } from '../Game/types';
import { CombatState } from '../Combat/types';
import { createCharacter } from '../Character/index';

/** Helper to create a mock character for testing */
function createMockCharacter(): Character {
    return createCharacter({
        name: 'Test Hero',
        level: 1,
        baseStats: { heart: 3, body: 4, mind: 2 },
    });
}

/** Helper to create a mock enemy for testing */
function createMockEnemy(): Enemy {
    return {
        id: 'enemy-01',
        name: 'Test Enemy',
        description: 'A test enemy',
        level: 1,
        health: 10,
        mana: 5,
        enemyStats: {
            maxHealth: 10,
            maxMana: 5,
            physicalAttack: 2,
            physicalSkill: 1,
            physicalDefense: 1,
            mentalAttack: 2,
            mentalSkill: 1,
            mentalDefense: 1,
            emotionalAttack: 2,
            emotionalSkill: 1,
            emotionalDefense: 1,
        },
        mapLocation: { name: 'fishing-village' },
        logic: 'random',
    };
}

// ============================================================================
// isCharacter
// ============================================================================

describe('isCharacter', () => {
    it('should return true for a Character object', () => {
        const character: Character = createMockCharacter();
        const result: boolean = isCharacter(character);
        expect(result).toBe(true);
    });

    it('should return false for an Enemy object', () => {
        const enemy: Enemy = createMockEnemy();
        const result: boolean = isCharacter(enemy);
        expect(result).toBe(false);
    });
});

// ============================================================================
// isEnemy
// ============================================================================

describe('isEnemy', () => {
    it('should return true for an Enemy object', () => {
        const enemy: Enemy = createMockEnemy();
        const result: boolean = isEnemy(enemy);
        expect(result).toBe(true);
    });

    it('should return false for a Character object', () => {
        const character: Character = createMockCharacter();
        const result: boolean = isEnemy(character);
        expect(result).toBe(false);
    });
});

// ============================================================================
// isCombatActive
// ============================================================================

describe('isCombatActive', () => {
    it('should return true when combatState is not null', () => {
        const combatState: CombatState = {
            active: true,
            phase: 'choosing_type',
            round: 1,
            friendshipCounter: 0,
            player: createMockCharacter(),
            enemy: createMockEnemy(),
            playerChoice: {},
            enemyChoice: {},
            logEntry: [],
        };
        const state: GameState = {
            player: createMockCharacter(),
            world: {
                world: [],
                currentContinent: {
                    name: 'coastal-continent',
                    description: 'Test',
                    availableMaps: ['fishing-village'],
                    lockedMaps: [],
                    completedMaps: [],
                },
                currentMap: {
                    name: 'fishing-village',
                    continent: 'coastal-continent',
                    description: 'Test',
                    startingNode: { id: 'fv-1', location: [0, 0], connectedNodes: [] },
                    completedNodes: [],
                    availableNodes: [],
                    lockedNodes: [],
                    availableEvents: [],
                    uniqueEvents: [],
                },
            },
            combatState,
        };

        const result: boolean = isCombatActive(state);
        expect(result).toBe(true);
    });

    it('should return false when combatState is null', () => {
        const state: GameState = {
            player: createMockCharacter(),
            world: {
                world: [],
                currentContinent: {
                    name: 'coastal-continent',
                    description: 'Test',
                    availableMaps: ['fishing-village'],
                    lockedMaps: [],
                    completedMaps: [],
                },
                currentMap: {
                    name: 'fishing-village',
                    continent: 'coastal-continent',
                    description: 'Test',
                    startingNode: { id: 'fv-1', location: [0, 0], connectedNodes: [] },
                    completedNodes: [],
                    availableNodes: [],
                    lockedNodes: [],
                    availableEvents: [],
                    uniqueEvents: [],
                },
            },
            combatState: null,
        };

        const result: boolean = isCombatActive(state);
        expect(result).toBe(false);
    });
});

// ============================================================================
// isValidNumber
// ============================================================================

describe('isValidNumber', () => {
    it('should return true for a valid integer', () => {
        const result: boolean = isValidNumber(42);
        expect(result).toBe(true);
    });

    it('should return true for a valid float', () => {
        const result: boolean = isValidNumber(3.14);
        expect(result).toBe(true);
    });

    it('should return true for zero', () => {
        const result: boolean = isValidNumber(0);
        expect(result).toBe(true);
    });

    it('should return true for negative numbers', () => {
        const result: boolean = isValidNumber(-10);
        expect(result).toBe(true);
    });

    it('should return false for NaN', () => {
        const result: boolean = isValidNumber(NaN);
        expect(result).toBe(false);
    });

    it('should return false for Infinity', () => {
        const result: boolean = isValidNumber(Infinity);
        expect(result).toBe(false);
    });

    it('should return false for negative Infinity', () => {
        const result: boolean = isValidNumber(-Infinity);
        expect(result).toBe(false);
    });

    it('should return false for a string', () => {
        const result: boolean = isValidNumber('42');
        expect(result).toBe(false);
    });

    it('should return false for null', () => {
        const result: boolean = isValidNumber(null);
        expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
        const result: boolean = isValidNumber(undefined);
        expect(result).toBe(false);
    });
});

// ============================================================================
// isNonEmptyString
// ============================================================================

describe('isNonEmptyString', () => {
    it('should return true for a non-empty string', () => {
        const result: boolean = isNonEmptyString('hello');
        expect(result).toBe(true);
    });

    it('should return false for an empty string', () => {
        const result: boolean = isNonEmptyString('');
        expect(result).toBe(false);
    });

    it('should return false for a whitespace-only string', () => {
        const result: boolean = isNonEmptyString('   ');
        expect(result).toBe(false);
    });

    it('should return false for a number', () => {
        const result: boolean = isNonEmptyString(42);
        expect(result).toBe(false);
    });

    it('should return false for null', () => {
        const result: boolean = isNonEmptyString(null);
        expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
        const result: boolean = isNonEmptyString(undefined);
        expect(result).toBe(false);
    });
});
