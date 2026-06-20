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
    SkillLearningRequirement, SkillCombatEffects, SkillSpecialMechanic,
    SkillSynergy, SynergyPredicate,
} from './types';

// Phase 142 — Extended synergy predicate types
export type { ExtendedSynergyPredicate } from './synergy-predicates';

// Phase 142 — Extended synergy predicate functionality
export {
    evaluateExtendedSynergyPredicate,
    checkSinglePredicate,
    checkAnyCountPredicate,
    checkAllRequiredPredicate,
    checkBuffDebuffCombo,
    checkTotalIntensityPredicate
} from './synergy-predicates';

export {
    generateBasicActionResources, generatePhilosophicalResource,
    carryPhilosophicalResources,
    canUseSkill, spendResources, calculateSkillDamage, executeSkill,
    philosophicalCategoryFor,
    meetsLearningRequirement, getAvailableSkills, learnSkill,
} from './skill.engine';

export type {
    BasicActionOutcome, SkillEvent, SkillResolution, SkillLookup,
} from './skill.engine';

export {
    skillLibrary, getSkillById,
} from './skill.library';
