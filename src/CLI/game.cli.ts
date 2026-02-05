#!/usr/bin/env node

/**
 * Axiomancer - Main Game CLI
 *
 * The main entry point for the Axiomancer game experience.
 * Features:
 * - New game / Continue game
 * - Character creation with the Heart/Body/Mind stat system
 * - World exploration through map nodes
 * - Combat encounters using the type advantage system
 * - Save/load game state
 *
 * Usage: npm run game
 */

import inquirer from 'inquirer';
import { Character } from '../Character/types';
import { createCharacter } from '../Character';
import { GameState } from '../Game/types';
import { loadGameState, saveGameState } from '../Game/game.reducer';
import { createStartingWorld } from '../World';
import { EnemyLibrary, Disatree_01 } from '../Enemy/enemy.library';
import { Enemy } from '../Enemy/types';
import { ActionType, Action } from '../Combat/types';
import { determineAdvantage, determineEnemyAction } from '../Combat';
import { getEnemyRelatedStat } from '../Enemy';
import { createDieRoll, deepClone, randomInt } from '../Utils';
import { BaseStats } from '../Character/types';
import {
    TITLE_ART,
    COMBAT_ART,
    VICTORY_ART,
    GAME_OVER_ART,
    divider,
    boxHeader,
    healthBar,
    manaBar,
    statLine,
    narration,
    formatType,
    formatAdvantage,
    delay,
    typewriter,
    clearScreen,
    typeTriangle,
    bold,
    dim,
    red,
    green,
    yellow,
    blue,
    cyan,
    gray,
    white,
    magenta,
    boldRed,
    boldGreen,
    boldYellow,
    boldBlue,
    boldCyan,
    boldMagenta,
} from './display';

// ============================================================================
// GAME SESSION STATE
// ============================================================================

interface GameSession {
    gameState: GameState;
    isRunning: boolean;
}

// ============================================================================
// INTRO / TITLE SCREEN
// ============================================================================

async function titleScreen(): Promise<string> {
    clearScreen();
    console.log(TITLE_ART);
    console.log('');
    console.log(dim('  A turn-based strategy RPG where players embark on a journey'));
    console.log(dim('  to discover their true identity and the secrets behind the veil.'));
    console.log('');
    console.log(divider());
    console.log('');

    const { action } = await inquirer.prompt<{ action: string }>([
        {
            type: 'list',
            name: 'action',
            message: 'Welcome, traveler. What will you do?',
            choices: [
                { name: `${boldGreen('New Game')}      ${dim('- Begin a new journey')}`, value: 'new' },
                { name: `${boldBlue('Continue')}       ${dim('- Load your saved adventure')}`, value: 'continue' },
                { name: `${boldCyan('About')}          ${dim('- Learn about Axiomancer')}`, value: 'about' },
                new inquirer.Separator(),
                { name: `${gray('Exit')}`, value: 'exit' },
            ],
        },
    ]);

    return action;
}

async function showAbout(): Promise<void> {
    clearScreen();
    console.log(TITLE_ART);
    console.log(boxHeader('ABOUT AXIOMANCER'));
    console.log('');
    console.log(white('  Axiomancer is a turn-based strategy RPG where players control'));
    console.log(white('  a character who embarks on a journey to discover their true'));
    console.log(white('  identity and the secrets behind the veil.'));
    console.log('');
    console.log(gray('  After the king loses their advisor and opens the gates of'));
    console.log(gray('  the city to find their successor, the player must navigate'));
    console.log(gray('  the challenges of the labyrinth to reach the heart of the'));
    console.log(gray('  city and become the new advisor.'));
    console.log('');
    console.log(divider());
    console.log('');
    console.log(boldCyan('  COMBAT SYSTEM'));
    console.log(typeTriangle());
    console.log(gray('  Each turn, both player and enemy choose an approach:'));
    console.log(gray('  Heart, Body, or Mind. Advantages give stronger rolls.'));
    console.log(gray('  Choose to Attack or Defend each round.'));
    console.log('');
    console.log(divider());
    console.log('');
    console.log(boldMagenta('  SKILLS'));
    console.log(gray('  Skills are named after logical fallacies and paradoxes.'));
    console.log(gray('  Each scales with one of the three core aspects.'));
    console.log('');
    console.log(boldYellow('  EFFECTS'));
    console.log(gray('  Buffs and debuffs are themed around philosophical concepts,'));
    console.log(gray('  from Zeno\'s paradoxes to Schrodinger\'s cat.'));
    console.log('');
    console.log(divider());

    await inquirer.prompt([
        {
            type: 'input',
            name: 'continue',
            message: dim('Press Enter to return...'),
        },
    ]);
}

// ============================================================================
// CHARACTER CREATION
// ============================================================================

async function characterCreation(): Promise<Character> {
    clearScreen();
    console.log(TITLE_ART);
    console.log(boxHeader('CHARACTER CREATION'));
    console.log('');

    await typewriter('  The wind howls through the fishing village as you wake.', 25);
    await typewriter('  Salt stings your eyes. The sound of waves crashing.', 25);
    await typewriter('  Who are you?', 40);
    console.log('');

    const { name } = await inquirer.prompt<{ name: string }>([
        {
            type: 'input',
            name: 'name',
            message: `What is your ${cyan('name')}, traveler?`,
            validate: (input: string) => {
                const trimmed = input.trim();
                if (trimmed.length === 0) return 'You must have a name.';
                if (trimmed.length > 30) return 'A name longer than 30 characters? Try again.';
                return true;
            },
        },
    ]);

    console.log('');
    await typewriter(`  ${name.trim()}... The name echoes in your mind.`, 25);
    await typewriter('  You feel something stir within you. Three forces pull at your soul.', 25);
    console.log('');

    console.log(divider());
    console.log('');
    console.log(boldCyan('  DISTRIBUTE YOUR ATTRIBUTES'));
    console.log(dim('  You have 10 points to distribute among Heart, Body, and Mind.'));
    console.log(dim('  Each stat must be at least 1.'));
    console.log('');
    console.log(`  ${red('Heart')}  - Emotion, willpower, and charisma`);
    console.log(`  ${yellow('Body')}   - Physical strength and constitution`);
    console.log(`  ${cyan('Mind')}   - Intelligence, reflexes, and perception`);
    console.log('');

    let validStats = false;
    let heart = 3, body = 3, mind = 3;

    while (!validStats) {
        const stats = await inquirer.prompt<{
            heart: number;
            body: number;
            mind: number;
        }>([
            {
                type: 'number',
                name: 'heart',
                message: `${red('Heart')} (1-8):`,
                default: 4,
                validate: (input: number) => {
                    if (!Number.isInteger(input) || input < 1 || input > 8) {
                        return 'Must be between 1 and 8';
                    }
                    return true;
                },
            },
            {
                type: 'number',
                name: 'body',
                message: `${yellow('Body')} (1-8):`,
                default: 3,
                validate: (input: number) => {
                    if (!Number.isInteger(input) || input < 1 || input > 8) {
                        return 'Must be between 1 and 8';
                    }
                    return true;
                },
            },
            {
                type: 'number',
                name: 'mind',
                message: `${cyan('Mind')} (1-8):`,
                default: 3,
                validate: (input: number) => {
                    if (!Number.isInteger(input) || input < 1 || input > 8) {
                        return 'Must be between 1 and 8';
                    }
                    return true;
                },
            },
        ]);

        const total = stats.heart + stats.body + stats.mind;
        if (total !== 10) {
            console.log(yellow(`  Points must total 10. You used ${total}. Try again.`));
        } else {
            heart = stats.heart;
            body = stats.body;
            mind = stats.mind;
            validStats = true;
        }
    }

    const character = createCharacter({
        name: name.trim(),
        level: 1,
        baseStats: { heart, body, mind },
    });

    console.log('');
    console.log(divider());
    console.log(boldGreen('  CHARACTER CREATED'));
    console.log(divider());
    console.log(statLine('Name', character.name));
    console.log(statLine('Level', character.level));
    console.log(statLine('Health', `${character.health}/${character.maxHealth}`));
    console.log(statLine('Mana', `${character.mana}/${character.maxMana}`));
    console.log(statLine('Heart', character.baseStats.heart));
    console.log(statLine('Body', character.baseStats.body));
    console.log(statLine('Mind', character.baseStats.mind));
    console.log(divider());
    console.log('');

    await typewriter('  The world awaits. Your journey begins now.', 30);
    await delay(1000);

    return character;
}

// ============================================================================
// WORLD EXPLORATION
// ============================================================================

async function displayWorldStatus(session: GameSession): Promise<void> {
    const { world } = session.gameState;
    const map = world.currentMap;

    console.log('');
    console.log(divider());
    console.log(`  ${boldCyan('Location:')} ${bold(map.name)} ${dim(`[${map.continent}]`)}`);
    console.log(`  ${dim(map.description)}`);
    console.log(divider());
    console.log('');

    // Player status bar
    const player = session.gameState.player;
    console.log(`  ${boldGreen(player.name)} ${gray(`Lv.${player.level}`)}`);
    console.log(`  HP: ${healthBar(player.health, player.maxHealth)}  MP: ${manaBar(player.mana, player.maxMana)}`);
    console.log('');
}

async function explorationMenu(): Promise<string> {
    const choices = [
        { name: `${cyan('Explore')}       ${dim('- Move to a new area')}`, value: 'explore' },
        { name: `${yellow('Character')}     ${dim('- View your stats')}`, value: 'character' },
        { name: `${magenta('Inventory')}     ${dim('- Check your items')}`, value: 'inventory' },
        { name: `${blue('Save Game')}     ${dim('- Save your progress')}`, value: 'save' },
        new inquirer.Separator(),
        { name: `${gray('Quit to Title')}`, value: 'quit' },
    ];

    const { action } = await inquirer.prompt<{ action: string }>([
        {
            type: 'list',
            name: 'action',
            message: 'What will you do?',
            choices,
        },
    ]);

    return action;
}

async function handleExplore(session: GameSession): Promise<GameSession> {
    const map = session.gameState.world.currentMap;
    const availableNodes = map.availableNodes;

    if (availableNodes.length === 0) {
        console.log(yellow('  No more areas to explore on this map.'));
        return session;
    }

    const { nodeId } = await inquirer.prompt<{ nodeId: string }>([
        {
            type: 'list',
            name: 'nodeId',
            message: 'Where would you like to go?',
            choices: availableNodes.map(n => ({
                name: `Node ${bold(n)} ${dim('- Unknown territory')}`,
                value: n,
            })),
        },
    ]);

    console.log('');
    await typewriter(`  You venture toward ${nodeId}...`, 25);
    await delay(500);

    // Random event: encounter, treasure, nothing
    const eventRoll = randomInt(1, 6);

    if (eventRoll <= 3) {
        // Combat encounter!
        console.log('');
        console.log(boldRed('  An enemy appears!'));
        await delay(500);

        const enemy = getRandomEnemy();
        session = await runGameCombat(session, enemy);
    } else if (eventRoll === 4) {
        // Find something
        console.log('');
        await typewriter('  You find a quiet clearing. Nothing seems dangerous here.', 25);
        await typewriter('  You rest for a moment, recovering your strength.', 25);
        const healAmount = randomInt(5, 15);
        const newHealth = Math.min(
            session.gameState.player.health + healAmount,
            session.gameState.player.maxHealth
        );
        session = {
            ...session,
            gameState: {
                ...session.gameState,
                player: {
                    ...session.gameState.player,
                    health: newHealth,
                },
            },
        };
        console.log(green(`  You recover ${healAmount} HP. (${newHealth}/${session.gameState.player.maxHealth})`));
    } else {
        // Story event
        const storyEvents = [
            'You find old carvings on a stone. They speak of an advisor who once guided the king.',
            'A faint melody drifts on the wind. It feels familiar, though you cannot place it.',
            'Footprints in the mud. Someone passed through here recently.',
            'You discover a weathered signpost pointing deeper into the wilderness.',
            'The air grows thick with the scent of wildflowers. A peaceful moment.',
        ];
        const event = storyEvents[randomInt(0, storyEvents.length - 1)];
        console.log('');
        console.log(narration(event));
    }

    // Mark node as completed and remove from available
    const updatedMap = {
        ...map,
        completedNodes: [...map.completedNodes, nodeId],
        availableNodes: map.availableNodes.filter(n => n !== nodeId),
    };

    session = {
        ...session,
        gameState: {
            ...session.gameState,
            world: {
                ...session.gameState.world,
                currentMap: updatedMap,
            },
        },
    };

    await delay(800);
    return session;
}

function getRandomEnemy(): Enemy {
    const allEnemies: Enemy[] = [];
    for (const region of Object.values(EnemyLibrary)) {
        for (const enemy of region) {
            allEnemies.push(enemy);
        }
    }
    if (allEnemies.length === 0) return deepClone(Disatree_01);
    return deepClone(allEnemies[randomInt(0, allEnemies.length - 1)]);
}

async function showCharacterSheet(session: GameSession): Promise<void> {
    const player = session.gameState.player;

    console.log('');
    console.log(boxHeader('CHARACTER SHEET'));
    console.log('');
    console.log(statLine('Name', player.name));
    console.log(statLine('Level', player.level));
    console.log(statLine('Experience', `${player.experience}/${player.experienceToNextLevel}`));
    console.log('');
    console.log(`  ${bold('Resources')}`);
    console.log(`  HP: ${healthBar(player.health, player.maxHealth)}`);
    console.log(`  MP: ${manaBar(player.mana, player.maxMana)}`);
    console.log('');
    console.log(`  ${bold('Base Stats')}`);
    console.log(statLine('Heart', player.baseStats.heart));
    console.log(statLine('Body', player.baseStats.body));
    console.log(statLine('Mind', player.baseStats.mind));
    console.log('');
    console.log(`  ${bold('Derived Stats')}`);
    console.log(statLine('Physical Skill', player.derivedStats.physicalSkill));
    console.log(statLine('Physical Defense', player.derivedStats.physicalDefense));
    console.log(statLine('Mental Skill', player.derivedStats.mentalSkill));
    console.log(statLine('Mental Defense', player.derivedStats.mentalDefense));
    console.log(statLine('Emotional Skill', player.derivedStats.emotionalSkill));
    console.log(statLine('Emotional Defense', player.derivedStats.emotionalDefense));
    console.log(statLine('Luck', player.derivedStats.luck));
    console.log('');
    console.log(divider());

    await inquirer.prompt([
        { type: 'input', name: 'continue', message: dim('Press Enter to return...') },
    ]);
}

async function showInventory(session: GameSession): Promise<void> {
    const items = session.gameState.player.inventory;

    console.log('');
    console.log(boxHeader('INVENTORY'));
    console.log('');

    if (items.length === 0) {
        console.log(gray('  Your bags are empty.'));
    } else {
        for (const item of items) {
            console.log(`  ${cyan(item.name)} ${gray(`[${item.category}]`)} ${dim(item.description)}`);
        }
    }

    console.log('');
    console.log(divider());

    await inquirer.prompt([
        { type: 'input', name: 'continue', message: dim('Press Enter to return...') },
    ]);
}

// ============================================================================
// IN-GAME COMBAT
// ============================================================================

async function runGameCombat(session: GameSession, enemy: Enemy): Promise<GameSession> {
    let player = deepClone(session.gameState.player);
    let currentEnemy = deepClone(enemy);
    let round = 0;
    let friendshipCounter = 0;
    let combatActive = true;

    console.log('');
    console.log(COMBAT_ART);
    console.log(narration(`${currentEnemy.name} blocks your path. ${currentEnemy.description}`));
    await delay(800);

    while (combatActive) {
        round++;

        // Status display
        console.log('');
        console.log(divider());
        console.log(`  ${boldCyan('Round')} ${bold(String(round))}`);
        console.log(divider());
        console.log(`  ${boldGreen(player.name)}: HP ${healthBar(player.health, player.maxHealth)}`);
        console.log(`  ${boldRed(currentEnemy.name)}: HP ${healthBar(currentEnemy.health, currentEnemy.enemyStats.maxHealth)}`);
        if (friendshipCounter > 0) {
            console.log(`  Friendship: ${magenta('♥'.repeat(friendshipCounter))} ${gray(`(${friendshipCounter}/3)`)}`);
        }
        console.log('');

        // Player turn
        console.log(typeTriangle());
        const { reactionType, actionType } = await inquirer.prompt<{
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
                    { name: `Attack  ${dim('- Strike your opponent')}`, value: 'attack' },
                    { name: `Defend  ${dim('- Brace for impact')}`, value: 'defend' },
                ],
            },
        ]);

        // Enemy decision
        const enemyAction = determineEnemyAction(currentEnemy.logic);
        const playerAdvantage = determineAdvantage(reactionType, enemyAction.type);
        const enemyAdvantage = determineAdvantage(enemyAction.type, reactionType);

        console.log('');
        console.log(`  ${green('You')} chose ${formatType(reactionType)} ${bold(actionType)}`);
        await delay(500);
        console.log(`  ${red(currentEnemy.name)} chose ${formatType(enemyAction.type)} ${bold(enemyAction.action)}`);
        await delay(500);
        console.log(`  Advantage: ${formatAdvantage(playerAdvantage)}`);
        await delay(500);
        console.log('');

        // Resolve round (same logic as combat-sim)
        if (actionType === 'attack' && enemyAction.action === 'attack') {
            const playerDieRoll = createDieRoll(playerAdvantage);
            const playerMod = player.baseStats[reactionType as keyof BaseStats];
            const playerTotal = playerDieRoll() + playerMod;

            const enemyDieRoll = createDieRoll(enemyAdvantage);
            const enemyMod = getEnemyRelatedStat(currentEnemy, enemyAction.type, false);
            const enemyTotal = enemyDieRoll() + enemyMod;

            console.log(`  ${green('You')} roll: ${boldCyan(String(playerTotal))}`);
            await delay(400);
            console.log(`  ${red(currentEnemy.name)} rolls: ${boldCyan(String(enemyTotal))}`);
            await delay(600);

            if (playerTotal > enemyTotal) {
                const dmgRoll = playerDieRoll() + playerMod;
                const eDef = getEnemyRelatedStat(currentEnemy, enemyAction.type, true);
                const dmg = Math.max(1, dmgRoll - eDef);
                currentEnemy.health = Math.max(0, currentEnemy.health - dmg);
                console.log(`  ${boldGreen('You win!')} ${boldRed(String(dmg))} damage to ${currentEnemy.name}!`);
            } else if (playerTotal < enemyTotal) {
                const dmgRoll = enemyDieRoll() + enemyMod;
                const pDef = player.baseStats[reactionType as keyof BaseStats];
                const dmg = Math.max(1, dmgRoll - pDef);
                player.health = Math.max(0, player.health - dmg);
                console.log(`  ${boldRed(currentEnemy.name + ' wins!')} You take ${boldRed(String(dmg))} damage!`);
            } else {
                console.log(`  ${boldYellow('Clash is a tie!')}`);
            }
        } else if (actionType === 'attack' && enemyAction.action === 'defend') {
            const playerDieRoll = createDieRoll(playerAdvantage);
            const playerMod = player.baseStats[reactionType as keyof BaseStats];
            const dmgRoll = playerDieRoll() + playerMod;
            const eDef = Math.ceil(getEnemyRelatedStat(currentEnemy, enemyAction.type, true) * 1.5);
            const dmg = Math.max(0, dmgRoll - eDef);
            currentEnemy.health = Math.max(0, currentEnemy.health - dmg);
            if (dmg > 0) {
                console.log(`  ${green('You attack through their guard!')} ${boldRed(String(dmg))} damage!`);
            } else {
                console.log(`  ${yellow('Your attack is blocked!')}`);
            }
        } else if (actionType === 'defend' && enemyAction.action === 'attack') {
            const enemyDieRoll = createDieRoll(enemyAdvantage);
            const enemyMod = getEnemyRelatedStat(currentEnemy, enemyAction.type, false);
            const dmgRoll = enemyDieRoll() + enemyMod;
            const pDef = Math.ceil(player.baseStats[reactionType as keyof BaseStats] * 1.5);
            const dmg = Math.max(0, dmgRoll - pDef);
            player.health = Math.max(0, player.health - dmg);
            if (dmg > 0) {
                console.log(`  ${red(currentEnemy.name + ' attacks!')} You take ${boldRed(String(dmg))} damage through your guard.`);
            } else {
                console.log(`  ${boldGreen('You block completely!')}`);
            }
        } else {
            // Both defend
            friendshipCounter++;
            console.log(narration('A moment of calm. Understanding grows between combatants.'));
            console.log(`  ${magenta('Friendship:')} ${magenta('♥'.repeat(friendshipCounter))} ${gray(`(${friendshipCounter}/3)`)}`);
        }

        await delay(800);

        // Check end conditions
        if (currentEnemy.health <= 0) {
            console.log('');
            console.log(VICTORY_ART);
            console.log(boldGreen(`  ${currentEnemy.name} has been defeated!`));
            const xpGain = currentEnemy.level * 50 + randomInt(10, 50);
            console.log(cyan(`  +${xpGain} experience`));
            player.experience += xpGain;
            combatActive = false;
        } else if (player.health <= 0) {
            console.log('');
            console.log(GAME_OVER_ART);
            console.log(boldRed('  You have been defeated...'));
            console.log(dim('  Your journey ends here. But perhaps another path awaits.'));
            // Revive with half health for gameplay continuity
            player.health = Math.ceil(player.maxHealth / 2);
            console.log(yellow(`  You awaken weakened. HP restored to ${player.health}.`));
            combatActive = false;
        } else if (friendshipCounter >= 3) {
            console.log('');
            console.log(narration(
                `The fighting stops. ${currentEnemy.name} regards you with newfound respect. ` +
                'Perhaps not all conflicts need a violent resolution.'
            ));
            console.log(`  ${magenta('♥♥♥')} ${boldMagenta('Friendship Victory!')} ${magenta('♥♥♥')}`);
            const xpGain = currentEnemy.level * 75;
            console.log(cyan(`  +${xpGain} experience`));
            player.experience += xpGain;
            combatActive = false;
        }
    }

    console.log(divider());
    await delay(500);

    return {
        ...session,
        gameState: {
            ...session.gameState,
            player,
        },
    };
}

// ============================================================================
// GAME LOOP
// ============================================================================

async function gameLoop(session: GameSession): Promise<GameSession> {
    while (session.isRunning) {
        await displayWorldStatus(session);
        const action = await explorationMenu();

        switch (action) {
            case 'explore':
                session = await handleExplore(session);
                break;
            case 'character':
                await showCharacterSheet(session);
                break;
            case 'inventory':
                await showInventory(session);
                break;
            case 'save':
                saveGameState(session.gameState);
                console.log(boldGreen('  Game saved!'));
                await delay(800);
                break;
            case 'quit': {
                const { confirmQuit } = await inquirer.prompt<{ confirmQuit: boolean }>([
                    {
                        type: 'confirm',
                        name: 'confirmQuit',
                        message: 'Save before quitting?',
                        default: true,
                    },
                ]);
                if (confirmQuit) {
                    saveGameState(session.gameState);
                    console.log(boldGreen('  Game saved!'));
                }
                session = { ...session, isRunning: false };
                break;
            }
        }
    }

    return session;
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
    let running = true;

    while (running) {
        const action = await titleScreen();

        switch (action) {
            case 'new': {
                const player = await characterCreation();
                const gameState: GameState = {
                    player,
                    world: createStartingWorld(),
                    combatState: null,
                };

                clearScreen();
                console.log(TITLE_ART);
                console.log('');
                await typewriter('  Your journey begins in the fishing village...', 30);
                await typewriter('  The salt air fills your lungs. The path ahead is uncertain.', 30);
                await typewriter('  But something in your heart tells you: this is where it starts.', 30);
                console.log('');
                await delay(1000);

                const session: GameSession = { gameState, isRunning: true };
                await gameLoop(session);
                break;
            }

            case 'continue': {
                const gameState = loadGameState();
                console.log('');
                console.log(boldGreen(`  Welcome back, ${gameState.player.name}!`));
                console.log(dim(`  Level ${gameState.player.level} | ${gameState.world.currentMap.name}`));
                await delay(800);

                const session: GameSession = { gameState, isRunning: true };
                await gameLoop(session);
                break;
            }

            case 'about':
                await showAbout();
                break;

            case 'exit':
                running = false;
                break;
        }
    }

    console.log('');
    console.log(dim('  The veil grows quiet. Until next time, traveler.'));
    console.log('');
}

main().catch(console.error);
