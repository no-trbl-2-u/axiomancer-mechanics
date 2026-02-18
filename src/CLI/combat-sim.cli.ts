#!/usr/bin/env node

/**
 * Combat Simulator CLI
 *
 * An interactive combat simulator that allows the player to:
 * - Select or create a character
 * - Choose an enemy from the library
 * - Engage in turn-based combat with the Heart > Body > Mind advantage system
 *
 * Usage: npm run combat:sim
 */

import inquirer from 'inquirer';
import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { ActionType, Action, Advantage } from '../Combat/types';
import { createCharacter } from '../Character';
import { Player } from '../Character/characters.mock';
import { EnemyLibrary, Disatree_01 } from '../Enemy/enemy.library';
import { determineAdvantage, determineEnemyAction } from '../Combat';
import { getEnemyRelatedStat } from '../Enemy';
import { deepClone, randomInt } from '../Utils';
import { BaseStats } from '../Character/types';
import {
    COMBAT_ART,
    VICTORY_ART,
    GAME_OVER_ART,
    divider,
    boxHeader,
    healthBar,
    manaBar,
    narration,
    formatType,
    formatAdvantage,
    delay,
    clearScreen,
    typeTriangle,
    bold,
    dim,
    red,
    green,
    yellow,
    cyan,
    gray,
    magenta,
    boldRed,
    boldGreen,
    boldYellow,
    boldCyan,
    boldMagenta,
} from './display';

// ============================================================================
// DICE ROLLING WITH FULL DETAIL
// ============================================================================

interface DiceResult {
    rolls: number[];
    selected: number;
    modifier: number;
    total: number;
}

/**
 * Rolls combat dice with advantage/disadvantage, returning full details.
 * - advantage: 2d20 take highest + modifier
 * - disadvantage: 2d20 take lowest + modifier
 * - neutral: 1d20 + modifier
 */
function rollCombatDice(advantage: Advantage, modifier: number): DiceResult {
    const rollCount = advantage === 'neutral' ? 1 : 2;
    const rolls = Array.from({ length: rollCount }, () => randomInt(1, 20));

    let selected: number;
    if (advantage === 'advantage') {
        selected = Math.max(...rolls);
    } else if (advantage === 'disadvantage') {
        selected = Math.min(...rolls);
    } else {
        selected = rolls[0];
    }

    return { rolls, selected, modifier, total: selected + modifier };
}

/**
 * Formats a DiceResult into a readable log line.
 * Shows the individual d20 rolls, which was selected, the modifier, and total.
 */
function formatDiceLog(result: DiceResult, advantage: Advantage, statLabel: string): string {
    const { rolls, selected, modifier, total } = result;

    if (rolls.length === 1) {
        return `[d20: ${boldCyan(String(selected))}] + ${modifier} ${dim(statLabel)} = ${bold(String(total))}`;
    }

    const rollsStr = rolls
        .map(r => (r === selected ? boldCyan(String(r)) : dim(String(r))))
        .join(', ');
    const pickLabel = advantage === 'advantage' ? green('take high') : red('take low');
    return `[2d20: ${rollsStr} → ${pickLabel} ${boldCyan(String(selected))}] + ${modifier} ${dim(statLabel)} = ${bold(String(total))}`;
}

// ============================================================================
// COMBAT STATE
// ============================================================================

interface SimCombatState {
    player: Character;
    enemy: Enemy;
    round: number;
    friendshipCounter: number;
    active: boolean;
}

// ============================================================================
// ENEMY REGISTRY (flatten library for selection)
// ============================================================================

function getAllEnemies(): Enemy[] {
    const enemies: Enemy[] = [];
    for (const region of Object.values(EnemyLibrary)) {
        for (const enemy of region) {
            enemies.push(enemy);
        }
    }
    return enemies;
}

// ============================================================================
// CHARACTER SETUP
// ============================================================================

async function selectOrCreateCharacter(): Promise<Character> {
    const { choice } = await inquirer.prompt<{ choice: string }>([
        {
            type: 'list',
            name: 'choice',
            message: 'How would you like to set up your character?',
            choices: [
                { name: 'Use default character (Player)', value: 'default' },
                { name: 'Create a custom character', value: 'custom' },
            ],
        },
    ]);

    if (choice === 'default') {
        return deepClone(Player);
    }

    const answers = await inquirer.prompt<{
        name: string;
        level: number;
        heart: number;
        body: number;
        mind: number;
    }>([
        {
            type: 'input',
            name: 'name',
            message: `${cyan('Name')} your character:`,
            validate: (input: string) => {
                const trimmed = input.trim();
                if (trimmed.length === 0) return 'Name cannot be empty';
                if (trimmed.length > 50) return 'Name must be 50 characters or less';
                return true;
            },
        },
        {
            type: 'number',
            name: 'level',
            message: `Character ${cyan('level')} (1-20):`,
            default: 1,
            validate: (input: number) => {
                if (!Number.isInteger(input) || input < 1 || input > 20) {
                    return 'Level must be between 1 and 20';
                }
                return true;
            },
        },
        {
            type: 'number',
            name: 'heart',
            message: `${red('Heart')} stat (1-10):`,
            default: 3,
            validate: (input: number) => {
                if (!Number.isInteger(input) || input < 1 || input > 10) {
                    return 'Stat must be between 1 and 10';
                }
                return true;
            },
        },
        {
            type: 'number',
            name: 'body',
            message: `${yellow('Body')} stat (1-10):`,
            default: 3,
            validate: (input: number) => {
                if (!Number.isInteger(input) || input < 1 || input > 10) {
                    return 'Stat must be between 1 and 10';
                }
                return true;
            },
        },
        {
            type: 'number',
            name: 'mind',
            message: `${cyan('Mind')} stat (1-10):`,
            default: 3,
            validate: (input: number) => {
                if (!Number.isInteger(input) || input < 1 || input > 10) {
                    return 'Stat must be between 1 and 10';
                }
                return true;
            },
        },
    ]);

    return createCharacter({
        name: answers.name.trim(),
        level: answers.level,
        baseStats: {
            heart: answers.heart,
            body: answers.body,
            mind: answers.mind,
        },
    });
}

// ============================================================================
// ENEMY SELECTION
// ============================================================================

async function selectEnemy(): Promise<Enemy> {
    const enemies = getAllEnemies();

    if (enemies.length === 0) {
        console.log(yellow('  No enemies in the library. Using default Disatree.'));
        return deepClone(Disatree_01);
    }

    const { enemyId } = await inquirer.prompt<{ enemyId: string }>([
        {
            type: 'list',
            name: 'enemyId',
            message: 'Choose an enemy to fight:',
            choices: enemies.map(e => ({
                name: `${e.name} ${gray(`[Lv.${e.level}]`)} ${dim(e.description)} ${gray(`(HP: ${e.health})`)}`,
                value: e.id,
            })),
        },
    ]);

    const selected = enemies.find(e => e.id === enemyId);
    return deepClone(selected ?? Disatree_01);
}

// ============================================================================
// COMBAT DISPLAY
// ============================================================================

function displayCombatStatus(state: SimCombatState): void {
    console.log('');
    console.log(divider());
    console.log(`  ${boldCyan('Round')} ${bold(String(state.round + 1))}`);
    console.log(divider());
    console.log('');

    console.log(`  ${boldGreen(state.player.name)} ${gray(`[Lv.${state.player.level}]`)}`);
    console.log(`  HP: ${healthBar(state.player.health, state.player.maxHealth)}`);
    console.log(`  MP: ${manaBar(state.player.mana, state.player.maxMana)}`);
    console.log(`  ${gray('Stats:')} ${red(`H:${state.player.baseStats.heart}`)} ${yellow(`B:${state.player.baseStats.body}`)} ${cyan(`M:${state.player.baseStats.mind}`)}`);
    console.log('');

    console.log(`  ${gray('─────────')} ${boldRed('VS')} ${gray('─────────')}`);
    console.log('');

    console.log(`  ${boldRed(state.enemy.name)} ${gray(`[Lv.${state.enemy.level}]`)} ${dim(state.enemy.enemyTier ?? '')}`);
    console.log(`  HP: ${healthBar(state.enemy.health, state.enemy.enemyStats.maxHealth)}`);
    console.log(`  MP: ${manaBar(state.enemy.mana, state.enemy.enemyStats.maxMana)}`);
    console.log('');

    if (state.friendshipCounter > 0) {
        const hearts = magenta('♥'.repeat(state.friendshipCounter));
        console.log(`  Friendship: ${hearts} ${gray(`(${state.friendshipCounter}/3)`)}`);
        console.log('');
    }

    console.log(divider());
}

/**
 * Logs the HP bars for both combatants after damage has been applied.
 */
function displayPostDamageHP(state: SimCombatState): void {
    console.log('');
    console.log(`  ${green(state.player.name)} HP: ${healthBar(state.player.health, state.player.maxHealth)}`);
    console.log(`  ${red(state.enemy.name)}  HP: ${healthBar(state.enemy.health, state.enemy.enemyStats.maxHealth)}`);
}

// ============================================================================
// COMBAT TURN
// ============================================================================

async function playerTurn(): Promise<{ reactionType: ActionType; actionType: Action }> {
    console.log(typeTriangle());

    const answers = await inquirer.prompt<{
        reactionType: ActionType;
        actionType: Action;
    }>([
        {
            type: 'list',
            name: 'reactionType',
            message: 'Choose your approach:',
            choices: [
                { name: `${red('Heart')}  ${dim('- Emotion, willpower, charisma')}`, value: 'heart' },
                { name: `${yellow('Body')}   ${dim('- Physical strength, constitution')}`, value: 'body' },
                { name: `${cyan('Mind')}   ${dim('- Intelligence, reflexes, perception')}`, value: 'mind' },
            ],
        },
        {
            type: 'list',
            name: 'actionType',
            message: 'Choose your action:',
            choices: [
                { name: `${'Attack'}  ${dim('- Strike your opponent')}`, value: 'attack' },
                { name: `${'Defend'}  ${dim('- Brace for incoming damage')}`, value: 'defend' },
            ],
        },
    ]);

    return answers;
}

async function resolveCombatRound(
    state: SimCombatState,
    playerChoice: { reactionType: ActionType; actionType: Action }
): Promise<SimCombatState> {
    const newState: SimCombatState = {
        ...state,
        round: state.round + 1,
        player: { ...state.player },
        enemy: { ...state.enemy },
    };

    const enemyAction = determineEnemyAction(newState.enemy.logic);
    const playerAdvantage = determineAdvantage(playerChoice.reactionType, enemyAction.type);

    // Display choices
    console.log('');
    console.log(`  ${boldGreen('You')} chose ${formatType(playerChoice.reactionType)} ${bold(playerChoice.actionType)}`);
    await delay(600);
    console.log(`  ${boldRed(newState.enemy.name)} chose ${formatType(enemyAction.type)} ${bold(enemyAction.action)}`);
    await delay(600);

    // Single-line matchup display from the player's perspective
    console.log('');
    console.log(`  ${formatType(playerChoice.reactionType)} vs ${formatType(enemyAction.type)}: ${formatAdvantage(playerAdvantage)}`);
    if (playerAdvantage === 'advantage') {
        console.log(`  ${dim('You roll 2d20 and take the higher result')}`);
    } else if (playerAdvantage === 'disadvantage') {
        console.log(`  ${dim('You roll 2d20 and take the lower result')}`);
    } else {
        console.log(`  ${dim('Both sides roll 1d20 normally')}`);
    }
    await delay(800);
    console.log('');

    // The enemy's advantage is the inverse of the player's
    const enemyAdvantage: Advantage =
        playerAdvantage === 'advantage' ? 'disadvantage' :
        playerAdvantage === 'disadvantage' ? 'advantage' : 'neutral';

    // ---- BOTH ATTACK ----
    if (playerChoice.actionType === 'attack' && enemyAction.action === 'attack') {
        const playerMod = newState.player.baseStats[playerChoice.reactionType as keyof BaseStats];
        const enemyMod = getEnemyRelatedStat(newState.enemy, enemyAction.type, false);

        const playerRoll = rollCombatDice(playerAdvantage, playerMod);
        const enemyRoll = rollCombatDice(enemyAdvantage, enemyMod);

        console.log(`  ${green('You')} roll: ${formatDiceLog(playerRoll, playerAdvantage, playerChoice.reactionType)}`);
        await delay(500);
        console.log(`  ${red(newState.enemy.name)} rolls: ${formatDiceLog(enemyRoll, enemyAdvantage, enemyAction.type)}`);
        await delay(800);
        console.log('');

        if (playerRoll.total > enemyRoll.total) {
            const dmgRoll = rollCombatDice(playerAdvantage, playerMod);
            const enemyDef = getEnemyRelatedStat(newState.enemy, enemyAction.type, true);
            const damage = Math.max(1, dmgRoll.total - enemyDef);
            newState.enemy.health = Math.max(0, newState.enemy.health - damage);

            console.log(`  ${boldGreen('You win the clash!')}`);
            console.log(`  Damage roll: ${formatDiceLog(dmgRoll, playerAdvantage, playerChoice.reactionType)}`);
            console.log(`  ${dim(`${dmgRoll.total} - ${enemyDef} defense`)} = ${boldRed(String(damage))} damage`);
        } else if (playerRoll.total < enemyRoll.total) {
            const dmgRoll = rollCombatDice(enemyAdvantage, enemyMod);
            const playerDef = newState.player.baseStats[playerChoice.reactionType as keyof BaseStats];
            const damage = Math.max(1, dmgRoll.total - playerDef);
            newState.player.health = Math.max(0, newState.player.health - damage);

            console.log(`  ${boldRed(newState.enemy.name + ' wins the clash!')}`);
            console.log(`  Damage roll: ${formatDiceLog(dmgRoll, enemyAdvantage, enemyAction.type)}`);
            console.log(`  ${dim(`${dmgRoll.total} - ${playerDef} defense`)} = ${boldRed(String(damage))} damage to you`);
        } else {
            console.log(`  ${boldYellow('Clash is a tie!')} Both attacks deflect!`);
        }

        displayPostDamageHP(newState);
    }

    // ---- PLAYER ATTACKS, ENEMY DEFENDS ----
    else if (playerChoice.actionType === 'attack' && enemyAction.action === 'defend') {
        const playerMod = newState.player.baseStats[playerChoice.reactionType as keyof BaseStats];
        const dmgRoll = rollCombatDice(playerAdvantage, playerMod);
        const enemyDef = Math.ceil(getEnemyRelatedStat(newState.enemy, enemyAction.type, true) * 1.5);
        const damage = Math.max(0, dmgRoll.total - enemyDef);
        newState.enemy.health = Math.max(0, newState.enemy.health - damage);

        console.log(`  ${green('You attack!')} Roll: ${formatDiceLog(dmgRoll, playerAdvantage, playerChoice.reactionType)}`);
        console.log(`  ${red(newState.enemy.name)} defends ${dim(`(defense: ${enemyDef}, x1.5 for defending)`)}`);
        await delay(500);

        if (damage > 0) {
            console.log(`  ${dim(`${dmgRoll.total} - ${enemyDef} defense`)} = ${boldRed(String(damage))} damage through their guard!`);
        } else {
            console.log(`  ${yellow('Your attack is completely blocked!')}`);
        }

        displayPostDamageHP(newState);
    }

    // ---- PLAYER DEFENDS, ENEMY ATTACKS ----
    else if (playerChoice.actionType === 'defend' && enemyAction.action === 'attack') {
        const enemyMod = getEnemyRelatedStat(newState.enemy, enemyAction.type, false);
        const dmgRoll = rollCombatDice(enemyAdvantage, enemyMod);
        const playerDef = Math.ceil(newState.player.baseStats[playerChoice.reactionType as keyof BaseStats] * 1.5);
        const damage = Math.max(0, dmgRoll.total - playerDef);
        newState.player.health = Math.max(0, newState.player.health - damage);

        console.log(`  ${red(newState.enemy.name)} attacks! Roll: ${formatDiceLog(dmgRoll, enemyAdvantage, enemyAction.type)}`);
        console.log(`  ${green('You brace')} ${dim(`(defense: ${playerDef}, x1.5 for defending)`)}`);
        await delay(500);

        if (damage > 0) {
            console.log(`  ${dim(`${dmgRoll.total} - ${playerDef} defense`)} = ${boldRed(String(damage))} damage to you through your guard!`);
        } else {
            console.log(`  ${boldGreen('You block the attack completely!')}`);
        }

        displayPostDamageHP(newState);
    }

    // ---- BOTH DEFEND ----
    else if (playerChoice.actionType === 'defend' && enemyAction.action === 'defend') {
        newState.friendshipCounter += 1;
        console.log(
            narration(
                'A strange calm falls over the battlefield. Both combatants lower their guard, ' +
                'and for a brief moment, understanding flickers between foes.'
            )
        );
        const hearts = magenta('♥'.repeat(newState.friendshipCounter));
        console.log(`  ${magenta('Friendship grows!')} ${hearts} ${gray(`(${newState.friendshipCounter}/3)`)}`);
    }

    await delay(800);
    return newState;
}

// ============================================================================
// COMBAT LOOP
// ============================================================================

async function runCombat(player: Character, enemy: Enemy): Promise<void> {
    let state: SimCombatState = {
        player: deepClone(player),
        enemy: deepClone(enemy),
        round: 0,
        friendshipCounter: 0,
        active: true,
    };

    console.log(narration(`${state.enemy.name} blocks your path. ${state.enemy.description}`));
    await delay(1000);

    while (state.active) {
        displayCombatStatus(state);

        const playerChoice = await playerTurn();
        state = await resolveCombatRound(state, playerChoice);

        if (state.enemy.health <= 0) {
            console.log('');
            console.log(VICTORY_ART);
            console.log(`  ${boldGreen(`${state.enemy.name} has been defeated!`)}`);
            console.log(`  Combat lasted ${bold(String(state.round))} rounds.`);
            state.active = false;
        } else if (state.player.health <= 0) {
            console.log('');
            console.log(GAME_OVER_ART);
            console.log(`  ${boldRed('You have been defeated...')}`);
            console.log(`  Combat lasted ${bold(String(state.round))} rounds.`);
            state.active = false;
        } else if (state.friendshipCounter >= 3) {
            console.log('');
            console.log(
                narration(
                    'The fighting stops. A deep bond of understanding has formed between you and ' +
                    state.enemy.name +
                    '. Perhaps not all conflicts need a violent resolution.'
                )
            );
            console.log(`  ${magenta('♥♥♥')} ${boldMagenta('Friendship Victory!')} ${magenta('♥♥♥')}`);
            state.active = false;
        }
    }

    console.log('');
    console.log(divider());
}

// ============================================================================
// POST-COMBAT MENU
// ============================================================================

async function postCombatMenu(): Promise<boolean> {
    const { action } = await inquirer.prompt<{ action: string }>([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                { name: 'Fight again', value: 'again' },
                { name: 'Exit simulator', value: 'exit' },
            ],
        },
    ]);

    return action === 'again';
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
    clearScreen();
    console.log(COMBAT_ART);
    console.log(boxHeader('COMBAT SIMULATOR'));
    console.log('');
    console.log(dim('  Simulate combat encounters between characters and enemies.'));
    console.log(dim('  Test the Heart > Body > Mind advantage system.'));
    console.log('');
    console.log(divider());

    let running = true;

    while (running) {
        console.log('');
        const player = await selectOrCreateCharacter();
        console.log('');
        console.log(`  ${boldGreen('Character ready:')} ${bold(player.name)} ${gray(`(Lv.${player.level})`)}`);
        console.log(`  ${gray('Stats:')} ${red(`Heart:${player.baseStats.heart}`)} ${yellow(`Body:${player.baseStats.body}`)} ${cyan(`Mind:${player.baseStats.mind}`)}`);
        console.log(`  ${gray('HP:')} ${player.maxHealth} ${gray('MP:')} ${player.maxMana}`);
        console.log('');

        const enemy = await selectEnemy();
        console.log('');
        console.log(`  ${boldRed('Enemy chosen:')} ${bold(enemy.name)} ${gray(`(Lv.${enemy.level})`)}`);
        console.log(`  ${dim(enemy.description)}`);
        console.log('');

        await delay(500);
        console.log(bold('  Entering combat...'));
        await delay(1000);

        await runCombat(player, enemy);

        running = await postCombatMenu();
    }

    console.log('');
    console.log(dim('  Thanks for using the Combat Simulator!'));
    console.log('');
}

main().catch(console.error);
