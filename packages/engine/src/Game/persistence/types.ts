import { GameState } from '../types';

/**
 * PersistenceAdapter
 *
 * The engine is agnostic about where state is stored.
 * Swap the implementation to change the storage backend without
 * touching any game logic.
 *
 * Node.js CLI  → createNodeAdapter()   (fs JSON file)
 * React Native → implement with AsyncStorage in the app package
 * Tests / sims → nullAdapter           (in-memory, nothing persisted)
 */
export interface PersistenceAdapter {
    /** Load persisted state. Returns null if no save exists or load fails. */
    load(): GameState | null;
    /** Persist the current state snapshot. */
    save(state: GameState): void;
}
