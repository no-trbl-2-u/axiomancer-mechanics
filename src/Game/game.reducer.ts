/**
 * Game Reducer — Initialization Utilities
 *
 * This file provides the pure functions needed to bootstrap the game store.
 * Everything that used to live here for save/load and combat toggling is now
 * handled by Game/store.ts (actions) and Game/persistence/ (adapters).
 */

import { GameState } from './types';
import { createCharacter } from '../Character';
import { createStartingWorld } from '../World';

// ============================================================================
// SCHEMA VERSION
// ============================================================================

/** Increment this when the GameState shape changes so save-file migrations
 *  can detect and handle old saves without corrupting them. */
export const GAME_STATE_VERSION = 1;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Creates a brand-new game state with default player and world.
 * Called by the store factory when no save file exists.
 */
export function createNewGameState(): GameState {
    return {
        version: GAME_STATE_VERSION,
        player: createCharacter({
            name: 'Player',
            level: 1,
            baseStats: {
                heart: 1,
                body: 1,
                mind: 1,
            },
        }),
        world: createStartingWorld(),
        combatState: null,
    };
}

// ============================================================================
// GAME-LEVEL ACTIONS
// ============================================================================

import type { Enemy } from '../Enemy/types';
import type { Character } from '../Character/types';
import type { CombatState } from '../Combat/types';
import type { Item } from '../Items/types';
import { initializeCombat } from '../Combat/combat.reducer';
import { moveToNodeWithEffects } from '../World/world.reducer';
import { isConsumable } from '../Items/types';

/**
 * Discriminated union of every game-level action the top-level
 * `gameReducer` understands. Add new variants here as new world / inventory
 * / combat events are wired in.
 *
 * Only ACTIONS that change the root `GameState` belong here; sub-state
 * mutations stay in their own reducers (Combat, Items, World).
 */
export type GameAction =
    | { type: 'NEW_GAME' }
    | { type: 'START_COMBAT'; enemy: Enemy }
    | { type: 'APPLY_COMBAT_TURN'; combat: CombatState }
    | { type: 'END_COMBAT' }
    | { type: 'MOVE_TO_NODE'; nodeId: string }
    | { type: 'SET_PLAYER'; player: Character }
    | { type: 'ADD_ITEM'; item: Item }
    | { type: 'REMOVE_ITEM'; itemId: string };

/**
 * Top-level pure reducer. Routes every `GameAction` to the appropriate
 * sub-reducer and returns a new `GameState` without mutation.
 *
 * The Zustand store in `Game/store.ts` continues to provide the
 * stateful action API for the CLI; this reducer is the redux-style
 * entry point used by tests, replays, and any future deterministic
 * game-loop driver.
 *
 * @param state - Current game state
 * @param action - The action to apply
 * @returns Updated game state
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'NEW_GAME':
            return createNewGameState();

        case 'START_COMBAT':
            return { ...state, combatState: initializeCombat(state.player, action.enemy) };

        case 'APPLY_COMBAT_TURN':
            return { ...state, combatState: action.combat };

        case 'END_COMBAT': {
            if (!state.combatState) return state;
            return { ...state, player: state.combatState.player, combatState: null };
        }

        case 'MOVE_TO_NODE': {
            const { state: nextWorld, tick } = moveToNodeWithEffects(
                state.world, action.nodeId, state.player,
            );
            const player = tick?.player ?? state.player;
            return { ...state, world: nextWorld, player };
        }

        case 'SET_PLAYER':
            return { ...state, player: action.player };

        case 'ADD_ITEM':
            return {
                ...state,
                player: { ...state.player, inventory: [...state.player.inventory, action.item] },
            };

        case 'REMOVE_ITEM':
            return {
                ...state,
                player: {
                    ...state.player,
                    inventory: state.player.inventory.filter(i => i.id !== action.itemId),
                },
            };

        default:
            return state;
    }
}

// ============================================================================
// NODE PROCESSING
// ============================================================================

import type { Map as WorldMap } from '../World/types';

/**
 * Result of processing a node: the new game state plus a list of
 * human-readable messages describing what happened on arrival.
 */
export interface ProcessNodeResult {
    state: GameState;
    events: string[];
}

/**
 * Orchestrates everything that happens when the player enters a node.
 *
 * Steps:
 *   1. Validate the target node is on the current map's `availableNodes`.
 *   2. Tick persistent hazard effects on the player via the world reducer.
 *   3. Produce a list of events describing regen / DoT / expiry.
 *
 * Combat triggers and event resolution remain TODO until the world
 * content libraries land — this scaffold lets every other system tick
 * in lockstep with player movement.
 *
 * @param state - Current game state
 * @param node - The map node the player is entering
 * @returns Updated state + a per-event log
 */
export function processNode(
    state: GameState,
    node: WorldMap['startingNode'] | { id: string },
): ProcessNodeResult {
    const events: string[] = [];

    if (!state.world.currentMap.availableNodes.includes(node.id)) {
        return {
            state,
            events: [`Node ${node.id} is not yet accessible.`],
        };
    }

    const { state: nextWorld, tick } = moveToNodeWithEffects(
        state.world, node.id, state.player,
    );

    let player = state.player;
    if (tick) {
        player = tick.player;
        events.push(...tick.events);
    }

    return {
        state: { ...state, world: nextWorld, player },
        events,
    };
}
