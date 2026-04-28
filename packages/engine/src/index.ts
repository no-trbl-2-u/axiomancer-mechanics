// ─── Package API ──────────────────────────────────────────────────────────────
// This is the public surface of axiomancer-mechanics.
// Consumers (React Native app, etc.) import from this barrel.

// Character
export { createCharacter } from './character';
export type { Character, BaseStats, DerivedStats, NonCombatStats } from './character/types';
export { Player as PlayerMock } from '../fixtures/characters';

// Enemy
export { createEnemy, getEnemyRelatedStat } from './enemy';
export type { Enemy, EnemyLogic, EnemyTier1EffectMap } from './enemy/types';
export { Disatree_01, EnemyLibrary } from './enemy/enemy.library';

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
} from './combat';

// Combat — reducer
export {
    initializeCombat, updateCombatPhase,
    setPlayerStance, setPlayerAction,
    addBattleLogEntry, incrementFriendship,
    endCombatPlayerVictory, endCombatPlayerDefeat, endCombatWithFriendship,
} from './combat/combat.reducer';

// Combat — types
export type {
    Stance, Action, Advantage, CritStyle, CombatAction, CombatPhase,
    BattleLogEntry, CombatState,
} from './combat/types';

// Effects
export {
    applyEffect, applyTier1CombatEffect, applyTier1CombatEffectWithResult,
    clearTier1EffectsForType, getTargetsResistStatValue,
} from './effects';
export type { ApplyEffectOptions } from './effects';
export { getResistStatFromResistedBy } from './effects/resistance';
export { lookupEffect, getEffectByName, getEffectsByType, effectsLibrary } from './effects/effects.library';
export type {
    Effect, EffectType, EffectStacking, EffectCategory, EffectPayload,
    ActiveEffect, EffectApplicationResult,
    StatModifier, DamageOverTime, RegenerationConfig, ActionRestriction, AdvantageModifier,
} from './effects/types';

// Items
export { addItemToInventory, removeItemFromInventory, useConsumable, stackItem } from './items';
export type { Item, Equipment, Consumable, Material, QuestItem, ItemCategory, EquipmentSlot } from './items/types';
export { isEquipment, isConsumable, isMaterial, isQuestItem } from './items/types';

// Skills — types only (no implementation yet)
export type { Skill, SkillCategory, SkillsStatType, SkillLearningRequirement } from './skills/types';

// Game — store & reducers
export {
    createGameStore,
    selectPlayer, selectCombatState, selectIsInCombat, selectInventory, selectVersion,
} from './store';
export type { GameStore, GameActions } from './store';
export { createNewGameState, GAME_STATE_VERSION } from './game/game.reducer';
export type { GameState } from './game/types';
export { COMBAT_ACTION } from './game/actions.constants';
export type { CombatActionName } from './game/actions.constants';

// Game — constants
export {
    STAT_MULTIPLIERS, RESOURCE_MULTIPLIERS, EXPERIENCE_PER_LEVEL,
    DEFENSE_MULTIPLIERS, PASSIVE_DEFENSE_MULTIPLIER,
    MAX_EFFECT_INTENSITY, MAX_EFFECT_DURATION, FRIENDSHIP_COUNTER_MAX,
} from './game/game-mechanics.constants';

// Persistence — platform-neutral surface only.
// Platform-specific adapters live on their own subpaths:
//   axiomancer-mechanics/persistence/node            (Node fs)
//   axiomancer-mechanics/persistence/async-storage   (React Native)
//   axiomancer-mechanics/persistence/web-storage     (browser)
export type { PersistenceAdapter } from './persistence/types';
export { nullAdapter } from './persistence/null';
export { createMemoryAdapter } from './persistence/memory';

/** @deprecated Import from `axiomancer-mechanics/persistence/node`. */
export { createNodeAdapter } from './persistence/node';

// World
export { createStartingWorld } from './world';
export {
    changeMap, completeMap, unlockMap,
    completeNode, unlockNode, moveToNode,
    changeContinent, completeUniqueEvent,
} from './world/world.reducer';
export type { WorldState, Map, Continent, Quest, MapEvent, Reward } from './world/types';
export type { MapName, ContinentName } from './world/map.library';

// Utils
export {
    clamp, randomInt, deepClone, average, sum, max, min, inRange,
    capitalize, formatPercent,
    createDie, createDieRoll, determineRollAdvantageModifier,
    deriveStats, deriveNonCombatStats, calculateMaxHealth, calculateMaxMana,
} from './utils';
export { isCharacter, isEnemy, isCombatActive } from './utils/typeGuards';
export type { Image } from './utils/types';
