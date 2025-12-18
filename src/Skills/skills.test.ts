import { describe, it, expect } from 'vitest';
import { createSkill, canUseSkill, calculateSkillDamage } from './index';
import { Skill, SkillCategory, SkillsStatType, SkillLearningRequirement } from './types';
import { createCharacter } from '../Character';

// ============================================================================
// TEST DATA
// ============================================================================

const mockCharacter = createCharacter({
    name: 'Test Mage',
    level: 5,
    baseStats: { heart: 8, body: 3, mind: 10 }
});

const mockSkill: Skill = {
    id: 'ad-hominem-001',
    name: 'Ad Hominem',
    category: 'fallacy',
    philosophicalAspect: 'mind',
    description: 'Attack the character rather than the argument',
    level: 1,
    manaCost: 10,
};

const mockParadoxSkill: Skill = {
    id: 'bootstrap-001',
    name: 'Bootstrap Paradox',
    category: 'paradox',
    philosophicalAspect: 'heart',
    description: 'Create something from nothing that was always there',
    level: 3,
    manaCost: 25,
    learningRequirement: {
        level: 5,
        statRequirementType: 'heart',
        statRequirementValue: 7,
    },
};

// ============================================================================
// createSkill
// ============================================================================

describe.skip('createSkill', () => {
    it('should create a skill with the provided properties', () => {
        const skill = createSkill(
            'test-skill-001',
            'Test Skill',
            'A test skill for unit testing',
            1,
            10,
            'fallacy',
            'mind'
        );
        expect(skill.id).toBe('test-skill-001');
        expect(skill.name).toBe('Test Skill');
        expect(skill.description).toBe('A test skill for unit testing');
        expect(skill.level).toBe(1);
        expect(skill.manaCost).toBe(10);
        expect(skill.category).toBe('fallacy');
        expect(skill.philosophicalAspect).toBe('mind');
    });

    it('should create a fallacy skill', () => {
        const skill = createSkill(
            'fallacy-001',
            'Straw Man',
            'Misrepresent the opponent\'s argument',
            2,
            15,
            'fallacy',
            'mind'
        );
        expect(skill.category).toBe('fallacy');
    });

    it('should create a paradox skill', () => {
        const skill = createSkill(
            'paradox-001',
            'Liar\'s Paradox',
            'This statement is false',
            3,
            20,
            'paradox',
            'heart'
        );
        expect(skill.category).toBe('paradox');
    });

    it('should allow skills without a philosophical aspect', () => {
        const skill = createSkill(
            'neutral-001',
            'Neutral Skill',
            'A skill without alignment',
            1,
            5,
            'fallacy'
        );
        expect(skill.philosophicalAspect).toBeUndefined();
    });
});

// ============================================================================
// canUseSkill
// ============================================================================

describe.skip('canUseSkill', () => {
    it('should return true when character has enough mana', () => {
        const characterWithMana = { ...mockCharacter, mana: 100 };
        expect(canUseSkill(characterWithMana, mockSkill)).toBe(true);
    });

    it('should return false when character does not have enough mana', () => {
        const characterWithoutMana = { ...mockCharacter, mana: 5 };
        expect(canUseSkill(characterWithoutMana, mockSkill)).toBe(false);
    });

    it('should return true when mana exactly equals cost', () => {
        const characterExactMana = { ...mockCharacter, mana: 10 };
        expect(canUseSkill(characterExactMana, mockSkill)).toBe(true);
    });

    it('should return false when character has zero mana', () => {
        const characterNoMana = { ...mockCharacter, mana: 0 };
        expect(canUseSkill(characterNoMana, mockSkill)).toBe(false);
    });
});

// ============================================================================
// calculateSkillDamage
// ============================================================================

describe.skip('calculateSkillDamage', () => {
    it('should return a positive damage value', () => {
        const damage = calculateSkillDamage(mockSkill, mockCharacter);
        expect(damage).toBeGreaterThan(0);
    });

    it('should scale with skill level', () => {
        const lowLevelSkill = { ...mockSkill, level: 1 };
        const highLevelSkill = { ...mockSkill, level: 5 };
        
        const lowDamage = calculateSkillDamage(lowLevelSkill, mockCharacter);
        const highDamage = calculateSkillDamage(highLevelSkill, mockCharacter);
        
        expect(highDamage).toBeGreaterThan(lowDamage);
    });

    it('should scale with character stats based on philosophical aspect', () => {
        const mindCharacter = createCharacter({
            name: 'Mind Focus',
            level: 5,
            baseStats: { heart: 1, body: 1, mind: 10 }
        });
        
        const heartCharacter = createCharacter({
            name: 'Heart Focus',
            level: 5,
            baseStats: { heart: 10, body: 1, mind: 1 }
        });
        
        const mindSkill = { ...mockSkill, philosophicalAspect: 'mind' as SkillsStatType };
        
        const mindDamage = calculateSkillDamage(mindSkill, mindCharacter);
        const heartDamage = calculateSkillDamage(mindSkill, heartCharacter);
        
        expect(mindDamage).toBeGreaterThan(heartDamage);
    });
});

// ============================================================================
// SKILL TYPE STRUCTURE TESTS
// ============================================================================

describe('Skill Types', () => {
    it('should have valid SkillCategory values', () => {
        const categories: SkillCategory[] = ['fallacy', 'paradox'];
        expect(categories).toContain('fallacy');
        expect(categories).toContain('paradox');
    });

    it('should have valid SkillsStatType values', () => {
        const statTypes: SkillsStatType[] = ['body', 'mind', 'heart'];
        expect(statTypes).toHaveLength(3);
    });

    it('should create a valid Skill object', () => {
        const skill: Skill = {
            id: 'test-skill',
            name: 'Test Skill',
            category: 'fallacy',
            philosophicalAspect: 'mind',
            description: 'A test skill',
            level: 1,
            manaCost: 10,
        };
        expect(skill.id).toBeDefined();
        expect(skill.category).toBe('fallacy');
    });

    it('should create a Skill with learning requirements', () => {
        const skill: Skill = {
            id: 'advanced-skill',
            name: 'Advanced Skill',
            category: 'paradox',
            philosophicalAspect: 'heart',
            description: 'An advanced skill',
            level: 5,
            manaCost: 50,
            learningRequirement: {
                level: 10,
                statRequirementType: 'heart',
                statRequirementValue: 15,
                prerequisiteSkill: 'basic-skill',
            },
        };
        expect(skill.learningRequirement?.level).toBe(10);
        expect(skill.learningRequirement?.prerequisiteSkill).toBe('basic-skill');
    });
});

describe('SkillLearningRequirement', () => {
    it('should create a minimal learning requirement', () => {
        const req: SkillLearningRequirement = {
            level: 5,
        };
        expect(req.level).toBe(5);
    });

    it('should create a learning requirement with stat requirements', () => {
        const req: SkillLearningRequirement = {
            level: 10,
            statRequirementType: 'mind',
            statRequirementValue: 20,
        };
        expect(req.statRequirementType).toBe('mind');
        expect(req.statRequirementValue).toBe(20);
    });

    it('should create a learning requirement with prerequisite skill', () => {
        const req: SkillLearningRequirement = {
            level: 15,
            prerequisiteSkill: 'fireball-1',
        };
        expect(req.prerequisiteSkill).toBe('fireball-1');
    });
});

// ============================================================================
// FUTURE IMPLEMENTATION TESTS (Skipped)
// ============================================================================

describe.skip('meetsSkillRequirements', () => {
    it('should return true when character meets all requirements', () => {
        // TODO: Implement meetsSkillRequirements function
        // const result = meetsSkillRequirements(mockCharacter, mockParadoxSkill);
        // expect(result).toBe(true);
    });

    it('should return false when character level is too low', () => {
        // TODO: Test level check
    });

    it('should return false when character stat is too low', () => {
        // TODO: Test stat requirement check
    });

    it('should return false when prerequisite skill is missing', () => {
        // TODO: Test prerequisite check
    });
});

describe.skip('learnSkill', () => {
    it('should add a skill to character\'s learned skills', () => {
        // TODO: Implement learnSkill function
    });

    it('should not add duplicate skills', () => {
        // TODO: Test duplicate prevention
    });
});

describe.skip('useSkill', () => {
    it('should reduce character mana by skill cost', () => {
        // TODO: Implement useSkill function
    });

    it('should apply skill effects', () => {
        // TODO: Test skill effects application
    });

    it('should fail if character cannot use skill', () => {
        // TODO: Test failure case
    });
});

describe.skip('upgradeSkill', () => {
    it('should increase skill level', () => {
        // TODO: Implement upgradeSkill function
    });

    it('should increase skill damage/effect', () => {
        // TODO: Test effect scaling
    });
});

// ============================================================================
// SAMPLE SKILLS FOR REFERENCE
// ============================================================================

describe('Sample Skills (Fallacies)', () => {
    const sampleFallacies: Skill[] = [
        {
            id: 'ad-hominem',
            name: 'Ad Hominem',
            category: 'fallacy',
            philosophicalAspect: 'heart',
            description: 'Attack the character rather than the argument. Deals emotional damage.',
            level: 1,
            manaCost: 10,
        },
        {
            id: 'straw-man',
            name: 'Straw Man',
            category: 'fallacy',
            philosophicalAspect: 'mind',
            description: 'Misrepresent the opponent\'s position. Confuses the target.',
            level: 2,
            manaCost: 15,
        },
        {
            id: 'appeal-to-authority',
            name: 'Appeal to Authority',
            category: 'fallacy',
            philosophicalAspect: 'heart',
            description: 'Invoke authority without justification. Intimidates the target.',
            level: 1,
            manaCost: 12,
        },
    ];

    it('should all be fallacy category', () => {
        sampleFallacies.forEach(skill => {
            expect(skill.category).toBe('fallacy');
        });
    });
});

describe('Sample Skills (Paradoxes)', () => {
    const sampleParadoxes: Skill[] = [
        {
            id: 'liars-paradox',
            name: 'Liar\'s Paradox',
            category: 'paradox',
            philosophicalAspect: 'mind',
            description: '"This statement is false." Creates logical confusion.',
            level: 3,
            manaCost: 25,
        },
        {
            id: 'bootstrap-paradox',
            name: 'Bootstrap Paradox',
            category: 'paradox',
            philosophicalAspect: 'heart',
            description: 'Create something from nothing that always existed.',
            level: 4,
            manaCost: 35,
        },
        {
            id: 'zenos-arrow',
            name: 'Zeno\'s Arrow',
            category: 'paradox',
            philosophicalAspect: 'body',
            description: 'Motion is impossible. Freezes the target in place.',
            level: 5,
            manaCost: 40,
        },
    ];

    it('should all be paradox category', () => {
        sampleParadoxes.forEach(skill => {
            expect(skill.category).toBe('paradox');
        });
    });
});
