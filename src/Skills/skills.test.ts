/**
 * Skills Module Tests
 * Tests for skill creation, usage validation, and damage calculation
 */

import { createSkill, canUseSkill, calculateSkillDamage } from './index';
import { Skill, SkillCategory, SkillsStatType } from './types';
import { Character } from '../Character/types';
import { createCharacter } from '../Character/index';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestCharacter(overrides?: { mana?: number }): Character {
    const character: Character = createCharacter({
        name: 'Philosopher',
        level: 3,
        baseStats: { heart: 4, body: 3, mind: 5 },
    });

    if (overrides?.mana !== undefined) {
        return { ...character, mana: overrides.mana };
    }

    return character;
}

// ============================================================================
// createSkill
// ============================================================================

describe('createSkill', () => {
    it('should create a skill with the correct id', () => {
        const skill: Skill = createSkill('skill-01', 'Test Skill', 'A test skill', 1, 5, 'fallacy');
        expect(skill.id).toBe('skill-01');
    });

    it('should create a skill with the correct name', () => {
        const skill: Skill = createSkill('skill-01', 'Straw Man', 'Attack with a straw man argument', 2, 10, 'fallacy');
        expect(skill.name).toBe('Straw Man');
    });

    it('should create a skill with the correct description', () => {
        const skill: Skill = createSkill('skill-01', 'Test', 'A philosophical attack', 1, 5, 'paradox');
        expect(skill.description).toBe('A philosophical attack');
    });

    it('should create a skill with the correct level', () => {
        const skill: Skill = createSkill('skill-01', 'Test', 'Desc', 3, 5, 'fallacy');
        expect(skill.level).toBe(3);
    });

    it('should create a skill with the correct mana cost', () => {
        const skill: Skill = createSkill('skill-01', 'Test', 'Desc', 1, 15, 'paradox');
        expect(skill.manaCost).toBe(15);
    });

    it('should create a fallacy skill', () => {
        const skill: Skill = createSkill('skill-01', 'Test', 'Desc', 1, 5, 'fallacy');
        expect(skill.category).toBe('fallacy');
    });

    it('should create a paradox skill', () => {
        const skill: Skill = createSkill('skill-01', 'Test', 'Desc', 1, 5, 'paradox');
        expect(skill.category).toBe('paradox');
    });

    it('should default philosophical aspect to mind', () => {
        const skill: Skill = createSkill('skill-01', 'Test', 'Desc', 1, 5, 'fallacy');
        expect(skill.philosophicalAspect).toBe('mind');
    });

    it('should accept a custom philosophical aspect', () => {
        const skill: Skill = createSkill('skill-01', 'Test', 'Desc', 1, 5, 'fallacy', 'heart');
        expect(skill.philosophicalAspect).toBe('heart');
    });

    it('should accept body as philosophical aspect', () => {
        const skill: Skill = createSkill('skill-01', 'Test', 'Desc', 1, 5, 'paradox', 'body');
        expect(skill.philosophicalAspect).toBe('body');
    });
});

// ============================================================================
// canUseSkill
// ============================================================================

describe('canUseSkill', () => {
    it('should return true when character has enough mana', () => {
        const character: Character = createTestCharacter({ mana: 20 });
        const skill: Skill = createSkill('skill-01', 'Test', 'Desc', 1, 10, 'fallacy');
        const result: boolean = canUseSkill(character, skill);
        expect(result).toBe(true);
    });

    it('should return true when character has exactly enough mana', () => {
        const character: Character = createTestCharacter({ mana: 10 });
        const skill: Skill = createSkill('skill-01', 'Test', 'Desc', 1, 10, 'fallacy');
        const result: boolean = canUseSkill(character, skill);
        expect(result).toBe(true);
    });

    it('should return false when character does not have enough mana', () => {
        const character: Character = createTestCharacter({ mana: 5 });
        const skill: Skill = createSkill('skill-01', 'Test', 'Desc', 1, 10, 'fallacy');
        const result: boolean = canUseSkill(character, skill);
        expect(result).toBe(false);
    });

    it('should return false when character has 0 mana', () => {
        const character: Character = createTestCharacter({ mana: 0 });
        const skill: Skill = createSkill('skill-01', 'Test', 'Desc', 1, 5, 'fallacy');
        const result: boolean = canUseSkill(character, skill);
        expect(result).toBe(false);
    });

    it('should handle zero mana cost skills', () => {
        const character: Character = createTestCharacter({ mana: 0 });
        const skill: Skill = createSkill('skill-01', 'Test', 'Desc', 1, 0, 'fallacy');
        const result: boolean = canUseSkill(character, skill);
        expect(result).toBe(true);
    });
});

// ============================================================================
// calculateSkillDamage
// ============================================================================

describe('calculateSkillDamage', () => {
    it('should calculate damage based on skill level and base stat', () => {
        const character: Character = createTestCharacter();
        const skill: Skill = createSkill('skill-01', 'Test', 'Desc', 2, 5, 'fallacy', 'mind');
        const result: number = calculateSkillDamage(skill, character);
        const expected: number = Math.floor(2 * character.baseStats.mind * 1.5);
        expect(result).toBe(expected);
    });

    it('should use body stat for body-aligned skills', () => {
        const character: Character = createTestCharacter();
        const skill: Skill = createSkill('skill-01', 'Test', 'Desc', 3, 5, 'fallacy', 'body');
        const result: number = calculateSkillDamage(skill, character);
        const expected: number = Math.floor(3 * character.baseStats.body * 1.5);
        expect(result).toBe(expected);
    });

    it('should use heart stat for heart-aligned skills', () => {
        const character: Character = createTestCharacter();
        const skill: Skill = createSkill('skill-01', 'Test', 'Desc', 1, 5, 'paradox', 'heart');
        const result: number = calculateSkillDamage(skill, character);
        const expected: number = Math.floor(1 * character.baseStats.heart * 1.5);
        expect(result).toBe(expected);
    });

    it('should return higher damage for higher skill levels', () => {
        const character: Character = createTestCharacter();
        const lowLevel: Skill = createSkill('skill-01', 'Test', 'Desc', 1, 5, 'fallacy', 'mind');
        const highLevel: Skill = createSkill('skill-02', 'Test', 'Desc', 5, 5, 'fallacy', 'mind');
        expect(calculateSkillDamage(highLevel, character)).toBeGreaterThan(
            calculateSkillDamage(lowLevel, character)
        );
    });

    it('should return a non-negative value', () => {
        const character: Character = createTestCharacter();
        const skill: Skill = createSkill('skill-01', 'Test', 'Desc', 1, 5, 'fallacy', 'mind');
        const result: number = calculateSkillDamage(skill, character);
        expect(result).toBeGreaterThanOrEqual(0);
    });
});
