import fs from "fs";
import { GameState } from "./types";
import { createCharacter } from "Character";
import { createStartingWorld } from "World";

const STATE_FILE = "./game-state.json";

/**
 * doesSaveFileExist checks if the state file exists
 * @returns true if the state file exists, false otherwise
 */
export const doesSaveFileExist: () => boolean = () => {
    return fs.existsSync(STATE_FILE);
}

// NOTE: GameState is still in flux as we define more of the game
/**
 * getNewGameState returns a new game state
 * @returns a new, initialized game state
 */
export const getNewGameState: () => GameState = () => {
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
 * loadState loads the game state from the state file
 * @returns the currently saved game state JSON file
 */
export const loadState: () => GameState = () => {
    if (!doesSaveFileExist()) {
        return getNewGameState();
    }

    const state = fs.readFileSync(STATE_FILE, "utf-8");
    return JSON.parse(state);
}

/**
 * saveState saves the game state to the state file
 * @param state the game state to save
 */
export const saveState: (state: GameState) => void = (state: GameState) => {
    /* If no state file exists create one using the state provided */
    /* If state file does exist overwrite it */
}

/**
 * gameReducer is a reducer function that takes a game state and an action
 * and returns the new game state
 * @param state the current game state
 * @param action the action to perform
 * @returns the new game state
 */
// export const gameReducer: (state: GameState, action: GameAction) => GameState = (state: GameState, action: GameAction) => {
/* Takes current state and action */
/* Returns the new state */
/* Neer mutates original state */
// }

// TODO: TJ ---> Start here tomorrow. Good luck bud
// -> I believe in you! You're smarter than you give yourself
// -> credit for. Also, STOP INSULTING YOURSELF!