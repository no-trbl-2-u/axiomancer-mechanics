// ===============================================
// EFFECTS SYSTEM TYPES
// ===============================================

/**
 * Effects module type definitions
 *
 * This module contains types for buffs, debuffs, and conditions that modify
 * character/enemy stats or behavior. Inspired by D&D conditions and TTRPG status effects.
 *
 * Effect categories will eventually be renamed based on fallacies and paradoxes
 * to match the game's philosophical theme.
 */

import { Stance } from '../combat/types';

// ===============================================
// EFFECT ENUMS & DISCRIMINATORS
// ===============================================

/**
 * Effect type discriminator
 * - 'buff': Positive effect that enhances capabilities
 * - 'debuff': Negative effect that hinders
 */
export type EffectType = 'buff' | 'debuff';

/**
 * Stacking behavior when the same effect is applied multiple times
 * - 'none': Only the strongest instance applies (D&D-style)
 * - 'intensity': Effects stack, increasing power (e.g., multiple poison = more damage)
 * - 'duration': Reset or extend duration on reapply
 */
export type EffectStacking = 'none' | 'intensity' | 'duration';

/**
 * Effect category for thematic grouping
 * - 'stat': Modifies base or derived stats
 * - 'damage': Deals or modifies damage (DoT, damage bonus)
 * - 'defense': Modifies defensive capabilities
 * - 'control': Restricts actions or forces behavior
 * - 'regeneration': Restores health or mana over time
 * - 'advantage': Grants or removes combat advantage
 */
export type EffectCategory = 'stat' | 'damage' | 'defense' | 'control' | 'regeneration' | 'advantage';

/**
 * Which stat type the effect targets or scales with.
 * Can target either base stats (body/mind/heart) or specific derived stats.
 */
export type EffectStatTarget =
    | Stance
    | 'physicalAttack'  | 'physicalSkill' | 'physicalDefense' | 'physicalSave' | 'physicalTest'
    | 'mentalAttack'    | 'mentalSkill'   | 'mentalDefense'   | 'mentalSave'   | 'mentalTest'
    | 'emotionalAttack' | 'emotionalSkill'| 'emotionalDefense'| 'emotionalSave'| 'emotionalTest'
    | 'luck';

// ===============================================
// EFFECT MODIFIERS
// ===============================================

/**
 * Stat modification applied by an effect
 * @property stat - Which stat to modify (base or derived)
 * @property value - Amount to add (positive) or subtract (negative)
 * @property isMultiplier - If true, value is a multiplier (e.g., 1.5 = +50%)
 */
export interface StatModifier {
  stat: EffectStatTarget;
  value: number;
  isMultiplier?: boolean;
}

/**
 * Damage over time configuration
 * @property damagePerRound - Amount of damage dealt each round
 * @property damageType - What type of damage (for resistance calculations)
 */
export interface DamageOverTime {
  damagePerRound: number;
  damageType: EffectStatTarget;
}

/**
 * Regeneration configuration
 * @property healthPerRound - Health restored each round
 * @property manaPerRound - Mana restored each round
 */
export interface RegenerationConfig {
  healthPerRound?: number;
  manaPerRound?: number;
}

/**
 * Action restriction configuration
 * @property forcedStance - If set, target must use this stance
 * @property blockedStances - Stances the target cannot use
 * @property skipTurn - If true, target skips their next action
 */
export interface ActionRestriction {
  forcedStance?: Stance;
  blockedStances?: Stance[];
  skipTurn?: boolean;
}

/**
 * Advantage modification configuration
 * @property grantAdvantage - Grants automatic advantage on specified types
 * @property grantDisadvantage - Grants automatic disadvantage on specified types
 */
export interface AdvantageModifier {
  grantAdvantage?: Stance[];
  grantDisadvantage?: Stance[];
}

// ===============================================
// EFFECT PAYLOAD (UNION OF MODIFIERS)
// ===============================================

/**
 * Effect payload containing the mechanical modifications.
 * Effects can have multiple modifier types active simultaneously.
 * @property statModifiers - Array of stat changes to apply
 * @property damageOverTime - Damage dealt each round
 * @property regeneration - Health/mana restoration each round
 * @property actionRestriction - Limits on what actions can be taken
 * @property advantageModifier - Changes to combat advantage
 * @property rollModifier - Flat bonus/penalty to dice rolls (does NOT scale with intensity)
 * @property rollModifierPerIntensity - Roll bonus/penalty multiplied by current intensity
 * @property defenseModifier - Flat bonus/penalty to defense values
 * @property reflectDamage - Damage per intensity dealt back to the attacker
 *   when the bearer of this effect is successfully hit (thorns mechanic)
 */
export interface EffectPayload {
  statModifiers?: StatModifier[];
  damageOverTime?: DamageOverTime;
  regeneration?: RegenerationConfig;
  actionRestriction?: ActionRestriction;
  advantageModifier?: AdvantageModifier;
  rollModifier?: number;
  rollModifierPerIntensity?: number;
  defenseModifier?: number;
  reflectDamage?: number;
}

// ===============================================
// CORE EFFECT INTERFACE
// ===============================================

/**
 * Effect definition representing a status effect, buff, or debuff
 * @property id - Unique identifier for this effect
 * @property name - Display name of the effect
 * @property description - Flavor text or lore description of the effect
 * @property type - Whether this is a buff or debuff
 * @property category - Thematic grouping for the effect
 * @property duration - Duration in rounds remaining (-1 for permanent, 0 for instant)
 * @property stacking - How this effect behaves when applied multiple times
 * @property teir - Determines the methodology for applying/resisting effects
 * @property intensity - Initial stack count for intensity-stacking effects
 * @property payload - The mechanical modifications this effect applies
 * @property resistedBy - Which stat the TARGET uses to resist this effect.
 *   Follows the RPS counter rule: body effects resisted by mind, heart effects
 *   by body, mind effects by heart. If absent, effect auto-applies (Tier 1).
 * @property resistDR - Base difficulty rating for the resistance roll (default 12).
 *   The attacker's heart bonus and equipment bonuses are added on top of this.
 */
export interface Effect {
  id: string;
  name: string;
  description: string;
  type: EffectType;
  category: EffectCategory;
  duration: number;
  stacking: EffectStacking;
  teir: 'Teir 1' | 'Teir 2' | 'Teir 3';
  intensity?: number;
  payload: EffectPayload;
  resistedBy?: Stance;
  resistDR?: number;
}

// ===============================================
// ACTIVE EFFECT INSTANCE
// ===============================================

/**
 * An active instance of an effect applied to a target.
 * Tracks runtime state like remaining duration and current intensity.
 * @property effectId - Reference to the base Effect definition
 * @property remainingDuration - Rounds left before effect expires (-1 for permanent)
 * @property currentIntensity - Current stack level for intensity-stacking effects
 * @property sourceId - ID of the character/enemy that applied this effect
 * @property appliedAtRound - Combat round when effect was applied
 * @property teir - Determines the methodology for applying effects
 * @property resistedBy - Which stat resists this (copied from Effect for quick lookup)
 * @property resistDR - Base resist difficulty (copied from Effect for quick lookup)
 */
export interface ActiveEffect {
  effectId: string;
  remainingDuration: number;
  currentIntensity: number;
  sourceId?: string;
  appliedAtRound: number;
  teir: Effect['teir'];
  resistedBy?: Stance;
  resistDR?: number;
}

// ===============================================
// EFFECT APPLICATION RESULT
// ===============================================

/**
 * Result of attempting to apply an effect
 * @property success - Whether the effect was successfully applied
 * @property activeEffect - The resulting active effect instance (if successful)
 * @property message - Description of what happened (for the battle log)
 * @property stackedWith - If merged with existing effect, the previous intensity/duration
 * @property rebounded - True when debuff resistance crits (nat 20) — apply activeEffect to ATTACKER instead
 * @property roll - The resistance roll details, if a roll was made (Tier 2/3 effects only)
 */
export interface EffectApplicationResult {
  success: boolean;
  activeEffect?: ActiveEffect;
  message: string;
  stackedWith?: {
    previousIntensity: number;
    previousDuration: number;
  };
  rebounded?: boolean;
  roll?: {
    /** Raw d20 result */
    rolled: number;
    /** Target's resist stat value added to the roll */
    resistStat: number;
    /** rolled + resistStat */
    total: number;
    /** Final DR (base + heart + equipment bonuses) */
    dr: number;
    /** Natural 20: rebound (debuff) or double intensity (buff) */
    wasCrit: boolean;
    /** Natural 1: double duration lands (debuff) or fumble (buff) */
    wasFumble: boolean;
  };
}
