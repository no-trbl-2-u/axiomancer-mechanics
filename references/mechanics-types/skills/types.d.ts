/**
 * Skills System Types
 * Philosophical combat skills based on fallacies, virtues, logic, and rhetoric
 */

import { BaseStats } from '../character/types';

/**
 * Philosophical aspect alignment
 */
export type PhilosophicalAspect = 'body' | 'mind' | 'heart';

/**
 * Skill category type
 */
export type SkillType = 'fallacy' | 'virtue' | 'logic' | 'rhetoric' | 'meditation';

/**
 * Fallacy classification
 */
export type FallacyType = 'formal' | 'informal' | 'cognitive_bias';

/**
 * Learning requirement for a skill
 */
export interface SkillLearningRequirement {
  level: number;
  stats?: Partial<BaseStats>;
}

/**
 * Combat effects for different scenarios
 */
export interface SkillCombatEffects {
  baseEffect?: string;
  advantageEffect?: string;
  baseDefendedEffect?: string;
  defendedAgainstAdvantage?: string;
  defendedWithAdvantage?: string;
  specialScenario?: string;
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
  damage?: number;
  effect?: string;
  type: SkillType;
  philosophicalAspect?: PhilosophicalAspect;
  fallacyType?: FallacyType;
  learningRequirement?: SkillLearningRequirement;
  combatEffects?: SkillCombatEffects;
}
