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
