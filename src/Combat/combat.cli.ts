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

/* ─── ANSI colour helpers ────────────────────────────────────────────────── */

const C = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    dim:    '\x1b[2m',
    red:    '\x1b[31m',
    green:  '\x1b[32m',
    yellow: '\x1b[33m',
    blue:   '\x1b[34m',
    cyan:   '\x1b[36m',
    white:  '\x1b[37m',
    brightRed:    '\x1b[91m',
    brightGreen:  '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue:   '\x1b[94m',
    brightCyan:   '\x1b[96m',
    brightWhite:  '\x1b[97m',
};

/** Colour a type label: heart=red, body=green, mind=blue */
function typeColor(type: string, text?: string): string {
    const label = text ?? type.toUpperCase();
    switch (type) {
        case 'heart': return `${C.brightRed}${label}${C.reset}`;
        case 'body':  return `${C.brightGreen}${label}${C.reset}`;
        case 'mind':  return `${C.brightBlue}${label}${C.reset}`;
        default:      return label;
    }
}

/* ─── Formatting helpers ─────────────────────────────────────────────────── */

const ADVANTAGE_LABEL: Record<Advantage, string> = {
    advantage:    `${C.brightGreen}ADVANTAGE   (+)${C.reset}`,
    neutral:      `${C.yellow}NEUTRAL      (=)${C.reset}`,
    disadvantage: `${C.brightRed}DISADVANTAGE (-)${C.reset}`,
};

/** Explains why the type matchup produced that advantage result */
function advantageReason(attacker: string, defender: string, advantage: Advantage): string {
    if (advantage === 'neutral')   return `${attacker} = ${defender} (same type)`;
    if (advantage === 'advantage') return `${attacker} > ${defender}`;
    return `${attacker} < ${defender}`;
}

/** Formats a roll so the breakdown is always visible */
function fmtRoll(label: string, rawRoll: number, modifier: number, advantage: Advantage): string {
    const diceDesc = advantage === 'neutral' ? '1d20' : `2d20 ${advantage}`;
    const total = rawRoll + modifier;
    return `  ${label.padEnd(24)} ${C.bold}${total}${C.reset}  (${rawRoll} [${diceDesc}] + ${modifier} stat)`;
}

/** Formats a damage calculation step */
function fmtDamage(
    label: string,
    damageRoll: number,
    defenseStat: number,
    defenseLabel: string,
    defending: boolean,
): string {
    const defNote = defending ? ` × 1.5 = ${defenseStat}` : ``;
    const finalDmg = Math.max(0, damageRoll - defenseStat);
    const dmgColor = finalDmg > 0 ? C.brightRed : C.dim;
    return [
        `  ${label.padEnd(24)} roll ${damageRoll}`,
        `  ${''.padEnd(24)} defense (${defenseLabel}${defNote}): ${defenseStat}`,
        `  ${''.padEnd(24)} ${dmgColor}${C.bold}damage: ${finalDmg}${C.reset}`,
    ].join('\n');
}

/** Renders an ASCII HP bar */
function hpBar(current: number, max: number, width = 20): string {
    const clamped = Math.max(0, current);
    const filled  = Math.round((clamped / max) * width);
    const empty   = width - filled;
    const pct     = clamped / max;
    const color   = pct > 0.5 ? C.brightGreen : pct > 0.25 ? C.brightYellow : C.brightRed;
    return `${color}${'█'.repeat(filled)}${C.dim}${'░'.repeat(empty)}${C.reset}`;
}

/* ─── Section headers ────────────────────────────────────────────────────── */

const HR_MAJOR = `${C.dim}${'═'.repeat(50)}${C.reset}`;
const HR_MINOR = `${C.dim}${'─'.repeat(50)}${C.reset}`;

function sectionHeader(title: string): string {
    return `\n${C.bold}${C.cyan}┌─ ${title} ${C.dim}${'─'.repeat(Math.max(0, 46 - title.length))}${C.reset}`;
}

/* ─── Status display ─────────────────────────────────────────────────────── */

function printStatus(state: CombatState): void {
    const playerPct  = Math.max(0, state.player.health) / state.player.maxHealth;
    const enemyPct   = Math.max(0, state.enemy.health)  / state.enemy.enemyStats.maxHealth;
    const playerHpColor = playerPct > 0.5 ? C.brightGreen : playerPct > 0.25 ? C.brightYellow : C.brightRed;
    const enemyHpColor  = enemyPct  > 0.5 ? C.brightGreen : enemyPct  > 0.25 ? C.brightYellow : C.brightRed;

    console.log(`\n${HR_MAJOR}`);
    console.log(`  ${C.bold}Round ${state.round}${C.reset}`);
    console.log(HR_MAJOR);

    const playerHp = Math.max(0, state.player.health);
    const enemyHp  = Math.max(0, state.enemy.health);

    console.log(`  Player  ${hpBar(state.player.health, state.player.maxHealth)}  ${playerHpColor}${playerHp}${C.reset} / ${state.player.maxHealth}`);
    console.log(`  Enemy   ${hpBar(state.enemy.health,  state.enemy.enemyStats.maxHealth)}  ${enemyHpColor}${enemyHp}${C.reset} / ${state.enemy.enemyStats.maxHealth}`);

    if (state.friendshipCounter > 0) {
        const hearts = '♥'.repeat(state.friendshipCounter) + '♡'.repeat(3 - state.friendshipCounter);
        console.log(`  ${C.brightRed}Friendship  ${hearts}${C.reset}  (${state.friendshipCounter} / 3)`);
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
            message: 'Respond with...',
            choices: [
                { name: `${typeColor('heart', 'Heart')}  (emotional)`, value: 'heart' },
                { name: `${typeColor('body',  'Body')}   (physical)`,  value: 'body'  },
                { name: `${typeColor('mind',  'Mind')}   (mental)`,    value: 'mind'  },
            ],
        },
        {
            type: 'rawlist',
            name: 'actionType',
            message: 'Action...',
            choices: ['attack', 'defend'],
        },
    ]);

    /* Work on local copies so state stays immutable */
    let player = { ...state.player };
    let enemy  = { ...state.enemy  };
    let friendshipCounter = state.friendshipCounter;

    const enemyAction      = determineEnemyAction(enemy.logic);
    const playerAdvantage  = determineAdvantage(answer.reactionType, enemyAction.type);
    const enemyAdvantage   = determineAdvantage(enemyAction.type, answer.reactionType);

    /* ── Actions declared ───────────────────────────────────────────────── */
    console.log(HR_MINOR);
    console.log(`  You    ${C.bold}${answer.actionType.toUpperCase()}${C.reset} with ${typeColor(answer.reactionType)}`);
    console.log(`  Enemy  ${C.bold}${enemyAction.action.toUpperCase()}${C.reset} with ${typeColor(enemyAction.type)}`);

    /* ── Type matchup ───────────────────────────────────────────────────── */
    console.log(sectionHeader('Type Matchup'));

    if (playerAdvantage === 'neutral') {
        console.log(`  Same type (${typeColor(answer.reactionType)}) — ${ADVANTAGE_LABEL['neutral']} for both sides`);
    } else {
        console.log(`  You     ${ADVANTAGE_LABEL[playerAdvantage]}  — ${advantageReason(answer.reactionType, enemyAction.type, playerAdvantage)}`);
        console.log(`  Enemy   ${ADVANTAGE_LABEL[enemyAdvantage]}  — ${advantageReason(enemyAction.type, answer.reactionType, enemyAdvantage)}`);
    }

    await delay(1500);

    /* ════════════════════════════════════════════════════════════════════════
     * PLAYER ATTACKS
     * ════════════════════════════════════════════════════════════════════════ */
    if (answer.actionType === 'attack') {
        const playerDieRoll      = createDieRoll(playerAdvantage);
        const playerRollModifier = player.baseStats[answer.reactionType as keyof BaseStats];
        const playerRawRoll      = playerDieRoll();
        const playerRollTotal    = playerRawRoll + playerRollModifier;

        /* ── Player vs Enemy: ATTACK vs ATTACK ──────────────────────────── */
        if (enemyAction.action === 'attack') {
            const enemyDieRoll      = createDieRoll(enemyAdvantage);
            const enemyRollModifier = getEnemyRelatedStat(enemy, enemyAction.type, false);
            const enemyRawRoll      = enemyDieRoll();
            const enemyRollTotal    = enemyRawRoll + enemyRollModifier;

            console.log(sectionHeader('Attack Contest'));
            console.log(fmtRoll('You attack:', playerRawRoll, playerRollModifier, playerAdvantage));
            console.log(fmtRoll('Enemy attack:', enemyRawRoll, enemyRollModifier, enemyAdvantage));
            await delay(1500);

            if (playerRollTotal > enemyRollTotal) {
                console.log(`\n  ${C.brightGreen}${C.bold}→ You win the contest!${C.reset} (${playerRollTotal} vs ${enemyRollTotal})`);
                await delay(1500);

                const playersDamageRoll = playerDieRoll() + playerRollModifier;
                const enemyDefenseStat  = getEnemyRelatedStat(enemy, enemyAction.type, true);
                const playerDamage      = Math.max(0, playersDamageRoll - enemyDefenseStat);

                console.log(sectionHeader('Damage'));
                console.log(fmtDamage('You deal:', playersDamageRoll, enemyDefenseStat, `${enemyAction.type} defense`, false));
                console.log(`\n  Enemy HP  ${Math.max(0, enemy.health)} → ${C.brightRed}${Math.max(0, enemy.health - playerDamage)}${C.reset}`);

                enemy = { ...enemy, health: enemy.health - playerDamage };

            } else if (playerRollTotal < enemyRollTotal) {
                console.log(`\n  ${C.brightRed}${C.bold}→ Enemy wins the contest!${C.reset} (${enemyRollTotal} vs ${playerRollTotal})`);
                await delay(1500);

                const enemiesDamageRoll = enemyDieRoll() + enemyRollModifier;
                const playerDefenseStat = player.baseStats[answer.reactionType as keyof BaseStats];
                const enemyDamage       = Math.max(0, enemiesDamageRoll - playerDefenseStat);

                console.log(sectionHeader('Damage'));
                console.log(fmtDamage('Enemy deals:', enemiesDamageRoll, playerDefenseStat, `${answer.reactionType} base stat`, false));
                console.log(`\n  Your HP   ${Math.max(0, player.health)} → ${C.brightRed}${Math.max(0, player.health - enemyDamage)}${C.reset}`);

                player = { ...player, health: player.health - enemyDamage };

            } else {
                console.log(`\n  ${C.yellow}→ Tied! (${playerRollTotal} vs ${enemyRollTotal}) — wits clash, both miss.${C.reset}`);
            }

        /* ── Player ATTACKS, Enemy DEFENDS ──────────────────────────────── */
        } else if (enemyAction.action === 'defend') {
            const baseEnemyDefense = getEnemyRelatedStat(enemy, enemyAction.type, true);
            const enemyDefenseStat = baseEnemyDefense * 1.5;
            const playersDamageRoll = playerDieRoll() + playerRollModifier;
            const playerDamage      = Math.max(0, playersDamageRoll - enemyDefenseStat);

            console.log(sectionHeader('Your Attack (Enemy Defending)'));
            console.log(fmtRoll('You attack:', playerRawRoll, playerRollModifier, playerAdvantage));
            await delay(1500);

            console.log(sectionHeader('Damage'));
            console.log(fmtDamage('You deal:', playersDamageRoll, enemyDefenseStat, `${enemyAction.type} defense ×1.5`, true));
            console.log(`\n  Enemy HP  ${Math.max(0, enemy.health)} → ${C.brightRed}${Math.max(0, enemy.health - playerDamage)}${C.reset}`);

            enemy = { ...enemy, health: enemy.health - playerDamage };
        }

    /* ════════════════════════════════════════════════════════════════════════
     * PLAYER DEFENDS
     * ════════════════════════════════════════════════════════════════════════ */
    } else if (answer.actionType === 'defend') {

        /* ── Player DEFENDS, Enemy ATTACKS ──────────────────────────────── */
        if (enemyAction.action === 'attack') {
            const enemyDieRoll      = createDieRoll(enemyAdvantage);
            const enemyRollModifier = getEnemyRelatedStat(enemy, enemyAction.type, false);
            const enemyRawRoll      = enemyDieRoll();

            const basePlayerDefense = player.baseStats[answer.reactionType as keyof BaseStats];
            const playerDefenseStat = basePlayerDefense * 1.5;
            const enemiesDamageRoll = enemyDieRoll() + enemyRollModifier;
            const enemyDamage       = Math.max(0, enemiesDamageRoll - playerDefenseStat);

            console.log(sectionHeader('Enemy Attack (You Defending)'));
            console.log(fmtRoll('Enemy attack:', enemyRawRoll, enemyRollModifier, enemyAdvantage));
            await delay(1500);

            console.log(sectionHeader('Damage'));
            console.log(fmtDamage('Enemy deals:', enemiesDamageRoll, playerDefenseStat, `${answer.reactionType} base stat ×1.5`, true));
            console.log(`\n  Your HP   ${Math.max(0, player.health)} → ${C.brightRed}${Math.max(0, player.health - enemyDamage)}${C.reset}`);

            player = { ...player, health: player.health - enemyDamage };

        /* ── Both DEFEND — friendship mechanic ──────────────────────────── */
        } else if (enemyAction.action === 'defend') {
            friendshipCounter++;
            await delay(1500);
            console.log(sectionHeader('Both Defending'));
            console.log(`  No attack is made. A moment of stillness passes...`);
            const hearts = '♥'.repeat(friendshipCounter) + '♡'.repeat(3 - friendshipCounter);
            console.log(`  ${C.brightRed}Friendship  ${hearts}${C.reset}  (${friendshipCounter} / 3)${friendshipCounter >= 3 ? `  ${C.brightYellow}← bond formed!${C.reset}` : ''}`);
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
    console.log(`\n${HR_MAJOR}`);
    console.log(`  ${C.bold}${C.brightCyan}AXIOMANCER  —  Combat Simulator${C.reset}`);
    console.log(`  ${C.dim}${Player.name} (Lv.${Player.level})  vs  ${Disatree_01.name} (Lv.${Disatree_01.level})${C.reset}`);
    console.log(HR_MAJOR);

    console.log(`\n${C.bold}Rules${C.reset}`);
    console.log(`  ${typeColor('heart')} > ${typeColor('body')} > ${typeColor('mind')} > ${typeColor('heart')}  (type advantage cycle)`);
    console.log(`  Advantage → roll 2d20 keep ${C.brightGreen}HIGHER${C.reset}  |  Disadvantage → roll 2d20 keep ${C.brightRed}LOWER${C.reset}`);
    console.log(`  Defending → defense stat ×1.5`);
    console.log(`  Damage = attack roll − defense stat  (min 0)\n`);

    let state = initializeCombat(Player, Disatree_01);

    while (isCombatOngoing(state)) {
        state = await runCombatTurn(state);
    }

    /* ── End screen ─────────────────────────────────────────────────────── */
    console.log(`\n${HR_MAJOR}`);

    if (state.enemy.health <= 0) {
        console.log(`  ${C.brightGreen}${C.bold}VICTORY — you defeated the enemy!${C.reset}`);
    } else if (state.player.health <= 0) {
        console.log(`  ${C.brightRed}${C.bold}DEFEAT — you were overcome.${C.reset}`);
    } else if (state.friendshipCounter >= 3) {
        console.log(`  ${C.brightYellow}${C.bold}BOND FORMED — your enemy becomes an ally.${C.reset}`);
    }

    console.log(HR_MAJOR);
    console.log(`  ${C.bold}Final results${C.reset}`);
    console.log(`  Your HP    ${hpBar(state.player.health, state.player.maxHealth)}  ${Math.max(0, state.player.health)} / ${state.player.maxHealth}`);
    console.log(`  Enemy HP   ${hpBar(state.enemy.health,  state.enemy.enemyStats.maxHealth)}  ${Math.max(0, state.enemy.health)} / ${state.enemy.enemyStats.maxHealth}`);
    console.log(`  Rounds     ${state.round - 1}`);
    console.log(HR_MAJOR);
    console.log('');
}

main();
