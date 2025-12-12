/**
 * Game Reducer
 * Functions that create or modify the root GameState object
 * All functions here are pure and return new state objects
 */

import fs from "fs";
import { GameState } from "./types";
import { createCharacter } from "../Character";
import { createStartingWorld } from "../World";
import { CombatState } from "../Combat/types";

// ============================================================================
// CONSTANTS
// ============================================================================

const STATE_FILE = "./game-state.json";

// ============================================================================
// SAVE FILE UTILITIES
// ============================================================================

/**
 * Checks if a save file exists
 * @returns true if the state file exists, false otherwise
 */
export function doesSaveFileExist(): boolean {
    return fs.existsSync(STATE_FILE);
}

// ============================================================================
// GAME STATE INITIALIZATION
// ============================================================================

/**
 * Creates a new game state with fresh player and world
 * @returns A new, initialized game state
 */
export function createNewGameState(): GameState {
    return {
        player: createCharacter({
            name: "Player",
            level: 1,
            baseStats: {
                heart: 1,
                body: 1,
                mind: 1
            }
        }),
        world: createStartingWorld(),
        combatState: null,
    };
}

/**
 * Loads the game state from the save file, or creates new if none exists
 * @returns The loaded or newly created game state
 */
export function loadGameState(): GameState {
    if (!doesSaveFileExist()) {
        return createNewGameState();
    }

    const state = fs.readFileSync(STATE_FILE, "utf-8");
    return JSON.parse(state);
}

// ============================================================================
// COMBAT STATE MANAGEMENT
// ============================================================================

/**
 * Sets the combat state on the game state
 * @param state - The current game state
 * @param combatState - The combat state to set (or null to clear)
 * @returns Updated game state with new combat state
 */
export function setCombatState(state: GameState, combatState: CombatState | null): GameState {
    return {
        ...state,
        combatState,
    };
}

/**
 * Starts combat by setting the combat state
 * @param state - The current game state
 * @param combatState - The initialized combat state
 * @returns Updated game state with active combat
 */
export function startCombat(state: GameState, combatState: CombatState): GameState {
    return setCombatState(state, combatState);
}

/**
 * Ends combat by clearing the combat state
 * @param state - The current game state
 * @returns Updated game state with combat cleared
 */
export function endCombat(state: GameState): GameState {
    return setCombatState(state, null);
}

// ============================================================================
// SAVE/LOAD OPERATIONS
// ============================================================================

/**
 * Saves the game state to the save file
 * @param state - The game state to save
 */
export function saveGameState(state: GameState): void {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ============================================================================
// MAIN GAME REDUCER
// ============================================================================

/**
 * The main game reducer that processes actions and returns new state
 * @param state - The current game state
 * @param action - The action to process
 * @returns Updated game state
 */
export function gameReducer(state: GameState, action: { type: string; payload?: unknown }): GameState {
    // TODO: Implement action handling
    // switch (action.type) {
    //     case 'START_COMBAT':
    //         return startCombat(state, action.payload as CombatState);
    //     case 'END_COMBAT':
    //         return endCombat(state);
    //     default:
    //         return state;
    // }
    return state;
}

