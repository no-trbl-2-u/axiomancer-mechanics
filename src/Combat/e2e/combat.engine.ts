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
    getAttackStat,
    getBaseStat,
    getDefenseStat,
    getActiveRollModifier,
    calculateFinalDamage,
    applyDamage,
    tickAllEffects,
    getThornsReflect,
    getStudyMarkIntensity,
    removeRandomBuff,
    extendRandomBuffDuration,
    applyRegen,
} from '..';
import { createDieRoll } from '../../Utils';
import {
    DEFENSE_MULTIPLIERS,
    PASSIVE_DEFENSE_MULTIPLIER,
} from '../../Game/game-mechanics.constants';
import { applyTier1CombatEffect, clearTier1EffectsForStance } from '../../Effects';

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
        const baseDefense = getDefenseStat(enemy, enemyType);
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
        const baseDefense = getBaseStat(player, playerType);
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

    const baseDefense = getBaseStat(player, playerType);
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
 *   1. Apply start-of-round regen.
 *   2. Clear stale Tier 1 stance buffs.
 *   3. Apply new Tier 1 stance effects.
 *   4. Resolve the attack/defend scenario.
 *   5. Tick (decrement) all active effects.
 *   6. Increment the round counter.
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

    // 1. Regen
    player = applyRegen(player).target;
    enemy = applyRegen(enemy).target;

    // 2. Clear stale Tier 1 stance buffs
    player = { ...player, effects: clearTier1EffectsForStance(player.effects, playerAction.stance).activeEffects };
    enemy = { ...enemy, effects: clearTier1EffectsForStance(enemy.effects, enemyAction.stance).activeEffects };

    // 3. Apply Tier 1 stance effects
    const playerAdvantage = determineAdvantage(playerAction.stance, enemyAction.stance);
    const enemyAdvantage = determineAdvantage(enemyAction.stance, playerAction.stance);

    const playerTier1 = applyTier1CombatEffect(
        player.effects, enemy.effects, playerAction, state.round,
    );
    player = { ...player, effects: playerTier1.actorEffects };
    enemy = { ...enemy, effects: playerTier1.opponentEffects };

    const enemyTier1 = applyTier1CombatEffect(
        enemy.effects, player.effects, enemyAction, state.round,
        state.enemy.tier1Overrides,
    );
    enemy = { ...enemy, effects: enemyTier1.actorEffects };
    player = { ...player, effects: enemyTier1.opponentEffects };

    // 4. Resolve scenario
    let friendshipCounter = state.friendshipCounter;

    if (playerAction.action === 'attack' && enemyAction.action === 'attack') {
        ({ player, enemy } = resolveAttackVsAttack(
            player, enemy, playerAction.stance, enemyAction.stance, playerAdvantage, enemyAdvantage,
        ));
    } else if (playerAction.action === 'attack' && enemyAction.action === 'defend') {
        ({ player, enemy } = resolvePlayerAttackEnemyDefend(
            player, enemy, playerAction.stance, enemyAction.stance, playerAdvantage, enemyAdvantage,
        ));
    } else if (playerAction.action === 'defend' && enemyAction.action === 'attack') {
        ({ player, enemy } = resolvePlayerDefendEnemyAttack(
            player, enemy, playerAction.stance, enemyAction.stance, playerAdvantage, enemyAdvantage,
        ));
    } else {
        friendshipCounter++;
    }

    // 5. Tick effects
    player = tickAllEffects(player).target;
    enemy = tickAllEffects(enemy).target;

    return { ...state, player, enemy, friendshipCounter, round: state.round + 1 };
}
