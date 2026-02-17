# World Module

The World module manages the game world including continents, maps, nodes, events, and navigation. It provides map data, world state creation, and pure reducer functions for world progression.

## Core Concepts

- **Continents**: Large regions containing multiple maps
- **Maps**: Game areas with nodes, enemies, events, and NPCs
- **Nodes**: Individual locations within a map that can be traversed
- **Unique Events**: One-time events tied to specific node locations
- **Map Progression**: Nodes and maps can be locked, available, or completed

## Files

| File | Purpose |
|------|---------|
| `index.ts` | World creation and map lookup functions |
| `types.d.ts` | Type definitions for world entities (Map, Continent, Quest, etc.) |
| `map.library.ts` | Map and continent name enumerations |
| `quest.library.ts` | Quest name enumerations |
| `world.reducer.ts` | Pure state management functions for WorldState |
| `world.mock.ts` | Mock world data for testing |
| `world.test.ts` | Unit tests for world functions and reducers |
| `Continents/` | Subdirectory containing continent-specific map definitions |

## Key Functions

### World Creation (`index.ts`)
- **`createStartingWorld()`** - Creates the initial WorldState with Coastal Continent
- **`getCoastalMap(mapName)`** - Returns a specific map from the Coastal Continent

### World Reducer (`world.reducer.ts`)
- **`changeMap(state, mapName)`** - Navigate to a different map
- **`completeMap(state, mapName)`** - Mark a map as completed
- **`unlockMap(state, mapName)`** - Unlock a locked map
- **`completeNode(state, nodeId)`** - Mark a map node as completed
- **`unlockNode(state, nodeId)`** - Unlock a locked node
- **`moveToNode(state, nodeId)`** - Move player to a connected node
- **`changeContinent(state, continentName)`** - Navigate to a different continent
- **`completeUniqueEvent(state, eventId)`** - Mark a unique event as completed

## World Structure

```
World
├── Coastal Continent
│   ├── Fishing Village (starting map)
│   └── Northern Forest
└── Northern Continent (TODO)
    ├── Caverns
    ├── Northern City
    ├── Connecting River
    └── Town Across River
```
