import { WorldState, WorldMap } from './types';
import { MapName } from './map.library';
import { fishingVillage, northernForest } from './Continents/Coastal-Village/maps';

/** Thrown when the world tries to navigate to a map that isn't registered. */
export class MapNotFoundError extends Error {
    constructor(mapName: string, continent: string = 'Coastal Continent') {
        super(`Map "${mapName}" not found in ${continent}`);
        this.name = 'MapNotFoundError';
    }
}

/** Resolves a `MapName` belonging to the Coastal Continent into a `WorldMap`. */
export function getCoastalMap(mapName: MapName): WorldMap {
    switch (mapName) {
        case 'fishing-village':
            return fishingVillage;
        case 'northern-forest':
            return northernForest;
        default: {
            const exhaustiveCheck = mapName as never;
            throw new MapNotFoundError(exhaustiveCheck);
        }
    }
}

/** Builds the initial WorldState for a new save. */
export function createStartingWorld(): WorldState {
    return {
        world: [],
        currentContinent: {
            name: 'coastal-continent',
            description: 'The coastal continent is a landmass bordered by the sea to the east and west. It is home to a variety of biomes, including forests, mountains, and plains.',
            availableMaps: ['fishing-village'],
            lockedMaps: ['northern-forest'],
            completedMaps: [],
        },
        currentMap: getCoastalMap('fishing-village'),
    };
}

export type {
    WorldState, WorldMap, Continent, Quest, MapEvent, MapEventType, UniqueEvent,
    Reward, MapNode, NodeId,
} from './types';
export type { MapName, ContinentName } from './map.library';
export type { QuestName } from './quest.library';
