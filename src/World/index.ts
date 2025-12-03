import { WorldState, Map } from "./types";
import { MapName } from "./map.library";
import { fishingVillage, northernForest } from "./Continents/Coastal-Village/maps";

/**
 * Returns a map based on the map name
 * @param mapName The name of the map to return
 * @returns The map object
 */
function getCoastalMap(mapName: MapName): Map {
  switch (mapName) {
    case 'fishing-village':
      return fishingVillage;
    case 'northern-forest':
      return northernForest;
    default:
      throw new Error('Invalid map name');
  }
}

/**
 * Creates a new world state with the starting map
 * @returns A new WorldState object with the starting map
 */
export function createStartingWorld(): WorldState {
  return {
    world: [],
    // @todo: Create a getCoastalContinent function
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