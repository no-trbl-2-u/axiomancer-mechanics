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

## 4. The CLI does not play ALL the Phase 137 minigames — RESOLVED (Phase 160c, 2026-06-21)

**What:** `resolveMapEvent` consumers diverge by host. Mobile intercepts
rest / gathering / loot-cache / hazard / quest results and launches the
minigames. The CLI now has standalone play loops for **gathering** (`npm
run gathering`), **hazard** (`npm run hazard`), **rest** (`npm run rest`,
The Night Watch — Phase 160b), **loot-cache** (`npm run loot-cache`,
The Reliquary — Phase 160b), and **quest-board** (`npm run quest-board`,
The Boy's Almanac — Phase 160c). The hazard harness also takes injected
decks (`--deck` / `--bag-file`). Every Phase 137 minigame engine now has a
Node play loop.

> **Phase 160b (2026-06-20)** shipped the Rest + LootCache play loops and
> the hazard deck injection (`--deck`/`--bag-file` + utility-aware-bot
> coverage); the QuestBoard loop was carved to Phase 160c.
> **Phase 160c (2026-06-21)** shipped `src/CLI/quest-board.cli.ts`
> (`npm run quest-board`, The Boy's Almanac — `--policy
> safe|gambler|economist`, `--board <id>`, charms/vows/bone-rolls/nine
> space kinds/dusk, `--auto` reusing the `quest-board.sim.ts` policy
> shapes), wired as a `game.cli.ts` subcommand and covered by
> `src/CLI/e2e/quest-board.cli.engine.test.ts` (flag parsing, deterministic
> `--auto` replay, illegal-action logging; added to the hermeticity IO
> allowlist). §4 closed.

> **§5 (Engine-side map-event content shadowing) — engine half RESOLVED in
> Phase 161 (2026-06-21).** `content.ts` is now the engine's single authored
> source of truth, registering through one idempotent
> `registerMapEventContent()`. The intra-file divergence is gone: the legacy
> fishing-village pool block (Phase 23/24/65/115 — shops/shrines/ferry slips)
> was registered then silently clobbered by the 2026-06 new-player override
> block (overrides are last-write-wins), so it could never fire even via the
> CLI; Phase 161 removed it. The new-player layout is the canonical
> fishing-village map; northern-forest is unshadowed and carries the
> village/cutscene/interaction/loot-cache kinds, preserving the all-8-kind
> invariant. A no-shadow guard (`getShadowedNodeOverrideKeys()` +
> `content-parity.engine.test.ts`) fails the build if any node is authored
> twice again. **The cross-repo half remains open:** the mobile host still
> registers its own per-node overrides for every node
> (`state/exploration-maps/event-pools.ts`), shadowing the engine pools in the
> mobile app. That decision (mobile consumes the engine source, or keeps its
> own and the engine ships CLI-demo content only) lives in mobile's
> NEEDS_ATTENTION.md §3 and is out of scope for this repo.

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
