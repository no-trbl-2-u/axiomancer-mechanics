import { WorldState, Map } from "./types";
import { MapName } from "./map.library";
import { coastalContinent, coastalContinentMaps } from "./continents/coastal-village";

/**
 * Custom error for map not found scenarios
 */
export class MapNotFoundError extends Error {
  constructor(mapName: string, continent: string = 'Coastal Continent') {
    super(`Map "${mapName}" not found in ${continent}`);
    this.name = 'MapNotFoundError';
  }
}

/**
 * Registry of all known maps by name. Continents register their maps into this
 * shared lookup so the world reducer can resolve a Map without hardcoding
 * per-continent switches.
 *
 * (Currently only the coastal continent is content-complete; northern-continent
 * maps will register additional entries here as they're implemented.)
 */
const MAP_REGISTRY: Partial<Record<MapName, Map>> = {
  ...coastalContinentMaps,
};

/**
 * Returns a map definition by name, or throws MapNotFoundError.
 * Registry-backed lookup — see continents/<continent>/index.ts.
 */
export function getMapByName(mapName: MapName): Map {
  const map = MAP_REGISTRY[mapName];
  if (!map) throw new MapNotFoundError(mapName);
  return map;
}

/**
 * Creates a new world state with the starting map.
 *
 * Fixes the previous contradictory state where 'northern-forest' was both
 * available AND locked: now it lives only in `lockedMaps` until unlocked
 * via `unlockMap`. See REORG-PROPOSAL §7 / AUDIT.md §7.5.
 */
export function createStartingWorld(): WorldState {
  return {
    world: [],
    currentContinent: { ...coastalContinent },
    currentMap: getMapByName('fishing-village'),
  };
}

// ============================================================================
// SUBPATH RE-EXPORTS
// ============================================================================

export type { WorldState, Map, Continent, Quest, MapEvent, Reward } from './types';
export type { MapName, ContinentName } from './map.library';
export {
  changeMap, completeMap, unlockMap,
  completeNode, unlockNode, moveToNode,
  changeContinent, completeUniqueEvent,
} from './world.reducer';