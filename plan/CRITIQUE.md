# CRITIQUE.md

> Code-quality audit findings. For a library project, critique
> runs an architecture/quality pass rather than a live-site
> observer pass. Findings filed here by `/critique`; drained
> by `/iterate`.

<!-- Metadata (updated by /critique after each pass):
> Last pass: 2026-05-13 at commit dd26ef0
> Pass count: 1
-->

---

## Pending

### [HIGH] Character — zero module-level tests for public API
- pass: critique-1 (commit dd26ef0)
- area: tests
- observation: `src/Character/` ships `createCharacter`, `equipItem`, `unequipItem`, `getEquipmentModifiers` through the public barrel but the module contains zero `.test.ts` files — no `e2e/*.engine.test.ts`, no sibling unit tests. Coverage is incidental via Combat/Items tests; nothing guards the Character API directly.
- evidence: `find src/Character -name '*.test.ts'` returns empty; `src/Character/` contains only `characters.mock.ts`, `equipment.reducer.ts`, `index.ts`, `types.d.ts`.
- suggested_fix: add `src/Character/e2e/character.engine.test.ts` exercising `createCharacter` (level/xp derivation, starting equipment fold-in) and `equipItem`/`unequipItem`/`getEquipmentModifiers` round-trip with the RNG stubs from `src/test-utils/rng.ts`.
- source: critique

### [MED] docs/npcs.md is stale — claims "no runtime functions exported"
- pass: critique-1 (commit dd26ef0)
- area: docs
- observation: `docs/npcs.md` documents the NPCs module as "Types only. Dialogue runtime, shop logic, and quest dialogue are pending Phase 7" and the "Public API (current)" section states *"No runtime functions are exported yet."* The barrel already exports `getDialogueNode`, `visibleChoices`, `isLeafNode`, plus the `DialogueTree`, `DialogueNode`, `DialogueChoice` types.
- evidence: `docs/npcs.md` lines describing "Public API (current)" / "Pending (Phase 7)"; contradicted by `src/NPCs/index.ts` and `src/index.ts` NPCs export block.
- suggested_fix: rewrite the "Public API" section to document the three runtime helpers + `DialogueContext`, and move shop/quest-giver-flow items from "Pending" to a "Remaining for full Spec 08 surface" subsection once verified against `specs/08`.
- source: critique

### [MED] Tests bypass test-utils/rng.ts and stub Math.random directly
- pass: critique-1 (commit dd26ef0)
- area: tests
- observation: `plan/bearings.md` ("Decisions standing for the autonomous loop") locks RNG stubbing to `mockAlternatingRng`, `mockFixedRng`, `mockSequentialRng` from `src/test-utils/rng.ts` and explicitly forbids ad-hoc `vi.spyOn(Math, 'random')`. Two test files violate this.
- evidence: `src/Game/store.encounter.test.ts:48`, `src/Game/store.encounter.test.ts:99`, `src/Game/spec08.e2e.test.ts:38` all call `vi.spyOn(Math, 'random').mockReturnValue(...)` directly.
- suggested_fix: replace each call with the appropriate helper from `src/test-utils/rng.ts` (likely `mockFixedRng(0.99)` / `mockFixedRng(0.5)`). Update the comments in `src/Enemy/loot.ts:9` and `src/Combat/combat.resolver.ts:20` that still describe the deprecated `vi.spyOn` pattern as the canonical stub mechanism.
- source: critique

### [MED] combat.resolver.ts is 1000 lines — phase logic is unsplit
- pass: critique-1 (commit dd26ef0)
- area: structure
- observation: `src/Combat/combat.resolver.ts` is 1,000 LOC and conflates round-start tick, action-restriction resolution, advantage computation, stance-effect bookkeeping, scenario damage flow, item phases, and round-end expiry. The file's own header already documents these as discrete phases (`round-start`, `action-restriction`, `advantage`, `stance-effects`, `scenario`, `round-end`). The shape is asking to be split.
- evidence: `wc -l src/Combat/combat.resolver.ts` reports 1000 lines; comment block at lines 9–17 enumerates six event groups; no sibling files split the responsibilities.
- suggested_fix: extract per-phase helpers (`resolveRoundStart`, `resolveActionRestriction`, `resolveAdvantage`, `resolveStanceEffects`, `resolveScenario`, `resolveRoundEnd`) into colocated files; keep `resolveCombatRound` as the orchestrator that wires them and produces the `combatEvents` stream. Land behind the existing e2e suite so the public contract is unchanged.
- source: critique

### [LOW] Dead code: src/Items/_archive/ (1,104 LOC, zero references)
- pass: critique-1 (commit dd26ef0)
- area: dead-code
- observation: `src/Items/_archive/` contains `equipment.library.ts` (773 lines) and `equipment-resource.engine.test.ts` (331 lines). Nothing in `src/` or the barrel references the archive directory.
- evidence: `grep -rn "Items/_archive\|_archive/equipment" src` returns empty; directory contains only the two files above.
- suggested_fix: delete `src/Items/_archive/` outright; the content is preserved in git history. If retention is intentional (e.g., reference material for an upcoming spec), move it under `braindump/` or `docs/references/` and add a one-line README explaining why.
- source: critique

### [LOW] Empty committed directory: src/Game/backups/
- pass: critique-1 (commit dd26ef0)
- area: structure
- observation: `src/Game/backups/` is an empty directory tracked in the repo. No source references it; nothing populates or reads from it.
- evidence: `ls -la src/Game/backups` shows `.` and `..` only; no `.gitkeep`, no in-repo references.
- suggested_fix: remove the directory, or — if it's a runtime target for the persistence adapter (verify against `src/Game/persistence/`) — add a `.gitkeep` and a one-line README explaining the role.
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

- [x] **[HIGH] NPCs — exported dialogue runtime has no tests** — resolved at commit `00cda59` (2026-05-13) by adding `src/NPCs/e2e/dialogue.engine.test.ts` (13 hermetic cases).
