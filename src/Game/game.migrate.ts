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
import { getRng } from '../Utils/rng';

/** GameState shape before v3 (before moralMeter field was added). */
interface GameStateV2 extends Omit<GameState, 'moralMeter' | 'rngState'> {
    version: 2;
}

/** GameState shape before v4 (before rngState field was added). */
interface GameStateV3 extends Omit<GameState, 'rngState'> {
    version: 3;
}

/**
 * Migrate from v2 to v3: add moralMeter field defaulting to 0 (neutral).
 * v2 saves had no moral tracking; new field allows existing saves to continue.
 */
function migrateV2toV3(v2: GameStateV2): GameStateV3 {
    return {
        ...v2,
        version: 3,
        moralMeter: 0,
    };
}

/**
 * Migrate from v3 to v4: add rngState field defaulting to current RNG state.
 * v3 saves had no RNG state persistence; default to current state.
 */
function migrateV3toV4(v3: GameStateV3): GameState {
    return {
        ...v3,
        version: 4,
        rngState: getRng().getState(),
    };
}

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

    // Stepwise migration funnel
    let migrated = raw;
    
    if (fromVersion < 3) {
        migrated = migrateV2toV3(migrated as GameStateV2);
    }
    
    if (fromVersion < 4) {
        migrated = migrateV3toV4(migrated as GameStateV3);
    }
    
    return assertGameState(migrated);
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
        || typeof r.moralMeter !== 'number'
        || typeof r.rngState !== 'number'
    ) {
        throw new Error('migrate: payload missing required GameState fields.');
    }
    return raw as GameState;
}
