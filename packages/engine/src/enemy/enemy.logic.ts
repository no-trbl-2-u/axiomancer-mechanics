/**
 * Enemy AI Logic
 * Each function implements a different enemy decision-making strategy.
 */

import { Stance, Action, CombatAction } from "../combat/types";

const STANCES: Stance[] = ['heart', 'body', 'mind'];
const ACTIONS: Action[] = ['attack', 'defend'];

/**
 * Generates a random combat action for the enemy.
 * Picks a random stance and a random action (attack or defend).
 * @returns A random combat action
 */
export function randomLogic(): CombatAction {
    return {
        type: STANCES[Math.floor(Math.random() * STANCES.length)],
        action: ACTIONS[Math.floor(Math.random() * ACTIONS.length)],
    };
}
