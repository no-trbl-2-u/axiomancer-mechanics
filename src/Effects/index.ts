import { Character } from "Character/types";
import { Enemy } from "Enemy/types";
import { ActiveEffect, EffectApplicationResult } from "./types";

// ===============================================
// EFFECT ENGINE FUNCTIONS
// ===============================================

/**
 * Apply an effect to a target
 * @param target - The target to apply the effect to
 * @param effect - The effect to apply
 * @returns This function only updates the state of the target
 * @example applyEffect(character, activeEffect)
 * @example applyEffect(enemy, activeEffect)
 * @notes This funcion would be used AFTER the die rolls are calculated and the damage is determined.
 * @problem If a target already has that effect, it won't stack, it'll overwrite it
 */
export function applyEffect(target: Character | Enemy, activeEffect: ActiveEffect): Character | Enemy {
  // TODO: Fix this function to allow for stacking
  // This needs to update the state of the target
  return {
    ...target,
    currentActiveEffects: [...target.currentActiveEffects, activeEffect],
  };
}

export function getTargetsResistStatValue(target: Character | Enemy, activeEffect: ActiveEffect): number {
  const resistStat = activeEffect.resistedBy;
  return target.baseStats[resistStat];
}