import { WorldState, Map } from "./types";
import { MapName } from "./map.library";
import { fishingVillage, northernForest } from "./Continents/Coastal-Village/maps";

/**
 * Custom error for map not found scenarios
 */
class MapNotFoundError extends Error {
  constructor(mapName: string, continent: string = 'Coastal Continent') {
    super(`Map "${mapName}" not found in ${continent}`);
    this.name = 'MapNotFoundError';
  }
}

/**
 * Returns a map based on the map name
 * @param mapName - The name of the map to return
 * @returns The map object
 * @throws MapNotFoundError if map name is not recognized
 */
export function getCoastalMap(mapName: MapName): Map {
  switch (mapName) {
    case 'fishing-village':
      return fishingVillage;
    case 'northern-forest':
      return northernForest;
    default:
      const exhaustiveCheck = mapName as never;
      throw new MapNotFoundError(exhaustiveCheck);
  }
}

/**
 * Creates a new world state with the starting map
 * @returns A new WorldState object with the starting map
 */
export function createStartingWorld(): WorldState {
  return {
    world: [],
    currentContinent: {
      name: 'coastal-continent',
      description: 'The coastal continent is a landmass bordered by the sea to the east and west. It is home to a variety of biomes, including forests, mountains, and plains.',
      availableMaps: ['fishing-village', 'northern-forest'],
      lockedMaps: ['northern-forest'],
      completedMaps: []
    },
    currentMap: getCoastalMap('fishing-village')
  }
}
