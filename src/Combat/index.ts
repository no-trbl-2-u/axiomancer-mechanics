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
import { createDieRoll } from '../Utils';
import { FRIENDSHIP_COUNTER_MAX, MAX_EFFECT_DURATION } from '../Game/game-mechanics.constants';
import { lookupEffect } from '../Effects/effects.library';

import {
  ActionType,
  Action,
  Advantage,
  CombatAction,
  BattleLogEntry,
  CombatState,
} from './types';
import { ActiveEffect, EffectApplicationResult, EffectType } from 'Effects/types';
import { getResistStatFromResistedBy } from 'Character';
import { CritStyle } from './types';

// ============================================================================
// ENEMY ACTION
// ============================================================================

/**
 * Determines the enemy's action based on the enemy's logic
 * @param enemyLogic - The logic chosen by the enemy
 * @returns The enemy's action
 */
export const determineEnemyAction = (enemyLogic: EnemyLogic): CombatAction => {
  switch (enemyLogic) {
    case 'random':
      return randomLogic();
    default:
      return randomLogic();
  }
};

// ============================================================================
// COMBAT END CONDITIONS
// ============================================================================

/**
 * Checks if combat should end based on health values
 * @param state - The current combat state
 * @returns True if either combatant has 0 or less health
 */
export function isCombatOngoing(state: CombatState): boolean {
  return state.active && state.player.health > 0 && state.enemy.health > 0 && state.friendshipCounter < FRIENDSHIP_COUNTER_MAX;
}

/**
 * Determines the winner of the combat
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
 */
export function determineAdvantage(attackerType: ActionType, defenderType: ActionType): Advantage {
  if (attackerType === defenderType) return 'neutral';
  if (attackerType === 'heart' && defenderType === 'body') return 'advantage';
  if (attackerType === 'body' && defenderType === 'mind') return 'advantage';
  if (attackerType === 'mind' && defenderType === 'heart') return 'advantage';
  return 'disadvantage';
}

/**
 * Returns a flat roll modifier for advantage/disadvantage.
 * Tune the values here to adjust balance.
 * Roadmap note: "+2 / 0 / −2 or whatever the balance calls for"
 */
export function getAdvantageModifier(advantage: Advantage): number {
  switch (advantage) {
    case 'advantage': return 2;
    case 'disadvantage': return -2;
    default: return 0;
  }
}

/**
 * Returns true if the attacker has type advantage over the defender.
 */
export function hasAdvantage(attackerType: ActionType, defenderType: ActionType): boolean {
  return determineAdvantage(attackerType, defenderType) === 'advantage';
}

// ============================================================================
// COMBAT ACTION UTILITIES
// ============================================================================

/** Generates the enemy's attack type choice using AI logic. */
export function generateEnemyAttackType(_state: CombatState, enemy: Enemy): ActionType {
  return determineEnemyAction(enemy.logic).type;
}

/** Generates the enemy's action (attack/defend) using AI logic. */
export function generateEnemyAction(_state: CombatState, enemy: Enemy): Action {
  return determineEnemyAction(enemy.logic).action;
}

/**
 * Validates if a combat action is complete and valid.
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
 * Enemy     → attack stat (serves as the base for AI combatants)
 */
export function getBaseStatForType(character: Character | Enemy, type: ActionType): number {
  if (isCharacter(character)) {
    return character.baseStats[type];
  }
  return getEnemyRelatedStat(character, type, false) ?? 0;
}

/**
 * Returns the ATTACK stat for a given action type — used in combat rolls.
 * Character → derivedStats.physicalAttack / mentalAttack / emotionalAttack
 * Enemy     → derivedStats attack values (physicalAttack / mentalAttack / emotionalAttack)
 *
 * Note: physicalSkill / mentalSkill / emotionalSkill are SEPARATE — those feed
 * the philosophy bar and skill-usage system, not combat rolls.
 */
export function getAttackStatForType(character: Character | Enemy, type: ActionType): number {
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
 * Enemy     → enemyStats defense values
 *
 * Note: STAT_MULTIPLIERS.DEFENSE = 3 makes Character defense 3× their base stat.
 * Use getBaseStatForType for the player if you want the old 1× behavior while
 * tuning multipliers.
 */
export function getDefenseStatForType(character: Character | Enemy, type: ActionType): number {
  if (isCharacter(character)) {
    switch (type) {
      case 'body': return character.derivedStats.physicalDefense;
      case 'mind': return character.derivedStats.mentalDefense;
      case 'heart': return character.derivedStats.emotionalDefense;
    }
  }
  return getEnemyRelatedStat(character as Enemy, type, true) ?? 0;
}

/**
 * Returns the saving throw stat for a given action type.
 * Used when resisting effects (Phase 1 effects engine).
 */
export function getSaveStatForType(character: Character | Enemy, type: ActionType): number {
  if (isCharacter(character)) {
    switch (type) {
      case 'body': return character.derivedStats.physicalSave;
      case 'mind': return character.derivedStats.mentalSave;
      case 'heart': return character.derivedStats.emotionalSave;
    }
  }
  return getDefenseStatForType(character, type);
}

// ============================================================================
// DICE ROLLING
// ============================================================================

/**
 * Performs a d20 skill check roll, respecting advantage/disadvantage.
 * @param baseStat  - The stat modifier to add to the roll
 * @param advantage - Whether the roll has advantage, neutral, or disadvantage
 */
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

/** Returns true on a natural 20 (critical hit). */
export function isCriticalHit(roll: number): boolean {
  return roll === 20;
}

/** Returns true on a natural 1 (critical miss / fumble). */
export function isCriticalMiss(roll: number): boolean {
  return roll === 1;
}

// ============================================================================
// DAMAGE CALCULATIONS
// ============================================================================

/** Doubles damage for a critical hit. Adjust multiplier here for balance. */
export function applyCriticalMultiplier(baseDamage: number): number {
  return baseDamage * 2;
}

/**
 * Calculates final damage after reductions, applying the critical multiplier
 * before subtracting defence.
 * @param baseDamage      - Raw damage before reductions
 * @param damageReduction - Defence value to subtract (already includes the defence multiplier)
 * @param isCritical      - Whether this hit is a critical
 * @returns Final damage, minimum 0
 */
export function calculateFinalDamage(
  baseDamage: number,
  damageReduction: number,
  isCritical: boolean,
  damageBonus = 0,
): number {
  const damage = isCritical ? applyCriticalMultiplier(baseDamage) : baseDamage;
  return Math.max(0, damage + damageBonus - damageReduction);
}

// ============================================================================
// ATTACK / DEFENSE ROLL CALCULATIONS (Phase 2 — not yet wired to reducer)
// ============================================================================

/**
 * Performs an attack roll for a character.
 * TODO (Phase 2a): wire advantage modifier from active effects (Phase 1).
 */
export function performAttackRoll(
  attacker: Character | Enemy,
  attackType: ActionType,
  advantage: Advantage,
): { total: number; roll: number; modifier: number; details: string } {
  return 'Implement me' as any;
}

/**
 * Performs a defense roll for a character.
 * TODO (Phase 2a): wire defense modifier from active effects (Phase 1).
 */
export function performDefenseRoll(
  defender: Character | Enemy,
  attackType: ActionType,
  isDefending: boolean,
): { total: number; roll: number; modifier: number; details: string } {
  return 'Implement me' as any;
}

/** Compares attack and defence rolls to determine whether the hit lands. */
export function isAttackSuccessful(attackRoll: number, defenseRoll: number): boolean {
  return attackRoll > defenseRoll;
}

/**
 * Calculates base damage for an attack.
 * TODO (Phase 2a): integrate stat-based damage formula once designed.
 */
export function calculateBaseDamage(
  attacker: Character | Enemy,
  attackType: ActionType,
  advantage: Advantage,
): number {
  return 'Implement me' as any;
}

/**
 * Calculates the damage reduction from defence.
 * TODO (Phase 2a): integrate active effect modifiers (Phase 1).
 */
export function calculateDamageReduction(
  defender: Character | Enemy,
  attackType: ActionType,
  isDefending: boolean,
): number {
  return 'Implement me' as any;
}

/**
 * Full attack sequence: rolls, hit check, damage, breakdown string.
 * TODO (Phase 2a): implement using performAttackRoll / performDefenseRoll.
 */
export function calculateAttackDamage(
  attacker: Character | Enemy,
  defender: Character | Enemy,
  attackType: ActionType,
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

// ===============================================
// STATUS EFFECTS DURING COMBAT
// ===============================================

/**
 * Resolves whether an effect successfully applies to a target.
 * Returns a full EffectApplicationResult so the combat log has everything it needs.
 *
 * TIER 1 — Auto-applies, no roll.
 *   Passive stance effects. Always succeeds.
 *
 * TIER 2 BUFF — Caster rolls d20 to apply to themselves.
 *   Natural 1:  Fumble — concentration shattered, buff fails.
 *   Natural 20: Crit   — buff applies at double INTENSITY (more powerful, same duration).
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
 * @param target              - The combatant the effect is being applied TO
 * @param activeEffect        - The effect instance being applied
 * @param effectType          - 'buff' or 'debuff'
 * @param attackerHeartBonus  - Attacker's heart base stat (raises the DR)
 * @param equipmentBonus      - Optional bonus from gear or skill modifiers
 */
export function isEffectApplied(
  target: Character | Enemy,
  activeEffect: ActiveEffect,
  effectType: EffectType,
  attackerHeartBonus: number = 0,
  equipmentBonus: number = 0,
): EffectApplicationResult {
  const tier = activeEffect.teir;

  // ── Tier 1: always applies, no roll ────────────────────────────────────────
  if (tier === 'Teir 1') {
    return {
      success: true,
      activeEffect,
      message: `Effect applied automatically.`,
    };
  }

  // ── Tier 2 BUFF: caster rolls — only a fumble stops it ─────────────────────
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
      // Crit: double INTENSITY (buff is more powerful, not longer)
      const critEffect: ActiveEffect = {
        ...activeEffect,
        currentIntensity: Math.min((activeEffect.currentIntensity ?? 1) * 2, 6),
      };
      return {
        success: true,
        activeEffect: critEffect,
        message: `Critical focus! The buff surges at double intensity.`,
        roll: { rolled: roll, resistStat: 0, total: roll, dr: 0, wasCrit: true, wasFumble: false },
      };
    }

    return {
      success: true,
      activeEffect,
      message: `Buff applied.`,
      roll: { rolled: roll, resistStat: 0, total: roll, dr: 0, wasCrit: false, wasFumble: false },
    };
  }

  // ── Tier 2 DEBUFF: target rolls to resist ──────────────────────────────────
  if (tier === 'Teir 2' && effectType === 'debuff') {
    const resistStat = activeEffect.resistedBy
      ? getResistStatFromResistedBy(target, activeEffect.resistedBy)
      : 0;
    const dr = (activeEffect.resistDR ?? 12) + attackerHeartBonus + equipmentBonus;
    const roll = createDieRoll('neutral')();
    const total = roll + resistStat;

    // Natural 20: rebound — effect bounces onto attacker at double INTENSITY
    if (roll === 20) {
      const reboundEffect: ActiveEffect = {
        ...activeEffect,
        currentIntensity: Math.min((activeEffect.currentIntensity ?? 1) * 2, 6),
      };
      return {
        success: false,
        activeEffect: reboundEffect,
        rebounded: true,
        message: `Absolute resistance! The effect rebounds onto the attacker at double intensity.`,
        roll: { rolled: roll, resistStat, total, dr, wasCrit: true, wasFumble: false },
      };
    }

    // Natural 1: overwhelmed — effect lands at double DURATION (it digs in)
    if (roll === 1) {
      const overwhelmedEffect: ActiveEffect = {
        ...activeEffect,
        remainingDuration: (activeEffect.remainingDuration) * 2,
      };
      return {
        success: true,
        activeEffect: overwhelmedEffect,
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

  // ── Tier 3: only a natural 20 repels it ────────────────────────────────────
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
      success: true,
      activeEffect,
      message: `Inescapable. The Tier 3 effect takes hold. (${roll} + ${resistStat} = ${total} vs DR ${dr})`,
      roll: { rolled: roll, resistStat, total, dr, wasCrit: false, wasFumble: false },
    };
  }

  return {
    success: false,
    message: `Unknown effect tier — effect not applied.`,
  };
}

/**
   * Decrements the remainingDuration of a specific active effect by 1.
   * Skips permanent effects (remainingDuration === -1).
   * Does not remove the effect — call removeExpiredEffects() after ticking
   * to clean up any effects that hit 0.
   * @param target - The character or enemy whose effect is being ticked
   * @param effectId - The ID of the ActiveEffect to tick (NOT the effect name)
   * @returns A new target object with the updated effect duration
   */
export function updateEffectDuration(target: Character | Enemy, effectId: string): Character | Enemy {
  const updatedEffects = target
    .currentActiveEffects
    .map((effect: ActiveEffect) => {
      if (effect.effectId !== effectId) return effect;
      if (effect.remainingDuration === -1) return effect; // permanent, never tick
      return { ...effect, remainingDuration: effect.remainingDuration - 1 };
    }) as ActiveEffect[];

  return {
    ...target,
    currentActiveEffects: updatedEffects,
  };
}

/**
 * Decrements every non-permanent effect on a combatant by one round.
 * Expired effects (duration hits 0) are removed from the list and returned
 * separately so the caller can announce what faded.
 *
 * Call this at the END of each round, after all damage and effects are resolved.
 */
export function tickAllEffects(target: Character | Enemy): {
    target: Character | Enemy;
    expired: ActiveEffect[];
} {
    const expired: ActiveEffect[] = [];
    const remaining = (target.currentActiveEffects as ActiveEffect[]).reduce<ActiveEffect[]>(
        (acc, effect) => {
            if (effect.remainingDuration === -1) {
                acc.push(effect); // permanent — never ticks
                return acc;
            }
            const ticked = { ...effect, remainingDuration: effect.remainingDuration - 1 };
            if (ticked.remainingDuration <= 0) {
                expired.push(ticked); // just expired — don't keep it
            } else {
                acc.push(ticked);
            }
            return acc;
        },
        [],
    );

    return {
        target: { ...target, currentActiveEffects: remaining },
        expired,
    };
}

// ============================================================================
// EFFECT-BASED COMBAT HELPERS
// ============================================================================

/** The ID of the Mind studying debuff — used by Mind/Attack for damage bonus. */
export const MIND_MARK_ID = 'tier1_mind_mark';

/**
 * Returns the current intensity of the Mind studying mark on a combatant (0 if absent).
 * Mind/Attack adds this value to its raw damage roll.
 */
export function getStudyMarkIntensity(target: Character | Enemy): number {
    const mark = (target.currentActiveEffects as ActiveEffect[])
        .find(e => e.effectId === MIND_MARK_ID);
    return mark?.currentIntensity ?? 0;
}

/**
 * Returns the total reflect damage that should be dealt back when a combatant
 * bearing a thorns effect is successfully hit.
 * Formula: reflectDamage-per-intensity × currentIntensity, summed across all thorns effects.
 */
export function getThornsReflect(bearer: Character | Enemy): number {
    return (bearer.currentActiveEffects as ActiveEffect[]).reduce((total, ae) => {
        const def = lookupEffect(ae.effectId);
        const perIntensity = def?.payload.reflectDamage ?? 0;
        return total + perIntensity * (ae.currentIntensity ?? 1);
    }, 0);
}

/**
 * Removes a random buff from a combatant.
 * Returns the updated combatant and the removed effect, if any.
 * Heart/Attack uses this to strip one buff from the enemy.
 */
export function removeRandomBuff(target: Character | Enemy): {
    target: Character | Enemy;
    removed: ActiveEffect | null;
} {
    const buffs = (target.currentActiveEffects as ActiveEffect[])
        .filter(ae => lookupEffect(ae.effectId)?.type === 'buff');

    if (buffs.length === 0) return { target, removed: null };

    const idx     = Math.floor(Math.random() * buffs.length);
    const removed = buffs[idx];
    const updated = (target.currentActiveEffects as ActiveEffect[])
        .filter(ae => ae !== removed);

    return { target: { ...target, currentActiveEffects: updated }, removed };
}

/**
 * Adds duration to a random buff on a combatant, capped at MAX_EFFECT_DURATION.
 * Heart/Attack uses this to extend one of the player's active buffs.
 */
export function extendRandomBuffDuration(
    target: Character | Enemy,
    amount: number,
): {
    target: Character | Enemy;
    extended: ActiveEffect | null;
} {
    const buffs = (target.currentActiveEffects as ActiveEffect[])
        .filter(ae => lookupEffect(ae.effectId)?.type === 'buff');

    if (buffs.length === 0) return { target, extended: null };

    const idx      = Math.floor(Math.random() * buffs.length);
    const original = buffs[idx];
    const extended: ActiveEffect = {
        ...original,
        remainingDuration: Math.min(original.remainingDuration + amount, MAX_EFFECT_DURATION),
    };
    const updatedEffects = (target.currentActiveEffects as ActiveEffect[])
        .map(ae => ae === original ? extended : ae);

    return { target: { ...target, currentActiveEffects: updatedEffects }, extended };
}

/**
 * Applies per-round regeneration from any active regen effects on a combatant.
 * Returns the healed combatant and total HP restored.
 * Call this at the start of each round before the player makes their choice.
 */
export function applyRegen(target: Character | Enemy): {
    target: Character | Enemy;
    healed: number;
} {
    let healed = 0;
    let updated = target;

    for (const ae of target.currentActiveEffects as ActiveEffect[]) {
        const def = lookupEffect(ae.effectId);
        const perRound = def?.payload.regeneration?.healthPerRound ?? 0;
        if (perRound <= 0) continue;
        const amount = perRound * (ae.currentIntensity ?? 1);
        healed += amount;
        updated = healCharacter(updated as any, amount) as typeof updated;
    }

    return { target: updated, healed };
}

// ============================================================================
// HEALTH MANAGEMENT
// ============================================================================

/**
 * Applies damage to a Character, clamping health to 0.
 * @overload
 */
export function applyDamage(character: Character, damage: number): Character;
/** Applies damage to an Enemy, clamping health to 0. */
export function applyDamage(character: Enemy, damage: number): Enemy;
export function applyDamage(character: Character | Enemy, damage: number): Character | Enemy {
  const newHealth = Math.max(0, character.health - damage);
  if (isCharacter(character)) {
    return { ...character, health: newHealth };
  }
  return { ...(character as Enemy), health: newHealth };
}

/**
 * Heals a Character, clamping health to maxHealth.
 * @overload
 */
export function healCharacter(character: Character, amount: number): Character;
/** Heals an Enemy, clamping health to enemyStats.maxHealth. */
export function healCharacter(character: Enemy, amount: number): Enemy;
export function healCharacter(character: Character | Enemy, amount: number): Character | Enemy {
  if (isCharacter(character)) {
    return { ...character, health: Math.min(character.maxHealth, character.health + amount) };
  }
  const enemy = character as Enemy;
  return { ...enemy, health: Math.min(enemy.derivedStats.maxHealth, enemy.health + amount) };
}

/** Returns true if the combatant still has health remaining. */
export function isAlive(character: Character | Enemy): boolean {
  return character.health > 0;
}

/** Returns true if the combatant has been defeated (health ≤ 0). */
export function isDefeated(character: Character | Enemy): boolean {
  return character.health <= 0;
}

/** Returns current health as a percentage of max health (0–100). */
export function getHealthPercentage(character: Character | Enemy): number {
  const maxHealth = isCharacter(character)
    ? character.maxHealth
    : (character as Enemy).derivedStats.maxHealth;
  return (character.health / maxHealth) * 100;
}

// ============================================================================
// COMBAT ROUND PROCESSING (Phase 2c — stubs for the reducer)
// ============================================================================

/** TODO (Phase 2c): process the player's turn within resolveCombatRound. */
export function processPlayerTurn(state: CombatState): {
  damageToEnemy: number;
  playerRoll: number;
  playerRollDetails: string;
} {
  return 'Implement me' as any;
}

/** TODO (Phase 2c): process the enemy's turn within resolveCombatRound. */
export function processEnemyTurn(state: CombatState): {
  damageToPlayer: number;
  enemyRoll: number;
  enemyRollDetails: string;
} {
  return 'Implement me' as any;
}

/** TODO (Phase 2c): determine who acts first based on initiative. */
export function determineTurnOrder(player: Character, enemy: Enemy): 'player' | 'enemy' {
  return 'Implement me' as any;
}

/** TODO (Phase 2c): roll initiative for a combatant. */
export function rollInitiative(character: Character | Enemy): number {
  return 'Implement me' as any;
}

// ============================================================================
// BATTLE LOG UTILITIES (Phase 2c)
// ============================================================================

/** TODO (Phase 2c): create a BattleLogEntry from a resolved round. */
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

/** TODO (Phase 2c): format all battle log entries as readable strings. */
export function formatAllBattleLogs(state: CombatState): string[] {
  return 'Implement me' as any;
}

/** TODO (Phase 2c): generate the victory/defeat summary message. */
export function generateCombatResultMessage(state: CombatState): string {
  return 'Implement me' as any;
}
