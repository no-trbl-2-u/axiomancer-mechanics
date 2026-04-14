/**
 * Combat Reducer — pure functions that create or modify CombatState.
 */

import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { Stance, Action, CombatPhase, CombatState, BattleLogEntry } from './types';
import { deepClone } from '../Utils';

// ============================================================================
// INITIALIZATION
// ============================================================================

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
// PHASE MANAGEMENT
// ============================================================================

export function updateCombatPhase(state: CombatState, phase: CombatPhase): CombatState {
    return { ...state, phase };
}

// ============================================================================
// ACTION SELECTION
// ============================================================================

export function setPlayerStance(state: CombatState, stance: Stance): CombatState {
    return { ...state, playerChoice: { ...state.playerChoice, type: stance } };
}

export function setPlayerAction(state: CombatState, action: Action): CombatState {
    return { ...state, playerChoice: { ...state.playerChoice, action } };
}

// ============================================================================
// BATTLE LOG
// ============================================================================

export function addBattleLogEntry(state: CombatState, entry: BattleLogEntry): CombatState {
    return { ...state, logEntry: [...state.logEntry, entry] };
}

// ============================================================================
// FRIENDSHIP COUNTER
// ============================================================================

export function incrementFriendship(state: CombatState): CombatState {
    return { ...state, friendshipCounter: state.friendshipCounter + 1 };
}

// ============================================================================
// COMBAT END
// ============================================================================

export function endCombatPlayerVictory(state: CombatState): CombatState {
    return { ...state, active: false, phase: 'ended' };
}

export function endCombatPlayerDefeat(state: CombatState): CombatState {
    return { ...state, active: false, phase: 'ended' };
}

export function endCombatWithFriendship(state: CombatState): CombatState {
    return { ...state, active: false, phase: 'ended' };
}
