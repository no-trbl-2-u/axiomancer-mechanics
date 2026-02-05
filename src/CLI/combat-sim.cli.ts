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
import { ActionType, Action } from '../Combat/types';
import { createCharacter } from '../Character';
import { Player } from '../Character/characters.mock';
import { EnemyLibrary, Disatree_01 } from '../Enemy/enemy.library';
import { determineAdvantage, determineEnemyAction } from '../Combat';
import { getEnemyRelatedStat } from '../Enemy';
import { createDieRoll, deepClone } from '../Utils';
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
// COMBAT STATE
// ============================================================================

interface SimCombatState {
    player: Character;
    enemy: Enemy;
    round: number;
    friendshipCounter: number;
    active: boolean;
    log: string[];
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
    console.log(`  ${boldCyan('Round')} ${bold(String(state.round))}`);
    console.log(divider());
    console.log('');

    // Player status
    console.log(`  ${boldGreen(state.player.name)} ${gray(`[Lv.${state.player.level}]`)}`);
    console.log(`  HP: ${healthBar(state.player.health, state.player.maxHealth)}`);
    console.log(`  MP: ${manaBar(state.player.mana, state.player.maxMana)}`);
    console.log(`  ${gray('Stats:')} ${red(`H:${state.player.baseStats.heart}`)} ${yellow(`B:${state.player.baseStats.body}`)} ${cyan(`M:${state.player.baseStats.mind}`)}`);
    console.log('');

    // VS
    console.log(`  ${gray('─────────')} ${boldRed('VS')} ${gray('─────────')}`);
    console.log('');

    // Enemy status
    console.log(`  ${boldRed(state.enemy.name)} ${gray(`[Lv.${state.enemy.level}]`)} ${dim(state.enemy.enemyTier ?? '')}`);
    console.log(`  HP: ${healthBar(state.enemy.health, state.enemy.enemyStats.maxHealth)}`);
    console.log(`  MP: ${manaBar(state.enemy.mana, state.enemy.enemyStats.maxMana)}`);
    console.log('');

    // Friendship counter
    if (state.friendshipCounter > 0) {
        const hearts = magenta('♥'.repeat(state.friendshipCounter));
        console.log(`  Friendship: ${hearts} ${gray(`(${state.friendshipCounter}/3)`)}`);
        console.log('');
    }

    console.log(divider());
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
    const newState = { ...state, round: state.round + 1 };

    // Enemy AI decision
    const enemyAction = determineEnemyAction(newState.enemy.logic);

    // Determine advantages
    const playerAdvantage = determineAdvantage(playerChoice.reactionType, enemyAction.type);
    const enemyAdvantage = determineAdvantage(enemyAction.type, playerChoice.reactionType);

    // Display choices
    console.log('');
    console.log(`  ${boldGreen('You')} chose ${formatType(playerChoice.reactionType)} ${bold(playerChoice.actionType)}`);
    await delay(600);
    console.log(`  ${boldRed(newState.enemy.name)} chose ${formatType(enemyAction.type)} ${bold(enemyAction.action)}`);
    await delay(600);
    console.log('');
    console.log(`  Your advantage: ${formatAdvantage(playerAdvantage)}`);
    console.log(`  Enemy advantage: ${formatAdvantage(enemyAdvantage)}`);
    await delay(800);
    console.log('');

    // ---- BOTH ATTACK ----
    if (playerChoice.actionType === 'attack' && enemyAction.action === 'attack') {
        const playerDieRoll = createDieRoll(playerAdvantage);
        const playerRollModifier = newState.player.baseStats[playerChoice.reactionType as keyof BaseStats];
        const playerRollTotal = playerDieRoll() + playerRollModifier;

        const enemyDieRoll = createDieRoll(enemyAdvantage);
        const enemyRollModifier = getEnemyRelatedStat(newState.enemy, enemyAction.type, false);
        const enemyRollTotal = enemyDieRoll() + enemyRollModifier;

        console.log(`  ${green('You')} roll: ${boldCyan(String(playerRollTotal))} ${dim(`(die + ${playerRollModifier} ${playerChoice.reactionType})`)}`);
        await delay(500);
        console.log(`  ${red(newState.enemy.name)} rolls: ${boldCyan(String(enemyRollTotal))} ${dim(`(die + ${enemyRollModifier} ${enemyAction.type})`)}`);
        await delay(800);
        console.log('');

        if (playerRollTotal > enemyRollTotal) {
            // Player wins the clash
            const damageRoll = playerDieRoll() + playerRollModifier;
            const enemyDef = getEnemyRelatedStat(newState.enemy, enemyAction.type, true);
            const damage = Math.max(1, damageRoll - enemyDef);
            newState.enemy = { ...newState.enemy, health: Math.max(0, newState.enemy.health - damage) };

            console.log(`  ${boldGreen('You win the clash!')} Dealing ${boldRed(String(damage))} damage!`);
            console.log(`  ${dim(`(${damageRoll} roll - ${enemyDef} defense = ${damage})`)}`);
        } else if (playerRollTotal < enemyRollTotal) {
            // Enemy wins the clash
            const damageRoll = enemyDieRoll() + enemyRollModifier;
            const playerDef = newState.player.baseStats[playerChoice.reactionType as keyof BaseStats];
            const damage = Math.max(1, damageRoll - playerDef);
            newState.player = { ...newState.player, health: Math.max(0, newState.player.health - damage) };

            console.log(`  ${boldRed(newState.enemy.name + ' wins the clash!')} You take ${boldRed(String(damage))} damage!`);
            console.log(`  ${dim(`(${damageRoll} roll - ${playerDef} defense = ${damage})`)}`);
        } else {
            console.log(`  ${boldYellow('Clash is a tie!')} Both attacks deflect!`);
        }
    }

    // ---- PLAYER ATTACKS, ENEMY DEFENDS ----
    else if (playerChoice.actionType === 'attack' && enemyAction.action === 'defend') {
        const playerDieRoll = createDieRoll(playerAdvantage);
        const playerRollModifier = newState.player.baseStats[playerChoice.reactionType as keyof BaseStats];
        const damageRoll = playerDieRoll() + playerRollModifier;
        const enemyDef = Math.ceil(getEnemyRelatedStat(newState.enemy, enemyAction.type, true) * 1.5);
        const damage = Math.max(0, damageRoll - enemyDef);
        newState.enemy = { ...newState.enemy, health: Math.max(0, newState.enemy.health - damage) };

        console.log(`  ${green('You attack!')} Roll: ${boldCyan(String(damageRoll))}`);
        console.log(`  ${red(newState.enemy.name)} braces ${dim(`(defense: ${enemyDef}, x1.5 for defending)`)}`);
        await delay(500);

        if (damage > 0) {
            console.log(`  You deal ${boldRed(String(damage))} damage through their guard!`);
        } else {
            console.log(`  ${yellow('Your attack is completely blocked!')}`);
        }
    }

    // ---- PLAYER DEFENDS, ENEMY ATTACKS ----
    else if (playerChoice.actionType === 'defend' && enemyAction.action === 'attack') {
        const enemyDieRoll = createDieRoll(enemyAdvantage);
        const enemyRollModifier = getEnemyRelatedStat(newState.enemy, enemyAction.type, false);
        const damageRoll = enemyDieRoll() + enemyRollModifier;
        const playerDef = Math.ceil(newState.player.baseStats[playerChoice.reactionType as keyof BaseStats] * 1.5);
        const damage = Math.max(0, damageRoll - playerDef);
        newState.player = { ...newState.player, health: Math.max(0, newState.player.health - damage) };

        console.log(`  ${red(newState.enemy.name)} attacks! Roll: ${boldCyan(String(damageRoll))}`);
        console.log(`  ${green('You brace')} ${dim(`(defense: ${playerDef}, x1.5 for defending)`)}`);
        await delay(500);

        if (damage > 0) {
            console.log(`  You take ${boldRed(String(damage))} damage through your guard!`);
        } else {
            console.log(`  ${boldGreen('You block the attack completely!')}`);
        }
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
        log: [],
    };

    console.log(narration(`${state.enemy.name} blocks your path. ${state.enemy.description}`));
    await delay(1000);

    while (state.active) {
        displayCombatStatus(state);

        const playerChoice = await playerTurn();
        state = await resolveCombatRound(state, playerChoice);

        // Check end conditions
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
