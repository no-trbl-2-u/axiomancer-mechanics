/**
 * Skills module — types and runtime engine.
 *
 * Skills (fallacies and paradoxes) run on the five-resource resonance
 * economy described in `specs/04-skills-engine.md`. The engine functions
 * here are pure: callers thread state forward themselves.
 *
 * Skill content (the named library) lives in Spec 04b.
 */

export type {
    Skill, SkillCategory, SkillsStatType, SkillTier, SkillTarget,
    ResourceCost, CombatResources,
    SkillLearningRequirement, SkillCombatEffects,
} from './types';

export {
    generateBasicActionResources, generatePhilosophicalResource,
    canUseSkill, spendResources, calculateSkillDamage, executeSkill,
} from './skill.engine';

export type {
    BasicActionOutcome, SkillEvent, SkillResolution, SkillLookup,
} from './skill.engine';
