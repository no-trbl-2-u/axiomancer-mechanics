import fs from 'fs';
import { GameState } from '../game/types';
import { PersistenceAdapter } from './types';

const DEFAULT_SAVE_PATH = './game-state.json';

/**
 * createNodeAdapter
 *
 * File-system persistence for the Node.js CLI and standalone engine.
 * Reads/writes a JSON file at the given path.
 *
 * NOTE: This module imports `fs` and is therefore Node-only. UI consumers
 * (React Native, web) MUST NOT import it — use the platform-specific
 * adapter on a sibling subpath (`persistence/async-storage`,
 * `persistence/web-storage`) instead.
 *
 * @param filePath - Path to the save file (default: `./game-state.json`).
 */
export function createNodeAdapter(filePath = DEFAULT_SAVE_PATH): PersistenceAdapter {
    return {
        load(): GameState | null {
            if (!fs.existsSync(filePath)) return null;
            try {
                const raw = fs.readFileSync(filePath, 'utf-8');
                return JSON.parse(raw) as GameState;
            } catch {
                console.warn('[GameStore] Save file could not be read — starting a fresh game.');
                return null;
            }
        },

        save(state: GameState): void {
            fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
        },
    };
}
