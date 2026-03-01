import { Character } from 'Character/types';
import { Enemy, EnemyTier1EffectMap } from 'Enemy/types';
import { ActionType, CombatAction } from 'Combat/types';
import { ActiveEffect, Effect, EffectApplicationResult } from './types';
import { lookupEffect } from './effects.library';
import { MAX_EFFECT_INTENSITY, MAX_EFFECT_DURATION } from '../Game/game-mechanics.constants';

// ===============================================
// STACKING OPTIONS
// ===============================================

/**
 * Optional overrides that control how applyEffect increments intensity and duration.
 * Used by the Tier 1 system so Mind/Defend (+3/+3) and Mind/Attack (+1/+1) can share
 * the same underlying effect definition while applying different stack amounts.
 *
 * @property intensityDelta - How much intensity increases per application (default 1).
 *   Also used as the starting intensity on first application.
 * @property durationMode   - 'reset' resets duration to effect.duration (default).
 *                            'additive' adds durationDelta to the remaining duration.
 * @property durationDelta  - How much duration increases in additive mode (default = intensityDelta).
 */
export interface ApplyEffectOptions {
    intensityDelta?: number;
    durationMode?: 'reset' | 'additive';
    durationDelta?: number;
}

// ===============================================
// TIER 1 EFFECT MAP
// ===============================================

/**
 * A single entry in the Tier 1 effect map.
 * @property effectId    - The effect to apply from the library.
 * @property target      - 'self' applies to the acting combatant; 'opponent' applies to the other.
 * @property applyOptions - Optional stack overrides (intensity delta, additive duration, etc.)
 */
interface Tier1MapEntry {
    effectId: string;
    target: 'self' | 'opponent';
    applyOptions?: ApplyEffectOptions;
}

/**
 * Maps every basic combat action to its automatic Tier 1 effect.
 *
 * Body   attack  → Ad Baculum          (self buff — +physicalAttack)
 * Body   defend  → Briar Stance        (self buff — thorns reflect damage)
 * Mind   attack  → Exposed Reasoning   (opponent debuff — +1/+1 intensity/duration)
 * Mind   defend  → Exposed Reasoning   (opponent debuff — +3/+3 intensity/duration)
 * Heart  attack  → Fleeting Kindness   (self — -5 roll, strips enemy buff, extends player buff)
 * Heart  defend  → Vital Empathy       (self buff — regen)
 */
const TIER1_EFFECT_MAP: Partial<Record<ActionType, Record<'attack' | 'defend', Tier1MapEntry>>> = {
    body:  {
        attack: { effectId: 'tier1_body_attack', target: 'self' },
        defend: { effectId: 'tier1_body_defend', target: 'self' },
    },
    mind:  {
        attack: { effectId: 'tier1_mind_mark', target: 'opponent', applyOptions: { intensityDelta: 1, durationMode: 'additive', durationDelta: 1 } },
        defend: { effectId: 'tier1_mind_mark', target: 'opponent', applyOptions: { intensityDelta: 3, durationMode: 'additive', durationDelta: 3 } },
    },
    heart: {
        attack: { effectId: 'tier1_heart_attack', target: 'self' },
        defend: { effectId: 'tier1_heart_defend', target: 'self' },
    },
};

// ===============================================
// CORE EFFECT ENGINE
// ===============================================

/**
 * Applies an effect to an activeEffects array, handling all three stacking modes.
 * Pure function — does not mutate anything.
 *
 * Stacking modes:
 *   'none'      — Stronger instance wins. If existing is equal or higher, new is ignored.
 *   'intensity' — Intensity increments (capped at MAX_EFFECT_INTENSITY).
 *                 Duration either resets to effect.duration ('reset') or extends additively ('additive').
 *   'duration'  — Duration extends by the effect's base duration on reapply.
 *
 * @param activeEffects - The current array of active effects on the target
 * @param effect        - The full Effect definition (from the library)
 * @param round         - Current combat round (stored on the ActiveEffect instance)
 * @param options       - Optional overrides for intensity delta and duration behaviour
 */
export function applyEffect(
    activeEffects: ActiveEffect[],
    effect: Effect,
    round: number,
    options?: ApplyEffectOptions,
): { activeEffects: ActiveEffect[]; result: EffectApplicationResult } {
    const intensityDelta = options?.intensityDelta ?? 1;
    const durationMode   = options?.durationMode   ?? 'reset';
    const durationDelta  = options?.durationDelta  ?? intensityDelta;

    const existing = activeEffects.find(e => e.effectId === effect.id);

    // ── Fresh application ───────────────────────────────────────────────────
    if (!existing) {
        const initIntensity = Math.min(intensityDelta, MAX_EFFECT_INTENSITY);
        const initDuration  = durationMode === 'additive'
            ? Math.min(durationDelta, MAX_EFFECT_DURATION)
            : Math.min(effect.duration, MAX_EFFECT_DURATION);

        const newEffect: ActiveEffect = {
            effectId:          effect.id,
            remainingDuration: initDuration,
            currentIntensity:  initIntensity,
            appliedAtRound:    round,
            teir:              effect.teir,
            resistedBy:        effect.resistedBy,
            resistDR:          effect.resistDR,
        };
        return {
            activeEffects: [...activeEffects, newEffect],
            result: {
                success:     true,
                activeEffect: newEffect,
                message:     `${effect.name} applied.`,
            },
        };
    }

    // ── Effect already active — handle stacking ─────────────────────────────
    switch (effect.stacking) {

        case 'none': {
            if ((existing.currentIntensity ?? 1) >= 1) {
                return {
                    activeEffects,
                    result: {
                        success: false,
                        message: `${effect.name} is already active — stronger instance held.`,
                    },
                };
            }
            const replaced: ActiveEffect = {
                ...existing,
                remainingDuration: Math.min(effect.duration, MAX_EFFECT_DURATION),
                currentIntensity:  1,
            };
            return {
                activeEffects: activeEffects.map(e => e.effectId === effect.id ? replaced : e),
                result: { success: true, activeEffect: replaced, message: `${effect.name} replaced with stronger instance.` },
            };
        }

        case 'intensity': {
            const prev         = existing.currentIntensity ?? 1;
            const newIntensity = Math.min(prev + intensityDelta, MAX_EFFECT_INTENSITY);
            const newDuration  = durationMode === 'additive'
                ? Math.min(existing.remainingDuration + durationDelta, MAX_EFFECT_DURATION)
                : Math.min(effect.duration, MAX_EFFECT_DURATION);

            const stacked: ActiveEffect = {
                ...existing,
                currentIntensity:  newIntensity,
                remainingDuration: newDuration,
            };
            return {
                activeEffects: activeEffects.map(e => e.effectId === effect.id ? stacked : e),
                result: {
                    success:     true,
                    activeEffect: stacked,
                    message:     newIntensity > prev
                        ? `${effect.name} intensified to ${newIntensity}.`
                        : `${effect.name} at maximum intensity — duration extended.`,
                    stackedWith: { previousIntensity: prev, previousDuration: existing.remainingDuration },
                },
            };
        }

        case 'duration': {
            const extended: ActiveEffect = {
                ...existing,
                remainingDuration: Math.min(
                    existing.remainingDuration + effect.duration,
                    MAX_EFFECT_DURATION,
                ),
            };
            return {
                activeEffects: activeEffects.map(e => e.effectId === effect.id ? extended : e),
                result: {
                    success:     true,
                    activeEffect: extended,
                    message:     `${effect.name} duration extended.`,
                    stackedWith: {
                        previousIntensity: existing.currentIntensity ?? 1,
                        previousDuration:  existing.remainingDuration,
                    },
                },
            };
        }
    }
}

// ===============================================
// TIER 1 TRIGGER
// ===============================================

/**
 * Resolves which Tier1MapEntry to use for a given action, factoring in any
 * per-enemy overrides (which only specify a replacement effectId; the target
 * and applyOptions from the global map are preserved).
 */
function resolveTier1Entry(
    type: ActionType,
    action: 'attack' | 'defend',
    customEffectMap?: EnemyTier1EffectMap,
): Tier1MapEntry | undefined {
    const globalEntry  = TIER1_EFFECT_MAP[type]?.[action];
    const customId     = customEffectMap?.[type]?.[action];

    if (customId && globalEntry) {
        return { ...globalEntry, effectId: customId };
    }
    if (customId) {
        return { effectId: customId, target: 'self' };
    }
    return globalEntry;
}

/**
 * Applies the Tier 1 stance effect for a given combat action, returning both
 * the updated actor and opponent effect arrays plus UI feedback.
 *
 * Mind actions target the OPPONENT (studying mark); all others target SELF.
 *
 * @param actorEffects    - Current active effects on the combatant taking the action
 * @param opponentEffects - Current active effects on the other combatant
 * @param combatAction    - The action chosen this round
 * @param round           - Current combat round
 * @param customEffectMap - Optional per-enemy overrides for effect IDs
 */
export function applyTier1CombatEffectWithResult(
    actorEffects: ActiveEffect[],
    opponentEffects: ActiveEffect[],
    combatAction: CombatAction,
    round: number,
    customEffectMap?: EnemyTier1EffectMap,
): {
    actorEffects: ActiveEffect[];
    opponentEffects: ActiveEffect[];
    effect: Effect | null;
    message: string | null;
    appliedTo: 'self' | 'opponent' | null;
} {
    const { type, action } = combatAction;
    const noChange = { actorEffects, opponentEffects, effect: null, message: null, appliedTo: null } as const;

    if (action !== 'attack' && action !== 'defend') return noChange;

    const entry = resolveTier1Entry(type, action, customEffectMap);
    if (!entry) return noChange;

    const effect = lookupEffect(entry.effectId);
    if (!effect) return noChange;

    if (entry.target === 'opponent') {
        const { activeEffects: updatedOpponent, result } = applyEffect(opponentEffects, effect, round, entry.applyOptions);
        return { actorEffects, opponentEffects: updatedOpponent, effect, message: result.message, appliedTo: 'opponent' };
    } else {
        const { activeEffects: updatedActor, result } = applyEffect(actorEffects, effect, round, entry.applyOptions);
        return { actorEffects: updatedActor, opponentEffects, effect, message: result.message, appliedTo: 'self' };
    }
}

/**
 * Simplified wrapper that returns only the two updated effect arrays.
 */
export function applyTier1CombatEffect(
    actorEffects: ActiveEffect[],
    opponentEffects: ActiveEffect[],
    combatAction: CombatAction,
    round: number,
    customEffectMap?: EnemyTier1EffectMap,
): { actorEffects: ActiveEffect[]; opponentEffects: ActiveEffect[] } {
    const { actorEffects: a, opponentEffects: o } = applyTier1CombatEffectWithResult(
        actorEffects, opponentEffects, combatAction, round, customEffectMap,
    );
    return { actorEffects: a, opponentEffects: o };
}

// ===============================================
// ACTION TYPE SWITCHING — BUFF CLEARING
// ===============================================

/**
 * Removes all Tier 1 self-buffs that belong to a DIFFERENT actionType than the one
 * the player just chose. Called before applying the new round's Tier 1 effect so
 * switching from heart → mind removes heart buffs (regen, etc.) immediately.
 *
 * Effects that target the OPPONENT (mind mark debuffs) are never in the actor's
 * own array, so they are unaffected by this call.
 *
 * @param activeEffects - The actor's current effect array
 * @param currentType   - The actionType chosen this round
 * @returns The filtered array and a list of what was removed (for UI announcements)
 */
export function clearTier1EffectsForType(
    activeEffects: ActiveEffect[],
    currentType: ActionType,
): { activeEffects: ActiveEffect[]; cleared: ActiveEffect[] } {
    const cleared: ActiveEffect[] = [];
    const remaining = activeEffects.filter(ae => {
        if (!ae.effectId.startsWith('tier1_')) return true;
        if (ae.effectId.includes(`_${currentType}_`)) return true;
        cleared.push(ae);
        return false;
    });
    return { activeEffects: remaining, cleared };
}

// ===============================================
// RESIST STAT LOOKUP
// ===============================================

/**
 * Returns the target's resist stat value for a given effect.
 * Used when computing whether a Tier 2/3 debuff lands.
 */
export function getTargetsResistStatValue(
    target: Character | Enemy,
    activeEffect: ActiveEffect,
): number {
    const resistStat = activeEffect.resistedBy as ActionType | undefined;
    if (!resistStat) return 0;
    return target.baseStats[resistStat] ?? 0;
}
