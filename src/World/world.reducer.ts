/**
 * World Reducer — pure functions that modify WorldState.
 */

import { WorldState, Map } from "./types";
import { MapName, ContinentName } from "./map.library";

// ============================================================================
// MAP NAVIGATION
// ============================================================================

/** Sets the current map. Caller is responsible for looking up the Map object. */
export function changeMap(state: WorldState, map: Map): WorldState {
    return { ...state, currentMap: map };
}

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

export function moveToNode(state: WorldState, _nodeId: string): WorldState {
    return state;
}

// ============================================================================
// CONTINENT NAVIGATION
// ============================================================================

export function changeContinent(state: WorldState, continentName: ContinentName): WorldState {
    const continent = state.world.find(c => c.name === continentName);
    if (!continent) return state;
    return { ...state, currentContinent: continent };
}

// ============================================================================
// EVENT MANAGEMENT
// ============================================================================

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
