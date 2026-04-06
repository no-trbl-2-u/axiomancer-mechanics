import { Character } from 'Character/types';
import { Enemy, EnemyTier1EffectMap } from 'Enemy/types';
import { Stance, CombatAction, CombatState } from 'Combat/types';
import { ActiveEffect, AggregatedModifiers, AggregatedStatDeltas, Effect, EffectApplicationResult, EffectStatTarget } from './types';
import { lookupEffect } from './effects.library';
import { MAX_EFFECT_INTENSITY, MAX_EFFECT_DURATION, STAT_MULTIPLIERS } from '../Game/game-mechanics.constants';

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
const TIER1_EFFECT_MAP: Partial<Record<Stance, Record<'attack' | 'defend', Tier1MapEntry>>> = {
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
    type: Stance,
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
// STANCE SWITCHING — BUFF CLEARING
// ===============================================

/**
 * Removes all Tier 1 self-buffs that belong to a DIFFERENT stance than the one
 * the player just chose. Called before applying the new round's Tier 1 effect so
 * switching from heart → mind removes heart buffs (regen, etc.) immediately.
 *
 * Effects that target the OPPONENT (mind mark debuffs) are never in the actor's
 * own array, so they are unaffected by this call.
 *
 * @param activeEffects - The actor's current effect array
 * @param currentType   - The stance chosen this round
 * @returns The filtered array and a list of what was removed (for UI announcements)
 */
export function clearTier1EffectsForType(
    activeEffects: ActiveEffect[],
    currentType: Stance,
): { activeEffects: ActiveEffect[]; cleared: ActiveEffect[] } {
    const cleared: ActiveEffect[] = [];
    const remaining = activeEffects.filter(ae => {
        if (!ae.effectId.startsWith('tier1_')) return true;
        // Debuffs are applied by the opponent and expire naturally.
        // Only the actor's own self-applied stance buffs should be cleared on type change.
        if (lookupEffect(ae.effectId)?.type === 'debuff') return true;
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
    const resistStat = activeEffect.resistedBy as Stance | undefined;
    if (!resistStat) return 0;
    return target.baseStats[resistStat] ?? 0;
}

// ===============================================
// EFFECT REMOVAL
// ===============================================

/**
 * Removes a specific effect by ID from an active-effects array.
 * Pure function — does not mutate anything.
 * Used for dispels, cleanses, and Phase 2b skill interactions.
 *
 * @param activeEffects - Current array of active effects
 * @param effectId      - The effectId to remove
 * @returns A new array without the named effect
 */
export function removeEffect(activeEffects: ActiveEffect[], effectId: string): ActiveEffect[] {
    return activeEffects.filter(ae => ae.effectId !== effectId);
}

// ===============================================
// AGGREGATE ALL ACTIVE-EFFECT MODIFIERS
// ===============================================

/**
 * Expands a base-stat change into its cascaded derived-stat deltas.
 * A `+2 body` change adds +2×ATTACK to physicalAttack, +2×SKILL to physicalSkill, etc.
 * Derived-stat targets are returned as-is.
 */
function cascadeBaseStat(stat: EffectStatTarget, delta: number): AggregatedStatDeltas {
    switch (stat) {
        case 'body':
            return {
                physicalAttack:  delta * STAT_MULTIPLIERS.ATTACK,
                physicalSkill:   delta * STAT_MULTIPLIERS.SKILL,
                physicalDefense: delta * STAT_MULTIPLIERS.DEFENSE,
            };
        case 'mind':
            return {
                mentalAttack:  delta * STAT_MULTIPLIERS.ATTACK,
                mentalSkill:   delta * STAT_MULTIPLIERS.SKILL,
                mentalDefense: delta * STAT_MULTIPLIERS.DEFENSE,
            };
        case 'heart':
            return {
                emotionalAttack:  delta * STAT_MULTIPLIERS.ATTACK,
                emotionalSkill:   delta * STAT_MULTIPLIERS.SKILL,
                emotionalDefense: delta * STAT_MULTIPLIERS.DEFENSE,
            };
        default:
            return { [stat]: delta } as AggregatedStatDeltas;
    }
}

/**
 * Aggregates every payload field across all active effects into one flat object.
 * Pure function — call once per combatant per round to avoid repeated scanning.
 *
 * Advantage/disadvantage semantics:
 *   - `grantAdvantage` on any effect type → bearer's own attacks gain advantage on those types.
 *   - `grantDisadvantage` on a BUFF  → evasion: opponents attacking the bearer get disadvantage.
 *   - `grantDisadvantage` on a DEBUFF → bearer's own attacks suffer disadvantage on those types.
 *
 * Stat multipliers stack multiplicatively (raised to currentIntensity so a 1.5× at intensity 2
 * becomes 1.5² = 2.25×); additive deltas scale linearly with intensity.
 */
export function getActiveEffectModifiers(activeEffects: ActiveEffect[]): AggregatedModifiers {
    const result: AggregatedModifiers = {
        statDeltas:          {},
        statMultipliers:     {},
        rollModifier:        0,
        defenseModifier:     0,
        attackAdvantage:     [],
        attackDisadvantage:  [],
        evasionDisadvantage: [],
        skipTurn:            false,
        blockedStances:      [],
        forcedStance:        null,
    };

    for (const ae of activeEffects) {
        const def = lookupEffect(ae.effectId);
        if (!def) continue;
        const intensity = ae.currentIntensity ?? 1;
        const { payload } = def;

        // ── Stat modifiers ───────────────────────────────────────────────────
        for (const mod of payload.statModifiers ?? []) {
            if (mod.isMultiplier) {
                // Multiplicative: apply exponent equal to intensity so stacking amplifies correctly
                const factor = Math.pow(mod.value, intensity);
                result.statMultipliers[mod.stat] = (result.statMultipliers[mod.stat] ?? 1) * factor;
            } else {
                // Additive: cascade base-stat changes to derived stats and accumulate
                const cascaded = cascadeBaseStat(mod.stat, mod.value * intensity);
                for (const [key, val] of Object.entries(cascaded) as [EffectStatTarget, number][]) {
                    result.statDeltas[key] = (result.statDeltas[key] ?? 0) + val;
                }
            }
        }

        // ── Roll modifier ────────────────────────────────────────────────────
        result.rollModifier +=
            (payload.rollModifier            ?? 0) +
            (payload.rollModifierPerIntensity ?? 0) * intensity;

        // ── Defense modifier (flat, post-multiplier) ─────────────────────────
        result.defenseModifier += payload.defenseModifier ?? 0;

        // ── Advantage modifiers ──────────────────────────────────────────────
        const adv = payload.advantageModifier;
        if (adv) {
            if (adv.grantAdvantage) {
                result.attackAdvantage.push(...adv.grantAdvantage);
            }
            if (adv.grantDisadvantage) {
                if (def.type === 'buff') {
                    // Evasion buff: opponents attacking the bearer suffer disadvantage
                    result.evasionDisadvantage.push(...adv.grantDisadvantage);
                } else {
                    // Debuff: bearer's own attacks suffer disadvantage
                    result.attackDisadvantage.push(...adv.grantDisadvantage);
                }
            }
        }

        // ── Action restrictions ───────────────────────────────────────────────
        const ar = payload.actionRestriction;
        if (ar) {
            if (ar.skipTurn)  result.skipTurn = true;
            if (ar.blockedStances) result.blockedStances.push(...ar.blockedStances);
            if (ar.forcedStance && !result.forcedStance) result.forcedStance = ar.forcedStance;
        }
    }

    return result;
}

// ===============================================
// ACTION RESTRICTION CHECK
// ===============================================

/**
 * Returns only the action-restriction fields from the aggregated modifiers.
 * Use this to check whether a combatant can act normally this turn.
 *
 * @param activeEffects - The combatant's current active effects
 * @returns skipTurn, blockedStances, forcedStance
 */
export function canAct(activeEffects: ActiveEffect[]): {
    skipTurn: boolean;
    blockedStances: Stance[];
    forcedStance: Stance | null;
} {
    const mods = getActiveEffectModifiers(activeEffects);
    return {
        skipTurn:       mods.skipTurn,
        blockedStances: mods.blockedStances,
        forcedStance:   mods.forcedStance,
    };
}

// ===============================================
// DAMAGE OVER TIME
// ===============================================

/**
 * Sums all DoT damage from active effects without mutating state.
 * Returns total damage and a per-effect message array for the battle log.
 *
 * @param activeEffects - The combatant's current active effects
 */
export function processDamageOverTime(
    activeEffects: ActiveEffect[],
): { totalDamage: number; messages: string[] } {
    let totalDamage = 0;
    const messages: string[] = [];

    for (const ae of activeEffects) {
        const def = lookupEffect(ae.effectId);
        const dot = def?.payload.damageOverTime;
        if (!dot || dot.damagePerRound <= 0) continue;
        const intensity = ae.currentIntensity ?? 1;
        const damage    = dot.damagePerRound * intensity;
        totalDamage    += damage;
        messages.push(`${def!.name} deals ${damage} damage (${dot.damageType}).`);
    }

    return { totalDamage, messages };
}

// ===============================================
// ROUND-START EFFECT ORCHESTRATION
// ===============================================

/**
 * Orchestrates all start-of-round effect processing for both combatants:
 *   1. DoT damage applied to player and enemy
 *   2. Regeneration applied to player and enemy
 *
 * Tick/expiry is NOT performed here — call tickAllEffects at round end as before.
 *
 * @param state - Current combat state
 * @returns Updated CombatState and an array of event strings for the battle log
 */
export function processRoundStartEffects(state: CombatState): {
    state: CombatState;
    events: string[];
} {
    const events: string[] = [];
    let { player, enemy } = state;

    // ── Player DoT ───────────────────────────────────────────────────────────
    const playerDot = processDamageOverTime(player.currentActiveEffects as ActiveEffect[]);
    if (playerDot.totalDamage > 0) {
        const newHp = Math.max(0, player.health - playerDot.totalDamage);
        player      = { ...player, health: newHp };
        events.push(...playerDot.messages.map(m => `[Player] ${m}`));
    }

    // ── Enemy DoT ────────────────────────────────────────────────────────────
    const enemyDot = processDamageOverTime(enemy.currentActiveEffects as ActiveEffect[]);
    if (enemyDot.totalDamage > 0) {
        const newHp = Math.max(0, enemy.health - enemyDot.totalDamage);
        enemy       = { ...enemy, health: newHp };
        events.push(...enemyDot.messages.map(m => `[Enemy] ${m}`));
    }

    // ── Player Regen ─────────────────────────────────────────────────────────
    let playerHealed = 0;
    for (const ae of player.currentActiveEffects as ActiveEffect[]) {
        const def      = lookupEffect(ae.effectId);
        const perRound = def?.payload.regeneration?.healthPerRound ?? 0;
        if (perRound === 0) continue;
        const amount = perRound * (ae.currentIntensity ?? 1);
        playerHealed += amount;
    }
    if (playerHealed !== 0) {
        const newHp = Math.min(player.maxHealth, Math.max(0, player.health + playerHealed));
        player = { ...player, health: newHp };
        if (playerHealed > 0) events.push(`[Player] Regenerated ${playerHealed} HP.`);
    }

    // ── Enemy Regen ──────────────────────────────────────────────────────────
    let enemyHealed = 0;
    for (const ae of enemy.currentActiveEffects as ActiveEffect[]) {
        const def      = lookupEffect(ae.effectId);
        const perRound = def?.payload.regeneration?.healthPerRound ?? 0;
        if (perRound === 0) continue;
        const amount = perRound * (ae.currentIntensity ?? 1);
        enemyHealed += amount;
    }
    if (enemyHealed !== 0) {
        const newHp = Math.min(enemy.maxHealth, Math.max(0, enemy.health + enemyHealed));
        enemy = { ...enemy, health: newHp };
        if (enemyHealed > 0) events.push(`[Enemy] Regenerated ${enemyHealed} HP.`);
    }

    return { state: { ...state, player, enemy }, events };
}

// ===============================================
// WORLD EFFECT TICK (EXPLORATION)
// ===============================================

/**
 * Applies DoT, regeneration, and ticks effect durations for a player outside combat.
 * Call this on each map-node transition so status effects persist during exploration.
 *
 * @param player - The current player character
 * @returns Updated player and an event-message array for the exploration HUD
 */
export function processWorldEffectTick(player: Character): {
    player: Character;
    events: string[];
} {
    const events: string[] = [];
    let updated = player;

    // ── DoT ──────────────────────────────────────────────────────────────────
    const dot = processDamageOverTime(updated.currentActiveEffects as ActiveEffect[]);
    if (dot.totalDamage > 0) {
        const newHp = Math.max(0, updated.health - dot.totalDamage);
        updated     = { ...updated, health: newHp };
        events.push(...dot.messages);
    }

    // ── Regen ─────────────────────────────────────────────────────────────────
    let healed = 0;
    for (const ae of updated.currentActiveEffects as ActiveEffect[]) {
        const def      = lookupEffect(ae.effectId);
        const perRound = def?.payload.regeneration?.healthPerRound ?? 0;
        if (perRound === 0) continue;
        const amount = perRound * (ae.currentIntensity ?? 1);
        healed      += amount;
    }
    if (healed !== 0) {
        const newHp = Math.min(updated.maxHealth, Math.max(0, updated.health + healed));
        updated     = { ...updated, health: newHp };
        if (healed > 0) events.push(`Regenerated ${healed} HP.`);
    }

    // ── Tick durations + collect expired ─────────────────────────────────────
    const remaining: ActiveEffect[] = [];
    const expired:   ActiveEffect[] = [];
    for (const ae of updated.currentActiveEffects as ActiveEffect[]) {
        if (ae.remainingDuration === -1) {
            remaining.push(ae); // permanent, never ticks
            continue;
        }
        const ticked = { ...ae, remainingDuration: ae.remainingDuration - 1 };
        if (ticked.remainingDuration <= 0) {
            expired.push(ticked);
        } else {
            remaining.push(ticked);
        }
    }
    updated = { ...updated, currentActiveEffects: remaining };

    for (const ae of expired) {
        const def = lookupEffect(ae.effectId);
        if (def) events.push(`${def.name} has faded.`);
    }

    return { player: updated, events };
}
