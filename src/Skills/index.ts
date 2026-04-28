/**
 * Skills System Module
 * Handles skill creation, validation, damage calculation, and execution.
 */

import { Skill, SkillCategory, SkillsStatType, SkillTargetType, SkillScalingStat, SkillAdvantageInteraction, SkillTeir } from './types';
import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { Advantage, CombatState, CombatEffectTrigger, Stance } from '../Combat/types';
import { lookupSkill, skillLibrary } from './skill.library';
import { applyEffect } from '../Effects';
import { lookupEffect } from '../Effects/effects.library';
import { applyDamage, getAdvantageModifier, healCharacter } from '../Combat/index';

export type {
    Skill, SkillCategory, SkillsStatType, SkillLearningRequirement,
    SkillTargetType, SkillScalingStat, SkillAdvantageInteraction, SkillTeir,
} from './types';

export {
    skillLibrary, lookupSkill, getAllSkills,
    getSkillsByCategory, getSkillsByAspect,
} from './skill.library';

// ============================================================================
// SKILL CREATION
// ============================================================================

/**
 * Options bag for `createSkill`. Mirrors the `Skill` interface but lets
 * callers leave defaults off — helpful for tests and mods.
 */
export interface CreateSkillOptions {
    id: string;
    name: string;
    description: string;
    category: SkillCategory;
    philosophicalAspect: SkillsStatType;
    level: number;
    manaCost: number;
    targetType: SkillTargetType;
    basePower: number;
    scalingStat: SkillScalingStat;
    advantageInteraction?: SkillAdvantageInteraction;
    teir?: SkillTeir;
    combatEffects?: CombatEffectTrigger[];
    learningRequirement?: Skill['learningRequirement'];
    damageCalculation?: string;
    effect?: string;
}

/**
 * Builds a `Skill` from a partial options object, supplying sensible
 * defaults for the fields most callers don't override (`teir = 'Teir 1'`,
 * `advantageInteraction = 'standard'`, `combatEffects = []`).
 *
 * @param options - The skill data
 * @returns A fully-populated `Skill`
 */
export function createSkill(options: CreateSkillOptions): Skill {
    return {
        advantageInteraction: 'standard',
        teir: 'Teir 1',
        combatEffects: [],
        ...options,
    };
}

// ============================================================================
// SKILL USAGE GUARDS
// ============================================================================

/**
 * Determines whether a character may use a given skill RIGHT NOW.
 *
 * Checks (in order):
 *   1. Sufficient mana (`character.mana >= skill.manaCost`)
 *   2. Character meets `learningRequirement.level`
 *   3. Character meets `learningRequirement.statRequirementValue` for the
 *      `learningRequirement.statRequirementType` base stat (if set)
 *
 * Note: prerequisite-skill checks are deferred to `learnSkill`, since the
 * Character type does not currently track a `knownSkills` array (Phase 5b).
 *
 * @param character - The character attempting to use the skill
 * @param skill - The skill being used
 * @returns True when every gate passes
 */
export function canUseSkill(character: Character, skill: Skill): boolean {
    if (character.mana < skill.manaCost) return false;
    const req = skill.learningRequirement;
    if (req) {
        if (character.level < req.level) return false;
        if (req.statRequirementType && req.statRequirementValue !== undefined) {
            if (character.baseStats[req.statRequirementType] < req.statRequirementValue) {
                return false;
            }
        }
    }
    return true;
}

// ============================================================================
// DAMAGE / HEALING CALCULATION
// ============================================================================

const skillStanceForAspect: Record<SkillsStatType, Stance> = {
    body: 'body',
    mind: 'mind',
    heart: 'heart',
};

function getDerivedStat(character: Character | Enemy, stat: SkillScalingStat): number {
    const stats = character.derivedStats as unknown as Record<string, number>;
    return stats[stat] ?? 0;
}

/**
 * Computes the damage / healing power produced by a skill.
 *
 * Formula:
 *   raw = skill.basePower + character.derivedStats[skill.scalingStat]
 *   advantageMod = (per advantageInteraction)
 *     - 'standard'  → +2 / 0 / −2
 *     - 'amplify'   → +4 / 0 / −4
 *     - 'reverse'   → −2 / 0 / +2 (advantage flipped)
 *     - 'ignore'    → 0
 *   final = max(0, raw + advantageMod)
 *
 * @param character - The skill user
 * @param skill - The skill being used
 * @param advantage - The matchup advantage relative to the target
 * @returns The final damage / healing value
 */
export function calculateSkillDamage(
    character: Character | Enemy,
    skill: Skill,
    advantage: Advantage,
): number {
    const raw = skill.basePower + getDerivedStat(character, skill.scalingStat);

    let mod = 0;
    switch (skill.advantageInteraction) {
        case 'standard':
            mod = getAdvantageModifier(advantage);
            break;
        case 'amplify':
            mod = getAdvantageModifier(advantage) * 2;
            break;
        case 'reverse': {
            const flipped: Advantage = advantage === 'advantage'
                ? 'disadvantage' : advantage === 'disadvantage' ? 'advantage' : 'neutral';
            mod = getAdvantageModifier(flipped);
            break;
        }
        case 'ignore':
        default:
            mod = 0;
    }

    return Math.max(0, raw + mod);
}

// ============================================================================
// SKILL EXECUTION
// ============================================================================

/**
 * Result of executing a skill against a `CombatState`.
 *
 * @property state - The new combat state
 * @property damageDealt - HP removed from the receiver (0 for self-targets)
 * @property healing - HP restored on the actor (only set for self skills)
 * @property procs - Per-fired-trigger application messages
 * @property message - One-line summary suitable for the battle log
 */
export interface SkillExecutionResult {
    state: CombatState;
    damageDealt: number;
    healing: number;
    procs: string[];
    message: string;
}

/**
 * Executes a skill within a `CombatState`. Pure — returns a new state
 * without mutating the input.
 *
 * Pipeline:
 *   1. Check `canUseSkill` (returns the input state unchanged on failure).
 *   2. Subtract `manaCost` from the actor.
 *   3. Compute damage/healing via `calculateSkillDamage`.
 *      - 'self' / 'all_allies' → heal the actor
 *      - 'enemy' / 'all_enemies' → damage the receiver
 *   4. Apply each `combatEffects` trigger directly (chance, crit, fumble
 *      do NOT apply — skills always trigger their declared effects unless
 *      `chance < 1`, in which case they roll like any other proc).
 *
 * @param state - Current combat state
 * @param skillId - ID of the skill to execute
 * @param actor - 'player' or 'enemy' — who is using the skill
 * @returns The execution result, or the unchanged state with a failure message
 */
export function executeSkill(
    state: CombatState,
    skillId: string,
    actor: 'player' | 'enemy' = 'player',
): SkillExecutionResult {
    const skill = lookupSkill(skillId);
    if (!skill) {
        return { state, damageDealt: 0, healing: 0, procs: [], message: `Unknown skill: ${skillId}.` };
    }

    const actorEntity = state[actor] as Character | Enemy;
    if ('mana' in actorEntity && actorEntity.mana < skill.manaCost) {
        return {
            state, damageDealt: 0, healing: 0, procs: [],
            message: `${actorEntity.name} can\'t afford ${skill.name} (needs ${skill.manaCost} mana).`,
        };
    }

    const opposingKey: 'player' | 'enemy' = actor === 'player' ? 'enemy' : 'player';
    const target = state[opposingKey];
    const aspectStance = skillStanceForAspect[skill.philosophicalAspect];
    const targetStance: Stance = state[opposingKey === 'player' ? 'playerChoice' : 'enemyChoice'].type ?? aspectStance;

    const advantage: Advantage = aspectStance === targetStance ? 'neutral'
        : (aspectStance === 'heart' && targetStance === 'body')
        || (aspectStance === 'body' && targetStance === 'mind')
        || (aspectStance === 'mind' && targetStance === 'heart') ? 'advantage' : 'disadvantage';

    const power = calculateSkillDamage(actorEntity, skill, advantage);

    let next: CombatState = state;

    if ('mana' in actorEntity) {
        const updatedActor = { ...actorEntity, mana: actorEntity.mana - skill.manaCost };
        next = { ...next, [actor]: updatedActor } as CombatState;
    }

    let damageDealt = 0;
    let healing = 0;

    if (skill.targetType === 'self' || skill.targetType === 'all_allies') {
        healing = power;
        const healed = actor === 'player'
            ? healCharacter(next.player, healing)
            : healCharacter(next.enemy, healing);
        next = { ...next, [actor]: healed } as CombatState;
    } else {
        damageDealt = power;
        const damaged = opposingKey === 'player'
            ? applyDamage(next.player, damageDealt)
            : applyDamage(next.enemy, damageDealt);
        next = { ...next, [opposingKey]: damaged } as CombatState;
    }

    const procs: string[] = [];
    for (const trigger of skill.combatEffects) {
        const hit = trigger.chance >= 1 ? true : Math.random() < trigger.chance;
        if (!hit) continue;
        const def = lookupEffect(trigger.effectId);
        if (!def) continue;
        const receiver: 'player' | 'enemy' = trigger.target === 'self' ? actor : opposingKey;
        const receiverEntity = next[receiver];
        const { activeEffects, result } = applyEffect(receiverEntity.currentActiveEffects, def, next.round);
        next = {
            ...next,
            [receiver]: { ...receiverEntity, currentActiveEffects: activeEffects },
        } as CombatState;
        procs.push(`${def.name}: ${result.message}`);
    }

    const summary =
        skill.targetType === 'self' || skill.targetType === 'all_allies'
            ? `${actorEntity.name} used ${skill.name} — restored ${healing} HP.`
            : `${actorEntity.name} used ${skill.name} on ${target.name} for ${damageDealt} damage.`;

    return { state: next, damageDealt, healing, procs, message: summary };
}

// ============================================================================
// LEARNING
// ============================================================================

/**
 * Marks a skill as learned by the character. Pure — returns a new
 * Character with the skill ID added to a `knownSkills` array.
 *
 * Because `Character` does not yet declare a `knownSkills` field
 * (Phase 5b adds it), this helper attaches the array to the returned
 * object via a structural cast. The new field is preserved by callers
 * that pass the character through unchanged.
 *
 * Returns the character UNCHANGED if:
 *   - the skill ID does not resolve to a library entry
 *   - the character does not meet `learningRequirement.level` /
 *     `statRequirementType` / `statRequirementValue`
 *   - a prerequisiteSkill is required but missing from `knownSkills`
 *
 * @param character - The character to update
 * @param skillId - The skill ID to learn
 * @returns A Character object with `knownSkills` updated (or unchanged)
 */
export function learnSkill(
    character: Character,
    skillId: string,
): Character & { knownSkills: string[] } {
    const known = (character as Character & { knownSkills?: string[] }).knownSkills ?? [];
    const skill = lookupSkill(skillId);
    if (!skill) return { ...character, knownSkills: known };

    const req = skill.learningRequirement;
    if (req) {
        if (character.level < req.level) return { ...character, knownSkills: known };
        if (req.statRequirementType && req.statRequirementValue !== undefined) {
            if (character.baseStats[req.statRequirementType] < req.statRequirementValue) {
                return { ...character, knownSkills: known };
            }
        }
        if (req.prerequisiteSkill && !known.includes(req.prerequisiteSkill)) {
            return { ...character, knownSkills: known };
        }
    }

    if (known.includes(skillId)) return { ...character, knownSkills: known };
    return { ...character, knownSkills: [...known, skillId] };
}
