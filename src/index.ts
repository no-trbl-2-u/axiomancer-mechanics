/**
 * axiomancer-mechanics — public package surface.
 * 
 * Core game engine exports for React Native and other JavaScript consumers.
 * For Node.js specific adapters, import from 'axiomancer-mechanics/node'.
 *
 * The library is consumed as the non-UI engine for an Axiomancer client.
 * Imports are organised by domain.
 */

// ─── Character ────────────────────────────────────────────────────────────────
export {
    createCharacter,
    allocateStatPoint,
    previewStatAllocation,
    equipItem, unequipItem, getEquipmentModifiers,
    characterPresets, getPresetById, buildCharacterFromPreset,
} from './Character';
export type {
    Character, BaseStats, DerivedStats, NonCombatStats,
    PreviewAllocation, PreviewResult,
    CreateCharacterOptions, AggregatedEquipmentModifiers,
    CharacterPreset, CharacterPresetEquipmentEntry,
} from './Character';

// ─── Enemy ────────────────────────────────────────────────────────────────────
export {
    createEnemy, enemyStatBudget, randomLogic, decideEnemyAction,
    aggressiveLogic, defensiveLogic, balancedLogic, strategicLogic, bossLogic,
    counterStanceOf, weakestStanceOf,
    rollLoot, rollLootMany,
    DEFAULT_XP_BY_DIFFICULTY,
} from './Enemy';
export type {
    Enemy, EnemyLogic, EnemyDifficulty, Tier1EffectOverrides,
    LootTableEntry, CreateEnemyOptions,
    LootRng,
    FriendshipReward, BefriendabilityConfig,
    FinalBlowLines, PactLines, CauseLines,
    // CodexEntry moved to ./Game block — Phase 73 type's semantic home
    // is the Game-loop persistence surface; the Enemy module re-exports
    // it via `src/Enemy/types.ts` for the per-foe content site, but the
    // top-level barrel now pulls from Game alongside CodexState.
} from './Enemy';
export {
    EnemyLibrary, EnemiesByMap, ENEMY_REGISTRY,
} from './Enemy/enemy.library';
export type { EnemySlug } from './Enemy/enemy.library';

// ─── Combat ───────────────────────────────────────────────────────────────────
export {
    determineAdvantage, getAdvantageModifier, hasAdvantage,
    resolveEffectiveAdvantage,
    getBaseStat, getAttackStat, getDefenseStat, getSaveStat,
    rollSkillCheck, isCriticalHit, isCriticalMiss,
    applyCriticalMultiplier, calculateFinalDamage, selectCritDamage, isAttackSuccessful,
    applyDamage, heal, isAlive, isDefeated, getHealthPercentage,
    getStudyMarkIntensity, getActiveRollModifier, getThornsReflect,
    updateEffectDuration, tickAllEffects,
    removeRandomBuff, extendRandomBuffDuration, applyRegen,
    getActiveEffectModifiers, getEffectiveStats, canAct,
    resolveEffectApplication,
    calculateDamageResistance, getSkillDamageType,
    determineEnemyAction, isCombatOngoing, determineCombatEnd,
    getEffectsResolutionOutcome,
    healCharacter,
    calculateEnemyStatMultiplier, applyMoralMeterScaling,
    // Phase 142 — Status effect resolution constants
    STATUS_RESOLUTION_DEBUFF_THRESHOLD, STATUS_RESOLUTION_DOT_THRESHOLD,
    STATUS_RESOLUTION_DOT_MAX_ROUNDS, STATUS_ENGAGEMENT_FLOOR_PERCENT,
    INTERACTION_AMPLIFICATION, INTERACTION_PRIORITY,
} from './Combat';
export type {
    Stance, Action, Advantage, CritStyle, CombatAction, CombatPhase,
    BattleLogEntry, CombatState, Combatant,
    AggregatedEffectModifiers, EffectiveStats, DamageType,
} from './Combat';

// ─── Combat reducer ───────────────────────────────────────────────────────────
export {
    initializeCombat, setPhase, setPlayerStance, setPlayerAction,
    appendLog, incrementFriendship, endCombat,
} from './Combat/combat.reducer';

// ─── Combat resolver ──────────────────────────────────────────────────────────
// Single-call round resolution. UI clients consume the typed `combatEvents`
// stream and render from it; the resolver itself never logs.
export { resolveCombatRound } from './Combat';
export type {
    RoundResolution, RoundEvent, CombatActor,
    RoundStartEvent, ActionRestrictionEvent, AdvantageEvent,
    StanceEffectEvent, ScenarioEvent, RoundEndEvent,
    ItemPhaseEvent,
} from './Combat';

// ─── Effects ──────────────────────────────────────────────────────────────────
export {
    applyEffect, applyTier1CombatEffect,
    clearTier1EffectsForStance,
    lookupEffect, getEffectByName, getEffectsByType, effectsLibrary,
    processWorldEffectTick, getActiveHazards,
    // Phase 142 — Status effect depth functionality
    evaluateInteractions, checkInteractionTrigger, applyInteractionResult,
    EFFECT_INTERACTIONS, getInteractionsForEffect, getAllInteractionIds,
    getInteractionById, validateInteractions,
} from './Effects';
export type {
    Effect, EffectType, EffectTier, EffectStacking, EffectCategory, EffectPayload,
    ActiveEffect, EffectApplicationResult,
    StatModifier, DamageOverTime, RegenerationConfig, ActionRestriction, AdvantageModifier,
    EffectStatTarget,
    ApplyEffectOptions, Tier1Outcome,
    WorldTickResult, ActiveHazard,
    // Phase 142 — Status effect interaction types
    EffectInteraction, InteractionTrigger, InteractionResult, InteractionTriggerType,
} from './Effects';

// ─── Items ────────────────────────────────────────────────────────────────────
export {
    addItem, removeItem, useConsumable, stackItem,
    addItemToInventory, removeItemFromInventory,
    isEquipment, isConsumable, isMaterial, isQuestItem,
    aggregateCombatStartTokens, applyEquipmentGenerationBonus,
    getEquipmentProcTriggers, useConsumableEffect,
    equipmentTemplates, getEquipmentTemplate, getTemplatesBySlot,
    uniqueTemplates, getUniqueTemplate,
    dropItem, rollModifiers, resolveModifiers, rarityWeightTable,
    previewTemplateAtRarity, previewTemplateAtAllRarities,
    consumableLibrary, getConsumableById,
    buyItem, sellItem, defaultSellPrice,
    getActiveSetBonuses, getActiveSetBonusesForCharacter,
    aggregateSetStartTokens, applySetGenerationBonus,
    getActiveSetPassiveEffectIds, getEquippedItemSets,
    itemSetLibrary, getItemSetById,
} from './Items';
export type {
    Item, Equipment, Consumable, Material, QuestItem,
    ItemCategory, EquipmentSlot, BaseItem,
    EquipmentProcTrigger, ResourceInteraction, ResourceGenerationBonus,
    ItemRarity, RolledModifier, EquipmentTemplate, UniqueItemTemplate,
    ConsumableUseResult,
    ShopWare, ShopInventory,
    SetBonus, ItemSet,
} from './Items';

// ─── Skills ───────────────────────────────────────────────────────────────────
export type {
    Skill, SkillCategory, SkillsStatType, SkillTier, SkillTarget,
    ResourceCost, CombatResources,
    SkillLearningRequirement, SkillCombatEffects,
    BasicActionOutcome, SkillEvent, SkillResolution, SkillLookup,
    SkillSynergy, SynergyPredicate,
    // Phase 142 — Extended synergy predicates
    ExtendedSynergyPredicate,
} from './Skills';
export {
    generateBasicActionResources, generatePhilosophicalResource,
    canUseSkill, spendResources, calculateSkillDamage, executeSkill,
    meetsLearningRequirement, getAvailableSkills, learnSkill,
    skillLibrary, getSkillById,
    // Phase 142 — Extended synergy predicate functionality
    evaluateExtendedSynergyPredicate, checkSinglePredicate, checkAnyCountPredicate,
    checkAllRequiredPredicate, checkBuffDebuffCombo, checkTotalIntensityPredicate,
} from './Skills';

// ─── Game (state, store, persistence, constants) ──────────────────────────────
export {
    createGameStore, createNewGameState, GAME_STATE_VERSION,
    gameReducer, migrate, createEventEmitter,
    selectPlayer, selectCombat, selectCombatState, selectIsInCombat,
    selectInventory, selectVersion, selectMoralMeter,
    nullAdapter,
    STAT_MULTIPLIERS, RESOURCE_MULTIPLIERS, EXPERIENCE_PER_LEVEL,
    STAT_POINTS_PER_LEVEL,
    DEFENSE_MULTIPLIERS, PASSIVE_DEFENSE_MULTIPLIER,
    MAX_EFFECT_INTENSITY, MAX_EFFECT_DURATION, FRIENDSHIP_COUNTER_MAX,
    generateRunId, STARTING_REGION,
} from './Game';
export type {
    GameState, GameStore, GameActions, PersistenceAdapter, StoreApi,
    GameAction, GameActionOf,
    GameEvent, GameEventEmitter, GameEventHandler, GameEventType,
    CodexEntry, CodexState, RegionConsequences,
} from './Game';

// Legacy combat-action constants (use Action type instead).
export { COMBAT_ACTION } from './Game/actions.constants';
export type { CombatActionName } from './Game/actions.constants';

// ─── World ────────────────────────────────────────────────────────────────────
export {
    createStartingWorld, MapNotFoundError,
    MAP_REGISTRY, getMapDefinition, createMapState,
    moveToNode, completeCurrentNode, IllegalMoveError,
    applyDialogueChoice,
    emptyQuestLog, isQuestComplete, findActiveQuest, findQuest,
    startQuest, progressQuest, completeQuest, discoverQuest,
    reachableObjectives, killObjectives,
    seedInputToUint32, minigameRunSeed, branchMinigameSeed,
} from './World';

// Hazard Minigame (v2 — faithful port of the mobile living rules source).
// The full public surface (engine transitions, content, tuning, deck-flag
// codec, seeded RNG, and types) is exported directly from the Hazard module
// so mobile can delete its local engine and import these instead.
// See `docs/hazard-v2-vs-mechanics-divergence.md`.
export * from './World/Hazard';

// Gathering Minigame ("The Gleaning" — faithful copy of the mobile living
// rules source, `../axiomancer-mobile/state/gathering/`). The full public
// surface (engine transitions, content, tuning, sim, and types) is exported
// directly from the Gathering module so mobile can delete its local engine
// and import these instead. Seeded-RNG helpers are aliased (`gathering*`)
// to avoid ambiguous star-exports with the Hazard module's RNG.
export * from './World/Gathering';

// Quest Board minigame ("The Boy's Almanac" — the story-quest encounter:
// each main-story beat plays as an authored tabletop board inside the
// fiction; fully sandboxed, only the completion record flows back).
// Seeded-RNG helpers are aliased (`questBoard*`) per the same doctrine.
export * from './World/QuestBoard';

// Rest encounter ("The Night Watch" — one night at camp in three watches)
// and Loot-cache encounter ("The Reliquary" — three layers, sealed trap
// fates, one probe). RNG aliased `rest*` / `lootCache*`.
export * from './World/Rest';
export * from './World/LootCache';
export {
    changeMap, completeMap, unlockMap,
    completeNode, unlockNode, changeContinent, completeUniqueEvent,
    revealAdjacent, markNodeConsumed, unlockAdjacent,
    // Phase 135: Persistence functions
    recordHazardOutcome, blockMapRoute, getHazardOutcomesForNode, isRouteBlocked,
    validateMoveToNode, findAlternativePaths, getBlockedRoutesFromNode, getReachableNodes,
    // Phase 148: Minigame Harness
    runMinigameHarness, summarizeHarnessReport,
} from './World';
export {
    resolveMapEvent,
    registerMapEventPool,
    setDefaultMapEventPool,
    setNodeEventPoolOverride,
} from './World';
export type {
    MapEventKind, MapEventPayload, MapEventPool, MapEventPoolEntry,
    EncounterPayload, InteractionPayload, GatheringPayload, RestPayload,
    VillagePayload, CutscenePayload, HazardPayload, LootCachePayload,
    QuestEventPayload, ResolvedEvent, ResolveMapEventResult,
} from './World';
export {
    generateEncounter, scaleEnemyToLevel, scaledEncounterLevel,
    DIFFICULTY_LEVEL_BANDS,
} from './World';
export type {
    WorldState, Continent, Quest, UniqueEvent,
    Reward, MapNode, NodeId, Encounter,
    MapName, ContinentName, QuestName,
    MapDefinition, MapState, QuestObjective, QuestObjectiveType, QuestStatus, QuestLog,
    GenerateEncounterOptions,
    ApplyDialogueChoiceResult,
    SeedInput,
    // Phase 135: Persistence types
    HazardModifierEntry, HazardNodeOutcome, BlockedRoute, RouteValidationResult,
    // Phase 148: Minigame Harness types
    MinigameHarnessConfig, MinigameHarnessReport, MinigameHarnessSummary,
} from './World';

// ─── Philosophy (Phase 42 — 3-axis alignment cube + 27-cell registry) ────────
export {
    bucketAxis, getAlignmentCell, applyAlignmentDelta, defaultAlignment,
    AXIS_HIGH_THRESHOLD, AXIS_LOW_THRESHOLD,
    philosophicalAlignmentLibrary,
} from './Philosophy';
export type {
    AxisBucket, PhilosophicalAlignment, AlignmentFallacy,
    PhilosophicalAlignmentCell,
} from './Philosophy';

// ─── Faction (Phase 110 — faction reputation system for boss befriend consequences) ──
export {
    FACTION_REPUTATION_MIN, FACTION_REPUTATION_MAX, DEFAULT_FACTION_REPUTATION,
    clampFactionReputation, createDefaultFactionReputations,
    applyFactionReputationDeltas, getFactionReputation,
    factionLibrary, getFactionInfo, getAllFactions,
} from './Faction';
export type {
    FactionReputation, FactionReputations, FactionReputationDelta, FactionInfo,
} from './Faction';

// ─── NPCs (types + dialogue helpers) ──────────────────────────────────────────
export type {
    NPC, DialogueMap, DialogueTree, DialogueNode, DialogueChoice, DialogueContext,
    AlignmentGate,
} from './NPCs';
export { getDialogueNode, visibleChoices, isLeafNode } from './NPCs';

// ─── Playtest ─────────────────────────────────────────────────────────────────
export {
    runPlaytestScenario, aggregateMetrics, selectPolicyAction, renderPlaytestMarkdown,
    earlyGameFixture, earlyGameWispFixture, endgameFixture, endgameDisagreementFixture,
} from './Playtest';
export type {
    PlaytestScenario, PlaytestReport, PlaytestMetrics, PlaytestRunSummary,
    PlaytestPolicy, PlaytestOutcome, PlaytestPolicySummary,
} from './Playtest';

// ─── Utilities ────────────────────────────────────────────────────────────────
export {
    clamp, randomInt, deepClone, average, sum, max, min, inRange,
    capitalize, formatPercent,
    createDie, createDieRoll, determineRollAdvantageModifier,
    deriveStats, deriveNonCombatStats, calculateMaxHealth,
} from './Utils';
export { setRng, getRng, setSeed } from './Utils/rng';
export type { Rng } from './Utils/rng';
export { isCharacter, isEnemy, isCombatActive } from './Utils/typeGuards';
export type { Image } from './Utils/types';

// ── Events ─────────────────────────────────────────────────────────────────
export type {
    EnginePayload, TypedGameEvent,
    TypedCombatStartedEvent, TypedCombatRoundEvent, TypedCombatEndedEvent,
    TypedWorldMovedEvent, TypedWorldProcessedEvent,
    TypedLevelUpEvent, TypedInventoryChangedEvent,
    TypedDialogueAppliedEvent, TypedGameSavedEvent, TypedGameLoadedEvent,
} from './Game/events.types';

export {
    isCombatStartedEvent, isCombatRoundEvent, isCombatEndedEvent,
    isWorldMovedEvent, isWorldProcessedEvent,
    isLevelUpEvent, isInventoryChangedEvent,
    isDialogueAppliedEvent, isGameSavedEvent, isGameLoadedEvent,
} from './Game/events.utils';
