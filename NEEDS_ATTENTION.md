# NEEDS_ATTENTION

> Repo-level audit ledger — known debt, half-finished migrations, and
> divergences that are *deliberately not being fixed right now*. Each
> entry names the evidence and the decision that's actually pending.
> Audited 2026-06-12 (post-0.20.0, post dead-code cleanup). Remove
> entries when resolved; date new ones.

## 1. Phase 99 skill-loadout migration is half-finished

**What:** Phase 99 shipped unlocked-skill access (`knownSkills` is the
combat catalogue), but the legacy `equippedSkills` field was deprecated,
not removed. Still alive: the field on `Character`
(`src/Character/types.ts`), the preset field, `devEquipSkills`
(`src/CLI/dev-tools.ts` — `@deprecated` yet wired to the live CLI menu
entry "Unlock skills (legacy)"), and the Tuning loadout builder
(`src/Tuning/loadout.builder.ts:115`).

**Pending decision:** finish the removal (touch Character type, presets,
CLI menu, Tuning builder, save migration v8 path) or formally bless the
field as a permanent compatibility surface. Until then every audit
re-discovers it.

> **Promoted to Phase 159** via oversight 2026-06-20 (Q1: T pick). The
> decision (finish removal vs. bless) is made there. Close this entry when
> Phase 159 ships.

## 2. Character presets: deprecation rescinded, migration never scoped

**What:** the "scheduled for removal at v0.13.0" notices sat stale for
seven minor versions while presets became load-bearing (mobile DEV preset
picker, Playtest runner, Tuning difficulty bands). The deprecation was
rescinded 2026-06-12 (`src/Character/presets.ts` header).

**Pending decision:** either presets are a blessed permanent surface
(then `docs/api.md`'s "Stable" marking is the truth and this entry
closes), or the original intent (dev-tools replace them) gets a real
migration phase for the three consumers.

## 3. The Phase 137 minigames have no sims or CLIs

**What:** Hazard and Gathering each have a policy sim
(`hazard.sim.ts` / `gathering.sim.ts`), codified balance bands, and a CLI
subcommand. QuestBoard, Rest, and LootCache (Phase 137) have hermetic e2e
suites only. Their tuning skills (`quest-board-tuning`, `rest-tuning`,
`loot-cache-tuning`) currently prescribe scratch `npx tsx` policy probes
and each names the missing sim as a standing propose-only suggestion.

**Pending work:** `quest-board.sim.ts`, `rest.sim.ts`, `lootcache.sim.ts`
with policy bands in e2e, plus CLI subcommands if manual play is wanted
(`npm run quest-board` etc., mirroring `npm run gathering`).

> **Promoted to Phase 160** via oversight 2026-06-20 (Q1: T pick). Folds in
> the standing Hazard sim harness candidate (utility-deck CLI injection;
> the `ts-node` game.cli.ts:185 break was separately resolved on main).
> Close this entry when Phase 160 ships.

## 4. The CLI does not play the Phase 137 minigames

**What:** `resolveMapEvent` consumers diverge by host. Mobile intercepts
rest / gathering / loot-cache / hazard / quest results and launches the
minigames; the CLI (`src/CLI/game.cli.ts`) still consumes the passive
handler results (flat heal, silent grant, flat hazard damage) and has no
play loop for the quest board, the night watch, or the reliquary.
Documented as host divergence in `docs/world.md` §Node Event Dispatcher,
but the CLI experience is now meaningfully poorer than mobile's.

**Pending decision:** port the minigame loops to the CLI (the engines are
pure — it's all rendering), or declare the CLI a combat/balance harness
that intentionally skips encounter minigames.

> **Promoted to Phase 160** via oversight 2026-06-20 (Q1: T pick), bundled
> with §3 (the CLI play loops ride on the same sims work). Close when Phase
> 160 ships.

## 5. Engine-side map-event content is fully shadowed by mobile

**What:** `src/World/MapEvents/content.ts` (~900 lines) registers rich
per-node pools for fishing-village and northern-forest on module load.
The mobile host then registers its OWN per-node overrides for **every**
node in both layouts (`state/exploration-maps/event-pools.ts`), so in the
mobile app none of the engine's authored pools — including every authored
`village` and `cutscene` event — can ever fire. Two content registries
describe the same two maps and silently diverge; the engine one only
reaches players via the CLI.

**Pending decision:** pick a single source of truth for map-event
content (engine authors, mobile consumes — or mobile authors, engine
content.ts shrinks to CLI demo data). Cross-filed in mobile's
NEEDS_ATTENTION.md §3 since the fix has a foot in each repo.

> **Promoted to Phase 160** via oversight 2026-06-20 (Q1: T pick). Cross-repo;
> the source-of-truth decision is made there. Close when Phase 160 ships.

## 6. Quest board story integration is cosmetic by design — for now

**What:** completing `build-the-boat` records
`quest-board-done:<id>:<tier>` in flags and nothing else (decided
2026-06-12: "cosmetic for now"). The quest-LOG system
(`quest.library.ts` / `quest.engine.ts`) and the quest-BOARD registry are
intentionally separate surfaces; no quest-log quest accompanies the
board, and no travel gating reads the flag. Only one board exists; story
beats 2+ (gather-wood, find-blacksmith, …) are unauthored.

**Pending work (when story gating is wanted):** wire the completion flag
into objectives/unlocks, author the next boards, and decide whether a
board completion should also advance a quest-log quest.

## 7. Legacy `DialogueMap` retained for back-compat

**What:** `src/NPCs/types.ts` keeps the flat string-keyed `DialogueMap`
alongside `DialogueTree`, documented as legacy. Fine while old NPC
content exists; worth a sweep to count remaining `dialogue:` (flat)
authoring vs `dialogueTree:` before anyone builds new tooling on the old
shape.

## 8. Untracked `.cursor/skills/oversight/SKILL.md`

**What:** an untracked Cursor skill file sits in the working tree (not
authored by the agent loops; predates 2026-06-12). It is not gitignored,
so it shows up in every `git status`.

**Pending decision (user's):** commit it or add `.cursor/` to
`.gitignore`.
