# PHASE_CANDIDATES.md

> Proposed new phases from `/expand`. Reviewed and promoted by
> `/oversight`. Format: `## Pending` → `/oversight` moves to
> `## Promoted` or `## Rejected`.

<!-- Metadata (updated by /expand after each pass):
> Last pass: never (candidates below were seeded via /oversight 2026-05-14)
> Pass count: 0
-->

---

## Pending

### Story content organization workflow
- filed: 2026-05-15 (oversight, user request)
- priority: low (user explicitly noted)
- summary: The user is mapping out the main story in `src/Story/story-overview.md`
  (currently a brain-dump of places/characters/plot). They want a workflow for
  organizing Story / Character synopsis / Dialogue.
- prior art in repo: `skills/story-spec.md` already exists; `specs/story/`
  contains `00-story-spec-template.md`; Phase 14 shipped first named NPC
  (Old Marrow) with moralDelta dialogue.
- open scoping questions for the user:
  1. Should `src/Story/story-overview.md` move to `specs/story/00-overview.md`
     (.md files don't belong inside `src/`)?
  2. Does the workflow want separate templates for **character synopsis**
     (vs. NPC content spec) and **location synopsis**, or fold both into the
     existing story-spec template?
  3. Should `/story-spec` skill be extended to handle character-only and
     location-only flows, or is a new `/character-spec` skill preferred?
  4. Dialogue: keep authored inline in the NPC TS module (current pattern,
     see `src/NPCs/named/old-marrow.ts`), or extract to a dialogue catalogue
     (JSON/TS) with the runtime loading by NPC ID?

### MapEvents implementation
- filed: 2026-05-15 (oversight, user request)
- priority: medium (user wants implementation to begin)
- summary: Implement MapEvents — node-level events that fire when the player
  enters/interacts with a map node. Examples cited: **encounter,
  interaction, gathering, rest**. story-overview.md also implies "Gather
  Events / Map Nodes" as an introduction-of-mechanics moment.
- prior art in repo: `src/World/` has nodes and `processNode`; `src/Game/`
  has the reducer and event surface (Phase 12). Combat already wired through
  encounters. No unified MapEvent abstraction yet.
- open scoping questions for the user:
  1. Event taxonomy: confirm the full list (**encounter, interaction,
     gathering, rest**, anything else? cutscene, hazard, dialogue-spawn,
     loot-cache?).
  2. Resolution model: do MapEvents stack on top of `processNode` (existing
     world entry-point) or replace it with a single `resolveMapEvent` that
     dispatches by type?
  3. Authoring surface: are MapEvents data-defined per node (a `events: []`
     field on WorldNode) or globally registered handlers picked by tag?
  4. Player agency: which events are auto-trigger on entry, which prompt a
     menu, which are repeatable, which are one-shot?
  5. Story integration: should `gathering` events feed inventory directly,
     or emit a story flag the dialogue tree (Phase 14 style) can read?
- recommended phase shape: one engine spec (`specs/13-map-events.md`),
  one engine phase (taxonomy + resolver + e2e), one content phase
  (≥1 of each event type on existing nodes).

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

---

## Rejected

(Empty.)
