import { GameState } from '../game/types';
import { PersistenceAdapter } from './types';

/**
 * createWebStorageAdapter
 *
 * Browser persistence backed by the synchronous Web Storage API
 * (`localStorage` by default; pass `sessionStorage` for tab-scoped saves).
 *
 * Browser-only: this module references `window`/`globalThis` storage APIs
 * and must not be imported in Node or React Native bundles. The package's
 * `exports` map keeps it on its own subpath.
 *
 * @param storage - A `Storage` instance. Defaults to `globalThis.localStorage`
 *                  when called in a browser context.
 * @param key     - Storage key under which the snapshot is written.
 */
export function createWebStorageAdapter(
    storage?: Storage,
    key = 'axiomancer:save',
): PersistenceAdapter {
    const target: Storage | undefined = storage ?? (globalThis as unknown as { localStorage?: Storage }).localStorage;

    if (!target) {
        throw new Error(
            '[axiomancer-mechanics] createWebStorageAdapter: no Storage available. ' +
            'Pass localStorage / sessionStorage explicitly or only call this in a browser environment.',
        );
    }

    return {
        load(): GameState | null {
            const raw = target.getItem(key);
            if (!raw) return null;
            try {
                return JSON.parse(raw) as GameState;
            } catch {
                return null;
            }
        },

        save(state: GameState): void {
            target.setItem(key, JSON.stringify(state));
        },
    };
}
