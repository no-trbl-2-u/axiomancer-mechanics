import { GameState } from "./types";
import { COMBAT_ACTION } from "./reducers/combat.constants";
import { combatReducer } from "./reducers/combat.reducer";
const STATE_FILE = "./game-state.json";

/**
 * GameAction represents any action that can be dispatched to the game reducer
 */
export interface GameAction {
    type: string;
    payload?: any;
}

/**
 * doesSaveFileExist checks if the state file exists
 * @returns true if the state file exists, false otherwise
 */
export const doesSaveFileExist: () => boolean = () => {
    /* Check if the state file exists */
    /* If no state file exists return false */
    /* If state file does exist return true */
    return undefined as any;
}

/**
 * getNewGameState returns a new game state
 * @returns a new, initialized game state
 */
export const getNewGameState: () => GameState = () => {
    /* Return a new game state */
    return undefined as any;
}

/**
 * loadState loads the game state from the state file
 * @returns the currently saved game state JSON file
 */
export const loadState: () => GameState = () => {
    /* If no state file exists run getNewGameState */

    /* If state file does exist get it synchronously */

    /* Return the parsed state file  */
    return undefined as any;
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
export const gameReducer: (state: GameState, action: GameAction) => GameState = (state: GameState, action: GameAction) => {
    /* Takes current state and action */
    /* Returns the new state */
    /* Neber mutates original state */

    // @todo: Implement this reducer in such a way where:
    // -> combatReducer returns CombatState
    // -> worldReducer returns WorldState
    // -> characterReducer returns CharacterState
    // -> Below we just put the state all together
    switch (action.type) {
        case COMBAT_ACTION.ATTACK:
        case COMBAT_ACTION.DEFEND:
        case COMBAT_ACTION.SKILL:
        case COMBAT_ACTION.ITEM:
        case COMBAT_ACTION.FLEE:
        case COMBAT_ACTION.BACK:
            return combatReducer(state, action);
        default:
            return state;
    }
}

// TODO: TJ ---> Start here tomorrow. Good luck bud
// -> I believe in you! You're smarter than you give yourself
// -> credit for. Also, STOP INSULTING YOURSELF!