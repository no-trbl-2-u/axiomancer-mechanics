// ============================================================================
// ENEMY LOGIC
// ============================================================================

import { Action, ActionType, CombatAction } from "Combat/types";
import { EnemyLogic } from "./types";

/**
 * Generates a random combat action for the enemy using a random logic
 * @returns A random combat action
 */
export function randomLogic(): CombatAction {
    const actionType = ['attack', 'defend'][Math.floor(Math.random() * 2)];
    const reactionType = ['heart', 'body', 'mind'][Math.floor(Math.random() * 3)];

    return {
        type: reactionType as ActionType,
        action: actionType as Action,
    };
};