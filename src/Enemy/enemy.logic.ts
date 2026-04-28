/**
 * Enemy AI strategies. Each function returns a complete CombatAction.
 */

import { Stance, Action, CombatAction } from '../Combat/types';
import { EnemyLogic } from './types';

const STANCES: Stance[] = ['heart', 'body', 'mind'];
const ATTACK_OR_DEFEND: Array<Extract<Action, 'attack' | 'defend'>> = ['attack', 'defend'];

/** Picks a uniformly random stance and a uniformly random action (attack/defend). */
export function randomLogic(): CombatAction {
    return {
        stance: STANCES[Math.floor(Math.random() * STANCES.length)],
        action: ATTACK_OR_DEFEND[Math.floor(Math.random() * ATTACK_OR_DEFEND.length)],
    };
}

/**
 * Resolves the enemy's CombatAction for the round given the chosen logic.
 * Currently every logic falls through to `randomLogic`; new strategies plug
 * into this dispatcher.
 */
export function decideEnemyAction(logic: EnemyLogic): CombatAction {
    switch (logic) {
        case 'random':
        case 'aggressive':
        case 'defensive':
        case 'balanced':
        default:
            return randomLogic();
    }
}
