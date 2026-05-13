/**
 * Game module barrel — store, persistence, reducers, constants.
 */

export {
    createGameStore,
    selectPlayer, selectCombat, selectCombatState, selectIsInCombat,
    selectInventory, selectVersion,
} from './store';
export type { GameStore, GameActions, StoreApi, CombatEndReport } from './store';

export { createNewGameState, GAME_STATE_VERSION } from './game.reducer';
export type { GameState } from './types';

export {
    STAT_MULTIPLIERS, RESOURCE_MULTIPLIERS, EXPERIENCE_PER_LEVEL,
    DEFENSE_MULTIPLIERS, PASSIVE_DEFENSE_MULTIPLIER,
    MAX_EFFECT_INTENSITY, MAX_EFFECT_DURATION, FRIENDSHIP_COUNTER_MAX,
} from './game-mechanics.constants';

export type { PersistenceAdapter } from './persistence/types';
export { nullAdapter } from './persistence/null.adapter';
export { createNodeAdapter } from './persistence/node.adapter';
