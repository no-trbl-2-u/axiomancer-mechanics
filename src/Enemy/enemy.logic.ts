import { Stance, Action, CombatAction } from "Combat/types";

const STANCES: Stance[] = ['heart', 'body', 'mind'];
const ACTIONS: Action[] = ['attack', 'defend'];

export function randomLogic(): CombatAction {
    return {
        type: STANCES[Math.floor(Math.random() * STANCES.length)],
        action: ACTIONS[Math.floor(Math.random() * ACTIONS.length)],
    };
}
