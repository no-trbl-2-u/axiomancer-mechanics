# Spec 12 — Package Architecture & UI Event Surface

## Goal

Define the contract between this engine package and its React Native
consumer: which APIs are public, which are internal, how UI receives events,
and which Node-only modules (`fs`, persistence) must move out of the core.

**Success state:** A consumer can `import { … } from 'axiomancer-mechanics'`
in a React Native app without bundling any Node-only code. Combat / world /
quest events are surfaced through a typed channel the UI can subscribe to.
The package's public API is documented at the source level.

## Why now / dependencies

- **Unblocks:** the React Native UI development.
- **Depends on:** Spec 09 (the orchestration that decides what events
  exist). Spec 08 world primitives are already implemented; Spec 09 must
  compose them into `createGameStore` (or an agreed equivalent).

## Current state

- `src/index.ts` is the public barrel. It exports lots of internal helpers
  alongside genuine public API.
- `Game/persistence/node.adapter.ts` uses `fs` and would not bundle in
  React Native today.
- `package.json` has `zustand` as a runtime dependency and re-exports
  `createGameStore`.
- The combat CLI uses `console.log` for player-facing messages — there's
  no event channel a UI could subscribe to.
- Knowledge-Gaps 23–25 capture the open design questions.

## Open questions

1. **Public API trim.** Today `src/index.ts` re-exports nearly everything.
   Before publishing:
   - (A) Aggressive trim — only the minimum the UI needs.
   - (B) Light trim — drop only obviously internal helpers.
   - (C) No trim — leave the surface wide.
   The bigger the surface, the more work for a future renaming/refactor.
   > Your answer: (C) No trim. `src/index.ts` ships ~150 symbols across
   > every module (Character, Enemy, Combat, Effects, Items, Skills,
   > Game, World, NPCs, Utils, events). The deliberate Phase 21 cleanup
   > (a3f1693) removed only the genuinely dead — `createNodeAdapter`
   > duplicate-export, the seven `create*Event` factories, redundant
   > casts — and left the rest. Rationale: the React Native consumer is
   > internal (one app, one team), so surface-area churn cost is low and
   > the convenience of a single import path is high. Plan an aggressive
   > trim later if the package is ever published externally.

2. **Zustand dependency.** Spec 09 Q1 asks where the store lives. From
   the package perspective:
   - (A) Keep `zustand` as a dep; ship `createGameStore` as the canonical
     consumer entry point.
   - (B) Drop `zustand`; expose only pure reducers; the consumer picks
     their state library.
   - (C) Provide both — pure reducers as primary, `createGameStore` as a
     convenience exported from a sub-path (`'axiomancer-mechanics/store'`).
   > Your answer: A practical hybrid of (A) and (C), but without the
   > separate sub-path: `zustand` is still a runtime dep
   > (`package.json:dependencies`); `createGameStore` is the canonical
   > entry; the pure `gameReducer`, `migrate`, `createNewGameState`,
   > selectors, and `createEventEmitter` are also exported alongside, so
   > a consumer who wants their own state library can opt out without
   > paying the Zustand cost at the reducer layer. The convenience of a
   > single import path beat the sub-path-tree cost.

3. **Persistence adapters.** `node.adapter.ts` uses `fs`. Options:
   - (A) Move it to `src/Game/persistence/node.adapter.ts` behind a
     subpath export so React Native won't reach it.
   - (B) Move it out of the package entirely (into a `dev-tools`
     directory unbundled).
   - (C) Switch the package's `main` to a "core" entry that excludes Node
     adapters; expose them via `'axiomancer-mechanics/node'`.
   > Your answer: (C). `package.json` `exports` field maps
   > `'axiomancer-mechanics'` → `dist/index.js` (core, RN-safe) and
   > `'axiomancer-mechanics/node'` → `dist/node.js`. `src/node.ts` is a
   > four-line re-export of `createNodeAdapter` and the
   > `PersistenceAdapter` type; nothing under that sub-path touches
   > `fs`-free callers. Verified by the Phase 21 cleanup which dropped
   > `createNodeAdapter` from the main barrel (commit e478bdd).

4. **Async storage adapter.** Should this package ship an
   `asyncStorageAdapter` for React Native's `AsyncStorage`, or document
   the interface and let the UI implement it?
   > Your answer: Document the interface; let the UI implement.
   > `src/Game/persistence/types.ts:11` carries an explicit comment:
   > "React Native → implement with AsyncStorage in the app package".
   > Shipping an adapter here would pull `@react-native-async-storage/
   > async-storage` into the engine's peer-dep graph — bad smell for an
   > otherwise platform-agnostic library. The shipped interface
   > (`PersistenceAdapter` with `load()` / `save(state)`) is small
   > enough that the consumer's implementation is ~10 lines.

5. **Event channel shape.**
   - (A) Pure reducers return `{ state, events }`; the consumer subscribes
     by polling state.
   - (B) `EventEmitter` instance exposed on the store.
   - (C) Observable (RxJS or nano-observable).
   - (D) Callback list (`store.onEvent(handler)`).
   > Your answer: (B), implemented in-house rather than via Node's
   > `events` module. `src/Game/events.ts:46-72` exports
   > `createEventEmitter()` returning a `GameEventEmitter` with three
   > methods: `on(type, handler)`, `onAny(handler)`, and `emit(event)`.
   > The store accepts an emitter as an optional ctor arg
   > (`createGameStore(adapter, overrides?, emitter?)`) and emits a
   > typed `GameEvent` after each dispatch. Combat sub-events
   > (DamageDealt, EffectApplied, etc., per Q6) ride inside the
   > `combat:round` payload rather than as separate topics — keeps the
   > top-level taxonomy small and the per-round work atomic. The pure
   > reducer path (`gameReducer(state, action)`) is also exported for
   > consumers who prefer (A).

6. **Event taxonomy.** Initial event types:
   - `CombatStarted` / `CombatEnded` / `RoundResolved` / `EffectApplied`
     / `EffectExpired` / `DamageDealt` / `Healed` / `Crit` / `Fumble`.
   - `LevelUp` / `XPGained` / `SkillLearned`.
   - `MapChanged` / `NodeEntered` / `QuestCompleted`.
   Additions / removals?
   > Your answer: Shipped 10 top-level topics in
   > `src/Game/events.ts:11-21`: `combat:started`, `combat:round`,
   > `combat:ended`, `world:moved`, `world:processed`,
   > `character:levelup`, `inventory:changed`, `dialogue:applied`,
   > `game:saved`, `game:loaded`.
   >
   > Removals from the spec proposal — these collapsed into
   > `combat:round`'s `combatEvents` payload rather than top-level
   > topics: `RoundResolved` (= `combat:round`), `EffectApplied`,
   > `EffectExpired`, `DamageDealt`, `Healed`, `Crit`, `Fumble`. The
   > `RoundEvent` discriminated union in `combat.resolver.ts` carries
   > all of these as sub-events; consumers narrow on
   > `event.payload.combatEvents[].phase`. Rationale: a single fight
   > round emits dozens of sub-events and one top-level topic per
   > round-with-bag is cheaper than fanning out N topics.
   >
   > Folded: `XPGained` (rides inside `character:levelup`'s payload via
   > `report.xpGained`); `MapChanged` ⊂ `world:moved`; `NodeEntered` ⊂
   > `world:moved`. `SkillLearned` and `QuestCompleted` deferred —
   > Phase 30 (skill learning) and the future quest-completion path
   > will add the missing topics.
   >
   > Additions: `inventory:changed` (not in the spec proposal but
   > needed by the Items module path); `dialogue:applied` (Phase 14);
   > `game:saved` / `game:loaded` (the persistence path).

7. **Logging vs events.** Today the CLI uses `console.log`. After this
   spec:
   - (A) Engine emits typed events; `combat.cli.ts` subscribes and renders
     to terminal.
   - (B) Engine retains a `BattleLogEntry[]` plus events; CLI uses log,
     UI uses events.
   > Your answer: (A) for combat — the standalone `combat.cli.ts` was
   > deleted at Phase 17 (commit 7595c2e); the unified
   > `src/CLI/game.cli.ts` subscribes to the emitter via
   > `events.onAny(emit)` (`game.cli.ts:48`) and lets `emit` route each
   > event to either a one-line human summary or a JSON line (`io.ts`).
   > `BattleLogEntry` survives on `CombatState.log` as state but is not
   > the rendering source of truth — the CLI never reads it. So the
   > effective answer is (A) with `BattleLogEntry` retained as a
   > dormant in-state log for any future UI that wants a per-round
   > history without re-subscribing.

8. **Versioning strategy.** Currently `1.0.0`. Once the UI is consuming
   the package, breaking changes need bumps:
   - (A) Strict semver; breaking = major.
   - (B) `0.x` for the duration of pre-release; breaking = minor.
   - (C) Pinned commit hashes from the UI side; semver irrelevant.
   > Your answer: (B). `package.json` ships `version: 0.6.0` today — the
   > "currently 1.0.0" framing in this spec is stale and was rolled back
   > so breaking changes can land as minor bumps without an external
   > signal that the API is stable. Promote to `1.0.0` when the public
   > API trim (Q1) and the React Native consumer's integration tests
   > both stabilise.

## Proposed approach

1. **Subpath-export refactor** per Q3 — `package.json` `exports` field
   points React Native at the core, Node consumers at the full surface.
2. **Public API trim** per Q1 — move internal helpers to non-exported
   namespace.
3. **Pure reducer entry point** — keep `createGameStore` but ensure all
   logic is reachable without it per Q2.
4. **`AsyncStorage` adapter** per Q4 (only if you opt in).
5. **Event channel implementation** per Q5; events typed per Q6.
6. **CLI refactor** per Q7 — `combat.cli.ts` subscribes to events instead
   of receiving them via return values.
7. **Versioning rules** documented in `README.md` per Q8.
8. **`docs/` index for the public API** — a new `docs/api.md` listing
   every export with its stability level.

## Acceptance checklist

- [x] All 8 questions answered. — Phase 28 unit 4 (`bb0d895`) backfilled
      the answers against the live engine.
- [x] React Native consumer can import from the core entry point with
      *no* `fs` errors. — Phase 12 (`251dda9`) split the Node-only
      `createNodeAdapter` onto the `./node` subpath; the root entry
      ships only RN-safe code.
- [x] Event channel exposes the events listed in Q6. — Phase 12
      shipped the 10 `GameEventType` topics; Phase 21 (`a3f1693`) added
      `EnginePayload` + typed aliases + guards; Phase 30 unit 2
      (`6097001`) extended the envelope with `unlockedSkills?` on
      level-up.
- [ ] CLI rendered output is unchanged from before the refactor (run a
      seeded combat before/after — same transcript). — Pre-refactor
      transcript was never captured; the Phase 26 walkthrough harness
      now pins golden-path traces, but a direct before/after comparison
      against the pre-Phase-12 CLI is no longer recoverable. Treat as
      a one-shot verification step that is past its window; the green
      walkthroughs are the standing equivalent.
- [x] `docs/api.md` lists the public API. — Last rewritten at
      `353933f`; Phase 34 unit 3 (`18f0038`) added the Phase 29 + 30
      surface (stat allocation, runtime skill learning,
      `EnginePayload.unlockedSkills`).
- [x] `package.json` `exports` field reflects the agreed subpath
      layout. — Verified: `"."` and `"./node"` subpaths are present
      with the standard types / import / require triples.

## Out of scope

- The actual React Native UI implementation.
- A graphical asset pipeline.
- Bundle-size optimisation (tree-shaking, code-splitting).
