/**
 * Combat System Implementation
 * Turn-based RPG combat with rock-paper-scissors mechanics
 * Heart > Body > Mind > Heart (cyclic advantage)
 */

import { randomLogic } from '../Enemy/enemy.logic';
import { Character } from '../Character/types';
import { Enemy, EnemyLogic } from '../Enemy/types';
import { getEnemyRelatedStat } from '../Enemy';
import { isCharacter } from '../Utils/typeGuards';
import { createDieRoll, createDieRollWithAdvantage } from '../Utils';
import { FRIENDSHIP_COUNTER_MAX, MAX_EFFECT_DURATION } from '../Game/game-mechanics.constants';
import { lookupEffect } from '../Effects/effects.library';
import { getResistStatFromResistedBy } from 'Character';

import {
  Stance,
  Action,
  Advantage,
  CombatAction,
  BattleLogEntry,
  CombatState,
} from './types';
import { ActiveEffect, EffectApplicationResult, EffectType } from 'Effects/types';

// ============================================================================
// ENEMY ACTION
// ============================================================================

/**
 * Determines the enemy's action based on the enemy's logic
 * @param enemyLogic - The logic type chosen by the enemy (random, aggressive, etc.)
 * @returns The enemy's combat action (stance + action)
 */
export const determineEnemyAction = (enemyLogic: EnemyLogic): CombatAction => {
  switch (enemyLogic) {
    case 'random':
    default:
      return randomLogic();
  }
};

// ============================================================================
// COMBAT END CONDITIONS
// ============================================================================

/**
 * Checks if combat should continue based on health values and friendship
 * @param state - The current combat state
 * @returns True if combat is still ongoing
 */
export function isCombatOngoing(state: CombatState): boolean {
  return state.active && state.player.health > 0 && state.enemy.health > 0 && state.friendshipCounter < FRIENDSHIP_COUNTER_MAX;
}

/**
 * Determines the outcome of combat
 * @param state - The current combat state
 * @returns 'player' | 'ko' | 'friendship' | 'ongoing'
 */
export function determineCombatEnd(state: CombatState): 'player' | 'ko' | 'friendship' | 'ongoing' {
  if (state.enemy.health <= 0) return 'player';
  if (state.player.health <= 0) return 'ko';
  if (state.friendshipCounter >= FRIENDSHIP_COUNTER_MAX) return 'friendship';
  return 'ongoing';
}

// ============================================================================
// TYPE ADVANTAGE SYSTEM (Rock-Paper-Scissors)
// ============================================================================

/**
 * Determines the advantage relationship between two attack types.
 * Heart > Body > Mind > Heart (cyclic)
 * @param attackerType - The attacker's chosen stance
 * @param defenderType - The defender's chosen stance
 * @returns The advantage result
 */
export function determineAdvantage(attackerType: Stance, defenderType: Stance): Advantage {
  if (attackerType === defenderType) return 'neutral';
  if (attackerType === 'heart' && defenderType === 'body') return 'advantage';
  if (attackerType === 'body' && defenderType === 'mind') return 'advantage';
  if (attackerType === 'mind' && defenderType === 'heart') return 'advantage';
  return 'disadvantage';
}

/**
 * Returns a flat roll modifier for advantage/disadvantage.
 * @param advantage - The advantage to get the modifier for
 * @returns +2 for advantage, −2 for disadvantage, 0 for neutral
 */
export function getAdvantageModifier(advantage: Advantage): number {
  switch (advantage) {
    case 'advantage':    return 2;
    case 'disadvantage': return -2;
    default:             return 0;
  }
}

/**
 * Returns true if the attacker has type advantage over the defender
 * @param attackerType - The attacker's stance
 * @param defenderType - The defender's stance
 * @returns True if attacker has advantage
 */
export function hasAdvantage(attackerType: Stance, defenderType: Stance): boolean {
  return determineAdvantage(attackerType, defenderType) === 'advantage';
}

// ============================================================================
// COMBAT ACTION UTILITIES
// ============================================================================

/**
 * Generates the enemy's attack type choice using AI logic
 * @param _state - The current combat state (reserved for future AI strategies)
 * @param enemy - The enemy whose logic to use
 * @returns The selected stance
 */
export function generateEnemyAttackType(_state: CombatState, enemy: Enemy): Stance {
  return determineEnemyAction(enemy.logic).type;
}

/**
 * Generates the enemy's action (attack/defend) using AI logic
 * @param _state - The current combat state (reserved for future AI strategies)
 * @param enemy - The enemy whose logic to use
 * @returns The selected action
 */
export function generateEnemyAction(_state: CombatState, enemy: Enemy): Action {
  return determineEnemyAction(enemy.logic).action;
}

/**
 * Validates if a combat action is complete and valid
 * @param action - The combat action to validate
 * @returns True if action has both type and action defined
 */
export function isValidCombatAction(action: Partial<CombatAction>): action is CombatAction {
  return action.type !== undefined && action.action !== undefined;
}

// ============================================================================
// STAT LOOKUP BY ACTION TYPE
// ============================================================================

/**
 * Returns the raw base stat for a given action type.
 * Character → baseStats.heart / .body / .mind
 * Enemy → attack stat (serves as the base for AI combatants)
 * @param character - The entity to look up
 * @param type - The stance type
 * @returns The base stat value
 */
export function getBaseStatForType(character: Character | Enemy, type: Stance): number {
  if (isCharacter(character)) return character.baseStats[type];
  return getEnemyRelatedStat(character, type, false) ?? 0;
}

/**
 * Returns the ATTACK stat for a given action type — used in combat rolls.
 * Character → derivedStats.physicalAttack / mentalAttack / emotionalAttack
 * Enemy → derivedStats attack values
 *
 * Note: physicalSkill / mentalSkill / emotionalSkill are SEPARATE — those feed
 * the philosophy bar and skill-usage system, not combat rolls.
 * @param character - The entity to look up
 * @param type - The stance type
 * @returns The attack stat value
 */
export function getAttackStatForType(character: Character | Enemy, type: Stance): number {
  if (isCharacter(character)) {
    switch (type) {
      case 'body':  return character.derivedStats.physicalAttack;
      case 'mind':  return character.derivedStats.mentalAttack;
      case 'heart': return character.derivedStats.emotionalAttack;
    }
  }
  return getEnemyRelatedStat(character as Enemy, type, false) ?? 0;
}

/**
 * Returns the defense stat for a given action type.
 * Character → derivedStats (physicalDefense / mentalDefense / emotionalDefense)
 * Enemy → derivedStats defense values
 * @param character - The entity to look up
 * @param type - The stance type
 * @returns The defense stat value
 */
export function getDefenseStatForType(character: Character | Enemy, type: Stance): number {
  if (isCharacter(character)) {
    switch (type) {
      case 'body':  return character.derivedStats.physicalDefense;
      case 'mind':  return character.derivedStats.mentalDefense;
      case 'heart': return character.derivedStats.emotionalDefense;
    }
  }
  return getEnemyRelatedStat(character as Enemy, type, true) ?? 0;
}

/**
 * Returns the saving throw stat for a given action type.
 * Used when resisting effects (Phase 1 effects engine).
 * Enemies fall back to defense stat since they don't have save stats.
 * @param character - The entity to look up
 * @param type - The stance type
 * @returns The save stat value
 */
export function getSaveStatForType(character: Character | Enemy, type: Stance): number {
  if (isCharacter(character)) {
    switch (type) {
      case 'body':  return character.nonCombatStats.physicalSave;
      case 'mind':  return character.nonCombatStats.mentalSave;
      case 'heart': return character.nonCombatStats.emotionalSave;
    }
  }
  return getDefenseStatForType(character, type);
}

// ============================================================================
// DICE ROLLING
// ============================================================================

/**
 * Performs a d20 skill check roll, respecting advantage/disadvantage
 * @param baseStat - The stat modifier to add to the roll
 * @param advantage - Whether the roll has advantage, neutral, or disadvantage
 * @returns Object with total, raw roll, and modifier
 */
export function rollSkillCheck(
  baseStat: number,
  advantage: Advantage,
): { total: number; roll: number; modifier: number } {
  const roll = createDieRollWithAdvantage(advantage)();
  return { total: roll + baseStat, roll, modifier: baseStat };
}

// ============================================================================
// CRITICAL HIT / MISS
// ============================================================================

/** Returns true on a natural 20 (critical hit) */
export function isCriticalHit(roll: number): boolean { return roll === 20; }

/** Returns true on a natural 1 (critical miss / fumble) */
export function isCriticalMiss(roll: number): boolean { return roll === 1; }

// ============================================================================
// DAMAGE CALCULATIONS
// ============================================================================

/**
 * Doubles damage for a critical hit. Adjust multiplier here for balance.
 * @param baseDamage - The base damage before critical multiplier
 * @returns The damage after applying critical multiplier
 */
export function applyCriticalMultiplier(baseDamage: number): number {
  return baseDamage * 2;
}

/**
 * Calculates final damage after applying all defence modifiers.
 *
 * Defence reduction pipeline:
 *   1. `baseDefense` is the raw stat for the defender's matching type.
 *   2. `defenseMultiplier` scales that stat based on whether the defender is
 *      actively defending and which type-advantage they have:
 *        - Defending with advantage    → DEFENSE_MULTIPLIERS['advantage']    (×3)
 *        - Defending with neutral      → DEFENSE_MULTIPLIERS['neutral']      (×2)
 *        - Defending with disadvantage → DEFENSE_MULTIPLIERS['disadvantage'] (×1.5)
 *        - Not defending (passive)     → PASSIVE_DEFENSE_MULTIPLIER          (×1)
 *   3. `effectDefenseModifier` is a flat bonus/penalty to defence from active
 *      effects (e.g. a vulnerability debuff lowering effective defense).
 *   4. `isCritical` doubles the incoming damage before defence is applied.
 *   5. `damageBonus` is a flat bonus added to the post-critical damage
 *      (e.g. the Exposed Reasoning mark intensity).
 *
 * Formula:
 *   effectiveDamage = (isCritical ? baseDamage × 2 : baseDamage) + damageBonus
 *   effectiveDefense = max(0, baseDefense × defenseMultiplier + effectDefenseModifier)
 *   finalDamage = max(0, ceil(effectiveDamage − effectiveDefense))
 *
 * @param baseDamage - Raw damage before any modifier
 * @param baseDefense - Defender's raw defense stat for the matched type
 * @param defenseMultiplier - Multiplier applied to base defense (from DEFENSE_MULTIPLIERS or PASSIVE_DEFENSE_MULTIPLIER)
 * @param isCritical - Whether this hit is a critical (doubles damage)
 * @param damageBonus - Optional flat damage bonus added after the crit multiplier
 * @param effectDefenseModifier - Optional flat modifier to effective defense from active effects
 * @returns Final damage, minimum 0
 */
export function calculateFinalDamage(
  baseDamage: number,
  baseDefense: number,
  defenseMultiplier: number,
  isCritical: boolean,
  damageBonus = 0,
  effectDefenseModifier = 0,
): number {
  const effectiveDamage  = (isCritical ? applyCriticalMultiplier(baseDamage) : baseDamage) + damageBonus;
  const effectiveDefense = Math.max(0, baseDefense * defenseMultiplier + effectDefenseModifier);
  return Math.ceil(Math.max(0, effectiveDamage - effectiveDefense));
}

// ============================================================================
// ATTACK / DEFENSE ROLL CALCULATIONS (Phase 2 — not yet wired to reducer)
// ============================================================================

/**
 * Performs an attack roll for a character.
 * TODO (Phase 2a): wire advantage modifier from active effects.
 * @param attacker - The attacking entity
 * @param attackType - The stance used for the attack
 * @param advantage - The advantage/disadvantage state
 * @returns Roll result with total, raw roll, modifier, and details string
 */
export function performAttackRoll(
  attacker: Character | Enemy,
  attackType: Stance,
  advantage: Advantage,
): { total: number; roll: number; modifier: number; details: string } {
  return 'Implement me' as any;
}

/**
 * Performs a defense roll for a character.
 * TODO (Phase 2a): wire defense modifier from active effects.
 * @param defender - The defending entity
 * @param attackType - The stance type of the incoming attack
 * @param isDefending - Whether the defender chose the 'defend' action
 * @returns Roll result with total, raw roll, modifier, and details string
 */
export function performDefenseRoll(
  defender: Character | Enemy,
  attackType: Stance,
  isDefending: boolean,
): { total: number; roll: number; modifier: number; details: string } {
  return 'Implement me' as any;
}

/**
 * Compares attack and defence rolls to determine whether the hit lands
 * @param attackRoll - The attacker's total roll
 * @param defenseRoll - The defender's total roll
 * @returns True if attack is successful
 */
export function isAttackSuccessful(attackRoll: number, defenseRoll: number): boolean {
  return attackRoll > defenseRoll;
}

/**
 * Calculates base damage for an attack.
 * TODO (Phase 2a): integrate stat-based damage formula once designed.
 * @param attacker - The attacking entity
 * @param attackType - The stance used for the attack
 * @param advantage - The advantage/disadvantage state
 * @returns The base damage value
 */
export function calculateBaseDamage(
  attacker: Character | Enemy,
  attackType: Stance,
  advantage: Advantage,
): number {
  return 'Implement me' as any;
}

/**
 * Calculates the damage reduction from defence.
 * TODO (Phase 2a): integrate active effect modifiers.
 * @param defender - The defending entity
 * @param attackType - The stance type of the incoming attack
 * @param isDefending - Whether the defender chose the 'defend' action
 * @returns The damage reduction value
 */
export function calculateDamageReduction(
  defender: Character | Enemy,
  attackType: Stance,
  isDefending: boolean,
): number {
  return 'Implement me' as any;
}

/**
 * Full attack sequence: rolls, hit check, damage, breakdown string.
 * TODO (Phase 2a): implement using performAttackRoll / performDefenseRoll.
 * @param attacker - The attacking entity
 * @param defender - The defending entity
 * @param attackType - The stance used for the attack
 * @param advantage - The advantage/disadvantage state
 * @param isDefending - Whether the defender chose the 'defend' action
 * @returns Complete attack result with damage, rolls, hit status, critical, and details
 */
export function calculateAttackDamage(
  attacker: Character | Enemy,
  defender: Character | Enemy,
  attackType: Stance,
  advantage: Advantage,
  isDefending: boolean,
): {
  damage: number;
  attackRoll: number;
  defenseRoll: number;
  hit: boolean;
  critical: boolean;
  details: string;
} {
  return 'Implement me' as any;
}

// ============================================================================
// STATUS EFFECTS DURING COMBAT
// ============================================================================

/**
 * Resolves whether an effect successfully applies to a target.
 * Returns a full EffectApplicationResult so the combat log has everything it needs.
 *
 * TIER 1 — Auto-applies, no roll.
 *
 * TIER 2 BUFF — Caster rolls d20 to apply to themselves.
 *   Natural 1:  Fumble — concentration shattered, buff fails.
 *   Natural 20: Crit — buff applies at double INTENSITY.
 *   Anything else: auto-succeeds.
 *
 * TIER 2 DEBUFF — Target rolls to RESIST.
 *   DR = effect.resistDR + attackerHeartBonus + equipmentBonus
 *   Natural 20: Crit resist — effect rebounds onto attacker at double INTENSITY.
 *   Natural 1:  Fumble resist — overwhelmed, effect lands at double DURATION.
 *   roll + resistStat < DR: Effect lands normally.
 *   roll + resistStat ≥ DR: Resisted.
 *
 * TIER 3 — Inescapable. Only a natural 20 on the resist roll repels it.
 *
 * @param target - The combatant the effect is being applied TO
 * @param activeEffect - The effect instance being applied
 * @param effectType - 'buff' or 'debuff'
 * @param attackerHeartBonus - Attacker's heart base stat (raises the DR)
 * @param equipmentBonus - Optional bonus from gear or skill modifiers
 * @returns The result of the application attempt
 */
export function isEffectApplied(
  target: Character | Enemy,
  activeEffect: ActiveEffect,
  effectType: EffectType,
  attackerHeartBonus: number = 0,
  equipmentBonus: number = 0,
): EffectApplicationResult {
  const tier = activeEffect.teir;

  if (tier === 'Teir 1') {
    return { success: true, activeEffect, message: `Effect applied automatically.` };
  }

  if (tier === 'Teir 2' && effectType === 'buff') {
    const roll = createDieRoll('neutral')();

    if (roll === 1) {
      return {
        success: false,
        message: `Fumble! Concentration shattered — the buff fizzles out.`,
        roll: { rolled: roll, resistStat: 0, total: roll, dr: 0, wasCrit: false, wasFumble: true },
      };
    }

    if (roll === 20) {
      const critEffect: ActiveEffect = {
        ...activeEffect,
        currentIntensity: Math.min((activeEffect.currentIntensity ?? 1) * 2, 6),
      };
      return {
        success: true, activeEffect: critEffect,
        message: `Critical focus! The buff surges at double intensity.`,
        roll: { rolled: roll, resistStat: 0, total: roll, dr: 0, wasCrit: true, wasFumble: false },
      };
    }

    return {
      success: true, activeEffect,
      message: `Buff applied.`,
      roll: { rolled: roll, resistStat: 0, total: roll, dr: 0, wasCrit: false, wasFumble: false },
    };
  }

  if (tier === 'Teir 2' && effectType === 'debuff') {
    const resistStat = activeEffect.resistedBy
      ? getResistStatFromResistedBy(target, activeEffect.resistedBy)
      : 0;
    const dr = (activeEffect.resistDR ?? 12) + attackerHeartBonus + equipmentBonus;
    const roll = createDieRoll('neutral')();
    const total = roll + resistStat;

    if (roll === 20) {
      const reboundEffect: ActiveEffect = {
        ...activeEffect,
        currentIntensity: Math.min((activeEffect.currentIntensity ?? 1) * 2, 6),
      };
      return {
        success: false, activeEffect: reboundEffect, rebounded: true,
        message: `Absolute resistance! The effect rebounds onto the attacker at double intensity.`,
        roll: { rolled: roll, resistStat, total, dr, wasCrit: true, wasFumble: false },
      };
    }

    if (roll === 1) {
      const overwhelmedEffect: ActiveEffect = {
        ...activeEffect,
        remainingDuration: (activeEffect.remainingDuration) * 2,
      };
      return {
        success: true, activeEffect: overwhelmedEffect,
        message: `Overwhelmed! The target's resistance crumbled — effect digs in at double duration.`,
        roll: { rolled: roll, resistStat, total, dr, wasCrit: false, wasFumble: true },
      };
    }

    const resisted = total >= dr;
    return {
      success: !resisted,
      activeEffect: resisted ? undefined : activeEffect,
      message: resisted
        ? `Resisted. (${roll} + ${resistStat} = ${total} vs DR ${dr})`
        : `Effect lands. (${roll} + ${resistStat} = ${total} vs DR ${dr})`,
      roll: { rolled: roll, resistStat, total, dr, wasCrit: false, wasFumble: false },
    };
  }

  if (tier === 'Teir 3') {
    const resistStat = activeEffect.resistedBy
      ? getResistStatFromResistedBy(target, activeEffect.resistedBy)
      : 0;
    const dr = (activeEffect.resistDR ?? 18) + attackerHeartBonus + equipmentBonus;
    const roll = createDieRoll('neutral')();
    const total = roll + resistStat;

    if (roll === 20) {
      return {
        success: false,
        message: `Miracle! An absolute will repelled the Tier 3 effect.`,
        roll: { rolled: roll, resistStat, total, dr, wasCrit: true, wasFumble: false },
      };
    }

    return {
      success: true, activeEffect,
      message: `Inescapable. The Tier 3 effect takes hold. (${roll} + ${resistStat} = ${total} vs DR ${dr})`,
      roll: { rolled: roll, resistStat, total, dr, wasCrit: false, wasFumble: false },
    };
  }

  return { success: false, message: `Unknown effect tier — effect not applied.` };
}

// ============================================================================
// EFFECT DURATION MANAGEMENT
// ============================================================================

/**
 * Decrements the remainingDuration of a specific active effect by 1.
 * Skips permanent effects (remainingDuration === -1).
 * Does not remove the effect — call tickAllEffects() to clean up expired effects.
 * @param target - The character or enemy whose effect is being ticked
 * @param effectId - The ID of the ActiveEffect to tick
 * @returns A new target object with the updated effect duration
 */
export function updateEffectDuration(target: Character | Enemy, effectId: string): Character | Enemy {
  const updatedEffects = target.currentActiveEffects.map((effect: ActiveEffect) => {
    if (effect.effectId !== effectId) return effect;
    if (effect.remainingDuration === -1) return effect;
    return { ...effect, remainingDuration: effect.remainingDuration - 1 };
  });
  return { ...target, currentActiveEffects: updatedEffects };
}

/**
 * Decrements every non-permanent effect on a combatant by one round.
 * Expired effects (duration hits 0) are removed from the list and returned
 * separately so the caller can announce what faded.
 * Call this at the END of each round, after all damage and effects are resolved.
 * @param target - The combatant whose effects to tick
 * @returns Object with the updated target and list of expired effects
 */
export function tickAllEffects(target: Character | Enemy): {
    target: Character | Enemy;
    expired: ActiveEffect[];
} {
    const expired: ActiveEffect[] = [];
    const remaining = target.currentActiveEffects.reduce<ActiveEffect[]>((acc, effect) => {
        if (effect.remainingDuration === -1) {
            acc.push(effect);
            return acc;
        }
        const ticked = { ...effect, remainingDuration: effect.remainingDuration - 1 };
        if (ticked.remainingDuration <= 0) {
            expired.push(ticked);
        } else {
            acc.push(ticked);
        }
        return acc;
    }, []);

    return { target: { ...target, currentActiveEffects: remaining }, expired };
}

// ============================================================================
// EFFECT-BASED COMBAT HELPERS
// ============================================================================

/** The ID of the Mind studying debuff — used by Mind/Attack for damage bonus */
export const MIND_MARK_ID = 'tier1_mind_mark';

/**
 * Returns the current intensity of the Mind studying mark on a combatant (0 if absent).
 * Mind/Attack adds this value to its raw damage roll.
 * @param target - The combatant to check
 * @returns The mark intensity, or 0 if no mark is active
 */
export function getStudyMarkIntensity(target: Character | Enemy): number {
    const mark = target.currentActiveEffects.find(e => e.effectId === MIND_MARK_ID);
    return mark?.currentIntensity ?? 0;
}

/**
 * Returns the total flat roll modifier from all active effects on a combatant.
 * Sums both flat rollModifier values (not scaled) and rollModifierPerIntensity
 * values (multiplied by current intensity).
 * @param target - The combatant to aggregate modifiers for
 * @returns The total roll modifier
 */
export function getActiveRollModifier(target: Character | Enemy): number {
    return target.currentActiveEffects.reduce((total, ae) => {
        const def = lookupEffect(ae.effectId);
        const flat         = def?.payload.rollModifier ?? 0;
        const perIntensity = (def?.payload.rollModifierPerIntensity ?? 0) * (ae.currentIntensity ?? 1);
        return total + flat + perIntensity;
    }, 0);
}

/**
 * Returns the total reflect damage that should be dealt back when a combatant
 * bearing a thorns effect is successfully hit.
 * Formula: reflectDamage-per-intensity × currentIntensity, summed across all thorns effects.
 * @param bearer - The combatant who has thorns effects
 * @returns Total reflect damage
 */
export function getThornsReflect(bearer: Character | Enemy): number {
    return bearer.currentActiveEffects.reduce((total, ae) => {
        const def = lookupEffect(ae.effectId);
        const perIntensity = def?.payload.reflectDamage ?? 0;
        return total + perIntensity * (ae.currentIntensity ?? 1);
    }, 0);
}

/**
 * Removes a random buff from a combatant.
 * Heart/Attack uses this to strip one buff from the enemy on hit.
 * @param target - The combatant to strip a buff from
 * @returns Updated target and the removed effect, if any
 */
export function removeRandomBuff(target: Character | Enemy): {
    target: Character | Enemy;
    removed: ActiveEffect | null;
} {
    const buffs = target.currentActiveEffects.filter(ae => lookupEffect(ae.effectId)?.type === 'buff');
    if (buffs.length === 0) return { target, removed: null };

    const removed = buffs[Math.floor(Math.random() * buffs.length)];
    const updated = target.currentActiveEffects.filter(ae => ae !== removed);
    return { target: { ...target, currentActiveEffects: updated }, removed };
}

/**
 * Adds duration to a random buff on a combatant, capped at MAX_EFFECT_DURATION.
 * Heart/Attack uses this to extend one of the player's active buffs on hit.
 * @param target - The combatant whose buff to extend
 * @param amount - Number of rounds to add
 * @returns Updated target and the extended effect, if any
 */
export function extendRandomBuffDuration(
    target: Character | Enemy,
    amount: number,
): { target: Character | Enemy; extended: ActiveEffect | null } {
    const buffs = target.currentActiveEffects.filter(ae => lookupEffect(ae.effectId)?.type === 'buff');
    if (buffs.length === 0) return { target, extended: null };

    const original = buffs[Math.floor(Math.random() * buffs.length)];
    const extended: ActiveEffect = {
        ...original,
        remainingDuration: Math.min(original.remainingDuration + amount, MAX_EFFECT_DURATION),
    };
    const updatedEffects = target.currentActiveEffects.map(ae => ae === original ? extended : ae);
    return { target: { ...target, currentActiveEffects: updatedEffects }, extended };
}

/**
 * Applies per-round regeneration from any active regen effects on a combatant.
 * Returns the healed combatant and total HP restored.
 * Call this at the start of each round before the player makes their choice.
 * @param target - The combatant to apply regen to
 * @returns Object with updated target and total HP healed
 */
export function applyRegen(target: Character | Enemy): {
    target: Character | Enemy;
    healed: number;
} {
    let healed = 0;
    let updated = target;

    for (const ae of target.currentActiveEffects) {
        const def = lookupEffect(ae.effectId);
        const perRound = def?.payload.regeneration?.healthPerRound ?? 0;
        if (perRound <= 0) continue;
        const amount = perRound * (ae.currentIntensity ?? 1);
        healed += amount;
        updated = isCharacter(updated)
            ? healCharacter(updated, amount)
            : healCharacter(updated as Enemy, amount);
    }

    return { target: updated, healed };
}

// ============================================================================
// HEALTH MANAGEMENT
// ============================================================================

/**
 * Applies damage to a Character, clamping health to 0.
 * @param character - The character to damage
 * @param damage - Amount of damage to deal
 * @returns New character with updated health
 */
export function applyDamage(character: Character, damage: number): Character;
/**
 * Applies damage to an Enemy, clamping health to 0.
 * @param character - The enemy to damage
 * @param damage - Amount of damage to deal
 * @returns New enemy with updated health
 */
export function applyDamage(character: Enemy, damage: number): Enemy;
export function applyDamage(character: Character | Enemy, damage: number): Character | Enemy {
  const newHealth = Math.max(0, character.health - damage);
  if (isCharacter(character)) return { ...character, health: newHealth };
  return { ...(character as Enemy), health: newHealth };
}

/**
 * Heals a Character, clamping health to maxHealth.
 * @param character - The character to heal
 * @param amount - Amount of HP to restore
 * @returns New character with updated health
 */
export function healCharacter(character: Character, amount: number): Character;
/**
 * Heals an Enemy, clamping health to maxHealth.
 * @param character - The enemy to heal
 * @param amount - Amount of HP to restore
 * @returns New enemy with updated health
 */
export function healCharacter(character: Enemy, amount: number): Enemy;
export function healCharacter(character: Character | Enemy, amount: number): Character | Enemy {
  if (isCharacter(character)) {
    return { ...character, health: Math.min(character.maxHealth, character.health + amount) };
  }
  const enemy = character as Enemy;
  return { ...enemy, health: Math.min(enemy.maxHealth, enemy.health + amount) };
}

/**
 * Returns true if the combatant still has health remaining
 * @param character - The entity to check
 * @returns True if health > 0
 */
export function isAlive(character: Character | Enemy): boolean { return character.health > 0; }

/**
 * Returns true if the combatant has been defeated (health ≤ 0)
 * @param character - The entity to check
 * @returns True if health <= 0
 */
export function isDefeated(character: Character | Enemy): boolean { return character.health <= 0; }

/**
 * Returns current health as a percentage of max health (0–100)
 * @param character - The entity to check
 * @returns Health percentage
 */
export function getHealthPercentage(character: Character | Enemy): number {
  return (character.health / character.maxHealth) * 100;
}

// ============================================================================
// COMBAT ROUND PROCESSING (Phase 2c — stubs for the reducer)
// ============================================================================

/**
 * Process the player's turn within resolveCombatRound.
 * TODO (Phase 2c): implement full player turn processing.
 * @param state - The current combat state
 * @returns Damage dealt, roll value, and roll breakdown
 */
export function processPlayerTurn(state: CombatState): {
  damageToEnemy: number;
  playerRoll: number;
  playerRollDetails: string;
} {
  return 'Implement me' as any;
}

/**
 * Process the enemy's turn within resolveCombatRound.
 * TODO (Phase 2c): implement full enemy turn processing.
 * @param state - The current combat state
 * @returns Damage dealt, roll value, and roll breakdown
 */
export function processEnemyTurn(state: CombatState): {
  damageToPlayer: number;
  enemyRoll: number;
  enemyRollDetails: string;
} {
  return 'Implement me' as any;
}

/**
 * Determine who acts first based on initiative.
 * TODO (Phase 2c): implement initiative system.
 * @param player - The player character
 * @param enemy - The enemy
 * @returns Which combatant goes first
 */
export function determineTurnOrder(player: Character, enemy: Enemy): 'player' | 'enemy' {
  return 'Implement me' as any;
}

/**
 * Roll initiative for a combatant.
 * TODO (Phase 2c): implement initiative roll.
 * @param character - The combatant to roll for
 * @returns The initiative value
 */
export function rollInitiative(character: Character | Enemy): number {
  return 'Implement me' as any;
}

// ============================================================================
// BATTLE LOG UTILITIES (Phase 2c)
// ============================================================================

/**
 * Create a BattleLogEntry from a resolved round.
 * TODO (Phase 2c): implement battle log creation.
 * @param state - The current combat state
 * @param roundResults - The results of the round's combat resolution
 * @returns A complete battle log entry
 */
export function createBattleLogEntry(
  state: CombatState,
  roundResults: {
    advantage: Advantage;
    playerRoll: number;
    playerRollDetails: string;
    enemyRoll: number;
    enemyRollDetails: string;
    damageToPlayer: number;
    damageToEnemy: number;
  },
): BattleLogEntry {
  return 'Implement me' as any;
}

/**
 * Format all battle log entries as readable strings.
 * TODO (Phase 2c): implement log formatting.
 * @param state - The combat state containing the log
 * @returns Array of formatted log strings
 */
export function formatAllBattleLogs(state: CombatState): string[] {
  return 'Implement me' as any;
}

/**
 * Generate the victory/defeat summary message.
 * TODO (Phase 2c): implement result message generation.
 * @param state - The final combat state
 * @returns A summary message string
 */
export function generateCombatResultMessage(state: CombatState): string {
  return 'Implement me' as any;
}
