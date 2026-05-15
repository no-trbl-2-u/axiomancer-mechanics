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
- [ ] Phase 29 — Stat allocation flow: add `availableStatPoints` field on `Character`, grant 3 points per level in `applyLevelUps`, ship an `allocateStatPoint` reducer + Character-tab UI per Spec 06 Q3 + Q8. Promoted via `/oversight` 2026-05-15 from a Spec 06 backfill finding.
- [ ] Phase 30 — Runtime skill learning: implement `learnSkill(character, skillId)` reducer that respects each skill's `learningRequirement`, surface unlocks during level-up + a "learn skill" action on the Character tab per Spec 06 Q7. Promoted via `/oversight` 2026-05-15 from a Spec 06 backfill finding.

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

---

## Carry-overs / known gaps

- ESLint is broken (Phase 13 addresses this).
- `store.ts` has no `moveToNode` / `processNode` actions yet (Phase 09).
- No `gameReducer` dispatch exists yet (Phase 09).

## Phase log (commit hashes)

(Pre-loop history — see `git log --oneline` for full commit trail.)
