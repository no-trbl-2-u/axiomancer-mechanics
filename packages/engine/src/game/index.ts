/**
 * Game subpath barrel.
 *
 * The root `GameState` shape, the bootstrap reducer, action constants, and
 * the engine-wide game-mechanics constants. This is the smallest set of
 * exports a UI consumer needs to hold the engine's top-level state shape
 * without taking a dependency on Zustand (`/store`) or any platform
 * adapter (`/persistence/*`).
 */
export type { GameState } from './types';
export { createNewGameState, GAME_STATE_VERSION } from './game.reducer';
export { COMBAT_ACTION } from './actions.constants';
export type { CombatActionName } from './actions.constants';
export {
    STAT_MULTIPLIERS,
    RESOURCE_MULTIPLIERS,
    EXPERIENCE_PER_LEVEL,
    DEFENSE_MULTIPLIERS,
    PASSIVE_DEFENSE_MULTIPLIER,
    MAX_EFFECT_INTENSITY,
    MAX_EFFECT_DURATION,
    FRIENDSHIP_COUNTER_MAX,
} from './game-mechanics.constants';
