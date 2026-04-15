/**
 * World Reducer
 * Functions that create or modify WorldState objects.
 * All functions here are pure and return new state objects.
 */

import { WorldState, Map } from "./types";
import { MapName, ContinentName } from "./map.library";

// ============================================================================
// MAP NAVIGATION
// ============================================================================

/**
 * Changes the current map in the world state.
 * Caller is responsible for looking up the Map object from the map library.
 * @param state - The current world state
 * @param map - The Map object to navigate to
 * @returns Updated world state with new current map
 */
export function changeMap(state: WorldState, map: Map): WorldState {
    return { ...state, currentMap: map };
}

/**
 * Marks a map as completed on the current continent.
 * Idempotent — does nothing if the map is already completed.
 * @param state - The current world state
 * @param mapName - The name of the map to complete
 * @returns Updated world state with map marked as completed
 */
export function completeMap(state: WorldState, mapName: MapName): WorldState {
    const continent = state.currentContinent;
    if (continent.completedMaps.includes(mapName)) return state;
    return {
        ...state,
        currentContinent: {
            ...continent,
            completedMaps: [...continent.completedMaps, mapName],
        },
    };
}

/**
 * Unlocks a locked map, making it available for navigation.
 * Moves the map from lockedMaps to availableMaps.
 * Idempotent — does nothing if the map is already available.
 * @param state - The current world state
 * @param mapName - The name of the map to unlock
 * @returns Updated world state with map unlocked
 */
export function unlockMap(state: WorldState, mapName: MapName): WorldState {
    const continent = state.currentContinent;
    if (continent.availableMaps.includes(mapName)) return state;
    return {
        ...state,
        currentContinent: {
            ...continent,
            lockedMaps: continent.lockedMaps.filter(m => m !== mapName),
            availableMaps: [...continent.availableMaps, mapName],
        },
    };
}

// ============================================================================
// NODE PROGRESSION
// ============================================================================

/**
 * Marks a node as completed on the current map.
 * Idempotent — does nothing if the node is already completed.
 * @param state - The current world state
 * @param nodeId - The ID of the node to complete
 * @returns Updated world state with node marked as completed
 */
export function completeNode(state: WorldState, nodeId: string): WorldState {
    const map = state.currentMap;
    if (map.completedNodes.includes(nodeId)) return state;
    return {
        ...state,
        currentMap: {
            ...map,
            completedNodes: [...map.completedNodes, nodeId],
        },
    };
}

/**
 * Unlocks a node, making it available for traversal.
 * Moves the node from lockedNodes to availableNodes.
 * Idempotent — does nothing if the node is already available.
 * @param state - The current world state
 * @param nodeId - The ID of the node to unlock
 * @returns Updated world state with node unlocked
 */
export function unlockNode(state: WorldState, nodeId: string): WorldState {
    const map = state.currentMap;
    if (map.availableNodes.includes(nodeId)) return state;
    return {
        ...state,
        currentMap: {
            ...map,
            lockedNodes: map.lockedNodes.filter(n => n !== nodeId),
            availableNodes: [...map.availableNodes, nodeId],
        },
    };
}

/**
 * Moves the player to a connected node on the current map.
 * TODO (Phase 7): implement node traversal with event triggers.
 * @param state - The current world state
 * @param _nodeId - The ID of the node to move to
 * @returns Updated world state with new current node
 */
export function moveToNode(state: WorldState, _nodeId: string): WorldState {
    return state;
}

// ============================================================================
// CONTINENT NAVIGATION
// ============================================================================

/**
 * Changes the current continent.
 * Looks up the continent by name from the world array.
 * Returns unchanged state if continent is not found.
 * @param state - The current world state
 * @param continentName - The name of the continent to navigate to
 * @returns Updated world state with new current continent
 */
export function changeContinent(state: WorldState, continentName: ContinentName): WorldState {
    const continent = state.world.find(c => c.name === continentName);
    if (!continent) return state;
    return { ...state, currentContinent: continent };
}

// ============================================================================
// EVENT MANAGEMENT
// ============================================================================

/**
 * Marks a unique event as completed on the current map.
 * @param state - The current world state
 * @param eventId - The ID of the event to mark as completed
 * @returns Updated world state with event completed
 */
export function completeUniqueEvent(state: WorldState, eventId: string): WorldState {
    return {
        ...state,
        currentMap: {
            ...state.currentMap,
            uniqueEvents: state.currentMap.uniqueEvents.map(e =>
                e.id === eventId ? { ...e, completed: true } : e
            ),
        },
    };
}
