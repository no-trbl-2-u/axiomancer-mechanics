/**
 * Skills System Types
 * Skills come in two categories: fallacies and paradoxes
 */

/**
 * Philosophical aspect alignment for skills
 * Determines which base stat the skill scales with and which combat type it uses.
 * - 'body': Physical/strength-based skills
 * - 'mind': Mental/intelligence-based skills
 * - 'heart': Emotional/charisma-based skills
 */
export type SkillsStatType = 'body' | 'mind' | 'heart';

/**
 * Skill category type
 * - 'fallacy': Skills based on logical fallacies
 * - 'paradox': Skills based on philosophical paradoxes
 */
export type SkillCategory = 'fallacy' | 'paradox';

/**
 * Learning requirement for a skill
 * Defines the prerequisites a character must meet to learn this skill.
 * @property level - Minimum character level required to learn this skill
 * @property statRequirementType - Optional: which base stat must meet the requirement (body/mind/heart)
 * @property statRequirementValue - Optional: minimum value for the specified stat
 */
export interface SkillLearningRequirement {
    level: number;
    statRequirementType?: SkillsStatType;
    statRequirementValue?: number;
}

/**
 * Combat effects for different scenarios
 * (Guess) Describes what happens when a skill is used in combat.
 * @property description - Text description of the skill's effect
 * @property effect - (Guess) Mechanical effect identifier or formula for the skill
 */
export interface SkillCombatEffects {
    description: string;
    effect?: string;

    // TODO: Add more combat effects
    // --> potentialStatusEffects
}

/**
 * Skill entity representing an ability that can be learned and used in combat
 * @property id - Unique identifier for this skill
 * @property name - Display name of the skill
 * @property description - Flavor text or lore description of the skill
 * @property level - (Guess) Skill level or power tier
 * @property manaCost - Mana points required to use this skill
 * @property damageCalculation - Optional: formula or description for calculating damage
 * @property effect - Optional: (Guess) mechanical effect identifier or description
 * @property type - Category of skill (fallacy or paradox)
 * @property philosophicalAspect - Optional: which stat type this skill is aligned with
 * @property learningRequirement - Optional: prerequisites needed to learn this skill
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

