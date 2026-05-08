/**
 * World reducer — pure transitions over WorldState. Idempotent where it
 * makes sense (locking/unlocking, completing).
 */

import { WorldState, WorldMap } from './types';
import { MapName, ContinentName } from './map.library';

// ── Map navigation ──────────────────────────────────────────────────────────

/** Sets the current map. Caller resolves the WorldMap from the registry. */
export function changeMap(state: WorldState, map: WorldMap): WorldState {
    return { ...state, currentMap: map };
}

/** Marks a map as completed on the current continent. Idempotent. */
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

/** Moves a map from `lockedMaps` to `availableMaps`. Idempotent. */
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

// ── Node progression ────────────────────────────────────────────────────────

/** Marks a node as completed on the current map. Idempotent. */
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

/** Moves a node from `lockedNodes` to `availableNodes`. Idempotent. */
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

// ── Continent navigation ────────────────────────────────────────────────────

/** Switches to the named continent. No-op when the name is not in `state.world`. */
export function changeContinent(state: WorldState, continentName: ContinentName): WorldState {
    const continent = state.world.find(c => c.name === continentName);
    if (!continent) return state;
    return { ...state, currentContinent: continent };
}

// ── Event management ────────────────────────────────────────────────────────

/** Marks a unique event as completed on the current map. */
export function completeUniqueEvent(state: WorldState, eventId: string): WorldState {
    return {
        ...state,
        currentMap: {
            ...state.currentMap,
            uniqueEvents: state.currentMap.uniqueEvents.map(e =>
                e.id === eventId ? { ...e, completed: true } : e,
            ),
        },
    };
}
