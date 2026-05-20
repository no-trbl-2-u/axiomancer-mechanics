# PHASE_CANDIDATES.md

> Proposed new phases from `/expand`. Reviewed and promoted by
> `/oversight`. Format: `## Pending` → `/oversight` moves to
> `## Promoted` or `## Rejected`.

<!-- Metadata (updated by /expand after each pass):
> Last pass: 2026-05-20 at commit 7aa392a
> Pass count: 16
-->

---

## Pending

### Candidate: Tier 2 synergy skills — reward switching, not repeating
- signal: `braindump/BRAINDUMP.md` § "Combat — Tier 2 Synergy" (lines 50-61). "Tier 1 effects reward repeating the same Stance. Tier 2 should reward switching. Add skills that get bonuses based on the duration or intensity of an effect already on the field." Two worked examples in the braindump: Example A (cross-stance poison-duration bonus damage) + Example B (Body Thorns → Heart Bat Swarm via duration-based buff type-swap). The engine surfaces this needs already exist as of Phase 44 (`sourcedFromCell` on Skill + Effect), Phase 38 (`ActiveEffect.sourceId`), Phase 48 (statModifiers + intensity scaling verified runtime), and Phase 49 (skill caster path with stance derivation from `philosophicalAspect`). What's missing is the SKILL-AUTHORING surface that lets a skill payload inspect the live `ActiveEffect[]` and condition damage / effect application on its `intensity` / `remainingDuration`.
- scope: Two units. Unit 1 — extend the skill engine with a new `SkillEffectClause` shape (or extend the existing payload variants) supporting `whenEffectAtLeast?: { effectId: string; intensityMin?: number; durationMin?: number; on: 'caster' | 'target' }` predicate. The skill engine evaluates the predicate against the relevant `ActiveEffect[]` before applying the main payload; failing predicate routes to a fallback payload (or no-op). Unit 2 — author 2-3 marquee Tier 2 synergy skills following the braindump's two examples: (a) a cross-stance damage amp keyed on a different-stance DoT's remaining duration; (b) a buff type-swap (Thorns → Bat Swarm) gated by duration threshold. Hermetic e2e drives each through `executeSkill` with seeded active effects on the combatant.
- unblocks: Tier 2 mechanical identity becomes "rewards stance switching" per the braindump design intent. Phase 33 already declared `learningRequirement: { level: 5 }` on every Tier 2 skill; this candidate's content fills the mechanical promise. Future Tier 2 content authoring (more synergy skills, per-stance themed pairs) becomes a one-line skill payload.
- blocked-by: None on the engine side (all upstream primitives shipped). Wants a content-design pass from the user before brief drafting — picking which 2-3 synergy patterns are canonical, the damage / duration thresholds, and the cell mapping for `sourcedFromCell` if any.
- score: 5 × 4 / 10 = 2.0 (medium impact — fills the Tier 2 mechanical-identity gap; medium-low ease — new payload-clause primitive + ≥2 hermetic e2e cases per skill, plus content design coordination).
- recommended-slot: queue behind Boss-tier befriendable enemy + Northern Continent. Best paired with a /oversight design pass to lock the 2-3 specific synergy patterns; otherwise the brief invents content that the user may want to override.

### Candidate: Boss-tier befriendable enemy (Phase 60 follow-up)
- signal: Phase 60 (`7724c96 + 6e03871 + b13348b`) Follow-ups explicitly named "Boss-tier befriendable enemy. The candidate's third example ('one boss-tier enemy where the choice is genuinely costly') wants its own phase scope — boss-tier rewards likely want bigger payloads (unique items, alignment shifts, named NPC follow-up) than the authored rewards in this phase." Engine field (`Enemy.friendshipReward?: FriendshipReward`) is live since Phase 60; this is pure content + maybe one small typed-surface extension.
- scope: Two units. Unit 1 — pick one boss-tier enemy from `src/Enemy/enemy.library.ts` (candidates: Coastal Tyrant `boss` / The Disagreement `boss` / Hollow Saint `elite` — boss-tier 'boss' difficulty has 2 entries today). Coastal Tyrant is the natural pick — alignment `faith-pessimistic-transcendent` (Ferreira / Mainländer archetype) suggests a "the priest who lost their god" friendship arc. Author a richer `friendshipReward`: 2-3 guaranteed items (mix of consumables + maybe a unique equipment piece from `uniqueTemplates`), 50+ xpBonus, multi-paragraph narrative. Optionally extend `FriendshipReward` shape with `alignmentDelta?: Partial<PhilosophicalAlignment>` so befriending a philosophical enemy nudges the player toward (or away from) their cell — this is the Spec 14 Q4 follow-up made concrete on a specific encounter. Unit 2 — hermetic e2e extends `src/Game/e2e/befriend.engine.test.ts` with the boss-tier case; `docs/enemy.md` "Befriendable enemies (Phase 60)" table grows to 3 rows.
- unblocks: Closes Phase 60's most-named follow-up. Establishes the boss-tier reward authoring pattern. If `alignmentDelta` extension lands, partially closes Spec 14 Q4 (friendship-victory ↔ alignment cube intersection — from "orthogonal by design" to "orthogonal by default, opt-in per encounter").
- blocked-by: None. Phase 60 wired the field; Phase 45 already authored boss-tier alignment pins.
- score: 4 × 6 / 10 = 2.4
- recommended-slot: bundled with the quest-branch candidate below if both fire; the alignment-shift extension fits naturally with that candidate's `flagSet?` framing.

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

### Phase 65 — Expand the fishing-village starting map ("huge first map" pass)
- promoted: 2026-05-20 (eighth oversight of the session; user write-in: "I want to make the first map considerably larger. For now it'll be the 'base' map but in the future we can start breaking it up and balancing it. For now, I just want a huge first map").
- source: oversight write-in. Replaces the candidate-promotion choice for this tick.
- scope: Significantly expand `src/World/Continents/Coastal-Village/maps.ts` `fishing-village` map from its current shape — a linear 10-node chain (`fv-1` → `fv-10` along the x-axis, each with one `connectedNodes` entry) — to a substantially larger branching map. Target: ~25-35 nodes in a 2D grid layout with multiple branches, sub-areas (harbor district / inland streets / cliff path / etc.), and 3-5 dead-end / loop branches to give exploration weight. Author `MapEventPool` entries for each new node (mix of `encounter` / `interaction` / `gathering` / `rest` / `hazard` / `loot-cache` per the existing Phase 23 8-kind taxonomy; keep `village` entries clustered in the harbor district where shops naturally live; one `cutscene` beat at a marquee location). Reuse existing enemies from `ENEMY_REGISTRY` for encounter nodes (no new enemy content this phase). Reuse existing NPCs (Old Marrow, Coastal Beggar, Tideshopkeeper) for the harbor district. **Phase brief at dispatch** picks the final node count, the layout, and the per-node event-kind assignment; this candidate's scope is "the first map should be a meaningful exploration space, not a railroad." Per the user's "base map" framing, balancing + sub-area splits are explicit follow-up phases.
- unblocks: Future content phases (per-region quest authoring, alignment-shifting content beats, befriendable enemy placements) have somewhere to land. The Northern Continent stub candidate (carried, score 3.5) becomes more meaningful as the second continent once the first is real. Establishes the per-continent layout pattern (multi-branch grid, sub-areas, mixed pool kinds) for future continents.
- blocked-by: None. All upstream primitives are live since Phase 23/24/41 (MapEvents engine + pool authoring + Spec 23 acceptance).
- score: 7 × 5 / 10 = 3.5 (high impact — the canonical playspace gets real; medium-low ease — content authoring across ~25-35 nodes is substantial, but each node is a small JSON-ish payload following existing patterns).
- recommended-slot: ship next; this is the user's directed next direction.

### Phase 61 — CHANGELOG breaking-removals backfill (mobile #93 unblock)
- promoted: 2026-05-20 (seventh oversight; user picked option 1 in response to mobile #93's 58-typecheck-error revert and explicit `### Removed` / `### Breaking` backfill request)
- source: oversight signal — mobile `axiomancer-mobile#93` comment 2 lists the undocumented breaking removals discovered when bumping the engine pin 0.10.0 → 0.10.2. Absorbs the existing critique-26 row (CHANGELOG `[unreleased]` empty post-0.10.2) into a wider scope.
- scope: Two or three units. Unit 1 — audit each tagged release `v0.7.0` → `v0.10.2` by diffing `dist/index.d.ts` (or `git show <tag>:src/index.ts`) against the prior tag, plus walking the per-phase briefs in `plan/phases/` for breaking-removal mentions. Catalogue every removal mobile flagged: `getCoastalMap`, `Encounter.enemy`, `DialogueChoice.id` / `.label`, `DialogueNode.speaker`, `Character.mana` / `.maxMana`, `ActiveEffect.id` / `.name`, `EffectStatTarget` literal-union tightening, `GameState` index signature removal — plus any others surfaced by the diff. Unit 2 — backfill `CHANGELOG.md` for each affected version with a `### Removed` / `### Breaking` block. The 0.10.0 entry already has a stub Removed block (only `WorldMap` listed); extend it. Earlier tags (`0.7.0` / `0.8.0` / `0.9.0`) get new Removed blocks where applicable. The `[unreleased]` heading also gets populated with Phase 58/59/60 + the 7 iterate fixes shipping post-0.10.2 (Phase 60's `FriendshipReward` is the only public-surface addition; the rest are docs / structure). Unit 3 — comment on mobile #93 with the canonical migration guide once the CHANGELOG lands (the `Closes #93` trailer pairs with mobile's Phase 60 re-scope; the engine repo provides the docs, mobile authors the shim sequence). Optionally re-run `node scripts/diff-public-surface.mjs v0.7.0 HEAD` (Phase 53) for the canonical per-version diff once the fixture exists at both refs (`v0.10.0` predates the fixture per the existing 0.10.1 migration note).
- unblocks: mobile #93 Phase 60 re-scope decision (single phase vs 60a..60f compatibility sequence). Closes critique-26 row. Future engine consumers (axiomancer-mobile, any future RN/web client) can trust the engine CHANGELOG as the canonical break-list.
- blocked-by: None. Pure docs work in CHANGELOG.md; no code touched. The Unit 3 mobile-comment is optional (could be a separate manual step).
- score: 7 × 8 / 10 = 5.6 (high impact — unblocks a downstream consumer; high ease — pure docs against existing git history).

### Phase 62 — Quest-branch wire-in on `outcome === 'friendship'` (Phase 60 follow-up)
- promoted: 2026-05-20 (seventh oversight; user multi-selected this as the Phase 60 D3 deferral closeout)
- source: filed at expand pass 15 (`a987340`); Phase 60 D3 deferral
- scope: Three units. Unit 1 — pick path: (a) `FriendshipReward.flagSet?: string` + extend `store.endCombat()` to dispatch a flag-set action on friendship outcome when the field is present; existing quest-entry flag gates (`DialogueChoice.requires.flag`) consume the flag downstream, OR (b) `QuestObjective.completedOn?: 'friendship' | 'victory'` slot + extend `progressQuest` / `killObjectives` to dispatch on the correct outcome label. Path (a) reuses the existing flag-gate machinery and is the smaller patch; path (b) is more expressive but adds a new field to `QuestObjective`. Brief picks (a) at dispatch. Unit 2 — author one quest entry that branches: MournfulGull's friendship sets a `befriended-mournful-gull` flag; a new dialogue branch on a fishing-village NPC (e.g. Coastal Beggar) gates on the flag and offers a different quest exit when set. Unit 3 — hermetic e2e in `src/Game/e2e/befriend.engine.test.ts` (or sibling) drives a friendship → flag-set → dialogue-gate path end-to-end. `docs/combat.md` Friendship Path section gains the flag-set semantics; `docs/api.md` notes the new field on `FriendshipReward`.
- unblocks: Friendship outcome becomes a real quest-shaping choice, not just a one-off combat exit. Closes Phase 60 D3 deferral. Enables future "this quest branches on whether you befriended X" authoring without engine work.
- blocked-by: Phase 60 (shipped). Phase 61 should land first so the CHANGELOG `[unreleased]` entry can roll the new `flagSet` field in with the other post-0.10.2 surface additions.
- score: 5 × 5 / 10 = 2.5

### Phase 63 — NPC alignment observers (Spec 14 Q2 follow-up)
- promoted: 2026-05-20 (seventh oversight; user multi-selected this alongside the Phase 60 D3 closeout)
- source: filed at expand pass 15 (`a987340`); Spec 14 Q2 deferral
- scope: Three units. Unit 1 — extend `NPC` type with `observesAlignment?: boolean` (default `false` / undefined treated as opt-out); add a per-NPC `lastSeenAlignmentCellId?: string` field to the `state.flags` or a sibling state map (writes on every `applyDialogueChoice` to an observing NPC). Unit 2 — extend the dialogue runtime so reactive branches can gate on `playerAlignmentCellChangedSince?: string` (predicate against the cached cell id) — same shape as the existing `requires.flag` slot; opt-in per dialogue choice. Unit 3 — author 1 NPC that observes: Old Marrow is the natural pick (already carries alignment-gated dialogue per Phase 43+46). Add a dialogue branch that surfaces if the player's alignment has visibly shifted since the last conversation. Hermetic e2e drives a shift → re-converse → new branch path.
- unblocks: Spec 14 Q2 closes (engine surface exists; per-NPC adoption is content-author work). NPCs become reactive to player philosophical drift, not just gating. Future content phases can wire any NPC into the same observer machinery without engine work.
- blocked-by: Phases 42-46 (shipped). Independent of Phase 60 / 62 follow-ups.
- score: 4 × 5 / 10 = 2.0

### Phase 64 — CLI demonstration of endgame equipment × stats × combat interactions
- promoted: 2026-05-20 (seventh oversight; user write-in candidate — "Enhance CLI to demonstrate interactions between 'endgame' equipment, stats, and combat")
- source: oversight write-in (no prior expand candidate)
- scope: Two or three units. Unit 1 — author a new agent-graded walkthrough at `automation/scripts/walkthroughs/endgame-loadout.{json,goal.md}` that scripts a maxed-out character (level ≥10, stat-allocation maxed, equipped with a full unique-item set + a Phase 54 set-bonus loadout, learned Tier 3 skills) through 1-2 elite or boss encounters. Uses the existing Phase 20 `--script` / `--stdin` primitives so it's hermetic-adjacent (the walkthrough is agent-graded, not hermetic per `docs/testing.md`; it lives in `automation/` not `src/`). Unit 2 — extend `src/CLI/` debug commands (or add a new one) to fast-track a character to the endgame state for ad-hoc exploration; primary audience is dev/playtest. Optional, depends on existing CLI surface. Unit 3 — extend `docs/testing.md` § "Agent-graded e2e harness" with the new walkthrough's entry; cross-link to `docs/equipment.md` "Set Items (Phase 54)" + `docs/skills.md` Tier 3 surface. The phase's *purpose* is demonstration / playtest pre-1.0; it does NOT add new engine surface. Hermetic coverage stays in `src/<Module>/e2e/`; this phase produces a non-hermetic walkthrough.
- unblocks: Playtest readiness for the endgame loop's interactions (unique items × set bonuses × stat thresholds × Tier 3 skills × boss-tier alignment AI). Surfaces any unintended interactions before they bite during content authoring. Establishes the agent-graded-walkthrough pattern for high-level character states (the existing walkthroughs cover early-game flows: shop, save/load, item-use, skill-learning).
- blocked-by: None. All depended-on engine surfaces are live (Phase 54 set items, Phase 33 Tier 3 skills, Phase 45 boss alignment, Phase 49 enemy skill caster path).
- score: 5 × 5 / 10 = 2.5

### Phase 58 — `specs/14-philosophical-alignment.md` — conversation-loop spec for the Phase 42-46 alignment cube
- promoted: 2026-05-20 (sixth oversight of the session; build-plan queue empty after Phase 55/56/57 shipped; user multi-selected three candidates with Spec 14 prioritised as the smallest, blocks-nothing pure-docs unlock that also drains the only pending CRITIQUE row)
- source: filed at expand pass 14 (`d6f42f0`); critique-18 row (commit `c62702e`)
- scope: One phase, 2-3 commit units. Unit 1 — file `specs/14-philosophical-alignment.md` using the `specs/00-how-to-use-specs.md` template. Goal section names the 3-axis cube + 27-cell registry. Current state section cites Phase 42 (engine), 43 (alignmentDelta authoring surfaces), 44 (sourcedFromCell + fallacies-as-spells), 45 (enemy alignment + outlook bias), 46 (AlignmentGate). Open questions section captures the four remaining design calls per the critique row: (1) Should `moralMeter` unify into the cube as a 4th axis? (2) Should alignment shifts propagate to NPCs that observe the player? (3) Should there be alignment-gated endings? (4) How does the alignment cube intersect with the friendship-victory mechanic? Acceptance checklist boxes for each shipped surface point at the commit that shipped it. Unit 2 — add a row to `specs/README.md` Recommended order pointing at the new spec (Spec 14 ships **DONE** since the engine is live; the spec is documentation, not greenfield work). Unit 3 — answer any of the 4 open questions where the answer is already implicit in shipped code (e.g. Q4 friendship-victory: orthogonal — `moralMeter` shifts but `philosophicalAlignment` is unaffected since none of the 27 cells carries an alignmentDelta tied to friendship-counter resolution). On ship, drain the critique-18 row from `plan/CRITIQUE.md` Pending → Done.
- unblocks: critique-18 row drains. Future alignment phases have a centralised Q&A surface to extend. Closes the symmetry gap with every other multi-phase mechanic.
- blocked-by: None. Pure docs work; can ship in parallel with content/engine phases.
- score: 4 × 8 / 10 = 3.2.

### Phase 59 — Docs gap audit + drain (re-scoped from older Docs-sweep candidate)
- promoted: 2026-05-20 (sixth oversight; user multi-selected with explicit "re-scope down to current pending only before promotion" guidance — the original candidate's 9-row-group signal has largely drained through May 19-20 iterate ticks)
- source: filed at expand pass 11 (`ce88559`) as "Docs sweep — drain pending CRITIQUE.md rows (Phase 34 mirror)"
- scope: One phase, audit-first. The original candidate listed 9 row-groups (a-i): (a) docs/api.md Philosophy entry, (b) README.md + bearings.md Philosophy row, (c) docs/npcs.md alignmentDelta, (d) docs/skills.md requiresAlignment, (e) docs/effects.md count drift, (f) Spec 23 acceptance Phase 43 line, (g) docs/morality.md philosophy cross-link, (h) specs/14 spec-gap (now Phase 58), (i) older items (Spec 03/05e acceptance, PhilosAxiosDoc placement, TODO(spec-09), Phase 37 sell-price exploit, shop walkthrough, Phase-11 walkthroughs, automation/ README, getCoastalMap). Many shipped via /iterate across May 19-20 (CHANGELOG, docs/api.md Phase 54 backfill, scripts/README.md, DURABLE_ACTIONS reframe). At phase-brief time the brief re-audits CRITIQUE pending + recent AUDIT Done + a fresh grep of each row-group's expected text to identify residual drift; ships whatever remains as commit-per-row units (target ≤4 units). If the re-audit finds zero residual, the phase ships as a single audit-summary commit listing each row-group with shipping reference + "no residual" verdict, then closes.
- unblocks: Confirms the docs queue is genuinely drained (or surfaces what's left). Future critique passes start from a low baseline.
- blocked-by: None. Independent of Phase 58 (which removes row-group (h)) and Phase 60.
- score: 3 × 9 / 10 = 2.7 (re-scoped down from 4.8 nominal because most of the original signal has drained; high ease because audit-first means worst case is a single closing commit).

### Phase 60 — Befriendable-enemy content arc
- promoted: 2026-05-20 (sixth oversight; user multi-selected as the content-arc direction; closes Knowledge-Gaps Q5 fully — Phase 36 shipped the mechanics half, this phase ships the content half)
- source: filed at expand pass 8 (`aff5a57`)
- scope: Pick 2-3 enemies from `src/Enemy/enemy.library.ts` and author per-enemy friendship narrative — a `friendshipReward?: Reward` (or similar) field on `Enemy`, optional dialogue lines surfaced via a new `combat:befriended` MapEvent / dialogue hook, and quest entries that branch on `outcome === 'friendship'` vs `'victory'` for at least one quest. Example targets: `MournfulGull` (befriend → unique passive), `HollowEyedBeggar` (befriend → moral arc tie-in via beggar quest), one boss-tier enemy where the choice is genuinely costly. Hermetic e2e drives one befriend run end-to-end and asserts the per-enemy reward + the quest branch. Phase brief at dispatch time picks the final enemy set + reward shape; the `friendshipReward` field shape is a phase decision.
- unblocks: Knowledge-Gaps Q5 closes fully. Friendship becomes a real player choice with content stakes, not just a mechanical exit. Establishes the pattern other enemies can opt into.
- blocked-by: None. Phase 36 wired the mechanics; this is content + a small typed-surface addition.
- score: 5 × 6 / 10 = 3.0.

### Phase 55 — PersistenceAdapter ergonomics (Phase 50 follow-up)
- promoted: 2026-05-20 (fifth oversight of the session; user picked the smallest mobile-unblocking follow-up as the top priority post-0.10.1-publish — closes the last loose end of the GH#64 engine handoff)
- source: filed at expand pass 11 (`ce88559`)
- scope: One phase, 1-2 units (carried verbatim from the candidate). Unit 1 — read the mobile-side local re-declaration of `PersistenceAdapter` in `axiomancer-mobile/state/persistence/asyncStorageAdapter.ts` and diff against the engine export in `src/Game/persistence/types.ts`; identify the specific friction (method-signature granularity, generics escape hatch, error-typed return, etc.); land the engine-side change that makes the local re-declaration unnecessary. Unit 2 — extend the public-barrel hermetic test to assert the `PersistenceAdapter` export shape matches what mobile expects (mobile-side signature as source-of-truth, copied as a comment block). Documented in CHANGELOG.md as the first entry on the next `[unreleased]` heading post-0.10.1 publish.
- unblocks: Mobile's `state/persistence/asyncStorageAdapter.ts` can `import type { PersistenceAdapter } from 'axiomancer-mechanics'` instead of re-declaring locally. Future persistence-adapter consumers inherit the ergonomic surface.
- blocked-by: Phase 50 (shipped). Best paired with the 0.10.1 publish if mobile is going to bump immediately after — the PersistenceAdapter change can land as `0.10.2` or fold into a single bump.
- score: 3 × 6 / 10 = 1.8.

### Phase 56 — CI verify-on-PR / verify-on-push (GitHub Actions)
- promoted: 2026-05-20 (same oversight as Phase 55; user multi-selected three candidates including this one as the CI-gap closure)
- source: filed at expand pass 13 (`b011acb`)
- scope: One phase, 1-2 units (carried verbatim from the candidate). Unit 1 — author `.github/workflows/verify.yml` running on `pull_request` + `push` against `main`. Steps: Node setup (LTS), `npm ci`, `npm run verify`, `npm run deploy:check`. Cache `node_modules` keyed off `package-lock.json` sha. Unit 2 (optional) — extend to a release workflow on tag push (`v*.*.*`) that runs verify + builds dist + prepares a draft `npm publish` (without auto-publishing; user-triggered per RELEASING.md). The release workflow pairs cleanly with Phase 52's flow.
- unblocks: Future human contributors / branch experiments get a remote red-CI signal. README can carry a CI badge.
- blocked-by: None. Independent of Phase 55 / 57.
- score: 4 × 7 / 10 = 2.8.

### Phase 57 — Enemy rotation content sweep (Phase 49 follow-up)
- promoted: 2026-05-20 (same oversight as Phase 55 + 56; user multi-selected this as the highest-scored content authoring direction)
- source: filed at expand pass 8 (`aff5a57`)
- scope: Two units (carried verbatim from the candidate). Unit 1 — author one thematic skill per remaining elite (Tidefluke Reaver, Hush-Wraith, Hollow Saint) + remaining boss (The Disagreement) + unique (Echo of Pyrrhonia) — 5 enemies. Skills picked from `skillLibrary` so engine + tests stay green; alignment cell guides the pick (e.g. Hollow Saint faith-mid-transcendent → `pascals-wager`; The Disagreement mind-aspect → `liars-echo`). Pair each with the corresponding `philosophicalAspect` so the stance dispatch in `pickEnemySkill` reads as in-character. Unit 2 — author rotations for 2-3 selected normal enemies whose alignment-fallacy mapping is thematically tight (Mournful Gull heart → `appeal-to-pity`; Hollow-Eyed Beggar heart → `pascals-wager`); leave simple enemies (Tidepool Crab, Sea-Mist Wisp, Lullaby Moth) without skills since early-game pacing benefits from straight basic-action enemies. Hermetic e2e extends the existing Phase 49 rotation tests; `docs/enemy.md` Phase 49 subsection table grows to cover the new rotations.
- unblocks: Combat depth lever from Phase 49 actually reaches the library. The `applyOutlookBias` (Phase 45) + `pickEnemySkill` (Phase 49) interaction starts producing visible per-encounter variety.
- blocked-by: None. Pure content authoring against shipped Phase 49 + Phase 45 engine surfaces.
- score: 5 × 7 / 10 = 3.5.

### Phase 52 — Release process artifacts (CHANGELOG.md + RELEASING.md)
- promoted: 2026-05-19 (fourth oversight of the day; build-plan queue empty after Phase 51 shipped; user picked release-engineering as the highest-leverage refill since 0.10.0 was just tagged with no in-repo artefacts and mobile's upgrade doc had to be hand-reconstructed)
- source: filed at expand pass 9 (`d4bcc86`) as "Release process artifacts — CHANGELOG.md + RELEASING.md"
- scope: One phase, 2 units (carried verbatim from the candidate). Unit 1 — author `CHANGELOG.md` at the repo root following Keep-a-Changelog conventions; back-fill entries for each shipped tag (`0.2.0` through `0.10.0`) using the phase briefs as the per-tag source; each entry carries Added / Changed / Removed sections + a short "Migration notes" line for shapes that need a consumer schema migration (e.g. 0.10.0's `state.philosophicalAlignment` field for Phase 42 + the `getCoastalMap` removal at iterate `b85f509`). Unit 2 — author `RELEASING.md` documenting the tag → `npm publish` flow: (a) pre-release checklist (verify gate green, deploy:check passes, build-plan Status block has no `[ ]` rows blocking), (b) version bump + tag procedure, (c) `npm publish` step, (d) post-publish: append to CHANGELOG.md + downstream-consumer note. Both files referenced from `README.md`. Extend `scripts/deploy-check.mjs` with a "latest git tag matches CHANGELOG top heading" assertion. Pair-able with the Deprecation lifecycle candidate (still Pending) as an optional Unit 3.
- unblocks: 0.10.1 republish (pending Phase 50 + 51 changes — currently the engine sits with mobile-breaking deltas not yet published). Future engine→mobile bumps stop requiring hand-written upgrade docs. 0.11.x / 1.0.0 cuts have a checklist.
- blocked-by: None.
- score: 5 × 8 / 10 = 4.0.

### Phase 53 — Public-surface snapshot artifact + diff tool
- promoted: 2026-05-19 (same oversight as Phase 52; user multi-selected both release-engineering candidates for promotion)
- source: filed at expand pass 11 (`ce88559`)
- scope: One phase, 2-3 units (carried verbatim from the candidate). Unit 1 — author `scripts/snapshot-public-surface.mjs` that walks `dist/index.d.ts` and emits a stable JSON (`dist/.public-surface.json` or `scripts/public-surface.expected.json`) listing every exported name + kind + an arity-or-shape hint. Stable sort + deterministic JSON. Unit 2 — extend `scripts/deploy-check.mjs` with a post-build assertion that re-runs the snapshot and compares against the committed fixture; fail the gate on drift. Unit 3 — `scripts/diff-public-surface.mjs <ref-A> <ref-B>` that pretty-prints Added / Removed / Changed between two git refs. Pairs cleanly with Phase 52's CHANGELOG generation (the diff feeds the per-version bullets).
- unblocks: Mobile upgrade docs stop being hand-reconstructed. Engine public-surface drift surfaced at deploy-check time. Phase 50's hand-maintained barrel test is subsumed for surface drift (still keep it as the runtime smoke).
- blocked-by: Phase 52 is the natural prior (the snapshot feeds the CHANGELOG); could ship in parallel but the integration story is cleaner if 52 lands first.
- score: 5 × 6 / 10 = 3.0.

### Phase 54 — Spec 05e Set items (implementation)
- promoted: 2026-05-19 (same oversight as Phases 52 + 53; user picked path (a) "promote to phase" on the AUDIT `[needs-user-call]` row that the corrective-drain iterate `eb807a0` surfaced)
- source: `specs/05e-set-items.md` (spec authored pre-loop; no engine/library/tests/docs ever shipped — only `Equipment.setMembership?: string` stub at `src/Items/types.ts:199`). Promotion replaces the AUDIT `[needs-user-call]` row.
- scope: One phase, 3-4 units. Unit 1 — author `SetBonus` + `ItemSet` types in `src/Items/set.types.ts`; new export block in `src/Items/index.ts` + top-level `src/index.ts`. Unit 2 — implement `getActiveSetBonuses(character): SetBonus[]` in `src/Items/set.engine.ts`; thread set bonuses through `initializeCombat` (combatStartTokens additive stacking per Spec 05e Goal) + `generateBasicActionResources` (set generationBonus entries). Unit 3 — author 3 initial sets in `src/Items/set.library.ts` (Wanderer's Road is the Spec 05e reference; pick 2-3 base templates that thematically pair with the existing equipment library). Unit 4 — hermetic e2e in `src/Items/e2e/sets.engine.test.ts` (per-clause coverage of the Spec 05e acceptance checklist) + `docs/equipment.md` "Set Items" section. The build plan row was `[skipped]` post-corrective-drain at iterate `322227a`; flips to `[ ]` at phase-brief generation.
- unblocks: Spec 05e acceptance checklist (currently 0/8). The "Reserved for late-game" comment on `Equipment.setMembership` becomes live. Future content authoring (Spec 05c+ equipment templates) can carry set memberships.
- blocked-by: None. Pre-1.0 (0.10.x) permits the engine-side type additions without ceremony.
- score: 4 × 6 / 10 = 2.4 (mid-tier content authoring; not blocking mobile but a real spec gap).

### Phase 50 — Engine handoff for `axiomancer-mobile` (skillLibrary re-export + types.d.ts emission fix)
- promoted: 2026-05-19 (oversight; build-plan queue empty after Phase 49 shipped; user picked cross-repo unblock as the highest-leverage candidate)
- source: `axiomancer-mobile/docs/engine-team-handoff-2026-05-16.md`; filed at expand pass 8 (`aff5a57`) by oversight `e300b8d`
- signal: 3 mobile phases gated on the engine release (`axiomancer-mobile/plan/AUDIT.md` `[needs-engine-release]` row); mobile pinned `axiomancer-mechanics: "0.7.0"` exact. Verified in local working tree: Issue 1 — `grep skillLibrary src/index.ts` returns 0 hits; Issue 2 — `find dist -name types.d.ts` returns only 3 of 9 expected sub-paths. Issue 3 already shipped (`PersistenceAdapter` on barrel).
- scope: Two units. Unit 1 — add `export { skillLibrary, getSkillById } from './Skills';` to `src/index.ts` Skills block + hermetic public-barrel-import test in `src/test-utils/e2e/` asserting both symbols resolve to non-undefined at runtime. Unit 2 — investigate why `types.d.ts` is missing from 6 of 9 `dist/` sub-paths (Combat / Effects / Skills / Game top-level / Character / Enemy / NPCs / World top-level); likely cause is a tsconfig `include` mismatch between working sub-paths (Items / Game/persistence / World/MapEvents) and the missing ones. Apply the fix; verify `find dist -name "types.d.ts" | wc -l` returns 9+; add a smoke assertion (or `scripts/deploy-check.mjs` extension) that pins the count so the regression can't recur silently. Version bump + npm publish lands as a separate user-triggered step after verify is green.
- unblocks: 3 mobile phases (mobile Phase 16 [skipped], candidate 21, candidate 24); the mobile autonomous loop progresses further after the engine bump. Also resolves the broader latent type-emission risk for any external TypeScript consumer.
- blocked-by: None.
- watch: mobile's `axiomancer-mechanics: "0.7.0"` exact pin needs a manual bump after `npm publish`; mobile audit row needs a manual flip after that bump.
- score: 6 × 7 / 10 = 4.2

### Phase 51 — Autosave throttling per Spec 09 Q4
- promoted: 2026-05-19 (oversight; user pick from the older candidate tail — only the code-only candidate of the three was promoted; Northern Continent + befriendable-enemy stay pending as content-arc work that wants user-led design direction)
- source: standing `TODO(spec-09)` comments at `src/Game/store.ts:203` + `src/Game/game.reducer.ts:138`; filed at expand pass 6 (`48a57b7`)
- signal: The TODO has stayed open across ~26 phases since Spec 09. Saves are cheap today (nullAdapter no-op; node.adapter writes a single JSON), but the React Native AsyncStorage consumer (spec.md Primary consumer) will hit the backend on every action. Pre-emptive plumbing before mobile starts shipping save / load surface.
- scope: Pick path (B) restrict-by-action-type — only autosave on a curated set (`COMBAT_ROUND`, `LEVEL_UP`, `END_COMBAT`, `MOVE_TO_NODE`, `APPLY_DIALOGUE`, `SAVE_GAME`); UI-tier actions like prompt navigation never trigger writes. Deterministic policy a reader can audit; action list maps to durable game-state changes anyway. Path (A) time-throttle (`debounce(adapter.save, 500ms)`) considered and rejected at promotion — risks losing the last ~500ms on a crash and is less audit-friendly. Hermetic e2e drives the store through a sequence of actions and counts `adapter.save` invocations across both UI-tier and durable actions.
- unblocks: Pre-emptive readiness for the React Native AsyncStorage backend (paired with the Phase 50 engine handoff so the mobile consumer hits the engine with both fixes already in place). Drains two standing TODO comments. Closes Spec 09 Q4.
- blocked-by: None. Pure store-layer change. Independent of Phase 50; can ship after.
- score: 4 × 6 / 10 = 2.4

### Phase 49 — Enemy-skill caster path (combat depth)
- promoted: 2026-05-19 (oversight; build-plan queue was empty after Phase 48 shipped)
- source: Phase 38 brief's named follow-up direction + Spec 07 elite/boss progression gap; filed at expand pass 7 (`5b37528`)
- signal: Phase 38 brief explicitly named this as the next direction: "the skill caster is always the player in this codebase (`skill.engine.ts` takes a `player: Character` param; there is no `executeSkill(caster: …)`). Future enemy-skill work would change this, but it's not a Phase 38 concern." Spec 07 acceptance says the enemy AI dispatches between `attack` / `defend`; today's `decideEnemyAction` does exactly that and ignores any `skills?: string[]` on Enemy. Elite + boss enemies feel mechanically thin because every fight resolves on the same two verbs. The `learnSkill` + `getAvailableSkills` surface from Phase 30 already exists; this is the symmetric application path. The Phase 45 outlook-bias AI hook is the natural place to read alignment + pick a skill once the caster path is generic.
- scope: Three units. Unit 1 — refactor `executeSkill` to take a `caster: Combatant` and `target: Combatant` (today: `player + enemy` positional args + `targetType: 'self' | 'enemy'` flag). Unit 2 — extend `decideEnemyAction` to optionally pick a skill from the enemy's `equippedSkills` when affordable; route through the (now agnostic) `executeSkill`. Author 1-2 elite / boss enemies with a skill rotation (e.g. Coastal Tyrant gets `argument-from-authority` per spec 04b; pair with the Phase 45 alignment pin so the skill pick reads as in-character). Unit 3 — hermetic e2e drives an enemy-skill-fired round through `resolveCombatRound`; `combat:round` event carries the per-skill `SkillPhaseEvent` for the enemy actor. Update `docs/enemy.md` + `docs/skills.md`.
- unblocks: Combat depth lever. Spec 07 elite / boss progression becomes mechanically distinct. The `ActiveEffect.sourceId` wiring from Phase 38 starts paying off (enemy debuffs now have a real caster). The Phase 44 fallacy-as-spell library starts to read from the enemy side too. Future feature: per-enemy skill libraries by tier.
- blocked-by: None — every prerequisite (Phase 30 learnSkill, Phase 35 Character.id, Phase 38 sourceId wiring, Phase 44 fallacy library, Phase 45 enemy alignment) has shipped.
- score: 6 × 4 / 10 = 2.4 (high value; medium effort because the refactor touches the executeSkill signature + every call site in the resolver path).

### Phase 46 — Alignment-gated content (`requires.alignment` on dialogue + skill learning)
- promoted: 2026-05-16 (oversight; promote-multiple sequence Phase 46/47/48 after the 42-45 follow-up arc closed)
- source: expand pass 7 candidate, filed at `5b37528`; Phase 42 brief Follow-ups
- signal: Phase 42-45 shipped the cube + payloads + enemy pins; nothing gates *content access* on alignment yet. Same-shape extension of the existing `DialogueChoice.requires.flag` and `SkillLearningRequirement.level` gates. Closes the "alignment is observable / payloadable / enemy-side / gates" four-corner triangle.
- scope: Three units. Unit 1 — extend `DialogueChoice.requires` with `requiresAlignment?: { axis, op: 'gte' | 'lte', value: number }`; `visibleChoices` filters by player's `philosophicalAlignment`. Unit 2 — extend `SkillLearningRequirement` with the same shape; `meetsLearningRequirement` checks it. Unit 3 — author 2-3 alignment-gated dialogue branches on Old Marrow / Coastal Beggar + 1-2 alignment-gated Tier 3 skills. Hermetic e2e drives each gate path. Update `docs/philosophy.md` "Authoring gates" subsection.
- unblocks: Makes the cube's mechanical reach asymmetric — different alignments unlock different content.
- blocked-by: Phases 42-45 (all shipped). No code-level prerequisites.
- score: 6 × 5 / 10 = 3.0

### Phase 47 — Knowledge-Gaps acceptance sweep (mirror Phase 41's spec-sweep pattern)
- promoted: 2026-05-16 (oversight; promote-multiple sequence)
- source: expand pass 7 candidate, filed at `5b37528`
- signal: `Knowledge-Gaps.md` carries 25 numbered questions. ~14 entries are either (a) deliberately deferred combat-tuning (Q1/Q2/Q4/Q6) or (b) resolved by shipped phases but never marked. Same drift Phase 41 unit 4 drained for Q15/Q17-Q20.
- scope: One pure-docs phase, 3-4 commit units. Walk every numbered question, classify into deferred / resolved-not-marked / genuinely-open. For resolved entries, write "**Resolved at <spec / phase> (<hash>).**" with shipping references. For new open + actionable entries, file iterate rows.
- unblocks: Knowledge-Gaps.md becomes navigable again. Future critique passes have a cleaner signal floor.
- blocked-by: None. Pure documentation work.
- score: 4 × 8 / 10 = 3.2

### Phase 48 — Effect runtime: apply `statModifiers` + intensity scaling to derived stats (KG Q8 / Q9)
- promoted: 2026-05-16 (oversight; promote-multiple sequence)
- source: expand pass 7 candidate, filed at `5b37528`
- signal: KG Q8 says "the combat math never aggregates `statModifiers` onto the character's stats" and Q9 asks whether they should scale with intensity. The effects JSON authors `statModifiers` payloads on ~66 effects but the runtime never sums them onto `Character.derivedStats` outside the existing `rollModifier` / `defenseModifier` paths. Phase 44 `debuff_no_true_scotsman` (`physicalDefense -2`) sits in this gap.
- scope: Two units. Unit 1 — extend / add `getEffectiveStats(character)` to fold active-effect `statModifiers[]` into derived stats, scaled by intensity when `intensityScalesStatModifiers?: boolean` is set. Thread every `derivedStats` read site through the new helper. Unit 2 — hermetic e2e for buff / debuff stat-modifier effects + intensity scaling. Update `docs/effects.md` Payload Field Reference. Closes KG Q8 + Q9.
- unblocks: Activates ~66 authored `statModifiers`-bearing effects. Phase 44 fallacy debuffs become mechanically real.
- blocked-by: None. Independent of Phases 42-45; can ship after 46 + 47 or interleave.
- score: 6 × 5 / 10 = 3.0

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

### Candidate: Deprecation lifecycle policy
- rejected: 2026-05-20 (expand pass 14; superseded by Phase 52)
- reason: The candidate's Unit 1 scope (codify the deprecation lifecycle in `RELEASING.md` — mark `@deprecated`, ship a CHANGELOG `Deprecated` entry, wait at least one minor bump, remove with a CHANGELOG `Removed` entry) shipped verbatim at Phase 52 unit 2 (commit `be955b2`) as the "Deprecation lifecycle" section in `RELEASING.md`. WorldMap + getCoastalMap are cited there as past examples of the lifecycle. The candidate's optional Unit 2 (`scripts/deploy-check.mjs` scan for `@deprecated` JSDoc tags + warn-line) is forward-looking-only: `grep -rn "@deprecated" src/` returns 0 hits today, so the scan would be empty and the deploy-gate output would gain noise without signal. If the deprecation queue grows post-1.0 graduation (or post-mobile bump if a new deprecation lands), the scan can be added as a focused iterate-tier fix at that point. No standalone phase warranted.

### Candidate: Agent verify reporter polish bundle
- rejected: 2026-05-19 (oversight; superseded by /iterate)
- reason: All 5 items in the candidate's scope shipped via /iterate ticks after Phase 40 closed, under the standing reporter bias. Specifically: (1) `rollup.callouts: string[]` heuristics → `886b862`; (2) slow-failed-tests surface (`slowestFailures: [{name, file, durationMs, status}]`) → `1dbce81`; (3) per-test `location` via `experimental_getRunnerTask` → `8fe314b` (with the lazy-dynamic-import polish at `a799e75`); (4) `--reporter=default` chained alongside the custom reporter → `934cee6`; (5) `durationMs` integer rounding → `5401de4`. The combined-score-15.5 drain happened in 5 commits rather than 1 phase, but the schema is now settled and the reporter polish queue is empty. No follow-on phase needed; future reporter work would be a feature add, not a polish bundle.

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
