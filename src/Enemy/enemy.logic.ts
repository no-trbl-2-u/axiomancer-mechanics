// ============================================================================
// ENEMY LOGIC
// ============================================================================

import { Action, Stance, CombatAction } from "Combat/types";
import { EnemyLogic } from "./types";

/**
 * Generates a random combat action for the enemy using a random logic
 * @returns A random combat action
 */
export function randomLogic(): CombatAction {
    const action = ['attack', 'defend'][Math.floor(Math.random() * 2)];
    const stance = ['heart', 'body', 'mind'][Math.floor(Math.random() * 3)];

    return {
        type: stance as Stance,
        action: action as Action,
    };
};