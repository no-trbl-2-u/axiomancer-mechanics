#!/usr/bin/env node

import inquirer from 'inquirer';

import { Disatree_01 } from '../Enemy/enemy.library';
import { Player } from '../Character/characters.mock';
import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import {
    determineEnemyAction,
    determineAdvantage,
    isCombatOngoing,
    getSkillStatForType,
    getBaseStatForType,
    getDefenseStatForType,
    calculateFinalDamage,
    applyDamage,
} from './index';
import { createDieRoll } from '../Utils';
import { ActionType, Advantage, CombatState } from './types';
import { createGameStore } from '../Game/store';
import { nullAdapter } from '../Game/persistence/null.adapter';
import {
    DEFENSE_MULTIPLIERS,
    PASSIVE_DEFENSE_MULTIPLIER,
} from '../Game/game-mechanics.constants';
import {
    typeColor,
    printCombatIntro,
    printCombatRules,
    printStatus,
    printRoundActions,
    printTypeMatchup,
    printRollLine,
    printDamageCalc,
    printContestHeader,
    printContestOutcome,
    printBothDefending,
    printCombatEnd,
} from './combat.display';

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// ─── Player Input ─────────────────────────────────────────────────────────────

async function promptPlayerChoice(): Promise<{
    reactionType: ActionType;
    actionType: 'attack' | 'defend';
}> {
    return inquirer.prompt([
        {
            type: 'rawlist',
            name: 'reactionType',
            message: 'Respond with...',
            choices: [
                { name: `${typeColor('heart', 'Heart')}  (emotional)`, value: 'heart' },
                { name: `${typeColor('body', 'Body')}   (physical)`, value: 'body' },
                { name: `${typeColor('mind', 'Mind')}   (mental)`, value: 'mind' },
            ],
        },
        {
            type: 'rawlist',
            name: 'actionType',
            message: 'Action...',
            choices: ['attack', 'defend'],
        },
    ]);
}

// ─── Combat Scenarios ─────────────────────────────────────────────────────────
//
// One function per action-pair outcome. Each prints its own sections and
// returns the updated combatants. State is never mutated.
//
// Defense multiplier rules (sourced from DEFENSE_MULTIPLIERS / game-mechanics.constants):
//   Both attack  → loser has no active defense: PASSIVE_DEFENSE_MULTIPLIER (×1)
//   One defends  → defender's type-advantage over the attacker sets the multiplier
//                  (advantage ×3 | neutral ×2 | disadvantage ×1.5)
//
// Stat conventions:
//   Player attack  → getSkillStatForType  (derivedStats; equals base while SKILL_MULTIPLIER = 1)
//   Player defense → getBaseStatForType   (raw base — preserves original balance until STAT_MULTIPLIERS are tuned)
//   Enemy  attack  → getSkillStatForType  (enemyStats attack values)
//   Enemy  defense → getDefenseStatForType (enemyStats defense values)
//
// TODO: Switch player defense to getDefenseStatForType once STAT_MULTIPLIERS are tuned.

async function resolveAttackVsAttack(
    player: Character,
    enemy: Enemy,
    playerType: ActionType,
    enemyType: ActionType,
    playerAdv: Advantage,
    enemyAdv: Advantage,
): Promise<{ player: Character; enemy: Enemy }> {
    const playerDieRoll = createDieRoll(playerAdv);
    const enemyDieRoll = createDieRoll(enemyAdv);

    const playerRaw = playerDieRoll();
    const playerMod = getSkillStatForType(player, playerType);
    const playerTotal = playerRaw + playerMod;

    const enemyRaw = enemyDieRoll();
    const enemyMod = getSkillStatForType(enemy, enemyType);
    const enemyTotal = enemyRaw + enemyMod;

    printContestHeader(playerRaw, playerMod, playerAdv, enemyRaw, enemyMod, enemyAdv);
    await delay(1500);
    printContestOutcome(playerTotal, enemyTotal);
    await delay(1500);

    if (playerTotal > enemyTotal) {
        const baseDefense = getDefenseStatForType(enemy, enemyType);
        const damageRoll = playerDieRoll() + playerMod;
        const finalDamage = calculateFinalDamage(damageRoll, baseDefense * PASSIVE_DEFENSE_MULTIPLIER, false);
        printDamageCalc({
            header: 'Player Damage',
            defender: 'enemy',
            attackStatName: `${playerType} skill`,
            attackStatValue: playerMod,
            damageRoll,
            defenseStatName: `${enemyType} defense`,
            baseDefense,
            defenseMultiplier: PASSIVE_DEFENSE_MULTIPLIER,
            finalDamage,
            hpBefore: enemy.health,
            hpAfter: Math.max(0, enemy.health - finalDamage),
        });
        return { player, enemy: applyDamage(enemy, finalDamage) };
    }

    if (enemyTotal > playerTotal) {
        const baseDefense = getBaseStatForType(player, playerType);
        const damageRoll = enemyDieRoll() + enemyMod;
        const finalDamage = calculateFinalDamage(damageRoll, baseDefense * PASSIVE_DEFENSE_MULTIPLIER, false);
        printDamageCalc({
            header: 'Enemy Damage',
            defender: 'player',
            attackStatName: `${enemyType} attack`,
            attackStatValue: enemyMod,
            damageRoll,
            defenseStatName: `${playerType} base`,
            baseDefense,
            defenseMultiplier: PASSIVE_DEFENSE_MULTIPLIER,
            finalDamage,
            hpBefore: player.health,
            hpAfter: Math.max(0, player.health - finalDamage),
        });
        return { player: applyDamage(player, finalDamage), enemy };
    }

    // Tie — printContestOutcome already printed the tie message
    return { player, enemy };
}

async function resolvePlayerAttackEnemyDefend(
    player: Character,
    enemy: Enemy,
    playerType: ActionType,
    enemyType: ActionType,
    playerAdv: Advantage,
    enemyAdv: Advantage,
): Promise<Enemy> {
    const playerDieRoll = createDieRoll(playerAdv);
    const attackMod = getSkillStatForType(player, playerType);
    const playerRaw = playerDieRoll();

    console.log('\n[ Player Attack Roll ]');
    printRollLine('Player attack roll:', playerRaw, attackMod, playerAdv);
    await delay(1500);

    // Enemy's type-advantage over the player sets how effectively they block
    const baseDefense = getDefenseStatForType(enemy, enemyType);
    const defenseMultiplier = DEFENSE_MULTIPLIERS[enemyAdv];
    const damageRoll = playerDieRoll() + attackMod;
    const finalDamage = calculateFinalDamage(damageRoll, baseDefense * defenseMultiplier, false);

    printDamageCalc({
        header: 'Player Damage vs Defending Enemy',
        defender: 'enemy',
        attackStatName: `${playerType} skill`,
        attackStatValue: attackMod,
        damageRoll,
        defenseStatName: `${enemyType} defense`,
        baseDefense,
        defenseMultiplier,
        finalDamage,
        hpBefore: enemy.health,
        hpAfter: Math.max(0, enemy.health - finalDamage),
    });

    return applyDamage(enemy, finalDamage);
}

async function resolvePlayerDefendEnemyAttack(
    player: Character,
    enemy: Enemy,
    playerType: ActionType,
    enemyType: ActionType,
    playerAdv: Advantage,
    enemyAdv: Advantage,
): Promise<Character> {
    const enemyDieRoll = createDieRoll(enemyAdv);
    const attackMod = getSkillStatForType(enemy, enemyType);
    const enemyRaw = enemyDieRoll();

    console.log('\n[ Enemy Attack Roll ]');
    printRollLine('Enemy attack roll:', enemyRaw, attackMod, enemyAdv);
    await delay(1500);

    // Player's type-advantage over the enemy sets how effectively they block
    const baseDefense = getBaseStatForType(player, playerType);
    const defenseMultiplier = DEFENSE_MULTIPLIERS[playerAdv];
    const damageRoll = enemyDieRoll() + attackMod;
    const finalDamage = calculateFinalDamage(damageRoll, baseDefense * defenseMultiplier, false);

    printDamageCalc({
        header: 'Enemy Damage vs Defending Player',
        defender: 'player',
        attackStatName: `${enemyType} attack`,
        attackStatValue: attackMod,
        damageRoll,
        defenseStatName: `${playerType} base`,
        baseDefense,
        defenseMultiplier,
        finalDamage,
        hpBefore: player.health,
        hpAfter: Math.max(0, player.health - finalDamage),
    });

    return applyDamage(player, finalDamage);
}

// ─── Main Turn Loop ───────────────────────────────────────────────────────────

async function runCombatTurn(state: CombatState): Promise<CombatState> {
    printStatus(state);

    const { reactionType, actionType } = await promptPlayerChoice();
    const enemyAction = determineEnemyAction(state.enemy.logic);
    const playerAdvantage = determineAdvantage(reactionType, enemyAction.type);
    const enemyAdvantage = determineAdvantage(enemyAction.type, reactionType);

    printRoundActions(actionType, reactionType, enemyAction.action, enemyAction.type);
    printTypeMatchup(reactionType, enemyAction.type, playerAdvantage, enemyAdvantage);
    await delay(1500);

    let player = state.player;
    let enemy = state.enemy;
    let friendshipCounter = state.friendshipCounter;

    if (actionType === 'attack' && enemyAction.action === 'attack') {
        ({ player, enemy } = await resolveAttackVsAttack(
            player, enemy, reactionType, enemyAction.type, playerAdvantage, enemyAdvantage,
        ));
    } else if (actionType === 'attack' && enemyAction.action === 'defend') {
        enemy = await resolvePlayerAttackEnemyDefend(
            player, enemy, reactionType, enemyAction.type, playerAdvantage, enemyAdvantage,
        );
    } else if (actionType === 'defend' && enemyAction.action === 'attack') {
        player = await resolvePlayerDefendEnemyAttack(
            player, enemy, reactionType, enemyAction.type, playerAdvantage, enemyAdvantage,
        );
    } else {
        // Both defend → friendship mechanic
        friendshipCounter++;
        await delay(1500);
        printBothDefending(friendshipCounter - 1, friendshipCounter);
    }

    await delay(1500);
    return { ...state, player, enemy, friendshipCounter, round: state.round + 1 };
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    // nullAdapter = in-memory only, nothing persisted (combat sim is a test tool).
    // Passing the mock Player as an override so the store starts with known stats.
    const store = createGameStore(nullAdapter, { player: Player });

    printCombatIntro(Player.name, Player.level, Disatree_01.name, Disatree_01.level);
    printCombatRules();

    store.getState().startCombat(Disatree_01);

    while (true) {
        const combat = store.getState().combatState;
        if (!combat || !isCombatOngoing(combat)) break;

        const next = await runCombatTurn(combat);
        store.getState().applyCombatTurn(next);
    }

    const finalCombat = store.getState().combatState!;
    store.getState().endCombat();   // merges player's final HP back to root state
    printCombatEnd(finalCombat);
}

main();
