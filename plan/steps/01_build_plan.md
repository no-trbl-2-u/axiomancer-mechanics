# 01 — Build plan

> Style guardrails for every phase below. Always ship unit tests
> alongside code — never "add tests later". Every implementation
> lands with at least one hermetic e2e test (`*.engine.test.ts`).
> One commit per logical unit of work; only when
> `npm run type-check` and `npm test` are green for that increment.
> CLI files contain UI only — logic goes in resolver/reducer modules.

## Status (at-a-glance)

`/march`, `/ship-a-phase`, and (transitively) `/loop` read this
block to find the next phase. Format: `[ ]` pending → `[x]`
shipped (with commit hash).

**Already shipped (pre-loop, prior history):**
- [x] Spec 01 — Effects engine: DoTs, stat mods, action restrictions (pre-loop)
- [x] Spec 02 — Combat round resolver (`resolveCombatRound`) (pre-loop)
- [x] Spec 03 — Tier 2/3 effect procs (Stance × action tables) (pre-loop)
- [x] Spec 04 — Skills engine (types + engine, no content) (pre-loop)
- [x] Spec 04b — Skills library: 12 early-game skills + hermetic e2e (pre-loop)
- [x] Spec 05 — Equipment engine (types + engine, no content) (pre-loop)
- [x] Spec 05b — Equipment library: 50 pieces + 12 consumables (pre-loop)
- [x] Spec 05c — Item rarity (pre-loop)
- [x] Spec 05d — Modifier catalogue (pre-loop)
- [x] Spec 05e — Set items (pre-loop)
- [x] Spec 06 — Character progression (XP, levelling, skill learning) (pre-loop)
- [x] Spec 07 — Enemy content and AI (pre-loop)
- [x] Spec 08 — World content and hazards (pre-loop)

**Next up (autonomous loop's queue):**
- [x] Phase 09 — Game loop orchestration (`gameReducer`, full store wiring, `game.cli.ts`) (e6ce034)
- [x] Phase 10 — Moral/difficulty meter (choice tracking, alignment, difficulty scaling) (a6085c4)
- [x] Phase 11 — RNG seeding and test harness (seeded RNG, deterministic replays, full test harness) (a6b33f0)
- [x] Phase 12 — Package architecture and events (event surface, React Native adapter docs, clean barrel) (251dda9)
- [x] Phase 13 — ESLint fix (repair `eslint.config.mts`, add `@typescript-eslint` plugin correctly) (4f58f66)
- [x] Phase 14 — Story content foundation (NPC types + first named NPC with moral dialogue) (846f968)
- [x] Phase 15 — Split `combat.resolver.ts` into per-phase helpers (round-start, action-restriction, advantage, stance-effects, scenario, round-end) (48c56be)
- [x] Phase 16 — Migrate sibling tests into `src/<Module>/e2e/` for layout consistency (bb369c1)
- [x] Phase 17 — Unify CLI surface (drop `combat` + `character` + `auto:combat` scripts; single `npm run game` entry) (7595c2e)
- [x] Phase 18 — Preset character roster (curated progression tiers selectable at boot) (9ab6a0b)
- [x] Phase 19 — Enemy spawn picker (debug tab to spawn arbitrary enemies into combat) (0260ef0)
- [x] Phase 20 — Scripted / agent-driven CLI mode (`--script`, `--json-events`, stdin agent control) (6de9649)
- [x] Phase 21 — Phase 12 API cleanup (Node adapter leak, partial typed events, unused creators, redundant casts) (a3f1693)
- [x] Phase 22 — Story content authoring infrastructure (story-spec / world-spec / character-spec skills + content/ templates) [low priority] (7b540e5)
- [x] Phase 23 — MapEvents engine + node discovery (resolveMapEvent dispatcher, 8 event types, fog-of-war unlock, one-shot consumption; drops `npc`/`shop` kinds) (fd01029)
- [x] Phase 24 — MapEvents content (≥1 node per event type, migrate fishing-village + northern-forest into new shape) (4b12e27)
- [x] Phase 25 — Remove legacy `processNode` + `MapEvent`/`MapEventType` (rewrite the ~10 `processNode` cases in `src/World/e2e/world.engine.test.ts` against `resolveMapEvent`; drop the legacy exports + `nodeEvents` field) (7002642)
- [x] Phase 26 — Validation CLI + agent-graded automation harness (skills-in-combat / next-map-node / character-sheet / state-log writer; scripted walkthroughs; agent-graded e2e harness that takes a test goal + a state log and decides pass/fail) (d3c8cc5)
- [x] Phase 27 — Expand walkthrough coverage: scripted walkthroughs + goal companions for the 4 remaining named Phase 26 surfaces (skills-in-combat, save/load, item use, debug-spawn / boss encounter). All four units shipped at 5e5a5b0, 4d11739, 1b5c717, 24885d7; units 2 and 3 built small inline CLI primitives (Save/Load tabs + `item` action) per oversight 2026-05-15.
- [x] Phase 28 — Backfill `> Your answer:` lines in shipped specs (specs 01, 06, 10, 12 — 19 answers across 4 files). Pure docs work; ground-truth lives in the shipped code. All four units shipped (a1d59fa, 75f250b, 4593b76, bb0d895); `grep -c "> Your answer:$" specs/{01,06,10,12}-*.md` returns 0 across all four files.
- [x] Phase 29 — Stat allocation flow: add `availableStatPoints` field on `Character`, grant 3 points per level in `applyLevelUps`, ship an `allocateStatPoint` reducer + Character-tab UI per Spec 06 Q3 + Q8. All three units shipped (9f2e3f6, 121aea8, db7c26f); 430/430 tests green; walkthrough at `automation/scripts/walkthroughs/stat-allocation.{json,goal.md}` exercises the full flow.
- [x] Phase 30 — Runtime skill learning: `learnSkill(character, skillId)` reducer respecting `learningRequirement`, level-up unlock surfacing, Character-tab Learn prompt. All three units shipped (1e14a8e engine helpers, 6097001 level-up event payload, 32dc22c CLI prompt + LEARN_SKILL action + walkthrough); 453/453 tests green. Closes Spec 06 Q7.
- [x] Phase 31 — CLI mapTab progression fix: extend `resolveMapEvent` so post-resolve adjacents enter `availableNodes`, not just `discoveredNodes`. Both units shipped (711b49e engine fix + 4 tests, 3ee7b81 save-load walkthrough rewrite that exercises fv-1 → fv-2 → fv-3 with a rollback). Drains the HIGH critique finding from pass 7.
- [x] Phase 32 — `critStyle` auto-selection (`double` vs `pierce`): shipped at e456322. `selectCritDamage` picks the higher path (ties → `'double'`); `scenario.ts` now fires `isCriticalHit(rawAttackRoll)` and emits `isCritical` + `critStyle` on `damage-applied`. 457/457 tests; closes Knowledge-Gaps Q3.
- [x] Phase 33 — Tier 2 / Tier 3 skill content polish: explicit `learningRequirement` on all 6 T2/T3 skills (T2 `{level:5}`, T3 `{level:10}`); balance audit confirmed costs are intentionally varied to gate per skill weight; flavour text was already polished in Spec 04b. docs/skills.md gained a Resonance Pairs progression model table + a Runtime Skill Learning subsection. Shipped at 9349bce (T2) + 011ac2d (T3 + docs); 457/457 tests.
- [x] Phase 34 — Docs sweep: drained 9 critique findings, commit-per-unit. Original 7 doc-staleness scope plus 2 LOWs from critique pass 10 folded in via `/oversight` 2026-05-15. All 9 units shipped: gameloop GameEvent surface (e9d267d), docs/character.md Pending + Stat allocation (1d6cc13), docs/api.md Phase 29 + 30 surface (18f0038), Spec 06 Q3/Q7/Q8 answers refreshed (61a8b94), Spec 06 + 12 acceptance checklists ticked (d4e5542), walkthroughs/README index (e07f753), docs/items.md module index (2b00dc6), docs/world.md unlockAdjacent (c89a45e), Phase 32 critStyle resolver-path integration test (4515f9b). 459/459 tests.
- [x] Phase 35 — `Character.id` field: stable `id: string` on `Character`, auto-generated by `createCharacter` via a `char-<base36>` id drawn from `getRng()` when not supplied (RN-bundler-safe — no Node `crypto` import). Both units shipped: cb47a38 engine field + auto-gen (decision: used `getRng()` rather than `crypto.randomUUID()` because the core barrel must stay React-Native-safe per Phase 12); 5b9d13e hermetic e2e (4 cases pinning non-empty id, explicit-override respect, no-collision across back-to-back creates, JSON round-trip) + docs/character.md Pending drained + Knowledge-Gaps Q12 marked resolved. ActiveEffect.sourceId audit: the only in-repo setter is equipment.reducer.ts using the item.id correctly; no player-applied-effect sites currently set sourceId, so wiring those is a future task. 463/463 tests (+4 new).
- [x] Phase 36 — Friendship victory reward (XP + outcome tag): shipped at 276eecb. `CombatEndReport.outcome` union gained `'friendship'`; `store.endCombat()` detects `friendshipCounter >= FRIENDSHIP_COUNTER_MAX` and grants `floor(totalEncounterXp * 0.5)` XP + full loot table. CLI transcript distinguishes "befriended" / "victory" / "defeat" / "fled" (was echoing the raw outcome string); level-up cascade now fires on both victory AND friendship. Hermetic e2e (15th case in `combat.resolver.test.ts`) drives a real Encounter through `startCombat → all-defend rounds → endCombat` and asserts the outcome string, the half-XP grant, and the player.experience delta. The reducer side has been friendship-aware since Phase 10; this phase closed the store-side mismatch. Knowledge-Gaps Q5 mechanics-resolved (narrative-content half remains open as content-author work); Spec 06 Q2 follow-up resolved. 469/469 tests (+1 new).
- [x] Phase 37 — Shop economy via `village` MapEventKind: shipped across units 1-5 (commits ea9c23a, f9c18f0, 549de75, bcc39a7, 729e705). New `src/Items/shop.reducer.ts` exports pure `buyItem(character, item, price)` + `sellItem(character, itemId, price)` (Character → Character; bad input = no-op, never throws). `ShopWare` / `ShopInventory` types in `src/Items/shop.types.ts`, all four re-exported through the public barrel. `VillagePayload` + resolved-event variant gain `shop?: ShopInventory`; `resolveVillage` forwards. Two authored shops draw from `consumableLibrary`: `fv-3` Fishing Village Stalls (healing-potion 25 / minor-healing-potion 12 / antidote 30 / heart-draught 22) and `nf-8` Glen Market (minor-healing-potion 12 / philosopher-tea 35 / void-essence 40 / clarity-serum 28). Hermetic coverage: 7 unit cases in `src/Items/shop.reducer.test.ts` (buy / sell / negative price / duplicate-only-one), 4 e2e cases in `src/Items/e2e/shop.engine.test.ts` driven through `resolveMapEvent` (village surfaces shop / buy-sell round-trip / insufficient-funds / deep-clone catalogue invariant), and a content-drift assertion in `src/World/MapEvents/e2e/content.engine.test.ts`. CLI Map tab opens a `shopLoop` on village resolve with non-empty wares (logic in reducers; CLI quotes `floor(ware.price/2)` as the default sell heuristic). 484/484 tests (+12 new from 472). `docs/items.md` Pending shop block replaced with the live "Shop economy (Phase 37)" section + tables; `docs/api.md` Items section updated.
- [x] Phase 38 — `ActiveEffect.sourceId` wiring for player-applied effects: shipped across units 1-3 (commits f4abf98, 0aa841e, 2647a26). `ApplyEffectOptions` gains `sourceId?: string`; `applyEffect` writes it on new effects and uses last-writer-wins on stacking. Six combat / skill applyEffect call sites threaded: three in `src/Skills/skill.engine.ts` set `player.id` (rebound, main application, buff-convert); three in `src/Combat/combat-effects.ts` set `actor.id` (proc primary, proc rebound, fumble — `applyFumbleOutcome` signature extended with optional `actorId?` passed by `scenario.ts:614`). Environmental hazard in `src/World/MapEvents/handlers.ts` deliberately leaves sourceId undefined with an inline comment. `src/Combat/resist.ts` already conformant via `{ ...activeEffect }` spreads — not touched. Hermetic coverage: 5 unit cases in `src/Effects/e2e/effects.engine.test.ts` (fresh / preserve / override on intensity / preserve on intensity / override on duration), 5 e2e cases in `src/Effects/e2e/source-id.engine.test.ts` (player→enemy debuff, player→self buff, enemy proc→player via `applyProcOutcome`, JSON round-trip, equipment passive regression). `docs/effects.md` gains "Attribution — sourceId (Phase 38)" subsection with the source-per-surface table + stacking policy. Knowledge-Gaps Q12 fully closed. 494/494 tests (+10 new). Promoted via `/oversight` 2026-05-16.
- [x] Phase 39 — Agent-friendly hermetic e2e report: shipped at 602da33. Custom Vitest reporter `automation/agent-vitest-reporter.mjs` emits `automation/last-verify-report.json` (rollup + per-file + per-test with durations, failure `{message, diff, actual, expected, location}`, slowest 5) and a `## Verify summary` … `## End summary` markdown block on stdout. New additive `npm run verify:agent` script; default `verify` untouched. Hermetic e2e at `src/test-utils/e2e/agent-vitest-reporter.engine.test.ts` drives the reporter with synthetic Vitest events (golden 2-file/3-test path, stackless-error case, empty run). Decisions: `.mjs` over `.ts` to match `agent-e2e.mjs`; slowest-5 picked as first call-out heuristic over "added since last report" (no prior-run diff plumbing needed); failure message picks `errors[0]` since later entries are cascade noise. 472/472 tests (+3 new). Schema + decisions in `plan/phases/phase_39_agent_verify_report.md`.
- [x] Phase 40 — Prior-run diff in agent verify report: shipped at 87bab8c. `automation/agent-vitest-reporter.mjs` gained two new JSON fields and one markdown section. Top-level `failures: [{file, name, message, location}]` flat list (absorbed the bundled AUDIT MED 5.4 row). `rollup.diff: { addedTests, removedTests, flippedToFail, flippedToPass, durationDeltaSlowest5 } | null` compared against the prior `automation/last-verify-report.json` on disk; sequence in `onTestRunEnd` is build → read prior → compute diff → write new. Tests keyed by `${file}::${name}`; duration deltas ranked by absolute `|currMs - prevMs|`. Markdown gains a `### Changes since last run` section (only when diff has content) with five nested `####` subsections matching the diff arrays. Degrades gracefully: missing prior file → silent `diff: null`; parse failure or shape mismatch → one stderr warning line prefixed `[agent-vitest-reporter]`. Hermetic coverage: 4 new e2e cases in `src/test-utils/e2e/agent-vitest-reporter.engine.test.ts` (failures[] populated + empty; diff against fabricated prior covers add/remove/flip/delta + markdown render; no-prior-file silent; incompatible-schema warns once with "shape mismatch"). The existing empty-run test was tightened to assert the new shape. 498/498 tests (+4 net). `docs/testing.md` Agent-friendly subsection lists both new fields + the markdown delimiter convention; `plan/phases/phase_39_agent_verify_report.md` Follow-ups marks the prior-run-diff item shipped; AUDIT MED 5.4 row moved to Done. Smoke `npm run verify:agent` against the live suite correctly identified the 26 tests added since the prior on-disk report. Promoted via `/oversight` 2026-05-16.
- [x] Phase 41 — Specs + Knowledge-Gaps acceptance sweep: shipped across units 1-4 (commits b5c4d0b, 3b1fd88, 518b5dd, 74e7389). Unit 1 ticked all 10 Spec 04 acceptance boxes with shipping references (engine shape pre-loop; combat CLI Skills surface cited via Phase 09 `e6ce034` + Phase 17 `7595c2e` + Phase 26 `d3c8cc5`; docs/skills.md update via Phase 33 `011ac2d`). Unit 2 ticked all 4 Spec 10 boxes (moralMeter on GameState via Phase 10 `a6085c4`; save/load round-trip via Phase 11 `a6b33f0`; `shiftMoralMeter` reducer pre-loop; `docs/morality.md` cross-linked from Phase 36 / `7306111`). Unit 3 ticked all 11 Spec 23 boxes + added a 12th for the Phase 37 shop extension, and extended the two pre-Phase-37 `village` type sketches (`:95`, `:138`) with `shop?: ShopInventory`; drained the critique-15 LOW Spec 23 row. Unit 4 retired stale Knowledge-Gaps Qs 15 / 17 / 18 / 19 / 20 with the same "Resolved at <spec>" treatment Q5 / Q12 already had — Q13 / Q14 / Q16 stay open as the surviving combat-tuning trio. 502/502 tests unchanged; pure docs. Promoted via `/oversight` 2026-05-16.
- [x] Phase 43 — Alignment-shifting authoring sweep on MapEvent + dialogue content: shipped across units 1-3 (commits 764de7f, fb7a474, this commit). Unit 1 wires `alignmentDelta?: Partial<PhilosophicalAlignment>` onto both authoring surfaces — `DialogueChoice.effect.alignmentDelta` + `MapEventPoolEntry.alignmentDelta` — and threads it through `applyDialogueChoice` (with `effects.philosophicalShift` populated for non-zero axes) and `resolveMapEvent` (applied AFTER the handler runs, BEFORE consume/reveal). Each axis clamps to `[-100, +100]` via the Phase 42 `applyAlignmentDelta` helper. Five hermetic cases cover the wiring (partial shift, no-delta no-op, clamp, map-event apply, map-event no-op). Unit 2 authors first-pass deltas across 5 dialogue choices in Old Marrow + Coastal Beggar trees and 6 map-event pool entries (fv-1 / fv-8 / fv-9 / fv-10 / nf-4 / nf-10) — all inside the `±1..±5` band moralMeter uses; cells follow the Phase 42 27-cell map (e.g. "Take half" pulls Jean Valjean / Dorothy Day, "Pay double" pulls Underground Man, the nf-10 cave-mouth pulls Lovecraft). Two content-drift cases pin the SIGN of the authored axes on the two marquee Old Marrow choices (magnitudes deliberately unasserted — they're authoring-balance work). Unit 3 adds a full-path `gameReducer` case (APPLY_DIALOGUE on the live authored Old Marrow tree, asserts the cell moves on all three axes), ships `docs/philosophy.md` "Authoring deltas" subsection (both surfaces + magnitude band table + Phase 43 first-pass summary), and ticks this row. 531/531 → 532/532 tests (+8 net from 524 at Phase 42 close). Closes Phase 42 Follow-ups #1.
- [ ] Phase 44 — Fallacies-as-spells / abilities (Phase 42 content payoff): promoted via `/oversight` 2026-05-16 (promote-multiple). Ship 6-8 marquee fallacies from the Phase 42 27-cell library as the first batch of philosophical skill + status-effect payloads. Each fallacy becomes either a Tier 3 skill (`src/Skills/skill.library.ts`) or a status effect (`src/Effects/effect.library.ts`) with a new `sourcedFromCell?: string` cross-link back to the originating `philosophicalAlignmentCell`. Only fallacies whose mechanics map cleanly to existing combat primitives ship in this phase; abstract ones (e.g. "Begging the Question") defer. Hermetic e2e drives one such skill through `resolveCombatRound` and one such effect through `applyEffect`. Update `docs/skills.md` + `docs/effects.md` with a "Philosophical fallacy payloads" subsection. Sequenced after Phase 43 so authored alignment deltas + new fallacy skills both contribute to philosophical depth in the same playtest. Score 7×5/10 = 3.5.
- [ ] Phase 45 — Enemies-by-alignment AI tuning: promoted via `/oversight` 2026-05-16 (promote-multiple Phase 42 follow-up sequence). Two units. Unit 1 — add optional `philosophicalAlignment?: PhilosophicalAlignment` to `Enemy`; backfill every authored enemy in `src/Enemy/enemy.library.ts` with a cell pin (Coastal Tyrant = `faith-pessimistic-transcendent`, Tidepool Crab = `mid-mid-individual`, etc.). Unit 2 — `decideEnemyAction` accepts an optional alignment-tuner that biases the basic-action choice by outlook bucket (Pessimistic → defend/friendship-stall, Optimistic → attack). Hermetic e2e pins the bias delta against `mockSequentialRng`. Update `docs/enemy.md`. Sequenced after Phase 44 so the player-side payload library exists before enemies draw from it. Score 5×6/10 = 3.0.
- [x] Phase 42 — Philosophical alignment engine (3-axis Logic/Outlook/Scope cube): shipped across units 1-3 (commits 05c4f42, f9df761, this commit). Unit 1 lands the `src/Philosophy/` module — types, engine helpers (`bucketAxis`, `getAlignmentCell`, `applyAlignmentDelta`, `defaultAlignment`), library scaffold, `AXIS_HIGH_THRESHOLD` / `AXIS_LOW_THRESHOLD` constants — plus the `GameState.philosophicalAlignment` field with `SHIFT_PHILOSOPHICAL_ALIGNMENT` action + store action mirroring `shiftMoralMeter`; bumps `GAME_STATE_VERSION` 4 → 5 with a `migrateV4toV5` that defaults legacy saves to `{0,0,0}`; all four `adapter.save` call sites in `store.ts` thread the new field through; 14 hermetic e2e cases (boundary table, clamp, partial-shift, cell lookup, reducer + store dispatch, JSON round-trip, v4→v5 migrator). Unit 2 replaces the placeholder library with all 27 cells from `PhilosAxiosDoc.pdf` (philosopher + literary character + 3 fallacies per cell, each fallacy carrying name + example + rationale verbatim from the PDF); cell ids follow `<epistemology>-<outlook>-<scope>` kebab-case; +7 hermetic cases (27-entry exhaustiveness, unique ids, every `(low|mid|high)^3` triple resolves, fallacy shape, PDF spot-checks for cells 1 / 12 / 27). Unit 3 surfaces the active cell on the CLI Character tab (label + philosopher + literary character + per-axis bucket+raw), ships `docs/philosophy.md` (axes, thresholds, full 27-cell table, orthogonality with `moralMeter`), and adds a Beta "Philosophy" group to `docs/api.md`. 523/523 tests; verify + lint + build + deploy:check clean. `moralMeter` stays alongside as an orthogonal compassion axis; alignment-shifting authoring on existing map events / dialogue + the fallacies-as-spells content pass remain follow-ups per the brief.

> **After phase 26:** the loop transitions to `/iterate` —
> spec gap filling, test coverage improvements, doc updates,
> and ongoing audits. `/march` makes that transition automatic.

> **Deploy gate note:** `npm run deploy:check` runs `npm pack --dry-run`.
> This requires `dist/` (from `npm run build`). Always run `verify` first.

---

## Per-phase scope

### Phase 09 — Game loop orchestration

Implement `gameReducer(state, action): GameState` as the single top-level
dispatch; switch `store.ts` to use it as primary. Ship `game.cli.ts` that
demonstrates the full loop (character creation → explore → combat → level
up → save → load). Full hermetic e2e transcript test. See
`specs/09-game-loop-orchestration.md` and `plan/phases/phase_09_game_loop_orchestration.md`.

### Phase 10 — Moral/difficulty meter

Track player choices across `GameAction` dispatches. A
`MoralDifficulty` score (or alignment tuple) floats based on merciful/
aggressive choices, dialogue picks, and quest resolutions. Ties into
`processNode` events and enemy AI aggression scaling. See
`specs/10-moral-difficulty-meter.md`.

### Phase 11 — RNG seeding and test harness

Seeded, resettable RNG singleton (`src/rng/`); expose in `src/index.ts`.
Deterministic replay harness that captures a game transcript and verifies
it replays identically from seed. Retrofit existing `test-utils/rng.ts`
stubs to use the seeded singleton. See `specs/11-rng-seeding-and-test-harness.md`.

### Phase 12 — Package architecture and events

Define the event surface (`GameEvent[]` or observable) for UI consumers.
Document the `PersistenceAdapter` interface for React Native `AsyncStorage`.
Audit and tighten `src/index.ts` barrel — remove leaky internals. Add
package.json `exports` map. See `specs/12-package-architecture-and-events.md`.

### Phase 13 — ESLint fix

Fix `eslint.config.mts` to correctly register `@typescript-eslint` plugin.
Make `npm run lint` green. Add `lint` back into the verify gate. Tracked as
a known broken item since project start.

### Phase 14 — Story content foundation

First named NPC with a moral dialogue tree. Implement `NPC` entity with
branching dialogue that affects the moral/difficulty meter. Tie into
`processNode` dialogue flow. See `specs/story/` for content direction.

### Phase 15 — Split combat.resolver.ts

Extract per-phase helpers (`resolveRoundStart`, `resolveActionRestriction`,
`resolveAdvantage`, `resolveStanceEffects`, `resolveScenario`,
`resolveRoundEnd`) into colocated files. `resolveCombatRound` becomes the
orchestrator that wires them and produces the `combatEvents` stream. Public
contract unchanged; existing e2e suite bracketing the change. Drains the
matching critique-pass-1 finding.

### Phase 16 — e2e layout migration

Migrate sibling `*.test.ts` files in `src/Effects/`, `src/Enemy/`,
`src/Utils/`, `src/World/`, `src/Character/`, and `src/NPCs/` into
`src/<Module>/e2e/<feature>.engine.test.ts` per `plan/bearings.md`. Update
imports; no logic changes. Drains the matching critique-pass-1 finding.

### Phase 17 — Unify CLI surface

Drop `npm run combat`, `npm run character`, and `npm run auto:combat`
scripts (and delete `automation/combat-test.py`,
`src/CLI/combat.cli.ts`, `src/CLI/character.cli.ts`). Single entry:
`npm run game`. Combat reachable through Map encounters and the new
"Spawn Encounter" debug tab landing in Phase 19. Character creation
flow folded into `game.cli.ts` boot.

### Phase 18 — Preset character roster

New module `src/Character/preset-roster.ts` exporting ≥4 curated
progression tiers (e.g. `fresh-L1`, `mid-L5`, `late-L10`, `endgame-L15`)
with calibrated level, XP, learned/equipped skills, and equipment loadout
that all resolve against the live libraries. CLI presents a roster picker
at boot. Hermetic e2e validates each preset is internally consistent
(referenced skill IDs and item IDs exist; XP matches level).

### Phase 19 — Enemy spawn picker

Add a "Spawn Encounter" debug tab to `game.cli.ts`: list enemies from
`enemy.library` grouped by difficulty tier, pick one, drop into combat
against the current preset character. Useful for targeting a specific
Stance × proc, scenario, or effect interaction during manual testing.
Hermetic e2e covers a spawn → round-resolve happy path.

### Phase 20 — Scripted / agent-driven CLI mode

`--script <path>` flag accepts a JSON plan `{ seed, preset, enemy,
actions[] }` for deterministic replay (leverages the Phase 11 seeded RNG).
`--json-events` flag streams structured `GameEvent` objects on stdout so
an external LLM agent can parse the transcript and react. stdin-mode:
accepts one-action-per-line JSON commands for live agent control.
Hermetic e2e covers a full agent-style scripted run end-to-end.

### Phase 21 — Phase 12 API cleanup

Drain the four critique-pass-2 findings against Phase 12's public surface so
the package API stabilizes in one pass: (1) remove `createNodeAdapter`
re-export from the core barrel; keep `PersistenceAdapter` interface there
for RN consumers and document the split in `docs/api.md`. (2) Extend the
typed event surface to cover `dialogue:applied`, `game:saved`, `game:loaded`
(payload type + creator + guard each), or rename `TypedGameEvent` to make
partial coverage explicit. (3) Either retrofit engine emit sites to route
through the seven `create*Event` helpers so engine payloads match the typed
shape, or downgrade them from Beta to "consumer convenience" in
`docs/api.md`. (4) Strip redundant `as Payload` casts from the seven
creators in `src/Game/events.utils.ts`. See `plan/CRITIQUE.md` Pending.

### Phase 22 — Story content authoring infrastructure

Three-skill authoring surface writing into the existing `content/` tree.
Extend `skills/story-spec.md` to be story-building-only (plot beats, arcs;
output `content/story/`). Add `skills/world-spec.md` for world / location /
faction work (output `content/locations/<location>/`). Add
`skills/character-spec.md` for character synopsis / voice / arc (output
`content/characters/`). Each skill supports **dual mode**: live socratic
Q&A in chat AND a structured spec form for offline answers. Drop templates
in `content/templates/{character,location,story}.md`. Dialogue authoring
stays inline in NPC TS modules (Old Marrow pattern). Low priority —
authoring infrastructure, no engine impact.

### Phase 23 — MapEvents engine + node discovery

New spec `specs/13-map-events.md`. Replace `processNode` with a
`resolveMapEvent(node, state)` dispatcher covering 8 event kinds:
**encounter, interaction, gathering, rest, village, cutscene, hazard,
loot-cache**. Migrate away from the old `npc` / `shop` kinds in
`src/World/process-node.ts` and `src/World/spec08.test.ts` (NPCs fold into
`interaction`; shops fold into `village`). Add **node discovery**: nodes
start blacked-out and become revealable only when adjacent to a completed
node; the event type is rolled from a weighted pool at unlock time, not
authored per-node — so the authoring surface is a per-region (or per-tag)
event-pool. All events are one-shot (consumed once resolved). Gathering
events write directly to inventory. Hermetic e2e covers
discover → unlock → roll → resolve → exhaustion across ≥3 event types.
Spec should also propose shrine / puzzle / monument as candidate additions.

### Phase 24 — MapEvents content

With Phase 23's engine landed, populate at least one node of each event
type and migrate the existing fishing-village and northern-forest world
content into the new MapEvent shape. Hermetic e2e walks a short
discovery → resolution chain end-to-end against the live content registry.

### Phase 25 — Legacy MapEvent surface removal

Phase 24 left `src/World/process-node.ts`, the `MapEvent` / `MapEventType`
types, the `nodeEvents` field on `MapDefinition`, and the `npc` / `shop`
event kinds in place for back-compat with the existing world e2e suite
(~10 cases in `src/World/e2e/world.engine.test.ts`). Phase 25 rewrites
those test cases against `resolveMapEvent` and removes the legacy
surface. Strips the corresponding exports from the world barrel and
`src/index.ts`. Mechanical but high-volume; the Phase 24 content already
provides the substitute behaviour.

### Phase 26 — Validation CLI + agent-graded automation harness

**Promoted via `/oversight` 2026-05-15 — most important pending phase.**

The CLI (`src/CLI/game.cli.ts`) is the engine's only end-to-end
validation path until the React Native UI ships. Today it covers a
minimum slice (pick a preset, walk maps, run a basic attack/defend
round). The user can't be sure anything else is fully implemented from
the CLI alone. Phase 26 expands the CLI to the full feature surface AND
reworks automation testing so each surface area has a scripted
walkthrough whose log is passed back to an agent for goal-graded
pass/fail.

Scope:

1. **CLI feature expansion:**
   - **Skills in combat:** combat tab adds a "Use skill" option that
     prompts for one of the equipped skills, validates affordability
     via `canUseSkill`, and routes through `resolveCombatRound` with
     `action: 'skill'`. Today combat is only attack/defend.
   - **"Next Map Node":** Map tab gains a one-keypress action that
     auto-picks the first reachable adjacent node and dispatches
     `PROCESS_NODE`. Makes MapEvent testing fast.
   - **Character sheet:** new tab displaying the player's full state —
     baseStats, derivedStats, nonCombatStats, currency, all 7
     equipment slots, inventory grouped by category, active effects,
     known + equipped skills, moralMeter, XP-to-next-level. Designed
     so equipping a piece or using a consumable can be observed in
     before/after view.
   - **State-log writer:** every CLI prompt that mutates state appends
     a JSON record (`{ tick, action, before, after, event? }`) to a
     per-session log file at `logs/cli-<timestamp>.jsonl`. Configurable
     via a new `--state-log <path>` flag.

2. **Automation testing rework:**
   - **Scripted walkthroughs:** one JSON script per CLI surface
     (`automation/scripts/walkthroughs/<surface>.json`) — skills,
     map events, character sheet, item use, debug spawn, save/load.
     Each script is the input sequence that exercises that surface
     end-to-end via the Phase 20 `--script` flag.
   - **Per-script test-goal companion:** `<surface>.goal.md` describing
     what success looks like in human terms.
   - **Agent-graded e2e harness:** new `automation/agent-e2e.mjs` that
     takes (a) a walkthrough script, (b) the goal file, runs the CLI
     with `--script + --json-events + --state-log`, captures the log,
     and pipes (goal, log) to an agent (Claude API) which returns a
     structured `pass | fail` decision with reasoning.

3. **Out of scope for the hermetic vitest suite:**
   The agent-grading layer needs a network call to the Claude API,
   so it lives outside the hermetic-e2e contract. Hermetic tests
   continue to drive `resolveCombatRound` / `resolveMapEvent` /
   `executeSkill` etc. directly. The Phase 26 walkthroughs +
   agent-grading sit as a deliberately non-hermetic validation layer
   on top.

The phase is large; expect ≥4-6 ticks to ship end-to-end. Likely commit
units: (1) skills-in-combat, (2) next-map-node, (3) character sheet,
(4) state-log writer, (5) walkthroughs + goal files, (6) agent-graded
harness.

### Phase 27 — Expand walkthrough coverage

**Promoted via `/oversight` 2026-05-15.**

Phase 26 shipped two walkthroughs (`character-sheet`, `map-events`) —
the two deterministic surfaces. The agent-graded harness, however,
is designed to tolerate variability in path length and outcome, so
the RNG-dependent surfaces can ship now and let the agent's
grading layer judge "did the goal happen at least once."

Scope: ship scripted walkthroughs + goal companions for the
remaining named Phase 26 surfaces:

1. **skills-in-combat** — pick wanderer, debug-spawn sandbag, body
   attack to generate tokens, then skill action. Goal: a `combat:round`
   event with a `SkillPhaseEvent` of kind `damage` lands at least once.
2. **save/load** — pick apprentice, walk one node, save, mutate state,
   load, verify the saved snapshot was restored. Goal: post-load
   state matches the save point.
3. **item use** — pick wanderer, debug-spawn sandbag, damage the
   player, use a consumable in combat (action: 'item'). Goal: an
   `item:used` event lands and player HP rose by the consumable's
   `healAmount`.
4. **debug spawn / boss encounter** — pick sage, debug-spawn
   coastal-tyrant, full combat to completion. Goal: a `combat:ended`
   event with outcome `victory` or `defeat` (either is a pass — the
   test verifies the loop closes, not that the player wins).

Likely commit units: one walkthrough + goal pair per unit (4 units
total). Each pair is small (~15 lines of JSON + ~30 lines of
markdown), so the whole phase should ship in ≤4 ticks.

The phase is mostly content-only. Two CLI surfaces were not exposed at
spec time and need small inline additions during their walkthrough unit:
unit 3 (item-use) added the `item` action to `chooseCombatAction` in
`src/CLI/game.cli.ts` (~20 LOC, shipped at 4d11739); unit 2 (save/load)
needs a Save and Load tab on `pickTab` plus the corresponding store
calls into the persistence adapter — confirmed via oversight 2026-05-15.
Goal files should follow the conventions established in
`automation/scripts/walkthroughs/character-sheet.goal.md`.

### Phase 28 — Backfill open-Q answers in shipped specs

**Promoted via `/oversight` 2026-05-15.**

`grep -c "> Your answer:$" specs/*.md` returns blanks in five shipped
specs — `01-effects-engine.md`, `06-character-progression.md` (9 blanks),
`10-moral-difficulty-meter.md`, `12-package-architecture-and-events.md`
(8), and the `00-` template (the template's blank stays — it's
intentional). Total of 19 answers to write across the four shipped
specs. The implementer made decisions during the build but never
backfilled them, leaving the spec a paper trail that lies by omission
about why each phase chose what it chose.

Scope: one commit per spec (4 commits). For each spec, walk the open
questions top-to-bottom. For each `> Your answer:` blank, read the
relevant shipped code in `src/<module>/` and write a 1-2 sentence
answer that captures the actual decision made. Don't hedge — the code
is ground-truth. The answers should let a future contributor reading
the spec see *why* each shipped phase chose what it chose.

The phase is pure docs work — no code edits, no test changes, no
verify-gate failures expected. Hermetic tests already cover the
behavior the answers describe.

Likely commit units (one per spec):
1. Spec 01 (effects engine) — answers grounded in `src/Effects/`.
2. Spec 06 (character progression) — answers grounded in
   `src/Character/character.engine.ts` + `xp.ts`.
3. Spec 10 (moral/difficulty meter) — answers grounded in
   `src/Game/moral.ts` / store wiring.
4. Spec 12 (package architecture + events) — answers grounded in
   `src/Game/events.types.ts` + the package barrels.

### Phase 29 — Stat allocation flow

**Promoted via `/oversight` 2026-05-15 from a Spec 06 backfill finding.**

Spec 06 Q3 and Q8 proposed stat-point allocation on level up: 3 points
per level, no cap until the level cap (none today per Spec 06 Q5),
deferred allocation via the Character tab. None of this shipped —
`Character` carries no `availableStatPoints` field, and `applyLevelUps`
in `src/Game/game.reducer.ts:81-95` only touches `level`, `maxHealth`,
`health`, and `experienceToNextLevel`. The build plan calls the
allocation a "Spec 06 follow-up that has not shipped"; this phase ships
it.

Scope:
1. **Type changes** — add `availableStatPoints: number` to
   `Character` in `src/Character/types.d.ts` (default 0; presets
   default to 0 since they ship pre-allocated). Add the constant
   `STAT_POINTS_PER_LEVEL = 3` to `src/Game/game-mechanics.constants.ts`.
2. **Reducer changes** — `applyLevelUps` grants
   `STAT_POINTS_PER_LEVEL` per level promotion; new `allocateStatPoint`
   reducer takes `(state, stat: 'heart'|'body'|'mind')`, decrements the
   pool, increments the chosen base stat, and re-derives
   `derivedStats` + `maxHealth` (HP rises by the new max delta, not a
   full refill — the level-up refill already happened).
3. **Store action** — add `allocateStatPoint(stat)` to `GameStore`.
4. **CLI surface** — extend the Character tab with an "Allocate stat
   points" prompt visible only when `availableStatPoints > 0`.
5. **Tests** — hermetic e2e for the multi-level cascade (Spec 06 Q9
   cascade still works), the level-1→level-2 grant, allocation
   decrement, and derivedStats re-derivation.

Likely commit units (3): (1) types + constants + applyLevelUps grant,
(2) allocateStatPoint reducer + store action + tests, (3) CLI Character
tab prompt + scripted walkthrough or hermetic UI test.

### Phase 30 — Runtime skill learning

**Promoted via `/oversight` 2026-05-15 from a Spec 06 backfill finding.**

Spec 06 Q7 left runtime skill learning unimplemented: skills are
populated only at character-creation time via the preset, and there is
no `learnSkill` function in `src/Character/` or `src/Skills/`. The
skill library does carry `learningRequirement` typing
(`src/Skills/types.d.ts:172`), so the gating shape is ready — only
the runtime path is missing. This phase ships it.

Scope:
1. **Engine** — add `getAvailableSkills(character)` selector that
   filters `skill.library` entries by their `learningRequirement`
   (level / stat / known-skills-prereq). Add a `learnSkill(character,
   skillId)` reducer that asserts the requirement, appends the id to
   `knownSkills`, and is a no-op when the skill is already known.
2. **Store action** — add `learnSkill(skillId)` to `GameStore`.
3. **Level-up hook** — when `applyLevelUps` promotes the level, the
   `LEVEL_UP` action emits `character:levelup` with a payload listing
   the newly-available skill ids (computed from
   `getAvailableSkills`). CLI surfaces a "you can now learn N skills"
   line.
4. **CLI surface** — extend the Character tab (or add a "Learn skill"
   prompt) that lets the player commit a learn against an eligible
   skill. Should respect Phase 29's deferred-allocation model — no
   modal blocking, the unlocks just sit until the player visits the
   tab.
5. **Tests** — hermetic e2e for the eligibility filter, the
   learn-once-only invariant, and the level-up unlock surfacing.

Likely commit units (3): (1) `getAvailableSkills` + `learnSkill`
reducer + tests, (2) level-up wiring + event payload, (3) CLI Learn
prompt + walkthrough.

Phase 30 depends on Phase 29 only for the Character-tab affordance
pattern. The reducer work is independent.

### Phase 31 — CLI mapTab progression fix

**Promoted via `/oversight` 2026-05-15 from CRITIQUE pass-7 HIGH.**

Surfaced live during the Phase 27 unit-2 save/load dry-run: after
moving from `fv-1` to `fv-2`, the apprentice has no reachable nodes
because `mapTab` in `src/CLI/game.cli.ts:100` filters by
`state.world.currentMap.availableNodes`, which Phase 23's
`resolveMapEvent` never updates — it only writes
`discoveredNodes` via `revealAdjacent`. The legacy
`completeCurrentNode` reducer (still present in
`src/World/world.reducer.ts:78-99`) did update both. Result: any
walkthrough or playtest is stuck at the first map event.

Scope:
1. **Engine fix** — in `src/World/MapEvents/resolve-map-event.ts`,
   after `markNodeConsumed`, also add the just-resolved node's
   `connectedNodes` to `availableNodes` (or call the existing
   `completeCurrentNode` helper post-resolve). Drop nodes from
   `lockedNodes` to mirror the legacy path.
2. **Hermetic e2e** — `src/World/MapEvents/e2e/` (or extend
   `world.engine.test.ts`) walks fv-1 → fv-2 → fv-3 → fv-4 and
   asserts that each transition's target is in
   `state.world.currentMap.availableNodes`.
3. **Walkthrough update** — extend
   `automation/scripts/walkthroughs/save-load.json` to include a
   second move (now that fv-3 is reachable) and document the
   reverted goal in `save-load.goal.md`'s diagnostic block.

Interleave ordering: ship after Phase 30 unit 2, before Phase 30
unit 3 — keeps Phase 30 unit 3's walkthrough writable on a CLI that
can traverse. Confirmed via oversight 2026-05-15.

Likely commit units (2): (1) engine fix + hermetic test, (2)
walkthrough revision.

### Phase 32 — `critStyle` auto-selection (`double` vs `pierce`)

**Promoted via `/oversight` 2026-05-15 from a PHASE_CANDIDATES candidate.**

`Knowledge-Gaps.md` Q3: `CritStyle` exists as a type but the
"whichever-deals-more" auto-selection is not implemented. Live
combat treats every crit as the default. The mechanic is invisible
today.

Scope: at crit time in `src/Combat/phases/scenario.ts`, compute both
`double` and `pierce` damage paths and pick the higher. Add a
hermetic test that pins the choice for a stat-set where the two
diverge. Update `docs/combat.md` and `docs/effects/README.md` to
mark this as LIVE (currently flagged "genuinely open" in the
effects README).

Likely commit units (1): the engine change + tests + docs ride in
one commit.

### Phase 33 — Tier 2 / Tier 3 skill content polish

**Promoted via `/oversight` 2026-05-15 from a PHASE_CANDIDATES candidate.**

`spec.md` 6-month horizon — "Additional skill tiers (Tier 2+)". The
library at `src/Skills/skill.library.ts` already ships 3 tier-2 + 3
tier-3 entries, but they're placeholder numbers; the Resonance Pairs
design in `braindump/BRAINDUMP.md` ("Decided / leaning: Option C")
never got wired into the actual skill payloads. The 12 skills exist;
the *flavour* and *balance* of the higher tiers does not.

Scope: balance pass over the 6 tier-2 + tier-3 skills; refine
resource costs to match the Resonance Pairs vision (Tier 2 =
mixed-stance gates, Tier 3 = mind + philosophical-token gates).
Author 3-4 line flavour text per skill. Update `docs/skills.md` to
document the resource progression model.

Likely commit units (2): (1) Tier 2 polish (3 skills + tests), (2)
Tier 3 polish (3 skills + tests + docs update).

### Phase 42 — Philosophical alignment engine

**Promoted via `/oversight` 2026-05-16 — derived from the
`PhilosAxiosDoc.pdf` committed at the repo root (12-page document
laying out a 3×3×3 alignment cube: epistemology × outlook × scope,
27 cells total, each carrying a representative philosopher, literary
character, and three signature logical fallacies).**

Ships the engine primitives + full content registry for a multi-axis
alignment system. Each axis is an integer in `[-100, +100]` (mirrors
the `moralMeter` shape from Phase 10); the current `(low|mid|high)`
triple at thresholds ±34 indexes the 27-cell `philosophicalAlignment.library`.
Save migration v4→v5 defaults the new field. CLI Character tab
renders the current cell + philosopher + literary character. Three
fallacies per cell ship as data but are not yet wired to gameplay —
they're reserved as content fuel for a follow-up
skill/effect/spell phase per the PDF's closing note.

`moralMeter` is NOT retired: Spec 10 Q4 keeps the meter narrative-
only, and the PDF axes don't map onto the compassion ↔ ruthlessness
dimension `moralMeter` already tracks. Long-term unification is an
explicit Follow-up.

Likely commit units (3):
1. Engine primitives — types + reducer + selector + library scaffold
   + action wiring + save migration + hermetic e2e.
2. 27-cell content registry — `alignment.library.ts` authored
   verbatim from the PDF + exhaustiveness + PDF-spot-check tests.
3. CLI surface + docs — Character-tab render block + `docs/philosophy.md`
   + `docs/api.md` Philosophy group + plan tick.

See `plan/phases/phase_42_philosophical_alignment.md` for the full
brief.

### Phase 34 — Docs sweep

**Promoted via `/oversight` 2026-05-15 to drain the docs-staleness
backlog accumulated across critique passes 7-9.**

Critique left 7 doc-quality findings open after pass 9. The user opted
to drain them as one bundled phase (commit-per-finding) rather than
rely on `/iterate` picking through them one tick at a time. Phase 34
is pure docs work — no `src/` edits, no test changes, no verify-gate
failures expected.

Likely commit units (7):
1. `docs/gameloop.md` GameEvent surface rewrite: replace
   `payload: unknown` with the Phase-21 `EnginePayload` shape;
   document `TypedGameEvent<T>` aliases + `is*Event` guards; note
   Phase 30 unit 2's `unlockedSkills?` extension. (critique pass 9, MED)
2. `docs/character.md` Pending section rewrite: stop claiming
   "no `availableStatPoints` state field is needed" — Phase 29 added
   exactly that field. Document the shipped allocation surface.
   (critique pass 8, MED)
3. `docs/api.md` additions for Phases 25-30: `allocateStatPoint`,
   `STAT_POINTS_PER_LEVEL`, `availableStatPoints` (Phase 29);
   `getAvailableSkills`, `learnSkill`, `meetsLearningRequirement`
   (Phase 30 unit 1); `EnginePayload.unlockedSkills` (Phase 30
   unit 2). (critique pass 9, LOW)
4. Spec 06 backfill answer refresh: Q3 / Q7 / Q8 still say
   "deferred — not yet implemented" while Phases 29 + 30 unit 1
   shipped the work. Update each to "shipped at <hash>". (critique
   pass 8, LOW)
5. Spec 06 + Spec 12 acceptance checklists: tick the now-shipped
   boxes (Spec 06 boxes 1 + 4; Spec 12 box 1). (critique pass 8, LOW)
6. `automation/scripts/walkthroughs/README.md`: one-page index of
   the 7 walkthroughs — script, surface under test, preset, enemy,
   required flags, exit expectation. (critique pass 9, LOW)
7. `docs/items.md`: create as a short module index — one paragraph
   per item kind (Consumable / Material / QuestItem / Equipment),
   table of public exports keyed to `docs/equipment.md`. (critique
   pass 7, LOW)

Phase 34 ships after Phase 33. After the phase closes, each shipped
unit moves its corresponding critique row Pending → Done.

---

## Carry-overs / known gaps

- ESLint is broken (Phase 13 addresses this).
- `store.ts` has no `moveToNode` / `processNode` actions yet (Phase 09).
- No `gameReducer` dispatch exists yet (Phase 09).

## Phase log (commit hashes)

(Pre-loop history — see `git log --oneline` for full commit trail.)
