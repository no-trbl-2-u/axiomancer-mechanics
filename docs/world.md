# World

> **Status:** State shape and pure reducer transitions exist. Map content (nodes,
> events, NPCs, encounters) and the exploration loop (`processNode`, hazard ticks
> while exploring, branching paths) are pending Phase 7. The active design
> conversation lives in
> [`specs/08-world-content-and-hazards.md`](../specs/08-world-content-and-hazards.md).

## State Shape

`WorldState` (in [`src/World/types.d.ts`](../src/World/types.d.ts)) is the catalogue of
continents plus the current navigation context.

```ts
interface WorldState {
  world: Continent[];          // all continents the save knows about
  currentContinent: Continent; // active continent
  currentMap: WorldMap;        // active map
}
```

A `Continent` partitions its maps into `availableMaps`, `lockedMaps`, and
`completedMaps`. A `WorldMap` partitions its nodes into `availableNodes`, `lockedNodes`,
and `completedNodes`, plus `availableEvents` (recurring) and `uniqueEvents` (one-shot).

A `MapNode` has an `id` (formatted `<map-acronym>-<number>`, e.g. `"fv-1"`), a 2-D
`location`, and a list of `connectedNodes`. The world reducer does not yet track which
node the player is currently standing on — see Pending below.

## Reducer (`src/World/world.reducer.ts`)

All functions are pure and idempotent where the change is already in place.

| Function | Description |
|----------|-------------|
| `changeMap(state, map)` | Replace `currentMap`. Caller resolves the `WorldMap` (e.g. via `getCoastalMap`). |
| `completeMap(state, mapName)` | Append to `currentContinent.completedMaps`. |
| `unlockMap(state, mapName)` | Move from `lockedMaps` to `availableMaps`. |
| `completeNode(state, nodeId)` | Append to `currentMap.completedNodes`. |
| `unlockNode(state, nodeId)` | Move from `lockedNodes` to `availableNodes`. |
| `changeContinent(state, continentName)` | Set `currentContinent` from `state.world`; no-op if missing. |
| `completeUniqueEvent(state, eventId)` | Mark the event `completed: true` on `currentMap.uniqueEvents`. |

## Bootstrap Helpers

`src/World/index.ts`:

- `createStartingWorld()` — initial `WorldState`. Starts on the Coastal Continent with
  `fishing-village` available and `northern-forest` locked.
- `getCoastalMap(mapName)` — resolves a `MapName` to a concrete `WorldMap` (currently
  the only registry).
- `MapNotFoundError` — thrown when the registry lookup fails.

## Quests

[`src/World/quest.library.ts`](../src/World/quest.library.ts) currently defines only
`QuestName`s; the runtime quest engine and progress tracking are pending.

## Pending (Phase 7)

- `moveToNode(state, nodeId)` and a `currentNode` field on `WorldMap` so the engine
  knows where the player is.
- `processNode(state, node)` — orchestrates encounter / event / shop / NPC interactions.
- `processWorldEffectTick(player)` — per-step DoT / regen / expiry while exploring.
  Decision needed on what counts as a "step" (each `moveToNode`, each map node
  transition, etc.). See `specs/01-effects-engine-completion.md` and `specs/08`.
- Quest engine (active quests, progress, rewards).
- NPC dialogue and shop runtime.
- Map registry: replace the single `getCoastalMap` switch with a multi-continent
  registry so adding a continent does not require edits across files.

See [`specs/08-world-content-and-hazards.md`](../specs/08-world-content-and-hazards.md)
for the open design questions.
