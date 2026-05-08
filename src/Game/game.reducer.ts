/**
 * Initialization helpers used to bootstrap the game store.
 */

import { GameState } from './types';
import { createCharacter } from '../Character';
import { createStartingWorld } from '../World';

/**
 * Increment when GameState's shape changes. Save loaders branch on this so
 * old saves can be migrated rather than corrupted.
 */
export const GAME_STATE_VERSION = 1;

/** Builds a brand-new GameState with default player and world. */
export function createNewGameState(): GameState {
    return {
        version: GAME_STATE_VERSION,
        player: createCharacter({
            name: 'Player',
            level: 1,
            baseStats: { heart: 1, body: 1, mind: 1 },
        }),
        world: createStartingWorld(),
        combat: null,
    };
}
