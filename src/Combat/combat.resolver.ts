/**
 * Combat round resolver — pure, deterministic round resolution.
 *
 * `resolveCombatRound` is the single entry point any client (CLI, future React
 * Native UI, the automated tester) calls to advance combat by one round. It
 * returns the next `CombatState` plus a typed `combatEvents` stream the UI
 * consumes for rendering. The resolver itself never logs.
 *
 * Events are organised by combat phase (Q6) so a UI can render them in fixed
 * sections:
 *   `round-start`        — regen / drain / start-phase DoT.
 *   `action-restriction` — forced-stance / blocked / skipTurn outcomes.
 *   `advantage`          — declared actions + per-side advantage labels.
 *   `stance-effects`     — Tier 1 stance buffs cleared and applied.
 *   `scenario`           — attack contests, damage rolls, applied damage,
 *                          thorns, heart specials, both-defending tick.
 *   `round-end`          — end-phase DoT and effect expiry.
 *
 * Determinism: all rolls — dice in `createDieRoll`, buff selectors in
 * `effects.ts`, the resist pipeline — go through the seedable `getRng()`
 * singleton (Spec 11). Tests install a `Math.random`-backed RNG via the
 * helpers in `src/test-utils/rng.ts` (`mockSequentialRng` / `mockFixedRng` /
 * `mockAlternatingRng`).
 */

import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { ActiveEffect, Effect, EffectApplicationResult, EffectTier } from '../Effects/types';
import { applyTier1CombatEffect, clearTier1EffectsForStance } from '../Effects';
import { lookupEffect } from '../Effects/effects.library';
import { createDieRoll } from '../Utils';
import {
    rollForCombatEffects,
    applyProcOutcome,
    applyFumbleOutcome,
} from './combat-effects';
import {
    DEFENSE_MULTIPLIERS,
    PASSIVE_DEFENSE_MULTIPLIER,
} from '../Game/game-mechanics.constants';
import { CombatAction, CombatState, Stance, Action, Advantage } from './types';
import {
    BasicActionOutcome, SkillEvent, SkillLookup,
    canUseSkill, executeSkill, generateBasicActionResources,
} from '../Skills/skill.engine';
import { CombatResources, ResourceCost, SkillCategory } from '../Skills/types';
import { Consumable } from '../Items/types';
import { isConsumable } from '../Items/types';
import { getEquipmentProcTriggers, useConsumableEffect } from '../Items/equipment.engine';
import { useConsumable as useInventoryConsumable } from '../Items/item.reducer';
import { lookupEffect as lookupEffectById } from '../Effects/effects.library';
import { dumpEffectState } from './debug';
import { getRng } from '../Utils/rng';
import {
    determineAdvantage,
    resolveEffectiveAdvantage,
} from './advantage';
import {
    getAttackStat,
    getBaseStat,
    getDefenseStat,
} from './stats';
import { getEffectiveStats } from './effect-modifiers';
import { calculateFinalDamage } from './damage';
import { applyDamage } from './health';
import {
    getActiveRollModifier,
    getStudyMarkIntensity,
    getThornsReflect,
    removeRandomBuff,
    extendRandomBuffDuration,
    processRoundEndEffects,
} from './effects';
import { runRoundStartPhase } from './phases/round-start';
import { canAct } from './effect-modifiers';

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
        defenderActed: boolean }
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

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Defense value for a combatant who did NOT pick `defend` this round: their
 * stance's base stat plus the stance-agnostic flat `defenseDelta` from active
 * effects (`buff_barrier`, `buff_invincibility`, ...). Symmetric for both
 * player and enemy.
 */
function passiveDefense(combatant: Character | Enemy, stance: Stance): number {
    return getBaseStat(combatant, stance) + getEffectiveStats(combatant).defenseDelta;
}

/**
 * Defense value for a combatant who DID pick `defend` this round: their
 * derived defense stat (already includes `defenseDelta`). Per Q3, both player
 * and enemy now run through `getDefenseStat` here — earlier code routed the
 * player through `getBaseStat + defenseDelta` while the enemy used derived,
 * which broke symmetric balancing.
 */
function activeDefense(combatant: Character | Enemy, stance: Stance): number {
    return getDefenseStat(combatant, stance);
}

/**
 * Execution context bundling combatants + their event-stream identity for the
 * scenario resolvers, so the math stays symmetric between players and enemies.
 */
interface SideContext {
    actor: CombatActor;
    combatant: Character | Enemy;
    stance: Stance;
    advantage: Advantage;
}

// ─── Scenario Resolvers ───────────────────────────────────────────────────────

/**
 * Both combatants attack. Higher total (roll + stat + roll-mod) deals damage at
 * `PASSIVE_DEFENSE_MULTIPLIER`. Ties produce no damage on either side.
 *
 * Also used for the "skip vs attack" paths so a skipped combatant still takes
 * a passive-defense hit while never retaliating.
 */
export function resolveAttackVsAttack(
    player: Character,
    enemy: Enemy,
    playerType: Stance,
    enemyType: Stance,
    playerAdv: Advantage,
    enemyAdv: Advantage,
    events: RoundEvent[],
    round = 0,
): { player: Character; enemy: Enemy } {
    const playerDieRoll = createDieRoll(playerAdv);
    const enemyDieRoll  = createDieRoll(enemyAdv);

    const pRollMod  = getActiveRollModifier(player);
    const pBaseStat = getAttackStat(player, playerType);
    const pMod      = pBaseStat + pRollMod;
    const playerRaw = playerDieRoll();
    const playerTotal = playerRaw + pMod;

    const eRollMod  = getActiveRollModifier(enemy);
    const eBaseStat = getAttackStat(enemy, enemyType);
    const eMod      = eBaseStat + eRollMod;
    const enemyRaw  = enemyDieRoll();
    const enemyTotal = enemyRaw + eMod;

    events.push({
        phase: 'scenario', kind: 'attack-roll', actor: 'player',
        rawRoll: playerRaw, statValue: pBaseStat, advantage: playerAdv,
        rollModifier: pRollMod, total: playerTotal,
    });
    events.push({
        phase: 'scenario', kind: 'attack-roll', actor: 'enemy',
        rawRoll: enemyRaw, statValue: eBaseStat, advantage: enemyAdv,
        rollModifier: eRollMod, total: enemyTotal,
    });
    events.push({
        phase: 'scenario', kind: 'contest-outcome',
        playerTotal, enemyTotal,
        winner: playerTotal > enemyTotal ? 'player'
              : enemyTotal  > playerTotal ? 'enemy'
              : 'tie',
    });

    if (playerTotal > enemyTotal) {
        return resolveAttackHit(
            { actor: 'player', combatant: player, stance: playerType, advantage: playerAdv },
            { actor: 'enemy',  combatant: enemy,  stance: enemyType,  advantage: enemyAdv },
            playerDieRoll, pBaseStat, pMod, pRollMod,
            passiveDefense(enemy, enemyType), PASSIVE_DEFENSE_MULTIPLIER,
            true /* defenderIsPassive */, events, playerRaw, round,
        ) as { player: Character; enemy: Enemy };
    }

    if (enemyTotal > playerTotal) {
        return resolveAttackHit(
            { actor: 'enemy',  combatant: enemy,  stance: enemyType,  advantage: enemyAdv },
            { actor: 'player', combatant: player, stance: playerType, advantage: playerAdv },
            enemyDieRoll, eBaseStat, eMod, eRollMod,
            passiveDefense(player, playerType), PASSIVE_DEFENSE_MULTIPLIER,
            true, events, enemyRaw, round,
        ) as { player: Character; enemy: Enemy };
    }

    return { player, enemy };
}

/** Player attacks into a defending enemy. Enemy's defense multiplier is applied. */
export function resolvePlayerAttackEnemyDefend(
    player: Character,
    enemy: Enemy,
    playerType: Stance,
    enemyType: Stance,
    playerAdv: Advantage,
    enemyAdv: Advantage,
    events: RoundEvent[],
    round = 0,
): { player: Character; enemy: Enemy } {
    const playerDieRoll = createDieRoll(playerAdv);
    const pRollMod  = getActiveRollModifier(player);
    const pBaseStat = getAttackStat(player, playerType);
    const attackMod = pBaseStat + pRollMod;
    const attackRaw = playerDieRoll();

    events.push({
        phase: 'scenario', kind: 'attack-roll', actor: 'player',
        rawRoll: attackRaw, statValue: pBaseStat, advantage: playerAdv,
        rollModifier: pRollMod, total: attackRaw + attackMod,
    });

    return resolveAttackHit(
        { actor: 'player', combatant: player, stance: playerType, advantage: playerAdv },
        { actor: 'enemy',  combatant: enemy,  stance: enemyType,  advantage: enemyAdv },
        playerDieRoll, pBaseStat, attackMod, pRollMod,
        activeDefense(enemy, enemyType), DEFENSE_MULTIPLIERS[enemyAdv],
        false /* defender chose defend */, events, attackRaw, round,
    ) as { player: Character; enemy: Enemy };
}

/** Enemy attacks into a defending player. Player's defense multiplier is applied. */
export function resolvePlayerDefendEnemyAttack(
    player: Character,
    enemy: Enemy,
    playerType: Stance,
    enemyType: Stance,
    playerAdv: Advantage,
    enemyAdv: Advantage,
    events: RoundEvent[],
    round = 0,
): { player: Character; enemy: Enemy } {
    const enemyDieRoll = createDieRoll(enemyAdv);
    const eRollMod  = getActiveRollModifier(enemy);
    const eBaseStat = getAttackStat(enemy, enemyType);
    const attackMod = eBaseStat + eRollMod;
    const attackRaw = enemyDieRoll();

    events.push({
        phase: 'scenario', kind: 'attack-roll', actor: 'enemy',
        rawRoll: attackRaw, statValue: eBaseStat, advantage: enemyAdv,
        rollModifier: eRollMod, total: attackRaw + attackMod,
    });

    return resolveAttackHit(
        { actor: 'enemy',  combatant: enemy,  stance: enemyType,  advantage: enemyAdv },
        { actor: 'player', combatant: player, stance: playerType, advantage: playerAdv },
        enemyDieRoll, eBaseStat, attackMod, eRollMod,
        activeDefense(player, playerType), DEFENSE_MULTIPLIERS[playerAdv],
        false, events, attackRaw, round,
    ) as { player: Character; enemy: Enemy };
}

/**
 * Shared damage path: rolls the damage die, calculates final damage against
 * `baseDefense × multiplier`, applies it, then runs the heart-attack and
 * thorns side effects. Returns `{ player, enemy }` regardless of which side
 * attacked. The defense base is precomputed by the caller so passive
 * (`getBaseStat + defenseDelta`) and active (`getDefenseStat`) defense paths
 * stay distinguished.
 */
function resolveAttackHit(
    attacker: SideContext,
    defender: SideContext,
    rng: () => number,
    statValue: number,
    rollPlusStatMod: number,
    rollModifier: number,
    baseDefense: number,
    defenseMultiplier: number,
    defenderIsPassive: boolean,
    events: RoundEvent[],
    rawAttackRoll: number,
    round: number,
): { player: Character; enemy: Enemy } {
    const damageRaw  = rng();
    const damageRoll = damageRaw + rollPlusStatMod;
    const studyBonus = attacker.stance === 'mind' ? getStudyMarkIntensity(defender.combatant) : 0;
    const finalDamage = calculateFinalDamage(damageRoll, baseDefense * defenseMultiplier, false, studyBonus);

    events.push({
        phase: 'scenario', kind: 'damage-roll', actor: attacker.actor,
        rawRoll: damageRaw, statValue, advantage: attacker.advantage,
        rollModifier, total: damageRoll,
    });

    const hpBefore = defender.combatant.health;
    const damaged  = applyDamage(defender.combatant, finalDamage);
    let updatedAttacker = attacker.combatant;
    let updatedDefender: Character | Enemy = damaged;

    events.push({
        phase: 'scenario', kind: 'damage-applied',
        attacker: attacker.actor, defender: defender.actor,
        attackStance: attacker.stance, defenseStance: defender.stance,
        attackStatValue: rollPlusStatMod, damageRoll, damageBonus: studyBonus,
        baseDefense, defenseMultiplier,
        finalDamage, hpBefore, hpAfter: updatedDefender.health,
        defenderActed: !defenderIsPassive,
    });

    // Heart/attack specials — strip a buff from the defender, extend a buff on the attacker.
    if (attacker.stance === 'heart') {
        const buffResult = removeRandomBuff(updatedDefender);
        updatedDefender = buffResult.target;
        const extResult = extendRandomBuffDuration(updatedAttacker, 1);
        updatedAttacker = extResult.target;

        if (buffResult.removed) {
            events.push({
                phase: 'scenario', kind: 'heart-buff-removed',
                attacker: attacker.actor, defender: defender.actor,
                effect: lookupEffect(buffResult.removed.effectId) ?? null,
            });
        }
        if (extResult.extended) {
            events.push({
                phase: 'scenario', kind: 'heart-buff-extended',
                attacker: attacker.actor,
                effect: lookupEffect(extResult.extended.effectId) ?? null,
            });
        }
    }

    // Thorns reflect — defender's reflect damage hits the attacker post-strike.
    const thorns = getThornsReflect(updatedDefender);
    if (thorns > 0) {
        const thornsHpBefore = updatedAttacker.health;
        updatedAttacker = applyDamage(updatedAttacker, thorns);
        events.push({
            phase: 'scenario', kind: 'thorns',
            attacker: attacker.actor, thorns,
            hpBefore: thornsHpBefore, hpAfter: updatedAttacker.health,
        });
    }

    // Spec 03 — Tier 2 / Tier 3 effect procs.
    //   • Attacker rolls their `attack` table on every successful hit.
    //   • Defender (when they actively defended) rolls their `defend` table.
    // Crit / fumble are driven by the attacker's d20; the defender has no roll
    // of their own, so we pass a neutral `rawAttackRoll = 10` to skip both.
    const attackerProcs = runActionProcs({
        actorRole:    attacker.actor,
        actorStance:  attacker.stance,
        action:       'attack',
        actor:        updatedAttacker,
        opponent:     updatedDefender,
        rawAttackRoll,
        round,
        events,
    });
    updatedAttacker = attackerProcs.actor;
    updatedDefender = attackerProcs.opponent;

    if (!defenderIsPassive) {
        const defenderProcs = runActionProcs({
            actorRole:    defender.actor,
            actorStance:  defender.stance,
            action:       'defend',
            actor:        updatedDefender,
            opponent:     updatedAttacker,
            rawAttackRoll: 10,
            round,
            events,
        });
        updatedDefender = defenderProcs.actor;
        updatedAttacker = defenderProcs.opponent;
    }

    return attacker.actor === 'player'
        ? { player: updatedAttacker as Character, enemy: updatedDefender as Enemy }
        : { player: updatedDefender as Character, enemy: updatedAttacker as Enemy };
}

interface RunProcsParams {
    actorRole: CombatActor;
    actorStance: Stance;
    action: 'attack' | 'defend';
    actor: Character | Enemy;
    opponent: Character | Enemy;
    rawAttackRoll: number;
    round: number;
    events: RoundEvent[];
}

/**
 * Pulls the actor's equipment-provided proc triggers for the given action.
 * Today only `Character`s carry `equipment` (enemies pre-Spec 07 don't), so
 * Enemy actors always yield an empty list.
 */
function equipmentTriggersFor(
    actor: Character | Enemy,
    action: 'attack' | 'defend',
): ReturnType<typeof getEquipmentProcTriggers> {
    const equipment = (actor as Character).equipment;
    if (!equipment) return [];
    return getEquipmentProcTriggers(equipment, action);
}

/**
 * Rolls Spec 03 procs for a single actor and applies them via the staged
 * `applyProcOutcome` / `applyFumbleOutcome` helpers. Emits one
 * `proc-applied` event per landed proc (success OR resist — the resolver
 * result encodes the outcome) and one `proc-fumbled` event when the actor
 * fumbled their attack roll.
 */
function runActionProcs(p: RunProcsParams): {
    actor: Character | Enemy;
    opponent: Character | Enemy;
} {
    const unlocks   = (p.actor as Character).procUnlocks
                   ?? (p.actor as Enemy).procUnlocks;
    const overrides = (p.actor as Enemy).procOverrides;

    const { procs, fumble } = rollForCombatEffects({
        actor:       p.actor,
        stance:      p.actorStance,
        action:      p.action,
        rawAttackRoll: p.rawAttackRoll,
        unlocks,
        overrides,
        equipmentTriggers: equipmentTriggersFor(p.actor, p.action),
    });

    let actor    = p.actor;
    let opponent = p.opponent;

    if (fumble) {
        const { actorEffects, result } = applyFumbleOutcome(fumble, actor.effects, p.round);
        actor = { ...actor, effects: actorEffects } as typeof actor;
        p.events.push({
            phase: 'scenario', kind: 'proc-fumbled',
            actor: p.actorRole,
            effect: fumble.effect,
            result,
        });
    }

    for (const outcome of procs) {
        const attackerHeartBonus = actor.baseStats.heart;
        const applied = applyProcOutcome(
            outcome,
            actor, actor.effects,
            opponent, opponent.effects,
            p.round,
            attackerHeartBonus,
        );
        actor    = { ...actor,    effects: applied.actorEffects    } as typeof actor;
        opponent = { ...opponent, effects: applied.opponentEffects } as typeof opponent;

        p.events.push({
            phase: 'scenario', kind: 'proc-applied',
            actor: p.actorRole,
            appliedTo: applied.appliedTo,
            effect: outcome.effect,
            tier: outcome.effect.tier,
            decision: outcome.decision === 'skipped' ? 'normal' : outcome.decision,
            result: applied.result,
        });
    }

    return { actor, opponent };
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
    const playerCan = canAct(player.effects, playerAction.stance);
    const enemyCan  = canAct(enemy.effects,  enemyAction.stance);
    const playerStance = playerCan.resolvedStance ?? playerAction.stance;
    const enemyStance  = enemyCan.resolvedStance  ?? enemyAction.stance;
    const playerActionFinal: Action | 'skip' = playerCan.canAct ? playerAction.action : 'skip';
    const enemyActionFinal:  Action | 'skip' = enemyCan.canAct  ? enemyAction.action  : 'skip';

    if (playerCan.resolvedStance && playerCan.resolvedStance !== playerAction.stance) {
        events.push({
            phase: 'action-restriction', kind: 'forced-stance', actor: 'player',
            requested: playerAction.stance, forced: playerCan.resolvedStance,
        });
    }
    if (enemyCan.resolvedStance && enemyCan.resolvedStance !== enemyAction.stance) {
        events.push({
            phase: 'action-restriction', kind: 'forced-stance', actor: 'enemy',
            requested: enemyAction.stance, forced: enemyCan.resolvedStance,
        });
    }
    if (!playerCan.canAct) {
        events.push({
            phase: 'action-restriction', kind: 'turn-skipped', actor: 'player',
            reason: playerCan.reason as 'skipTurn' | 'blockedStance' | null,
        });
    }
    if (!enemyCan.canAct) {
        events.push({
            phase: 'action-restriction', kind: 'turn-skipped', actor: 'enemy',
            reason: enemyCan.reason as 'skipTurn' | 'blockedStance' | null,
        });
    }

    // 3. Advantage with effect overrides.
    const playerAdvantage = resolveEffectiveAdvantage(
        determineAdvantage(playerStance, enemyStance), player.effects, playerStance,
    );
    const enemyAdvantage = resolveEffectiveAdvantage(
        determineAdvantage(enemyStance, playerStance), enemy.effects, enemyStance,
    );

    events.push({
        phase: 'advantage', kind: 'actions',
        playerStance, playerAction: playerActionFinal,
        enemyStance,  enemyAction:  enemyActionFinal,
    });
    events.push({
        phase: 'advantage', kind: 'matchup',
        playerStance, enemyStance,
        playerAdvantage, enemyAdvantage,
    });

    // 4. Clear stale Tier 1 stance buffs and apply new ones for active combatants.
    const playerClear = clearTier1EffectsForStance(player.effects, playerStance);
    player = { ...player, effects: playerClear.activeEffects };
    if (playerClear.cleared.length > 0) {
        events.push({
            phase: 'stance-effects', kind: 'cleared', actor: 'player',
            cleared: playerClear.cleared, newStance: playerStance,
        });
    }

    const enemyClear = clearTier1EffectsForStance(enemy.effects, enemyStance);
    enemy = { ...enemy, effects: enemyClear.activeEffects };
    if (enemyClear.cleared.length > 0) {
        events.push({
            phase: 'stance-effects', kind: 'cleared', actor: 'enemy',
            cleared: enemyClear.cleared, newStance: enemyStance,
        });
    }

    if (playerCan.canAct && (playerActionFinal === 'attack' || playerActionFinal === 'defend')) {
        const t1 = applyTier1CombatEffect(
            player.effects, enemy.effects,
            { stance: playerStance, action: playerActionFinal }, state.round,
        );
        player = { ...player, effects: t1.actorEffects };
        enemy  = { ...enemy,  effects: t1.opponentEffects };
        if (t1.effect && t1.message && t1.appliedTo) {
            events.push({
                phase: 'stance-effects', kind: 'applied', actor: 'player',
                effect: t1.effect, message: t1.message, appliedTo: t1.appliedTo,
            });
        }
    }
    if (enemyCan.canAct && (enemyActionFinal === 'attack' || enemyActionFinal === 'defend')) {
        const t1 = applyTier1CombatEffect(
            enemy.effects, player.effects,
            { stance: enemyStance, action: enemyActionFinal }, state.round,
            state.enemy.tier1Overrides,
        );
        enemy  = { ...enemy,  effects: t1.actorEffects };
        player = { ...player, effects: t1.opponentEffects };
        if (t1.effect && t1.message && t1.appliedTo) {
            events.push({
                phase: 'stance-effects', kind: 'applied', actor: 'enemy',
                effect: t1.effect, message: t1.message, appliedTo: t1.appliedTo,
            });
        }
    }

    // 5. Scenario resolution.
    let friendshipCounter = state.friendshipCounter;
    let combatResources = state.combatResources;

    // 5a. Player picked `skill` → validate, then run the skill engine. If the
    // skill is unknown, not equipped, or unaffordable, emit a `skill-blocked`
    // event, leave `combatResources` / HP untouched, and short-circuit the
    // rest of the scenario phase: the player whiffs their turn and no basic
    // exchange resolves. Round-start / round-end effects still tick.
    let skillBlocked = false;
    if (playerActionFinal === 'skill') {
        if (!playerAction.skillId) {
            throw new Error("playerAction.action === 'skill' requires a skillId.");
        }
        if (!skillLookup) {
            throw new Error("Player chose a skill, but no skillLookup was supplied to resolveCombatRound.");
        }

        const skillId = playerAction.skillId;
        const skill   = skillLookup(skillId);

        if (!skill) {
            events.push({ phase: 'skill', kind: 'blocked', skillId, reason: 'unknown-skill' });
            skillBlocked = true;
        } else if (!player.equippedSkills.includes(skillId)) {
            events.push({ phase: 'skill', kind: 'blocked', skillId, reason: 'not-equipped' });
            skillBlocked = true;
        } else if (!canUseSkill(combatResources, skill)) {
            events.push({ phase: 'skill', kind: 'blocked', skillId, reason: 'insufficient-resources' });
            skillBlocked = true;
        } else {
            const skillState: CombatState = {
                ...state, player, enemy, combatResources,
            };
            const resolution = executeSkill(skillState, skillId, skillLookup);
            player = resolution.state.player;
            enemy  = resolution.state.enemy;
            combatResources = resolution.state.combatResources;
            for (const ev of resolution.events) events.push(toRoundEvent(ev));
        }
    }

    // 5b. Player picked `item` → look up the consumable, apply its payload
    // to the player, and decrement the stack. The player neither attacks nor
    // defends this round; the enemy still resolves their basic action against
    // a passive-defense player. The shape of the item action is:
    //   action: 'item', itemId: <id of consumable in player.inventory>
    // Missing or invalid IDs emit an `item-blocked` event and the player
    // whiffs their turn (no inventory change, enemy still acts).
    if (playerActionFinal === 'item') {
        const itemId = playerAction.itemId;
        if (!itemId) {
            events.push({ phase: 'item', kind: 'blocked', itemId: '', reason: 'missing-item-id' });
        } else {
            const item = player.inventory.find(i => i.id === itemId);
            if (!item) {
                events.push({ phase: 'item', kind: 'blocked', itemId, reason: 'unknown-item' });
            } else if (!isConsumable(item)) {
                events.push({ phase: 'item', kind: 'blocked', itemId, reason: 'not-consumable' });
            } else {
                const consumable: Consumable = item;
                const hpBefore = player.health;
                const useResult = useConsumableEffect(
                    player, consumable, state.round, lookupEffectById,
                );
                const nextInventory = useInventoryConsumable(useResult.player.inventory, itemId);
                player = { ...useResult.player, inventory: nextInventory };
                // Spec 05b Q6 — fold the consumable's resourceGrant into
                // combatResources. Empty grants are zero-sum so the call is
                // safe to make unconditionally.
                combatResources = {
                    heart:   combatResources.heart   + useResult.resourceGrant.heart,
                    body:    combatResources.body    + useResult.resourceGrant.body,
                    mind:    combatResources.mind    + useResult.resourceGrant.mind,
                    fallacy: combatResources.fallacy + useResult.resourceGrant.fallacy,
                    paradox: combatResources.paradox + useResult.resourceGrant.paradox,
                };
                events.push({
                    phase: 'item', kind: 'used',
                    itemId, itemName: consumable.name,
                    healed: useResult.healed,
                    hpBefore, hpAfter: player.health,
                    appliedEffectId: useResult.applied?.id ?? null,
                    resourceGrant: useResult.resourceGrant,
                });
            }
        }
    }

    const playerBasicAttacked = !skillBlocked && playerActionFinal === 'attack';
    const playerBasicDefended = !skillBlocked && playerActionFinal === 'defend';

    if (playerBasicAttacked && enemyActionFinal === 'attack') {
        ({ player, enemy } = resolveAttackVsAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage, events, state.round,
        ));
    } else if (playerBasicAttacked && enemyActionFinal === 'defend') {
        ({ player, enemy } = resolvePlayerAttackEnemyDefend(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage, events, state.round,
        ));
    } else if (playerActionFinal === 'defend' && enemyActionFinal === 'attack') {
        ({ player, enemy } = resolvePlayerDefendEnemyAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage, events, state.round,
        ));
    } else if (playerBasicAttacked && enemyActionFinal === 'skip') {
        ({ player, enemy } = resolveAttackVsAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage, events, state.round,
        ));
    } else if (enemyActionFinal === 'attack' && playerActionFinal === 'skip') {
        ({ player, enemy } = resolveAttackVsAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage, events, state.round,
        ));
    } else if (enemyActionFinal === 'attack' && playerActionFinal === 'item') {
        // Player used an item this round and the enemy attacked — the enemy
        // strikes the player at passive defense. The player neither attacks
        // back nor defends actively. Mirrors the skip-vs-attack branch.
        ({ player, enemy } = resolveAttackVsAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage, events, state.round,
        ));
    } else if (playerActionFinal === 'defend' && enemyActionFinal === 'defend') {
        const before = friendshipCounter;
        friendshipCounter = before + 1;
        events.push({
            phase: 'scenario', kind: 'both-defend',
            friendshipBefore: before, friendshipAfter: friendshipCounter,
        });
    }
    // Else: skip-vs-skip, skip-vs-defend, defend-vs-skip, skill-vs-* (skill
    // already handled above) — no basic-action exchange.

    // Stance-token generation for the player's basic action this round.
    // Equipment `generationBonus` entries from the player's currently
    // equipped items are folded on top of the base generation table
    // (Spec 05 Q10 / step 6).
    if (playerBasicAttacked) {
        const outcome: BasicActionOutcome = playerWonAttackContest(events) ? 'hit' : 'miss';
        combatResources = generateBasicActionResources(
            combatResources, playerStance, outcome, player.equipment,
        );
        events.push({
            phase: 'resources', kind: 'generated',
            stance: playerStance, outcome, resources: combatResources,
        });
    } else if (playerBasicDefended) {
        combatResources = generateBasicActionResources(
            combatResources, playerStance, 'defend', player.equipment,
        );
        events.push({
            phase: 'resources', kind: 'generated',
            stance: playerStance, outcome: 'defend', resources: combatResources,
        });
    }

    // 6. Round-end orchestration.
    const pEnd = processRoundEndEffects(player);
    player = pEnd.target;
    if (pEnd.dotDamage   > 0)   events.push({ phase: 'round-end', kind: 'dot',     actor: 'player', amount: pEnd.dotDamage });
    if (pEnd.expired.length > 0) events.push({ phase: 'round-end', kind: 'expired', actor: 'player', expired: pEnd.expired });

    const eEnd = processRoundEndEffects(enemy);
    enemy = eEnd.target;
    if (eEnd.dotDamage   > 0)   events.push({ phase: 'round-end', kind: 'dot',     actor: 'enemy',  amount: eEnd.dotDamage });
    if (eEnd.expired.length > 0) events.push({ phase: 'round-end', kind: 'expired', actor: 'enemy',  expired: eEnd.expired });

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

/**
 * Did the player win this round's attack contest? Drives whether the player's
 * stance token generation uses the hit (+3) or miss (+1) amount. Skim the
 * just-emitted scenario events:
 *   - explicit `contest-outcome` (attack-vs-attack) → look at winner.
 *   - `damage-applied` with `attacker: 'player'` → counts as hit.
 *   - otherwise no damage was dealt → miss.
 */
function playerWonAttackContest(events: RoundEvent[]): boolean {
    for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i];
        if (ev.phase !== 'scenario') continue;
        if (ev.kind === 'contest-outcome') return ev.winner === 'player';
        if (ev.kind === 'damage-applied' && ev.attacker === 'player') return true;
    }
    return false;
}

/** Translates a `SkillEvent` from the skill engine into the resolver's `RoundEvent` union. */
function toRoundEvent(ev: SkillEvent): SkillPhaseEvent {
    switch (ev.kind) {
        case 'damage':
            return { phase: 'skill', kind: 'damage', skillId: ev.skillId, target: ev.target,
                     amount: ev.amount, hpBefore: ev.hpBefore, hpAfter: ev.hpAfter };
        case 'heal':
            return { phase: 'skill', kind: 'heal', skillId: ev.skillId, target: ev.target,
                     amount: ev.amount, hpBefore: ev.hpBefore, hpAfter: ev.hpAfter };
        case 'effect-applied':
            return { phase: 'skill', kind: 'effect-applied', skillId: ev.skillId,
                     appliedTo: ev.appliedTo, effect: ev.effect, message: ev.message };
        case 'effect-resisted':
            return { phase: 'skill', kind: 'effect-resisted', skillId: ev.skillId,
                     appliedTo: ev.appliedTo, effect: ev.effect, message: ev.message };
        case 'effect-rebounded':
            return { phase: 'skill', kind: 'effect-rebounded', skillId: ev.skillId,
                     effect: ev.effect, message: ev.message };
        case 'buff-stripped':
            return { phase: 'skill', kind: 'buff-stripped', skillId: ev.skillId,
                     target: ev.target, effect: ev.effect };
        case 'buff-converted':
            return { phase: 'skill', kind: 'buff-converted', skillId: ev.skillId,
                     effect: ev.effect, message: ev.message };
        case 'resources-spent':
            return { phase: 'skill', kind: 'resources-spent', skillId: ev.skillId, cost: ev.cost };
        case 'philosophical-generated':
            return { phase: 'skill', kind: 'philosophical-generated',
                     skillId: ev.skillId, category: ev.category };
    }
}
