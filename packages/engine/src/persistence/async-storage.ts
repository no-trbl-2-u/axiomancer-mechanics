import { GameState } from '../game/types';
import { PersistenceAdapter } from './types';

/**
 * Minimal subset of the `@react-native-async-storage/async-storage` API
 * that this adapter actually uses. Modeled as a structural type so the
 * adapter can accept either the real package or any compatible mock.
 */
export interface AsyncStorageLike {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
}

/**
 * createAsyncStorageAdapter
 *
 * Persistence backed by React Native's AsyncStorage (or any drop-in
 * implementation of {@link AsyncStorageLike}).
 *
 * IMPLEMENTATION NOTE
 * -------------------
 * `PersistenceAdapter.load()` is synchronous, but AsyncStorage is async.
 * A `prime()` step must run before the first `load()` is called — typically
 * during app bootstrap, before constructing the game store.
 *
 *   const adapter = createAsyncStorageAdapter(AsyncStorage, 'axiomancer:save');
 *   await adapter.prime();         // hydrate from disk
 *   const store = createGameStore(adapter);
 *
 * After `save()` the adapter both updates its in-memory snapshot AND fires
 * the underlying async write (consumers do not need to await it).
 *
 * @param storage - An object exposing `getItem` / `setItem`. Pass the real
 *                  `@react-native-async-storage/async-storage` module here.
 * @param key     - Storage key under which the snapshot is written.
 */
export function createAsyncStorageAdapter(
    storage: AsyncStorageLike,
    key = 'axiomancer:save',
): PersistenceAdapter & { prime(): Promise<void> } {
    let snapshot: GameState | null = null;

    return {
        async prime(): Promise<void> {
            const raw = await storage.getItem(key);
            if (!raw) return;
            try {
                snapshot = JSON.parse(raw) as GameState;
            } catch {
                snapshot = null;
            }
        },

        load(): GameState | null {
            return snapshot;
        },

        save(state: GameState): void {
            snapshot = state;
            void storage.setItem(key, JSON.stringify(state));
        },
    };
}
