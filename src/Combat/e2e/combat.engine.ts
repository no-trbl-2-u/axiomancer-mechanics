/**
 * Combat Engine — pure turn resolution.
 *
 * Extracts the game-mechanics layer from the interactive CLI so that full
 * combat flows can be exercised in hermetic (no I/O, deterministic) tests.
 *
 * Every function here is a pure computation over `CombatState`/combatant
 * snapshots. The only source of non-determinism is `Math.random` (inside
 * `createDieRoll`), which test code can stub via `vi.spyOn(Math, 'random')`.
 *
 * The CLI (`combat.cli.ts`) owns the presentation layer: prompts, delays,
 * and ANSI display. It intentionally interleaves display with logic in its
 * own async versions of these helpers. This module is the authoritative,
 * testable source of the underlying rules.
 */

import { Character } from '../../Character/types';
import { Enemy } from '../../Enemy/types';
import { CombatAction, CombatState, Stance, Advantage } from '../types';
import {
    determineAdvantage,
    resolveEffectiveAdvantage,
    getAttackStat,
    getBaseStat,
    getDefenseStat,
    getActiveRollModifier,
    getEffectiveStats,
    calculateFinalDamage,
    applyDamage,
    getThornsReflect,
    getStudyMarkIntensity,
    removeRandomBuff,
    extendRandomBuffDuration,
    canAct,
    processRoundStartEffects,
    processRoundEndEffects,
} from '..';
import { createDieRoll } from '../../Utils';
import {
    DEFENSE_MULTIPLIERS,
    PASSIVE_DEFENSE_MULTIPLIER,
} from '../../Game/game-mechanics.constants';
import { applyTier1CombatEffect, clearTier1EffectsForStance } from '../../Effects';

const passiveDefense = (combatant: Character | Enemy, stance: Stance): number =>
    getBaseStat(combatant, stance) + getEffectiveStats(combatant).defenseDelta;

// ─── Scenario Resolvers ───────────────────────────────────────────────────────

/**
 * Both combatants attack. Higher total (roll + stat) deals damage.
 * Ties produce no damage on either side.
 */
export function resolveAttackVsAttack(
    player: Character,
    enemy: Enemy,
    playerType: Stance,
    enemyType: Stance,
    playerAdv: Advantage,
    enemyAdv: Advantage,
): { player: Character; enemy: Enemy } {
    const playerDieRoll = createDieRoll(playerAdv);
    const enemyDieRoll = createDieRoll(enemyAdv);

    const pRollMod = getActiveRollModifier(player);
    const pBaseStat = getAttackStat(player, playerType);
    const pMod = pBaseStat + pRollMod;
    const playerTotal = playerDieRoll() + pMod;

    const eRollMod = getActiveRollModifier(enemy);
    const eBaseStat = getAttackStat(enemy, enemyType);
    const eMod = eBaseStat + eRollMod;
    const enemyTotal = enemyDieRoll() + eMod;

    if (playerTotal > enemyTotal) {
        const baseDefense = passiveDefense(enemy, enemyType);
        const studyBonus = playerType === 'mind' ? getStudyMarkIntensity(enemy) : 0;
        const damageRoll = playerDieRoll() + pMod;
        const finalDamage = calculateFinalDamage(damageRoll, baseDefense * PASSIVE_DEFENSE_MULTIPLIER, false, studyBonus);

        let updatedEnemy = applyDamage(enemy, finalDamage);
        let updatedPlayer = player;

        if (playerType === 'heart') {
            updatedEnemy = removeRandomBuff(updatedEnemy).target;
            updatedPlayer = extendRandomBuffDuration(updatedPlayer, 1).target;
        }

        return { player: updatedPlayer, enemy: updatedEnemy };
    }

    if (enemyTotal > playerTotal) {
        const baseDefense = passiveDefense(player, playerType);
        const studyBonus = enemyType === 'mind' ? getStudyMarkIntensity(player) : 0;
        const damageRoll = enemyDieRoll() + eMod;
        const finalDamage = calculateFinalDamage(damageRoll, baseDefense * PASSIVE_DEFENSE_MULTIPLIER, false, studyBonus);

        const updatedPlayer = applyDamage(player, finalDamage);
        let updatedEnemy = enemy;

        const thorns = getThornsReflect(updatedPlayer);
        if (thorns > 0) updatedEnemy = applyDamage(updatedEnemy, thorns);

        return { player: updatedPlayer, enemy: updatedEnemy };
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
): { player: Character; enemy: Enemy } {
    const playerDieRoll = createDieRoll(playerAdv);
    const pRollMod = getActiveRollModifier(player);
    const pBaseStat = getAttackStat(player, playerType);
    const attackMod = pBaseStat + pRollMod;

    // Two rolls: first is the "attack roll" shown to the player; second drives damage.
    // Both consume RNG calls — must mirror the CLI's sequence exactly.
    playerDieRoll(); // attack roll (result shown in CLI, not used in damage formula)
    const damageRoll = playerDieRoll() + attackMod;

    const baseDefense = getDefenseStat(enemy, enemyType);
    const defenseMultiplier = DEFENSE_MULTIPLIERS[enemyAdv];
    const studyBonus = playerType === 'mind' ? getStudyMarkIntensity(enemy) : 0;
    const finalDamage = calculateFinalDamage(damageRoll, baseDefense * defenseMultiplier, false, studyBonus);

    let updatedEnemy = applyDamage(enemy, finalDamage);
    let updatedPlayer = player;

    if (playerType === 'heart') {
        updatedEnemy = removeRandomBuff(updatedEnemy).target;
        updatedPlayer = extendRandomBuffDuration(updatedPlayer, 1).target;
    }

    return { player: updatedPlayer, enemy: updatedEnemy };
}

/** Enemy attacks into a defending player. Player's defense multiplier is applied. */
export function resolvePlayerDefendEnemyAttack(
    player: Character,
    enemy: Enemy,
    playerType: Stance,
    enemyType: Stance,
    playerAdv: Advantage,
    enemyAdv: Advantage,
): { player: Character; enemy: Enemy } {
    const enemyDieRoll = createDieRoll(enemyAdv);
    const eRollMod = getActiveRollModifier(enemy);
    const eBaseStat = getAttackStat(enemy, enemyType);
    const attackMod = eBaseStat + eRollMod;

    // Two rolls: first is the "attack roll" shown to the player; second drives damage.
    enemyDieRoll(); // attack roll (result shown in CLI, not used in damage formula)
    const damageRoll = enemyDieRoll() + attackMod;

    const baseDefense = getBaseStat(player, playerType) + getEffectiveStats(player).defenseDelta;
    const defenseMultiplier = DEFENSE_MULTIPLIERS[playerAdv];
    const studyBonus = enemyType === 'mind' ? getStudyMarkIntensity(player) : 0;
    const finalDamage = calculateFinalDamage(damageRoll, baseDefense * defenseMultiplier, false, studyBonus);

    const updatedPlayer = applyDamage(player, finalDamage);
    let updatedEnemy = enemy;

    const thorns = getThornsReflect(updatedPlayer);
    if (thorns > 0) updatedEnemy = applyDamage(updatedEnemy, thorns);

    return { player: updatedPlayer, enemy: updatedEnemy };
}

// ─── Full Turn ────────────────────────────────────────────────────────────────

/**
 * Resolves one complete combat turn and returns the next `CombatState`.
 *
 * Order of operations (mirrors `runCombatTurn` in `combat.cli.ts`):
 *   1. `processRoundStartEffects` — regen → mana regen → drain → start-phase DoT.
 *   2. Resolve `canAct` (forcedStance / blockedStances / skipTurn — Q7 precedence).
 *   3. Compute effective advantage with `resolveEffectiveAdvantage` (Q8 default:
 *      effect grants override the matchup result outright).
 *   4. Clear stale Tier 1 stance buffs and apply new ones (only for combatants
 *      that can act).
 *   5. Resolve the attack/defend scenario. A skipped combatant takes hits at the
 *      passive multiplier and never retaliates.
 *   6. `processRoundEndEffects` — end-phase DoT → tick & expire.
 *   7. Increment the round counter.
 *
 * @param state        - Current combat snapshot.
 * @param playerAction - Stance and action chosen by the player this round.
 * @param enemyAction  - Stance and action chosen by the enemy this round.
 */
export function resolveCombatTurn(
    state: CombatState,
    playerAction: CombatAction,
    enemyAction: CombatAction,
): CombatState {
    let player = state.player;
    let enemy = state.enemy;

    // 1. Round-start orchestration.
    player = processRoundStartEffects(player).target;
    enemy  = processRoundStartEffects(enemy).target;

    if (player.health <= 0 || enemy.health <= 0) {
        return { ...state, player, enemy, round: state.round + 1 };
    }

    // 2. Action restriction resolution.
    const playerCan = canAct(player.effects, playerAction.stance);
    const enemyCan  = canAct(enemy.effects,  enemyAction.stance);
    const playerStance = playerCan.resolvedStance ?? playerAction.stance;
    const enemyStance  = enemyCan.resolvedStance  ?? enemyAction.stance;
    const playerActionFinal = playerCan.canAct ? playerAction.action : 'skip';
    const enemyActionFinal  = enemyCan.canAct  ? enemyAction.action  : 'skip';

    // 3. Advantage with effect overrides.
    const playerAdvantage = resolveEffectiveAdvantage(
        determineAdvantage(playerStance, enemyStance), player.effects, playerStance,
    );
    const enemyAdvantage = resolveEffectiveAdvantage(
        determineAdvantage(enemyStance, playerStance), enemy.effects, enemyStance,
    );

    // 4. Clear stale Tier 1 stance buffs and apply new ones for active combatants.
    player = { ...player, effects: clearTier1EffectsForStance(player.effects, playerStance).activeEffects };
    enemy  = { ...enemy,  effects: clearTier1EffectsForStance(enemy.effects,  enemyStance).activeEffects };

    if (playerCan.canAct && (playerActionFinal === 'attack' || playerActionFinal === 'defend')) {
        const t1 = applyTier1CombatEffect(
            player.effects, enemy.effects,
            { stance: playerStance, action: playerActionFinal }, state.round,
        );
        player = { ...player, effects: t1.actorEffects };
        enemy  = { ...enemy,  effects: t1.opponentEffects };
    }
    if (enemyCan.canAct && (enemyActionFinal === 'attack' || enemyActionFinal === 'defend')) {
        const t1 = applyTier1CombatEffect(
            enemy.effects, player.effects,
            { stance: enemyStance, action: enemyActionFinal }, state.round,
            state.enemy.tier1Overrides,
        );
        enemy  = { ...enemy,  effects: t1.actorEffects };
        player = { ...player, effects: t1.opponentEffects };
    }

    // 5. Scenario resolution.
    let friendshipCounter = state.friendshipCounter;

    if (playerActionFinal === 'attack' && enemyActionFinal === 'attack') {
        ({ player, enemy } = resolveAttackVsAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage,
        ));
    } else if (playerActionFinal === 'attack' && enemyActionFinal === 'defend') {
        ({ player, enemy } = resolvePlayerAttackEnemyDefend(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage,
        ));
    } else if (playerActionFinal === 'defend' && enemyActionFinal === 'attack') {
        ({ player, enemy } = resolvePlayerDefendEnemyAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage,
        ));
    } else if (playerActionFinal === 'attack' && enemyActionFinal === 'skip') {
        ({ player, enemy } = resolveAttackVsAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage,
        ));
    } else if (enemyActionFinal === 'attack' && playerActionFinal === 'skip') {
        ({ player, enemy } = resolveAttackVsAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage,
        ));
    } else if (playerActionFinal === 'defend' && enemyActionFinal === 'defend') {
        friendshipCounter++;
    }

    // 6. Round-end orchestration.
    player = processRoundEndEffects(player).target;
    enemy  = processRoundEndEffects(enemy).target;

    return { ...state, player, enemy, friendshipCounter, round: state.round + 1 };
}
