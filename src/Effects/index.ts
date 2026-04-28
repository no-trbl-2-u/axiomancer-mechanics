import { Character } from 'Character/types';
import { Enemy, EnemyTier1EffectMap } from 'Enemy/types';
import { Stance, CombatAction } from 'Combat/types';
import {
    ActiveEffect,
    Effect,
    EffectApplicationResult,
    EffectStatTarget,
} from './types';
import { lookupEffect } from './effects.library';
import { MAX_EFFECT_INTENSITY, MAX_EFFECT_DURATION } from '../Game/game-mechanics.constants';
import { isCharacter } from '../Utils/typeGuards';

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
 * Removes the first ActiveEffect with the given effectId from the array.
 * Returns the (possibly unchanged) array along with the removed instance, if any.
 *
 * Used by cleanses, dispels, and stance changes that need to surgically drop
 * a specific effect rather than tick everything down.
 *
 * @param activeEffects - The current array of active effects on a target
 * @param effectId      - The effect ID to remove
 * @returns The filtered array and the removed effect (or null if none matched)
 */
export function removeEffect(
    activeEffects: ActiveEffect[],
    effectId: string,
): { activeEffects: ActiveEffect[]; removed: ActiveEffect | null } {
    const idx = activeEffects.findIndex(ae => ae.effectId === effectId);
    if (idx === -1) return { activeEffects, removed: null };
    const removed = activeEffects[idx];
    const next = [...activeEffects.slice(0, idx), ...activeEffects.slice(idx + 1)];
    return { activeEffects: next, removed };
}

// ===============================================
// AGGREGATED EFFECT MODIFIERS
// ===============================================

/**
 * Aggregated read-only view of every modifier contributed by a target's
 * active effects. Used by combat rolls, defense calculations, and AI logic
 * to ask "what does this combatant have going on right now?" with one call.
 *
 * Stat modifiers are summed into a Partial<Record<EffectStatTarget, number>>.
 * Multiplier-style stat mods (`isMultiplier === true`) are tracked separately
 * so callers can decide how to layer them on top of additive modifiers.
 *
 * Roll modifier sums both the flat `rollModifier` (which never scales) and
 * `rollModifierPerIntensity * currentIntensity`.
 *
 * Defense modifier sums `payload.defenseModifier` across all effects (no
 * per-intensity scaling — defense modifiers come from gear-like buffs, not
 * stacking debuffs in current design).
 *
 * Advantage grants/disadvantages are deduplicated; each Stance appears at
 * most once in either array.
 *
 * @property statModifiers - Additive stat changes keyed by `EffectStatTarget`
 * @property statMultipliers - Multiplier stat changes keyed by `EffectStatTarget`
 *   (each entry is the product of all multipliers; default 1 if absent)
 * @property rollModifier - Total flat + per-intensity roll modifier
 * @property defenseModifier - Total defense modifier across all effects
 * @property grantsAdvantage - Stances on which this target rolls with advantage
 * @property grantsDisadvantage - Stances on which this target rolls with disadvantage
 */
export interface AggregatedEffectModifiers {
    statModifiers: Partial<Record<EffectStatTarget, number>>;
    statMultipliers: Partial<Record<EffectStatTarget, number>>;
    rollModifier: number;
    defenseModifier: number;
    grantsAdvantage: Stance[];
    grantsDisadvantage: Stance[];
}

/**
 * Aggregates every modifier contributed by an array of active effects into
 * a single object. Pure function — does not mutate inputs.
 *
 * Effects whose definition is missing from the registry are skipped silently
 * so the function never throws on stale data.
 *
 * @param activeEffects - The active effects to aggregate
 * @returns A fully-populated `AggregatedEffectModifiers` snapshot
 */
export function getActiveEffectModifiers(
    activeEffects: ActiveEffect[],
): AggregatedEffectModifiers {
    const statModifiers: Partial<Record<EffectStatTarget, number>> = {};
    const statMultipliers: Partial<Record<EffectStatTarget, number>> = {};
    const advSet = new Set<Stance>();
    const disSet = new Set<Stance>();
    let rollModifier = 0;
    let defenseModifier = 0;

    for (const ae of activeEffects) {
        const def = lookupEffect(ae.effectId);
        if (!def) continue;
        const intensity = ae.currentIntensity ?? 1;
        const payload = def.payload;

        if (payload.statModifiers) {
            for (const sm of payload.statModifiers) {
                if (sm.isMultiplier) {
                    const prev = statMultipliers[sm.stat] ?? 1;
                    statMultipliers[sm.stat] = prev * sm.value;
                } else {
                    const prev = statModifiers[sm.stat] ?? 0;
                    statModifiers[sm.stat] = prev + sm.value * intensity;
                }
            }
        }

        rollModifier += (payload.rollModifier ?? 0)
            + (payload.rollModifierPerIntensity ?? 0) * intensity;
        defenseModifier += payload.defenseModifier ?? 0;

        const advMod = payload.advantageModifier;
        if (advMod?.grantAdvantage) advMod.grantAdvantage.forEach(s => advSet.add(s));
        if (advMod?.grantDisadvantage) advMod.grantDisadvantage.forEach(s => disSet.add(s));
    }

    return {
        statModifiers,
        statMultipliers,
        rollModifier,
        defenseModifier,
        grantsAdvantage: [...advSet],
        grantsDisadvantage: [...disSet],
    };
}

// ===============================================
// ACTION RESTRICTIONS
// ===============================================

/**
 * The combined action restrictions imposed on a combatant by every active
 * `actionRestriction` payload they carry. Returned by `canAct`.
 *
 * `canAct` is true when the combatant may take any normal turn — i.e. the
 * combatant has no `skipTurn` and is not currently locked into an empty
 * stance set.
 *
 * `forcedStance` is set when at least one active effect specifies a forced
 * stance; if multiple effects disagree, the most recently added effect wins
 * (later index in the input array).
 *
 * `blockedStances` is the deduplicated union of every effect's
 * `blockedStances`, with any `forcedStance` removed from the list (so the
 * forced stance is always present in the allowed set).
 *
 * `allowedStances` is the complement of `blockedStances` against the full
 * Stance enum (`['heart', 'body', 'mind']`), restricted to the forced stance
 * if one is set. Useful for UI gating.
 *
 * @property canAct - True when the combatant may act this turn
 * @property skipTurn - True when at least one effect forces a turn skip
 * @property forcedStance - Stance the combatant is locked into, if any
 * @property blockedStances - Deduplicated stances the combatant cannot use
 * @property allowedStances - Stances the combatant is permitted to use
 */
export interface ActionRestrictions {
    canAct: boolean;
    skipTurn: boolean;
    forcedStance?: Stance;
    blockedStances: Stance[];
    allowedStances: Stance[];
}

const ALL_STANCES: Stance[] = ['heart', 'body', 'mind'];

/**
 * Aggregates `actionRestriction` payloads across all of a target's active
 * effects into a single, easy-to-consume restriction object.
 *
 * Algorithm:
 *   1. `skipTurn`     — true if ANY effect sets `skipTurn`.
 *   2. `forcedStance` — last effect (latest array index) that sets it wins.
 *   3. `blockedStances` — union of all effects' lists, minus `forcedStance`.
 *   4. `allowedStances` — `[forcedStance]` if forced; otherwise all stances
 *      not in `blockedStances`.
 *   5. `canAct`       — false if `skipTurn` or `allowedStances` is empty.
 *
 * @param activeEffects - The active effects to inspect
 * @returns An `ActionRestrictions` snapshot
 */
export function canAct(activeEffects: ActiveEffect[]): ActionRestrictions {
    let skipTurn = false;
    let forcedStance: Stance | undefined;
    const blockedSet = new Set<Stance>();

    for (const ae of activeEffects) {
        const def = lookupEffect(ae.effectId);
        const ar = def?.payload.actionRestriction;
        if (!ar) continue;
        if (ar.skipTurn) skipTurn = true;
        if (ar.forcedStance) forcedStance = ar.forcedStance;
        if (ar.blockedStances) ar.blockedStances.forEach(s => blockedSet.add(s));
    }

    if (forcedStance) blockedSet.delete(forcedStance);

    const blockedStances = [...blockedSet];
    const allowedStances = forcedStance
        ? [forcedStance]
        : ALL_STANCES.filter(s => !blockedSet.has(s));

    return {
        canAct: !skipTurn && allowedStances.length > 0,
        skipTurn,
        forcedStance,
        blockedStances,
        allowedStances,
    };
}

// ===============================================
// DAMAGE OVER TIME
// ===============================================

/**
 * Per-effect breakdown of damage dealt by a single DoT effect during a tick.
 * @property effectId - Effect that produced this damage
 * @property amount - Damage dealt by this single effect
 * @property message - Human-readable summary for the battle log
 */
export interface DamageOverTimeContribution {
    effectId: string;
    amount: number;
    message: string;
}

/**
 * Aggregates all damage-over-time contributions from a target's active
 * effects for a single tick. Pure function — returns the totals without
 * actually applying damage to the target. Callers (combat reducer, world
 * tick, etc.) are responsible for subtracting `total` from the target's HP.
 *
 * Each effect's contribution is `damagePerRound * currentIntensity`. Effects
 * with no DoT payload are skipped.
 *
 * @param activeEffects - The active effects to scan
 * @returns Total damage and a per-effect breakdown for logging
 */
export function processDamageOverTime(activeEffects: ActiveEffect[]): {
    total: number;
    contributions: DamageOverTimeContribution[];
    messages: string[];
} {
    const contributions: DamageOverTimeContribution[] = [];
    let total = 0;

    for (const ae of activeEffects) {
        const def = lookupEffect(ae.effectId);
        const dot = def?.payload.damageOverTime;
        if (!def || !dot || dot.damagePerRound <= 0) continue;
        const amount = dot.damagePerRound * (ae.currentIntensity ?? 1);
        if (amount <= 0) continue;
        total += amount;
        contributions.push({
            effectId: def.id,
            amount,
            message: `${def.name} deals ${amount} ${dot.damageType} damage.`,
        });
    }

    return {
        total,
        contributions,
        messages: contributions.map(c => c.message),
    };
}

// ===============================================
// ROUND START ORCHESTRATION
// ===============================================

/**
 * Aggregated payload describing what a single combatant experienced during a
 * round-start tick: regen healing, DoT damage taken, and any expired effects
 * cleaned up at end of round.
 */
export interface CombatantRoundEvents {
    /** Total HP gained from regeneration effects */
    healed: number;
    /** Total HP lost to damage-over-time effects */
    dotDamage: number;
    /** Effects that ticked to 0 and were removed */
    expired: ActiveEffect[];
    /** Per-event human-readable strings for the battle log */
    messages: string[];
}

/**
 * Round-start summary covering both combatants. Returned by
 * `processRoundStartEffects` so the CLI / reducer can surface every change.
 */
export interface RoundStartEvents {
    player: CombatantRoundEvents;
    enemy: CombatantRoundEvents;
}

/**
 * Applies regen, DoT, and effect duration ticking to a single combatant.
 * Order of operations within a tick is **regen → DoT → tick** so a regen
 * effect that ticks to 0 still heals on the round it expires.
 *
 * Pure helper; consumers should usually call `processRoundStartEffects`,
 * which orchestrates this for both combatants in a `CombatState`.
 */
function tickCombatant<T extends Character | Enemy>(target: T): {
    target: T;
    events: CombatantRoundEvents;
} {
    const messages: string[] = [];

    const { target: regenned, healed } = applyRegenInternal(target);
    if (healed > 0) messages.push(`Regenerated ${healed} HP.`);

    const dot = processDamageOverTime(regenned.currentActiveEffects);
    let after: Character | Enemy = regenned;
    if (dot.total > 0) {
        const newHealth = Math.max(0, after.health - dot.total);
        after = { ...(after as object), health: newHealth } as Character | Enemy;
        messages.push(...dot.messages);
    }

    const ticked = tickAllEffectsInternal(after);
    if (ticked.expired.length > 0) {
        for (const ex of ticked.expired) {
            const def = lookupEffect(ex.effectId);
            messages.push(`${def?.name ?? ex.effectId} expired.`);
        }
    }

    return {
        target: ticked.target as T,
        events: {
            healed,
            dotDamage: dot.total,
            expired: ticked.expired,
            messages,
        },
    };
}

/**
 * Round-start orchestration for combat. Performs regen → DoT → tick on both
 * the player and the enemy, returning a fully updated `CombatState`-shape
 * object plus a summary of every event surfaced for the battle log.
 *
 * The function is intentionally **structural** — it accepts and returns any
 * object with `player` and `enemy` fields shaped like `Character` and
 * `Enemy`. This allows the combat reducer to call it without importing the
 * full `CombatState` type, breaking a potential circular dependency.
 *
 * @param state - A combat state with player + enemy combatants
 * @returns Updated combatants and per-combatant round events
 */
export function processRoundStartEffects<S extends { player: Character; enemy: Enemy }>(
    state: S,
): { state: S; events: RoundStartEvents } {
    const playerTick = tickCombatant(state.player);
    const enemyTick  = tickCombatant(state.enemy);
    return {
        state: { ...state, player: playerTick.target, enemy: enemyTick.target },
        events: { player: playerTick.events, enemy: enemyTick.events },
    };
}

// ===============================================
// WORLD-LEVEL EFFECT TICK
// ===============================================

/**
 * Per-step summary of effect activity outside of combat: regen healed, DoT
 * damage taken, expired effects, and human-readable log strings.
 */
export interface WorldEffectTickResult {
    /** The character after regen, DoT, and tick have been applied */
    player: Character;
    /** Total HP gained from regen effects this step */
    healed: number;
    /** Total HP lost to damage-over-time effects this step */
    dotDamage: number;
    /** Effects that ticked to 0 and were removed */
    expired: ActiveEffect[];
    /** Per-event human-readable strings for the exploration HUD */
    events: string[];
}

/**
 * Applies a single tick of effect processing while exploring the world map.
 * Same regen → DoT → tick order as `processRoundStartEffects` but operates
 * on a single character rather than a full combat state.
 *
 * Designed to be called from the world reducer on each map node transition,
 * enabling persistent hazards (poison, curses) and persistent regen to work
 * outside of combat.
 *
 * @param player - The exploring character to tick effects on
 * @returns Updated character, per-step deltas, and event log
 */
export function processWorldEffectTick(player: Character): WorldEffectTickResult {
    const { target, events } = tickCombatant(player);
    return {
        player: target,
        healed: events.healed,
        dotDamage: events.dotDamage,
        expired: events.expired,
        events: events.messages,
    };
}

// ===============================================
// INTERNAL HELPERS — local copies to avoid circular import with Combat/index
// ===============================================

/**
 * Local mirror of `Combat/applyRegen` to keep round-start orchestration in
 * the Effects module without importing Combat (which itself depends on
 * Effects). Behaviour is identical: sums regen healing across active effects
 * and clamps to maxHealth.
 */
function applyRegenInternal<T extends Character | Enemy>(target: T): { target: T; healed: number } {
    let healed = 0;
    let updated = target;

    for (const ae of target.currentActiveEffects) {
        const def = lookupEffect(ae.effectId);
        const perRound = def?.payload.regeneration?.healthPerRound ?? 0;
        if (perRound <= 0) continue;
        const amount = perRound * (ae.currentIntensity ?? 1);
        healed += amount;
        const newHealth = Math.min(updated.maxHealth, updated.health + amount);
        updated = isCharacter(updated)
            ? ({ ...updated, health: newHealth } as T)
            : ({ ...(updated as object), health: newHealth } as T);
    }

    return { target: updated, healed };
}

/**
 * Local mirror of `Combat/tickAllEffects` for the same reason as
 * `applyRegenInternal`. Permanent effects (`remainingDuration === -1`) are
 * preserved untouched.
 */
function tickAllEffectsInternal<T extends Character | Enemy>(target: T): {
    target: T;
    expired: ActiveEffect[];
} {
    const expired: ActiveEffect[] = [];
    const remaining = target.currentActiveEffects.reduce<ActiveEffect[]>((acc, effect) => {
        if (effect.remainingDuration === -1) {
            acc.push(effect);
            return acc;
        }
        const ticked = { ...effect, remainingDuration: effect.remainingDuration - 1 };
        if (ticked.remainingDuration <= 0) {
            expired.push(ticked);
        } else {
            acc.push(ticked);
        }
        return acc;
    }, []);

    return { target: { ...target, currentActiveEffects: remaining } as T, expired };
}
