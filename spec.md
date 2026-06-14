# Spec — axiomancer-mechanics

## Product

`axiomancer-mechanics` is a TypeScript game-engine library for a turn-based
RPG with philosophical and logical-fallacy themes. It is consumed as an npm
package by clients (React Native app, test CLIs, future web UI). All public
logic is exposed through a single barrel at `src/index.ts`.

The engine covers: character creation and stat derivation, turn-based combat
with a Heart/Body/Mind system, stance-and-action-driven effect procs (Tiers
1–3), skills, equipment (weapons/armour/accessories with modifiers), items
and consumables, enemy AI, world map navigation and quest management, and an
event-observable game loop.

## Audience

- **Primary consumer:** the Axiomancer React Native app (separate repo,
  separate team — currently the same developer).
- **Secondary consumer:** the in-repo demo CLI (`src/CLI/game.cli.ts`,
  invoked via `npm run game`) used for hands-on testing during
  development. Supports scripted / JSON-event / stdin-driven modes
  via the Phase 20 flags (`--script`, `--json-events`, `--stdin`)
  for external agents.
- **Tertiary:** future potential open-sourcing as an indie-RPG engine library.

## V1 scope (in-scope)

The shipped library will expose a complete, self-contained game engine that
a React Native UI can wrap without pulling in any additional game-logic:

1. Character creation, stat derivation, non-combat stats.
2. Turn-based combat: advantage, attack/defense stats, damage, healing,
   effect ticks, stance-action mechanics.
3. Tier 1–3 status effects: DoTs, stat mods, action restrictions, procs.
4. Skills library (12 early-game skills, typed, integrated with combat).
5. Equipment engine: stat-mod aggregation, set bonuses, rarity.
6. Character progression: XP, levelling, skill learning, stat gains.
7. Enemy library and AI (random, scripted, conditional logic).
8. World map: nodes, continents, hazards, dialogue, quests.
9. Full game loop (`gameReducer` / Zustand store) with save/load migration.
10. Moral/difficulty meter tied to player choices.
11. RNG seeding for deterministic tests.
12. Package architecture: clean `src/index.ts` barrel, event surface for UI
    consumers, documented React Native adapter interface.

## 6-month horizon (queued but not blocking v1)

- Story content: named NPCs with moral dialogue trees. *(Partial —
  Spec 14 + Phase 42-46/58 shipped the philosophical-alignment cube
  + alignment-gated dialogue; Phase 63 added reactive observers.
  More named NPCs still queued.)*
- Second+ enemy class families.
- ~~Additional skill tiers (Tier 2+).~~ **Shipped — Tier 2 carries
  8 skills (Phase 66 added 5 to the original 3); Tier 3 carries 7
  (Phase 44 added 4 fallacies-as-spells to the original 3). Total
  shipped library: 21 skills across all three tiers.** See
  `specs/04b-skills-library-and-e2e.md` for the canonical inventory.
- Additional world content (biomes, continent 2+). *(Partial — Phase
  65 expanded the fishing-village starting map from 10 → 25 nodes
  with three sub-areas. Continent 2 still a candidate.)*
- ~~Published npm release.~~ **Shipped 2026-05-08 (`0.2.0`).** First
  release under the autonomous-loop era was `0.10.0` (2026-05-19);
  current is `0.10.3` (2026-05-20). See `CHANGELOG.md` + `RELEASING.md`
  for the per-tag history and the manual publish flow.
- ~~Mobile aftermath + codex surfaces.~~ **Shipped across Phases
  71/72/73 (closes GH#65).** Per-foe narrative prose
  (`finalBlowLines` / `pactLines` / `causeLines` on Enemy — Phase 71);
  run-loop semantics (`store.resetRun({ keepCharacter })` + required
  `GameState.runId` + `STARTING_REGION` + `GAME_STATE_VERSION` bumped
  5 → 6 with `migrateV5toV6` — Phase 72); Codex / journal-entry
  surface (`GameState.codex: CodexState` slice + per-foe
  `Enemy.journalEntry?: CodexEntry` + `store.unlockCodexEntry` +
  auto-firing wire on friendship outcomes + `GAME_STATE_VERSION`
  bumped 6 → 7 with `migrateV6toV7` — Phase 73). Mobile consumer
  callsite cleanup (drop `derive*Phrase` fallback helpers; replace
  BEGIN AGAIN full-heal band-aid; mount NEW ENTRY card) is
  post-engine-release and lives in `axiomancer-mobile`.

## Stack

TypeScript strict, Vitest, tsc + tsc-alias, ESLint, npm.
No database, no server, no web UI.

## Contracts (public API)

The barrel at `src/index.ts` is the contract surface. Groups:

| Group | Key exports |
|---|---|
| Character | `createCharacter`, `Character`, `BaseStats`, `DerivedStats` |
| Enemy | `createEnemy`, `Enemy`, `EnemyLogic`, `decideEnemyAction`, `enemyStatBudget` |
| Combat | `determineAdvantage`, `getAttackStat`, `applyDamage`, `heal`, `Stance`, `Action`, `CombatState`, `getEffectsResolutionOutcome` |
| Effects | `applyEffect`, `applyTier1CombatEffect`, `lookupEffect`, `Effect`, `ActiveEffect` |
| Items | `addItem`, `removeItem`, `useConsumable`, `Item` |
| Skills | `canUseSkill`, `executeSkill`, `learnSkill`, `Skill`, `SkillCategory` |
| Game | `createGameStore`, `GameState`, persistence adapters |
| World | `createStartingWorld`, world reducer, `WorldState` |
| Philosophy | `getAlignmentCell`, `applyAlignmentDelta`, `PhilosophicalAlignment` |
| Faction | `applyFactionReputationDeltas`, `FactionReputation`, `factionLibrary` |
| NPCs | `getDialogueNode`, `visibleChoices`, `NPC`, `DialogueTree` |
| Playtest | `runPlaytestScenario`, `PlaytestScenario`, `PlaytestReport` |
| Events | `EnginePayload`, `TypedGameEvent`, type guards |
| Utils | `clamp`, `randomInt`, `deepClone`, `deriveStats` |

Breaking changes to these exports require a semver major. The CLIs
(`src/CLI/`) are **not** part of the public API and are excluded from the
build.

## Non-goals (explicit)

- Web or React Native UI components — not in this repo.
- Database or server — none.
- Network play or cloud sync.
- Multiple save slots (deferred).
- **v1.0.0 stable-API stamp before the spec contracts settle.** Pre-1.0
  minor bumps may carry breaking public-API changes (deprecation
  lifecycle per `RELEASING.md`); `1.0.0` graduates the contract surface
  to semver-strict only once the spec coverage matches the shipped
  engine. Until then, downstream consumers (e.g. `axiomancer-mobile`)
  pin exact versions and bump deliberately per release.
