/**
 * Combat round resolver — pure, deterministic round resolution.
 *
 * `resolveCombatRound` is the single entry point any client (CLI, future React
 * Native UI, the automated tester) calls to advance combat by one round. It
 * returns the next `CombatState` plus a typed `combatEvents` stream the UI
 * consumes for rendering. The resolver itself never logs.
 *
 * Events are organised by combat phase (Q6) so a UI can render them in fixed
 * sections. Per-phase logic lives in `phases/<phase>.ts`; this file owns the
 * `RoundEvent` discriminated union and the top-level orchestrator:
 *   `round-start`        — `phases/round-start.ts` — regen / drain / start-phase DoT.
 *   `action-restriction` — `phases/action-restriction.ts` — forced-stance / blocked / skipTurn.
 *   `advantage`          — `phases/advantage.ts` — declared actions + per-side advantage labels.
 *   `stance-effects`     — `phases/stance-effects.ts` — Tier 1 stance buffs cleared and applied.
 *   `scenario`           — `phases/scenario.ts` — skill / item / attack / defend resolution and
 *                          stance-token generation (the largest phase).
 *   `round-end`          — `phases/round-end.ts` — end-phase DoT and effect expiry.
 *
 * Determinism: all rolls — dice in `createDieRoll`, buff selectors in
 * `effects.ts`, the resist pipeline — go through the seedable `getRng()`
 * singleton (Spec 11). Tests install a `Math.random`-backed RNG via the
 * helpers in `src/test-utils/rng.ts` (`mockSequentialRng` / `mockFixedRng` /
 * `mockAlternatingRng`).
 */

import { ActiveEffect, Effect, EffectApplicationResult, EffectTier } from '../Effects/types';
import { runRoundEndPhase } from './phases/round-end';
import { CombatAction, CombatState, Stance, Action, Advantage } from './types';
import {
    ResourceCost, SkillCategory, CombatResources,
} from '../Skills/types';
import type { BasicActionOutcome, SkillLookup } from '../Skills/skill.engine';
import { dumpEffectState } from './debug';
import { getRng } from '../Utils/rng';
import { runRoundStartPhase } from './phases/round-start';
import { runActionRestrictionPhase } from './phases/action-restriction';
import { runAdvantagePhase } from './phases/advantage';
import { runStanceEffectsPhase } from './phases/stance-effects';
import { runScenarioPhase } from './phases/scenario';

// ─── Round Event Types ────────────────────────────────────────────────────────

export type CombatActor = 'player' | 'enemy';

/** Per-actor outcomes from `processRoundStartEffects`. */
export type RoundStartEvent =
    | { phase: 'round-start'; kind: 'regen'; actor: CombatActor; amount: number }
    | { phase: 'round-start'; kind: 'drain'; actor: CombatActor; amount: number }
    | { phase: 'round-start'; kind: 'dot';   actor: CombatActor; amount: number }
    /** Round terminated early because start-phase ticks dropped a combatant to 0 HP. */
    | { phase: 'round-start'; kind: 'lethal'; actor: CombatActor };

/** Forced-stance / blocked-stance / skipTurn outcomes from `canAct`. */
export type ActionRestrictionEvent =
    | { phase: 'action-restriction'; kind: 'forced-stance'; actor: CombatActor; requested: Stance; forced: Stance }
    | { phase: 'action-restriction'; kind: 'turn-skipped';  actor: CombatActor; reason: 'skipTurn' | 'blockedStance' | null };

/** Declared actions and per-side advantage after effect overrides. */
export type AdvantageEvent =
    | { phase: 'advantage'; kind: 'actions';
        playerStance: Stance; playerAction: Action | 'skip';
        enemyStance: Stance;  enemyAction:  Action | 'skip' }
    | { phase: 'advantage'; kind: 'matchup';
        playerStance: Stance; enemyStance: Stance;
        playerAdvantage: Advantage; enemyAdvantage: Advantage };

/** Tier 1 stance buffs cleared by a stance change or applied by this round's action. */
export type StanceEffectEvent =
    | { phase: 'stance-effects'; kind: 'cleared'; actor: CombatActor; cleared: ActiveEffect[]; newStance: Stance }
    | { phase: 'stance-effects'; kind: 'applied'; actor: CombatActor;
        effect: Effect; message: string; appliedTo: 'self' | 'opponent' };

/** Dice rolls, damage application, friendship tick, special interactions. */
export type ScenarioEvent =
    | { phase: 'scenario'; kind: 'attack-roll';
        actor: CombatActor; rawRoll: number; statValue: number; advantage: Advantage; rollModifier: number; total: number }
    | { phase: 'scenario'; kind: 'contest-outcome';
        playerTotal: number; enemyTotal: number; winner: CombatActor | 'tie' }
    | { phase: 'scenario'; kind: 'damage-roll';
        actor: CombatActor; rawRoll: number; statValue: number; advantage: Advantage; rollModifier: number; total: number }
    | { phase: 'scenario'; kind: 'damage-applied';
        attacker: CombatActor; defender: CombatActor;
        attackStance: Stance; defenseStance: Stance;
        attackStatValue: number; damageRoll: number; damageBonus: number;
        baseDefense: number; defenseMultiplier: number;
        finalDamage: number; hpBefore: number; hpAfter: number;
        defenderActed: boolean;
        /** Phase 32 — true when the attacker rolled nat 20. */
        isCritical?: boolean;
        /** Phase 32 — auto-selected crit style (`double` or `pierce`), present only on crits. */
        critStyle?: 'double' | 'pierce' }
    | { phase: 'scenario'; kind: 'thorns';
        attacker: CombatActor; thorns: number; hpBefore: number; hpAfter: number }
    | { phase: 'scenario'; kind: 'heart-buff-removed';
        attacker: CombatActor; defender: CombatActor; effect: Effect | null }
    | { phase: 'scenario'; kind: 'heart-buff-extended';
        attacker: CombatActor; effect: Effect | null }
    | { phase: 'scenario'; kind: 'both-defend';
        friendshipBefore: number; friendshipAfter: number }
    | { phase: 'scenario'; kind: 'proc-applied';
        actor: CombatActor;
        appliedTo: 'self' | 'opponent';
        effect: Effect;
        tier: EffectTier;
        decision: 'normal' | 'crit';
        result: EffectApplicationResult }
    | { phase: 'scenario'; kind: 'proc-fumbled';
        actor: CombatActor;
        effect: Effect;
        result: EffectApplicationResult };

/** End-phase DoT and ticked / expired effects. */
export type RoundEndEvent =
    | { phase: 'round-end'; kind: 'dot';     actor: CombatActor; amount: number }
    | { phase: 'round-end'; kind: 'expired'; actor: CombatActor; expired: ActiveEffect[] };

/**
 * Skill-execution and resource-economy events. Emitted when the player
 * picks `action: 'skill'` (Spec 04 — only player skills today; enemy skills
 * arrive in Spec 07) and after every basic-action contest that generates
 * stance tokens.
 */
export type SkillPhaseEvent =
    | { phase: 'skill'; kind: 'damage';
        skillId: string; target: 'self' | 'enemy';
        amount: number; hpBefore: number; hpAfter: number }
    | { phase: 'skill'; kind: 'heal';
        skillId: string; target: 'self' | 'enemy';
        amount: number; hpBefore: number; hpAfter: number }
    | { phase: 'skill'; kind: 'effect-applied';
        skillId: string; appliedTo: 'self' | 'enemy';
        effect: Effect; message: string }
    | { phase: 'skill'; kind: 'effect-resisted';
        skillId: string; appliedTo: 'self' | 'enemy';
        effect: Effect; message: string }
    | { phase: 'skill'; kind: 'effect-rebounded';
        skillId: string; effect: Effect; message: string }
    | { phase: 'skill'; kind: 'buff-stripped';
        skillId: string; target: 'self' | 'enemy';
        effect: Effect | null }
    | { phase: 'skill'; kind: 'buff-converted';
        skillId: string; effect: Effect | null; message: string }
    | { phase: 'skill'; kind: 'resources-spent';
        skillId: string; cost: ResourceCost }
    | { phase: 'skill'; kind: 'philosophical-generated';
        skillId: string; category: SkillCategory }
    /**
     * The player chose `action: 'skill'` but either the skill is missing
     * from the lookup or `canUseSkill` failed. The resolver does NOT execute
     * the skill, does NOT spend resources, and the round ends here for both
     * combatants (the player effectively whiffs their turn). UIs render this
     * as a "you can't afford that yet" message.
     */
    | { phase: 'skill'; kind: 'blocked';
        skillId: string;
        reason: 'insufficient-resources' | 'unknown-skill' | 'not-equipped' };

/** Stance-token generation from a player basic action (attack / defend). */
export type ResourceEvent =
    | { phase: 'resources'; kind: 'generated';
        stance: Stance; outcome: BasicActionOutcome;
        resources: CombatResources };

/**
 * Item-use events from a player picking `action: 'item'`. Per Spec 05 the
 * resolver:
 *   - applies the consumable's `healAmount` (immediate) and/or its
 *     `effectId` / `inlineEffect` payload through `applyEffect`;
 *   - folds the consumable's `resourceGrant` into `combatResources`
 *     (Spec 05b Q6 option A);
 *   - decrements the inventory stack via the existing inventory reducer;
 *   - lets the enemy's basic action still resolve at passive-defense, but
 *     the player neither attacks nor defends this round.
 *
 * `resourceGrant` is the delta the resolver added to `combatResources` for
 * the consumed item — included on the `used` event so UIs can show "+3 body"
 * style feedback. Always present (zeroed when the consumable did not grant
 * any tokens) for a stable UI contract.
 */
export type ItemPhaseEvent =
    | { phase: 'item'; kind: 'used';
        itemId: string; itemName: string;
        healed: number; hpBefore: number; hpAfter: number;
        appliedEffectId: string | null;
        resourceGrant: CombatResources }
    | { phase: 'item'; kind: 'blocked';
        itemId: string;
        reason: 'unknown-item' | 'not-consumable' | 'missing-item-id' };

/** Discriminated union of every event the resolver can emit, organised by phase. */
export type RoundEvent =
    | RoundStartEvent
    | ActionRestrictionEvent
    | AdvantageEvent
    | StanceEffectEvent
    | ScenarioEvent
    | SkillPhaseEvent
    | ResourceEvent
    | ItemPhaseEvent
    | RoundEndEvent;

/** Return value of `resolveCombatRound`. */
export interface RoundResolution {
    state: CombatState;
    combatEvents: RoundEvent[];
}

// ─── Full Round ───────────────────────────────────────────────────────────────

/**
 * Resolves one complete combat round and returns the next `CombatState` plus
 * the typed `combatEvents` stream UI consumers render against.
 *
 * Order of operations:
 *   1. `processRoundStartEffects` — regen → drain → start-phase DoT.
 *      If start-phase ticks drop a combatant to 0 HP, the round ends here.
 *   2. `canAct` — resolve forcedStance / blockedStances / skipTurn (Q7).
 *   3. `resolveEffectiveAdvantage` — fold effect grants/denies into the matchup.
 *   4. Clear stale Tier 1 stance buffs and apply new ones (only for combatants
 *      that can act).
 *   5. Resolve the player's chosen path:
 *        - `'skill'`  → routes through `executeSkill` (Spec 04). Enemy's
 *          basic action still resolves (passive defence / no retaliation).
 *        - otherwise → attack / defend scenario. A skipped combatant takes
 *          hits at the passive multiplier and never retaliates.
 *      Player basic actions also generate stance tokens into `combatResources`.
 *   6. `processRoundEndEffects` — end-phase DoT → tick & expire.
 *   7. Increment the round counter.
 *
 * @param skillLookup - Resolves a `skillId` to a Skill definition. Required
 *   when the player chooses `action: 'skill'`; otherwise unused.
 */
export function resolveCombatRound(
    state: CombatState,
    playerAction: CombatAction,
    enemyAction: CombatAction,
    skillLookup?: SkillLookup,
): RoundResolution {
    const events: RoundEvent[] = [];

    // 1. Round-start orchestration.
    const roundStart = runRoundStartPhase(state.player, state.enemy, events);
    let player = roundStart.player;
    let enemy  = roundStart.enemy;
    if (roundStart.lethal) {
        return {
            state: { ...state, player, enemy, round: state.round + 1 },
            combatEvents: events,
        };
    }

    // 2. Action restriction resolution.
    const restriction = runActionRestrictionPhase(player, enemy, playerAction, enemyAction, events);
    const { playerStance, enemyStance, playerActionFinal, enemyActionFinal, playerCanAct, enemyCanAct } = restriction;

    // 3. Advantage with effect overrides.
    const { playerAdvantage, enemyAdvantage } = runAdvantagePhase(
        player, enemy, playerStance, enemyStance,
        playerActionFinal, enemyActionFinal, events,
    );

    // 4. Clear stale Tier 1 stance buffs and apply new ones for active combatants.
    ({ player, enemy } = runStanceEffectsPhase(
        player, enemy, playerStance, enemyStance,
        playerActionFinal, enemyActionFinal,
        playerCanAct, enemyCanAct,
        state.round, state.enemy.tier1Overrides,
        events,
    ));

    // 5. Scenario resolution.
    const scenario = runScenarioPhase(
        state, player, enemy, playerStance, enemyStance,
        playerAction, enemyAction, playerActionFinal, enemyActionFinal,
        playerAdvantage, enemyAdvantage,
        state.combatResources, state.friendshipCounter,
        state.round, skillLookup,
        events,
    );
    player = scenario.player;
    enemy  = scenario.enemy;
    const combatResources = scenario.combatResources;
    const friendshipCounter = scenario.friendshipCounter;

    // 6. Round-end orchestration.
    ({ player, enemy } = runRoundEndPhase(player, enemy, events));

    const newCombat = {
        ...state,
        player, enemy, friendshipCounter, combatResources,
        round: state.round + 1,
    };

    // Debug state dump when COMBAT_DEBUG=1
    if (process.env.COMBAT_DEBUG === '1') {
        const dump = dumpEffectState(newCombat, newCombat.round, getRng().getState());
        console.log('EFFECT_DUMP:', JSON.stringify(dump));
    }

    return {
        state: newCombat,
        combatEvents: events,
    };
}
