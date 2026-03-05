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
  startNodeId: 'fv-1',
  exitNodeId: 'fv-10',
  nodes: [
    { id: 'fv-1',  type: 'start',   location: [0, 0],   connectedNodes: ['fv-2'] },
    { id: 'fv-2',  type: 'npc',     location: [1, 0],   connectedNodes: ['fv-3', 'fv-4'] },
    // TODO: define remaining nodes
    { id: 'fv-10', type: 'exit',    location: [5, 0],   connectedNodes: [] },
  ],
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
  startNodeId: 'nf-1',
  exitNodeId: 'nf-10',
  nodes: [
    { id: 'nf-1',  type: 'start',     location: [0, 0],   connectedNodes: ['nf-2', 'nf-3'] },
    { id: 'nf-2',  type: 'encounter', location: [1, -1],  connectedNodes: [] },
    { id: 'nf-3',  type: 'encounter', location: [1, 1],   connectedNodes: [] },
    // TODO: define remaining nodes
    { id: 'nf-10', type: 'exit',      location: [5, 0],   connectedNodes: [] },
  ],
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