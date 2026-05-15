# PHASE_CANDIDATES.md

> Proposed new phases from `/expand`. Reviewed and promoted by
> `/oversight`. Format: `## Pending` → `/oversight` moves to
> `## Promoted` or `## Rejected`.

<!-- Metadata (updated by /expand after each pass):
> Last pass: 2026-05-15 at commit 06c5446
> Pass count: 1
-->

---

## Pending

### Phase 25 (provisional) — Remove legacy `processNode` + MapEvent types
- source: Phase 24 scope deviation (deferred from Spec 23 Q7)
- priority: medium
- summary: Delete `src/World/process-node.ts`, the `MapEvent` and
  `MapEventType` types, the `nodeEvents` field on `MapDefinition`,
  and the `npc` / `shop` kinds. Rewrite the ~10 `processNode`-pinned
  cases in `src/World/e2e/world.engine.test.ts` to drive
  `resolveMapEvent` instead. Strip the legacy exports from the world
  barrel and `src/index.ts`. Mechanical but high-volume; the
  Phase 24 content is the substitute behaviour.
- blocking: nothing — Phase 24 already migrated content and the
  game store / CLI.
- acceptance: `grep -rn "processNode\|MapEvent\b\|MapEventType" src/`
  returns zero hits; the world e2e suite is green using only the
  new dispatcher.

### Candidate: docs/api.md refresh post-Phase 21
- signal: `docs/api.md:28-31` still lists `CombatStartedPayload`,
  `createCombatStartedEvent`, etc. as Beta exports — but Phase 21
  deleted the payload interfaces and the seven `create*Event`
  factories. Anyone reading the public API doc today gets a list
  of names that no longer exist in the package.
- scope: Rewrite the "Events (Beta)" section to match the
  post-Phase-21 surface (`EnginePayload`, the 10 `Typed*Event`
  aliases, the 10 `is*Event` guards). Sweep the rest of the doc
  for similar drift (Phase 17 dropped commander; Phase 18 added
  the preset roster; Phase 23 added the MapEvents engine and
  pool registration helpers; Phase 24 added pool content).
- unblocks: trustworthy public-API doc that consumers can rely on
  when integrating against the package.
- blocked-by: none.
- score: 9 × 8 / 10 = 7.2
- recommended-slot: next (highest-priority pending candidate)

### Candidate: Persistence adapter hermetic tests
- signal: `plan/CRITIQUE.md` Pending MED — "Game/persistence has
  zero tests despite owning the save-file format". The Node adapter
  does fs reads/writes and is invoked on every dispatch (autosave);
  malformed-JSON fallback and file-not-found behaviour are entirely
  untested.
- scope: Add `src/Game/persistence/node.adapter.test.ts` with three
  hermetic cases — round-trip save/load via a tmpfile path, load
  returns null when file missing, load returns null and warns when
  file is malformed JSON. Move the CRITIQUE finding to Done.
- unblocks: confidence in the save-file path before any consumer
  takes a hard dependency on it.
- blocked-by: none.
- score: 6 × 7 / 10 = 4.2
- recommended-slot: after Phase 25

### Candidate: Tier 2 / Tier 3 skill content polish
- signal: `spec.md` 6-month horizon — "Additional skill tiers
  (Tier 2+)". The library at `src/Skills/skill.library.ts` already
  ships 3 tier-2 + 3 tier-3 entries, but they're placeholder
  numbers; the Resonance Pairs design in
  `braindump/BRAINDUMP.md` ("Decided / leaning: Option C") never
  got wired into the actual skill payloads. The 12 skills exist;
  the *flavor* and *balance* of the higher tiers does not.
- scope: Run a balance pass over the 6 tier-2 + tier-3 skills;
  refine resource costs to match the Resonance Pairs vision (Tier
  2 = mixed-stance gates, Tier 3 = mind + philosophical-token
  gates). Author 3-4 line flavour text per skill. Update
  `docs/skills.md` to document the resource progression model.
- unblocks: a more readable mid-to-late-game skill library; the
  philosophical-resource economy from braindump becomes legible
  in code.
- blocked-by: none — content-only.
- score: 6 × 6 / 10 = 3.6
- recommended-slot: low-priority sometime after the
  cleanup-of-legacy phase

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
