# Releases

Short-form per-version summaries. For per-phase detail see
[`CHANGELOG.md`](./CHANGELOG.md); for the release-cut ceremony see
[`RELEASING.md`](./RELEASING.md).

## 0.12.0 — 2026-05-26

Skills always-land mechanic shift + event system cleanup.

- **Phase 80** — Skills always-land effects (direction (a) pure split): Tier 2 debuffs + Tier 3 effects always land, target-resist rolls removed
- **Phase 84** — Skill "fizzle" event + UX scrub: `SkillEvent` cleanup with `effect-resisted` → `buff-fumbled` rename
- **Phase 88** — Effect coverage audit sweep + library consolidation
- **Phase 89** — Front-door docs fold-in for mobile consumer guidance
- **BREAKING:** `EffectApplicationResult.rebounded` field removed, `SkillEvent` variant renames
- Public-surface: 233 fixtures (+8 from v0.11.0), 158 types (stable)
- 615/615 tests passing, verify + deploy gates clean

## 0.11.0 — 2026-05-23

Friendship-mechanic expansion + GH#65 mobile aftermath trio.

- **Phase 68** — Per-enemy `BefriendabilityConfig` predicate
  (override of the Phase 36 friendship-eligibility check); first
  boss-tier authored config on `CoastalTyrant`.
- **Phase 69** — `FriendshipReward.alignmentDelta` extension; closes
  Spec 14 Q4 (friendship-victory ↔ alignment-cube intersection).
- **Phase 70** — Boss-tier `friendshipReward` content authoring on
  `CoastalTyrant` (`paradox-loop` unique + xpBonus 75 + multi-
  paragraph narrative + combined-axis `alignmentDelta` + `flagSet`).
- **Phase 71** — Per-foe aftermath narrative prose
  (`finalBlowLines` / `pactLines` / `causeLines` on `Enemy`).
  Closes GH#65 ask 1.
- **Phase 72** — Run-loop semantics: `store.resetRun({ keepCharacter })`
  + required `GameState.runId` + `generateRunId` helper +
  `STARTING_REGION` constant. `GAME_STATE_VERSION` bumped 5 → 6
  with `migrateV5toV6`. Closes GH#65 ask 2.
- **Phase 73** — Codex / journal-entry surface: required
  `GameState.codex` slice + per-foe `Enemy.journalEntry?` +
  `store.unlockCodexEntry` + auto-firing wire on friendship
  outcomes. `GAME_STATE_VERSION` bumped 6 → 7 with `migrateV6toV7`.
  Closes GH#65 ask 3.

Public surface delta: **+5 type exports** (`FinalBlowLines`,
`PactLines`, `CauseLines`, `CodexEntry`, `CodexState`) +
**+2 runtime exports** (`generateRunId`, `STARTING_REGION`).
Fixture 233+161 → **235+167**. Tests 670 → **697**.

## 0.10.3 — 2026-05-20

Befriendable-enemy content + Tier 2 synergy skills + quest-branch
wiring.

- **Phase 60** — `Enemy.friendshipReward?: FriendshipReward`
  (`items` / `xpBonus` / `narrative` per-enemy reward content).
  Two authored normal-tier befriendable enemies (`MournfulGull` +
  `HollowEyedBeggar`).
- **Phase 62** — `FriendshipReward.flagSet?: string` quest-branch
  wiring through existing `DialogueChoice.requires.flag` machinery.
- **Phase 66** — Tier 2 synergy skills (5 patterns + `SkillSynergy`
  + `SynergyPredicate` clause).

Public surface delta: 158 → 161 type exports.

## 0.10.2 — 2026-05-20

`PersistenceAdapter` ergonomics + CI verify-on-PR + enemy rotation
content sweep.

- **Phase 55** — `PersistenceAdapter` ergonomics (closes mobile
  GH#64 Issue 3).
- **Phase 56** — CI verify-on-PR workflow (GitHub Actions).
- **Phase 57** — Enemy skill rotation content sweep (7 of 16
  registry enemies now carry authored skills).

## 0.10.1 — 2026-05-20

Release-process artifacts + public-surface snapshot machinery.

- **Phase 52** — Release process artifacts (`RELEASING.md` +
  `scripts/deploy-check.mjs`).
- **Phase 53** — Public-surface snapshot
  (`scripts/snapshot-public-surface.mjs` +
  `scripts/diff-public-surface.mjs` + the
  `scripts/public-surface.expected.json` fixture deploy-gate
  contract).
- **Phase 54** — Spec 05e set items implementation.

## 0.10.0 — 2026-05-19

First release under the autonomous-loop era. Engine handoff for
mobile consumption (closes GH#64 Issues 1 + 2).

- **Phase 50** — Engine handoff: `skillLibrary` top-level
  re-export + `getSkillById` + hermetic public-barrel test;
  rename `types.d.ts` → `types.ts` × 10 files; deploy-check count
  guard.
- **Phase 51** — Autosave throttling: `DURABLE_ACTIONS` gate
  ensures only durable mutations fire `adapter.save()`
  (`COMBAT_ROUND` / `LEVEL_UP` / `END_COMBAT` / `MOVE_TO_NODE` /
  `APPLY_DIALOGUE` / `SAVE_GAME`).

Removed: `getCoastalMap` (replacement: `getMapDefinition(...)` +
`createMapState`). Migration notes in CHANGELOG `[0.10.0]`
`### Removed` block.

## 0.9.0 — 2026-05-16

Phase 39 + 40 agent-vitest reporter (`automation/agent-vitest-reporter.mjs`)
+ `failures[]` extension + slowest-failure callout.

## 0.8.0 — 2026-05-16

Phase 37 (shop economy) + Phase 38 (named-NPC dialogue authoring).

## 0.7.0 — 2026-05-15

Phase 36 (friendship-victory mechanics — `outcome: 'friendship'` on
`combat:ended`, half-XP grant, full loot, +1 moralMeter).

## 0.6.0 — 2026-05-15

Phase 34 (docs sweep) + Phase 35 (`Character.id` auto-generation via
`getRng()` — RN-safe, no `crypto` dependency).

## 0.5.0 — 2026-05-13

First post-loop content release: Phase 23 (MapEvents engine + node
discovery) + Phase 24 (MapEvents content) + Phase 25 (legacy
MapEvent surface removal).

## 0.2.0 — 2026-05-08

First published npm release (pre-loop). Specs 01 through 12
shipped + Phases 09 through 22.
