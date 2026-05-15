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

---

## Done

- [x] **[LOW] `docs/world.md` "Discovery (fog-of-war)" section misses Phase 31's `unlockAdjacent`** — resolved at Phase 34 unit 8 (this commit). Added an "Unlocked traversal" sub-bullet alongside "Discovery (fog-of-war)" that names `unlockAdjacent`, notes that it moves `connectedNodes` from `MapState.lockedNodes` into `MapState.availableNodes`, and links to Phase 31 (`711b49e`) — the fix that made the CLI Map tab actually offer the next ring as navigable targets. Impact 4 × Ease 9 / 10 = 3.6.

- [x] **[LOW] `Items` module has no top-level docs page** — resolved at Phase 34 unit 7 (this commit). New `docs/items.md` lands as a one-page index — overview, item-kinds table with type guards + behaviour, rarity model, modifier-catalogue summary, loot-factory API (`dropItem` / `rollModifiers` / `resolveModifiers` / `rarityWeightTable`), inventory reducers, templates / libraries, full API table, and a Pending block for crafting + shop economy. Delegates the Equipment chapter to the existing `docs/equipment.md`. Impact 4 × Ease 8 / 10 = 3.2.

- [x] **[LOW] `automation/scripts/walkthroughs/` has no index — 7 walkthroughs and counting** — resolved at Phase 34 unit 6 (this commit). Added `automation/scripts/walkthroughs/README.md` — one-page index with the requested columns (script / surface / preset / enemy / required flags / exit expectation) covering all 8 walkthroughs (the directory had grown to include `skill-learning` since the critique was filed). README also documents the harness invocation pattern, the hermetic-replay conventions, and how to add a new walkthrough. Impact 4 × Ease 9 / 10 = 3.6.

- [x] **[LOW] Acceptance checklists for Specs 06 + 12 still all `[ ]` despite Phase 28/29 work** — resolved at Phase 34 unit 5 (this commit). Spec 06 acceptance: boxes 1 (all Qs answered), 3 (level-up flow per Q8), 4 (stat allocation updates derivedStats), 5 (docs/character.md Pending drained) ticked with commit hashes; box 2 (XP visible in CLI transcript) left open with a note pointing at /iterate. Spec 12 acceptance: boxes 1, 2, 3, 5, 6 ticked; box 4 (pre-refactor transcript comparison) left open with a note that the window for that one-shot comparison has passed, and the Phase 26 walkthroughs are the standing equivalent. Impact 4 × Ease 8 / 10 = 3.2.

- [x] **[LOW] Spec 06 backfill answers grew stale after Phases 29 + 30 unit 1 shipped** — resolved at Phase 34 unit 4 (this commit). Q3 rewritten to confirm 3 pts/level adopted (Phase 29 `9f2e3f6` + `121aea8` + `db7c26f`); Q7 rewritten to point at the Phase 30 runtime path (`learnSkill` / `getAvailableSkills` / `meetsLearningRequirement` + `unlockedSkills` event payload); Q8 rewritten to confirm option (B) — deferred allocation via the Character tab — is the shipped shape. Impact 4 × Ease 7 / 10 = 2.8.

- [x] **[LOW] `docs/api.md` stops at Phase 24 — five phases of additions undocumented** — resolved at Phase 34 unit 3 (this commit). Character section gained a "Stat allocation (Phase 29)" bullet documenting `allocateStatPoint`, `STAT_POINTS_PER_LEVEL`, `Character.availableStatPoints`, and the `ALLOCATE_STAT_POINT` action. Skills section gained a "Runtime learning (Phase 30)" bullet for `learnSkill` / `getAvailableSkills` / `meetsLearningRequirement` and the `LEARN_SKILL` action. Events section's `EnginePayload` code block now lists `unlockedSkills?: string[]` with a paragraph explaining the level-up unlock surface. Impact 5 × Ease 7 / 10 = 3.5.

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
