/**
 * Combat Reducer
 * Functions that create or modify CombatState objects.
 * All functions here are pure and return new state objects.
 */

import { Character } from '../character/types';
import { Enemy } from '../enemy/types';
import { Stance, Action, CombatPhase, CombatState, BattleLogEntry } from './types';
import { deepClone } from '../utils';

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
        player: deepClone(player),
        enemy: deepClone(enemy),
        playerChoice: {},
        enemyChoice: {},
        logEntry: [],
    };
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
    return { ...state, phase };
}

// ============================================================================
// COMBAT ACTION SELECTION
// ============================================================================

/**
 * Sets the player's chosen stance for the current round
 * @param state - The current combat state
 * @param stance - The stance chosen by the player (heart/body/mind)
 * @returns Updated combat state with player's stance choice
 */
export function setPlayerStance(state: CombatState, stance: Stance): CombatState {
    return { ...state, playerChoice: { ...state.playerChoice, type: stance } };
}

/**
 * Sets the player's chosen action for the current round
 * @param state - The current combat state
 * @param action - The action chosen by the player (attack/defend/skill/item/flee)
 * @returns Updated combat state with player's action choice
 */
export function setPlayerAction(state: CombatState, action: Action): CombatState {
    return { ...state, playerChoice: { ...state.playerChoice, action } };
}

// ============================================================================
// COMBAT ROUND RESOLUTION
// ============================================================================

/**
 * Resolves a complete combat round with both combatants' actions.
 * TODO (Phase 2c): implement full round resolution via the reducer
 * (attack/defense rolls, effect procs, DoT/regen tick, log entry).
 * @param state - The current combat state with both actions chosen
 * @returns Updated combat state with round results
 */
export function resolveCombatRound(state: CombatState): CombatState {
    return "Implement me" as any;
}

// ============================================================================
// BATTLE LOG MANAGEMENT
// ============================================================================

/**
 * Adds a new log entry to combat state for the current round of combat
 * @param state - The current combat state
 * @param entry - The log entry to add
 * @returns Updated combat state with new log entry appended
 */
export function addBattleLogEntry(state: CombatState, entry: BattleLogEntry): CombatState {
    return { ...state, logEntry: [...state.logEntry, entry] };
}

// ============================================================================
// FRIENDSHIP COUNTER (Special Mechanic)
// ============================================================================

/**
 * Increments the friendship counter by 1.
 * Called when both combatants choose 'defend' on the same turn.
 * @param state - The current combat state
 * @returns Updated state with incremented friendship counter
 */
export function incrementFriendship(state: CombatState): CombatState {
    return { ...state, friendshipCounter: state.friendshipCounter + 1 };
}

/**
 * Ends combat with a friendship victory.
 * TODO (Phase 2c): add friendship-specific rewards/outcomes.
 * @param state - The current combat state
 * @returns Updated state with combat ended via friendship
 */
export function endCombatWithFriendship(state: CombatState): CombatState {
    return { ...state, active: false, phase: 'ended' };
}

// ============================================================================
// COMBAT END STATE
// ============================================================================

/**
 * Ends combat with player victory
 * @param state - The current combat state
 * @returns Updated state with combat ended (player won)
 */
export function endCombatPlayerVictory(state: CombatState): CombatState {
    return { ...state, active: false, phase: 'ended' };
}

/**
 * Ends combat with player defeat
 * @param state - The current combat state
 * @returns Updated state with combat ended (player lost)
 */
export function endCombatPlayerDefeat(state: CombatState): CombatState {
    return { ...state, active: false, phase: 'ended' };
}
