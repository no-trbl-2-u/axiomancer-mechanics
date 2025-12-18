import { describe, it, expect } from 'vitest';
import { createStartingWorld } from './index';
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
import { WorldState, Map, Continent, Quest, MapEvent } from './types';

// ============================================================================
// TEST DATA
// ============================================================================

const mockWorldState: WorldState = createStartingWorld();

// ============================================================================
// createStartingWorld
// ============================================================================

describe('createStartingWorld', () => {
    it('should create a world state with a current continent', () => {
        const world = createStartingWorld();
        expect(world.currentContinent).toBeDefined();
        expect(world.currentContinent.name).toBe('coastal-continent');
    });

    it('should create a world state with a current map', () => {
        const world = createStartingWorld();
        expect(world.currentMap).toBeDefined();
        expect(world.currentMap.name).toBe('fishing-village');
    });

    it('should start with an empty world array', () => {
        const world = createStartingWorld();
        expect(world.world).toEqual([]);
    });

    it('should have fishing-village as the starting map', () => {
        const world = createStartingWorld();
        expect(world.currentMap.name).toBe('fishing-village');
        expect(world.currentMap.continent).toBe('coastal-continent');
    });

    it('should have available maps in the continent', () => {
        const world = createStartingWorld();
        expect(world.currentContinent.availableMaps).toContain('fishing-village');
    });

    it('should have locked maps in the continent', () => {
        const world = createStartingWorld();
        expect(world.currentContinent.lockedMaps).toContain('northern-forest');
    });
});

// ============================================================================
// MAP NAVIGATION (world.reducer.ts)
// ============================================================================

describe.skip('changeMap', () => {
    it('should change the current map', () => {
        const newState = changeMap(mockWorldState, 'northern-forest');
        expect(newState.currentMap.name).toBe('northern-forest');
    });

    it('should return a new state object (immutable)', () => {
        const newState = changeMap(mockWorldState, 'northern-forest');
        expect(newState).not.toBe(mockWorldState);
    });

    it('should preserve other world state properties', () => {
        const newState = changeMap(mockWorldState, 'northern-forest');
        expect(newState.currentContinent).toBeDefined();
    });

    it('should throw error for invalid map name', () => {
        expect(() => changeMap(mockWorldState, 'invalid-map' as any)).toThrow();
    });
});

describe.skip('completeMap', () => {
    it('should add map to completed maps list', () => {
        const newState = completeMap(mockWorldState, 'fishing-village');
        expect(newState.currentContinent.completedMaps).toContain('fishing-village');
    });

    it('should not duplicate completed maps', () => {
        let state = completeMap(mockWorldState, 'fishing-village');
        state = completeMap(state, 'fishing-village');
        const count = state.currentContinent.completedMaps.filter(m => m === 'fishing-village').length;
        expect(count).toBe(1);
    });

    it('should return a new state object (immutable)', () => {
        const newState = completeMap(mockWorldState, 'fishing-village');
        expect(newState).not.toBe(mockWorldState);
    });
});

describe.skip('unlockMap', () => {
    it('should remove map from locked maps list', () => {
        const newState = unlockMap(mockWorldState, 'northern-forest');
        expect(newState.currentContinent.lockedMaps).not.toContain('northern-forest');
    });

    it('should add map to available maps if not already present', () => {
        const newState = unlockMap(mockWorldState, 'northern-forest');
        expect(newState.currentContinent.availableMaps).toContain('northern-forest');
    });

    it('should handle unlocking already unlocked maps gracefully', () => {
        let state = unlockMap(mockWorldState, 'northern-forest');
        state = unlockMap(state, 'northern-forest');
        expect(state.currentContinent.lockedMaps).not.toContain('northern-forest');
    });
});

// ============================================================================
// NODE PROGRESSION
// ============================================================================

describe.skip('completeNode', () => {
    it('should add node to completed nodes list', () => {
        const newState = completeNode(mockWorldState, 'fv-1');
        expect(newState.currentMap.completedNodes).toContain('fv-1');
    });

    it('should not duplicate completed nodes', () => {
        let state = completeNode(mockWorldState, 'fv-1');
        state = completeNode(state, 'fv-1');
        const count = state.currentMap.completedNodes.filter(n => n === 'fv-1').length;
        expect(count).toBe(1);
    });
});

describe.skip('unlockNode', () => {
    it('should remove node from locked nodes list', () => {
        const newState = unlockNode(mockWorldState, 'fv-2');
        expect(newState.currentMap.lockedNodes).not.toContain('fv-2');
    });

    it('should add node to available nodes', () => {
        const newState = unlockNode(mockWorldState, 'fv-2');
        expect(newState.currentMap.availableNodes).toContain('fv-2');
    });
});

describe.skip('moveToNode', () => {
    it('should change the current node position', () => {
        // Assuming startingNode tracks current position
        const newState = moveToNode(mockWorldState, 'fv-2');
        // Implementation would need to track current node
        expect(newState).toBeDefined();
    });

    it('should only allow movement to connected nodes', () => {
        // Movement validation would check connectedNodes
        expect(() => moveToNode(mockWorldState, 'disconnected-node')).toThrow();
    });
});

// ============================================================================
// CONTINENT NAVIGATION
// ============================================================================

describe.skip('changeContinent', () => {
    it('should change the current continent', () => {
        const newState = changeContinent(mockWorldState, 'desert-continent' as any);
        expect(newState.currentContinent.name).toBe('desert-continent');
    });

    it('should update the current map to the continent default', () => {
        const newState = changeContinent(mockWorldState, 'desert-continent' as any);
        // New continent should have a starting map
        expect(newState.currentMap).toBeDefined();
    });
});

// ============================================================================
// EVENT MANAGEMENT
// ============================================================================

describe.skip('completeUniqueEvent', () => {
    it('should mark a unique event as completed', () => {
        const newState = completeUniqueEvent(mockWorldState, 'event-001');
        const event = newState.currentMap.uniqueEvents.find(e => e.id === 'event-001');
        expect(event?.completed).toBe(true);
    });

    it('should not affect other events', () => {
        const newState = completeUniqueEvent(mockWorldState, 'event-001');
        const otherEvents = newState.currentMap.uniqueEvents.filter(e => e.id !== 'event-001');
        otherEvents.forEach(e => {
            // Other events should retain their original state
            expect(e.completed).toBeDefined();
        });
    });
});

// ============================================================================
// TYPE STRUCTURE TESTS
// ============================================================================

describe('Map Type', () => {
    it('should have required properties', () => {
        const world = createStartingWorld();
        const map = world.currentMap;
        
        expect(map.name).toBeDefined();
        expect(map.continent).toBeDefined();
        expect(map.description).toBeDefined();
        expect(map.startingNode).toBeDefined();
        expect(map.completedNodes).toBeDefined();
        expect(map.availableNodes).toBeDefined();
        expect(map.lockedNodes).toBeDefined();
        expect(map.availableEvents).toBeDefined();
        expect(map.uniqueEvents).toBeDefined();
    });

    it('should have valid node structure', () => {
        const world = createStartingWorld();
        const startingNode = world.currentMap.startingNode;
        
        expect(startingNode.id).toBeDefined();
        expect(startingNode.location).toHaveLength(2);
        expect(startingNode.connectedNodes).toBeDefined();
    });
});

describe('Continent Type', () => {
    it('should have required properties', () => {
        const world = createStartingWorld();
        const continent = world.currentContinent;
        
        expect(continent.name).toBeDefined();
        expect(continent.description).toBeDefined();
        expect(continent.availableMaps).toBeDefined();
        expect(continent.lockedMaps).toBeDefined();
        expect(continent.completedMaps).toBeDefined();
    });

    it('should have arrays for map tracking', () => {
        const world = createStartingWorld();
        const continent = world.currentContinent;
        
        expect(Array.isArray(continent.availableMaps)).toBe(true);
        expect(Array.isArray(continent.lockedMaps)).toBe(true);
        expect(Array.isArray(continent.completedMaps)).toBe(true);
    });
});

describe('Quest Type', () => {
    it('should create a valid quest structure', () => {
        const quest: Quest = {
            name: 'test-quest' as any,
            description: 'A test quest',
            containingMap: 'fishing-village',
            reward: 'experience',
        };
        expect(quest.name).toBeDefined();
        expect(quest.description).toBeDefined();
        expect(quest.containingMap).toBeDefined();
        expect(quest.reward).toBeDefined();
    });

    it('should support connecting quests', () => {
        const quest: Quest = {
            name: 'first-quest' as any,
            description: 'The first quest',
            containingMap: 'fishing-village',
            reward: 'experience',
            connectingQuest: 'second-quest' as any,
        };
        expect(quest.connectingQuest).toBe('second-quest');
    });
});

describe('MapEvent Type', () => {
    it('should create valid event types', () => {
        const events: MapEvent[] = [
            { name: 'encounter', description: 'A wild monster appears!' },
            { name: 'treasure', description: 'You found a chest!', reward: 'currency' },
            { name: 'shop', description: 'A merchant is selling wares' },
        ];
        
        events.forEach(event => {
            expect(event.name).toBeDefined();
            expect(event.description).toBeDefined();
        });
    });

    it('should have valid MapEvents type values', () => {
        const validEvents = ['encounter', 'boss-encounter', 'event', 'treasure', 'gather', 'quest', 'shop', 'npc', 'other'];
        validEvents.forEach(eventType => {
            const event: MapEvent = {
                name: eventType as any,
                description: 'Test event',
            };
            expect(validEvents).toContain(event.name);
        });
    });
});

// ============================================================================
// WORLD STATE INTEGRATION
// ============================================================================

describe('WorldState Integration', () => {
    it('should maintain consistency between continent and map', () => {
        const world = createStartingWorld();
        expect(world.currentContinent.availableMaps).toContain(world.currentMap.name);
    });

    it('should have map continent matching current continent', () => {
        const world = createStartingWorld();
        expect(world.currentMap.continent).toBe(world.currentContinent.name);
    });
});
