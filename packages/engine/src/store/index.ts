/**
 * Store subpath barrel.
 *
 * `createGameStore` is a thin Zustand vanilla store that aggregates the
 * engine's reducers behind a single mutable handle. UI consumers that
 * already use Redux/Jotai/MobX can ignore this subpath entirely and call
 * the pure reducers (`createNewGameState`, `initializeCombat`,
 * `setPlayerStance`, …) directly.
 *
 * `zustand` is declared as a peer dependency on this subpath.
 */
export {
    createGameStore,
    selectPlayer,
    selectCombatState,
    selectIsInCombat,
    selectInventory,
    selectVersion,
} from './create-store';
export type { GameStore, GameActions, StoreApi } from './create-store';
