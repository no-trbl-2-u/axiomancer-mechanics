/**
 * Combat reducer — pure state transitions over CombatState.
 */

import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { deepClone } from '../Utils';
import { aggregateCombatStartTokens } from '../Items/equipment.engine';
import { aggregateSetStartTokens, getActiveSetPassiveEffectIds } from '../Items/set.engine';
import { lookupEffect } from '../Effects';
import type { ActiveEffect } from '../Effects/types';
import type { CombatResources } from '../Skills/types';
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
    const equipment = player.equipment ?? {};
    const itemTokens = aggregateCombatStartTokens(equipment);
    const setTokens = aggregateSetStartTokens(equipment);
    // Sum per-item + per-set start tokens additively (Spec 05e Q2 — no cap),
    // then fold in any philosophical resources carried from a prior won combat
    // (fallacy / paradox only; see `carryPhilosophicalResources`). The carry is
    // cleared from the canonical player at combat start by the game reducer, so
    // it is consumed exactly once.
    const carry = player.carriedResources ?? {};
    const seeded: CombatResources = {
        heart:    itemTokens.heart    + setTokens.heart,
        body:     itemTokens.body     + setTokens.body,
        mind:     itemTokens.mind     + setTokens.mind,
        fallacy:  itemTokens.fallacy  + setTokens.fallacy  + (carry.fallacy ?? 0),
        paradox:  itemTokens.paradox  + setTokens.paradox  + (carry.paradox ?? 0),
    };

    // Apply set-bonus passive effects as combat-LIFETIME ActiveEffects
    // (Spec 05e Q4). remainingDuration: -1 is the engine's "infinite-duration"
    // sentinel — tickAllEffects skips the tick decrement for these entries,
    // so set passives survive every round of combat. Combat-end cleanup
    // discards the cloned player along with the effects, so persistence is
    // bounded by the combat lifetime even though duration is unbounded.
    //
    // We construct ActiveEffect directly here rather than going through
    // applyEffect — applyEffect clamps remainingDuration to MAX_EFFECT_DURATION
    // (10), which would let the passive expire on an unusually long combat
    // (e.g. boss-encounter walkthrough at ~16+ rounds). The -1 sentinel
    // bypasses that ceiling.
    const clonedPlayer = deepClone(player);
    const setPassiveIds = getActiveSetPassiveEffectIds(equipment);
    let playerWithSetEffects = clonedPlayer;
    for (const effectId of setPassiveIds) {
        const effect = lookupEffect(effectId);
        if (!effect) continue;
        const newEffect: ActiveEffect = {
            effectId:          effect.id,
            remainingDuration: -1,        // combat-lifetime sentinel (tickAllEffects skips)
            intensity:         1,
            appliedAt:         1,
            tier:              effect.tier,
            resistedBy:        effect.resistedBy,
            resistDR:          effect.resistDR,
            sourceId:          'set-bonus',
        };
        playerWithSetEffects = {
            ...playerWithSetEffects,
            effects: [...(playerWithSetEffects.effects ?? []), newEffect],
        };
    }

    return {
        active: true,
        phase: 'choosing_stance',
        round: 1,
        friendshipCounter: 0,
        player: playerWithSetEffects,
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

/** Phase 108 — Handle mercy choice selection from Befriend success */
export function selectMercyChoice(state: CombatState, choice: 'spare' | 'exploit'): CombatState {
    return {
        ...state,
        playerChoice: { stance: 'heart', action: choice },
        mercyChoiceActive: false,
        ...(choice === 'spare' ? { friendshipResolutionAuthorized: true } : {}),
        phase: 'resolving',
    };
}

export function appendLog(state: CombatState, entry: BattleLogEntry): CombatState {
    return { ...state, log: [...state.log, entry] };
}

/**
 * Increments the friendship counter on a `CombatState`.
 *
 * **Two paths to the same state mutation, by design.** This reducer is the
 * canonical public-API entry point for external consumers (UIs, alternate
 * drivers) that want to drive a friendship-counter shift through the
 * standard `state → state` reducer surface. **The engine's own combat
 * resolver does NOT call this** — `src/Combat/phases/scenario.ts`
 * (`runScenarioPhase`) increments a local `friendshipCounter` variable
 * inline alongside an events.push emission during the both-defend branch.
 * The local-increment pattern is appropriate inside the resolver because
 * it operates on per-round intermediates (player / enemy / friendshipCounter /
 * combatResources) that are folded into the returned `CombatState` at the
 * round's end; constructing + tearing down a full state for the reducer
 * would add overhead for what's a single integer bump.
 *
 * If you're integrating outside the resolver — driving the counter from
 * a UI dispatch, building a tooling shim, or testing the state-shape
 * invariant — use this reducer. If you're modifying the round-resolution
 * pipeline, follow the inline pattern in `scenario.ts:264-270`.
 */
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

