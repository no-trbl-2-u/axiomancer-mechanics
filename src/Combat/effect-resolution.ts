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
 * Phase 155 — ceiling on the per-effect bonus an actively-restricting control
 * effect contributes to the saturation sum from its remaining duration. Bounds
 * the credit so a single very-long lock can't instantly saturate, while a
 * multi-round restriction still reads as decisive.
 */
const SATURATION_RESTRICTION_DURATION_CAP = 3;

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

            // Phase 155 — exploiting control, not merely stacking it, is what the
            // doctrine rewards. A control effect that is ACTIVELY restricting the
            // enemy's action (forcedStance / blockedStances / skipTurn) and will
            // keep doing so for several rounds has effectively neutralised the
            // enemy — credit one extra point per remaining round of active
            // restriction (capped) so a long, decisive lock saturates toward the
            // friendship yield even when raw intensity sits at the per-proc base.
            const restriction = effectDef.payload?.actionRestriction;
            const restricts = !!restriction && (
                restriction.skipTurn === true ||
                restriction.forcedStance !== undefined ||
                (restriction.blockedStances?.length ?? 0) > 0
            );
            if (restricts && activeEffect.remainingDuration > 0) {
                totalControlIntensity += Math.min(
                    activeEffect.remainingDuration,
                    SATURATION_RESTRICTION_DURATION_CAP,
                );
            }
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
    let pendingDotDamage = 0;
    let dotEffectCount = 0;

    for (const activeEffect of state.enemy.effects) {
        const effectDef = lookupEffect(activeEffect.effectId);
        if (!effectDef?.payload?.damageOverTime) continue;

        const dotDamage = effectDef.payload.damageOverTime.damagePerRound * activeEffect.intensity;
        totalDotDamagePerRound += dotDamage;

        // Phase 155 — guaranteed, already-locked-in damage this DoT WILL deal
        // over its remaining duration. A strategist who has stacked a
        // lethal-in-flight DoT package has already won the fight; crediting that
        // pending damage lets the erosion route resolve to victory now instead of
        // forcing turns to the round cap (the lost resolutions are the witness
        // gap). Permanent DoT (remainingDuration === -1) contributes only through
        // the per-round rate below — it has no finite locked-in total to credit.
        if (activeEffect.remainingDuration > 0) {
            pendingDotDamage += dotDamage * activeEffect.remainingDuration;
        }
        dotEffectCount++;
    }

    if (totalDotDamagePerRound === 0) {
        return { canFinish: false, reason: 'no DoT effects active' };
    }

    // Check if DoT damage can finish the enemy within a reasonable timeframe.
    // Phase 155 — credit guaranteed pending DoT against effective HP: if the
    // already-applied effects alone are lethal, effectiveHp collapses to 0 and
    // roundsToKill is 0, so the route fires immediately.
    const enemyHp = state.enemy.health;
    const effectiveHp = Math.max(enemyHp - pendingDotDamage, 0);
    const roundsToKill = Math.ceil(effectiveHp / totalDotDamagePerRound);

    // Conservative horizon: DoT should be able to finish the enemy within the
    // tunable rounds-to-kill window. This prevents very weak DoTs from forcing
    // premature victories while letting a strong, sustained DoT resolve a fight
    // it will demonstrably win before the round cap. The per-round threshold gate
    // remains, so a trickle DoT still cannot force a win even with a long fuse.
    if (totalDotDamagePerRound >= EFFECTS_RESOLUTION_DOT_DAMAGE_THRESHOLD
        && roundsToKill <= EFFECTS_RESOLUTION_DOT_MAX_ROUNDS_TO_KILL) {
        const pendingNote = pendingDotDamage > 0
            ? ` (${pendingDotDamage} pending locked-in)`
            : '';
        return {
            canFinish: true,
            reason: `DoT effects (${dotEffectCount}) deal ${totalDotDamagePerRound} dmg/round${pendingNote}, can finish enemy in ${roundsToKill} rounds`,
        };
    }

    return {
        canFinish: false,
        reason: `DoT too weak (${totalDotDamagePerRound} dmg/round) or too slow (${roundsToKill} rounds to kill)`,
    };
}