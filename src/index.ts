/**
 * axiomancer-mechanics — public package surface.
 *
 * The library is consumed as the non-UI engine for an Axiomancer client
 * (e.g. a React Native app). Imports are organised by domain.
 */

// ─── Character ────────────────────────────────────────────────────────────────
export { createCharacter } from './Character';
export type {
    Character, BaseStats, DerivedStats, NonCombatStats,
    CreateCharacterOptions,
} from './Character';

// ─── Enemy ────────────────────────────────────────────────────────────────────
export { createEnemy, randomLogic, decideEnemyAction } from './Enemy';
export type {
    Enemy, EnemyLogic, EnemyDifficulty, Tier1EffectOverrides,
    CreateEnemyOptions,
} from './Enemy';

// ─── Combat ───────────────────────────────────────────────────────────────────
export {
    determineAdvantage, getAdvantageModifier, hasAdvantage,
    getBaseStat, getAttackStat, getDefenseStat, getSaveStat, getResistStat,
    rollSkillCheck, isCriticalHit, isCriticalMiss,
    applyCriticalMultiplier, calculateFinalDamage, isAttackSuccessful,
    applyDamage, heal, isAlive, isDefeated, getHealthPercentage,
    MIND_MARK_ID,
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
    updateCombatPhase, addBattleLogEntry,
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
} from './Combat';

// ─── Effects ──────────────────────────────────────────────────────────────────
export {
    applyEffect, applyTier1CombatEffect,
    clearTier1EffectsForStance, clearTier1EffectsForType,
    lookupEffect, getEffectByName, getEffectsByType, effectsLibrary,
} from './Effects';
export type {
    Effect, EffectType, EffectTier, EffectStacking, EffectCategory, EffectPayload,
    ActiveEffect, EffectApplicationResult,
    StatModifier, DamageOverTime, RegenerationConfig, ActionRestriction, AdvantageModifier,
    EffectStatTarget,
    ApplyEffectOptions, Tier1Outcome,
} from './Effects';

// ─── Items ────────────────────────────────────────────────────────────────────
export {
    addItem, removeItem, useConsumable, stackItem,
    addItemToInventory, removeItemFromInventory,
    isEquipment, isConsumable, isMaterial, isQuestItem,
} from './Items';
export type {
    Item, Equipment, Consumable, Material, QuestItem,
    ItemCategory, EquipmentSlot, BaseItem,
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
} from './Skills';

// ─── Game (state, store, persistence, constants) ──────────────────────────────
export {
    createGameStore, createNewGameState, GAME_STATE_VERSION,
    selectPlayer, selectCombat, selectCombatState, selectIsInCombat,
    selectInventory, selectVersion,
    nullAdapter, createNodeAdapter,
    STAT_MULTIPLIERS, RESOURCE_MULTIPLIERS, EXPERIENCE_PER_LEVEL,
    DEFENSE_MULTIPLIERS, PASSIVE_DEFENSE_MULTIPLIER,
    MAX_EFFECT_INTENSITY, MAX_EFFECT_DURATION, FRIENDSHIP_COUNTER_MAX,
} from './Game';
export type { GameState, GameStore, GameActions, PersistenceAdapter, StoreApi } from './Game';

// Legacy combat-action constants (use Action type instead).
export { COMBAT_ACTION } from './Game/actions.constants';
export type { CombatActionName } from './Game/actions.constants';

// ─── World ────────────────────────────────────────────────────────────────────
export { createStartingWorld, getCoastalMap, MapNotFoundError } from './World';
export {
    changeMap, completeMap, unlockMap,
    completeNode, unlockNode, changeContinent, completeUniqueEvent,
} from './World/world.reducer';
export type {
    WorldState, WorldMap, Continent, Quest, MapEvent, MapEventType, UniqueEvent,
    Reward, MapNode, NodeId,
    MapName, ContinentName, QuestName,
} from './World';

// ─── NPCs (types only) ────────────────────────────────────────────────────────
export type { NPC, DialogueMap } from './NPCs';

// ─── Utilities ────────────────────────────────────────────────────────────────
export {
    clamp, randomInt, deepClone, average, sum, max, min, inRange,
    capitalize, formatPercent,
    createDie, createDieRoll, determineRollAdvantageModifier,
    deriveStats, deriveNonCombatStats, calculateMaxHealth,
} from './Utils';
export { isCharacter, isEnemy, isCombatActive } from './Utils/typeGuards';
export type { Image } from './Utils/types';
