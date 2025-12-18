import { describe, it, expect } from 'vitest';
import { createCharacter } from './index';
import { Character, BaseStats, DerivedStats } from './types';

describe('createCharacter', () => {
    it('should create a character with the provided name', () => {
        const character = createCharacter({
            name: 'Test Hero',
            level: 1,
            baseStats: { heart: 1, body: 1, mind: 1 }
        });
        expect(character.name).toBe('Test Hero');
    });

    it('should create a character with the provided level', () => {
        const character = createCharacter({
            name: 'Test Hero',
            level: 5,
            baseStats: { heart: 1, body: 1, mind: 1 }
        });
        expect(character.level).toBe(5);
    });

    it('should set base stats correctly', () => {
        const baseStats: BaseStats = { heart: 5, body: 3, mind: 4 };
        const character = createCharacter({
            name: 'Test Hero',
            level: 1,
            baseStats
        });
        expect(character.baseStats).toEqual(baseStats);
    });

    it('should calculate max health based on level and body/heart stats', () => {
        // Equation: level * (average of body and heart) * 10
        const character = createCharacter({
            name: 'Test Hero',
            level: 2,
            baseStats: { heart: 4, body: 6, mind: 2 }
        });
        // Average of body(6) and heart(4) = 5, level(2) * 5 * 10 = 100
        expect(character.maxHealth).toBe(100);
        expect(character.health).toBe(character.maxHealth);
    });

    it('should calculate max mana based on level and mind/heart stats', () => {
        // Equation: level * (average of mind and heart) * 10
        const character = createCharacter({
            name: 'Test Hero',
            level: 2,
            baseStats: { heart: 4, body: 2, mind: 6 }
        });
        // Average of mind(6) and heart(4) = 5, level(2) * 5 * 10 = 100
        expect(character.maxMana).toBe(100);
        expect(character.mana).toBe(character.maxMana);
    });

    it('should calculate experience based on level', () => {
        const character = createCharacter({
            name: 'Test Hero',
            level: 3,
            baseStats: { heart: 1, body: 1, mind: 1 }
        });
        // Experience = (level - 1) * 1000
        expect(character.experience).toBe(2000);
    });

    it('should calculate experience to next level based on level', () => {
        const character = createCharacter({
            name: 'Test Hero',
            level: 3,
            baseStats: { heart: 1, body: 1, mind: 1 }
        });
        // Experience to next level = level * 1000
        expect(character.experienceToNextLevel).toBe(3000);
    });

    it('should derive physical stats from body stat', () => {
        const character = createCharacter({
            name: 'Test Hero',
            level: 1,
            baseStats: { heart: 1, body: 5, mind: 1 }
        });
        // physicalSkill = body * 1 = 5
        // physicalDefense = body * 3 = 15
        // physicalSave = body * 2 = 10
        // physicalTest = body * 4 = 20
        expect(character.derivedStats.physicalSkill).toBe(5);
        expect(character.derivedStats.physicalDefense).toBe(15);
        expect(character.derivedStats.physicalSave).toBe(10);
        expect(character.derivedStats.physicalTest).toBe(20);
    });

    it('should derive mental stats from mind stat', () => {
        const character = createCharacter({
            name: 'Test Hero',
            level: 1,
            baseStats: { heart: 1, body: 1, mind: 5 }
        });
        // mentalSkill = mind * 1 = 5
        // mentalDefense = mind * 3 = 15
        // mentalSave = mind * 2 = 10
        // mentalTest = mind * 4 = 20
        expect(character.derivedStats.mentalSkill).toBe(5);
        expect(character.derivedStats.mentalDefense).toBe(15);
        expect(character.derivedStats.mentalSave).toBe(10);
        expect(character.derivedStats.mentalTest).toBe(20);
    });

    it('should derive emotional stats from heart stat', () => {
        const character = createCharacter({
            name: 'Test Hero',
            level: 1,
            baseStats: { heart: 5, body: 1, mind: 1 }
        });
        // emotionalSkill = heart * 1 = 5
        // emotionalDefense = heart * 3 = 15
        // emotionalSave = heart * 2 = 10
        // emotionalTest = heart * 4 = 20
        expect(character.derivedStats.emotionalSkill).toBe(5);
        expect(character.derivedStats.emotionalDefense).toBe(15);
        expect(character.derivedStats.emotionalSave).toBe(10);
        expect(character.derivedStats.emotionalTest).toBe(20);
    });

    it('should calculate luck as average of all base stats', () => {
        const character = createCharacter({
            name: 'Test Hero',
            level: 1,
            baseStats: { heart: 3, body: 6, mind: 9 }
        });
        // Luck = average(body, heart, mind) = (3 + 6 + 9) / 3 = 6
        expect(character.derivedStats.luck).toBe(6);
    });

    it('should initialize character with an empty inventory', () => {
        const character = createCharacter({
            name: 'Test Hero',
            level: 1,
            baseStats: { heart: 1, body: 1, mind: 1 }
        });
        expect(character.inventory).toEqual([]);
    });

    it('should set health equal to maxHealth on creation', () => {
        const character = createCharacter({
            name: 'Test Hero',
            level: 5,
            baseStats: { heart: 10, body: 10, mind: 10 }
        });
        expect(character.health).toBe(character.maxHealth);
    });

    it('should set mana equal to maxMana on creation', () => {
        const character = createCharacter({
            name: 'Test Hero',
            level: 5,
            baseStats: { heart: 10, body: 10, mind: 10 }
        });
        expect(character.mana).toBe(character.maxMana);
    });
});
