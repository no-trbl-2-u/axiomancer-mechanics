/**
 * Encounter Library
 *
 * An `Encounter` is a generated combat instance assembled from the
 * enemy roster filtered by area + level scaling. The `Encounter` type
 * is intentionally narrow — encounters today are single-enemy fights;
 * the type leaves room for future multi-enemy scaling.
 */

import { Enemy } from './types';
import { enemyLibrary, getEnemiesByMap } from './enemy.library';

/**
 * Encounter — an instance of combat with one or more enemies.
 *
 * @property id - Unique identifier; "<enemyId>@<mapName>"
 * @property mapName - The map this encounter was generated for
 * @property recommendedLevel - Player level recommended for this encounter
 * @property enemies - The enemies in this encounter (single-enemy combat for v1)
 */
export interface Encounter {
    id: string;
    mapName: string;
    recommendedLevel: number;
    enemies: Enemy[];
}

/**
 * Generates a single-enemy encounter for the given map and player level.
 *
 * Algorithm:
 *   1. Filter the enemy roster to entries on the requested map.
 *   2. Score each candidate by `|enemyLevel - playerLevel|` (lower = better fit).
 *   3. Pick the closest match, breaking ties by alphabetical id (stable).
 *   4. Return undefined when no enemy on the map fits within ±3 levels.
 *
 * Pure modulo the registry — does NOT mutate any state.
 *
 * @param mapName - Map name to draw from
 * @param playerLevel - Player level for scaling
 * @returns The encounter, or undefined if no enemy fits the criteria
 */
export function generateEncounter(
    mapName: string,
    playerLevel: number,
): Encounter | undefined {
    const candidates = getEnemiesByMap(mapName);
    if (candidates.length === 0) return undefined;

    const sorted = [...candidates].sort((a, b) => {
        const da = Math.abs(a.level - playerLevel);
        const db = Math.abs(b.level - playerLevel);
        if (da !== db) return da - db;
        return a.id.localeCompare(b.id);
    });

    const chosen = sorted[0];
    if (Math.abs(chosen.level - playerLevel) > 3) return undefined;

    return {
        id: `${chosen.id}@${mapName}`,
        mapName,
        recommendedLevel: chosen.level,
        enemies: [chosen],
    };
}

/**
 * Returns every possible encounter on the given map (one per enemy
 * located there). Useful for menu rendering / player previews.
 */
export function listEncountersForMap(mapName: string): Encounter[] {
    return getEnemiesByMap(mapName).map(enemy => ({
        id: `${enemy.id}@${mapName}`,
        mapName,
        recommendedLevel: enemy.level,
        enemies: [enemy],
    }));
}

/**
 * Reference: alphabetised list of every encounter ID across the entire
 * enemy library. Useful for unit tests and debugging.
 */
export function listAllEncounters(): Encounter[] {
    return enemyLibrary.map(e => ({
        id: `${e.id}@${e.mapLocation.name}`,
        mapName: e.mapLocation.name,
        recommendedLevel: e.level,
        enemies: [e],
    }));
}
