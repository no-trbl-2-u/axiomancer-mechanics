import { Stance } from '../Combat/types';

// ===============================================
// EFFECT ENUMS & DISCRIMINATORS
// ===============================================

export type EffectType = 'buff' | 'debuff';
export type EffectStacking = 'none' | 'intensity' | 'duration';
export type EffectCategory = 'stat' | 'damage' | 'defense' | 'control' | 'regeneration' | 'advantage';

export type EffectStatTarget =
    | Stance
    | 'physicalAttack'  | 'physicalSkill' | 'physicalDefense' | 'physicalSave' | 'physicalTest'
    | 'mentalAttack'    | 'mentalSkill'   | 'mentalDefense'   | 'mentalSave'   | 'mentalTest'
    | 'emotionalAttack' | 'emotionalSkill'| 'emotionalDefense'| 'emotionalSave'| 'emotionalTest'
    | 'luck';

// ===============================================
// EFFECT MODIFIERS
// ===============================================

export interface StatModifier {
  stat: EffectStatTarget;
  value: number;
  isMultiplier?: boolean;
}

export interface DamageOverTime {
  damagePerRound: number;
  damageType: EffectStatTarget;
}

export interface RegenerationConfig {
  healthPerRound?: number;
  manaPerRound?: number;
}

export interface ActionRestriction {
  forcedStance?: Stance;
  blockedStances?: Stance[];
  skipTurn?: boolean;
}

export interface AdvantageModifier {
  grantAdvantage?: Stance[];
  grantDisadvantage?: Stance[];
}

// ===============================================
// EFFECT PAYLOAD
// ===============================================

export interface EffectPayload {
  statModifiers?: StatModifier[];
  damageOverTime?: DamageOverTime;
  regeneration?: RegenerationConfig;
  actionRestriction?: ActionRestriction;
  advantageModifier?: AdvantageModifier;
  rollModifier?: number;
  rollModifierPerIntensity?: number;
  defenseModifier?: number;
  /** Damage per intensity dealt back when bearer is hit (thorns). */
  reflectDamage?: number;
}

// ===============================================
// CORE EFFECT INTERFACE
// ===============================================

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

export interface EffectApplicationResult {
  success: boolean;
  activeEffect?: ActiveEffect;
  message: string;
  stackedWith?: {
    previousIntensity: number;
    previousDuration: number;
  };
  /** True when debuff resistance crits (nat 20) — effect rebounds to attacker. */
  rebounded?: boolean;
  roll?: {
    rolled: number;
    resistStat: number;
    total: number;
    dr: number;
    wasCrit: boolean;
    wasFumble: boolean;
  };
}
