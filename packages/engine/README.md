# axiomancer-mechanics

Turn-based RPG engine with **Heart / Body / Mind** combat. Status effects, skills, and enemies are themed around logical fallacies and philosophical paradoxes.

The engine is a **pure-TypeScript library** with zero runtime dependencies. It runs unchanged in Node.js, React Native, and browser bundles via subpath exports and platform-specific persistence adapters.

## Install

```sh
npm install axiomancer-mechanics
# Optional binding peers — install only the ones your app uses:
npm install zustand                                          # for /store
npm install @react-native-async-storage/async-storage        # for /persistence/async-storage
```

## Public API

```ts
// Universal
import { createCharacter, createNewGameState } from 'axiomancer-mechanics';
import { resolveCombatRound, determineAdvantage } from 'axiomancer-mechanics/combat';
import { applyEffect } from 'axiomancer-mechanics/effects';
import { effectsLibrary } from 'axiomancer-mechanics/content/effects';

// Optional Zustand binding
import { createGameStore } from 'axiomancer-mechanics/store';

// Pick exactly one persistence adapter for your platform
import { createNodeAdapter }         from 'axiomancer-mechanics/persistence/node';            // Node
import { createAsyncStorageAdapter } from 'axiomancer-mechanics/persistence/async-storage';   // RN
import { createWebStorageAdapter }   from 'axiomancer-mechanics/persistence/web-storage';     // browser
```

### Subpath summary

| Subpath | What's there |
|---|---|
| `axiomancer-mechanics` | Curated re-exports of the most common types, factories, and reducers |
| `…/character`, `…/enemy`, `…/combat`, `…/effects`, `…/items`, `…/skills`, `…/npcs`, `…/world` | Per-domain types, factories, reducers, library helpers |
| `…/game` | `GameState`, `createNewGameState`, `GAME_STATE_VERSION`, action constants, all game-mechanics constants |
| `…/store` | `createGameStore`, `GameStore`, `GameActions`, selectors. **peer:** `zustand` |
| `…/persistence` | `PersistenceAdapter` interface, `nullAdapter`, `createMemoryAdapter` |
| `…/persistence/node` | `createNodeAdapter` (Node `fs`) |
| `…/persistence/async-storage` | `createAsyncStorageAdapter` (React Native). **peer:** `@react-native-async-storage/async-storage` |
| `…/persistence/web-storage` | `createWebStorageAdapter` (browser `localStorage`/`sessionStorage`) |
| `…/content`, `…/content/effects`, `…/content/enemies`, `…/content/items`, `…/content/world` | Bundled game content (libraries / registries) |
| `…/fixtures` | Demo character / world fixtures useful for tests and examples |
| `…/utils` | `clamp`, `randomInt`, `deepClone`, `createDie*`, stat-derivation helpers |

`zustand` and `@react-native-async-storage/async-storage` are declared as **optional peer dependencies**. Apps that don't use the matching subpath don't need to install them.

## Running tests / building

```sh
npm test              # vitest (71 tests)
npm run type-check    # tsc --noEmit
npm run build         # tsup → dist/esm + dist/cjs
```

## License

ISC
