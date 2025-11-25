/**
 * CharacterReducer is responsible for updating the
 * Character in the GameState
 */

import { GameState, GameAction } from "../types";

/**
 * characterReducer handles character-related actions
 * @param state the current game state
 * @param action the action to perform
 * @returns the new game state with updated character
 */
export const characterReducer = (state: GameState, action: GameAction): GameState => {
    // TODO: Implement character reducer logic based on action.type

    switch (action.type) {
        case 'character/levelUp':
            // TODO: Handle level up
            return {
                ...state,
                player: {
                    ...state.player,
                    level: state.player.level + 1,
                },
            };

        case 'character/takeDamage':
            // TODO: Handle taking damage
            if (action.payload?.damage) {
                const newHealth = Math.max(0, state.player.health - action.payload.damage);
                return {
                    ...state,
                    player: {
                        ...state.player,
                        health: newHealth,
                    },
                };
            }
            return state;

        case 'character/heal':
            // TODO: Handle healing
            if (action.payload?.amount) {
                const newHealth = Math.min(
                    state.player.maxHealth,
                    state.player.health + action.payload.amount
                );
                return {
                    ...state,
                    player: {
                        ...state.player,
                        health: newHealth,
                    },
                };
            }
            return state;

        case 'character/restoreMana':
            // TODO: Handle mana restoration
            if (action.payload?.amount) {
                const newMana = Math.min(
                    state.player.maxMana,
                    state.player.mana + action.payload.amount
                );
                return {
                    ...state,
                    player: {
                        ...state.player,
                        mana: newMana,
                    },
                };
            }
            return state;

        case 'character/spendMana':
            // TODO: Handle mana spending
            if (action.payload?.amount) {
                const newMana = Math.max(0, state.player.mana - action.payload.amount);
                return {
                    ...state,
                    player: {
                        ...state.player,
                        mana: newMana,
                    },
                };
            }
            return state;

        case 'character/updateStats':
            // TODO: Handle stat updates
            return state;

        default:
            return state;
    }
};