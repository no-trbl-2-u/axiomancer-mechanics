/**
 * Save-state migration (Spec 09 Q3).
 *
 * Save files are tagged with `version`. When the schema changes, this module
 * narrows raw JSON onto the current `GameState` shape, applying step-wise
 * migrations along the way. Phase 09 establishes the v2 baseline — older
 * versions are not yet supported because no shipped save file pre-dates v2,
 * but the function is wired so future bumps can slot in cleanly.
 */

import { GameState } from './types';
import { GAME_STATE_VERSION } from './game.reducer';

/**
 * Migrate a raw save payload to the current `GameState` shape.
 *
 * @param raw         - The deserialised JSON object pulled from persistence.
 * @param fromVersion - The `version` field of the saved payload.
 * @param toVersion   - The target schema version (defaults to current).
 * @returns The migrated `GameState`.
 * @throws If the raw payload's shape can't be validated as a `GameState`.
 */
export function migrate(
    raw: unknown,
    fromVersion: number,
    toVersion: number = GAME_STATE_VERSION,
): GameState {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`migrate: invalid save payload (got ${typeof raw}).`);
    }

    if (fromVersion === toVersion) {
        return assertGameState(raw);
    }

    if (fromVersion > toVersion) {
        throw new Error(
            `migrate: save version ${fromVersion} is newer than runtime ${toVersion}; ` +
            'refusing to downgrade.',
        );
    }

    // Stepwise migration funnel. No upgrade paths are needed today because v2
    // is the baseline; later phases can chain calls like:
    //   if (fromVersion < 3) raw = migrateV2toV3(raw as GameStateV2);
    console.warn(
        `migrate: no upgrade path from v${fromVersion} to v${toVersion}; ` +
        'returning payload as-is (this will likely fail validation).',
    );
    return assertGameState(raw);
}

/**
 * Narrow `raw` to a `GameState`. Only the top-level shape is checked — the
 * sub-modules trust their own invariants and the serialiser writes the full
 * shape. Adjust here as `GameState` gains required keys.
 */
function assertGameState(raw: unknown): GameState {
    const r = raw as Partial<GameState>;
    if (typeof r.version !== 'number'
        || r.player == null
        || r.world == null
        || !('combat' in r)
        || r.quests == null
        || !Array.isArray(r.flags)
    ) {
        throw new Error('migrate: payload missing required GameState fields.');
    }
    return raw as GameState;
}
