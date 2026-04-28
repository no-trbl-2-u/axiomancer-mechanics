import { Map } from "World/types";

/**
 * CoastalContinentMapNames are all the maps in the Coastal Continent
 * - 'fishing-village': Starting village. Get quest to build boat
 * - 'northern-forest': Small forest. First set of encounters. Gather Wood
 * @todo: Add more maps
 * @todo: Come up with better names
 */
export type CoastalContinentMapNames =
  'fishing-village' |
  'northern-forest';

const fishingVillage: Map = {
  name: 'fishing-village',
  continent: 'coastal-continent',
  description: 'Your home town is filled with familiar faces, salty air as you hear the waves crash in the distance, and old shacks connected to the docks.',
  startingNode: {
    id: "fv-1",
    location: [0, 0],
    connectedNodes: ["fv-2"]
  },
  // @todo: Differentiate between Map and MapState
  completedNodes: [],
  availableNodes: ["fv-2"],
  lockedNodes: ["fv-3", "fv-4", "fv-5", "fv-6", "fv-7", "fv-8", "fv-9", "fv-10"],
  npcs: [],
  enemies: [],
  availableEvents: [],
  uniqueEvents: [],
  images: {
    mapImage: { alt: '', src: '' },
    combatImage: { alt: '', src: '' }
  }
}

const northernForest: Map = {
  name: 'northern-forest',
  continent: 'coastal-continent',
  description: 'TODO',
  startingNode: {
    id: "nf-1",
    location: [0, 0],
    connectedNodes: ["nf-2", "nf-3"]
  },
  completedNodes: [],
  availableNodes: ["nf-2", "nf-3"],
  lockedNodes: ["nf-4", "nf-5", "nf-6", "nf-7", "nf-8", "nf-9", "nf-10"],
  npcs: [],
  enemies: [],
  availableEvents: [],
  uniqueEvents: [],
  images: {
    mapImage: { alt: '', src: '' },
    combatImage: { alt: '', src: '' }
  }
}

export { fishingVillage, northernForest }