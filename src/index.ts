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
    equipItem, unequipItem, getEquipmentModifiers,
    characterPresets, getPresetById, buildCharacterFromPreset,
} from './Character';
export type {
    Character, BaseStats, DerivedStats, NonCombatStats,
    CreateCharacterOptions, AggregatedEquipmentModifiers,
    CharacterPreset, CharacterPresetEquipmentEntry,
} from './Character';

// ─── Enemy ────────────────────────────────────────────────────────────────────
export {
    createEnemy, randomLogic, decideEnemyAction,
    aggressiveLogic, defensiveLogic, balancedLogic, strategicLogic, bossLogic,
    counterStanceOf, weakestStanceOf,
    rollLoot, rollLootMany,
    DEFAULT_XP_BY_DIFFICULTY,
} from './Enemy';
export type {
    Enemy, EnemyLogic, EnemyDifficulty, Tier1EffectOverrides,
    LootTableEntry, CreateEnemyOptions,
    LootRng,
} from './Enemy';
export {
    EnemyLibrary, EnemiesByMap, ENEMY_REGISTRY,
} from './Enemy/enemy.library';
export type { EnemySlug } from './Enemy/enemy.library';

// ─── Combat ───────────────────────────────────────────────────────────────────
export {
    determineAdvantage, getAdvantageModifier, hasAdvantage,
    getBaseStat, getAttackStat, getDefenseStat, getSaveStat, getResistStat,
    rollSkillCheck, isCriticalHit, isCriticalMiss,
    applyCriticalMultiplier, calculateFinalDamage, isAttackSuccessful,
    applyDamage, heal, isAlive, isDefeated, getHealthPercentage,
    getStudyMarkIntensity, getActiveRollModifier, getThornsReflect,
    updateEffectDuration, tickAllEffects,
    removeRandomBuff, extendRandomBuffDuration, applyRegen,
    resolveEffectApplication,
    determineEnemyAction, isCombatOngoing, determineCombatEnd, isValidCombatAction,
    healCharacter,
} from './Combat';
export type {
    Stance, Action, Advantage, CritStyle, CombatAction, CombatPhase,
    BattleLogEntry, CombatState, Combatant,
} from './Combat';

// ─── Combat reducer ───────────────────────────────────────────────────────────
export {
    initializeCombat, setPhase, setPlayerStance, setPlayerAction,
    appendLog, incrementFriendship, endCombat,
    endCombatPlayerVictory, endCombatPlayerDefeat, endCombatWithFriendship,
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
    clearTier1EffectsForStance, clearTier1EffectsForType,
    lookupEffect, getEffectByName, getEffectsByType, effectsLibrary,
    processWorldEffectTick, getActiveHazards,
} from './Effects';
export type {
    Effect, EffectType, EffectTier, EffectStacking, EffectCategory, EffectPayload,
    ActiveEffect, EffectApplicationResult,
    StatModifier, DamageOverTime, RegenerationConfig, ActionRestriction, AdvantageModifier,
    EffectStatTarget,
    ApplyEffectOptions, Tier1Outcome,
    WorldTickResult, ActiveHazard,
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
    consumableLibrary, getConsumableById,
} from './Items';
export type {
    Item, Equipment, Consumable, Material, QuestItem,
    ItemCategory, EquipmentSlot, BaseItem,
    EquipmentProcTrigger, ResourceInteraction, ResourceGenerationBonus,
    ItemRarity, RolledModifier, EquipmentTemplate, UniqueItemTemplate,
    ConsumableUseResult,
} from './Items';

// ─── Skills ───────────────────────────────────────────────────────────────────
export type {
    Skill, SkillCategory, SkillsStatType, SkillTier, SkillTarget,
    ResourceCost, CombatResources,
    SkillLearningRequirement, SkillCombatEffects,
    BasicActionOutcome, SkillEvent, SkillResolution, SkillLookup,
} from './Skills';
export {
    generateBasicActionResources, generatePhilosophicalResource,
    canUseSkill, spendResources, calculateSkillDamage, executeSkill,
    meetsLearningRequirement, getAvailableSkills, learnSkill,
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
} from './Game';
export type {
    GameState, GameStore, GameActions, PersistenceAdapter, StoreApi,
    GameAction, GameActionOf,
    GameEvent, GameEventEmitter, GameEventHandler, GameEventType,
} from './Game';

// Legacy combat-action constants (use Action type instead).
export { COMBAT_ACTION } from './Game/actions.constants';
export type { CombatActionName } from './Game/actions.constants';

// ─── World ────────────────────────────────────────────────────────────────────
export {
    createStartingWorld, getCoastalMap, MapNotFoundError,
    MAP_REGISTRY, getMapDefinition, createMapState,
    moveToNode, completeCurrentNode, IllegalMoveError,
    applyDialogueChoice,
    emptyQuestLog, isQuestComplete, findActiveQuest, findQuest,
    startQuest, progressQuest, completeQuest, discoverQuest,
    reachableObjectives, killObjectives,
} from './World';
export {
    changeMap, completeMap, unlockMap,
    completeNode, unlockNode, changeContinent, completeUniqueEvent,
    revealAdjacent, markNodeConsumed, unlockAdjacent,
} from './World/world.reducer';
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
    ResolvedEvent, ResolveMapEventResult,
} from './World';
export {
    generateEncounter, scaleEnemyToLevel, scaledEncounterLevel,
    DIFFICULTY_LEVEL_BANDS,
} from './World';
export type {
    WorldState, WorldMap, Continent, Quest, UniqueEvent,
    Reward, MapNode, NodeId, Encounter,
    MapName, ContinentName, QuestName,
    MapDefinition, MapState, QuestObjective, QuestObjectiveType, QuestStatus, QuestLog,
    GenerateEncounterOptions,
    ApplyDialogueChoiceResult,
} from './World';

// ─── NPCs (types + dialogue helpers) ──────────────────────────────────────────
export type {
    NPC, DialogueMap, DialogueTree, DialogueNode, DialogueChoice, DialogueContext,
} from './NPCs';
export { getDialogueNode, visibleChoices, isLeafNode } from './NPCs';

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
