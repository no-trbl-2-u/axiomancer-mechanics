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
import { Enemy } from '../Enemy/types';
import { FRIENDSHIP_COUNTER_MAX } from '../Game/game-mechanics.constants';
import { Stance, Action, CombatAction, CombatState } from './types';

export type {
    Stance, Action, Advantage, CritStyle, CombatAction, PlayerCombatAction,
    CombatPhase, BattleLogEntry, CombatState, Combatant,
} from './types';

export { determineAdvantage, hasAdvantage, getAdvantageModifier, resolveEffectiveAdvantage } from './advantage';
export { getBaseStat, getAttackStat, getDefenseStat, getSaveStat, getResistStat } from './stats';
export { rollSkillCheck, isCriticalHit, isCriticalMiss } from './dice';
export { applyCriticalMultiplier, calculateFinalDamage, isAttackSuccessful } from './damage';
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
export {
    rollForCombatEffects, applyProcOutcome, applyFumbleOutcome,
    getEligibleTriggers, calculateProcChance, combatEffectsLibrary,
} from './combat-effects';
export type {
    CombatEffectTrigger, ProcUnlocks, ProcOverrides,
    ProcRollOutcome, FumbleOutcome, RollForCombatEffectsParams,
} from './combat-effects';

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
    RoundEndEvent,
} from './combat.resolver';

/**
 * Determines an enemy's action for the round. Pure wrapper over
 * `decideEnemyAction(logic)` so the Combat module owns enemy-action APIs.
 */
export function determineEnemyAction(enemy: Pick<Enemy, 'logic'>): CombatAction {
    return decideEnemyAction(enemy.logic);
}

/** True while combat should continue (both alive and friendship hasn't capped). */
export function isCombatOngoing(state: CombatState): boolean {
    return state.active
        && state.player.health > 0
        && state.enemy.health > 0
        && state.friendshipCounter < FRIENDSHIP_COUNTER_MAX;
}

/** Outcome of the encounter. `'ongoing'` while combat is still active. */
export function determineCombatEnd(state: CombatState): 'player' | 'ko' | 'friendship' | 'ongoing' {
    if (state.enemy.health <= 0) return 'player';
    if (state.player.health <= 0) return 'ko';
    if (state.friendshipCounter >= FRIENDSHIP_COUNTER_MAX) return 'friendship';
    return 'ongoing';
}

/** Returns true once a partial CombatAction has both stance and action filled in. */
export function isValidCombatAction(action: Partial<CombatAction>): action is CombatAction {
    return action.stance !== undefined && action.action !== undefined;
}

// Legacy export name retained for backward compatibility with any older code
// that imported `applyDamage` and `healCharacter` separately.
export { heal as healCharacter } from './health';
