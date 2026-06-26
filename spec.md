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
| Character | `createCharacter`, `allocateStatPoint`, `previewStatAllocation`, `computeEquipDelta`, `levelLadderPresets`, `Character`, `BaseStats`, `DerivedStats`, `CharacterPreset`, `EquipDelta` |
| Enemy | `createEnemy`, `Enemy`, `EnemyLogic`, `decideEnemyAction`, `enemyStatBudget`, `randomLogic`, `rollLoot`, `FriendshipReward`, `BefriendabilityConfig` |
| Combat | `determineAdvantage`, `getAttackStat`, `getDefenseStat`, `applyDamage`, `heal`, `Stance`, `Action`, `CombatState`, `getEffectsResolutionOutcome`, `resolveCombatRound`; Spec 25 Hazard-Pattern Combat engine (HP-only, 2026-06-22) — `initializeCombatEncounter`, `playCombatCard`, `resolveCombatPhase`, `processBetweenPhases`, `simulateHazardPatternCombat`, `CombatEncounterState`, `CombatCard` (`CombatPressureTracks` REMOVED); defense cards / GUARD mechanic — `GOLD_CARD_IDS`, `isGoldCard`, `CardEffectKind`; synthetic card ids — `SYNTHETIC_CARD_IDS` (readonly string[] of built-in non-deck cards, currently `['card-retreat']`), `isSyntheticCard`; Spec 26/26b depth layer — stance draft + hidden-stance read (`startTurn`, `draftStanceDie`, `endTurn`, `resolveRead`, `chooseDraft`, `discardCombatCard`, `getDraftedDie`, `isPhaseStanceRevealed`, `revealedCurrentStance`, `cardReadPreview`, `projectCardImpact`), Conviction-funded Signature Skills (`playSignatureSkill`, `getSignatureSkill`, `SIGNATURE_SKILLS`, `SIGNATURE_SKILL_LIST`, `SIGNATURE_KITS`, `signaturesForArchetype`, `playerArchetype`), deckbuilder card rewards (`rollCombatCardRewards`, `addRewardCard`, `COMBAT_REWARD_POOL`, `unlockSkillViaDilemma`, `STARTING_SKILL_ID`, `STARTING_SKILL_IDS`), intent classification (`deriveIntentType`), threat-sequence read API (`getThreatSequence`, `generateDefaultThreatSequence`, `AUTHORED_THREAT_ENEMY_IDS`), `SignatureSkill`, `SignatureSkillId`, `SignatureSkillKind`, `CombatReadResult`, `CombatIntentType`, `PlayerArchetype`; PR #190 (2026-06-23) — partial Press Fate re-roll dice helpers (`rerollSpentDice`, `hasRerollableDice`, `dieIsRerollable`) + preset deck system (`COMBAT_DECK_PRESETS`, `COMBAT_DECK_PRESET_ORDER`, `listDeckPresets`, `getDeckPreset`, `buildPresetDeck`, `CombatDeckPreset`, `CombatDeckFocus`); die-cost helpers — `resolveCardDieCost` (returns `CardDieCost { cost, advantage }` for a card stance vs. enemy phase stance, RPS-based), `cardDieCostPreview` (read-only preview variant), `CardDieCost` (named type export — importable as `import type { CardDieCost } from 'axiomancer-mechanics'`); Spec 25 engine/deck-build helpers — `COMBAT_DICE_COUNT`, `COMBAT_HAND_SIZE`, `COMBAT_DIE_FACES` (tuning constants), `rollCombatDice` (rolls the initial die pool), `combatDieCanPower` (die-affordance check), `refreshOneDie` (refresh a single spent die), `toCombatCard` (skill → CombatCard converter), `projectDeck` (hand-projection read), `classifyVerbClass` (card intent classifier), `buildCombatDeck` (deck assembly) |
| Effects | `applyEffect`, `applyTier1CombatEffect`, `lookupEffect`, `Effect`, `ActiveEffect`, `EffectInteraction`, `evaluateInteractions`; Phase 142 interaction engine — `checkInteractionTrigger`, `applyInteractionResult`, `EFFECT_INTERACTIONS`, `getInteractionsForEffect`, `getAllInteractionIds`, `getInteractionById`, `validateInteractions`, `INTERACTION_AMPLIFICATION`, `INTERACTION_PRIORITY`; Phase 142 / 125 resolution constants — `STATUS_RESOLUTION_DEBUFF_THRESHOLD`, `STATUS_RESOLUTION_DOT_THRESHOLD`, `STATUS_RESOLUTION_DOT_MAX_ROUNDS`, `STATUS_ENGAGEMENT_FLOOR_PERCENT` |
| Items | `addItem`, `removeItem`, `useConsumable`, `Item`, `Equipment`, `dropItem`, `dropItemWithAffixes`, `composeItemName`, `getActiveSetBonuses`, `ItemSet`, `previewTemplateAtRarity`, `equipmentFromTemplate`, `generateRarityDrop`, `firstEquippedPerSlot`; Phase 154 loot-gen helpers — `dropItemAtRarity` (single item at explicit rarity), `countNamedAffixes` (prefix+suffix count on an Equipment), `hasBakedAffix` (curated variant guard), `AFFIXES_PER_RARITY` (target prefix+suffix count per rarity tier) |
| Skills | `canUseSkill`, `executeSkill`, `learnSkill`, `carryPhilosophicalResources`, `Skill`, `SkillCategory`, `SkillSynergy`, `evaluateExtendedSynergyPredicate`; Phase 142 extended synergy predicate helpers — `checkSinglePredicate`, `checkAnyCountPredicate`, `checkAllRequiredPredicate`, `checkBuffDebuffCombo`, `checkTotalIntensityPredicate`, `ExtendedSynergyPredicate` |
| Game | `createGameStore`, `GameState`, `gameReducer`, `createEventEmitter`, `nullAdapter`, `CodexEntry`, `RESOURCE_CARRY`, `DEFENSE_MULTIPLIERS`, `PASSIVE_DEFENSE_MULTIPLIER`, `MAX_EFFECT_INTENSITY`, `MAX_EFFECT_DURATION`, `FRIENDSHIP_COUNTER_MAX` |
| World | `createStartingWorld`, `WorldState`, `moveToNode`, `resolveMapEvent`, `getNodeEventPool`, `getNodeEventKinds`, `getNodePrimaryEventKind`, `runMinigameHarness`, `getShadowedNodeOverrideKeys`, `MapDefinition`, `NarrationPayload` |
| Hazard | `*` (wildcard export from `./World/Hazard`; key helpers: `dieCanPower(dieKind, cardKind)` / `dieCanPowerCard(dieKind, cardDef)` — boolean predicates used by combat to check die affordance against Hazard color contracts; `confirmHazardForetell(session, orderedIds)` — resolves the foretell-pending state after a FORETELL card play, restoring captured dice and optionally applying SCOUR discard; engagement-layer state-machine: `generateSubquestDraft(subquests, rng, count)` — drafts subquest candidates before a session, `chooseSubquest(draft, id)` — selects one candidate from the draft (returns updated HazardSubquestDraft), `selectSubquestFromDraft(session, id)` — applies chosen subquest to a live HazardSessionState) |
| Gathering | `*` (wildcard export from `./World/Gathering`) |
| QuestBoard | `*` (wildcard export from `./World/QuestBoard`) |
| Rest | `*` (wildcard export from `./World/Rest`) |
| LootCache | `*` (wildcard export from `./World/LootCache`) |
| Philosophy | `getAlignmentCell`, `applyAlignmentDelta`, `PhilosophicalAlignment`, `bucketAxis`, `philosophicalAlignmentLibrary` |
| Faction | `FACTION_REPUTATION_MIN`, `FACTION_REPUTATION_MAX`, `DEFAULT_FACTION_REPUTATION`, `clampFactionReputation`, `createDefaultFactionReputations`, `applyFactionReputationDeltas`, `getFactionReputation`, `factionLibrary`, `getFactionInfo`, `getAllFactions`, `FactionReputation`, `FactionReputations`, `FactionReputationDelta`, `FactionInfo` |
| NPCs | `getDialogueNode`, `visibleChoices`, `isLeafNode`, `NPC`, `DialogueMap`, `DialogueTree`, `DialogueNode`, `DialogueChoice`, `DialogueContext`, `AlignmentGate` |
| Playtest | `runPlaytestScenario`, `aggregateMetrics`, `selectPolicyAction`, `renderPlaytestMarkdown`, `earlyGameFixture`, `earlyGameWispFixture`, `endgameFixture`, `endgameDisagreementFixture`, `PlaytestScenario`, `PlaytestReport`, `PlaytestMetrics`, `PlaytestRunSummary`, `PlaytestPolicy`, `PlaytestOutcome`, `PlaytestPolicySummary` |
| Events | `EnginePayload`, `TypedGameEvent`, `isCombatStartedEvent`, `isWorldMovedEvent`, type guards |
| Utils | `clamp`, `randomInt`, `deepClone`, `average`, `sum`, `max`, `min`, `inRange`, `capitalize`, `formatPercent`, `createDie`, `createDieRoll`, `determineRollAdvantageModifier`, `deriveStats`, `deriveNonCombatStats`, `calculateMaxHealth`, `setRng`, `getRng`, `setSeed`, `isCharacter`, `isEnemy`, `isCombatActive`, `Rng`, `Image` |

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
