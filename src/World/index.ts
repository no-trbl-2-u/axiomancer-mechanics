import { WorldState, Map, MapState, MapEvents } from './types';
import { MapName } from './map.library';
import { fishingVillage } from './Continents/Coastal-Village/maps';
import { northernForest } from './northern-forest.map';

// ─── Map Registry ─────────────────────────────────────────────────────────────

class MapNotFoundError extends Error {
    constructor(mapName: string) {
        super(`Map "${mapName}" not found in any continent.`);
        this.name = 'MapNotFoundError';
    }
}

/**
 * Returns the static Map definition for a given map name.
 * @todo Add northern-continent maps (caverns, northern-city, etc.)
 */
export function getMapByName(mapName: MapName): Map {
    switch (mapName) {
        case 'fishing-village': return fishingVillage;
        case 'northern-forest': return northernForest;
        default:
            throw new MapNotFoundError(mapName as string);
    }
}

// ─── Random Event Pool ────────────────────────────────────────────────────────

/**
 * Weighted pool of event types that can be randomly assigned to un-typed nodes.
 * Encounters appear four times to make the forest feel dangerous.
 * Extend or override this pool per-map in the future.
 */
export const RANDOM_MAP_EVENTS: MapEvents[] = [
    'encounter', 'encounter', 'encounter', 'encounter',
    'treasure',
    'gather',    'gather',
    'event',
    'npc',
];

/**
 * Returns a random MapEvents value from the provided pool (defaults to RANDOM_MAP_EVENTS).
 */
export function getRandomMapEvent(pool: MapEvents[] = RANDOM_MAP_EVENTS): MapEvents {
    return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Map State Lifecycle ──────────────────────────────────────────────────────

/**
 * Initialises a fresh MapState for a run through the given map.
 *
 * All nodes without a fixed type receive a randomly assigned type so that
 * every traversal generates a unique event layout.
 *
 * @param map  - The static Map definition
 * @param pool - Optional custom event pool for random assignment
 * @returns    A new MapState ready for the first move
 */
export function initializeMapState(map: Map, pool?: MapEvents[]): MapState {
    const nodeTypes: Record<string, MapEvents> = {};
    for (const node of map.nodes) {
        nodeTypes[node.id] = node.type ?? getRandomMapEvent(pool);
    }

    const startNode        = map.nodes.find(n => n.id === map.startNodeId);
    const allNodeIds       = map.nodes.map(n => n.id);
    // Guard: only surface connections that actually exist as nodes in this map.
    // connectedNodes referencing un-defined IDs (e.g. stub TODO nodes) are silently skipped.
    const initialAvailable = (startNode?.connectedNodes ?? []).filter(id => allNodeIds.includes(id));

    return {
        mapName:        map.name,
        nodeTypes,
        completedNodes: [],
        availableNodes: initialAvailable,
        lockedNodes:    allNodeIds.filter(
            id => id !== map.startNodeId && !initialAvailable.includes(id),
        ),
        currentNodeId:  map.startNodeId,
    };
}

/**
 * Advances the player to a target node, updating all progression fields.
 *
 * - The previous currentNodeId is marked completed.
 * - The target node's connections are unlocked (unless already seen).
 * - The target becomes the new currentNodeId.
 *
 * Returns state unchanged if targetNodeId is not a valid node in the map.
 */
export function advanceToNode(map: Map, state: MapState, targetNodeId: string): MapState {
    const targetNode = map.nodes.find(n => n.id === targetNodeId);
    if (!targetNode) return state;

    const completedNodes = [...state.completedNodes, state.currentNodeId];
    const allNodeIds     = map.nodes.map(n => n.id);

    const newlyUnlocked = targetNode.connectedNodes.filter(
        // Guard: skip IDs that don't exist as map nodes (stub / TODO connections).
        id => allNodeIds.includes(id) &&
              !completedNodes.includes(id) &&
              !state.availableNodes.includes(id),
    );

    const availableNodes = [
        ...state.availableNodes.filter(id => id !== targetNodeId),
        ...newlyUnlocked,
    ];

    return {
        ...state,
        completedNodes,
        availableNodes,
        lockedNodes:   state.lockedNodes.filter(id => !newlyUnlocked.includes(id)),
        currentNodeId: targetNodeId,
    };
}

// ─── World Initialisation ─────────────────────────────────────────────────────

/**
 * Creates a new WorldState from scratch, starting the player on the fishing village.
 */
export function createStartingWorld(): WorldState {
    const startMap = fishingVillage;
    return {
        world: [],
        currentContinent: {
            name: 'coastal-continent',
            description:
                'The coastal continent is a landmass bordered by the sea to the east and west. ' +
                'It is home to a variety of biomes, including forests, mountains, and plains.',
            availableMaps: ['fishing-village'],
            lockedMaps:    ['northern-forest'],
            completedMaps: [],
        },
        currentMap:      startMap,
        currentMapState: initializeMapState(startMap),
    };
}
