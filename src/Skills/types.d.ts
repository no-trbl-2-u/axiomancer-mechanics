/**
 * Skills System Types
 * Skills come in two categories: fallacies and paradoxes
 */

import { CombatEffectTrigger } from '../Combat/types';
import { Stance, Advantage } from '../Combat/types';

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
 * @property prerequisiteSkill - Optional: skill that must be learned before this skill can be learned
 */
export interface SkillLearningRequirement {
    level: number;
    statRequirementType?: SkillsStatType;
    statRequirementValue?: number;
    prerequisiteSkill?: string;
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
 * Where a skill's effect lands.
 * - 'self'         — affects the user
 * - 'enemy'        — affects a single enemy (the current combat opponent)
 * - 'all_enemies'  — affects every enemy on the field (future multi-enemy combat)
 * - 'all_allies'   — affects every ally on the field (future ally support)
 */
export type SkillTargetType = 'self' | 'enemy' | 'all_enemies' | 'all_allies';

/**
 * Which derived stat scales the skill's `basePower` into final damage.
 * Mirrors the keys on `DerivedStats` so skills can scale off attack OR
 * skill stats — fallacies tend to scale off `*Attack`, paradoxes off
 * `*Skill` for thematic flavour.
 */
export type SkillScalingStat =
    | 'physicalAttack' | 'mentalAttack' | 'emotionalAttack'
    | 'physicalSkill'  | 'mentalSkill'  | 'emotionalSkill'
    | 'physicalDefense'| 'mentalDefense'| 'emotionalDefense';

/**
 * How the rock-paper-scissors advantage interacts with a skill.
 * - 'standard'  — apply the normal +2 / 0 / −2 advantage modifier
 * - 'amplify'   — double the advantage modifier (great for thematic spike skills)
 * - 'ignore'    — advantage is irrelevant; skill resolves at flat power
 * - 'reverse'   — invert the advantage (used by paradox-type "irony" skills)
 */
export type SkillAdvantageInteraction = 'standard' | 'amplify' | 'ignore' | 'reverse';

/**
 * Skill effect tier classification, mirroring effect tiers.
 *  - 'Teir 1' — basic, no resist
 *  - 'Teir 2' — moderate, target may resist
 *  - 'Teir 3' — powerful, only crits resist
 */
export type SkillTeir = 'Teir 1' | 'Teir 2' | 'Teir 3';

/**
 * Skill entity representing an ability that can be learned and used in combat
 * @property id - Unique identifier for this skill
 * @property name - Display name of the skill
 * @property description - Flavor text or lore description of the skill
 * @property level - Skill level or power tier
 * @property philosophicalAspect - Which stat type this skill is aligned with
 * @property manaCost - Mana points required to use this skill
 * @property category - Category of skill (fallacy or paradox)
 * @property targetType - Where the skill's effect lands
 * @property basePower - Raw damage / healing before stat scaling
 * @property scalingStat - Which derived stat multiplies into the final value
 * @property advantageInteraction - How RPS advantage modifies the skill
 * @property teir - Effect tier (drives resist behaviour the same way Effects do)
 * @property combatEffects - Tier 2/3 effect triggers fired when the skill resolves
 * @property damageCalculation - Optional: formula or description for calculating damage
 * @property effect - Optional: text description of any mechanical extra
 * @property learningRequirement - Optional: prerequisites needed to learn this skill
 */
export interface Skill {
    id: string;
    name: string;
    category: SkillCategory;
    philosophicalAspect: SkillsStatType;
    description: string;
    level: number;
    manaCost: number;
    targetType: SkillTargetType;
    basePower: number;
    scalingStat: SkillScalingStat;
    advantageInteraction: SkillAdvantageInteraction;
    teir: SkillTeir;
    combatEffects: CombatEffectTrigger[];
    learningRequirement?: SkillLearningRequirement;
    damageCalculation?: string;
    effect?: string;
}

