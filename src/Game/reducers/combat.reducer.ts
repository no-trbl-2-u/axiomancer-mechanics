/**
 * CombatReducer is responsible for updating the
 * Combat state in the GameState
 */

import { GameState, GameAction } from "../types";

/**
 * combatReducer handles combat-related actions
 * @param state the current game state
 * @param action the action to perform
 * @returns the new game state with updated combat state
 */
export const combatReducer = (state: GameState, action: GameAction): GameState => {
    // TODO: Implement combat reducer logic based on action.type
    // For now, return state unchanged

    switch (action.type) {
        case 'combat/attack':
            // TODO: Handle attack action
            return state;

        case 'combat/defend':
            // TODO: Handle defend action
            return state;

        case 'combat/skill':
            // TODO: Handle skill action
            return state;

        case 'combat/item':
            // TODO: Handle item action
            return state;

        case 'combat/flee':
            // TODO: Handle flee action
            return state;

        case 'combat/start':
            // TODO: Initialize combat
            return state;

        case 'combat/end':
            // TODO: End combat
            return {
                ...state,
                combatState: {
                    ...state.combatState,
                    active: false,
                    phase: null,
                },
            };

        case 'combat/nextPhase':
            // TODO: Advance to next combat phase
            return state;

        default:
            return state;
    }
};