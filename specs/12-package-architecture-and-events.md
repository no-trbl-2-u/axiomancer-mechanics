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
   > Your answer:

2. **Zustand dependency.** Spec 09 Q1 asks where the store lives. From
   the package perspective:
   - (A) Keep `zustand` as a dep; ship `createGameStore` as the canonical
     consumer entry point.
   - (B) Drop `zustand`; expose only pure reducers; the consumer picks
     their state library.
   - (C) Provide both — pure reducers as primary, `createGameStore` as a
     convenience exported from a sub-path (`'axiomancer-mechanics/store'`).
   > Your answer:

3. **Persistence adapters.** `node.adapter.ts` uses `fs`. Options:
   - (A) Move it to `src/Game/persistence/node.adapter.ts` behind a
     subpath export so React Native won't reach it.
   - (B) Move it out of the package entirely (into a `dev-tools`
     directory unbundled).
   - (C) Switch the package's `main` to a "core" entry that excludes Node
     adapters; expose them via `'axiomancer-mechanics/node'`.
   > Your answer:

4. **Async storage adapter.** Should this package ship an
   `asyncStorageAdapter` for React Native's `AsyncStorage`, or document
   the interface and let the UI implement it?
   > Your answer:

5. **Event channel shape.**
   - (A) Pure reducers return `{ state, events }`; the consumer subscribes
     by polling state.
   - (B) `EventEmitter` instance exposed on the store.
   - (C) Observable (RxJS or nano-observable).
   - (D) Callback list (`store.onEvent(handler)`).
   > Your answer:

6. **Event taxonomy.** Initial event types:
   - `CombatStarted` / `CombatEnded` / `RoundResolved` / `EffectApplied`
     / `EffectExpired` / `DamageDealt` / `Healed` / `Crit` / `Fumble`.
   - `LevelUp` / `XPGained` / `SkillLearned`.
   - `MapChanged` / `NodeEntered` / `QuestCompleted`.
   Additions / removals?
   > Your answer:

7. **Logging vs events.** Today the CLI uses `console.log`. After this
   spec:
   - (A) Engine emits typed events; `combat.cli.ts` subscribes and renders
     to terminal.
   - (B) Engine retains a `BattleLogEntry[]` plus events; CLI uses log,
     UI uses events.
   > Your answer:

8. **Versioning strategy.** Currently `1.0.0`. Once the UI is consuming
   the package, breaking changes need bumps:
   - (A) Strict semver; breaking = major.
   - (B) `0.x` for the duration of pre-release; breaking = minor.
   - (C) Pinned commit hashes from the UI side; semver irrelevant.
   > Your answer:

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

- [ ] All 8 questions answered.
- [ ] React Native consumer can import from the core entry point with
      *no* `fs` errors.
- [ ] Event channel exposes the events listed in Q6.
- [ ] CLI rendered output is unchanged from before the refactor (run a
      seeded combat before/after — same transcript).
- [ ] `docs/api.md` lists the public API.
- [ ] `package.json` `exports` field reflects the agreed subpath layout.

## Out of scope

- The actual React Native UI implementation.
- A graphical asset pipeline.
- Bundle-size optimisation (tree-shaking, code-splitting).
