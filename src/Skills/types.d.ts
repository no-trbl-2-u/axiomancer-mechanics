/**
 * Skills System Types
 * Skills come in two categories: fallacies and paradoxes
 */

/**
 * Philosophical aspect alignment 
 */
export type SkillsStatType = 'body' | 'mind' | 'heart';

/**
 * Skill category type
 */
export type SkillCategory = 'fallacy' | 'paradox';

/**
 * Learning requirement for a skill
 */
export interface SkillLearningRequirement {
    level: number;
    statRequirementType?: SkillsStatType;
    statRequirementValue?: number;
}

/**
 * Combat effects for different scenarios
 */
export interface SkillCombatEffects {
    description: string;
    effect?: string;

    // TODO: Add more combat effects
    // --> potentialStatusEffects
}

/**
 * Skill entity
 */
export interface Skill {
    id: string;
    name: string;
    description: string;
    level: number;
    manaCost: number;
    damageCalculation?: string;
    effect?: string;
    type: SkillCategory;
    philosophicalAspect?: SkillsStatType;
    learningRequirement?: SkillLearningRequirement;
}

