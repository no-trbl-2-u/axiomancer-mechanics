/**
 * Phase 125 — Effects contribute to resolution.
 * 
 * Detects when status effects should force a combat resolution instead of timeout.
 * Routes effects-driven endings to existing victory/friendship outcomes per the brief.
 */

import { CombatState } from './types';
import { lookupEffect } from '../Effects/effects.library';
import { EFFECTS_RESOLUTION_DEBUFF_INTENSITY_THRESHOLD, EFFECTS_RESOLUTION_DOT_DAMAGE_THRESHOLD, EFFECTS_RESOLUTION_DOT_MAX_ROUNDS_TO_KILL } from '../Game/game-mechanics.constants';

/**
 * Effect-based resolution analysis result.
 */
export interface EffectResolutionAnalysis {
    /** Should combat end due to effects? */
    shouldResolve: boolean;
    /** Route to 'victory' (DoT erosion) or 'friendship' (saturation yield) */
    outcomeType: 'victory' | 'friendship' | null;
    /** Human-readable reason for debugging/testing */
    reason: string;
}

/**
 * Analyzes enemy's active effects to determine if they should force a resolution.
 * 
 * Per Phase 125 brief:
 * - **Saturation yield:** enough stacked control/debuff effects → route to 'friendship'
 * - **DoT erosion:** damage-over-time effects that can finish the enemy → route to 'victory'
 * 
 * @param state Current combat state
 * @returns Analysis indicating if/how effects should force resolution
 */
export function analyzeEffectsForResolution(state: CombatState): EffectResolutionAnalysis {
    // Quick early exits
    if (state.enemy.effects.length === 0) {
        return { shouldResolve: false, outcomeType: null, reason: 'no active effects' };
    }

    // Analyze control/debuff saturation for friendship yield
    const saturationAnalysis = analyzeDebuffSaturation(state);
    if (saturationAnalysis.shouldYield) {
        return {
            shouldResolve: true,
            outcomeType: 'friendship',
            reason: saturationAnalysis.reason,
        };
    }

    // Analyze DoT erosion potential for victory
    const dotAnalysis = analyzeDotErosion(state);
    if (dotAnalysis.canFinish) {
        return {
            shouldResolve: true,
            outcomeType: 'victory',
            reason: dotAnalysis.reason,
        };
    }

    return { shouldResolve: false, outcomeType: null, reason: dotAnalysis.reason || 'effects insufficient for resolution' };
}

/**
 * Checks if the enemy has enough stacked control/debuff effects to yield (friendship path).
 */
function analyzeDebuffSaturation(state: CombatState): { shouldYield: boolean; reason: string } {
    let totalControlIntensity = 0;
    let totalDebuffIntensity = 0;
    let controlEffectCount = 0;

    for (const activeEffect of state.enemy.effects) {
        const effectDef = lookupEffect(activeEffect.effectId);
        if (!effectDef) continue;

        // Count control effects (action restrictions, forced stances, etc)
        if (effectDef.category === 'control') {
            totalControlIntensity += activeEffect.intensity;
            controlEffectCount++;
        }

        // Count stat debuff effects
        if (effectDef.type === 'debuff' && effectDef.payload?.statModifiers) {
            for (const modifier of effectDef.payload.statModifiers) {
                if (modifier.value < 0) { // Negative stat modifier = debuff
                    totalDebuffIntensity += activeEffect.intensity;
                    break; // Don't double-count same effect
                }
            }
        }
    }

    // Combined intensity threshold from constants
    const totalIntensity = totalControlIntensity + totalDebuffIntensity;
    if (totalIntensity >= EFFECTS_RESOLUTION_DEBUFF_INTENSITY_THRESHOLD) {
        return {
            shouldYield: true,
            reason: `saturated with ${totalIntensity} total debuff/control intensity (${controlEffectCount} control effects)`,
        };
    }

    return { shouldYield: false, reason: `insufficient saturation (${totalIntensity}/${EFFECTS_RESOLUTION_DEBUFF_INTENSITY_THRESHOLD})` };
}

/**
 * Checks if active DoT effects can realistically finish the enemy (victory path).
 */
function analyzeDotErosion(state: CombatState): { canFinish: boolean; reason: string } {
    let totalDotDamagePerRound = 0;
    let dotEffectCount = 0;

    for (const activeEffect of state.enemy.effects) {
        const effectDef = lookupEffect(activeEffect.effectId);
        if (!effectDef?.payload?.damageOverTime) continue;

        const dotDamage = effectDef.payload.damageOverTime.damagePerRound * activeEffect.intensity;
        totalDotDamagePerRound += dotDamage;
        dotEffectCount++;
    }

    if (totalDotDamagePerRound === 0) {
        return { canFinish: false, reason: 'no DoT effects active' };
    }

    // Check if DoT damage can finish the enemy within a reasonable timeframe
    const enemyHp = state.enemy.health;
    const roundsToKill = Math.ceil(enemyHp / totalDotDamagePerRound);

    // Conservative horizon: DoT should be able to finish the enemy within the
    // tunable rounds-to-kill window. This prevents very weak DoTs from forcing
    // premature victories while letting a strong, sustained DoT resolve a fight
    // it will demonstrably win before the round cap.
    if (totalDotDamagePerRound >= EFFECTS_RESOLUTION_DOT_DAMAGE_THRESHOLD
        && roundsToKill <= EFFECTS_RESOLUTION_DOT_MAX_ROUNDS_TO_KILL) {
        return {
            canFinish: true,
            reason: `DoT effects (${dotEffectCount}) deal ${totalDotDamagePerRound} dmg/round, can finish enemy in ${roundsToKill} rounds`,
        };
    }

    return {
        canFinish: false,
        reason: `DoT too weak (${totalDotDamagePerRound} dmg/round) or too slow (${roundsToKill} rounds to kill)`,
    };
}