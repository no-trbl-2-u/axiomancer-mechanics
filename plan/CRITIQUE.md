# CRITIQUE.md

> Code-quality audit findings. For a library project, critique
> runs an architecture/quality pass rather than a live-site
> observer pass. Findings filed here by `/critique`; drained
> by `/iterate`.

<!-- Metadata (updated by /critique after each pass):
> Last pass: 2026-05-15 at commit bb987bf
> Pass count: 3
-->

---

## Pending

### [LOW] Empty committed directory: src/Game/backups/
- pass: critique-1 (commit dd26ef0)
- area: structure
- observation: `src/Game/backups/` is an empty directory tracked in the repo. No source references it; nothing populates or reads from it.
- evidence: `ls -la src/Game/backups` shows `.` and `..` only; no `.gitkeep`, no in-repo references.
- suggested_fix: remove the directory, or — if it's a runtime target for the persistence adapter (verify against `src/Game/persistence/`) — add a `.gitkeep` and a one-line README explaining the role.
- source: critique

### [MED] Phase 12 left Node adapter duplicate-exported on the core barrel
- pass: critique-2 (commit 4c04ae8)
- area: api
- observation: Phase 12 introduced `src/node.ts` so that Node-only persistence (`createNodeAdapter`) and the `PersistenceAdapter` interface could be kept off the core barrel — the whole point of the dual-entry `exports` map in `package.json`. The cleanup is incomplete: `src/index.ts` still re-exports `createNodeAdapter` (line 130) and `PersistenceAdapter` (line 136), and `src/Game/index.ts` still surfaces both (lines 32, 34). A React Native consumer importing from `'axiomancer-mechanics'` will tree-shake-pull the Node `fs`-backed adapter into their bundle.
- evidence: `src/index.ts:130, 136`; `src/node.ts:6-7`; `src/Game/index.ts:32, 34`.
- suggested_fix: remove the concrete `createNodeAdapter` export from `src/index.ts` and `src/Game/index.ts`; keep it only in `src/node.ts`. Decide on `PersistenceAdapter`: RN consumers need the interface to build their own AsyncStorage adapter — keep it on the core barrel, but document that the concrete `createNodeAdapter` is Node-only via the `./node` subpath. Update `docs/api.md` Stability Levels list to match.
- source: critique

### [MED] Phase 12 typed event surface covers only 7 of 10 GameEventType values
- pass: critique-2 (commit 4c04ae8)
- area: api
- observation: `GameEventType` (src/Game/events.ts:11-21) declares ten event topics. The new typed surface added in Phase 12 (events.types.ts + events.utils.ts) only covers seven of them. `dialogue:applied`, `game:saved`, and `game:loaded` have no `Typed*Event` interface, no `create*Event` helper, and no `is*Event` guard. Consumers using the typed surface fall back to `payload: unknown` for those three — silently, since the union is named `TypedGameEvent` but is partial.
- evidence: `src/Game/events.ts:11-21` enumerates 10 types; `grep -c "dialogue:applied\|game:saved\|game:loaded" src/Game/events.types.ts src/Game/events.utils.ts` returns 0/0.
- suggested_fix: either (a) extend events.types.ts/events.utils.ts with `DialogueAppliedPayload`, `GameSavedPayload`, `GameLoadedPayload` plus the matching typed-event / creator / guard trio, and add them to `TypedGameEvent`; or (b) document in `docs/api.md` that those three topics are intentionally payload-less and rename the union to make the partial coverage explicit.
- source: critique

### [MED] Typed event creators are exported but never produced inside the engine
- pass: critique-2 (commit 4c04ae8)
- area: dead-code
- observation: The seven `create*Event` helpers added in Phase 12 are exported from `src/index.ts:200-203` but have zero internal callers — the engine still emits via raw `events.emit({ type, payload })` in the store and reducers. The "Beta" label in `docs/api.md:28-31` acknowledges churn, but the deeper concern is that consumer-side type guards (`is*Event`) will never narrow correctly against engine-emitted events, because engine payloads aren't constructed through the matching creators and can drift in shape.
- evidence: `grep -rn "createCombatStartedEvent" src --include="*.ts"` matches only `src/index.ts:200` (re-export) and `src/Game/events.utils.ts` itself; same pattern for the other six creators.
- suggested_fix: either retrofit the store/reducer emit sites to route through these creators (so engine payloads always match the typed shape), or downgrade them in `docs/api.md` from Beta to a clearly-labelled "consumer convenience" tier and add a `// TODO retrofit emit sites` note to the engine.
- source: critique

### [LOW] events.utils.ts uses redundant `as Payload` casts on literal payloads
- pass: critique-2 (commit 4c04ae8)
- area: types
- observation: Each of the seven `create*Event` helpers constructs an object literal and casts it to the matching Payload interface (e.g. `{ enemy, playerStance } as CombatStartedPayload`). TypeScript already infers the literal shape against the function's return type; the casts strip the structural check and hide future drift between literal and interface. If a payload field is renamed in `events.types.ts`, the literal at the creator site no longer errors.
- evidence: `src/Game/events.utils.ts:27, 37, 51-58, 64, 76, 83, 94`.
- suggested_fix: remove the `as Payload` casts. Let TypeScript enforce the literal against the return type. If a literal is incomplete the function fails to compile — which is the desired feedback.
- source: critique

### [HIGH] Typed event payloads diverge from runtime shape — guards are fictional
- pass: critique-3 (commit bb987bf)
- area: api
- observation: Phase 12 declared seven `Typed*Event` interfaces (e.g. `TypedInventoryChangedEvent.payload: InventoryChangedPayload` with `{ action, item, xpGained? }`). The actual engine emits a uniform shape via `eventForAction` in `src/Game/store.ts:122-144`: every event payload is `{ action, state, ...(extra ?? {}) }`, regardless of `type`. Inventory/combat sub-emit sites are the same (e.g. `emitter.emit({ type: 'inventory:changed', payload: { state: get() } })`, `emitter.emit({ type: 'combat:round', payload: { state: next } })`). Consumer code calling `isInventoryChangedEvent(e)` then reading `e.payload.action` gets `undefined` at runtime — the type guard narrows on `event.type` only and asserts a payload shape the engine never produces. Same for the other six guards. This deepens the existing MED finding above: it's not "creators aren't internally used", it's "the typed surface is fictional — there is no shape contract".
- evidence: `src/Game/store.ts:143` (uniform `{ action, state, ...extra }`); `src/Game/store.ts:203-206, 254, 261, 272, 293`; `src/Game/events.types.ts:9-64`; `src/Game/events.utils.ts:101-127`.
- suggested_fix: pick one direction in a single phase: (a) widen the typed payloads to a shared `{ action, state, ...extra }` shape that mirrors the engine, and remove the per-event payload subfields that the engine never emits; or (b) rewrite `eventForAction` + the explicit `emit` sites in `store.ts` to actually produce the declared shapes (using the existing `create*Event` helpers), and update consumers/tests accordingly. Phase 21 is already queued for the Phase 12 cleanup — extend its scope to resolve this contract before any consumer takes a hard dependency on the guards.
- source: critique

### [MED] Game/persistence has zero tests despite owning the save-file format
- pass: critique-3 (commit bb987bf)
- area: tests
- observation: `src/Game/persistence/` ships `null.adapter.ts`, `node.adapter.ts`, and `types.ts` (the `PersistenceAdapter` interface exposed on the public barrel and the `./node` subpath). No `*.test.ts` exists for either adapter. The Node adapter is the only adapter that actually round-trips a save: it reads/writes a JSON file, catches read errors and falls back to "fresh game", and is invoked on every `dispatch` (autosave). The `game.loop.engine.test.ts` flow exercises `nullAdapter`, not the fs path. A future change that breaks JSON encoding, file-not-found fallback, or partial-write handling has no test that fails — even though the surface is small (32 LOC), it's load-bearing for every consumer that uses the engine in a Node context.
- evidence: `find src/Game/persistence -name "*.test.ts"` is empty; `src/Game/persistence/node.adapter.ts:1-32` does the fs reads/writes; `src/Game/store.ts:160-183` invokes `adapter.load()` once at construction and `adapter.save(...)` on every dispatch.
- suggested_fix: add `src/Game/persistence/node.adapter.test.ts` with three hermetic cases — round-trip save/load via a tmpfile path, load returns null when file missing, load returns null and warns when file is malformed JSON. Use `node:fs` directly with `os.tmpdir()` + `crypto.randomUUID()` for the test path; no mocking needed.
- source: critique

### [LOW] northern-forest map has placeholder description `'TODO'`
- pass: critique-3 (commit bb987bf)
- area: docs
- observation: `src/World/Continents/Coastal-Village/maps.ts:283` declares the `northern-forest` map with `description: 'TODO'`. Phase 14 shipped the story-content foundation and lists the fishing village + first named NPC as in-scope, but the second map's description never got filled in. Phase 24 (MapEvents content) plans to migrate northern-forest into the new event shape — the placeholder is going to be rendered before then if any UI consumer surfaces the description.
- evidence: `src/World/Continents/Coastal-Village/maps.ts:281-284` (the `northern-forest` `WorldMap` literal).
- suggested_fix: write a one-paragraph description in-place (the map already has an established tone from `fishing-village`), or fold the rewrite into Phase 24 and gate the placeholder behind a TODO-tracked review note in the phase brief so it's not silently shipped.
- source: critique

### [LOW] Hermetic e2e layout is half-adopted across modules
- pass: critique-1 (commit dd26ef0)
- area: structure
- observation: `plan/bearings.md` locates hermetic e2e tests at `src/<Module>/e2e/<feature>.engine.test.ts`. Combat (1), Game (1), Items (3), Skills (1) follow it; Effects, Enemy, Utils, World use sibling `*.test.ts` and Character/NPCs have neither. The convention is documented but only half-enforced, which makes "is this module covered?" a per-module search.
- evidence: `find src -type d -name e2e` lists only Combat/Game/Items/Skills; Enemy/Effects/Utils/World keep tests in the module root (e.g. `src/Enemy/enemy.logic.test.ts`, `src/World/world.reducer.test.ts`).
- suggested_fix: either broaden bearings to bless sibling `*.test.ts` for non-engine tests and reserve `e2e/` for full-stack module exits, or migrate sibling tests into `e2e/` per module. Pick one and update bearings in the same commit.
- source: critique

---

## Done

- [x] **[MED] combat.resolver.ts is 1000 lines — phase logic is unsplit** — resolved at commit `48c56be` (2026-05-15) by extracting `phases/round-start.ts`, `phases/action-restriction.ts`, `phases/advantage.ts`, `phases/stance-effects.ts`, `phases/scenario.ts`, `phases/round-end.ts`; orchestrator shrunk from 1,012 LOC to 301 LOC.
- [x] **[HIGH] NPCs — exported dialogue runtime has no tests** — resolved at commit `00cda59` (2026-05-13) by adding `src/NPCs/e2e/dialogue.engine.test.ts` (13 hermetic cases).
- [x] **[HIGH] Character — zero module-level tests for public API** — resolved at commit `8e20626` (2026-05-13) by adding `src/Character/e2e/character.engine.test.ts` (16 hermetic cases).
- [x] **[MED] docs/npcs.md is stale** — resolved at commit `1193b19` (2026-05-13) by rewriting `docs/npcs.md` against the live Spec 08 Q9 dialogue surface (helpers, DialogueContext, applyDialogueChoice cross-link, accurate Pending section).
- [x] **[MED] Tests bypass test-utils/rng.ts and stub Math.random directly** — resolved at commit `6b5ea3f` (2026-05-13) by routing 3 call sites through `mockSequentialRng` and updating stale header comments in `src/Enemy/loot.ts` and `src/Combat/combat.resolver.ts`.
- [x] **[LOW] Dead code: src/Items/_archive/ (1,104 LOC)** — resolved at commit `cdcc630` (2026-05-13) by deleting the archive directory and dropping the corresponding `tsconfig.json` / `vitest.config.ts` exclude entries.
