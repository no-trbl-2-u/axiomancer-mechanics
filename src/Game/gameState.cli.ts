#!/usr/bin/env node
/**
 * Game State CLI - Interactive command-line interface for game state management
 * Uses Commander for command structure and Inquirer for interactive prompts
 * 
 * Run with: npm run game-state
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import {
    loadState,
    saveState,
    resetGameState,
    debugPrintState,
    createBackup,
    listBackups,
    loadBackup,
    deleteBackup,
    gameReducer,
    doesSaveFileExist,
} from './gameState';
import { GameAction } from './types';

const program = new Command();

program
    .name('game-state')
    .description('Interactive game state management CLI')
    .version('1.0.0');

// ============================================================================
// COMMAND: Interactive Mode
// ============================================================================
program
    .command('interactive')
    .alias('i')
    .description('Launch interactive game state manager')
    .action(async () => {
        let gameState = loadState();
        let running = true;

        while (running) {
            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'What would you like to do?',
                    choices: [
                        { name: '📊 View Game State', value: 'view' },
                        { name: '⚔️  Character Actions', value: 'character' },
                        { name: '🗺️  World Actions', value: 'world' },
                        { name: '💾 Save State', value: 'save' },
                        { name: '📦 Backup Management', value: 'backup' },
                        { name: '🔄 Reset Game', value: 'reset' },
                        { name: '❌ Exit', value: 'exit' },
                    ],
                },
            ]);

            if (action === 'view') {
                debugPrintState(gameState);
            } else if (action === 'character') {
                gameState = await handleCharacterActions(gameState);
            } else if (action === 'world') {
                gameState = await handleWorldActions(gameState);
            } else if (action === 'save') {
                saveState(gameState);
                console.log('✅ Game state saved!');
            } else if (action === 'backup') {
                await handleBackupManagement(gameState);
            } else if (action === 'reset') {
                const { confirmReset } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirmReset',
                        message: '⚠️  Are you sure you want to reset the game? (A backup will be created)',
                        default: false,
                    },
                ]);
                if (confirmReset) {
                    gameState = resetGameState();
                    console.log('✅ Game reset complete!');
                }
            } else if (action === 'exit') {
                const { confirmExit } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirmExit',
                        message: 'Save before exiting?',
                        default: true,
                    },
                ]);
                if (confirmExit) {
                    saveState(gameState);
                    console.log('✅ Game saved!');
                }
                running = false;
                console.log('👋 Goodbye!');
            }

            if (running) {
                await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'continue',
                        message: 'Press Enter to continue...',
                    },
                ]);
                console.clear();
            }
        }
    });

// ============================================================================
// COMMAND: View State
// ============================================================================
program
    .command('view')
    .alias('v')
    .description('View current game state')
    .action(() => {
        const state = loadState();
        debugPrintState(state);
    });

// ============================================================================
// COMMAND: Character Actions
// ============================================================================
program
    .command('character')
    .alias('c')
    .description('Perform character actions')
    .option('-d, --damage <amount>', 'Deal damage to player')
    .option('-h, --heal <amount>', 'Heal player')
    .option('-m, --mana <amount>', 'Restore mana')
    .option('-l, --level-up', 'Level up player')
    .action(async (options) => {
        let state = loadState();

        if (options.damage) {
            const damageAmount = parseInt(options.damage);
            const action: GameAction = {
                type: 'character/takeDamage',
                payload: { damage: damageAmount },
            };
            state = gameReducer(state, action);
            console.log(`💔 Player took ${damageAmount} damage`);
        }

        if (options.heal) {
            const healAmount = parseInt(options.heal);
            const action: GameAction = {
                type: 'character/heal',
                payload: { amount: healAmount },
            };
            state = gameReducer(state, action);
            console.log(`💚 Player healed ${healAmount} HP`);
        }

        if (options.mana) {
            const manaAmount = parseInt(options.mana);
            const action: GameAction = {
                type: 'character/restoreMana',
                payload: { amount: manaAmount },
            };
            state = gameReducer(state, action);
            console.log(`💙 Player restored ${manaAmount} mana`);
        }

        if (options.levelUp) {
            const action: GameAction = { type: 'character/levelUp' };
            state = gameReducer(state, action);
            console.log(`⭐ Player leveled up to level ${state.player.level}!`);
        }

        saveState(state);
        console.log(`\n📊 Player Status: HP ${state.player.health}/${state.player.maxHealth} | MP ${state.player.mana}/${state.player.maxMana} | Level ${state.player.level}`);
    });

// ============================================================================
// COMMAND: Backup Management
// ============================================================================
program
    .command('backup')
    .alias('b')
    .description('Manage game state backups')
    .option('-c, --create', 'Create a new backup')
    .option('-l, --list', 'List all backups')
    .option('-r, --restore <filename>', 'Restore from backup')
    .option('-d, --delete <filename>', 'Delete a backup')
    .action(async (options) => {
        if (options.create) {
            const state = loadState();
            const backupPath = createBackup(state);
            console.log(`✅ Backup created: ${backupPath}`);
        } else if (options.list) {
            const backups = listBackups();
            if (backups.length === 0) {
                console.log('No backups found.');
            } else {
                console.log(`\n📦 Found ${backups.length} backup(s):\n`);
                backups.forEach((backup, index) => {
                    console.log(`  ${index + 1}. ${backup}`);
                });
            }
        } else if (options.restore) {
            const state = loadBackup(options.restore);
            saveState(state);
            console.log(`✅ Restored from backup: ${options.restore}`);
        } else if (options.delete) {
            deleteBackup(options.delete);
            console.log(`✅ Deleted backup: ${options.delete}`);
        } else {
            console.log('Please specify an option. Use --help for more info.');
        }
    });

// ============================================================================
// COMMAND: Reset Game
// ============================================================================
program
    .command('reset')
    .description('Reset game state (creates backup first)')
    .action(async () => {
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: '⚠️  Are you sure you want to reset the game? (A backup will be created)',
                default: false,
            },
        ]);

        if (confirm) {
            resetGameState();
            console.log('✅ Game reset complete!');
        } else {
            console.log('Reset cancelled.');
        }
    });

// ============================================================================
// COMMAND: Info
// ============================================================================
program
    .command('info')
    .description('Show game state file information')
    .action(() => {
        const exists = doesSaveFileExist();
        console.log(`\n📁 Game State File Info:\n`);
        console.log(`  Save file exists: ${exists ? '✅ Yes' : '❌ No'}`);

        if (exists) {
            const state = loadState();
            console.log(`  Player: ${state.player.name} (Level ${state.player.level})`);
            console.log(`  Maps: ${state.world.maps.length}`);
            console.log(`  Quests: ${state.world.incompleteQuests.length}`);
            console.log(`  In Combat: ${state.combatState.active ? 'Yes' : 'No'}`);
        }

        const backups = listBackups();
        console.log(`  Backups: ${backups.length}`);
    });

// ============================================================================
// Helper Functions
// ============================================================================

async function handleCharacterActions(state: any) {
    const { characterAction } = await inquirer.prompt([
        {
            type: 'list',
            name: 'characterAction',
            message: 'Choose a character action:',
            choices: [
                { name: '💔 Take Damage', value: 'damage' },
                { name: '💚 Heal', value: 'heal' },
                { name: '💙 Restore Mana', value: 'mana' },
                { name: '⚡ Spend Mana', value: 'spend-mana' },
                { name: '⭐ Level Up', value: 'level-up' },
                { name: '← Back', value: 'back' },
            ],
        },
    ]);

    if (characterAction === 'back') return state;

    if (characterAction === 'damage') {
        const { damage } = await inquirer.prompt([
            { type: 'number', name: 'damage', message: 'How much damage?', default: 10 },
        ]);
        const action: GameAction = { type: 'character/takeDamage', payload: { damage } };
        state = gameReducer(state, action);
        console.log(`💔 Player took ${damage} damage. HP: ${state.player.health}/${state.player.maxHealth}`);
    } else if (characterAction === 'heal') {
        const { heal } = await inquirer.prompt([
            { type: 'number', name: 'heal', message: 'How much to heal?', default: 10 },
        ]);
        const action: GameAction = { type: 'character/heal', payload: { amount: heal } };
        state = gameReducer(state, action);
        console.log(`💚 Player healed ${heal} HP. HP: ${state.player.health}/${state.player.maxHealth}`);
    } else if (characterAction === 'mana') {
        const { mana } = await inquirer.prompt([
            { type: 'number', name: 'mana', message: 'How much mana to restore?', default: 10 },
        ]);
        const action: GameAction = { type: 'character/restoreMana', payload: { amount: mana } };
        state = gameReducer(state, action);
        console.log(`💙 Player restored ${mana} mana. MP: ${state.player.mana}/${state.player.maxMana}`);
    } else if (characterAction === 'spend-mana') {
        const { spendMana } = await inquirer.prompt([
            { type: 'number', name: 'spendMana', message: 'How much mana to spend?', default: 5 },
        ]);
        const action: GameAction = { type: 'character/spendMana', payload: { amount: spendMana } };
        state = gameReducer(state, action);
        console.log(`⚡ Player spent ${spendMana} mana. MP: ${state.player.mana}/${state.player.maxMana}`);
    } else if (characterAction === 'level-up') {
        const action: GameAction = { type: 'character/levelUp' };
        state = gameReducer(state, action);
        console.log(`⭐ Player leveled up to level ${state.player.level}!`);
    }

    return state;
}

async function handleWorldActions(state: any) {
    const { worldAction } = await inquirer.prompt([
        {
            type: 'list',
            name: 'worldAction',
            message: 'Choose a world action:',
            choices: [
                { name: '📜 Add Quest', value: 'add-quest' },
                { name: '✅ Complete Quest', value: 'complete-quest' },
                { name: '📋 View Quests', value: 'view-quests' },
                { name: '← Back', value: 'back' },
            ],
        },
    ]);

    if (worldAction === 'back') return state;

    if (worldAction === 'add-quest') {
        const { questName, questDescription } = await inquirer.prompt([
            { type: 'input', name: 'questName', message: 'Quest name:', default: 'starting-quest' },
            { type: 'input', name: 'questDescription', message: 'Quest description:', default: 'Begin your adventure' },
        ]);

        const addAction: GameAction = {
            type: 'world/addQuest',
            payload: {
                quest: {
                    name: questName,
                    description: questDescription,
                    containingMap: 'fishing-village',
                    reward: 'experience',
                    connectingQuest: questName,
                },
            },
        };
        state = gameReducer(state, addAction);
        console.log(`📜 Quest "${questName}" added!`);
    } else if (worldAction === 'complete-quest') {
        if (state.world.incompleteQuests.length === 0) {
            console.log('No incomplete quests!');
            return state;
        }

        const { questToComplete } = await inquirer.prompt([
            {
                type: 'list',
                name: 'questToComplete',
                message: 'Which quest to complete?',
                choices: state.world.incompleteQuests.map((q: any) => ({
                    name: `${q.name} - ${q.description}`,
                    value: q.name,
                })),
            },
        ]);

        const completeAction: GameAction = {
            type: 'world/completeQuest',
            payload: { questName: questToComplete },
        };
        state = gameReducer(state, completeAction);
        console.log(`✅ Quest "${questToComplete}" completed!`);
    } else if (worldAction === 'view-quests') {
        console.log(`\n📋 Incomplete Quests (${state.world.incompleteQuests.length}):\n`);
        if (state.world.incompleteQuests.length === 0) {
            console.log('  No quests!');
        } else {
            state.world.incompleteQuests.forEach((quest: any, index: number) => {
                console.log(`  ${index + 1}. ${quest.name}`);
                console.log(`     ${quest.description}`);
            });
        }
    }

    return state;
}

async function handleBackupManagement(state: any) {
    const { backupAction } = await inquirer.prompt([
        {
            type: 'list',
            name: 'backupAction',
            message: 'Backup management:',
            choices: [
                { name: '💾 Create Backup', value: 'create' },
                { name: '📋 List Backups', value: 'list' },
                { name: '🔄 Restore Backup', value: 'restore' },
                { name: '🗑️  Delete Backup', value: 'delete' },
                { name: '← Back', value: 'back' },
            ],
        },
    ]);

    if (backupAction === 'back') return;

    if (backupAction === 'create') {
        const backupPath = createBackup(state);
        console.log(`✅ Backup created: ${backupPath}`);
    } else if (backupAction === 'list') {
        const backups = listBackups();
        if (backups.length === 0) {
            console.log('No backups found.');
        } else {
            console.log(`\n📦 Found ${backups.length} backup(s):\n`);
            backups.forEach((backup, index) => {
                console.log(`  ${index + 1}. ${backup}`);
            });
        }
    } else if (backupAction === 'restore') {
        const availableBackups = listBackups();
        if (availableBackups.length === 0) {
            console.log('No backups available to restore.');
            return;
        }

        const { backupToRestore } = await inquirer.prompt([
            {
                type: 'list',
                name: 'backupToRestore',
                message: 'Which backup to restore?',
                choices: availableBackups,
            },
        ]);

        const restoredState = loadBackup(backupToRestore);
        saveState(restoredState);
        console.log(`✅ Restored from backup: ${backupToRestore}`);
    } else if (backupAction === 'delete') {
        const backupsToDelete = listBackups();
        if (backupsToDelete.length === 0) {
            console.log('No backups available to delete.');
            return;
        }

        const { backupToDelete } = await inquirer.prompt([
            {
                type: 'list',
                name: 'backupToDelete',
                message: 'Which backup to delete?',
                choices: backupsToDelete,
            },
        ]);

        const { confirmDelete } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmDelete',
                message: `Delete ${backupToDelete}?`,
                default: false,
            },
        ]);

        if (confirmDelete) {
            deleteBackup(backupToDelete);
            console.log(`✅ Deleted backup: ${backupToDelete}`);
        }
    }
}

// ============================================================================
// Parse and Execute
// ============================================================================

program.parse();
