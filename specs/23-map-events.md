# Spec 23 — MapEvents engine + node discovery

## Goal

Replace the bespoke `processNode` dispatcher (Spec 08) with a
`resolveMapEvent(state, rng?): { state, event }` engine that:

- Operates on a fixed 8-kind event taxonomy.
- Rolls an event from a **weighted pool** at the moment a node is
  entered, rather than reading an authored event off `MapDefinition`.
- Tracks **discovery** (fog-of-war) and **consumption** (one-shot)
  per node on `MapState`.

The engine ships **alongside** `processNode` in this spec; Spec 24
migrates content and removes the old dispatcher.

**Success state:** A consumer can `resolveMapEvent(state)` against a
loaded `GameState`, receive a typed `event` describing what happened,
and walk a hermetic e2e from `discoverNode → reveal adjacents → roll
event → resolve → consumed-noop` across all eight kinds.

## Why now / dependencies

- **Unblocks:** Phase 24 (MapEvents content) — needs the engine
  in place.
- **Depends on:** Spec 09 (game store), Spec 08 (current `processNode`
  + `MapState` shape).

## Open questions (all locked here)

1. **Event taxonomy.**
   Eight kinds, final:
   `encounter` (combat), `interaction` (dialogue / story trigger;
   folds old `npc`), `gathering` (resource collection), `rest`
   (recovery), `village` (settlement scene; folds old `shop`),
   `cutscene` (non-interactive beat), `hazard` (environmental damage
   / status), `loot-cache` (fixed-pool inventory grant).
   > Locked.

2. **Pool authoring location.**
   (B) Per-region by default (one pool per map), node-level override
   via an optional `eventPoolId` on the node definition.
   > Locked.

3. **Pool roll cadence.**
   (A) Rolled the first time a node is entered. Result is cached for
   the rest of that node visit (the resolver returns the same event
   if called twice on a not-yet-consumed node).
   > Locked.

4. **Consumption model.**
   (A) One-shot. Once `resolveMapEvent` returns a non-`'none'` event,
   the node is added to `MapState.consumedNodes`; subsequent
   resolution returns `{ kind: 'none' }`. Players can still walk
   through consumed nodes.
   > Locked.

5. **Discovery seeding.**
   The map's `startingNode` is in `discoveredNodes` from
   `createMapState`. Subsequent reveals happen via `revealAdjacent` —
   called from `resolveMapEvent` after a node is consumed.
   > Locked.

6. **Reveal pacing.**
   (A) Revealing adjacent nodes happens at the same time as
   consumption — i.e., the player only sees what's next *after*
   they've resolved the current node.
   > Locked.

7. **Backward compatibility.**
   Spec 23 keeps `processNode` and the old `MapEvent` /
   `MapEventType` types in place. Spec 24 will:
   - Migrate `fishing-village` + `northern-forest` content into
     `MapEventPool` form.
   - Remove `processNode`, `MapEventType`, and the old `MapEvent`
     interface.
   - Switch `gameReducer`'s `PROCESS_NODE` action to dispatch
     `resolveMapEvent` instead.
   > Locked.

8. **RNG plumbing.**
   `resolveMapEvent(state, rng = getRng().random)` follows the same
   contract as `dropItem`. Tests inject a deterministic RNG via the
   `mockSequentialRng` / `mockFixedRng` helpers.
   > Locked.

9. **Return shape (`ResolvedEvent`).**
   Discriminated union by `kind`:
   ```ts
   export type ResolvedEvent =
       | { kind: 'encounter'; encounter: Encounter; isBoss: boolean }
       | { kind: 'interaction'; npcName: string; dialogue?: DialogueTree }
       | { kind: 'gathering'; items: Item[] }
       | { kind: 'rest'; healed: number }
       | { kind: 'village'; villageName: string; merchants: NPC[] }
       | { kind: 'cutscene'; lines: readonly string[] }
       | { kind: 'hazard'; effects: ActiveEffect[]; damage: number }
       | { kind: 'loot-cache'; items: Item[]; currency: number }
       | { kind: 'none' };
   ```
   > Locked.

10. **Pool entry shape.**
    ```ts
    export interface MapEventPoolEntry {
        kind: MapEventKind;
        weight: number;          // weighted-random draw
        payload: MapEventPayload; // discriminated by kind
    }
    export interface MapEventPool {
        id: string;
        entries: readonly MapEventPoolEntry[];
    }
    ```
    > Locked.

11. **Empty / missing pool.**
    Returns `{ kind: 'none' }`. Not an error.
    > Locked.

## Public API additions

```ts
// src/World/MapEvents/types.ts
export type MapEventKind =
    | 'encounter' | 'interaction' | 'gathering' | 'rest'
    | 'village' | 'cutscene' | 'hazard' | 'loot-cache';

export type MapEventPayload = /* discriminated by kind, see below */;
export interface MapEventPoolEntry { kind: MapEventKind; weight: number; payload: MapEventPayload; }
export interface MapEventPool { id: string; entries: readonly MapEventPoolEntry[]; }

export type ResolvedEvent =
    | { kind: 'encounter';  encounter: Encounter; isBoss: boolean }
    | { kind: 'interaction'; npcName: string; dialogue?: DialogueTree }
    | { kind: 'gathering';   items: Item[] }
    | { kind: 'rest';        healed: number }
    | { kind: 'village';     villageName: string; merchants: NPC[] }
    | { kind: 'cutscene';    lines: readonly string[] }
    | { kind: 'hazard';      effects: ActiveEffect[]; damage: number }
    | { kind: 'loot-cache';  items: Item[]; currency: number }
    | { kind: 'none' };

export interface ResolveMapEventResult {
    state: GameState;
    event: ResolvedEvent;
}

// src/World/MapEvents/resolve-map-event.ts
export function resolveMapEvent(
    state: GameState,
    rng?: () => number,
): ResolveMapEventResult;
```

`MapState` additions:

```ts
readonly discoveredNodes: ReadonlySet<NodeId>;
readonly consumedNodes:   ReadonlySet<NodeId>;
```

`world.reducer.ts` additions:

```ts
export function revealAdjacent(state: MapState, nodeId: NodeId): MapState;
export function markNodeConsumed(state: MapState, nodeId: NodeId): MapState;
```

## Acceptance checklist

- [ ] All open questions are locked above.
- [ ] `src/World/MapEvents/types.ts` exports the 8-kind taxonomy and
      every type listed in §Public API additions.
- [ ] `src/World/MapEvents/handlers/<kind>.ts` exists for all 8 kinds
      and is unit-tested via the integration hermetic e2e.
- [ ] `src/World/MapEvents/resolve-map-event.ts` exports the
      dispatcher and is hermetic e2e tested.
- [ ] `MapState` has `discoveredNodes` and `consumedNodes`.
- [ ] `createMapState` seeds `discoveredNodes` with `startingNode`.
- [ ] `revealAdjacent` and `markNodeConsumed` reducers exist.
- [ ] `processNode` and the old `MapEvent`/`MapEventType` types are
      untouched (Phase 24 removes them).
- [ ] `npm test` and `npm run type-check` are clean.
- [ ] `npm run verify` exits 0.

## Out of scope

- Migrating existing content (`fishing-village`, `northern-forest`)
  into the new shape — that's Spec 24.
- Removing `processNode` — Spec 24.
- Authoring per-region pools — Spec 24.
- Shrine / puzzle / monument kinds — track in PHASE_CANDIDATES.
- Cross-region travel events — out of scope.
