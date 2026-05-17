# PHASE_CANDIDATES.md

> Proposed new phases from `/expand`. Reviewed and promoted by
> `/oversight`. Format: `## Pending` → `/oversight` moves to
> `## Promoted` or `## Rejected`.

<!-- Metadata (updated by /expand after each pass):
> Last pass: 2026-05-16 at commit 83b5ff7
> Pass count: 7
-->

---

## Pending

### Candidate: Alignment-gated content (`requires.alignment` on dialogue + skill / effect learning)
- signal: Phase 42 brief Follow-ups names "Alignment-gated skills / effects / endings" explicitly. Phase 42-45 shipped the cube + payloads + enemy pins; nothing gates *content access* on alignment yet. Today every dialogue choice + skill is reachable regardless of cell. The natural next phase locks specific content behind cell requirements — same shape as the existing `DialogueChoice.requires.flag` and `SkillLearningRequirement.level` gates. Without this, a player at `faith-pessimistic-transcendent` (Grand Inquisitor cell) and one at `logic-optimistic-individual` (Nietzsche cell) see the same content menu, which mutes the cube's narrative weight.
- scope: Three units. Unit 1 — extend `DialogueChoice.requires` with `requiresAlignment?: { axis: 'epistemology' | 'outlook' | 'scope'; op: 'gte' | 'lte'; value: number }` (or a Partial range form); `visibleChoices` filters by the player's `philosophicalAlignment`. Unit 2 — extend `SkillLearningRequirement` with the same shape; `meetsLearningRequirement` checks it before allowing `learnSkill`. Unit 3 — author 2-3 alignment-gated dialogue choices on Old Marrow + Coastal Beggar (e.g. Old Marrow opens a "you remind me of someone who broke" branch when player is `outlook < -34`); author 1-2 alignment-gated Tier 3 skills (e.g. `appeal-to-fear` only learnable when player has `scope > 33`). Hermetic e2e drives each gate path. Update `docs/philosophy.md` "Authoring gates" subsection.
- unblocks: Makes the cube's mechanical reach asymmetric — different alignments unlock different content. Closes the Phase 42 Follow-up. Sets the pattern for future alignment-gated endings (the longest-arc Follow-up).
- blocked-by: Phases 42-45 all shipped. No code-level prerequisites.
- score: 6 × 5 / 10 = 3.0 (high value; medium effort because of the three authoring units + the dual-path requires-shape on both DialogueChoice and Skill).
- recommended-slot: First post-Phase-45 phase. Closes the "alignment is observable / payloadable / enemy-side / gates" four-corner triangle the system has been heading toward.

### Candidate: Knowledge-Gaps acceptance sweep (mirror Phase 41's spec-sweep pattern)
- signal: `Knowledge-Gaps.md` carries 25 numbered questions. After Phase 41's Q5 / Q12 / Q15 / Q17 / Q18 / Q19 / Q20 cleanup, the file still has ~14 entries that are EITHER (a) genuinely open combat-tuning questions deliberately deferred (Q1, Q2, Q4, Q6) or (b) resolved by shipped phases but never marked (Q8 / Q9 / Q10 effect runtime — partially shipped at Spec 01; Q11 world-tick — `processWorldEffectTick` exists; Q13 XP formula — shipped pre-loop as linear; Q14 stat allocation cap — Phase 29 shipped 3/level with no cap; Q16 skill slots — Spec 04 shipped fixed equip count; Q22 Map vs MapState — Phase 23/24 settled this; Q23-Q25 RN consumption + Zustand placement — Phase 12+21 resolved). A reader landing on Knowledge-Gaps.md can't tell open from resolved without grepping each question against the spec / build-plan trail. Same drift Phase 41 unit 4 drained for Q15/Q17/Q18/Q19/Q20.
- scope: One pure-docs phase, one commit per question cluster (Phase 41 used 4 commit units; this one should land in 3-4). Walk every numbered question top-to-bottom, classify into (1) genuinely open + deliberately deferred (Q1/Q2/Q4/Q6 — combat-tuning), (2) resolved-not-marked (most of Q8-Q25), (3) genuinely open + actionable (Q14 cap, Q16 max slots — flag for /oversight). For each (2) question, write "**Resolved at <spec / phase> (<hash>).**" with the shipping reference. For (3), file as iterate rows in AUDIT.md.
- unblocks: Knowledge-Gaps.md becomes navigable again — open questions stand out from resolved noise. Future critique passes have a clean signal-floor; /oversight briefings cite open KG count accurately.
- blocked-by: None. Pure documentation work; no engine touch.
- score: 4 × 8 / 10 = 3.2 (medium impact — pure paperwork — but high ease because every spec/phase reference already exists).
- recommended-slot: After the alignment-gated content candidate above. Pairs naturally as a docs-sweep tick that drains accumulated audit-honesty debt.

### Candidate: Effect runtime — apply `statModifiers` + intensity scaling to derived stats (KG Q8 / Q9)
- signal: `Knowledge-Gaps.md` Q8 says "the combat math never aggregates `statModifiers` onto the character's stats" and Q9 asks whether `statModifiers` should scale with intensity (today only `rollModifierPerIntensity` does). The effects JSON authors `statModifiers` payloads on 39 buffs + 46 debuffs (`grep -c statModifiers src/Effects/buffs.library.json` returns 36, debuffs ~30+), but the runtime never sums those modifiers onto `Character.derivedStats` outside of the existing `rollModifier` / `defenseModifier` paths. The Phase 44 fallacy effects (`debuff_no_true_scotsman` — `physicalDefense -2`) sit in the same gap: the field is authored, but combat math doesn't currently read it. Audit-pass-honesty-wise the effects library is bigger than the engine's actual coverage.
- scope: Two units. Unit 1 — extend `getEffectiveStats(character)` (or add it if missing) to fold every active effect's `statModifiers[]` into derived stats, scaled by intensity if `intensityScalesStatModifiers?: boolean` is set on the Effect (per Q9). Touch every site that reads `derivedStats` to call the new helper instead of the raw field. Unit 2 — hermetic e2e covers: a buff that bumps `physicalAttack` by +2 raises the attack roll by 2 in combat; a debuff that drops `physicalDefense` increases damage taken; intensity-scaled modifiers scale correctly. Update `docs/effects.md` Payload Field Reference. Closes KG Q8 + Q9 fully.
- unblocks: The 36+30 `statModifiers`-bearing effects in the library actually do what their payloads claim. Phase 44 `debuff_no_true_scotsman` becomes mechanically real. Future content authors can trust the payload field. Effects library shrinks the "authored but inert" surface.
- blocked-by: None. Phases 42-45 are independent; this is engine-side coverage of authored content.
- score: 6 × 5 / 10 = 3.0 (high impact — closes two long-standing KG questions and activates a lot of authored content; medium effort because the threading touches every derived-stat read site).
- recommended-slot: After alignment-gated content + KG sweep. Combat-tuning is naturally bundled, and this is the largest tuning gap with no on-disk effort to identify it.

### Candidate: Agent verify reporter polish bundle (was named "Phase 41" pre-promotion; renamed at oversight 2026-05-16 after Phase 41 went to the acceptance sweep)
- signal: After Phase 40 closed the MED 5.4 row (commit `87bab8c`),
  five Phase 39 self-critique AUDIT rows remain, all carrying the
  `reporter` category — exactly the queue the oversight-set iterate
  bias (`> Bias: reporter`, plan/AUDIT.md) is steering. Letting
  /iterate drain them one tick at a time costs ~5 commit cycles + 5
  briefings of the same module; bundling them as a single phase
  matches the Phase 34 (docs sweep) and Phase 40 (failures[] bundled
  with prior-run-diff) pattern — fewer briefings, one verify gate,
  schema settles in one pass.
- scope: Land five focused changes to
  `automation/agent-vitest-reporter.mjs` in one phase:
  1. `rollup.callouts: string[]` heuristic strings ("3 tests > 50ms",
     "1 test failed in src/Combat", "0 new tests since last report"
     reads off `rollup.diff` already shipping at Phase 40).
  2. Slow-failed-tests surface — either drop the `passed`-only filter
     on `slowest5` or add `slowestFailures: [{name, file, durationMs,
     status}]` (decide in brief; bundle the existing AUDIT row's
     trade-off note).
  3. Per-test `location` via Vitest's `experimental_getRunnerTask`
     (file:line for each `it()`). Document the experimental dep in
     the brief Follow-ups.
  4. Chain `--reporter=default --reporter=./automation/...` in the
     `verify:agent` script so manual runs keep progress output.
  5. Round `durationMs` to integer milliseconds in JSON for
     consistency with the markdown's `.toFixed(0)`.
  Hermetic test extensions for each behaviour; verify gate + smoke
  `npm run verify:agent` after.
- unblocks: Drains five AUDIT rows in one phase (combined score 15.5).
  Settles the reporter schema; the polish queue goes empty and the
  bias can be cleared (oversight). The next reporter-touching work
  is a feature add, not a polish item.
- blocked-by: None; Phase 40 (`87bab8c`) shipped every prerequisite
  (failures[], diff, JSON shape). Independent of remaining pending
  candidates (befriendable-enemy, Northern Continent, autosave).
- score: 5 × 7 / 10 = 3.5
- recommended-slot: as the next phase. Pairs with the standing
  reporter bias; once shipped the bias can be cleared at the
  following oversight.

### Candidate: Enemy-skill caster path (combat depth)
- signal: Phase 38 brief explicitly named this as the next direction:
  "the skill caster is always the player in this codebase
  (`skill.engine.ts` takes a `player: Character` param; there is no
  `executeSkill(caster: …)`). Future enemy-skill work would change
  this, but it's not a Phase 38 concern." Spec 07 acceptance says
  the enemy AI dispatches between `attack` / `defend`; today's
  `decideEnemyAction` does exactly that and ignores any
  `skills?: string[]` on Enemy. Elite + boss enemies feel
  mechanically thin because every fight resolves on the same two
  verbs. The `learnSkill` + `getAvailableSkills` surface from
  Phase 30 already exists; this is the symmetric application path.
- scope: Three units. Unit 1 — refactor `executeSkill` to take a
  `caster: Combatant` and `target: Combatant` (today: `player +
  enemy` positional args + `targetType: 'self' | 'enemy'` flag).
  Unit 2 — extend `decideEnemyAction` to optionally pick a skill
  from the enemy's `equippedSkills` when affordable; route through
  the (now agnostic) `executeSkill`. Author 1-2 elite / boss
  enemies with a skill rotation (e.g. Coastal Tyrant gets
  `argument-from-authority` per spec 04b). Unit 3 — hermetic e2e
  drives an enemy-skill-fired round through `resolveCombatRound`;
  `combat:round` event carries the per-skill `SkillPhaseEvent` for
  the enemy actor. Update `docs/enemy.md` + `docs/skills.md`.
- unblocks: Combat depth lever. Spec 07 elite / boss progression
  becomes mechanically distinct. The `ActiveEffect.sourceId` wiring
  from Phase 38 starts paying off (enemy debuffs now have a real
  caster). Future feature: per-enemy skill libraries by tier.
- blocked-by: None — every prerequisite (Phase 30 learnSkill, Phase
  35 Character.id, Phase 38 sourceId wiring) has shipped.
- score: 6 × 4 / 10 = 2.4 (high value; medium effort because the
  refactor touches the executeSkill signature + every call site in
  the resolver path).
- recommended-slot: After the polish bundle + docs sweep. Combat
  feature work after the tooling settles.

### Candidate: Befriendable-enemy content arc
- signal: Phase 36 (`276eecb`) shipped the friendship-victory mechanics
  half (outcome string, half-XP grant, full loot, +1 moral meter), but
  Knowledge-Gaps Q5 explicitly flagged a second half that's still open:
  "What determines the rewards/narrative outcome of a friendship
  victory vs a combat victory? Are there enemies that *should* be
  befriended rather than defeated?" The mechanics now reward
  friendship, but no enemy in the library currently *invites* the path
  — the demo `Disatree_01` is mechanically befriendable but
  narratively just a stalemate exit.
- scope: Pick 2-3 enemies from `src/Enemy/enemy.library.ts` and author
  per-enemy friendship narrative — a `friendshipReward?: Reward` (or
  similar) field on `Enemy`, optional dialogue lines surfaced via a
  new `combat:befriended` MapEvent / dialogue hook, and quest entries
  that branch on `outcome === 'friendship'` vs `'victory'` for at
  least one quest. Example targets: `MournfulGull` (befriend → unique
  passive), `HollowEyedBeggar` (befriend → moral arc tie-in via
  beggar quest), one boss-tier enemy where the choice is genuinely
  costly. Hermetic e2e drives one befriend run end-to-end and asserts
  the per-enemy reward + the quest branch.
- unblocks: Knowledge-Gaps Q5 closes fully. Friendship becomes a real
  player choice with content stakes, not just a mechanical exit.
  Establishes the pattern other enemies can opt into.
- blocked-by: none. Phase 36 wired the mechanics; this is content.
- score: 5 × 6 / 10 = 3.0
- recommended-slot: after the Northern Continent stub (the Northern
  Continent could ship one befriendable enemy as its anchor narrative)

### Candidate: Autosave throttling per Spec 09 Q4
- signal: `src/Game/store.ts:203` + `src/Game/game.reducer.ts:138`
  carry standing `TODO(spec-09)` comments: "autosave currently fires
  on every action in the store. If brutal — Spec 09 Q4 deliberately
  leaves this dial open." The dial has stayed open across every phase
  since 09; saves are cheap today (nullAdapter is a no-op; node.adapter
  writes a single JSON file), but the React Native consumer (per
  spec.md Primary consumer) will eventually hit AsyncStorage with
  every action. The TODO has been "deliberate" for ~26 phases and
  ought to either land or be removed.
- scope: Two options to explore as commit units. (A) Throttle by
  time — `debounce(adapter.save, 500ms)` on a per-store basis so a
  burst of actions collapses into one write; risks losing the last
  ~500ms on a crash, but cheap to implement. (B) Restrict by action
  type — only autosave on a curated set (`COMBAT_ROUND`, `LEVEL_UP`,
  `END_COMBAT`, `MOVE_TO_NODE`, `APPLY_DIALOGUE`, `SAVE_GAME`); UI-tier
  actions like prompt navigation never trigger writes. Recommend (B)
  — it's a deterministic policy a reader can audit, and the action
  list maps to durable game-state changes anyway. Hermetic e2e drives
  the store through a series of actions and counts `adapter.save`
  invocations.
- unblocks: pre-emptive readiness for the React Native AsyncStorage
  backend (Spec 12 noted that adapter is the throttle dial). Drains
  two standing TODO comments. Closes Spec 09 Q4.
- blocked-by: none. Pure store-layer change.
- score: 4 × 6 / 10 = 2.4


### Candidate: Second continent — Northern Continent stub
- signal: `spec.md` 6-month horizon — "Additional world content
  (biomes, continent 2+)". Phase 23's MapEvents engine + Phase 24's
  pool content authoring pattern have unblocked content scale.
  `content/story/story-overview.md` already sketches the Northern
  Continent (Northern City + Island Village).
- scope: Stand up `src/World/Continents/Northern-Continent/` with
  one or two starter maps (e.g. `northern-city`, `island-village`),
  each wired into a registered MapEventPool covering at least 5
  of the 8 kinds. Add to `MAP_REGISTRY`. Hermetic e2e walks the
  new continent's nodes. Establishes the pattern for continent 3+.
- unblocks: actual story breadth; the existing coastal continent
  becomes an act-1 region rather than the whole game.
- blocked-by: none. Phase 22's `world-spec` and `character-spec`
  skills are ready to use for authoring.
- score: 5 × 7 / 10 = 3.5
- recommended-slot: after the cleanup-and-polish phases land

---

## Promoted

### Phase 43 — Alignment-shifting authoring sweep on existing MapEvent + dialogue content
- promoted: 2026-05-16 (oversight; top-scoring candidate after Phase 42 ship)
- source: Phase 42 (`bdfda00`) Follow-ups #1, filed at expand pass 6 (`48a57b7`)
- signal: Phase 42 shipped the `philosophicalAlignment` engine + 27-cell library + `SHIFT_PHILOSOPHICAL_ALIGNMENT` action but explicitly deferred wiring the new axes into any existing choice payload. Without it, the alignment cube is invisible during play — the CLI Character tab renders the cell, but the cell never moves.
- scope: Three units. Unit 1 — type-extend the MapEvent + dialogue choice payload shapes with `alignmentDelta?: Partial<PhilosophicalAlignment>` and thread it through `resolveMapEvent` + `applyDialogueChoice` (mirrors the existing `moralDelta` path). Unit 2 — author first-pass alignment deltas across `src/World/Continents/Coastal-Village/maps.ts` and the Old Marrow / Fishing Village dialogue trees. Calibrate magnitudes to the same `±1..±5` band moralMeter uses; defining `±10` choices reserved for endgame. Unit 3 — hermetic e2e drives a fishing-village walk through a known-alignment-shifting choice and asserts the cell moves; refresh `docs/philosophy.md` with an "Authoring deltas" subsection.
- unblocks: Makes the alignment cube observable in actual play. Sets the authoring vocabulary for every future map / dialogue beat that wants to shift philosophical position.
- blocked-by: None. Phase 42 shipped every engine prerequisite.
- score: 6 × 7 / 10 = 4.2

### Phase 44 — Fallacies-as-spells / abilities (Phase 42 content payoff)
- promoted: 2026-05-16 (oversight; promote-multiple Phase 42 follow-up sequence)
- source: `PhilosAxiosDoc.pdf` closing line + Phase 42 Follow-ups, filed at expand pass 6 (`48a57b7`)
- signal: PDF closes "could serve as 'spells' or abilities in your RPG system." Phase 42 shipped the 27 cells with all 81 fallacies stored as `AlignmentFallacy[3]` per cell, but explicitly stored-not-surfaced. `bearings.md` tonal commitment ("Enemies are embodiments of logical fallacies. Effect names reference philosophical paradoxes") is now backed by 81 named fallacies sitting unused.
- scope: Pick a small N (6-8 marquee fallacies — one or two per axis-pair) and ship them as the first batch of philosophical skills + effects. Each fallacy becomes either a Tier 3 skill payload (`src/Skills/skill.library.ts`) or a status-effect payload (`src/Effects/effect.library.ts`), with a cross-link to the originating `philosophicalAlignmentCell` it was sourced from (new `sourcedFromCell?: string` field on `Skill` / `Effect`). Only fallacies whose mechanics map cleanly to existing combat primitives ship in this phase; the more abstract ones (e.g. "Begging the Question") defer to follow-ups. Hermetic e2e drives one such skill through `resolveCombatRound`; one such effect through `applyEffect`. Update `docs/skills.md` + `docs/effects.md`.
- unblocks: Closes the loop from `PhilosAxiosDoc.pdf` to live combat. Future enemy authoring can pick fallacies per-cell to express philosophical archetypes.
- blocked-by: Phase 43 (the authoring sweep) ideally lands first so authored alignment deltas plus the new fallacy skills both contribute to player-facing philosophical depth in the same playtest pass.
- score: 7 × 5 / 10 = 3.5

### Phase 45 — Enemies-by-alignment AI tuning
- promoted: 2026-05-16 (oversight; promote-multiple Phase 42 follow-up sequence)
- source: `bearings.md` Visual & tonal defaults + Phase 42 Follow-ups, filed at expand pass 6 (`48a57b7`)
- signal: `bearings.md`: "Enemies are embodiments of logical fallacies. Effect names reference philosophical paradoxes." Phase 42 made philosophical alignment a first-class state field but Enemy carries no equivalent. The tonal commitment is rhetorical, not mechanical. Spec 07 elite/boss progression feels mechanically thin (every enemy resolves on the same attack/defend verbs); pinning each enemy to a cell unlocks per-archetype behaviour without a full AI rewrite.
- scope: Two units. Unit 1 — add `philosophicalAlignment?: PhilosophicalAlignment` (optional) to `Enemy`; backfill every authored enemy in `src/Enemy/enemy.library.ts` with a cell pin (e.g. Coastal Tyrant = `faith-pessimistic-transcendent` / Grand Inquisitor archetype; Tidepool Crab = `mid-mid-individual`). Unit 2 — `decideEnemyAction` accepts an optional alignment-tuner that biases the basic-action choice by outlook (Pessimistic → bias defend / friendship-stall; Optimistic → bias attack). Hermetic e2e pins the bias delta against `mockSequentialRng`. Update `docs/enemy.md` with the alignment field + cell taxonomy.
- unblocks: Makes the alignment cube readable from the *enemy* side too. Pairs with Phase 44 (player philosophical payloads) so the philosophical layer cuts both ways.
- blocked-by: Phase 42. Sequenced AFTER Phase 44 so the player-side payload library exists before enemies start drawing from it for archetype expression.
- score: 5 × 6 / 10 = 3.0

### Phase 41 — Specs + Knowledge-Gaps acceptance sweep
- promoted: 2026-05-16 (oversight; top-scoring candidate)
- source: critique pass 15 (commit `1772f30`) Spec 23 row, plus walk
  of the rest of the spec tree turning up the same drift at Spec 04
  (skills engine) and Spec 10 (moral meter) — every acceptance box
  in those three specs is still `[ ]` despite the surfaces having
  shipped (Phase 09 + Spec 04 + 04b; Phase 10; Phases 23 / 24 / 25 /
  31 / 37). `Knowledge-Gaps.md` Qs 15 / 17 / 18 / 19 / 20 are
  stale-resolved.
- summary: One commit per spec (3 commits) — tick every acceptance
  box with the commit hash that shipped it (mirror Phase 34 unit 5
  at `specs/06-*.md`). Update Spec 23's type sketches (`:95`, `:138`)
  with the Phase 37 `shop?: ShopInventory` field + a 12th acceptance
  line for the shop extension. One additional commit retires
  Qs 15 / 17 / 18 / 19 / 20 in `Knowledge-Gaps.md` with the same
  "resolved at <phase>" treatment Q5 / Q12 already got. Pure docs;
  no code touched.
- acceptance: every acceptance box in Specs 04 / 10 / 23 is `[x]`
  with a commit hash; Knowledge-Gaps.md Qs 15 / 17 / 18 / 19 / 20
  carry a resolution annotation; the critique-15 Spec 23 row moves
  from Pending to Done.
- score: 5 × 8 / 10 = 4.0

### Phase 40 — Prior-run diff in agent verify report
- promoted: 2026-05-16 (oversight; recommended-slot pairing)
- source: oversight self-critique of Phase 39 (2026-05-16, shipped at
  `602da33`); the report-to-report delta is the single most valuable
  signal an agent could read, and the prior JSON is already on disk
  at `automation/last-verify-report.json`. The Phase 39 brief deferred
  this as out-of-scope; Phase 40 closes that gap.
- summary: Before writing the new report in
  `automation/agent-vitest-reporter.mjs#writeJson`, read the prior
  report at the same path (if present + schema-compatible). Compute a
  `diff: { addedTests, removedTests, flippedToFail, flippedToPass,
  durationDeltaSlowest5 }` field on the rollup. Surface a "Changes
  since last run" section in the markdown block when the diff is
  non-empty. Bundle the Phase 39 self-critique AUDIT MED 5.4 row
  ("top-level `failures[]` flat list in JSON") into this phase so the
  agent-verify JSON schema settles in one pass rather than churning
  across multiple iterate ticks.
- acceptance:
  - Reporter reads the prior `last-verify-report.json` if present
    and schema-compatible; degrades gracefully (`diff: null`) on
    missing file or incompatible schema.
  - Rollup carries `diff: { addedTests, removedTests, flippedToFail,
    flippedToPass, durationDeltaSlowest5 } | null`.
  - Rollup also carries `failures: [{file, name, message, location}]`
    (the bundled AUDIT MED row).
  - Markdown block includes a `### Changes since last run` section
    when the diff is non-empty; nothing rendered when `diff: null`.
  - Hermetic e2e covers: fresh diff against a fabricated prior, no
    prior file (writes report, `diff: null`), and incompatible-schema
    prior (logs warning, `diff: null`).
  - `docs/testing.md` Phase-39 subsection extended with the diff
    schema; `plan/phases/phase_39_agent_verify_report.md` Follow-ups
    block updated to mark the prior-run-diff item shipped.
- score: 6 × 6 / 10 = 3.6

### Phase 39 — Agent-friendly hermetic e2e report
- promoted: 2026-05-16 (oversight; user-flagged "I want a brief overview
  of the findings whenever an agent runs the hermetic e2e")
- source: oversight free-form request. Today an LLM agent running
  `npm run verify` has to scrape Vitest's default reporter output to
  understand what was tested and what failed. A structured report makes
  agent-driven verification (and human eyeballing) self-service.
- summary: Custom Vitest reporter that emits a structured agent-readable
  report after every run. Two outputs from one reporter:
  - JSON file at `automation/last-verify-report.json` —
    `{ rollup: { total, passed, failed, skipped, durationMs, slowest5,
    newFailures }, files: [{ path, status, durationMs,
    tests: [{ name, status, durationMs, failure? }] }] }`.
  - Markdown summary on stdout at end of run — totals, per-file rollup,
    failed-assertion list (file:line + message), slowest 5 tests.
  - New `npm run verify:agent` script (additive — `verify` stays
    unchanged per Hard Rule 9 conservatism); reporter lives at
    `automation/agent-vitest-reporter.ts` (TS, run via `tsx`).
- acceptance:
  - `npm run verify:agent` returns the same exit code as `npm run verify`.
  - `automation/last-verify-report.json` exists post-run with the schema
    above; a hermetic unit test pins the shape against synthetic Vitest
    Reporter events.
  - Stdout includes a clearly-delimited markdown summary block (e.g.
    `## Verify summary` … `## End summary`).
  - Markdown lists every failed test (`file:line — message`) and the
    slowest five passing tests.
  - At least one call-out heuristic implemented (e.g. "tests added since
    last report" or "files with no tests" — pick one in /plan-a-phase).
- design decisions captured upfront:
  - audience: both — JSON file + markdown stdout (user pick).
  - hook point: custom Vitest reporter (user pick — Vitest's Reporter
    API provides onTestFileResult / onFinished cleanly).
  - additive script: new `verify:agent`, do not modify the existing
    `verify` to avoid breaking the deploy gate's expectations.
- open in /plan-a-phase:
  - exact JSON schema (field names, optional vs. required).
  - which call-out heuristic ships first (added-tests-since-last-run
    requires diffing against a previous report file; "longest test in
    each file" is simpler).
  - markdown delimiter convention so agents can pluck the block out
    of stdout reliably.
- score: 5 × 7 / 10 = 3.5

### Phase 38 — `ActiveEffect.sourceId` wiring for player-applied effects
- promoted: 2026-05-16 (oversight; user pick from expand pass 4)
- source: `/expand` candidate (pass 4); Phase 35 follow-up. The Phase 35
  row noted that no combat / skill path currently sets
  `ActiveEffect.sourceId` to the player's id when the player applies an
  effect; the only in-repo setter is `equipment.reducer.ts` using
  `item.id` correctly. With `Character.id` now stable (Phase 35), the
  attribution wiring becomes mechanical.
- summary: Audit every `applyEffect` call site on the combat / skill
  path — `src/Skills/skill.engine.ts:447` (rebound effects),
  `src/Combat/resist.ts:57/82/94` (crit / rebound / overwhelmed),
  `src/Combat/effects.ts:113` (extended buffs),
  `src/World/MapEvents/handlers.ts:163` (map-event effects). Thread
  `sourceId` from the attacker's `id` (player) or `enemy.id` into each
  ActiveEffect creation. Extend `ApplyEffectOptions` with
  `sourceId?: string` so callers don't have to spread it manually.
  Hermetic e2e pins that a player-applied DoT carries
  `sourceId === state.player.id` through save / load.
- acceptance: every ActiveEffect produced on the combat / skill path
  carries a non-empty `sourceId`; new hermetic test asserts
  player-applied DoT round-trips its `sourceId` through save / load;
  no behaviour change for existing tests.
- score: 4 × 6 / 10 = 2.4

### Phase 37 — Shop economy via `village` MapEventKind
- promoted: 2026-05-16 (oversight; user pick from expand pass 3 — top score)
- source: `/expand` candidate (pass 3); `docs/items.md` Pending lists shop
  economy; `spec.md` 6-month horizon names "shops" explicitly; Phase 23's
  `village` MapEventKind has been waiting for a transactional partner.
- summary: `buyItem(character, inventory, itemId, price)` +
  `sellItem(character, item, price)` reducers (pure — decrement / increment
  `Character.currency`, add / remove items). Wire into the `village`
  MapEventHandler so resolving a `village` node opens a shop UI in the
  Map tab. Author 1-2 starter shop inventories (reuse `consumableLibrary`
  for the demo pool). Hermetic e2e covers buy / sell / insufficient-funds.
- acceptance: `Character.currency` becomes a meaningful resource — quest
  rewards that grant currency are spendable; `village` nodes are no
  longer flavour-only. New tests assert buy decrements currency + adds
  item, sell does the reverse, insufficient currency returns the
  character unchanged.
- score: 6 × 7 / 10 = 4.2

### Phase 36 — Friendship victory reward (XP + narrative tag)
- promoted: 2026-05-15 (oversight; user pick from expand pass 3 — gameplay bias)
- source: `/expand` candidate (pass 3); Knowledge-Gaps Q5; Spec 06 Q2
  backfill confirmed friendship-counter exits report as `'flee'` and
  grant 0 XP today.
- summary: Route the friendship-counter exit through a `'friendship'`
  outcome in `determineCombatEnd` (currently reports `'flee'`); have
  `endCombat` grant `floor(enemy.xpReward * 0.5)` XP on that path;
  surface `outcome: 'friendship'` on the `combat:ended` event payload.
  CLI transcript distinguishes "befriended" from "fled".
- acceptance: the friendship test in `combat.resolver.test.ts:60-78`
  asserts `determineCombatEnd` returns `'friendship'` (the resolver
  already supports the literal) and `endCombat` grants `xpReward * 0.5`;
  CLI report differentiates befriend vs flee. Knowledge-Gaps Q5 and the
  Spec 06 Q2 follow-up close.
- score: 5 × 7 / 10 = 3.5

### Phase 35 — `Character.id` field for stable identity
- promoted: 2026-05-15 (oversight; user pick after Phase 34 promotion)
- source: `/expand` candidate; Knowledge-Gaps Q12. The engine has
  `Enemy.id` but no `Character.id`; `ActiveEffect.sourceId` is
  loosely typed and can't unambiguously point at the player.
- summary: Add `id: string` to `Character` (auto-generate via
  `randomUUID()` unless caller provides) and propagate through
  `createCharacter`, `buildCharacterFromPreset`, and
  `characters.mock.ts`. Audit `ActiveEffect.sourceId` call sites —
  when the player applies an effect, set it to the character's id.
- acceptance: every `Character` instance constructed by the engine
  carries a non-empty `id`; `ActiveEffect.sourceId` is the player's
  id for player-applied effects; hermetic tests pin stable identity
  across save/load. Closes Knowledge-Gaps Q12.
- score: 5 × 6 / 10 = 3.0

### Phase 34 — Docs sweep
- promoted: 2026-05-15 (oversight; user pick after critique pass 9)
- source: not a `/expand` candidate — bundled directly from 7
  doc-quality findings in `plan/CRITIQUE.md` Pending after passes
  7-9. User opted to ship as one phase (commit-per-finding) instead
  of having `/iterate` chew through them tick-by-tick.
- summary: 7 commit units (one per finding) — docs/gameloop.md
  GameEvent surface, docs/character.md Pending section,
  docs/api.md Phase 25-30 additions, Spec 06 backfill answers,
  Spec 06 + 12 acceptance checklists,
  automation/scripts/walkthroughs/README, docs/items.md.
- acceptance: each shipped unit moves its corresponding critique row
  Pending → Done. `grep -c "deferred" specs/06-*.md` drops; Spec 06
  + 12 acceptance boxes show at least one `[x]`.

### Phase 33 — Tier 2 / Tier 3 skill content polish
- promoted: 2026-05-15 (oversight; user pick after critique pass 7)
- source: `/expand` candidate (pass 2); the 6 mid-late skills in
  `src/Skills/skill.library.ts` ship placeholder numbers; the Resonance
  Pairs design from `braindump/BRAINDUMP.md` was never wired into the
  payloads.
- summary: Balance + flavour pass on the 6 tier-2 + tier-3 skills.
  Tier 2 = mixed-stance gates, Tier 3 = mind + philosophical-token
  gates per braindump Option C. Author 3-4 line flavour text per
  skill. Update `docs/skills.md`.
- acceptance: every Tier 2 / Tier 3 skill in `skill.library.ts` has a
  non-placeholder description, resource costs reflect the Resonance
  Pairs vision, and `docs/skills.md` documents the progression model.

### Phase 32 — `critStyle` auto-selection (`double` vs `pierce`)
- promoted: 2026-05-15 (oversight; user pick after critique pass 7)
- source: `/expand` candidate (pass 2); Knowledge-Gaps Q3 left
  `CritStyle` invisible — every crit uses the default.
- summary: Compute both crit paths in
  `src/Combat/phases/scenario.ts` and pick the higher. Hermetic test
  pins the choice for a divergent stat-set. Update `docs/combat.md`
  + `docs/effects/README.md` LIVE flags.
- acceptance: a stat-set where `double` and `pierce` diverge produces
  the higher damage; docs no longer flag the mechanic as "genuinely
  open".

### Phase 31 — CLI mapTab progression fix
- promoted: 2026-05-15 (oversight; surfaced from CRITIQUE pass-7 HIGH at 4d020f2)
- source: critique-7 HIGH — Phase 23's `resolveMapEvent` only writes
  `discoveredNodes`; `mapTab` filters by `availableNodes`, so the
  player gets stuck at fv-2.
- summary: Extend `resolveMapEvent` to add post-resolve adjacents to
  `availableNodes` (drop them from `lockedNodes`). Hermetic e2e walks
  fv-1..fv-4. Revise the save-load walkthrough to use the now-
  reachable fv-3 step.
- acceptance: `availableNodes` includes the next adjacents after each
  node resolves; the apprentice can reach fv-4 from fv-1 in three
  moves; save-load.json walks fv-2 → save → fv-3 → load → fv-2.

### Phase 30 — Runtime skill learning
- promoted: 2026-05-15 (oversight; surfaced from Spec 06 backfill at 75f250b)
- source: Spec 06 Q7 backfill — discovered there is no `learnSkill`
  function and skills are only assigned at character-creation time via
  the preset, even though `learningRequirement` typing already exists
  in `src/Skills/types.d.ts`.
- summary: Add `getAvailableSkills(character)` filter +
  `learnSkill(character, skillId)` reducer respecting
  `learningRequirement`. Surface unlocks during level-up; CLI Character
  tab gets a "Learn skill" prompt. No modal blocking — sit-and-spend
  model parallel to Phase 29.
- acceptance: hermetic e2e proves eligibility filter, learn-once
  invariant, and level-up unlock surfacing. Walkthrough confirms the
  CLI affordance.

### Phase 29 — Stat allocation flow
- promoted: 2026-05-15 (oversight; surfaced from Spec 06 backfill at 75f250b)
- source: Spec 06 Q3+Q8 backfill — discovered the proposed
  `availableStatPoints` field never landed on `Character`, and
  `applyLevelUps` only touches level / HP / threshold.
- summary: Add `availableStatPoints` + `STAT_POINTS_PER_LEVEL = 3`,
  grant points on level promotion, ship an `allocateStatPoint` reducer
  + Character-tab UI. Deferred allocation per Spec 06 Q8(B) so the
  scripted-walkthrough harness (Phase 26/27) keeps working.
- acceptance: hermetic e2e proves the multi-level cascade keeps
  granting points, allocation decrements + re-derives stats; CLI
  Character tab surfaces an Allocate prompt only when points are
  available.

### Phase 28 — Backfill open-Q answers in shipped specs
- promoted: 2026-05-15 (oversight; user pick after Phase 27 unit 3 shipped)
- source: `/expand` candidate; signal from
  `grep -c "> Your answer:$" specs/*.md` showing 19 blanks across four
  shipped specs (`01`, `06`, `10`, `12`) — decisions made during the
  build but never written back.
- summary: One commit per spec (4 commits). For each open question,
  read the shipped code in the corresponding `src/<module>/` and write
  a 1-2 sentence answer capturing the actual decision. Pure docs work
  — no code, no test changes. The template (`00-how-to-use-specs.md`)
  keeps its blank as intentional.
- acceptance: `grep -c "> Your answer:$" specs/01-*.md
  specs/06-*.md specs/10-*.md specs/12-*.md` returns 0 across the four
  files; the `00-` template still has its instructional blank. Each
  answer line cites or quotes the relevant code surface so a future
  reader can verify against ground-truth.

### Phase 27 — Expand walkthrough coverage
- promoted: 2026-05-15 (oversight; user pick after Phase 26 shipped)
- source: oversight free-form — "author more Phase 26 walkthroughs"
- summary: Ship scripted walkthroughs + goal companions for the four
  remaining named Phase 26 surfaces (skills-in-combat, save/load,
  item use, debug spawn / boss encounter). RNG-dependent paths use
  the agent-grading layer's tolerance for variability — the goal
  files specify what the agent should accept as "the goal happened
  at least once" rather than pinning exact outcomes.
- acceptance: `automation/scripts/walkthroughs/` contains 6 paired
  files (`<surface>.json` + `<surface>.goal.md`) covering all six
  named surfaces; each walks through `npm run agent-e2e` end-to-end
  with a meaningful goal definition.

### Phase 25 — Remove legacy `processNode` + MapEvent types
- promoted: 2026-05-15 (oversight)
- source: Phase 24 scope deviation (deferred from Spec 23 Q7)
- summary: Delete `src/World/process-node.ts`, the `MapEvent` and
  `MapEventType` types, the `nodeEvents` field on `MapDefinition`,
  and the `npc` / `shop` kinds. Rewrite the ~10 `processNode`-pinned
  cases in `src/World/e2e/world.engine.test.ts` to drive
  `resolveMapEvent` instead. Strip legacy exports from the world
  barrel and `src/index.ts`.
- acceptance: `grep -rn "processNode\|MapEvent\b\|MapEventType" src/`
  returns zero hits; world e2e suite green using only the new dispatcher.

### Phase 26 — Validation CLI + agent-graded automation harness
- promoted: 2026-05-15 (oversight; user-flagged "most important phase")
- source: oversight free-form request — "I can't be sure anything is
  fully implemented [from the CLI alone]. I want to bridge that gap."
- summary: Expand `src/CLI/game.cli.ts` to cover the full engine
  surface (skills in combat, one-keypress next-map-node, character
  sheet view, per-decision state-log writer behind `--state-log <path>`).
  Rework automation testing: one scripted walkthrough per CLI surface
  + a companion `*.goal.md`; new `automation/agent-e2e.mjs` runs the
  walkthrough with `--script + --json-events + --state-log`, captures
  the log, and pipes (goal, log) to Claude API for a structured
  pass/fail. Hermetic vitest suite stays as-is; agent-grading is a
  deliberately non-hermetic layer on top.
- acceptance: every CLI tab and prompt has a corresponding walkthrough
  + goal in `automation/scripts/walkthroughs/`; `npm run game --
  --script <path> --json-events --state-log <path>` produces a JSONL
  log; `node automation/agent-e2e.mjs <script> <goal>` returns a
  structured pass/fail decision.

### Phase 15 — Split combat.resolver.ts into per-phase helpers
- promoted: 2026-05-14 (oversight)
- source: critique pass-1 (Z-MED 2.1 in AUDIT.md)
- summary: Extract `resolveRoundStart`, `resolveActionRestriction`,
  `resolveAdvantage`, `resolveStanceEffects`, `resolveScenario`,
  `resolveRoundEnd` into colocated files; orchestrator stays as
  `resolveCombatRound`. Public contract unchanged.

### Phase 16 — Migrate sibling tests into `src/<Module>/e2e/`
- promoted: 2026-05-14 (oversight)
- source: critique pass-1 (Z-LOW 1.2 in AUDIT.md)
- summary: Move `*.test.ts` files in Effects/Enemy/Utils/World/Character/NPCs
  into `<Module>/e2e/<feature>.engine.test.ts`. Mechanical; no logic changes.
- decision: chose "migrate" over "broaden bearings".

### Phase 17 — Unify CLI surface
- promoted: 2026-05-14 (oversight, user request)
- source: oversight (CLI testing harness initiative)
- summary: Drop `combat`, `character`, `auto:combat` scripts; delete
  `combat.cli.ts`, `character.cli.ts`, `automation/combat-test.py`. Single
  entry: `npm run game`. Combat reached via Map encounters and the Spawn
  Encounter tab from Phase 19.

### Phase 18 — Preset character roster
- promoted: 2026-05-14 (oversight, user request)
- source: oversight (CLI testing harness initiative)
- summary: `src/Character/preset-roster.ts` with ≥4 progression tiers
  (`fresh-L1`, `mid-L5`, `late-L10`, `endgame-L15`). Roster picker at boot.
  Hermetic e2e validates each preset's internal consistency.

### Phase 19 — Enemy spawn picker
- promoted: 2026-05-14 (oversight, user request)
- source: oversight (CLI testing harness initiative)
- summary: Spawn Encounter debug tab — list enemies by tier, pick one,
  drop into combat against the active preset.

### Phase 20 — Scripted / agent-driven CLI mode
- promoted: 2026-05-14 (oversight, user request)
- source: oversight (CLI testing harness initiative)
- summary: `--script <path>` (JSON plan, deterministic replay via Phase 11
  RNG), `--json-events` (structured stdout for LLM agent parsing), stdin
  one-action-per-line mode for live agent control.

### Phase 21 — Phase 12 API cleanup
- promoted: 2026-05-15 (oversight)
- source: critique pass-2 (4 MED findings in CRITIQUE.md, commit 4c04ae8)
- summary: Drain the four cleanup findings against Phase 12's just-shipped
  public surface so the package API stabilizes in one pass:
  1. Remove `createNodeAdapter` re-export from `src/index.ts:130` and
     `src/Game/index.ts:32` — keep it only on the `./node` subpath. Decide
     `PersistenceAdapter` interface placement (likely keep on core barrel
     for RN consumers building their own adapter; document in `docs/api.md`).
  2. Extend `events.types.ts` / `events.utils.ts` to cover the three missing
     GameEventType values (`dialogue:applied`, `game:saved`, `game:loaded`)
     with payload types, creators, and type guards — or document an
     intentional partial-coverage rename of `TypedGameEvent`.
  3. Either retrofit engine emit sites to route through the seven
     `create*Event` helpers (so engine payloads always match the typed
     shape) or downgrade them from Beta to a clearly-labelled
     "consumer convenience" tier in `docs/api.md`.
  4. Strip redundant `as Payload` casts from the seven creators in
     `src/Game/events.utils.ts` so TypeScript enforces literals against
     the return type.

### Phase 22 — Story content authoring infrastructure
- promoted: 2026-05-15 (oversight, user request)
- source: oversight (story content workflow)
- priority: low (user explicitly noted)
- summary: Three-skill authoring surface, separate concerns, each writing
  into the existing `content/` tree (user already moved overview into
  `content/story/` and seeded `content/locations/<name>/` folders).
  - Extend `skills/story-spec.md` to be story-building-only — plot beats,
    quest arcs, "Order of Events"-style sequences. Outputs into
    `content/story/<beat-or-arc>.md`.
  - Add `skills/world-spec.md` — world / location / region / faction /
    lore. Outputs into `content/locations/<location>/<aspect>.md` (e.g.
    `content/locations/northern-forest/overview.md`).
  - Add `skills/character-spec.md` — character synopsis, backstory, voice,
    relationships, moral arc. Outputs into
    `content/characters/<character>.md`.
  - All three skills run in **dual mode**: socratic Q&A live in chat
    when invoked AND a structured spec form the user can answer offline.
    Mirror the live + spec pattern already used by `skills/story-spec.md`.
  - Add `content/templates/{character,location,story}.md` skeletons each
    skill writes from.
- design decisions captured:
  - location: `/content/` (user-moved, commit 84afc5c/ca75dcb).
  - separate templates per concern (decided).
  - separate skills per concern (decided); full creative control on shape.
  - dialogue authoring: keep inline in NPC TS modules (Old Marrow
    pattern in `src/NPCs/named/old-marrow.ts`); revisit if the catalogue
    surface grows beyond a handful of named NPCs.

### Phase 23 — MapEvents engine + node discovery
- promoted: 2026-05-15 (oversight, user request)
- source: oversight (MapEvents implementation)
- priority: medium (user wants implementation to begin)
- summary: New spec `specs/13-map-events.md`; replace `processNode` with a
  single `resolveMapEvent(node, state): { state, event }` dispatcher; add
  node-discovery / fog-of-war mechanic.
- taxonomy (final, per user decision):
  - **encounter** — combat
  - **interaction** — dialogue / story trigger (folds old `npc` kind)
  - **gathering** — resource collection (writes inventory directly)
  - **rest** — recovery / heal
  - **village** — settlement scene; merchants / shopkeepers folded under
    village interactions (folds old `shop` kind)
  - **cutscene** — non-interactive story beat
  - **hazard** — environmental damage / status trigger
  - **loot-cache** — fixed-pool inventory grant
- migration: drop `kind: 'npc'` and `kind: 'shop'` from
  `src/World/process-node.ts:45-46` and rewrite `src/World/spec08.test.ts`
  assertions accordingly.
- node discovery (central mechanic):
  - Nodes start locked / blacked out.
  - A node becomes revealable only when an adjacent node has been
    completed (entered + its MapEvent resolved).
  - The MapEvent type is **rolled from a weighted pool at unlock time**,
    not authored per-node. Author surface is a per-region (or per-tag)
    event-pool definition.
  - All MapEvents are **one-shot** — consumed once resolved; the node
    remains traversable but produces no further events.
- additional event types worth exploring in the spec (not committed):
  shrine (save point / minor stat boon), puzzle (skill check), monument
  (lore reveal / story flag).
- e2e: hermetic test covers discover → unlock → roll → resolve →
  one-shot exhaustion across at least three event types.

### Phase 24 — MapEvents content
- promoted: 2026-05-15 (oversight, user request)
- source: oversight (MapEvents implementation)
- summary: With the Phase 23 engine in place, populate at least one node
  of each MapEvent type and migrate the existing fishing-village and
  northern-forest world content into the new shape. Hermetic e2e walks a
  short discovery → resolution chain end-to-end against the live content
  registry.

---

## Rejected

### Candidate: Combat sub-event surfacing in agent-e2e state log
- rejected: 2026-05-15 (oversight; redundant after iterate)
- reason: /iterate at `5ac6caa` drained the underlying MED critique row
  by extending `EnginePayload` with optional `combatEvents?: readonly
  RoundEvent[]`, threading the array through `store.updateCombat(combat,
  combatEvents)` onto the `combat:round` event payload, and surfacing
  it on the `combatRound` state-log entry from `src/CLI/game.cli.ts`.
  Two hermetic tests in `src/Game/e2e/events.engine.test.ts` pin the
  wire. The candidate scope was a strict subset of what shipped — no
  follow-on phase needed.
