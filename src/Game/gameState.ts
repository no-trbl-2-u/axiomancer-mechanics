import * as fs from 'fs';
import * as path from 'path';
import { GameState, GameAction } from "./types";
import { combatReducer } from "./reducers/combat.reducer";
import { characterReducer } from "./reducers/character.reducer";
import { worldReducer } from "./reducers/world.reducer";
import { createCharacter } from "../Character";

// File paths
const GAME_DIR = path.join(__dirname);
const STATE_FILE = path.join(GAME_DIR, "game-state.json");
const BACKUP_DIR = path.join(GAME_DIR, "backups");

/**
 * Ensures the backups directory exists
 */
const ensureBackupDir = (): void => {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
};

/**
 * doesSaveFileExist checks if the state file exists
 * @returns true if the state file exists, false otherwise
 */
export const doesSaveFileExist = (): boolean => {
    return fs.existsSync(STATE_FILE);
};

/**
 * getNewGameState returns a new game state with default values
 * @returns a new, initialized game state
 */
export const getNewGameState = (): GameState => {
    // Create default player character
    const player = createCharacter({
        name: "Hero",
        level: 1,
        baseStats: {
            heart: 3,
            body: 3,
            mind: 3,
        },
    });

    // Create empty world state
    const world = {
        maps: [],
        incompleteQuests: [],
    };

    // Create inactive combat state
    const combatState = {
        active: false,
        phase: null,
        round: 0,
        friendshipCounter: 0,
        player: player,
        enemy: null as any, // Will be set when combat starts
        playerChoice: {},
        enemyChoice: {},
        logEntry: [],
    };

    return {
        player,
        world,
        combatState,
    };
};

/**
 * loadState loads the game state from the state file
 * If no save file exists, creates a new game state
 * @returns the currently saved game state or a new game state
 */
export const loadState = (): GameState => {
    try {
        if (!doesSaveFileExist()) {
            console.log("No save file found. Creating new game state...");
            const newState = getNewGameState();
            saveState(newState);
            return newState;
        }

        const fileContent = fs.readFileSync(STATE_FILE, 'utf-8');
        const state = JSON.parse(fileContent) as GameState;

        // Validate the loaded state
        if (!validateGameState(state)) {
            console.warn("Loaded state is invalid. Creating new game state...");
            return getNewGameState();
        }

        console.log("Game state loaded successfully.");
        return state;
    } catch (error) {
        console.error("Error loading game state:", error);
        console.log("Creating new game state...");
        return getNewGameState();
    }
};

/**
 * saveState saves the game state to the state file
 * @param state the game state to save
 */
export const saveState = (state: GameState): void => {
    try {
        // Validate state before saving
        if (!validateGameState(state)) {
            throw new Error("Cannot save invalid game state");
        }

        // Ensure directory exists
        const dir = path.dirname(STATE_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write state to file with pretty formatting
        const jsonContent = JSON.stringify(state, null, 2);
        fs.writeFileSync(STATE_FILE, jsonContent, 'utf-8');

        console.log("Game state saved successfully.");
    } catch (error) {
        console.error("Error saving game state:", error);
        throw error;
    }
};

/**
 * validateGameState validates the structure of a game state object
 * @param state the state to validate
 * @returns true if valid, false otherwise
 */
export const validateGameState = (state: any): state is GameState => {
    if (!state || typeof state !== 'object') {
        return false;
    }

    // Check required top-level properties
    if (!state.player || !state.world || !state.combatState) {
        return false;
    }

    // Validate player
    if (!state.player.name || typeof state.player.level !== 'number') {
        return false;
    }

    // Validate world
    if (!Array.isArray(state.world.maps) || !Array.isArray(state.world.incompleteQuests)) {
        return false;
    }

    // Validate combat state
    if (typeof state.combatState.active !== 'boolean') {
        return false;
    }

    return true;
};

/**
 * createBackup creates a timestamped backup of the current state
 * @param state the state to backup
 * @returns the path to the backup file
 */
export const createBackup = (state: GameState): string => {
    try {
        ensureBackupDir();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(BACKUP_DIR, `game-state-${timestamp}.json`);

        const jsonContent = JSON.stringify(state, null, 2);
        fs.writeFileSync(backupFile, jsonContent, 'utf-8');

        console.log(`Backup created: ${backupFile}`);
        return backupFile;
    } catch (error) {
        console.error("Error creating backup:", error);
        throw error;
    }
};

/**
 * listBackups lists all available backup files
 * @returns array of backup filenames with timestamps
 */
export const listBackups = (): string[] => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            return [];
        }

        const files = fs.readdirSync(BACKUP_DIR);
        return files
            .filter(file => file.startsWith('game-state-') && file.endsWith('.json'))
            .sort()
            .reverse(); // Most recent first
    } catch (error) {
        console.error("Error listing backups:", error);
        return [];
    }
};

/**
 * loadBackup loads a specific backup file
 * @param filename the backup filename to load
 * @returns the game state from the backup
 */
export const loadBackup = (filename: string): GameState => {
    try {
        const backupFile = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(backupFile)) {
            throw new Error(`Backup file not found: ${filename}`);
        }

        const fileContent = fs.readFileSync(backupFile, 'utf-8');
        const state = JSON.parse(fileContent) as GameState;

        if (!validateGameState(state)) {
            throw new Error("Backup file contains invalid state");
        }

        console.log(`Backup loaded: ${filename}`);
        return state;
    } catch (error) {
        console.error("Error loading backup:", error);
        throw error;
    }
};

/**
 * deleteBackup deletes a specific backup file
 * @param filename the backup filename to delete
 */
export const deleteBackup = (filename: string): void => {
    try {
        const backupFile = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(backupFile)) {
            throw new Error(`Backup file not found: ${filename}`);
        }

        fs.unlinkSync(backupFile);
        console.log(`Backup deleted: ${filename}`);
    } catch (error) {
        console.error("Error deleting backup:", error);
        throw error;
    }
};

/**
 * resetGameState deletes the save file and creates a fresh game state
 * @returns the new game state
 */
export const resetGameState = (): GameState => {
    try {
        if (doesSaveFileExist()) {
            // Create backup before resetting
            const currentState = loadState();
            createBackup(currentState);

            // Delete save file
            fs.unlinkSync(STATE_FILE);
            console.log("Save file deleted.");
        }

        const newState = getNewGameState();
        saveState(newState);
        console.log("Game state reset successfully.");
        return newState;
    } catch (error) {
        console.error("Error resetting game state:", error);
        throw error;
    }
};

/**
 * debugPrintState pretty-prints the game state for debugging
 * @param state the state to print
 */
export const debugPrintState = (state: GameState): void => {
    console.log("=== GAME STATE DEBUG ===");
    console.log("\nPlayer:");
    console.log(`  Name: ${state.player.name}`);
    console.log(`  Level: ${state.player.level}`);
    console.log(`  HP: ${state.player.health}/${state.player.maxHealth}`);
    console.log(`  MP: ${state.player.mana}/${state.player.maxMana}`);
    console.log(`  Base Stats:`, state.player.baseStats);

    console.log("\nWorld:");
    console.log(`  Maps: ${state.world.maps.length}`);
    console.log(`  Incomplete Quests: ${state.world.incompleteQuests.length}`);

    console.log("\nCombat:");
    console.log(`  Active: ${state.combatState.active}`);
    console.log(`  Phase: ${state.combatState.phase}`);
    console.log(`  Round: ${state.combatState.round}`);

    console.log("\n========================");
};

/**
 * getStateSnapshot gets the current state without side effects
 * Useful for reading state without triggering saves or loads
 * @returns the current game state or null if no save exists
 */
export const getStateSnapshot = (): GameState | null => {
    try {
        if (!doesSaveFileExist()) {
            return null;
        }

        const fileContent = fs.readFileSync(STATE_FILE, 'utf-8');
        return JSON.parse(fileContent) as GameState;
    } catch (error) {
        console.error("Error getting state snapshot:", error);
        return null;
    }
};

/**
 * gameReducer is the root reducer function that coordinates all sub-reducers
 * Takes current state and an action, returns new state without mutation
 * @param state the current game state
 * @param action the action to perform
 * @returns the new game state
 */
export const gameReducer = (state: GameState, action: GameAction): GameState => {
    // Route actions to appropriate sub-reducers based on action type prefix
    const actionPrefix = action.type.split('/')[0];

    switch (actionPrefix) {
        case 'combat':
            return {
                ...state,
                combatState: combatReducer(state, action).combatState,
            };

        case 'character':
            return {
                ...state,
                player: characterReducer(state, action).player,
            };

        case 'world':
            return {
                ...state,
                world: worldReducer(state, action).world,
            };

        default:
            console.warn(`Unknown action type: ${action.type}`);
            return state;
    }
};