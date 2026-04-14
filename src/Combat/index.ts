/**
 * Combat System — core mechanics for turn-based Heart/Body/Mind combat.
 */

import { randomLogic } from '../Enemy/enemy.logic';
import { Character } from '../Character/types';
import { Enemy, EnemyLogic } from '../Enemy/types';
import { getEnemyRelatedStat } from '../Enemy';
import { isCharacter } from '../Utils/typeGuards';
import { createDieRoll } from '../Utils';
import { FRIENDSHIP_COUNTER_MAX, MAX_EFFECT_DURATION } from '../Game/game-mechanics.constants';
import { lookupEffect } from '../Effects/effects.library';
import { getResistStatFromResistedBy } from 'Character';

import {
  Stance,
  Action,
  Advantage,
  CombatAction,
  CombatState,
} from './types';
import { ActiveEffect, EffectApplicationResult, EffectType } from 'Effects/types';

// ============================================================================
// ENEMY ACTION
// ============================================================================

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

export function isCombatOngoing(state: CombatState): boolean {
  return state.active && state.player.health > 0 && state.enemy.health > 0 && state.friendshipCounter < FRIENDSHIP_COUNTER_MAX;
}

export function determineCombatEnd(state: CombatState): 'player' | 'ko' | 'friendship' | 'ongoing' {
  if (state.enemy.health <= 0) return 'player';
  if (state.player.health <= 0) return 'ko';
  if (state.friendshipCounter >= FRIENDSHIP_COUNTER_MAX) return 'friendship';
  return 'ongoing';
}

// ============================================================================
// TYPE ADVANTAGE SYSTEM (Rock-Paper-Scissors)
// ============================================================================

export function determineAdvantage(attackerType: Stance, defenderType: Stance): Advantage {
  if (attackerType === defenderType) return 'neutral';
  if (attackerType === 'heart' && defenderType === 'body') return 'advantage';
  if (attackerType === 'body' && defenderType === 'mind') return 'advantage';
  if (attackerType === 'mind' && defenderType === 'heart') return 'advantage';
  return 'disadvantage';
}

export function getAdvantageModifier(advantage: Advantage): number {
  switch (advantage) {
    case 'advantage':    return 2;
    case 'disadvantage': return -2;
    default:             return 0;
  }
}

export function hasAdvantage(attackerType: Stance, defenderType: Stance): boolean {
  return determineAdvantage(attackerType, defenderType) === 'advantage';
}

// ============================================================================
// COMBAT ACTION UTILITIES
// ============================================================================

export function generateEnemyAttackType(_state: CombatState, enemy: Enemy): Stance {
  return determineEnemyAction(enemy.logic).type;
}

export function generateEnemyAction(_state: CombatState, enemy: Enemy): Action {
  return determineEnemyAction(enemy.logic).action;
}

export function isValidCombatAction(action: Partial<CombatAction>): action is CombatAction {
  return action.type !== undefined && action.action !== undefined;
}

// ============================================================================
// STAT LOOKUP BY ACTION TYPE
// ============================================================================

export function getBaseStatForType(character: Character | Enemy, type: Stance): number {
  if (isCharacter(character)) return character.baseStats[type];
  return getEnemyRelatedStat(character, type, false) ?? 0;
}

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

export function rollSkillCheck(
  baseStat: number,
  advantage: Advantage,
): { total: number; roll: number; modifier: number } {
  const roll = createDieRoll(advantage)();
  return { total: roll + baseStat, roll, modifier: baseStat };
}

// ============================================================================
// CRITICAL HIT / MISS
// ============================================================================

export function isCriticalHit(roll: number): boolean { return roll === 20; }
export function isCriticalMiss(roll: number): boolean { return roll === 1; }

// ============================================================================
// DAMAGE CALCULATIONS
// ============================================================================

export function applyCriticalMultiplier(baseDamage: number): number {
  return baseDamage * 2;
}

export function calculateFinalDamage(
  baseDamage: number,
  damageReduction: number,
  isCritical: boolean,
  damageBonus = 0,
): number {
  const damage = isCritical ? applyCriticalMultiplier(baseDamage) : baseDamage;
  return Math.ceil(Math.max(0, damage + damageBonus - damageReduction));
}

export function isAttackSuccessful(attackRoll: number, defenseRoll: number): boolean {
  return attackRoll > defenseRoll;
}

// ============================================================================
// STATUS EFFECTS DURING COMBAT
// ============================================================================

/**
 * Resolves whether an effect successfully applies to a target.
 * TIER 1: Auto-applies.
 * TIER 2 BUFF: Caster rolls d20. Nat 1 = fumble. Nat 20 = double intensity.
 * TIER 2 DEBUFF: Target rolls to resist. Nat 20 = rebound. Nat 1 = double duration.
 * TIER 3: Only nat 20 repels it.
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

export function updateEffectDuration(target: Character | Enemy, effectId: string): Character | Enemy {
  const updatedEffects = target.currentActiveEffects.map((effect: ActiveEffect) => {
    if (effect.effectId !== effectId) return effect;
    if (effect.remainingDuration === -1) return effect;
    return { ...effect, remainingDuration: effect.remainingDuration - 1 };
  });
  return { ...target, currentActiveEffects: updatedEffects };
}

/**
 * Decrements every non-permanent effect by one round.
 * Returns the updated target and a list of expired effects.
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

export const MIND_MARK_ID = 'tier1_mind_mark';

export function getStudyMarkIntensity(target: Character | Enemy): number {
    const mark = target.currentActiveEffects.find(e => e.effectId === MIND_MARK_ID);
    return mark?.currentIntensity ?? 0;
}

/** Total flat roll modifier from all active effects on a combatant. */
export function getActiveRollModifier(target: Character | Enemy): number {
    return target.currentActiveEffects.reduce((total, ae) => {
        const def = lookupEffect(ae.effectId);
        const flat         = def?.payload.rollModifier ?? 0;
        const perIntensity = (def?.payload.rollModifierPerIntensity ?? 0) * (ae.currentIntensity ?? 1);
        return total + flat + perIntensity;
    }, 0);
}

/** Total thorns reflect damage when bearer is hit. */
export function getThornsReflect(bearer: Character | Enemy): number {
    return bearer.currentActiveEffects.reduce((total, ae) => {
        const def = lookupEffect(ae.effectId);
        const perIntensity = def?.payload.reflectDamage ?? 0;
        return total + perIntensity * (ae.currentIntensity ?? 1);
    }, 0);
}

/** Removes a random buff; returns updated target and what was removed. */
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

/** Extends one random buff's duration; returns updated target and what was extended. */
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

/** Applies per-round regeneration from active regen effects. */
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

export function applyDamage(character: Character, damage: number): Character;
export function applyDamage(character: Enemy, damage: number): Enemy;
export function applyDamage(character: Character | Enemy, damage: number): Character | Enemy {
  const newHealth = Math.max(0, character.health - damage);
  if (isCharacter(character)) return { ...character, health: newHealth };
  return { ...(character as Enemy), health: newHealth };
}

export function healCharacter(character: Character, amount: number): Character;
export function healCharacter(character: Enemy, amount: number): Enemy;
export function healCharacter(character: Character | Enemy, amount: number): Character | Enemy {
  if (isCharacter(character)) {
    return { ...character, health: Math.min(character.maxHealth, character.health + amount) };
  }
  const enemy = character as Enemy;
  return { ...enemy, health: Math.min(enemy.maxHealth, enemy.health + amount) };
}

export function isAlive(character: Character | Enemy): boolean { return character.health > 0; }
export function isDefeated(character: Character | Enemy): boolean { return character.health <= 0; }

export function getHealthPercentage(character: Character | Enemy): number {
  return (character.health / character.maxHealth) * 100;
}
