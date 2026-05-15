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

---

## Done

- [x] **[MED] combat.resolver.ts is 1000 lines — phase logic is unsplit** — resolved at commit `48c56be` (2026-05-15) by extracting `phases/round-start.ts`, `phases/action-restriction.ts`, `phases/advantage.ts`, `phases/stance-effects.ts`, `phases/scenario.ts`, `phases/round-end.ts`; orchestrator shrunk from 1,012 LOC to 301 LOC.
- [x] **[HIGH] Typed event payloads diverge from runtime shape — guards are fictional** — resolved in Phase 21 at commit `a3f1693` (2026-05-15) by aligning `Typed*Event` payloads to the engine's actual `EnginePayload` envelope (`{ action, state, report? }`); guards in `events.utils.ts` now narrow to a shape the engine actually produces.
- [x] **[MED] Phase 12 left Node adapter duplicate-exported on the core barrel** — resolved at commit `e478bdd` (2026-05-15) by removing `createNodeAdapter` from `src/index.ts` and `src/Game/index.ts`; concrete adapter lives only at `'./node'`, interface (`PersistenceAdapter`) stays on the core barrel for RN consumers.
- [x] **[MED] Phase 12 typed event surface covers only 7 of 10 GameEventType values** — resolved at commit `a3f1693` (2026-05-15) by introducing the generic `TypedGameEvent<T extends GameEventType>` and emitting per-topic aliases for all 10 topics (`dialogue:applied`, `game:saved`, `game:loaded` now covered).
- [x] **[MED] Typed event creators are exported but never produced inside the engine** — resolved at commit `a3f1693` (2026-05-15) by deleting the seven `create*Event` factories; the engine emits via the store's dispatch path and consumer-side fabrication has no use case.
- [x] **[LOW] events.utils.ts uses redundant `as Payload` casts on literal payloads** — resolved at commit `a3f1693` (2026-05-15); the cast sites went with the deleted factories.
- [x] **[LOW] Hermetic e2e layout is half-adopted across modules** — resolved at commit `bb369c1` (2026-05-15) by moving `Effects/index.test.ts → Effects/e2e/effects.engine.test.ts`, `Enemy/enemy.logic.test.ts → Enemy/e2e/enemy.engine.test.ts`, `World/spec08.test.ts → World/e2e/world.engine.test.ts`, and updating bearings to formalize the e2e + sibling-unit convention.
- [x] **[HIGH] NPCs — exported dialogue runtime has no tests** — resolved at commit `00cda59` (2026-05-13) by adding `src/NPCs/e2e/dialogue.engine.test.ts` (13 hermetic cases).
- [x] **[HIGH] Character — zero module-level tests for public API** — resolved at commit `8e20626` (2026-05-13) by adding `src/Character/e2e/character.engine.test.ts` (16 hermetic cases).
- [x] **[MED] docs/npcs.md is stale** — resolved at commit `1193b19` (2026-05-13) by rewriting `docs/npcs.md` against the live Spec 08 Q9 dialogue surface (helpers, DialogueContext, applyDialogueChoice cross-link, accurate Pending section).
- [x] **[MED] Tests bypass test-utils/rng.ts and stub Math.random directly** — resolved at commit `6b5ea3f` (2026-05-13) by routing 3 call sites through `mockSequentialRng` and updating stale header comments in `src/Enemy/loot.ts` and `src/Combat/combat.resolver.ts`.
- [x] **[LOW] Dead code: src/Items/_archive/ (1,104 LOC)** — resolved at commit `cdcc630` (2026-05-13) by deleting the archive directory and dropping the corresponding `tsconfig.json` / `vitest.config.ts` exclude entries.
