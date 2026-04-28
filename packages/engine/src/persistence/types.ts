import { GameState } from '../game/types';

/**
 * PersistenceAdapter
 *
 * The engine is agnostic about where state is stored.
 * Swap the implementation to change the storage backend without
 * touching any game logic.
 *
 *   Node.js CLI  → createNodeAdapter()             (subpath: persistence/node)
 *   React Native → createAsyncStorageAdapter()     (subpath: persistence/async-storage)
 *   Web          → createWebStorageAdapter()       (subpath: persistence/web-storage)
 *   Tests / sims → nullAdapter / memoryAdapter     (default subpath: persistence)
 */
export interface PersistenceAdapter {
    /** Load persisted state. Returns null if no save exists or load fails. */
    load(): GameState | null;
    /** Persist the current state snapshot. */
    save(state: GameState): void;
}
