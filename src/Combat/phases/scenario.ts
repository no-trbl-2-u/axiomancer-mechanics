/**
 * Scenario phase — fifth sub-phase of `resolveCombatRound` and the
 * largest one.
 *
 * Handles the player's chosen action path:
 *   - `skill`  → validate (known / equipped / affordable) and route
 *                through `executeSkill`; the enemy still resolves their
 *                basic action against a passive-defense player.
 *   - `item`   → look up the consumable, apply its payload, decrement
 *                the inventory stack; the player neither attacks nor
 *                defends this round.
 *   - `attack` / `defend` / `skip` → resolve the basic-action matchup
 *                against the enemy via `resolveAttackVsAttack` /
 *                `resolvePlayerAttackEnemyDefend` /
 *                `resolvePlayerDefendEnemyAttack`. Both-defend ticks the
 *                friendship counter.
 *
 * Stance-token generation (`generateBasicActionResources`) folds into
 * this phase: any basic attack/defend the player performs feeds back
 * into `combatResources` and emits a `resources:generated` event.
 *
 * All helpers that previously lived in `combat.resolver.ts` for the
 * scenario phase (`passiveDefense`, `activeDefense`, the three
 * `resolveAttack*` paths, `resolveAttackHit`, `runActionProcs`,
 * `equipmentTriggersFor`, `playerWonAttackContest`, `toRoundEvent`)
 * are colocated here as internal helpers.
 */

import { Character } from '../../Character/types';
import { Enemy } from '../../Enemy/types';
import { lookupEffect } from '../../Effects/effects.library';
import { createDieRoll } from '../../Utils';
import {
    rollForCombatEffects,
    applyProcOutcome,
    applyFumbleOutcome,
} from '../combat-effects';
import {
    DEFENSE_MULTIPLIERS,
    PASSIVE_DEFENSE_MULTIPLIER,
} from '../../Game/game-mechanics.constants';
import type { CombatAction, CombatState, Stance, Action, Advantage } from '../types';
import {
    BasicActionOutcome, SkillEvent, SkillLookup,
    canUseSkill, executeSkill, generateBasicActionResources,
} from '../../Skills/skill.engine';
import { CombatResources } from '../../Skills/types';
import { Consumable } from '../../Items/types';
import { isConsumable } from '../../Items/types';
import { getEquipmentProcTriggers, useConsumableEffect } from '../../Items/equipment.engine';
import { useConsumable as useInventoryConsumable } from '../../Items/item.reducer';
import { lookupEffect as lookupEffectById } from '../../Effects/effects.library';
import {
    getAttackStat,
    getBaseStat,
    getDefenseStat,
} from '../stats';
import { getEffectiveStats } from '../effect-modifiers';
import { calculateFinalDamage } from '../damage';
import { applyDamage } from '../health';
import {
    getActiveRollModifier,
    getStudyMarkIntensity,
    getThornsReflect,
    removeRandomBuff,
    extendRandomBuffDuration,
} from '../effects';
import type {
    CombatActor, RoundEvent, SkillPhaseEvent,
} from '../combat.resolver';

export interface ScenarioPhaseResult {
    player: Character;
    enemy: Enemy;
    combatResources: CombatResources;
    friendshipCounter: number;
}

export function runScenarioPhase(
    state: CombatState,
    playerIn: Character,
    enemyIn: Enemy,
    playerStance: Stance,
    enemyStance: Stance,
    playerAction: CombatAction,
    playerActionFinal: Action | 'skip',
    enemyActionFinal:  Action | 'skip',
    playerAdvantage: Advantage,
    enemyAdvantage: Advantage,
    combatResourcesIn: CombatResources,
    friendshipCounterIn: number,
    round: number,
    skillLookup: SkillLookup | undefined,
    events: RoundEvent[],
): ScenarioPhaseResult {
    let player = playerIn;
    let enemy  = enemyIn;
    let combatResources = combatResourcesIn;
    let friendshipCounter = friendshipCounterIn;

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
                    player, consumable, round, lookupEffectById,
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
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage, events, round,
        ));
    } else if (playerBasicAttacked && enemyActionFinal === 'defend') {
        ({ player, enemy } = resolvePlayerAttackEnemyDefend(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage, events, round,
        ));
    } else if (playerActionFinal === 'defend' && enemyActionFinal === 'attack') {
        ({ player, enemy } = resolvePlayerDefendEnemyAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage, events, round,
        ));
    } else if (playerBasicAttacked && enemyActionFinal === 'skip') {
        ({ player, enemy } = resolveAttackVsAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage, events, round,
        ));
    } else if (enemyActionFinal === 'attack' && playerActionFinal === 'skip') {
        ({ player, enemy } = resolveAttackVsAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage, events, round,
        ));
    } else if (enemyActionFinal === 'attack' && playerActionFinal === 'item') {
        // Player used an item this round and the enemy attacked — the enemy
        // strikes the player at passive defense. The player neither attacks
        // back nor defends actively. Mirrors the skip-vs-attack branch.
        ({ player, enemy } = resolveAttackVsAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage, events, round,
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

    return { player, enemy, combatResources, friendshipCounter };
}

// ─── Internal helpers (formerly in combat.resolver.ts) ────────────────────────

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

/**
 * Both combatants attack. Higher total (roll + stat + roll-mod) deals damage at
 * `PASSIVE_DEFENSE_MULTIPLIER`. Ties produce no damage on either side.
 *
 * Also used for the "skip vs attack" paths so a skipped combatant still takes
 * a passive-defense hit while never retaliating.
 */
function resolveAttackVsAttack(
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
function resolvePlayerAttackEnemyDefend(
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
function resolvePlayerDefendEnemyAttack(
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
