# World

> **Status:** Spec 08 + Spec 23 + Phase 25 landed — `moveToNode`,
> `resolveMapEvent`, branching dialogue, a per-objective quest engine, the
> continent-keyed map registry, and the hazard tick on movement are all
> live. Fishing-village ships with a demo chain (NPC quest-giver → village →
> encounter → loot-cache → boss) that exercises the loop end-to-end. The
> legacy `processNode` + `MapEvent`/`MapEventType` surface was removed in
> Phase 25; node events are now authored via weighted pools (see
> `src/World/MapEvents/content.ts`).

## State Shape

The world layer splits the **static** map template from **runtime** progress.

```ts
// Frozen template — lives in the map registry. Authoring file.
interface MapDefinition {
  name; continent; description;
  startingNode: MapNode;
  nodes: readonly MapNode[];
  npcs?; enemies?; uniqueEvents?;
  quests?: readonly Quest[];
}

// Runtime per-save state — sits under WorldState.currentMap.
interface MapState {
  name; continent;
  currentNode: NodeId;           // Spec 08 Q1: per-map position.
  completedNodes; availableNodes; lockedNodes;
  uniqueEvents: UniqueEvent[];   // mutable runtime copy
}
```

`WorldState` aggregates the navigation context:

```ts
interface WorldState {
  world: Continent[];           // catalogue
  currentContinent: Continent;
  currentMap: MapState;         // runtime state — lookup template via getMapDefinition()
}
```

`GameState` is the root for the whole save, and carries the quest log and
world flags so dialogue / quest progression can persist:

```ts
interface GameState {
  version; player; world; combat;
  quests: QuestLog;             // per-objective tracking
  flags: string[];              // dialogue + quest flag gates
}
```

## Map Registry (Spec 08 Q6)

`src/World/map.registry.ts`:

- `MAP_REGISTRY` — `Record<ContinentName, Partial<Record<MapName, MapDefinition>>>`.
- `getMapDefinition(continent, mapName)` — returns the static template. Throws
  `MapNotFoundError` for unknown pairs.
- `createMapState(def)` — builds the initial runtime `MapState` from a
  definition: starting node populated, neighbours enter `availableNodes`,
  everything else enters `lockedNodes`.
- `getCoastalMap(mapName)` — deprecated thin wrapper kept for back-compat.

Adding a continent or map is a one-file change to the registry plus the
authoring file under `src/World/Continents/<Name>/maps.ts`.

## Movement (Spec 08 Q2 — linear with completed-lock)

`moveToNode(state, nodeId): WorldState`

Validation:

1. The destination must be a real node on the current map.
2. The destination must be in the current node's `connectedNodes` (linear).
3. **Completed nodes are locked from re-entry — no back-travel.**
4. The destination must not be in `lockedNodes`.

`completeCurrentNode(state)` marks the current node completed and unlocks
its neighbours. Both reducers are pure.

`IllegalMoveError` is thrown for any invalid move.

## Hazard Tick on Movement (Spec 08 Q3, Q4)

Each `moveToNode` should be paired with a player tick. Spec 08 keeps the
world reducer pure (`moveToNode` only touches `WorldState`) and exposes the
player-side helpers under `Effects/`:

- `processWorldEffectTick(player) → { player, healed, damage, expired }` —
  applies regen, drain, and DoT, then ticks duration / drops expired effects.
  One world-step per call.
- `getActiveHazards(player) → ActiveHazard[]` — UI-facing list of hazards
  currently dealing world-step damage. The HUD renders these (engine only
  exposes the data — Q4).

## Node Event Dispatcher

The current dispatcher is `resolveMapEvent(state, rng?)` from
`src/World/MapEvents/resolve-map-event.ts`, shipped in Spec 23 and
populated with content in Phase 24. It returns `{ state, event }`
where `event` is a discriminated union over the eight `MapEventKind`
values:

| Event kind     | Result shape                                                              |
|----------------|---------------------------------------------------------------------------|
| `encounter`    | `{ kind: 'encounter', encounter, isBoss }` — caller invokes `startCombat`. |
| `interaction`  | `{ kind: 'interaction', npcName, dialogue? }` — branching tree.           |
| `gathering`    | `{ kind: 'gathering', items }` — items added to inventory.                |
| `rest`         | `{ kind: 'rest', healed }` — heals by `healFraction × maxHealth`.         |
| `village`      | `{ kind: 'village', villageName, merchants }` — settlement scene.         |
| `cutscene`     | `{ kind: 'cutscene', lines }` — narration only.                           |
| `hazard`       | `{ kind: 'hazard', effects, damage }` — applies effects + damage.         |
| `loot-cache`   | `{ kind: 'loot-cache', items, currency }` — fixed grant.                  |
| `none`         | Consumed node (one-shot) or no pool registered.                            |

The dispatcher reveals adjacent nodes on consumption (fog-of-war) and
marks the active node consumed so subsequent visits no-op.

### Legacy `processNode` (removed in Phase 25)

The pre-Spec-23 dispatcher and its 9-kind taxonomy
(`MapEvent` / `MapEventType` / the `nodeEvents` field on
`MapDefinition`) were removed in Phase 25 (commit reference in
`plan/AUDIT.md` Done block). All node events now flow through
`resolveMapEvent` + the per-node pool overrides registered in
`src/World/MapEvents/content.ts`. The folded `npc` / `shop` kinds
map to `interaction` / `village` in the new taxonomy.

Quest auto-progression: `reachableObjectives(log, nodeId)` is
available for any future dispatcher that wants to auto-advance
`reach`-type objectives on arrival; `resolveMapEvent` does not call
it today (it's a noted follow-up — track in `plan/AUDIT.md`).

## Quest Engine (Spec 08 Q7B — per-objective)

`src/World/quest.engine.ts`:

| Function | Purpose |
|----------|---------|
| `emptyQuestLog()` | `{ available: [], active: [], completed: [] }` seed. |
| `discoverQuest(log, quest)` | Adds to `available` if not present. |
| `startQuest(log, quest)` | Moves quest from `available` into `active`. Idempotent. |
| `progressQuest(log, name, objectiveId, amount?)` | Advances one objective; auto-completes the quest when every objective is filled. |
| `completeQuest(log, name)` | Explicit completion. |
| `isQuestComplete(quest)` | True when every objective is at `requiredCount`. |
| `reachableObjectives(log, nodeId)` | Active `reach`-objectives that fire on this node. |
| `killObjectives(log, enemyName)` | Active `kill`-objectives matching this enemy's name. |

Objective types: `'kill' | 'collect' | 'reach' | 'talk' | 'flag'`.

The store's `endCombat` auto-advances `kill` objectives — defeating an
enemy whose `name` matches an active objective's `target` ticks the counter
and grants the reward when the quest fills.

## Dialogue (Spec 08 Q9 — branching tree)

NPCs carry a `DialogueTree`:

```ts
interface DialogueTree {
  rootId: string;
  nodes: Record<string, DialogueNode>;
}
```

Each `DialogueNode` has `text` and optional `choices`. A `DialogueChoice`
can:

- Lead to another node (`nextNodeId`), or end the conversation (`undefined`).
- Be hidden until a gate passes (`requires.quest`, `requires.flag`,
  `requires.questCompleted`).
- Fire a side effect when picked (`effect.startQuest`, `progressQuest`,
  `completeQuest`, `teachSkill`, `setFlag`, `grantCurrency`).

`applyDialogueChoice(gameState, tree, choice) → { gameState, nextNode, effects }`
applies the side effect, advances the cursor, and returns the next node
(or `null` if the conversation ends).

`NPCs/dialogue.ts` carries the read-only helpers (`getDialogueNode`,
`visibleChoices`, `isLeafNode`) for UI traversal.

The legacy flat `DialogueMap` is still supported on the `NPC` interface.

## Currency (Spec 08 Q8)

`Character.currency: number` exists; shop reducers are deferred to a later
spec. Rewards (`{ kind: 'currency', amount }`) increment this directly.

## Demo Content (fishing-village)

`src/World/Continents/Coastal-Village/maps.ts` ships a complete chain so
the loop is testable end-to-end:

```
fv-1 (start)
  → fv-2 (npc:    Old Marrow, quest-giver — branching tree)
  → fv-3 (shop:   Tide-Shopkeeper)
  → fv-4 (encounter)
  → fv-5 (treasure, +10 currency)
  → fv-6 (boss-encounter: The Coastal Tyrant)
```

The starting quest's objective is `kill The Coastal Tyrant`; defeating
the boss auto-completes the quest and grants the 25-currency reward.

`northern-forest` adds an `event`-type node (rest) at `nf-4`.

## Bootstrap

`src/World/index.ts`:

- `createStartingWorld()` — initial `WorldState`. Coastal Continent with
  `fishing-village` available and `northern-forest` locked.
- `MAP_REGISTRY`, `getMapDefinition`, `createMapState`.
- `MapNotFoundError` — thrown when the registry lookup fails.

## MapEvents (Spec 23)

Phase 23 introduced the **MapEvents** node-event surface. Phase 25
removed the bespoke `processNode` predecessor; MapEvents is now the
only node-event dispatcher.

- **Taxonomy.** Eight kinds: `encounter`, `interaction`, `gathering`,
  `rest`, `village`, `cutscene`, `hazard`, `loot-cache`. The old
  `npc`/`shop` kinds are folded into `interaction` and `village`.
- **Pool authoring.** Events are not authored per node; they're rolled
  from a **weighted pool** at the moment a node is entered. Pools live
  in `MapEventPool` records registered via `registerMapEventPool` and
  attached to a map via `setDefaultMapEventPool` (region default) or
  `setNodeEventPoolOverride` (per-node override).
- **Discovery (fog-of-war).** `MapState.discoveredNodes` is seeded with
  the map's starting node; `resolveMapEvent` calls `revealAdjacent`
  after consuming a node, so the next ring of nodes only becomes
  visible once the player has cleared the current one.
- **Unlocked traversal.** After Phase 31 (`711b49e`), `resolveMapEvent`
  also calls `unlockAdjacent` — the reducer that moves
  `connectedNodes` from `MapState.lockedNodes` into
  `MapState.availableNodes`. Discovery shifts the fog; unlocking is
  what lets the CLI's Map tab actually offer the next ring as
  navigable targets. The two pass-through reducers are composed at
  every `resolveMapEvent` exit path
  (`src/World/MapEvents/resolve-map-event.ts`).
- **One-shot consumption.** `MapState.consumedNodes` records every
  node whose MapEvent has resolved. Re-entering a consumed node
  returns `{ kind: 'none' }` — the player can still walk through, but
  the event won't re-fire.
- **RNG plumbing.** `resolveMapEvent(state, rng?)` accepts a seeded
  RNG (defaults to `getRng().random()`). Tests inject deterministic
  RNGs via `mockSequentialRng` / `mockFixedRng`.
- **Migration.** Spec 23 shipped `resolveMapEvent` alongside the
  existing `processNode`. Phase 24 (commit `4b12e27`) migrated the
  `fishing-village` + `northern-forest` content into per-node pool
  overrides — see `src/World/MapEvents/content.ts` for the 20-node
  authoring map. Phase 25 removed the legacy `processNode` surface,
  the `MapEvent` / `MapEventType` types, and the `nodeEvents` /
  `availableEvents` fields on `MapDefinition`.

See `specs/23-map-events.md` for the spec and
`src/World/MapEvents/e2e/map-events.engine.test.ts` for the hermetic
walkthrough covering all eight kinds.

## See Also

- [`specs/08-world-content-and-hazards.md`](../specs/08-world-content-and-hazards.md)
- [`specs/23-map-events.md`](../specs/23-map-events.md)
- [`docs/npcs.md`](./npcs.md) — branching dialogue UI conventions.
- [`docs/effects.md`](./effects.md) — `processWorldEffectTick` integration with
  the broader effects engine.
