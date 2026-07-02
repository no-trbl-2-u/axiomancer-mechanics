/**
 * World progression — boss-driven map completion + map travel (2026-07 D4).
 *
 * Dealing with a map's authored boss completes the map on the current
 * continent and unlocks the next region. "Dealt with" covers BOTH endings:
 * killing the boss (`'victory'`) AND the mercy / spare / befriend path
 * (`'mercy'` — mercy is a first-class ending per VISION.md, so befriending
 * the Coastal Tyrant clears fishing-village exactly like killing him).
 *
 * Pure functions over `WorldState`; the Game store folds the results back
 * (see `endCombat` + the `travelToMap` verb in `src/Game/store.ts`). Built
 * on the existing idempotent `completeMap` / `unlockMap` / `changeMap`
 * reducers in `world.reducer.ts`.
 */

import { WorldState } from './types';
import { MapName } from './map.library';
import { changeMap, completeMap, unlockMap } from './world.reducer';
import { createMapState, getMapDefinition } from './map.registry';

// ─── Boss progression table ─────────────────────────────────────────────────

/** One map's progression wiring: which enemy is its boss, what beating it opens. */
export interface MapProgressionEntry {
    /** `Enemy.id` of the map's boss (survives `scaleEnemyToLevel` cloning). */
    bossEnemyId: string;
    /** Map unlocked on the current continent when the boss is dealt with; `null` = end of the line. */
    unlocks: MapName | null;
}

/**
 * Authored progression per map.
 *
 * `Partial` rather than a total `Record` — only the two coastal-continent
 * maps have authored content today (`MAP_REGISTRY` registers nothing for the
 * northern continent yet), and inventing boss ids for unauthored maps would
 * be dishonest. Grow this table as maps ship.
 *
 * - `fishing-village` — the fv-6 climax is the Coastal Tyrant (the map's one
 *   `isBoss: true` pool, `fv-6.encounter-boss` in `MapEvents/content.ts`);
 *   dealing with him opens the road to `northern-forest`.
 * - `northern-forest` — has NO authored `isBoss: true` encounter. Its
 *   strongest authored encounter is the Mistwalker Shade at nf-19 (level 5,
 *   difficulty `'elite'` — the only non-`normal` foe on the map), so that is
 *   the de-facto climax; nothing further is authored on the continent, hence
 *   `unlocks: null`.
 */
export const MAP_PROGRESSION: Partial<Record<MapName, MapProgressionEntry>> = {
    'fishing-village': { bossEnemyId: 'enemy-coastal-tyrant', unlocks: 'northern-forest' },
    'northern-forest': { bossEnemyId: 'enemy-mistwalker-shade', unlocks: null },
};

/**
 * Applies boss progression after a combat resolution.
 *
 * Fires — returning the progressed `WorldState` — only when ALL hold:
 *   1. `outcome` means the boss was dealt with: `'victory'` (killed) or
 *      `'mercy'` (spared / befriended — the store maps its `'friendship'`
 *      outcome here). Defeat / retreat never progress.
 *   2. `defeatedEnemyId` matches the CURRENT map's `MAP_PROGRESSION` boss —
 *      non-boss kills and bosses of OTHER maps are ignored.
 *   3. The current map isn't already completed (double-completion is a
 *      no-op — the second resolution returns `null`).
 *
 * On fire: `completeMap(currentMap)` + `unlockMap(entry.unlocks)` (when the
 * entry unlocks anything). Returns `null` when no progression fired so the
 * caller can skip the fold-back entirely.
 */
export function applyBossProgression(
    world: WorldState,
    defeatedEnemyId: string,
    outcome: 'victory' | 'mercy',
): WorldState | null {
    // Defensive runtime guard for untyped callers (CLI outcome mapping):
    // only the two "boss dealt with" endings progress.
    if (outcome !== 'victory' && outcome !== 'mercy') return null;

    const mapName = world.currentMap.name;
    const entry = MAP_PROGRESSION[mapName];
    if (!entry || entry.bossEnemyId !== defeatedEnemyId) return null;
    if (world.currentContinent.completedMaps.includes(mapName)) return null;

    let next = completeMap(world, mapName);
    if (entry.unlocks) next = unlockMap(next, entry.unlocks);
    return next;
}

// ─── Map travel ──────────────────────────────────────────────────────────────

/** Thrown by `travelToMap` when the requested destination is not travellable. */
export class IllegalTravelError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IllegalTravelError';
    }
}

/**
 * Travels to `mapName` on the current continent. Pure `WorldState` reducer.
 *
 * Validation: the destination must be in `currentContinent.availableMaps`
 * (locked and unknown maps throw `IllegalTravelError`). Travelling to the
 * map you are already on is an idempotent no-op.
 *
 * Switching resolves a FRESH `createMapState(getMapDefinition(...))` and
 * hands it to the `changeMap` reducer (which, per its contract, expects the
 * caller to resolve the `MapState`). Note on re-entry: `WorldState` only
 * carries `currentMap`, so the departed map's node progress (completed /
 * consumed / discovered nodes, hazard outcomes, blocked routes) is discarded
 * — re-entering a map starts it from its authored initial state. Continent-
 * level progress (`completedMaps` / `availableMaps`) is untouched and
 * persists across travel.
 */
export function travelToMap(world: WorldState, mapName: MapName): WorldState {
    if (world.currentMap.name === mapName) return world;
    const continent = world.currentContinent;
    if (!continent.availableMaps.includes(mapName)) {
        throw new IllegalTravelError(
            `travelToMap: '${mapName}' is not available on '${continent.name}' — ` +
            (continent.lockedMaps.includes(mapName)
                ? 'it is still locked.'
                : 'it is not a map of this continent.'),
        );
    }
    const def = getMapDefinition(continent.name, mapName);
    return changeMap(world, createMapState(def));
}
