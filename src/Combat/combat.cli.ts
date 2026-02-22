#!/usr/bin/env node

import inquirer from 'inquirer';

/* MOCKED DATA */
import { Disatree_01 } from '../Enemy/enemy.library';
import { Player } from '../Character/characters.mock';
import { BaseStats } from '../Character/types';
import { determineEnemyAction, determineAdvantage, isCombatOngoing } from './index';
import { createDieRoll } from '../Utils';
import { getEnemyRelatedStat } from '../Enemy';
import { initializeCombat } from './combat.reducer';
import { Advantage, CombatState } from './types';

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/* ─── Formatting helpers ─────────────────────────────────────────────────── */

const ADVANTAGE_LABEL: Record<Advantage, string> = {
    advantage:    'ADVANTAGE   (+)',
    neutral:      'NEUTRAL      (=)',
    disadvantage: 'DISADVANTAGE (-)',
};

/** Explains why the type matchup produced that advantage result */
function advantageReason(attacker: string, defender: string, advantage: Advantage): string {
    const wins: Record<string, string> = { heart: 'body', body: 'mind', mind: 'heart' };
    if (advantage === 'neutral')      return `${attacker} = ${defender} (same type → neutral)`;
    if (advantage === 'advantage')    return `${attacker} > ${defender} (${attacker} beats ${defender})`;
    return `${attacker} < ${defender} (${defender} beats ${attacker})`;
}

/** Formats a roll so the breakdown is always visible */
function fmtRoll(label: string, rawRoll: number, modifier: number, advantage: Advantage): string {
    const diceDesc = advantage === 'neutral' ? '1d20' : `2d20 ${advantage}`;
    return `  ${label.padEnd(22)} ${rawRoll} (${diceDesc}) + ${modifier} (stat) = ${rawRoll + modifier}`;
}

/** Formats a damage calculation step */
function fmtDamage(label: string, damageRoll: number, defenseStat: number, defenseLabel: string, defending: boolean): string {
    const defNote = defending ? ` × 1.5 defending = ${defenseStat}` : ` = ${defenseStat}`;
    const finalDmg = Math.max(0, damageRoll - defenseStat);
    return `  ${label.padEnd(22)} ${damageRoll} (roll) − ${defenseStat} (${defenseLabel} defense${defNote}) = ${finalDmg} dmg`;
}

/* ─── Status display ─────────────────────────────────────────────────────── */

function printStatus(state: CombatState): void {
    console.log(`\n========== Round ${state.round} ==========`);
    console.log(`Player HP : ${state.player.health} / ${state.player.maxHealth}`);
    console.log(`Enemy HP  : ${state.enemy.health} / ${state.enemy.enemyStats.maxHealth}`);
    if (state.friendshipCounter > 0) {
        console.log(`Friendship: ${state.friendshipCounter} / 3`);
    }
    console.log('');
}

/* ─── Combat turn ────────────────────────────────────────────────────────── */

async function runCombatTurn(state: CombatState): Promise<CombatState> {
    printStatus(state);

    const answer = await inquirer.prompt<{
        reactionType: 'heart' | 'body' | 'mind';
        actionType: 'attack' | 'defend';
    }>([
        {
            type: 'rawlist',
            name: 'reactionType',
            message: 'Select which part of yourself you choose to respond with...',
            choices: [
                { name: 'Heart', value: 'heart' },
                { name: 'Body', value: 'body' },
                { name: 'Mind', value: 'mind' }
            ]
        },
        {
            type: 'rawlist',
            name: 'actionType',
            message: 'Select the action you want to take...',
            choices: ['attack', 'defend']
        }
    ]);

    /* Work on local copies so state stays immutable */
    let player = { ...state.player };
    let enemy = { ...state.enemy };
    let friendshipCounter = state.friendshipCounter;

    const enemyAction = determineEnemyAction(enemy.logic);
    const playerAdvantage = determineAdvantage(answer.reactionType, enemyAction.type);
    const enemyAdvantage = determineAdvantage(enemyAction.type, answer.reactionType);

    console.log(`\nPlayer : ${answer.actionType.toUpperCase()} with ${answer.reactionType.toUpperCase()}`);
    console.log(`Enemy  : ${enemyAction.action.toUpperCase()} with ${enemyAction.type.toUpperCase()}`);

    /* ── Type matchup breakdown ─────────────────────────────────────────── */
    console.log('\n[ Type Matchup ]');
    console.log(`  Player (${answer.reactionType}) vs Enemy (${enemyAction.type})`);
    console.log(`  Player advantage : ${ADVANTAGE_LABEL[playerAdvantage]}  — ${advantageReason(answer.reactionType, enemyAction.type, playerAdvantage)}`);
    console.log(`  Enemy  advantage : ${ADVANTAGE_LABEL[enemyAdvantage]}  — ${advantageReason(enemyAction.type, answer.reactionType, enemyAdvantage)}`);
    console.log(`  (advantage rolls 2d20 and keeps the HIGHER; disadvantage keeps the LOWER)`);

    await delay(1500);

    /* ════════════════════════════════════════════════════════════════════════
     * PLAYER ATTACKS
     * ════════════════════════════════════════════════════════════════════════ */
    if (answer.actionType === 'attack') {
        const playerDieRoll = createDieRoll(playerAdvantage);
        const playerRollModifier = player.baseStats[answer.reactionType as keyof BaseStats];
        const playerRawRoll = playerDieRoll();
        const playerRollTotal = playerRawRoll + playerRollModifier;

        /* ── Player vs Enemy: ATTACK vs ATTACK ──────────────────────────── */
        if (enemyAction.action === 'attack') {
            const enemyDieRoll = createDieRoll(enemyAdvantage);
            const enemyRollModifier = getEnemyRelatedStat(enemy, enemyAction.type, false);
            const enemyRawRoll = enemyDieRoll();
            const enemyRollTotal = enemyRawRoll + enemyRollModifier;

            console.log('\n[ Attack Contest ]');
            console.log(fmtRoll('Player attack roll:', playerRawRoll, playerRollModifier, playerAdvantage));
            console.log(fmtRoll('Enemy attack roll:', enemyRawRoll, enemyRollModifier, enemyAdvantage));
            await delay(1500);

            if (playerRollTotal > enemyRollTotal) {
                console.log(`\n  → Player wins! (${playerRollTotal} vs ${enemyRollTotal})`);
                await delay(1500);

                /* Damage roll */
                const playersDamageRoll = playerDieRoll() + playerRollModifier;
                const enemyDefenseStat = getEnemyRelatedStat(enemy, enemyAction.type, true);
                const playerDamage = Math.max(0, playersDamageRoll - enemyDefenseStat);

                console.log('\n[ Player Damage Calculation ]');
                console.log(`  Damage roll   : 1d20 + ${playerRollModifier} (${answer.reactionType} stat) = ${playersDamageRoll}`);
                console.log(`  Enemy defense : ${enemyAction.type} defense stat = ${enemyDefenseStat}`);
                console.log(`  Final damage  : ${playersDamageRoll} − ${enemyDefenseStat} = ${playerDamage} (min 0)`);
                console.log(`  Enemy HP      : ${enemy.health} → ${enemy.health - playerDamage}`);

                enemy = { ...enemy, health: enemy.health - playerDamage };

            } else if (playerRollTotal < enemyRollTotal) {
                console.log(`\n  → Enemy wins! (${enemyRollTotal} vs ${playerRollTotal})`);
                await delay(1500);

                /* Damage roll */
                const enemiesDamageRoll = enemyDieRoll() + enemyRollModifier;
                const playerDefenseStat = player.baseStats[answer.reactionType as keyof BaseStats];
                const enemyDamage = Math.max(0, enemiesDamageRoll - playerDefenseStat);

                console.log('\n[ Enemy Damage Calculation ]');
                console.log(`  Damage roll    : 1d20 + ${enemyRollModifier} (${enemyAction.type} attack stat) = ${enemiesDamageRoll}`);
                console.log(`  Player defense : ${answer.reactionType} base stat = ${playerDefenseStat}`);
                console.log(`  Final damage   : ${enemiesDamageRoll} − ${playerDefenseStat} = ${enemyDamage} (min 0)`);
                console.log(`  Player HP      : ${player.health} → ${player.health - enemyDamage}`);

                player = { ...player, health: player.health - enemyDamage };

            } else {
                console.log(`\n  → Tied! (${playerRollTotal} vs ${enemyRollTotal}) — your wits clash, both miss!`);
            }

        /* ── Player ATTACKS, Enemy DEFENDS ──────────────────────────────── */
        } else if (enemyAction.action === 'defend') {
            const baseEnemyDefense = getEnemyRelatedStat(enemy, enemyAction.type, true);
            const enemyDefenseStat = baseEnemyDefense * 1.5;
            const playersDamageRoll = playerDieRoll() + playerRollModifier;
            const playerDamage = Math.max(0, playersDamageRoll - enemyDefenseStat);

            console.log('\n[ Player Attack Roll ]');
            console.log(fmtRoll('Player attack roll:', playerRawRoll, playerRollModifier, playerAdvantage));
            console.log(`  (Attack roll used for damage directly since enemy is defending)`);
            await delay(1500);

            console.log('\n[ Player Damage vs Defending Enemy ]');
            console.log(`  Damage roll       : 1d20 + ${playerRollModifier} (${answer.reactionType} stat) = ${playersDamageRoll}`);
            console.log(`  Enemy base defense: ${enemyAction.type} defense stat = ${baseEnemyDefense}`);
            console.log(`  Defending bonus   : ${baseEnemyDefense} × 1.5 = ${enemyDefenseStat}`);
            console.log(`  Final damage      : ${playersDamageRoll} − ${enemyDefenseStat} = ${playerDamage} (min 0)`);
            console.log(`  Enemy HP          : ${enemy.health} → ${enemy.health - playerDamage}`);

            enemy = { ...enemy, health: enemy.health - playerDamage };
        }

    /* ════════════════════════════════════════════════════════════════════════
     * PLAYER DEFENDS
     * ════════════════════════════════════════════════════════════════════════ */
    } else if (answer.actionType === 'defend') {

        /* ── Player DEFENDS, Enemy ATTACKS ──────────────────────────────── */
        if (enemyAction.action === 'attack') {
            const enemyDieRoll = createDieRoll(enemyAdvantage);
            const enemyRollModifier = getEnemyRelatedStat(enemy, enemyAction.type, false);
            const enemyRawRoll = enemyDieRoll();
            const enemyRollTotal = enemyRawRoll + enemyRollModifier;

            const basePlayerDefense = player.baseStats[answer.reactionType as keyof BaseStats];
            const playerDefenseStat = basePlayerDefense * 1.5;
            const enemiesDamageRoll = enemyDieRoll() + enemyRollModifier;
            const enemyDamage = Math.max(0, enemiesDamageRoll - playerDefenseStat);

            console.log('\n[ Enemy Attack Roll ]');
            console.log(fmtRoll('Enemy attack roll:', enemyRawRoll, enemyRollModifier, enemyAdvantage));
            await delay(1500);

            console.log('\n[ Enemy Damage vs Defending Player ]');
            console.log(`  Damage roll        : 1d20 + ${enemyRollModifier} (${enemyAction.type} attack stat) = ${enemiesDamageRoll}`);
            console.log(`  Player base defense: ${answer.reactionType} base stat = ${basePlayerDefense}`);
            console.log(`  Defending bonus    : ${basePlayerDefense} × 1.5 = ${playerDefenseStat}`);
            console.log(`  Final damage       : ${enemiesDamageRoll} − ${playerDefenseStat} = ${enemyDamage} (min 0)`);
            console.log(`  Player HP          : ${player.health} → ${player.health - enemyDamage}`);

            player = { ...player, health: player.health - enemyDamage };

        /* ── Both DEFEND — friendship mechanic ──────────────────────────── */
        } else if (enemyAction.action === 'defend') {
            friendshipCounter++;
            await delay(1500);
            console.log('\n[ Both Defending ]');
            console.log(`  No attack is made. Both parties pause...`);
            console.log(`  Friendship counter: ${friendshipCounter - 1} → ${friendshipCounter} / 3`);
            console.log(`  (At 3, the enemy becomes your friend and combat ends)`);
        }
    }

    await delay(1500);

    return {
        ...state,
        player,
        enemy,
        friendshipCounter,
        round: state.round + 1,
    };
}

/* ─── Entry point ────────────────────────────────────────────────────────── */

async function main() {
    console.log('Simulating combat as mocked player vs. mocked enemy...\n');
    console.log('[ Combat Rules ]');
    console.log('  Heart > Body > Mind > Heart  (type advantage)');
    console.log('  Advantage: roll 2d20, keep HIGHER | Disadvantage: roll 2d20, keep LOWER');
    console.log('  Defending: your defense stat × 1.5');
    console.log('  Damage = attack roll − defense stat (minimum 0)\n');

    let state = initializeCombat(Player, Disatree_01);

    while (isCombatOngoing(state)) {
        state = await runCombatTurn(state);
    }

    console.log('\n========== COMBAT ENDED ==========');
    if (state.enemy.health <= 0) {
        console.log('You defeated the enemy! Victory!');
    } else if (state.player.health <= 0) {
        console.log('You were defeated... Game over.');
    } else if (state.friendshipCounter >= 3) {
        console.log('You and the enemy have become friends!');
    }

    console.log(`\nFinal Player HP : ${state.player.health} / ${state.player.maxHealth}`);
    console.log(`Final Enemy HP  : ${state.enemy.health} / ${state.enemy.enemyStats.maxHealth}`);
    console.log(`Rounds fought   : ${state.round - 1}`);
}

main();
