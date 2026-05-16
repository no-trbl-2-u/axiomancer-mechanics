# PHASE_CANDIDATES.md

> Proposed new phases from `/expand`. Reviewed and promoted by
> `/oversight`. Format: `## Pending` → `/oversight` moves to
> `## Promoted` or `## Rejected`.

<!-- Metadata (updated by /expand after each pass):
> Last pass: 2026-05-15 at commit e90aa22
> Pass count: 3
-->

---

## Pending

### Candidate: Shop economy — `village` MapEventKind buy/sell loop
- signal: `Character.currency` ships (Spec 08 Q8) but no shop reducer
  exists; `docs/items.md` Pending block lists it; Phase 23's `village`
  MapEventKind is the anchor that's been waiting for a transactional
  partner. `spec.md` 6-month horizon names "shops" explicitly. AUDIT
  bias is currently `gameplay` (per `/oversight` 2026-05-15).
- scope: New `src/Items/shop.reducer.ts` (or `src/World/shops.ts`)
  exporting `buyItem(character, inventory, itemId, price)` and
  `sellItem(character, item, price)` — pure reducers that decrement /
  increment `currency` and add / remove items, returning the updated
  character. Wire into the `village` MapEventHandler so resolving a
  `village` node opens a shop UI in the Map tab (item list + buy/sell
  prompts). Author 1-2 starter shop inventories on `fv-3` and the
  Northern City stub once it lands; otherwise reuse `consumableLibrary`
  for the demo pool. Hermetic e2e: buying decrements currency and adds
  the item; selling does the reverse; insufficient currency returns the
  character unchanged.
- unblocks: the curreny / consumable / equipment economy actually
  closes the loop. `Character.currency` becomes meaningful. The
  Northern Continent stub gains a natural use for `village` nodes. Quest
  rewards that grant currency become spendable.
- blocked-by: none. `village` MapEventKind already ships; `currency` is
  on `Character`; `consumableLibrary` is a stable source pool.
- score: 6 × 7 / 10 = 4.2
- recommended-slot: next after the Northern Continent stub (or before,
  if the user wants the shops to land alongside fv-3 content)

### Candidate: Combat sub-event surfacing in agent-e2e state log
- signal: `plan/CRITIQUE.md` MED Pending row — "agent-e2e grader is
  blind to fine-grained combat sub-events". The grader sees
  `{ playerAction, enemyAction, eventCount }` but not the
  `combatEvents: RoundEvent[]` array, so walkthroughs like `item-use`
  have to infer skill / item / effect outcomes from inventory + HP
  deltas instead of reading the actual `phase:skill / kind:item-used /
  kind:effect-application` sub-events. The finding has been on the
  queue since pass 7-follow-up and is the only MED pending after Phase
  34 drained the docs queue.
- scope: extend the `combatRound` `logState` payload in
  `src/CLI/game.cli.ts` to include the full `combatEvents` array (or a
  JSON-safe projection — strip closures, keep all primitives). Mirror
  on the `combat:round` GameEvent payload so React Native consumers
  can subscribe to round-by-round detail. New hermetic test in
  `src/CLI/e2e/io.engine.test.ts` asserting a scripted skill round
  populates the array. State log budget: ~12 KB for 50 rounds at ~50
  bytes/event — well inside the existing budget.
- unblocks: every existing walkthrough's goal file can read what the
  skill / item / effect actually did, not just the action name. Future
  walkthroughs gain richer grading signal without changes to the grader
  itself. The `combat:round` event surface becomes useful for an RN
  combat-log UI.
- blocked-by: none. The events are already produced by the resolver;
  this is plumbing through the log writer + event payload.
- score: 6 × 7 / 10 = 4.2
- recommended-slot: convenient mid-priority slot; no content
  dependency, ships in one or two units

### Candidate: Friendship victory reward (XP + narrative tag)
- signal: Knowledge-Gaps Q5 (friendship rewards/narrative outcome) is
  still open. Spec 06 Q2 backfill confirmed friendship-counter exits
  currently report as `'flee'` and grant 0 XP — the deliberate 50%
  bonus from the proposed formula was NOT implemented. Phase 32 closed
  the crit half of Q3 but left friendship outcomes untouched. Gameplay
  bias on AUDIT.md points toward mechanics findings like this.
- scope: route the friendship-counter exit through a `'friendship'`
  outcome in `determineCombatEnd` (today it reports `'flee'`); have
  `endCombat` grant `floor(enemy.xpReward * 0.5)` XP on that path; add a
  `combat:ended` event field `outcome: 'victory' | 'ko' | 'flee' |
  'friendship'` (currently the four-value union but `'friendship'` is
  never set). Hermetic e2e: the existing friendship-counter test in
  `combat.resolver.test.ts:60-78` extends to assert the new outcome
  string and the XP grant. CLI surface: when `npm run game` reports
  combat end, distinguish "befriended" from "fled" in the transcript.
- unblocks: friendship becomes a real mechanical choice with a
  scoreable outcome, not just a stalemate exit. Moral-meter consumers
  (Spec 10) can react to friendship resolutions distinctly. The Q5
  / Q2 Knowledge-Gaps rows close.
- blocked-by: none. Pure additive — every change is on the existing
  combat-end resolution path.
- score: 5 × 7 / 10 = 3.5

---

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

(Empty.)
