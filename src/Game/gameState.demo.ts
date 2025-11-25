/**
 * Demo file showing how to use the game state management system
 * Run with: ts-node -r tsconfig-paths/register src/Game/gameState.demo.ts
 */

import {
    loadState,
    saveState,
    getNewGameState,
    resetGameState,
    debugPrintState,
    createBackup,
    listBackups,
    gameReducer,
    validateGameState,
} from './gameState';
import { GameAction } from './types';

console.log("=== Game State Management Demo ===\n");

// 1. Load or create game state
console.log("1. Loading game state...");
let gameState = loadState();
debugPrintState(gameState);

// 2. Test character actions
console.log("\n2. Testing character actions...");
const takeDamageAction: GameAction = {
    type: 'character/takeDamage',
    payload: { damage: 10 },
};
gameState = gameReducer(gameState, takeDamageAction);
console.log(`Player took 10 damage. HP: ${gameState.player.health}/${gameState.player.maxHealth}`);

const healAction: GameAction = {
    type: 'character/heal',
    payload: { amount: 5 },
};
gameState = gameReducer(gameState, healAction);
console.log(`Player healed 5 HP. HP: ${gameState.player.health}/${gameState.player.maxHealth}`);

// 3. Test world actions
console.log("\n3. Testing world actions...");
const addQuestAction: GameAction = {
    type: 'world/addQuest',
    payload: {
        quest: {
            name: 'starting-quest',
            description: 'Begin your adventure',
            containingMap: 'fishing-village',
            reward: 'experience',
            connectingQuest: 'get-to-forest',
        },
    },
};
gameState = gameReducer(gameState, addQuestAction);
console.log(`Added quest. Incomplete quests: ${gameState.world.incompleteQuests.length}`);

// 4. Save the state
console.log("\n4. Saving game state...");
saveState(gameState);

// 5. Create a backup
console.log("\n5. Creating backup...");
const backupPath = createBackup(gameState);
console.log(`Backup created at: ${backupPath}`);

// 6. List all backups
console.log("\n6. Listing all backups...");
const backups = listBackups();
console.log(`Found ${backups.length} backup(s):`);
backups.forEach(backup => console.log(`  - ${backup}`));

// 7. Validate state
console.log("\n7. Validating game state...");
const isValid = validateGameState(gameState);
console.log(`State is valid: ${isValid}`);

// 8. Final state
console.log("\n8. Final game state:");
debugPrintState(gameState);

console.log("\n=== Demo Complete ===");
console.log("\nTry these commands:");
console.log("  - resetGameState() to start fresh");
console.log("  - loadBackup(filename) to restore a backup");
console.log("  - gameReducer(state, action) to update state");
