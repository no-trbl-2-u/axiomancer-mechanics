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

import { ActionType } from '@Combat/types';

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
 * @todo: Add more categories
 */
export type EffectCategory = 'stat' | 'damage' | 'defense' | 'control' | 'regeneration' | 'advantage';

/**
 * Which stat type the effect targets or scales with
 * Mirrors ActionType for consistency with combat mechanics.
 */
export type EffectStatTarget = ActionType;

// ===============================================
// EFFECT MODIFIERS
// ===============================================

/**
 * Stat modification applied by an effect
 * @property stat - Which stat type to modify (body/mind/heart)
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
 * @property forcedActionType - If set, target must use this action type
 * @property blockedActionTypes - Action types the target cannot use
 * @property skipTurn - If true, target skips their next action
 */
export interface ActionRestriction {
    forcedActionType?: ActionType;
    blockedActionTypes?: ActionType[];
    skipTurn?: boolean;
}

/**
 * Advantage modification configuration
 * @property grantAdvantage - Grants automatic advantage on specified types
 * @property grantDisadvantage - Grants automatic disadvantage on specified types
 */
export interface AdvantageModifier {
    grantAdvantage?: ActionType[];
    grantDisadvantage?: ActionType[];
}

// ===============================================
// EFFECT PAYLOAD (UNION OF MODIFIERS)
// ===============================================

/**
 * Effect payload containing the mechanical modifications
 * Effects can have multiple modifier types active simultaneously.
 * @property statModifiers - Array of stat changes to apply
 * @property damageOverTime - Damage dealt each round
 * @property regeneration - Health/mana restoration each round
 * @property actionRestriction - Limits on what actions can be taken
 * @property advantageModifier - Changes to combat advantage
 * @property rollModifier - Flat bonus/penalty to dice rolls
 * @property defenseModifier - Flat bonus/penalty to defense values
 */
export interface EffectPayload {
    statModifiers?: StatModifier[];
    damageOverTime?: DamageOverTime;
    regeneration?: RegenerationConfig;
    actionRestriction?: ActionRestriction;
    advantageModifier?: AdvantageModifier;
    rollModifier?: number;
    defenseModifier?: number;
}

// ===============================================
// CORE EFFECT INTERFACE
// ===============================================

/**
 * Effect definition representing a status effect, buff, or debuff
 * @property id - Unique identifier for this effect
 * @property name - Display name of the effect
 * @property description - Flavor text or lore description of the effect
 * @property type - Whether this is a buff, debuff, or condition
 * @property category - Thematic grouping for the effect
 * @property duration - Duration in rounds remaining (-1 for permanent, 0 for instant)
 * @property stacking - How this effect behaves when applied multiple times
 * @property intensity - Current stack count for intensity-stacking effects
 * @property payload - The mechanical modifications this effect applies
 */
export interface Effect {
    id: string;
    name: string;
    description: string;
    type: EffectType;
    category: EffectCategory;
    duration: number;
    stacking: EffectStacking;
    intensity?: number;
    payload: EffectPayload;
}

// ===============================================
// ACTIVE EFFECT INSTANCE
// ===============================================

/**
 * An active instance of an effect applied to a target
 * Tracks runtime state like remaining duration and current intensity.
 * @property effectId - Reference to the base Effect definition
 * @property remainingDuration - Rounds left before effect expires (-1 for permanent)
 * @property currentIntensity - Current stack level for intensity-stacking effects
 * @property sourceId - ID of the character/enemy that applied this effect
 * @property appliedAtRound - Combat round when effect was applied
 */
export interface ActiveEffect {
    effectId: string;
    remainingDuration: number;
    currentIntensity: number;
    sourceId?: string;
    appliedAtRound: number;
}

// ===============================================
// EFFECT APPLICATION RESULT
// ===============================================

/**
 * Result of attempting to apply an effect
 * @property success - Whether the effect was successfully applied
 * @property activeEffect - The resulting active effect instance (if successful)
 * @property message - Description of what happened
 * @property stackedWith - If merged with existing effect, the previous intensity/duration
 */
export interface EffectApplicationResult {
    success: boolean;
    activeEffect?: ActiveEffect;
    message: string;
    stackedWith?: {
        previousIntensity: number;
        previousDuration: number;
    };
}
