# Public API Reference

## Stability Levels

- **Stable**: Committed to semver for breaking changes
- **Beta**: May change in minor versions with deprecation notice  
- **Experimental**: May change without notice

## Core Exports (from 'axiomancer-mechanics')

### Character
- `createCharacter()` - Stable
- `Character`, `BaseStats`, `DerivedStats`, `NonCombatStats` types - Stable
- Equipment functions (`equipItem`, `unequipItem`, `getEquipmentModifiers`) - Stable

### Combat  
- `resolveCombatRound()` - Stable
- `determineAdvantage()`, advantage and damage/healing functions - Stable
- Combat state management (`initializeCombat`, `endCombat`, etc.) - Stable
- Combat types (`CombatState`, `Action`, `Stance`, etc.) - Stable

### Game Store and State
- `createGameStore()` - Stable  
- `gameReducer()` - Stable
- `GameState`, `GameAction`, `GameActions` types - Stable
- Event emitter (`createEventEmitter`) - Stable

### Events (Beta)
- Event payload types (`CombatStartedPayload`, `TypedGameEvent`, etc.) - Beta
- Event creation utilities (`createCombatStartedEvent`, etc.) - Beta
- Event type guards (`isCombatStartedEvent`, etc.) - Beta

### Items, Equipment & Inventory
- Item creation and manipulation functions - Stable
- Equipment templates and generation - Stable
- Inventory management (`addItem`, `removeItem`, etc.) - Stable
- Item types (`Item`, `Equipment`, `Consumable`, etc.) - Stable

### Skills
- Skill execution (`executeSkill`, `canUseSkill`) - Stable
- Skill types and interfaces - Stable

### World & Quests
- World creation (`createStartingWorld`) - Stable
- World state management and navigation - Stable
- Quest system (`startQuest`, `progressQuest`, etc.) - Stable
- Map and encounter generation - Stable

### Effects
- Effect application and management - Stable
- Effect types and library - Stable

### NPCs & Dialogue
- NPC types and dialogue system - Stable

### Utilities
- Math and random functions - Stable
- RNG system (`setRng`, `getRng`, `setSeed`) - Stable
- Type guards and validation - Stable

## Node.js Exports (from 'axiomancer-mechanics/node')

### Persistence
- `createNodeAdapter()` - Stable
- `PersistenceAdapter` interface - Stable

## React Native Usage

The core package exports work in React Native without modification. For persistence, implement the `PersistenceAdapter` interface with AsyncStorage:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistenceAdapter } from 'axiomancer-mechanics'; // Interface on the core barrel

const asyncStorageAdapter: PersistenceAdapter = {
  load(): GameState | null {
    const data = AsyncStorage.getItem('game-state');
    return data ? JSON.parse(data) : null;
  },
  
  save(state: GameState): void {
    AsyncStorage.setItem('game-state', JSON.stringify(state));
  }
};
```

### Event System

Subscribe to typed game events for UI updates:

```typescript
import { 
  createGameStore, 
  createEventEmitter,
  isCombatStartedEvent,
  TypedGameEvent 
} from 'axiomancer-mechanics';

const emitter = createEventEmitter();
const store = createGameStore(adapter, undefined, emitter);

// Subscribe to specific event types
emitter.on('combat:started', (event) => {
  if (isCombatStartedEvent(event)) {
    console.log(`Combat with ${event.payload.enemy}`);
  }
});

// Or subscribe to all events
emitter.onAny((event) => {
  console.log('Game event:', event.type);
});
```

## Versioning

This package follows strict semantic versioning:

- **Major**: Breaking changes to stable APIs
- **Minor**: New features, changes to beta APIs (with deprecation notice)
- **Patch**: Bug fixes and internal improvements only

Beta APIs are marked in this documentation and may change in minor releases with appropriate migration guides provided.

## Package Architecture

- **Core package**: React Native compatible, excludes Node.js dependencies
- **Node subpath**: Server-side utilities requiring Node.js APIs
- **Barrel exports**: All public APIs available from main entry point
- **Type safety**: Full TypeScript support with strict typing

For questions about API stability or usage, refer to the individual module documentation in the `docs/` directory.