# Game Module

The Game module manages the top-level game state that aggregates all major game systems. It handles game initialization, save/load operations, combat state transitions, and the main game reducer.

## Core Concepts

- **GameState**: The root state object containing player, world, and combat data
- **Pure Reducers**: All state modifications return new objects without mutation
- **Save/Load**: File-based persistence using JSON serialization

## Files

| File | Purpose |
|------|---------|
| `types.d.ts` | `GameState` interface definition |
| `game.reducer.ts` | Game state management functions |
| `gameState.ts` | Legacy game state utilities (save/load) |
| `actions.constants.ts` | Combat action constants and types |
| `game.test.ts` | Unit tests for game state functions |

## Key Functions

### Game State Management (`game.reducer.ts`)
- **`createNewGameState()`** - Creates a fresh game state with default player and starting world
- **`loadGameState()`** - Loads from save file or creates new state
- **`saveGameState(state)`** - Writes game state to JSON file
- **`setCombatState(state, combatState)`** - Sets or clears the combat state
- **`startCombat(state, combatState)`** - Begins combat by setting combat state
- **`endCombat(state)`** - Ends combat by clearing combat state
- **`gameReducer(state, action)`** - Main reducer for processing game actions

## GameState Structure

```typescript
interface GameState {
    player: Character;       // Player character with stats and inventory
    world: WorldState;       // World maps, continents, and progression
    combatState: CombatState | null;  // Active combat or null
}
```

## Usage

```typescript
import { createNewGameState, startCombat, endCombat } from './Game/game.reducer';
import { initializeCombat } from './Combat/combat.reducer';

const gameState = createNewGameState();
const combatState = initializeCombat(gameState.player, enemy);
const inCombat = startCombat(gameState, combatState);
const afterCombat = endCombat(inCombat);
```
