/**
 * Combat reducer — pure state transitions over CombatState.
 */

import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { deepClone } from '../Utils';
import { aggregateCombatStartTokens } from '../Items/equipment.engine';
import {
    Stance, Action, CombatPhase, CombatState, BattleLogEntry,
} from './types';

/**
 * Builds a fresh CombatState. Combatants are deep-cloned so combat
 * mutations don't bleed back into the canonical player/enemy.
 *
 * Per Spec 05, the per-combat resource counters are NOT unconditionally
 * zeroed — they are seeded from the sum of every equipped item's
 * `resourceInteraction.combatStartTokens`. Items without a
 * `resourceInteraction` contribute zero, so the default behaviour (no
 * equipment) is unchanged. Today only the player's equipment seeds tokens;
 * enemies pre-Spec 07 do not carry equipment.
 */
export function initializeCombat(player: Character, enemy: Enemy): CombatState {
    const seeded = aggregateCombatStartTokens(player.equipment ?? {});
    return {
        active: true,
        phase: 'choosing_stance',
        round: 1,
        friendshipCounter: 0,
        player: deepClone(player),
        enemy: deepClone(enemy),
        playerChoice: {},
        enemyChoice: {},
        log: [],
        combatResources: seeded,
    };
}

export function setPhase(state: CombatState, phase: CombatPhase): CombatState {
    return { ...state, phase };
}

export function setPlayerStance(state: CombatState, stance: Stance): CombatState {
    return { ...state, playerChoice: { ...state.playerChoice, stance } };
}

export function setPlayerAction(state: CombatState, action: Action): CombatState {
    return { ...state, playerChoice: { ...state.playerChoice, action } };
}

export function appendLog(state: CombatState, entry: BattleLogEntry): CombatState {
    return { ...state, log: [...state.log, entry] };
}

/** Increments the friendship counter (called when both combatants defend). */
export function incrementFriendship(state: CombatState): CombatState {
    return { ...state, friendshipCounter: state.friendshipCounter + 1 };
}

/** Marks combat as ended. The reason is encoded in `determineCombatEnd(state)`. */
export function endCombat(state: CombatState): CombatState {
    return { ...state, active: false, phase: 'ended' };
}

// Legacy aliases retained on the barrel (`src/index.ts`) for backwards
// compatibility with external consumers. The three end-variants all dispatch
// to `endCombat` — the actual outcome is computed by `determineCombatEnd(state)`,
// so calling `endCombatPlayerDefeat(state)` does NOT mark a defeat; treat the
// names as historical noise and prefer `endCombat` in new code. The two
// non-barrel aliases (`updateCombatPhase`, `addBattleLogEntry`) had zero
// in-repo callers and were dropped at the Phase 35 follow-up iterate pass.
export const endCombatPlayerVictory = endCombat;
export const endCombatPlayerDefeat = endCombat;
export const endCombatWithFriendship = endCombat;
