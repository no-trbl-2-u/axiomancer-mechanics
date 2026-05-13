# World

> **Status:** Spec 08 landed — `moveToNode`, `processNode`, branching dialogue,
> a per-objective quest engine, the continent-keyed map registry, and the
> hazard tick on movement are all live. Fishing-village ships with a demo
> chain (NPC quest-giver → shop → encounter → treasure → boss) that
> exercises the loop end-to-end.

## State Shape

The world layer splits the **static** map template from **runtime** progress.

```ts
// Frozen template — lives in the map registry. Authoring file.
interface MapDefinition {
  name; continent; description;
  startingNode: MapNode;
  nodes: readonly MapNode[];
  nodeEvents?: Partial<Record<NodeId, MapEvent>>;
  npcs?; enemies?; availableEvents?; uniqueEvents?;
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

`processNode(gameState): ProcessNodeResult`

Looks up `MapEvent` on the player's current node and dispatches:

| Event type        | Result                                                                     |
|-------------------|----------------------------------------------------------------------------|
| `encounter`       | `{ kind: 'encounter', encounter, isBoss: false }` — caller invokes `startCombat`. |
| `boss-encounter`  | `{ kind: 'encounter', encounter, isBoss: true }` — uses authored slug/enemy or boss-tier roll. |
| `treasure`        | Grants currency/items immediately, returns `{ kind: 'treasure', items, currency }`. |
| `gather`          | Grants items, returns `{ kind: 'gather', items }`.                         |
| `quest`           | Discovers + starts the quest, returns `{ kind: 'quest', startedNew }`.     |
| `npc`             | Returns `{ kind: 'npc', npcName, dialogue }` (branching tree).             |
| `shop`            | Returns `{ kind: 'shop', npcName }`. Shop UI/data lands in a later spec.   |
| `event`           | Rest node (Spec 08 Q10A) — heals by `healFraction × maxHealth`.            |
| `other` / unset   | No-op narration.                                                           |

Quest auto-progression: every active `reach`-objective targeting the current
node is advanced. Completing an objective grants the quest reward.

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

## See Also

- [`specs/08-world-content-and-hazards.md`](../specs/08-world-content-and-hazards.md)
- [`docs/npcs.md`](./npcs.md) — branching dialogue UI conventions.
- [`docs/effects.md`](./effects.md) — `processWorldEffectTick` integration with
  the broader effects engine.
