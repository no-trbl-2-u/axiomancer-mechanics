// ============================================================================
// ENEMY LOGIC
// ============================================================================

import { Action, ActionType, CombatAction } from "../Combat/types";

/**
 * Generates a random combat action for the enemy using a random logic
 * @returns A random combat action with random type and action
 */
export function randomLogic(): CombatAction {
    const actionType: Action = (['attack', 'defend'] as const)[Math.floor(Math.random() * 2)];
    const reactionType: ActionType = (['heart', 'body', 'mind'] as const)[Math.floor(Math.random() * 3)];

    return {
        type: reactionType,
        action: actionType,
    };
}
