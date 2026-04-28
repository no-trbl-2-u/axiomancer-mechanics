import { GameState } from '../game/types';
import { PersistenceAdapter } from './types';

/**
 * createMemoryAdapter
 *
 * In-memory persistence for tests, hot-reload sandboxes, and quick experiments.
 * Holds a single GameState snapshot in a closure — nothing crosses a process
 * or storage boundary, but `save` and `load` are wired correctly so callers
 * can exercise the full persistence path.
 *
 * @param initial - Optional seed state. Useful for tests that need to
 *                  start from a specific snapshot.
 */
export function createMemoryAdapter(initial: GameState | null = null): PersistenceAdapter {
    let snapshot: GameState | null = initial;
    return {
        load: () => (snapshot ? structuredClone(snapshot) : null),
        save: (state: GameState) => { snapshot = structuredClone(state); },
    };
}
