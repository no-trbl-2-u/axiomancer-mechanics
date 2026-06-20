# NEEDS_ATTENTION

> Repo-level audit ledger — known debt, half-finished migrations, and
> divergences that are *deliberately not being fixed right now*. Each
> entry names the evidence and the decision that's actually pending.
> Audited 2026-06-12 (post-0.20.0, post dead-code cleanup). Remove
> entries when resolved; date new ones.

> **§1 (Phase 99 skill-loadout migration) — RESOLVED in Phase 159 (2026-06-20).**
> `equippedSkills` was removed entirely from `Character`,
> `CreateCharacterOptions`, `CharacterPreset`, the Tuning loadout builder, and
> the CLI dev-tools (`devEquipSkills` deleted). The v7→v8 save migration still
> folds legacy rotations into `knownSkills` but drops the field. See ADR-0002.

## 2. Character presets: deprecation rescinded, migration never scoped

**What:** the "scheduled for removal at v0.13.0" notices sat stale for
seven minor versions while presets became load-bearing (mobile DEV preset
picker, Playtest runner, Tuning difficulty bands). The deprecation was
rescinded 2026-06-12 (`src/Character/presets.ts` header).

**Pending decision:** either presets are a blessed permanent surface
(then `docs/api.md`'s "Stable" marking is the truth and this entry
closes), or the original intent (dev-tools replace them) gets a real
migration phase for the three consumers.

> **§3 (Phase 137 minigame sims) — RESOLVED in Phase 160 (2026-06-20).**
> All five Phase 137 minigames now have policy sims with codified balance
> bands: `quest-board.sim.ts` (pre-existing), and `rest.sim.ts` +
> `lootcache.sim.ts` shipped this phase with `rest.balance.sim.test.ts` /
> `lootcache.balance.sim.test.ts`. The `rest-tuning` / `loot-cache-tuning`
> skills now have real sims to drive instead of scratch `npx tsx` probes.
> The LootCache sim surfaced a real balance note: with a single probe and
> the richest layer also the deadliest, blind greed matches the prober on
> RAW currency — the prober only wins on RISK-ADJUSTED value (same loot,
> half the bites). Captured in the report's `riskAdjusted` gradient as a
> tuning hook. CLI subcommands (`npm run rest` / `loot-cache`) and the
> hazard `--deck`/`--bag-file` injection remain deferred (see §4); they
> were the conditional "if manual play is wanted" half of the row.

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
