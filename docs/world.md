# World & Exploration

> The Axiomancer world is a graph of **continents → maps → nodes**. Every transition between nodes ticks persistent effects, may trigger encounters, and unlocks future content.

## State Shape

```ts
interface WorldState {
    world: Continent[];
    currentContinent: Continent;
    currentMap: Map;
}

interface Continent {
    name: ContinentName;
    description: string;
    availableMaps: MapName[];
    lockedMaps: MapName[];
    completedMaps: MapName[];
}

interface Map {
    name: MapName;
    continent: ContinentName;
    description: string;
    startingNode: MapNode;
    completedNodes: string[];
    availableNodes: string[];
    lockedNodes: string[];
    npcs: NPC[];
    enemies: Enemy[];
    availableEvents: MapEvent[];
    uniqueEvents: MapEvent[];
    images: { mapImage: Image; combatImage: Image };
}
```

`createStartingWorld()` builds the default state with the Coastal Continent's Fishing Village as the starting map.

## World Reducer API

All functions in `src/World/world.reducer.ts` are pure.

| Function | Purpose |
|---|---|
| `changeMap(state, map)` | Replace `currentMap`. |
| `completeMap(state, mapName)` | Append `mapName` to `completedMaps` (idempotent). |
| `unlockMap(state, mapName)` | Move from `lockedMaps` → `availableMaps`. |
| `completeNode(state, nodeId)` | Append `nodeId` to `completedNodes`. |
| `unlockNode(state, nodeId)` | Move from `lockedNodes` → `availableNodes`. |
| `moveToNode(state, nodeId)` | Legacy stub — returns state unchanged. |
| `moveToNodeWithEffects(state, nodeId, player)` | Validates `availableNodes` and ticks persistent hazard effects on the player. Returns `{ state, tick }`. |
| `changeContinent(state, name)` | Switch active continent (looked up from `world` array). |
| `completeUniqueEvent(state, eventId)` | Mark a `uniqueEvent` on the current map as completed. |

## Persistent Hazard Effects

Movement between nodes ticks every `damageOverTime` and `regeneration` payload on the player's `currentActiveEffects`, and decrements duration of every non-permanent effect. The pipeline is `regen → DoT → tick`, mirroring the in-combat round-start phase. See `docs/effects.md` and `processWorldEffectTick` for the full contract.

The CLI orchestrator is `processNode(state, node)` in `src/Game/game.reducer.ts` — call it whenever the player commits to entering a node.

## Game Reducer Hooks

The top-level `gameReducer` (`src/Game/game.reducer.ts`) understands the relevant world actions:

- `MOVE_TO_NODE` — invokes `moveToNodeWithEffects` and merges the tick result into the player.
- `START_COMBAT` / `END_COMBAT` — wraps combat encounters initiated from a node.
- `SET_PLAYER` — used after `processNode` events surface a tickled player.

## Naming Conventions

- **Continent name** is a string union (`coastal-continent`, `northern-continent`, …).
- **Map name** is a string union scoped to a continent.
- **Node ID** is free-form; convention is `<map-prefix>-<index>` (`fv-1`, `nf-3`).

Keep the unions exhaustive in `src/World/map.library.ts` so the type system catches typos at compile time.

## Status

| Section | Done | Pending |
|---|---|---|
| 7a — Reducer + tests | ✅ | — |
| 7b-7f — Map content, quest system, NPC/dialogue, shop, rest | content | wiring (Phase 9 content drop) |

## See also

- `docs/combat.md` — what happens when a node triggers combat.
- `docs/character.md` — XP / level-up mechanics relevant to map progression.
- `docs/enemy.md` — how `generateEncounter` picks an enemy from `Map.enemies`.
- `docs/npcs.md` — NPC type and planned service hooks.
