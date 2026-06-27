/**
 * Combat barrel.
 *
 * Combat-specific logic is split across focused modules:
 *   advantage.ts        — type-advantage relationships and modifiers
 *   stats.ts            — stat lookups for combatants
 *   dice.ts             — skill checks and crit detection
 *   damage.ts           — final damage and attack outcome
 *   health.ts           — applyDamage / heal / status checks
 *   effects.ts          — combatant-side effect manipulations
 *   resist.ts           — tier 2/3 effect application resolver
 *   combat.reducer.ts   — small state-shape mutations on CombatState
 *   combat.resolver.ts  — `resolveCombatRound` (the single round-resolution
 *                         entry point used by every UI client) and the
 *                         `RoundEvent` discriminated union it emits.
 *
 * Round-resolution pure helpers also live here.
 */

import { decideEnemyAction } from '../Enemy/enemy.logic';
import { Enemy, BefriendabilityConfig } from '../Enemy/types';
import { FRIENDSHIP_COUNTER_MAX } from '../Game/game-mechanics.constants';
import { CombatAction, CombatState, Stance } from './types';
import { analyzeEffectsForResolution } from './effect-resolution';

export type {
    Stance, Action, Advantage, CritStyle, CombatAction, PlayerCombatAction,
    CombatPhase, BattleLogEntry, CombatState, Combatant,
} from './types';

export { determineAdvantage, hasAdvantage, getAdvantageModifier, resolveEffectiveAdvantage } from './advantage';
export { getBaseStat, getAttackStat, getDefenseStat, getSaveStat } from './stats';
export { rollSkillCheck, isCriticalHit, isCriticalMiss } from './dice';
export { applyCriticalMultiplier, calculateFinalDamage, selectCritDamage, isAttackSuccessful } from './damage';
export { applyDamage, heal, isAlive, isDefeated, getHealthPercentage } from './health';
export {
    MIND_MARK_ID,
    getStudyMarkIntensity, getActiveRollModifier, getThornsReflect,
    updateEffectDuration, tickAllEffects,
    removeRandomBuff, extendRandomBuffDuration, applyRegen, applyDrain,
    processDamageOverTime, processRoundStartEffects, processRoundEndEffects,
    applyCleanse, applyDispel,
} from './effects';
export {
    getActiveEffectModifiers, getEffectiveStats, canAct,
} from './effect-modifiers';
export type {
    AggregatedEffectModifiers, EffectiveStats,
} from './effect-modifiers';
export { resolveEffectApplication } from './resist';
export { calculateDamageResistance, getSkillDamageType } from './damage-resist';
export type { DamageType } from './damage-resist';
export {
    rollForCombatEffects, applyProcOutcome, applyFumbleOutcome,
    getEligibleTriggers, calculateProcChance, combatEffectsLibrary,
} from './combat-effects';
export type {
    CombatEffectTrigger, ProcUnlocks, ProcOverrides,
    ProcRollOutcome, FumbleOutcome, RollForCombatEffectsParams,
} from './combat-effects';
export { calculateEnemyStatMultiplier, applyMoralMeterScaling } from './difficulty';

// Phase 108 — Mercy choice functions and combat state management
export {
    initializeCombat, setPhase, setPlayerStance, setPlayerAction, 
    appendLog, incrementFriendship, selectMercyChoice, endCombat
} from './combat.reducer';

// ─── Round resolver ──────────────────────────────────────────────────────────
// `resolveCombatRound` is the single entry point any UI client (CLI, future
// React Native UI, automated tester) calls to advance combat by one round.
// It returns `{ state, combatEvents }` so consumers render from the typed
// event stream and never re-implement the math.
export { resolveCombatRound } from './combat.resolver';
export type {
    RoundResolution, RoundEvent, CombatActor,
    RoundStartEvent, ActionRestrictionEvent, AdvantageEvent,
    StanceEffectEvent, ScenarioEvent, SkillPhaseEvent, ResourceEvent,
    ItemPhaseEvent, RoundEndEvent,
} from './combat.resolver';

/**
 * Determines an enemy's action for the round. Pure wrapper over
 * `decideEnemyAction(enemy, state?)` so the Combat module owns enemy-action
 * APIs.
 *
 * Spec 07 Q2: when a `CombatState` is supplied the enemy's strategy can
 * react to the player's HP / effects / last stance. Older callers that only
 * have the enemy in hand still work (strategies fall back to stateless
 * heuristics).
 */
export function determineEnemyAction(
    enemy: Enemy,
    state?: CombatState,
): CombatAction {
    return decideEnemyAction(enemy, state);
}

/**
 * Phase 68 — friendship-eligibility predicate. Returns true when the
 * current `CombatState` satisfies the active enemy's `BefriendabilityConfig`
 * (all named predicates AND-compose). When the enemy has no config OR the
 * config sets `defaultFallback: 'both-defend-cap'`, falls through to the
 * Phase 36 mechanic (`friendshipCounter >= FRIENDSHIP_COUNTER_MAX`).
 *
 * Not exported from the public barrel — internal helper for
 * `determineCombatEnd` + `isCombatOngoing` so the two predicates stay in
 * lockstep. Callers outside the engine read combat-end state through
 * `determineCombatEnd`.
 *
 * D5: `requiredStances` / `requiredSkillUse` derive from `state.log` rather
 * than separate tracking state on `CombatState`. The log already captures
 * `playerAction.stance` and (when `action === 'skill'`) `playerAction.skillId`
 * per resolved round.
 */
function befriendabilityPredicatesPass(
    state: CombatState,
    options: { requirePassiveCounter: boolean },
): boolean {
    const config: BefriendabilityConfig | undefined = state.enemy.befriendabilityConfig;
    if (!config || config.defaultFallback === 'both-defend-cap') {
        return options.requirePassiveCounter
            ? state.friendshipCounter >= FRIENDSHIP_COUNTER_MAX
            : true;
    }
    const threshold = config.roundsThreshold ?? FRIENDSHIP_COUNTER_MAX;
    if (options.requirePassiveCounter && state.friendshipCounter < threshold) return false;
    if (config.hpGate) {
        const maxHp = state.enemy.maxHealth;
        if (maxHp <= 0) return false;
        const hpFraction = state.enemy.health / maxHp;
        if (hpFraction > config.hpGate.belowPct) return false;
    }
    if (config.requiredStances && config.requiredStances.length > 0) {
        const usedStances = new Set<Stance>(
            state.log.map(entry => entry.playerAction.stance),
        );
        if (!config.requiredStances.some(stance => usedStances.has(stance))) {
            return false;
        }
    }
    if (config.requiredSkillUse && config.requiredSkillUse.length > 0) {
        const castSkills = new Set<string>(
            state.log
                .filter(entry => entry.playerAction.action === 'skill' && entry.playerAction.skillId !== undefined)
                .map(entry => entry.playerAction.skillId as string),
        );
        if (!config.requiredSkillUse.some(skillId => castSkills.has(skillId))) {
            return false;
        }
    }
    return true;
}

/**
 * Phase 112 — returns true when the enemy is vulnerable to an explicit
 * Befriend skill attempt. HP gates and authored stance/skill predicates still
 * matter, but passive both-defend counter pressure is not, by itself, a combat
 * end or a mercy decision.
 */
export function isBefriendAttemptEligible(state: CombatState): boolean {
    return befriendabilityPredicatesPass(state, { requirePassiveCounter: false });
}

export function isFriendshipEligible(state: CombatState): boolean {
    return state.friendshipResolutionAuthorized === true;
}

/**
 * Phase 125 — checks if status effects should force a combat resolution.
 * 
 * Returns the type of resolution effects should trigger:
 * - 'victory': DoT effects can finish the enemy 
 * - 'friendship': Enemy is saturated with control/debuff effects
 * - null: Effects insufficient for resolution
 */
export function getEffectsResolutionOutcome(state: CombatState): 'victory' | 'friendship' | null {
    const analysis = analyzeEffectsForResolution(state);
    return analysis.shouldResolve ? analysis.outcomeType : null;
}

/** True while combat should continue (both alive and friendship not yet eligible). */
export function isCombatOngoing(state: CombatState): boolean {
    return state.active
        && state.player.health > 0
        && state.enemy.health > 0
        && !isFriendshipEligible(state)
        && getEffectsResolutionOutcome(state) === null;
}

/** Outcome of the encounter. `'ongoing'` while combat is still active. */
export function determineCombatEnd(state: CombatState): 'player' | 'ko' | 'friendship' | 'ongoing' {
    if (state.enemy.health <= 0) return 'player';
    if (state.player.health <= 0) return 'ko';
    if (isFriendshipEligible(state)) return 'friendship';
    
    // Phase 125 — check if effects should force resolution
    const effectsOutcome = getEffectsResolutionOutcome(state);
    if (effectsOutcome === 'victory') return 'player';
    if (effectsOutcome === 'friendship') return 'friendship';
    
    return 'ongoing';
}

/** Returns true once a partial CombatAction has both stance and action filled in. */
export function isValidCombatAction(action: Partial<CombatAction>): action is CombatAction {
    return action.stance !== undefined && action.action !== undefined;
}

// Legacy export name retained for backward compatibility with any older code
// that imported `applyDamage` and `healCharacter` separately.
export { heal as healCharacter } from './health';

// Phase 142 — Status effect resolution constants and interaction support
export {
    STATUS_RESOLUTION_DEBUFF_THRESHOLD,
    STATUS_RESOLUTION_DOT_THRESHOLD,
    STATUS_RESOLUTION_DOT_MAX_ROUNDS,
    STATUS_ENGAGEMENT_FLOOR_PERCENT,
    INTERACTION_AMPLIFICATION,
    INTERACTION_PRIORITY
} from './resolution.constants';

// ─── Spec 25 — Hazard-Pattern Combat ──────────────────────────────────────────
// The card-and-dice combat driver. Ships alongside `resolveCombatRound`; the
// effects + skill engines are unchanged (Spec 25 §12 Q4 recommendation (b)).
export type {
    CombatEncounterState, CombatEncounterPhase, CombatTransition,
    CombatManaDie, CombatDieColor, CombatDieState,
    CombatCard, CombatHandEntry, CardPlay, CombatVerbClass, CardEffectKind,
    CombatThreatPhase, CombatThreatAction, CombatThreatEffect,
    CombatThreatMark, CombatPhaseResult, CombatOutcome, CombatEvent,
    CombatSummary, CombatAttributionRow, LandedEffect,
    // Spec 26 / 26b additions
    CombatIntentType, CombatReadResult,
    SignatureSkill, SignatureSkillId, SignatureSkillKind,
} from './combat.encounter.types';
export {
    initializeCombatEncounter, rollEncounterDice, playCombatCard,
    resolveCombatPhase, resolveThreatPhase, processBetweenPhases,
    selectMercyChoice as selectEncounterMercyChoice, resolveCardDieCost, getCard,
    handCards, cardDieCostPreview, availableDice, buildCombatSummary,
    // Spec 26b — turn lifecycle + read + Conviction + Signature Skills
    startTurn, draftStanceDie, endTurn, resolveRead, chooseDraft, discardCombatCard,
    playSignatureSkill, getDraftedDie, isPhaseStanceRevealed, revealedCurrentStance,
    cardReadPreview, projectCardImpact, getSignatureSkill, SIGNATURE_SKILLS, SIGNATURE_SKILL_LIST,
    READ_DAMAGE_MULT, CONVICTION_PER_UNPICKED_DIE, CONVICTION_READ_WIN_BONUS,
    COLOR_MATCH_DAMAGE_BONUS,
    THREAT_WEAKEN_PER_ROLL, THREAT_DENY_AT, THREAT_WEAKEN_FLOOR,
} from './combat.engine';
export type { CardDieCost } from './combat.engine';
export {
    COMBAT_DICE_COUNT, TURN_DICE_COUNT, COMBAT_DIE_FACES, rollCombatDice, rollTurnDice,
    rollCombatDieColor, dieHasStance,
    combatDieCanPower, refreshOneDie,
    dieIsRerollable, hasRerollableDice, rerollSpentDice,
} from './combat.dice';
export { COMBAT_HAND_SIZE, buildCombatDeck, drawCombatCards, shuffleCombatDeck } from './combat.deck';
export {
    COMBAT_DECK_PRESETS, COMBAT_DECK_PRESET_ORDER,
    listDeckPresets, getDeckPreset, buildPresetDeck,
} from './combat.deck-presets';
export type { CombatDeckPreset, CombatDeckFocus } from './combat.deck-presets';
export {
    toCombatCard, projectDeck, classifyVerbClass,
    isSyntheticCard, SYNTHETIC_CARD_IDS,
    GOLD_CARD_IDS, isGoldCard,
} from './combat.cards';
export {
    getThreatSequence, generateDefaultThreatSequence,
    deriveIntentType, AUTHORED_THREAT_ENEMY_IDS,
} from './combat.threat';
export { simulateHazardPatternCombat } from './combat.encounter.sim';
export type { CombatSimStats, CombatSimPolicyId } from './combat.encounter.sim';
// Spec 26b tuning §B/§C/§D — archetype signatures, deckbuilder rewards, unlock hook
export { SIGNATURE_KITS, signaturesForArchetype, playerArchetype } from './combat.signature';
export {
    COMBAT_REWARD_POOL, STARTING_SKILL_ID, STARTING_SKILL_IDS, rollCombatCardRewards, addRewardCard,
    unlockSkillViaDilemma,
} from './combat.rewards';
export type { PlayerArchetype } from './combat.encounter.types';
