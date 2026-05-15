# CRITIQUE.md

> Code-quality audit findings. For a library project, critique
> runs an architecture/quality pass rather than a live-site
> observer pass. Findings filed here by `/critique`; drained
> by `/iterate`.

<!-- Metadata (updated by /critique after each pass):
> Last pass: 2026-05-15 at commit 938016b
> Pass count: 10
-->

---

## Pending

### [LOW] `docs/world.md` "Discovery (fog-of-war)" section misses Phase 31's `unlockAdjacent`
- pass: critique-10 (commit 938016b)
- area: docs
- observation: `docs/world.md:235-238` describes Phase 23's
  `revealAdjacent` as the only function that fires when a node
  resolves: "`resolveMapEvent` calls `revealAdjacent` after consuming
  a node, so the next ring of nodes only becomes visible once the
  player has cleared the current one." After Phase 31 (`711b49e`),
  `resolveMapEvent` ALSO calls `unlockAdjacent` — the companion
  reducer that moves adjacents from `lockedNodes` into
  `availableNodes` so the CLI mapTab can actually offer them as
  targets. The doc reads as if only the fog-of-war shifts, which
  understates traversal state and would mislead a new contributor
  reading the section.
- evidence: `docs/world.md:235-238` vs.
  `src/World/MapEvents/resolve-map-event.ts:117/128/140-142` (the
  three exit paths now thread `unlockAdjacent(revealAdjacent(map,
  nodeId), nodeId)`).
- suggested_fix: add an "Unlocked traversal" sub-bullet alongside
  the "Discovery (fog-of-war)" bullet — name `unlockAdjacent`, note
  that it moves `connectedNodes` from `lockedNodes` to
  `availableNodes`, and link to Phase 31 (`711b49e`). The `MapState`
  shape table at line 30 already lists `availableNodes` + `lockedNodes`
  so the doc has the vocabulary; only the discovery section needs
  the update.
- source: critique

### [LOW] Phase 32 critStyle wiring lacks a resolver-path integration test
- pass: critique-10 (commit 938016b)
- area: tests
- observation: Phase 32 (`e456322`) wired `isCriticalHit(rawAttackRoll)`
  into `src/Combat/phases/scenario.ts:resolveAttackHit` and now emits
  `isCritical` + `critStyle` on the `damage-applied` event. The damage
  math is well covered by the 4 new unit tests in
  `src/Combat/index.test.ts` (low / high defence, bonus rides both
  paths, bonus flips the pick). But the wiring itself — the actual
  call site in scenario.ts and the optional fields on the event — has
  no hermetic test. The Phase 32 commit body called this out
  explicitly as a decision, noting "a future iterate pass can add
  round-driven coverage if the auto-selection regresses in playtest."
  Filing the finding so /iterate picks it up; the wiring is one
  function call, so the test would also be small.
- evidence: `src/Combat/phases/scenario.ts:449-465` (the new
  `isCritical` branch + event-field spread); `src/Combat/index.test.ts`
  covers only the pure damage helpers.
- suggested_fix: extend `src/Combat/combat.resolver.test.ts` (or
  `src/Combat/phases/e2e/scenario.engine.test.ts` if a phases-tier
  e2e folder is preferred) with one case that seeds a nat-20 attack
  roll via `mockSequentialRng(0.96)` (or equivalent — the d20 raw
  roll path uses `getRng().random()` indirectly), drives a single
  combat round through `resolveCombatRound`, and asserts the
  emitted `damage-applied` event carries `isCritical: true` and a
  `critStyle` value. Pair with a non-crit assertion as the
  control.
- source: critique

### [LOW] `docs/api.md` stops at Phase 24 — five phases of additions undocumented
- pass: critique-9 (commit 6097001)
- area: docs
- observation: `docs/api.md` is the canonical "every public export
  with its stability level" reference (Spec 12 acceptance line). Its
  phase trail caps at Phase 24 (MapEvents content); since then five
  phases have added barrel exports that aren't listed:
    - Phase 26 — state-log writer (CLI only; not on barrel — skip).
    - Phase 27 — Save / Load CLI tabs (CLI only — skip).
    - Phase 29 — `allocateStatPoint`, `STAT_POINTS_PER_LEVEL`,
      `availableStatPoints` field on `Character`,
      `ALLOCATE_STAT_POINT` action. All on `src/index.ts` /
      `src/Game/index.ts`.
    - Phase 30 unit 1 — `getAvailableSkills`, `learnSkill`,
      `meetsLearningRequirement`. All on `src/Skills/index.ts` and
      `src/index.ts`.
    - Phase 30 unit 2 — `EnginePayload.unlockedSkills` (type
      extension; affects every `TypedGameEvent<T>` consumer).
- evidence: `docs/api.md` (last phase mention at line 129); compare
  against the Phase 21 audit trail at line 80 vs the live barrel
  exports in `src/index.ts:13-145`.
- suggested_fix: add a "Phase 29 — Stat allocation" sub-block to
  the Character section and a "Phase 30 — Skill learning" sub-block
  to the Skills section. In the Events section, document the
  `unlockedSkills?` field on `EnginePayload` next to the existing
  Phase-21 typed-event block.
- source: critique

### [LOW] `automation/scripts/walkthroughs/` has no index — 7 walkthroughs and counting
- pass: critique-9 (commit 6097001)
- area: docs
- observation: The directory now ships 7 walkthroughs (`character-
  sheet`, `map-events`, `skills-in-combat`, `item-use`,
  `boss-encounter`, `save-load`, `stat-allocation`) but has no
  README. New contributors have to grep each pair to learn what
  exists, what each surface tests, what flags it needs (`--save-file`
  is required by save-load only), and which preset / enemy is
  expected. The pattern is stable enough that the index would
  protect against the directory growing into a junk drawer.
- evidence: `ls automation/scripts/walkthroughs/` lists 14 files
  (7 `.json` + 7 `.goal.md`), no `README*`.
- suggested_fix: add `automation/scripts/walkthroughs/README.md` —
  one row per walkthrough with columns `script | surface under
  test | preset | enemy / encounter | required flags | exit
  expectation`. Cap at a single page. Mirrors how `docs/api.md`
  indexes the package surface.
- source: critique

### [LOW] Spec 06 backfill answers grew stale after Phases 29 + 30 unit 1 shipped
- pass: critique-8 (commit ef1b486)
- area: docs
- observation: Phase 28 unit 2 backfilled Spec 06's 9 open Qs at
  75f250b. Less than a day later, Phase 29 (Q3 + Q8) and Phase 30
  unit 1 (Q7) shipped — but the spec answers still describe those
  three questions as "deferred — not yet implemented". Specifically:
    - Spec 06 Q3 answer (line 67-72) says "Deferred — not yet
      implemented. The `Character` interface in `src/Character/types.d.ts`
      carries no `availableStatPoints` field" — now false; the field
      ships at line 91.
    - Spec 06 Q7 answer says "There is no `learnSkill` function in
      `src/Character/` or `src/Skills/`" — now false; Phase 30 unit
      1 (1e14a8e) added one to `src/Skills/skill.engine.ts`.
    - Spec 06 Q8 answer says "Moot today (no allocation flow exists
      per Q3 + Q7)" — moot is now wrong; both flows exist.
- evidence: `specs/06-character-progression.md:67-72`, `72-86`, `131-138`
  vs. shipped code at `src/Character/types.d.ts:91`,
  `src/Character/index.ts` (`allocateStatPoint`),
  `src/Skills/skill.engine.ts` (`learnSkill`).
- suggested_fix: refresh the three answers to point at the now-
  shipped surfaces (commit hashes 9f2e3f6, 121aea8, db7c26f, 1e14a8e).
  Each answer can stay short — a one-line "shipped at <hash>" with a
  pointer to the doc / module. The stale "deferred" framing is what
  matters to fix.
- source: critique

### [LOW] Acceptance checklists for Specs 06 + 12 still all `[ ]` despite Phase 28/29 work
- pass: critique-8 (commit ef1b486)
- area: docs
- observation: `specs/06-character-progression.md:181-187` and
  `specs/12-package-architecture-and-events.md:193-200` carry
  acceptance checklists. Phase 28 unit 2/4 closed every
  "All N questions answered" prerequisite; Phase 29 closed Spec 06's
  "Allocating a stat point updates `derivedStats`" line. Neither
  spec ticks any box. Future contributors reading the spec see a 0%
  acceptance bar and assume nothing has shipped.
- evidence: `specs/06-character-progression.md:181-187`,
  `specs/12-package-architecture-and-events.md:193-200`. Compare
  against commit log: 75f250b (Spec 06 answers), bb0d895 (Spec 12
  answers), db7c26f (Spec 06 acceptance line 4).
- suggested_fix: tick the now-shipped checkboxes with a commit-hash
  reference: Spec 06 boxes 1 + 4; Spec 12 box 1. Leave the still-
  unmet boxes (Spec 06 box 2 — XP visible after combat is wired but
  the CLI display might still miss the new pool; Spec 12 box 5 —
  `docs/api.md` is a stub) `[ ]` with a one-line note.
- source: critique

### [LOW] Combat reducer carries five aliases that add no behaviour
- pass: critique-7 (commit 1f4911b)
- area: dead-code
- observation: `src/Combat/combat.reducer.ts:66-71` defines five "legacy
  aliases": `updateCombatPhase`, `addBattleLogEntry`,
  `endCombatPlayerVictory`, `endCombatPlayerDefeat`,
  `endCombatWithFriendship`. The last three are literal `= endCombat` —
  the outcome is computed by `determineCombatEnd(state)` per
  `docs/combat.md:216`, so the "named" variants are misleading: calling
  `endCombatPlayerDefeat(state)` does NOT mark a defeat. The first two are
  not even exported through `src/index.ts` or `src/Combat/index.ts` and have
  zero in-repo callers (verified via `grep -rn updateCombatPhase\\|addBattleLogEntry src/`).
- evidence: `src/Combat/combat.reducer.ts:66-71`; barrel surface in `src/index.ts:62-65`.
- suggested_fix: delete `updateCombatPhase` and `addBattleLogEntry` (zero callers, not on barrel). For the three end-variants on the barrel, either (a) drop them and update `docs/combat.md:216`, or (b) give each a real distinguishing effect (e.g. set a specific `outcome` field). Pick (a) unless an external React-Native consumer is known to depend on them.
- source: critique

### [MED] agent-e2e grader is blind to fine-grained combat sub-events
- pass: critique-7-follow-up (commit at oversight 2026-05-15)
- area: tests
- observation: `src/CLI/game.cli.ts:235-237` logs a `combatRound`
  state-log entry whose `event` field only carries
  `{ playerAction, enemyAction, eventCount }` — the actual
  `combatEvents: RoundEvent[]` array (with `phase: 'item' | 'skill' |
  'effect-application' | …, kind, hpBefore/hpAfter, healed,
  appliedEffectId, …`) is dropped. The `combat:round` GameEvent
  payload also doesn't include them. Result: the agent-e2e grader
  reading the state log can verify HP/inventory diffs and the action
  taken, but cannot inspect *what the skill did* (effects applied,
  resists, crits, friendship-counter ticks) — those are the most
  semantically interesting per-round signals. Surfaced by the
  user during oversight 2026-05-15 ("Does the e2e testing workflow
  have enough logging information to determine if a goal is met?").
- evidence: `src/CLI/game.cli.ts:220-222`, `src/Combat/combat.resolver.ts`
  (`RoundEvent` union), `automation/scripts/walkthroughs/item-use.goal.md`
  (already notes the agent has to infer item-use from the inventory
  decrement because the `item:used` sub-event isn't in the log).
- suggested_fix: extend the `combatRound` `logState` payload with the
  full `combatEvents` array (or a JSON-safe projection of it). For
  size: typical rounds emit 1-5 sub-events at ~50 bytes each, so 50
  rounds is ~12 KB — well inside the state log's budget. The
  `combat:round` GameEvent payload should likely mirror this so a
  React Native UI can subscribe to round-by-round detail too. Add a
  hermetic test in `src/CLI/e2e/io.engine.test.ts` that asserts a
  scripted skill round populates the array.
- source: critique (oversight follow-up)

### [LOW] `Items` module has no top-level docs page
- pass: critique-7 (commit 1f4911b)
- area: docs
- observation: Every other significant module under `src/` has a sibling
  `docs/<module>.md` (character, combat, effects, enemy, skills, world,
  npcs, plus the cross-cutting equipment.md and gameloop.md). The `Items`
  module ships `Consumable`, `Material`, `QuestItem`, `Equipment` (delegated
  to equipment.md), rarity tables, modifier catalogue, and the
  `dropItem`/`rollModifiers` loot path — but there is no `docs/items.md`
  index. New contributors have to read `src/Items/index.ts` exports to find
  the surface.
- evidence: `ls docs/` shows `equipment.md` but no `items.md`; `src/Items/index.ts` exports 19 symbols spanning four item kinds.
- suggested_fix: create `docs/items.md` as a short index — one paragraph per item kind, a table of public exports keyed to the existing `equipment.md` for the Equipment chapter. Mirror the structure of `docs/character.md`.
- source: critique

---

## Done

- [x] **[MED] `docs/character.md` "Pending" section directly contradicts shipped Phase 29 code** — resolved at Phase 34 unit 2 (this commit). `docs/character.md` Pending block trimmed to only the genuinely open item (`id` field, Knowledge-Gaps Q12, promoted as Phase 35). New "Stat allocation" section after "Experience" documents `availableStatPoints`, `STAT_POINTS_PER_LEVEL`, `allocateStatPoint`, the `ALLOCATE_STAT_POINT` action, and the Character-tab prompt loop, with commit hashes (`9f2e3f6` + `121aea8` + `db7c26f`). Impact 6 × Ease 8 / 10 = 4.8.

- [x] **[MED] `docs/gameloop.md` GameEvent surface section is pre-Phase-21** — resolved at commit e9d267d (2026-05-15, Phase 34 unit 1) by rewriting the Event-surface block. The pre-Phase-21 `payload: unknown` shape replaced with the live `EnginePayload` (action / state / report? / unlockedSkills?); added a "Typed narrowing (Phase 21)" subsection with a working `isLevelUpEvent` consumer snippet that surfaces `unlockedSkills` (Phase 30 unit 2). Impact 6 × Ease 9 / 10 = 5.4.
- [x] **[HIGH] CLI mapTab can't progress past adjacent-to-start — `availableNodes` is never updated under the Phase 23 dispatcher** — resolved at commits 711b49e (engine fix + 4 hermetic cases in `src/World/MapEvents/e2e/map-events.engine.test.ts` under "Phase 31 traversal fix") and 3ee7b81 (save-load walkthrough rewrite exercising fv-1 → fv-2 → fv-3 → load). Phase 31 added `unlockAdjacent(map, nodeId)` next to `revealAdjacent` and threaded it through every `resolveMapEvent` exit path. Impact 9 × Ease 5 / 10 = 4.5.
- [x] **[MED] `docs/gameloop.md` tabs section is multi-phase out of date** — resolved at commit 7a34055 (2026-05-15) by rewriting the `game.cli.ts` section: tabs table now lists all 10 live tabs (Map / Combat / Journal / Skills / Inventory / Character / Debug / Save / Load / Quit) with phase-correct verb references (`resolveMapEvent` replaces `PROCESS_NODE`, the four Phase-26/27/29 affordances are surfaced). Run instruction replaces `npx tsx` with `npm run game` and enumerates the four shipped flags (--script, --json-events, --state-log, --save-file). Impact 6 × Ease 9 / 10 = 5.4.
- [x] **[MED] Phase 26 state-log writer (`src/CLI/io.ts`) has zero hermetic coverage** — resolved at commit 404dadd (2026-05-15) by extending `src/CLI/e2e/io.engine.test.ts` with 4 new cases: state log disabled by default (no-op on `logState`), `setStateLogPath` truncates an existing file, `logState` appends JSONL records with monotonic tick + the `{ action, before, after, event? }` shape, `setStateLogPath` resets the tick counter on a fresh session. Suite grows 12 → 16; 425/425 total green.
- [x] **[HIGH] src/CLI/combat.display.ts is 968 LOC of dead code orphaned by Phase 17** — resolved at commit `0e7e8a9` (2026-05-15) by `git rm src/CLI/combat.display.ts`. Phase 17 deleted `combat.cli.ts` but missed this companion helper file; zero consumers in src/, automation/, or scripts/.
- [x] **[LOW] Empty committed directory: src/Game/backups/** — closed at commit 8deedeb (2026-05-15) as misdiagnosed. `git ls-files src/Game/backups/` is empty — git does not track empty directories, so the "committed directory" framing in the original finding was wrong. The directory existed only in local working trees and was not in the repository. Deleted the local instance; a fresh clone is unaffected.
- [x] **[LOW] northern-forest map has placeholder description `'TODO'`** — resolved at commit 7623ffc (2026-05-15) by replacing the literal in `src/World/Continents/Coastal-Village/maps.ts` with a one-line description matching the fishing-village tone: "A pine-thick wood inland from the village; cold springs, low light, and a cave mouth at the far edge."
- [x] **[MED] Game/persistence has zero tests despite owning the save-file format** — resolved at commit `81d6dbe` (2026-05-15) by adding `src/Game/persistence/node.adapter.test.ts` (4 hermetic cases: round-trip save/load, missing file, malformed JSON warns + nulls out, overwrite).
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
