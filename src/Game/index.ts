/**
 * Game module barrel — store, persistence, reducers, constants.
 */

export {
    createGameStore,
    selectPlayer, selectCombat, selectCombatState, selectIsInCombat,
    selectInventory, selectVersion, selectMoralMeter,
} from './store';
export type { GameStore, GameActions, StoreApi, CombatEndReport } from './store';

export { createNewGameState, GAME_STATE_VERSION, gameReducer } from './game.reducer';
export type { GameState } from './types';

export type { GameAction, GameActionOf } from './actions.types';

export { migrate } from './game.migrate';

export {
    createEventEmitter,
} from './events';
export type {
    GameEvent, GameEventEmitter, GameEventHandler, GameEventType,
} from './events';

export {
    STAT_MULTIPLIERS, RESOURCE_MULTIPLIERS, EXPERIENCE_PER_LEVEL,
    STAT_POINTS_PER_LEVEL,
    DEFENSE_MULTIPLIERS, PASSIVE_DEFENSE_MULTIPLIER,
    MAX_EFFECT_INTENSITY, MAX_EFFECT_DURATION, FRIENDSHIP_COUNTER_MAX,
} from './game-mechanics.constants';

export type { PersistenceAdapter } from './persistence/types';
export { nullAdapter } from './persistence/null.adapter';
