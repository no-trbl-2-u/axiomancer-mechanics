/**
 * World Reducer
 * Functions that create or modify WorldState objects.
 * All functions here are pure and return new state objects.
 */

import { WorldState, Map } from "./types";
import { MapName, ContinentName } from "./map.library";
import { Character } from "../Character/types";
import { processWorldEffectTick, WorldEffectTickResult } from "../Effects";

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
 *
 * Currently a stub that returns `state` unchanged so callers can
 * compose this into a future event-triggering pipeline. The Phase 8
 * `processNode` orchestrator below is responsible for triggering events
 * and ticking persistent hazards via `moveToNodeWithEffects`.
 *
 * @param state - The current world state
 * @param _nodeId - The ID of the node to move to
 * @returns Updated world state (currently identical to input)
 */
export function moveToNode(state: WorldState, _nodeId: string): WorldState {
    return state;
}

/**
 * Moves the player to a node and ticks any persistent hazard effects
 * (poison, regen, curses) on arrival.
 *
 * Validation:
 *   - The target node must be in `availableNodes` (already unlocked).
 *     Out-of-list movements no-op and return `tick: null`.
 *
 * Effects:
 *   - Persistent hazards / regen tick exactly once per move via
 *     `processWorldEffectTick`. The caller (typically the game reducer
 *     in Phase 8) is responsible for applying the resulting Character
 *     to the GameState.
 *
 * @param state - The current world state
 * @param nodeId - The ID of the node to move to
 * @param player - The player character to tick effects on
 * @returns Updated world state and the ticked Character + event log
 */
export function moveToNodeWithEffects(
    state: WorldState,
    nodeId: string,
    player: Character,
): { state: WorldState; tick: WorldEffectTickResult | null } {
    if (!state.currentMap.availableNodes.includes(nodeId)) {
        return { state, tick: null };
    }
    const tick = processWorldEffectTick(player);
    return { state, tick };
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
