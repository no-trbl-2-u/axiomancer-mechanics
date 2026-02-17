/**
 * Character Module Tests
 * Tests for character creation, stat derivation, and resource calculations
 */

import { createCharacter } from './index';
import { Character, BaseStats, DerivedStats } from './types';

// ============================================================================
// CONSTANTS (mirrors the module's internal constants)
// ============================================================================

const STAT_MULTIPLIERS = {
    SKILL: 1,
    DEFENSE: 3,
    SAVE: 2,
    TEST: 4,
} as const;

const RESOURCE_MULTIPLIERS = {
    HEALTH_PER_STAT: 10,
    MANA_PER_STAT: 10,
} as const;

const EXPERIENCE_PER_LEVEL = 1000;

// ============================================================================
// createCharacter
// ============================================================================

describe('createCharacter', () => {
    const baseStats: BaseStats = { heart: 4, body: 3, mind: 2 };

    it('should create a character with the correct name', () => {
        const character: Character = createCharacter({
            name: 'Hero',
            level: 1,
            baseStats,
        });
        expect(character.name).toBe('Hero');
    });

    it('should create a character with the correct level', () => {
        const character: Character = createCharacter({
            name: 'Hero',
            level: 5,
            baseStats,
        });
        expect(character.level).toBe(5);
    });

    it('should assign the correct base stats', () => {
        const character: Character = createCharacter({
            name: 'Hero',
            level: 1,
            baseStats,
        });
        expect(character.baseStats).toEqual(baseStats);
    });

    it('should start with an empty inventory', () => {
        const character: Character = createCharacter({
            name: 'Hero',
            level: 1,
            baseStats,
        });
        expect(character.inventory).toEqual([]);
    });

    it('should set health equal to maxHealth on creation', () => {
        const character: Character = createCharacter({
            name: 'Hero',
            level: 1,
            baseStats,
        });
        expect(character.health).toBe(character.maxHealth);
    });

    it('should set mana equal to maxMana on creation', () => {
        const character: Character = createCharacter({
            name: 'Hero',
            level: 1,
            baseStats,
        });
        expect(character.mana).toBe(character.maxMana);
    });
});

// ============================================================================
// Max Health Calculation
// ============================================================================

describe('calculateMaxHealth (via createCharacter)', () => {
    it('should calculate max health as level * average(body, heart) * 10', () => {
        const baseStats: BaseStats = { heart: 4, body: 6, mind: 2 };
        const character: Character = createCharacter({
            name: 'Tank',
            level: 1,
            baseStats,
        });
        const expectedMaxHealth: number = 1 * ((6 + 4) / 2) * RESOURCE_MULTIPLIERS.HEALTH_PER_STAT;
        expect(character.maxHealth).toBe(expectedMaxHealth);
    });

    it('should scale with level', () => {
        const baseStats: BaseStats = { heart: 2, body: 2, mind: 2 };
        const level1: Character = createCharacter({ name: 'A', level: 1, baseStats });
        const level3: Character = createCharacter({ name: 'B', level: 3, baseStats });
        expect(level3.maxHealth).toBe(level1.maxHealth * 3);
    });

    it('should scale with body and heart stats', () => {
        const lowStats: Character = createCharacter({
            name: 'Low',
            level: 1,
            baseStats: { heart: 1, body: 1, mind: 5 },
        });
        const highStats: Character = createCharacter({
            name: 'High',
            level: 1,
            baseStats: { heart: 5, body: 5, mind: 1 },
        });
        expect(highStats.maxHealth).toBeGreaterThan(lowStats.maxHealth);
    });
});

// ============================================================================
// Max Mana Calculation
// ============================================================================

describe('calculateMaxMana (via createCharacter)', () => {
    it('should calculate max mana as level * average(mind, heart) * 10', () => {
        const baseStats: BaseStats = { heart: 4, body: 2, mind: 6 };
        const character: Character = createCharacter({
            name: 'Mage',
            level: 1,
            baseStats,
        });
        const expectedMaxMana: number = 1 * ((6 + 4) / 2) * RESOURCE_MULTIPLIERS.MANA_PER_STAT;
        expect(character.maxMana).toBe(expectedMaxMana);
    });

    it('should scale with level', () => {
        const baseStats: BaseStats = { heart: 3, body: 2, mind: 3 };
        const level1: Character = createCharacter({ name: 'A', level: 1, baseStats });
        const level2: Character = createCharacter({ name: 'B', level: 2, baseStats });
        expect(level2.maxMana).toBe(level1.maxMana * 2);
    });
});

// ============================================================================
// Derived Stats
// ============================================================================

describe('deriveStats (via createCharacter)', () => {
    const baseStats: BaseStats = { heart: 4, body: 3, mind: 2 };
    let character: Character;

    beforeEach(() => {
        character = createCharacter({ name: 'Hero', level: 1, baseStats });
    });

    it('should derive physicalSkill from body', () => {
        expect(character.derivedStats.physicalSkill).toBe(
            baseStats.body * STAT_MULTIPLIERS.SKILL
        );
    });

    it('should derive physicalDefense from body', () => {
        expect(character.derivedStats.physicalDefense).toBe(
            baseStats.body * STAT_MULTIPLIERS.DEFENSE
        );
    });

    it('should derive physicalSave from body', () => {
        expect(character.derivedStats.physicalSave).toBe(
            baseStats.body * STAT_MULTIPLIERS.SAVE
        );
    });

    it('should derive physicalTest from body', () => {
        expect(character.derivedStats.physicalTest).toBe(
            baseStats.body * STAT_MULTIPLIERS.TEST
        );
    });

    it('should derive mentalSkill from mind', () => {
        expect(character.derivedStats.mentalSkill).toBe(
            baseStats.mind * STAT_MULTIPLIERS.SKILL
        );
    });

    it('should derive mentalDefense from mind', () => {
        expect(character.derivedStats.mentalDefense).toBe(
            baseStats.mind * STAT_MULTIPLIERS.DEFENSE
        );
    });

    it('should derive mentalSave from mind', () => {
        expect(character.derivedStats.mentalSave).toBe(
            baseStats.mind * STAT_MULTIPLIERS.SAVE
        );
    });

    it('should derive mentalTest from mind', () => {
        expect(character.derivedStats.mentalTest).toBe(
            baseStats.mind * STAT_MULTIPLIERS.TEST
        );
    });

    it('should derive emotionalSkill from heart', () => {
        expect(character.derivedStats.emotionalSkill).toBe(
            baseStats.heart * STAT_MULTIPLIERS.SKILL
        );
    });

    it('should derive emotionalDefense from heart', () => {
        expect(character.derivedStats.emotionalDefense).toBe(
            baseStats.heart * STAT_MULTIPLIERS.DEFENSE
        );
    });

    it('should derive emotionalSave from heart', () => {
        expect(character.derivedStats.emotionalSave).toBe(
            baseStats.heart * STAT_MULTIPLIERS.SAVE
        );
    });

    it('should derive emotionalTest from heart', () => {
        expect(character.derivedStats.emotionalTest).toBe(
            baseStats.heart * STAT_MULTIPLIERS.TEST
        );
    });

    it('should derive luck as the average of all three base stats', () => {
        const expectedLuck: number = (baseStats.body + baseStats.heart + baseStats.mind) / 3;
        expect(character.derivedStats.luck).toBe(expectedLuck);
    });
});

// ============================================================================
// Experience
// ============================================================================

describe('experience calculation (via createCharacter)', () => {
    it('should set experience to 0 for level 1', () => {
        const character: Character = createCharacter({
            name: 'Newbie',
            level: 1,
            baseStats: { heart: 1, body: 1, mind: 1 },
        });
        expect(character.experience).toBe(0);
    });

    it('should set experience based on level', () => {
        const character: Character = createCharacter({
            name: 'Veteran',
            level: 5,
            baseStats: { heart: 1, body: 1, mind: 1 },
        });
        expect(character.experience).toBe(4 * EXPERIENCE_PER_LEVEL);
    });

    it('should set experienceToNextLevel based on level', () => {
        const character: Character = createCharacter({
            name: 'Hero',
            level: 3,
            baseStats: { heart: 1, body: 1, mind: 1 },
        });
        expect(character.experienceToNextLevel).toBe(3 * EXPERIENCE_PER_LEVEL);
    });
});
