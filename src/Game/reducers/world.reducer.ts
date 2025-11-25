/**
 * WorldReducer is responsible for updating the
 * World state in the GameState. This includes:
 * - Map progression
 * - NPC interactions
 * - Quest management
 * - Event triggers
 */

import { GameState, GameAction } from "../types";

/**
 * worldReducer handles world-related actions
 * @param state the current game state
 * @param action the action to perform
 * @returns the new game state with updated world state
 */
export const worldReducer = (state: GameState, action: GameAction): GameState => {
    // TODO: Implement world reducer logic based on action.type

    switch (action.type) {
        case 'world/changeMap':
            // TODO: Handle map changes
            return state;

        case 'world/addQuest':
            // TODO: Handle adding a quest
            if (action.payload?.quest) {
                return {
                    ...state,
                    world: {
                        ...state.world,
                        incompleteQuests: [
                            ...state.world.incompleteQuests,
                            action.payload.quest,
                        ],
                    },
                };
            }
            return state;

        case 'world/completeQuest':
            // TODO: Handle completing a quest
            if (action.payload?.questName) {
                return {
                    ...state,
                    world: {
                        ...state.world,
                        incompleteQuests: state.world.incompleteQuests.filter(
                            quest => quest.name !== action.payload.questName
                        ),
                    },
                };
            }
            return state;

        case 'world/updateNPC':
            // TODO: Handle NPC updates
            return state;

        case 'world/triggerEvent':
            // TODO: Handle event triggers
            return state;

        default:
            return state;
    }
};