// ─── Package API ──────────────────────────────────────────────────────────────
// This is the public surface of axiomancer-mechanics.
// Consumers (React Native app, etc.) import from this barrel.

// Character
export { createCharacter, getResistStatFromResistedBy } from './Character';
export type { Character, BaseStats, DerivedStats, NonCombatStats } from './Character/types';

// Enemy
export { createEnemy, getEnemyRelatedStat } from './Enemy';
export type { Enemy, EnemyLogic, EnemyTier1EffectMap } from './Enemy/types';

// Combat — mechanics
export {
    determineAdvantage, getAdvantageModifier, hasAdvantage,
    determineEnemyAction, generateEnemyAttackType, generateEnemyAction,
    isCombatOngoing, determineCombatEnd, isValidCombatAction,
    getBaseStatForType, getAttackStatForType, getDefenseStatForType, getSaveStatForType,
    rollSkillCheck, isCriticalHit, isCriticalMiss,
    applyCriticalMultiplier, calculateFinalDamage, isAttackSuccessful,
    isEffectApplied,
    updateEffectDuration, tickAllEffects,
    getStudyMarkIntensity, getActiveRollModifier, getThornsReflect,
    removeRandomBuff, extendRandomBuffDuration, applyRegen,
    applyDamage, healCharacter, isAlive, isDefeated, getHealthPercentage,
    MIND_MARK_ID,
} from './Combat';

// Combat — reducer
export {
    initializeCombat, updateCombatPhase,
    setPlayerStance, setPlayerAction,
    addBattleLogEntry, incrementFriendship,
    endCombatPlayerVictory, endCombatPlayerDefeat, endCombatWithFriendship,
} from './Combat/combat.reducer';

// Combat — types
export type {
    Stance, Action, Advantage, CritStyle, CombatAction, CombatPhase,
    BattleLogEntry, CombatState,
} from './Combat/types';

// Effects
export {
    applyEffect, applyTier1CombatEffect, applyTier1CombatEffectWithResult,
    clearTier1EffectsForType, getTargetsResistStatValue,
} from './Effects';
export type { ApplyEffectOptions } from './Effects';
export { lookupEffect, getEffectByName, getEffectsByType, effectsLibrary } from './Effects/effects.library';
export type {
    Effect, EffectType, EffectStacking, EffectCategory, EffectPayload,
    ActiveEffect, EffectApplicationResult,
    StatModifier, DamageOverTime, RegenerationConfig, ActionRestriction, AdvantageModifier,
} from './Effects/types';

// Items
export {
    addItemToInventory, removeItemFromInventory, useConsumable, stackItem,
    equipmentLibrary, lookupEquipment, getAllEquipment, getEquipmentBySlot,
    equipItem, unequipItem, getEquipmentModifiers,
} from './Items';
export type {
    Item, Equipment, Consumable, Material, QuestItem, ItemCategory, EquipmentSlot, ItemTeir,
    EquipmentLoadout, CharacterWithEquipment, AggregatedEquipmentModifiers,
} from './Items';
export { isEquipment, isConsumable, isMaterial, isQuestItem } from './Items/types';

// Skills — types only (no implementation yet)
export type { Skill, SkillCategory, SkillsStatType, SkillLearningRequirement } from './Skills/types';

// Game — store & reducers
export { createGameStore, selectPlayer, selectCombatState, selectIsInCombat, selectInventory, selectVersion } from './Game/store';
export type { GameStore, GameActions } from './Game/store';
export { createNewGameState, GAME_STATE_VERSION } from './Game/game.reducer';
export type { GameState } from './Game/types';
export { COMBAT_ACTION } from './Game/actions.constants';
export type { CombatActionName } from './Game/actions.constants';

// Game — constants
export {
    STAT_MULTIPLIERS, RESOURCE_MULTIPLIERS, EXPERIENCE_PER_LEVEL,
    DEFENSE_MULTIPLIERS, PASSIVE_DEFENSE_MULTIPLIER,
    MAX_EFFECT_INTENSITY, MAX_EFFECT_DURATION, FRIENDSHIP_COUNTER_MAX,
} from './Game/game-mechanics.constants';

// Game — persistence
export type { PersistenceAdapter } from './Game/persistence/types';
export { nullAdapter } from './Game/persistence/null.adapter';
export { createNodeAdapter } from './Game/persistence/node.adapter';

// World
export { createStartingWorld } from './World';
export {
    changeMap, completeMap, unlockMap,
    completeNode, unlockNode, moveToNode,
    changeContinent, completeUniqueEvent,
} from './World/world.reducer';
export type { WorldState, Map, Continent, Quest, MapEvent, Reward } from './World/types';
export type { MapName, ContinentName } from './World/map.library';

// Utils
export {
    clamp, randomInt, deepClone, average, sum, max, min, inRange,
    capitalize, formatPercent,
    createDie, createDieRoll, determineRollAdvantageModifier,
    deriveStats, deriveNonCombatStats, calculateMaxHealth, calculateMaxMana,
} from './Utils';
export { isCharacter, isEnemy, isCombatActive } from './Utils/typeGuards';
export type { Image } from './Utils/types';
