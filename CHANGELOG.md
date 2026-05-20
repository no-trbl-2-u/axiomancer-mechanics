# Changelog

All notable changes to `axiomancer-mechanics` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Pre-1.0.0 status: minor bumps may carry breaking public-API changes
(deprecation lifecycle per `RELEASING.md`). The `package.json` `exports`
map exposes `.` (top-level barrel) and `./node` (Node.js adapter); no
deep imports are part of the supported surface.

## [0.10.1] — unreleased

Engine handoff to `axiomancer-mobile`, autosave throttling, release-process
artefacts, public-surface contract enforcement, Set items engine. The first
published version under the CHANGELOG-tracked release process.

### Added
- Top-level barrel re-exports `skillLibrary` + `getSkillById` from
  `./Skills` (Phase 50 unit 1). External consumers
  (`import { skillLibrary } from 'axiomancer-mechanics'`) now resolve to
  the live skill library instead of `undefined`.
- Top-level barrel re-exports the 4 Combat aggregators
  `getActiveEffectModifiers`, `getEffectiveStats`, `canAct`,
  `resolveEffectiveAdvantage` + types `AggregatedEffectModifiers`,
  `EffectiveStats` (iterate `7ee0745`). `docs/effects.md` "API at a
  glance" is now reachable from the public barrel.
- `defaultSellPrice(ware: ShopWare): number = Math.floor(ware.price / 2)`
  engine helper in the Items barrel (iterate `3ba5319`). Replaces the
  CLI-side `Math.max(1, ...)` floor that enabled a buy/sell exploit on
  price-≤-2 wares.
- `dist/<Module>/types.d.ts` now emits for all 11 modules (Phase 50 unit
  2). Pre-fix only `Items` emitted; the other 10 modules' `types.d.ts`
  files were authored as `.d.ts` and tsc silently skipped them. Rename
  to `types.ts` was the fix.
- **Set items engine (Phase 54).** New top-level barrel exports:
  - Types: `SetBonus`, `ItemSet`.
  - Engine helpers: `getActiveSetBonuses`,
    `getActiveSetBonusesForCharacter`, `aggregateSetStartTokens`,
    `applySetGenerationBonus`, `getActiveSetPassiveEffectIds`,
    `getEquippedItemSets`.
  - Library: `itemSetLibrary` + `getItemSetById`.
  - Authored sets in `itemSetLibrary`: Wanderer's Road (2-piece
    sandals + leather-cap → `+2 heart` start tokens); Iron Discipline
    (3-piece leather-cap + cloth-wrap + cloth-gloves → `+3
    physicalDefense` at 2, `+1 body/any` at 3); Scholar's Circle
    (2-piece copper-ring + leather-cap → `+2 mind` start tokens +
    `buff_critical_rate_up` passive).
  - Set bonuses are computed on-demand at `initializeCombat` +
    `generateBasicActionResources`; set `passiveEffects` apply as
    combat-lifetime `ActiveEffect`s with `remainingDuration: -1` and
    `sourceId: 'set-bonus'` (`tickAllEffects` skips the tick).
- **CHANGELOG.md + RELEASING.md** (Phase 52 — this document, plus the
  bump-and-publish flow doc at the repo root with deprecation
  lifecycle policy).
- `scripts/deploy-check.mjs` gains three new assertions across this
  release:
  - `dist/<Module>/types.d.ts` count guard (Phase 50 unit 2 — fails the
    gate if the count drops below the source-side `types.ts` count).
  - Tag / CHANGELOG agreement (Phase 52 unit 2 — fails the gate if
    `git describe --tags --abbrev=0` doesn't match the top tagged
    `## [X.Y.Z]` heading in `CHANGELOG.md`; `(unreleased)` headings are
    skipped).
  - Public-surface fixture drift (Phase 53 unit 2 — fails the gate if
    the snapshot of `dist/index.d.ts` diverges from the committed
    fixture at `scripts/public-surface.expected.json`).
- **Public-surface tooling (Phase 53).**
  `scripts/snapshot-public-surface.mjs` reads `dist/index.d.ts` and
  emits the deterministic-sorted JSON contract.
  `scripts/diff-public-surface.mjs <ref-A> <ref-B>` pretty-prints
  Added / Removed / Changed-kind in markdown form for direct paste
  into a CHANGELOG entry. The committed fixture
  `scripts/public-surface.expected.json` captures the current public
  barrel (233 values + 158 types as of this release).

### Changed
- **Autosave policy** (Phase 51) — `src/Game/store.ts` restricts
  write-through to a curated `DURABLE_ACTIONS` allowlist
  (`COMBAT_ROUND`, `LEVEL_UP`, `END_COMBAT`, `MOVE_TO_NODE`,
  `APPLY_DIALOGUE`, `SAVE_GAME`). UI-tier actions (`USE_ITEM`,
  `EQUIP_ITEM`, `ALLOCATE_STAT_POINT`, `LEARN_SKILL`,
  `SHIFT_MORAL_METER`, `SHIFT_PHILOSOPHICAL_ALIGNMENT`,
  `START_COMBAT`, `PROCESS_NODE`, `LOAD_GAME`) no longer trigger
  autosave. The constant is internal to `src/Game/store.ts` (not on
  the public barrel); consumers see fewer writes, not a different
  payload. `store.save()` and `updateCombat()` keep their
  unconditional writes per the Phase 51 brief D2 / D3.
- **`scripts/deploy-check.mjs`** is now a meaningful gate, not just an
  `npm pack` wrapper — it runs three structural assertions before the
  pack dry-run (types.d.ts count, tag/CHANGELOG match, public-surface
  drift).
- `src/Items/e2e/equipment.engine.test.ts` "Game store lifecycle"
  assertion flipped: `equipItem` / `unequipItem` no longer call
  `adapter.save` under the Phase 51 DURABLE_ACTIONS policy. (Test
  assertion correction, not an API change.)

### Fixed
- **Phase 54 Scholar's Circle set passive expiry** (iterate
  `f250ce4`). The initial Phase 54 ship applied set-bonus
  `passiveEffects` via `applyEffect` with no duration override, which
  let the passive (`buff_critical_rate_up`, default duration 4) expire
  mid-combat at round 5 — violating Spec 05e Q4. The fix constructs
  the ActiveEffect directly with `remainingDuration: -1` (the engine's
  infinite-duration sentinel that `tickAllEffects` skips), so set
  passives survive arbitrary combat lengths. Combat-end cleanup
  discards the cloned player, so persistence stays naturally
  combat-scoped.

### Migration notes
- **Consumers using `import { skillLibrary } from 'axiomancer-mechanics'`**
  can drop any local stop-gap re-declarations (e.g. mobile's
  `state/mocks/combat.skills.fixture.ts`). The import resolves to the
  live library as of 0.10.1.
- **Consumers persisting saves through `adapter.save`** see no schema
  change; the savings come from fewer write calls, not from a different
  payload. Any UI relying on "every action writes to disk" should
  invoke `store.save()` explicitly when it needs a checkpoint.
- **Consumers building custom equipment-screen UIs** may want to import
  the new Phase 54 surface (`getEquippedItemSets` for an "active sets"
  summary, including partial counts).
- **Future release authors**: `node scripts/diff-public-surface.mjs
  <prior-tag> HEAD` (once the fixture exists at both refs) emits the
  Added / Removed bullets in markdown ready to paste here. The
  `v0.10.0` predecessor doesn't carry the fixture, so this release's
  bullets were authored from the per-phase briefs; from `0.10.1`
  forward, the diff tool is the canonical source.

## [0.10.0] — 2026-05-19

The Philosophy bundle (Phases 42-49). Adds the 3-axis alignment cube +
content authoring surfaces + enemy-skill caster path. Breaking removals
for `WorldMap` and `getCoastalMap`.

### Added
- **Philosophy module (Phases 42-46).** New top-level barrel exports:
  - Engine: `bucketAxis`, `getAlignmentCell`, `applyAlignmentDelta`,
    `defaultAlignment`.
  - Constants: `AXIS_HIGH_THRESHOLD`, `AXIS_LOW_THRESHOLD`.
  - Library: `philosophicalAlignmentLibrary` (27 cells, each with
    philosopher + literary character + 3 signature fallacies).
  - Types: `PhilosophicalAlignment`, `AxisBucket`, `AlignmentFallacy`,
    `PhilosophicalAlignmentCell`, `AlignmentGate`.
- `GameState.philosophicalAlignment: PhilosophicalAlignment` field
  (Phase 42). `GAME_STATE_VERSION` bumped 4 → 5;
  `migrateV4toV5` defaults legacy v4 saves to
  `{ epistemology: 0, outlook: 0, scope: 0 }`.
- `SHIFT_PHILOSOPHICAL_ALIGNMENT` action + store action
  `shiftPhilosophicalAlignment(delta)` mirroring `shiftMoralMeter`.
- **Authoring surfaces (Phase 43).**
  `DialogueChoice.effect.alignmentDelta?: Partial<PhilosophicalAlignment>`
  +
  `MapEventPoolEntry.alignmentDelta?: Partial<PhilosophicalAlignment>`.
  Surfaced on `ApplyDialogueChoiceResult.effects.philosophicalShift`
  and `ResolveMapEventResult.effects.philosophicalShift`.
- **Fallacies-as-spells (Phase 44).** `Skill.sourcedFromCell?: string`
  + `Effect.sourcedFromCell?: string` cross-link. 4 new Tier 3 fallacy
  skills (`appeal-to-consequences`, `nirvana-fallacy`, `pascals-wager`,
  `appeal-to-fear`); 3 new fallacy status effects
  (`debuff_no_true_scotsman`, `buff_special_pleading`,
  `debuff_category_error`).
- **Enemy alignment + outlook AI bias (Phase 45).**
  `Enemy.philosophicalAlignment?: PhilosophicalAlignment` field;
  outlook-driven flip between `attack` ↔ `defend` per
  `applyOutlookBias` (internal helper; not on the public barrel).
- **Alignment-gated content (Phase 46).**
  `DialogueChoice.requires.requiresAlignment?: AlignmentGate` +
  `SkillLearningRequirement.requiresAlignment?: AlignmentGate`.
  Optional `alignment` parameter on `meetsLearningRequirement`,
  `getAvailableSkills`, `learnSkill`. Optional
  `DialogueContext.alignment?` field on `visibleChoices`.
- **Enemy-skill caster path (Phase 49).** `executeSkill` 4th argument
  `casterSide: 'player' | 'enemy'` (default `'player'`).
  `decideEnemyAction` now consults `pickEnemySkill(enemy)` before
  per-strategy dispatch. 2 authored enemy rotations (Argumentative
  Crow → `false-dilemma`, Coastal Tyrant → `achilles-gambit`).
- `ActiveEffect.sourceId?: string` (Phase 38). Last-writer-wins
  stacking on intensity / duration; tracks which item / skill /
  passive applied the effect.
- `selectCritDamage(base, reduction, bonus)` Combat helper for crit
  damage preview UIs (Phase 32 era; re-exported for power-user
  consumers).
- `buyItem` / `sellItem` shop reducers + types `ShopWare` /
  `ShopInventory` (Phase 37).
- `unlockAdjacent` world reducer (Phase 31). Discovery shifts the
  fog; unlocking lets the CLI / UI actually offer the next ring as
  navigable.
- Spec 23 (map-events) acceptance fully ticked through Phase 41 unit 3
  + Phase 43 `alignmentDelta`.

### Changed
- `executeSkill` signature gained optional `casterSide` (Phase 49 D1).
  Default `'player'` — backwards-compatible for all pre-0.10.0
  callers.
- `ApplyEffectOptions` gained optional `sourceId` (Phase 38). Additive;
  the field is `undefined` when callers omit it.

### Removed
- **`WorldMap` type** (commit `a707316`). Replacement is
  `MapDefinition` + `MapState`, the canonical split since Phase 23. No
  in-repo consumers; mobile didn't import it.

### Migration notes
- **Persisted `GameState`** gains `philosophicalAlignment`.
  `migrateV4toV5` runs automatically on `load()`; v4 envelopes default
  to `{ epistemology: 0, outlook: 0, scope: 0 }`. Consumers persisting
  via `adapter.save` see the new field on every save going forward.
- **`WorldMap` removal** is a public-barrel deletion. Replace with
  `MapDefinition` + `MapState`.

## [0.9.0] — 2026-05-16

Phases 26 → 38 surface. CLI consolidation, RN-targeted event
emitter, ActiveEffect.sourceId wiring, agent-graded test harness.

### Added
- Phase 26: `src/CLI/game.cli.ts` consolidated CLI driver with
  tabbed interface (Map / Combat / Character / Inventory / Save / Load
  / Debug). Replaces the per-feature CLIs.
- Phase 27: `--save-file <path>` flag + Save / Load tabs surface the
  persistence layer as a user-facing save slot.
- Phase 28-29: Character progression (Phase 28 levelling math, Phase
  29 stat-allocation prompt).
- Phase 30: `LEARN_SKILL` action + `learnSkill(character, skillId)`
  pure reducer + `meetsLearningRequirement` + `getAvailableSkills`.
- Phase 31: `unlockAdjacent` reducer (precursor to the 0.10.0 surface
  re-export).
- Phase 32: Crit damage formula + `isCriticalHit` / `isCriticalMiss`
  helpers.
- Phase 33-34: Docs sweep (per-module `docs/*.md` rationalisation).
- Phase 35: `Character.id` auto-generation for save-load identity
  tracking.
- Phase 36: Friendship-victory mechanics (`combat:befriended` outcome
  + +1 moral meter + half-XP / full-loot).
- Phase 37: Shop economy — `buyItem` / `sellItem` reducers, village
  MapEvent shop payload, CLI `shopLoop`.
- Phase 38: `ActiveEffect.sourceId` field on `applyEffect`.
- Phase 39: `automation/agent-vitest-reporter.mjs` custom Vitest
  reporter + `npm run verify:agent` + structured
  `automation/last-verify-report.json`.

### Changed
- Phase 26 CLI consolidation removed several per-feature CLI files
  (`combat.cli.ts`, etc.).

## [0.8.0] — 2026-05-16

Phases 09 → 25 surface. Game loop orchestration, RNG seeding, package
architecture, story content, MapEvents engine.

### Added
- Phase 09: `gameReducer` dispatch spine + `createGameStore` Zustand
  wrapper + `game.cli.ts` end-to-end demo (Spec 09).
- Phase 10: Moral meter (`moralMeter` field, `shiftMoralMeter` action,
  per-clause clamping, Spec 10 acceptance).
- Phase 11: RNG seeding (`setRng`, `getRng`, `mockFixedRng`,
  `mockAlternatingRng`, `mockSequentialRng`) + `rngState` field on
  `GameState`. Deterministic test harness (Spec 11).
- Phase 12: Package architecture cleanup (`src/index.ts` barrel
  rationalised, event surface documented for RN consumers per Spec 12).
- Phase 13: ESLint fix (`eslint.config.mts` + `@typescript-eslint`
  plugin wiring).
- Phase 14: Story content — first named NPC (Old Marrow) with moral
  dialogue tree.
- Phase 15: Combat resolver split into per-phase helpers
  (round-start, action-restriction, advantage, stance-effects,
  scenario, round-end).
- Phase 17: Removed legacy Python `combat-test.py` pexpect harness.
- Phase 21: Event emitter (`createEventEmitter`,
  `GameEventEmitter`) + typed event stream.
- Phase 22: Authoring helper skills for content / character / world.
- Phase 23-25: MapEvents engine (`resolveMapEvent`,
  `MapEventPool`, `registerMapEventPool`, 8 event kinds: `encounter`,
  `interaction`, `gathering`, `rest`, `village`, `cutscene`, `hazard`,
  `loot-cache`). Phase 25 retired the legacy `processNode` surface.

### Removed
- Legacy `processNode` and `MapEvent` / `MapEventType` types (Phase
  25). Replacement is the MapEvents engine.

## [0.7.0] — 2026-05-15

Pre-loop final point. Last major bundle before the autonomous-loop
era began. Mobile's current pin (as of 2026-05-19).

### Added
- Pre-loop Specs 04 (Skills engine), 04b (Skills library), 05
  (Equipment engine), 05b (Equipment library), 05c (Item rarity),
  05d (Modifier catalogue), 06 (Character progression), 07 (Enemy
  library + AI), 08 (World content + hazards) all live.
- `Equipment.setMembership?: string` stub for the deferred Spec 05e.

### Changed
- (Pre-loop history — see `git log v0.6.0..v0.7.0` for the full
  surface delta.)

## [0.6.0] — 2026-05-15

Pre-loop. Equipment engine + library + item rarity + modifier
catalogue (Specs 05 / 05b / 05c / 05d).

## [0.5.0] — 2026-05-13

Pre-loop. Skills engine + library (Specs 04 / 04b).

## [0.2.0] — 2026-05-08

Initial published surface. Effects engine (Spec 01), Combat round
resolver (Spec 02), Tier 2/3 effect procs (Spec 03).

---

For the publish flow + deprecation lifecycle policy, see
[`RELEASING.md`](./RELEASING.md).
