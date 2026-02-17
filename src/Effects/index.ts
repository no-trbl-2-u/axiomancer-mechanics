/**
 * Effects System Module
 * Manages buffs, debuffs, and status effects
 */

import { Effect, ActiveEffect, EffectApplicationResult } from './types';

/**
 * Applies an effect to a target, creating an active effect instance
 * @param effect - The effect definition to apply
 * @param sourceId - ID of the entity that applied the effect
 * @param currentRound - The current combat round
 * @returns The result of applying the effect
 */
export function applyEffect(
    effect: Effect,
    sourceId: string,
    currentRound: number
): EffectApplicationResult {
    const activeEffect: ActiveEffect = {
        effectId: effect.id,
        remainingDuration: effect.duration,
        currentIntensity: effect.intensity ?? 1,
        sourceId,
        appliedAtRound: currentRound,
    };

    return {
        success: true,
        activeEffect,
        message: `${effect.name} applied successfully.`,
    };
}

/**
 * Ticks an active effect, reducing its duration by 1
 * @param activeEffect - The active effect to tick
 * @returns Updated active effect with decremented duration, or null if expired
 */
export function tickEffect(activeEffect: ActiveEffect): ActiveEffect | null {
    if (activeEffect.remainingDuration === -1) {
        return activeEffect;
    }

    const newDuration: number = activeEffect.remainingDuration - 1;

    if (newDuration <= 0) {
        return null;
    }

    return {
        ...activeEffect,
        remainingDuration: newDuration,
    };
}

/**
 * Checks if an active effect has expired
 * @param activeEffect - The active effect to check
 * @returns True if the effect has expired
 */
export function isEffectExpired(activeEffect: ActiveEffect): boolean {
    return activeEffect.remainingDuration === 0;
}

/**
 * Stacks an effect with an existing active effect
 * @param existing - The existing active effect
 * @param effect - The effect definition being stacked
 * @returns Updated active effect with stacking applied
 */
export function stackEffect(
    existing: ActiveEffect,
    effect: Effect
): EffectApplicationResult {
    const previousIntensity: number = existing.currentIntensity;
    const previousDuration: number = existing.remainingDuration;

    let updatedEffect: ActiveEffect;

    switch (effect.stacking) {
        case 'intensity':
            updatedEffect = {
                ...existing,
                currentIntensity: existing.currentIntensity + 1,
            };
            break;
        case 'duration':
            updatedEffect = {
                ...existing,
                remainingDuration: effect.duration,
            };
            break;
        case 'none':
        default:
            updatedEffect = existing;
            break;
    }

    return {
        success: true,
        activeEffect: updatedEffect,
        message: `${effect.name} stacked (${effect.stacking}).`,
        stackedWith: {
            previousIntensity,
            previousDuration,
        },
    };
}
