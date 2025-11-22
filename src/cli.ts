import { Command } from 'commander';
import * as readline from 'readline';

// Define available players and enemies
const PLAYERS = [
    'Warrior - A strong melee fighter',
    'Mage - A powerful spellcaster',
    'Rogue - A nimble and cunning combatant',
    'Cleric - A healer with divine powers'
];

const ENEMIES = [
    'Goblin - A weak but cunning foe',
    'Orc - A brutal warrior',
    'Dragon - A legendary beast',
    'Lich - An undead sorcerer'
];

const COMBAT_ACTIONS = [
    'Attack - Deal damage to the enemy',
    'Defend - Reduce incoming damage',
    'Use Skill - Use a special ability',
    'Flee - Attempt to escape combat'
];

// Helper function to create readline interface
function createReadline() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

// Helper function to prompt user for selection from a list
function promptSelection(options: string[], prompt: string): Promise<number> {
    return new Promise((resolve) => {
        const rl = createReadline();

        console.log(`\n${prompt}`);
        options.forEach((option, index) => {
            console.log(`  ${index + 1}. ${option}`);
        });

        const askQuestion = () => {
            rl.question('\nEnter your choice (number): ', (answer) => {
                const choice = parseInt(answer.trim(), 10);
                if (choice >= 1 && choice <= options.length) {
                    rl.close();
                    resolve(choice - 1);
                } else {
                    console.log(`\n❌ Invalid choice. Please enter a number between 1 and ${options.length}.`);
                    askQuestion();
                }
            });
        };

        askQuestion();
    });
}

// Helper function to prompt user for confirmation (yes/no)
function promptConfirm(prompt: string): Promise<boolean> {
    return new Promise((resolve) => {
        const rl = createReadline();

        const askQuestion = () => {
            rl.question(`\n${prompt} (y/n): `, (answer) => {
                const normalized = answer.trim().toLowerCase();
                if (normalized === 'y' || normalized === 'yes') {
                    rl.close();
                    resolve(true);
                } else if (normalized === 'n' || normalized === 'no') {
                    rl.close();
                    resolve(false);
                } else {
                    console.log('\n❌ Invalid input. Please enter "y" or "n".');
                    askQuestion();
                }
            });
        };

        askQuestion();
    });
}

// Helper function to prompt user for text input
function promptInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        const rl = createReadline();

        rl.question(`\n${prompt}: `, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

// Helper function to wait for user to press Enter
function waitForEnter(message: string = 'Press Enter to continue...'): Promise<void> {
    return new Promise((resolve) => {
        const rl = createReadline();

        rl.question(`\n${message}`, () => {
            rl.close();
            resolve();
        });
    });
}

// Combat command implementation
async function runCombat() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   Axiomancer Combat Loop - v1.0.0     ║');
    console.log('╚════════════════════════════════════════╝');

    // Select player
    const playerIndex = await promptSelection(PLAYERS, '⚔️  Choose your player:');
    const selectedPlayer = PLAYERS[playerIndex];

    // Select enemy
    const enemyIndex = await promptSelection(ENEMIES, '👹 Choose your enemy:');
    const selectedEnemy = ENEMIES[enemyIndex];

    // Confirm selection
    console.log('\n═══════════════════════════════════════');
    console.log('Combat Setup:');
    console.log(`  Player: ${selectedPlayer}`);
    console.log(`  Enemy:  ${selectedEnemy}`);
    console.log('═══════════════════════════════════════');

    const confirmed = await promptConfirm('Start combat with this setup?');

    if (!confirmed) {
        console.log('\n❌ Combat cancelled. Returning to menu...');
        return;
    }

    // Optional: Ask for player name
    const playerName = await promptInput('Enter your character name (optional, press Enter to skip)');
    const displayName = playerName || selectedPlayer.split(' - ')[0];

    console.log(`\n✅ Combat starting with ${displayName}!`);
    await waitForEnter();

    // Simulate a combat turn
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║            COMBAT ROUND 1              ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`${displayName} vs ${selectedEnemy.split(' - ')[0]}`);

    // Wait for player action
    const actionIndex = await promptSelection(COMBAT_ACTIONS, '\n🎯 Choose your action:');
    const selectedAction = COMBAT_ACTIONS[actionIndex];

    console.log(`\n💥 ${displayName} chose: ${selectedAction}`);
    console.log('[Combat mechanics would be executed here...]');

    // Ask if they want to continue
    const continueGame = await promptConfirm('\nContinue to next round?');

    if (continueGame) {
        console.log('\n⏭️  Next round would start here...');
    } else {
        console.log('\n👋 Thanks for playing!');
    }
}

// Set up Commander program
const program = new Command();

program
    .name('axiomancer')
    .description('Turn-based RPG combat mechanics with philosophical themes')
    .version('1.0.0');

program
    .command('combat')
    .description('Start a combat loop with player and enemy selection')
    .action(async () => {
        await runCombat();
    });

// Set combat as default action
program.action(async () => {
    await runCombat();
});

// Parse command line arguments
program.parse(process.argv);