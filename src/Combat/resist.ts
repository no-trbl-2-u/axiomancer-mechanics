/**
 * Tier 2 / Tier 3 effect resist resolver.
 *
 * Tier 1 — Auto-applies, no roll.
 *
 * Tier 2 BUFF — Caster rolls d20 to apply to themselves.
 *   Nat 1:  Fumble — buff fails.
 *   Nat 20: Crit  — buff applies at double intensity.
 *
 * Tier 2 DEBUFF — Target rolls to RESIST.
 *   DR = effect.resistDR + attackerHeartBonus + equipmentBonus.
 *   Nat 20: Crit resist — effect rebounds onto attacker at double intensity.
 *   Nat 1:  Fumble resist — effect lands at double duration.
 *   roll + resistStat < DR → effect lands.
 *   roll + resistStat ≥ DR → resisted.
 *
 * Tier 3 — Inescapable. Only a natural 20 on the resist roll repels it.
 */

import { createDieRoll } from '../Utils';
import { ActiveEffect, EffectType, EffectApplicationResult } from '../Effects/types';
import { Combatant } from './types';
import { getResistStat } from './stats';

/**
 * Resolves whether `activeEffect` lands on `target`. Returns a full
 * EffectApplicationResult so callers can render the battle log directly.
 *
 * @param attackerHeartBonus - Attacker's heart base stat (raises the DR).
 * @param equipmentBonus     - Optional bonus from gear or skill modifiers.
 */
export function resolveEffectApplication(
    target: Combatant,
    activeEffect: ActiveEffect,
    effectType: EffectType,
    attackerHeartBonus = 0,
    equipmentBonus = 0,
): EffectApplicationResult {
    const tier = activeEffect.tier;

    if (tier === 1) {
        return { success: true, activeEffect, message: `Effect applied automatically.` };
    }

    if (tier === 2 && effectType === 'buff') {
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
                intensity: Math.min((activeEffect.intensity ?? 1) * 2, 6),
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

    if (tier === 2 && effectType === 'debuff') {
        const resistStat = activeEffect.resistedBy ? getResistStat(target, activeEffect.resistedBy) : 0;
        const dr = (activeEffect.resistDR ?? 12) + attackerHeartBonus + equipmentBonus;
        const roll = createDieRoll('neutral')();
        const total = roll + resistStat;

        if (roll === 20) {
            const reboundEffect: ActiveEffect = {
                ...activeEffect,
                intensity: Math.min((activeEffect.intensity ?? 1) * 2, 6),
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
                remainingDuration: activeEffect.remainingDuration * 2,
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

    if (tier === 3) {
        const resistStat = activeEffect.resistedBy ? getResistStat(target, activeEffect.resistedBy) : 0;
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
