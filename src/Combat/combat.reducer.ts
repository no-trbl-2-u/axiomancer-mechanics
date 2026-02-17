/**
 * Combat Reducer
 * Functions that create or modify CombatState objects
 * All functions here are pure and return new state objects
 */

import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import {
    ActionType,
    Action,
    CombatPhase,
    CombatState,
    BattleLogEntry,
} from './types';

// ============================================================================
// COMBAT STATE INITIALIZATION
// ============================================================================

/**
 * Initializes a new combat state between a player and an enemy
 * @param player - The player character entering combat
 * @param enemy - The enemy character being fought
 * @returns A new CombatState object with initial values
 */
export function initializeCombat(player: Character, enemy: Enemy): CombatState {
    return {
        active: true,
        phase: 'choosing_type',
        round: 1,
        friendshipCounter: 0,
        player: { ...player },
        enemy: { ...enemy },
        playerChoice: {},
        enemyChoice: {},
        logEntry: [],
    };
}

/**
 * Resets the combat state to its initial values
 * @param state - The current combat state to reset
 * @returns A fresh combat state with the same player and enemy
 */
export function resetCombat(state: CombatState): CombatState {
    return initializeCombat(state.player, state.enemy);
}

// ============================================================================
// COMBAT PHASE MANAGEMENT
// ============================================================================

/**
 * Updates the combat phase
 * @param state - The current combat state
 * @param phase - The new phase to transition to
 * @returns Updated combat state with new phase
 */
export function updateCombatPhase(state: CombatState, phase: CombatPhase): CombatState {
    return {
        ...state,
        phase,
    };
}

// ============================================================================
// COMBAT ACTION SELECTION
// ============================================================================

/**
 * Sets the player's chosen attack type for the current round
 * @param state - The current combat state
 * @param type - The attack type chosen by the player
 * @returns Updated combat state with player's type choice
 */
export function setPlayerAttackType(state: CombatState, type: ActionType): CombatState {
    return {
        ...state,
        playerChoice: {
            ...state.playerChoice,
            type,
        },
    };
}

/**
 * Sets the player's chosen action (attack/defend) for the current round
 * @param state - The current combat state
 * @param action - The action chosen by the player
 * @returns Updated combat state with player's action choice
 */
export function setPlayerAction(state: CombatState, action: Action): CombatState {
    return {
        ...state,
        playerChoice: {
            ...state.playerChoice,
            action,
        },
    };
}

// ============================================================================
// COMBAT ROUND RESOLUTION
// ============================================================================

/**
 * Resolves a complete combat round with both combatants' actions
 * @param state - The current combat state with both actions chosen
 * @returns Updated combat state with round results applied
 */
export function resolveCombatRound(state: CombatState): CombatState {
    return {
        ...state,
        phase: 'resolving' as CombatPhase,
        round: state.round + 1,
        playerChoice: {},
        enemyChoice: {},
    };
}

// ============================================================================
// BATTLE LOG MANAGEMENT
// ============================================================================

/**
 * Adds a new log entry to combat state for the current round of combat
 * @param state - The current combat state
 * @param entry - The log entry to add
 * @returns Updated combat state with new log entry
 */
export function addBattleLogEntry(state: CombatState, entry: BattleLogEntry): CombatState {
    return {
        ...state,
        logEntry: [...state.logEntry, entry],
    };
}

// ============================================================================
// FRIENDSHIP COUNTER (Special Mechanic)
// ============================================================================

/**
 * Increments the friendship counter. If counter reaches 3, ends combat with friendship
 * @param state - The current combat state
 * @returns Updated state with incremented friendship counter
 */
export function incrementFriendship(state: CombatState): CombatState {
    const newCounter: number = state.friendshipCounter + 1;

    if (newCounter >= 3) {
        return endCombatWithFriendship({ ...state, friendshipCounter: newCounter });
    }

    return {
        ...state,
        friendshipCounter: newCounter,
    };
}

/**
 * Ends combat with a friendship victory
 * @param state - The current combat state
 * @returns Updated state with combat ended via friendship
 */
export function endCombatWithFriendship(state: CombatState): CombatState {
    return {
        ...state,
        active: false,
        phase: 'ended',
        friendshipCounter: 3,
    };
}

// ============================================================================
// COMBAT END STATE
// ============================================================================

/**
 * Ends combat with player victory
 * @param state - The current combat state
 * @returns Updated state with combat ended
 */
export function endCombatPlayerVictory(state: CombatState): CombatState {
    return {
        ...state,
        active: false,
        phase: 'ended',
    };
}

/**
 * Ends combat with player defeat
 * @param state - The current combat state
 * @returns Updated state with combat ended
 */
export function endCombatPlayerDefeat(state: CombatState): CombatState {
    return {
        ...state,
        active: false,
        phase: 'ended',
    };
}
