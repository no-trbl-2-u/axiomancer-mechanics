/**
 * World Reducer
 * Functions that create or modify WorldState objects
 * All functions here are pure and return new state objects
 */

import { WorldState, Continent } from "./types";
import { MapName, ContinentName } from "./map.library";

// ============================================================================
// MAP NAVIGATION
// ============================================================================

/**
 * Changes the current map in the world state
 * @param state - The current world state
 * @param mapName - The name of the map to navigate to
 * @returns Updated world state with new current map
 */
export function changeMap(state: WorldState, mapName: MapName): WorldState {
    if (!state.currentContinent.availableMaps.includes(mapName)) {
        return state;
    }

    return {
        ...state,
        currentMap: {
            ...state.currentMap,
            name: mapName,
        },
    };
}

/**
 * Marks a map as completed
 * @param state - The current world state
 * @param mapName - The name of the map to complete
 * @returns Updated world state with map marked as completed
 */
export function completeMap(state: WorldState, mapName: MapName): WorldState {
    const updatedContinent: Continent = {
        ...state.currentContinent,
        completedMaps: state.currentContinent.completedMaps.includes(mapName)
            ? state.currentContinent.completedMaps
            : [...state.currentContinent.completedMaps, mapName],
    };

    return {
        ...state,
        currentContinent: updatedContinent,
    };
}

/**
 * Unlocks a locked map, making it available for navigation
 * @param state - The current world state
 * @param mapName - The name of the map to unlock
 * @returns Updated world state with map unlocked
 */
export function unlockMap(state: WorldState, mapName: MapName): WorldState {
    const updatedContinent: Continent = {
        ...state.currentContinent,
        lockedMaps: state.currentContinent.lockedMaps.filter(
            (name: MapName) => name !== mapName
        ),
        availableMaps: state.currentContinent.availableMaps.includes(mapName)
            ? state.currentContinent.availableMaps
            : [...state.currentContinent.availableMaps, mapName],
    };

    return {
        ...state,
        currentContinent: updatedContinent,
    };
}

// ============================================================================
// NODE PROGRESSION
// ============================================================================

/**
 * Marks a node as completed on the current map
 * @param state - The current world state
 * @param nodeId - The ID of the node to complete
 * @returns Updated world state with node marked as completed
 */
export function completeNode(state: WorldState, nodeId: string): WorldState {
    return {
        ...state,
        currentMap: {
            ...state.currentMap,
            completedNodes: state.currentMap.completedNodes.includes(nodeId)
                ? state.currentMap.completedNodes
                : [...state.currentMap.completedNodes, nodeId],
            availableNodes: state.currentMap.availableNodes.filter(
                (id: string) => id !== nodeId
            ),
        },
    };
}

/**
 * Unlocks a node, making it available for traversal
 * @param state - The current world state
 * @param nodeId - The ID of the node to unlock
 * @returns Updated world state with node unlocked
 */
export function unlockNode(state: WorldState, nodeId: string): WorldState {
    return {
        ...state,
        currentMap: {
            ...state.currentMap,
            lockedNodes: state.currentMap.lockedNodes.filter(
                (id: string) => id !== nodeId
            ),
            availableNodes: state.currentMap.availableNodes.includes(nodeId)
                ? state.currentMap.availableNodes
                : [...state.currentMap.availableNodes, nodeId],
        },
    };
}

/**
 * Moves the player to a connected node
 * @param state - The current world state
 * @param nodeId - The ID of the node to move to
 * @returns Updated world state with new current node
 */
export function moveToNode(state: WorldState, nodeId: string): WorldState {
    if (!state.currentMap.availableNodes.includes(nodeId)) {
        return state;
    }

    const targetNode = {
        id: nodeId,
        location: [0, 0] as [number, number],
        connectedNodes: [] as string[],
    };

    return {
        ...state,
        currentMap: {
            ...state.currentMap,
            startingNode: targetNode,
        },
    };
}

// ============================================================================
// CONTINENT NAVIGATION
// ============================================================================

/**
 * Changes the current continent
 * @param state - The current world state
 * @param continentName - The name of the continent to navigate to
 * @returns Updated world state with new current continent
 */
export function changeContinent(state: WorldState, continentName: ContinentName): WorldState {
    const targetContinent: Continent | undefined = state.world.find(
        (c: Continent) => c.name === continentName
    );

    if (!targetContinent) {
        return state;
    }

    return {
        ...state,
        currentContinent: targetContinent,
    };
}

// ============================================================================
// EVENT MANAGEMENT
// ============================================================================

/**
 * Marks a unique event as completed
 * @param state - The current world state
 * @param eventId - The ID of the event to mark as completed
 * @returns Updated world state with event completed
 */
export function completeUniqueEvent(state: WorldState, eventId: string): WorldState {
    return {
        ...state,
        currentMap: {
            ...state.currentMap,
            uniqueEvents: state.currentMap.uniqueEvents.map((event) =>
                event.id === eventId
                    ? { ...event, completed: true }
                    : event
            ),
        },
    };
}
