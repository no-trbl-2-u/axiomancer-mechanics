/**
 * World Module Tests
 * Tests for world creation, map navigation, node progression, and event management
 */

import { createStartingWorld, getCoastalMap } from './index';
import {
    changeMap,
    completeMap,
    unlockMap,
    completeNode,
    unlockNode,
    moveToNode,
    changeContinent,
    completeUniqueEvent,
} from './world.reducer';
import { WorldState, Map, Continent } from './types';
import { MapName, ContinentName } from './map.library';

// ============================================================================
// createStartingWorld
// ============================================================================

describe('createStartingWorld', () => {
    it('should create a world state with a current continent', () => {
        const world: WorldState = createStartingWorld();
        expect(world.currentContinent).toBeDefined();
        expect(world.currentContinent.name).toBe('coastal-continent');
    });

    it('should create a world state with a current map', () => {
        const world: WorldState = createStartingWorld();
        expect(world.currentMap).toBeDefined();
        expect(world.currentMap.name).toBe('fishing-village');
    });

    it('should start with an empty world array', () => {
        const world: WorldState = createStartingWorld();
        expect(world.world).toEqual([]);
    });

    it('should have available maps in the starting continent', () => {
        const world: WorldState = createStartingWorld();
        expect(world.currentContinent.availableMaps).toContain('fishing-village');
        expect(world.currentContinent.availableMaps).toContain('northern-forest');
    });

    it('should have locked maps in the starting continent', () => {
        const world: WorldState = createStartingWorld();
        expect(world.currentContinent.lockedMaps).toContain('northern-forest');
    });

    it('should start with no completed maps', () => {
        const world: WorldState = createStartingWorld();
        expect(world.currentContinent.completedMaps).toEqual([]);
    });
});

// ============================================================================
// getCoastalMap
// ============================================================================

describe('getCoastalMap', () => {
    it('should return fishing-village map', () => {
        const map: Map = getCoastalMap('fishing-village');
        expect(map.name).toBe('fishing-village');
    });

    it('should return northern-forest map', () => {
        const map: Map = getCoastalMap('northern-forest');
        expect(map.name).toBe('northern-forest');
    });

    it('should return maps with the coastal-continent', () => {
        const map: Map = getCoastalMap('fishing-village');
        expect(map.continent).toBe('coastal-continent');
    });

    it('should return maps with a starting node', () => {
        const map: Map = getCoastalMap('fishing-village');
        expect(map.startingNode).toBeDefined();
        expect(map.startingNode.id).toBeDefined();
    });

    it('should return maps with available nodes', () => {
        const map: Map = getCoastalMap('fishing-village');
        expect(Array.isArray(map.availableNodes)).toBe(true);
    });
});

// ============================================================================
// WORLD REDUCER: changeMap
// ============================================================================

describe('changeMap', () => {
    it('should change the current map name', () => {
        const world: WorldState = createStartingWorld();
        const updated: WorldState = changeMap(world, 'northern-forest');
        expect(updated.currentMap.name).toBe('northern-forest');
    });

    it('should not change map if not in available maps', () => {
        const world: WorldState = {
            ...createStartingWorld(),
            currentContinent: {
                ...createStartingWorld().currentContinent,
                availableMaps: ['fishing-village'],
            },
        };
        const updated: WorldState = changeMap(world, 'northern-forest');
        expect(updated.currentMap.name).toBe('fishing-village');
    });

    it('should not mutate the original state', () => {
        const world: WorldState = createStartingWorld();
        changeMap(world, 'northern-forest');
        expect(world.currentMap.name).toBe('fishing-village');
    });
});

// ============================================================================
// WORLD REDUCER: completeMap
// ============================================================================

describe('completeMap', () => {
    it('should add map to completed maps', () => {
        const world: WorldState = createStartingWorld();
        const updated: WorldState = completeMap(world, 'fishing-village');
        expect(updated.currentContinent.completedMaps).toContain('fishing-village');
    });

    it('should not add duplicate completed maps', () => {
        let world: WorldState = createStartingWorld();
        world = completeMap(world, 'fishing-village');
        world = completeMap(world, 'fishing-village');
        expect(world.currentContinent.completedMaps.filter(
            (m: MapName) => m === 'fishing-village'
        )).toHaveLength(1);
    });

    it('should not mutate the original state', () => {
        const world: WorldState = createStartingWorld();
        completeMap(world, 'fishing-village');
        expect(world.currentContinent.completedMaps).toEqual([]);
    });
});

// ============================================================================
// WORLD REDUCER: unlockMap
// ============================================================================

describe('unlockMap', () => {
    it('should remove the map from locked maps', () => {
        const world: WorldState = createStartingWorld();
        const updated: WorldState = unlockMap(world, 'northern-forest');
        expect(updated.currentContinent.lockedMaps).not.toContain('northern-forest');
    });

    it('should not add duplicate to available maps', () => {
        const world: WorldState = createStartingWorld();
        const updated: WorldState = unlockMap(world, 'northern-forest');
        const count: number = updated.currentContinent.availableMaps.filter(
            (m: MapName) => m === 'northern-forest'
        ).length;
        expect(count).toBe(1);
    });

    it('should not mutate the original state', () => {
        const world: WorldState = createStartingWorld();
        unlockMap(world, 'northern-forest');
        expect(world.currentContinent.lockedMaps).toContain('northern-forest');
    });
});

// ============================================================================
// WORLD REDUCER: completeNode
// ============================================================================

describe('completeNode', () => {
    it('should add node to completed nodes', () => {
        const world: WorldState = createStartingWorld();
        const updated: WorldState = completeNode(world, 'fv-2');
        expect(updated.currentMap.completedNodes).toContain('fv-2');
    });

    it('should remove node from available nodes', () => {
        const world: WorldState = createStartingWorld();
        const updated: WorldState = completeNode(world, 'fv-2');
        expect(updated.currentMap.availableNodes).not.toContain('fv-2');
    });

    it('should not add duplicate completed nodes', () => {
        let world: WorldState = createStartingWorld();
        world = completeNode(world, 'fv-2');
        world = completeNode(world, 'fv-2');
        expect(world.currentMap.completedNodes.filter(
            (n: string) => n === 'fv-2'
        )).toHaveLength(1);
    });

    it('should not mutate the original state', () => {
        const world: WorldState = createStartingWorld();
        completeNode(world, 'fv-2');
        expect(world.currentMap.completedNodes).toEqual([]);
    });
});

// ============================================================================
// WORLD REDUCER: unlockNode
// ============================================================================

describe('unlockNode', () => {
    it('should remove node from locked nodes', () => {
        const world: WorldState = createStartingWorld();
        const updated: WorldState = unlockNode(world, 'fv-3');
        expect(updated.currentMap.lockedNodes).not.toContain('fv-3');
    });

    it('should add node to available nodes', () => {
        const world: WorldState = createStartingWorld();
        const updated: WorldState = unlockNode(world, 'fv-3');
        expect(updated.currentMap.availableNodes).toContain('fv-3');
    });

    it('should not add duplicate available nodes', () => {
        let world: WorldState = createStartingWorld();
        world = unlockNode(world, 'fv-3');
        world = unlockNode(world, 'fv-3');
        const count: number = world.currentMap.availableNodes.filter(
            (n: string) => n === 'fv-3'
        ).length;
        expect(count).toBe(1);
    });
});

// ============================================================================
// WORLD REDUCER: moveToNode
// ============================================================================

describe('moveToNode', () => {
    it('should update the starting node to the target node', () => {
        const world: WorldState = createStartingWorld();
        const updated: WorldState = moveToNode(world, 'fv-2');
        expect(updated.currentMap.startingNode.id).toBe('fv-2');
    });

    it('should not move to an unavailable node', () => {
        const world: WorldState = createStartingWorld();
        const updated: WorldState = moveToNode(world, 'fv-10');
        expect(updated.currentMap.startingNode.id).toBe('fv-1');
    });
});

// ============================================================================
// WORLD REDUCER: changeContinent
// ============================================================================

describe('changeContinent', () => {
    it('should change the current continent when found in world array', () => {
        const northernContinent: Continent = {
            name: 'northern-continent',
            description: 'The northern continent',
            availableMaps: ['caverns'],
            lockedMaps: [],
            completedMaps: [],
        };
        const world: WorldState = {
            ...createStartingWorld(),
            world: [northernContinent],
        };
        const updated: WorldState = changeContinent(world, 'northern-continent');
        expect(updated.currentContinent.name).toBe('northern-continent');
    });

    it('should not change if continent not found', () => {
        const world: WorldState = createStartingWorld();
        const updated: WorldState = changeContinent(world, 'northern-continent');
        expect(updated.currentContinent.name).toBe('coastal-continent');
    });
});

// ============================================================================
// WORLD REDUCER: completeUniqueEvent
// ============================================================================

describe('completeUniqueEvent', () => {
    it('should mark a unique event as completed', () => {
        const world: WorldState = {
            ...createStartingWorld(),
            currentMap: {
                ...createStartingWorld().currentMap,
                uniqueEvents: [
                    {
                        id: 'event-01',
                        name: 'encounter',
                        description: 'A test event',
                        nodeLocation: [0, 0] as [number, number],
                        completed: false,
                    },
                ],
            },
        };
        const updated: WorldState = completeUniqueEvent(world, 'event-01');
        expect(updated.currentMap.uniqueEvents[0].completed).toBe(true);
    });

    it('should not affect other events', () => {
        const world: WorldState = {
            ...createStartingWorld(),
            currentMap: {
                ...createStartingWorld().currentMap,
                uniqueEvents: [
                    {
                        id: 'event-01',
                        name: 'encounter',
                        description: 'Event 1',
                        nodeLocation: [0, 0] as [number, number],
                        completed: false,
                    },
                    {
                        id: 'event-02',
                        name: 'treasure',
                        description: 'Event 2',
                        nodeLocation: [1, 1] as [number, number],
                        completed: false,
                    },
                ],
            },
        };
        const updated: WorldState = completeUniqueEvent(world, 'event-01');
        expect(updated.currentMap.uniqueEvents[1].completed).toBe(false);
    });
});
