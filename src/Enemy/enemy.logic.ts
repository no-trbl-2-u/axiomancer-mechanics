/**
 * Enemy AI Logic
 *
 * Each function below implements a different enemy decision-making
 * strategy. All functions return a `CombatAction` and are pure modulo
 * `Math.random` (which can be stubbed in tests).
 *
 * The `Enemy/index.ts` `determineEnemyAction` dispatcher selects one of
 * these based on the enemy's `logic` field.
 */

import { Stance, Action, CombatAction } from "Combat/types";
import { Enemy, EnemyLogicContext } from "./types";
import { BaseStats } from "../Character/types";

const STANCES: Stance[] = ['heart', 'body', 'mind'];
const ACTIONS: Action[] = ['attack', 'defend'];

const RPS_COUNTER: Record<Stance, Stance> = {
    heart: 'mind',  // mind beats heart, so to counter heart pick mind
    body: 'heart',  // heart beats body
    mind: 'body',   // body beats mind
};

function strongestStance(baseStats: BaseStats): Stance {
    let best: Stance = 'body';
    if (baseStats.heart > baseStats[best]) best = 'heart';
    if (baseStats.mind > baseStats[best]) best = 'mind';
    return best;
}

/**
 * Picks a random stance and a random attack/defend action.
 */
export function randomLogic(): CombatAction {
    return {
        type: STANCES[Math.floor(Math.random() * STANCES.length)],
        action: ACTIONS[Math.floor(Math.random() * ACTIONS.length)],
    };
}

/**
 * Always attacks. Favours the enemy's highest base stat 70% of the time;
 * 30% of the time picks any stance for unpredictability.
 */
export function aggressiveLogic(enemy: Enemy): CombatAction {
    const stance = Math.random() < 0.7
        ? strongestStance(enemy.baseStats)
        : STANCES[Math.floor(Math.random() * STANCES.length)];
    return { type: stance, action: 'attack' };
}

/**
 * Defends at high HP %, attacks at low HP %. The threshold is 50% — above
 * 50% the AI defends 70% of the time; below 50% it attacks 70% of the
 * time (frenzied desperation).
 */
export function defensiveLogic(
    enemy: Enemy,
    ctx: EnemyLogicContext = {},
): CombatAction {
    const hpPercent = ctx.enemyHpPercent ?? (enemy.health / Math.max(enemy.maxHealth, 1)) * 100;
    const defendChance = hpPercent >= 50 ? 0.7 : 0.3;
    const action: Action = Math.random() < defendChance ? 'defend' : 'attack';
    return { type: strongestStance(enemy.baseStats), action };
}

/**
 * 50/50 attack vs defend with a coarse stat-aware stance bias.
 */
export function balancedLogic(enemy: Enemy): CombatAction {
    return {
        type: Math.random() < 0.6
            ? strongestStance(enemy.baseStats)
            : STANCES[Math.floor(Math.random() * STANCES.length)],
        action: Math.random() < 0.5 ? 'attack' : 'defend',
    };
}

/**
 * Picks the stance that has type advantage over the player's last stance
 * (when known). Falls back to the enemy's strongest stat when the player
 * has not chosen a stance yet (round 1).
 *
 * Action defaults to attack but flips to defend at low HP %.
 */
export function strategicLogic(
    enemy: Enemy,
    ctx: EnemyLogicContext = {},
): CombatAction {
    const stance: Stance = ctx.playerLastStance
        ? RPS_COUNTER[ctx.playerLastStance]
        : strongestStance(enemy.baseStats);
    const hpPercent = ctx.enemyHpPercent ?? (enemy.health / Math.max(enemy.maxHealth, 1)) * 100;
    const action: Action = hpPercent < 30 ? 'defend' : 'attack';
    return { type: stance, action };
}

/**
 * Boss AI: strategic stance selection + multi-phase aggression.
 *
 * Phases:
 *   - HP ≥ 75%: balanced opener (mix of attack / defend)
 *   - HP 25%–75%: strategic counter-stance, attacks
 *   - HP < 25%: enraged — counter-stance, always attacks, ignores defend
 */
export function bossLogic(
    enemy: Enemy,
    ctx: EnemyLogicContext = {},
): CombatAction {
    const hpPercent = ctx.enemyHpPercent ?? (enemy.health / Math.max(enemy.maxHealth, 1)) * 100;
    const stance: Stance = ctx.playerLastStance
        ? RPS_COUNTER[ctx.playerLastStance]
        : strongestStance(enemy.baseStats);

    if (hpPercent >= 75) {
        return { type: stance, action: Math.random() < 0.5 ? 'attack' : 'defend' };
    }
    if (hpPercent >= 25) {
        return { type: stance, action: 'attack' };
    }
    return { type: stance, action: 'attack' };
}

/**
 * Dispatcher used by `determineEnemyAction` in `Combat/index.ts`. Returns
 * an action by routing to the appropriate logic function based on the
 * enemy's `logic` field.
 *
 * When the enemy is not provided (legacy `randomLogic()` call site), this
 * function falls back to plain random.
 */
export function dispatchEnemyLogic(
    enemy: Enemy | null,
    ctx: EnemyLogicContext = {},
): CombatAction {
    if (!enemy) return randomLogic();
    switch (enemy.logic) {
        case 'aggressive': return aggressiveLogic(enemy);
        case 'defensive':  return defensiveLogic(enemy, ctx);
        case 'balanced':   return balancedLogic(enemy);
        case 'strategic':  return strategicLogic(enemy, ctx);
        case 'boss':       return bossLogic(enemy, ctx);
        case 'random':
        default:           return randomLogic();
    }
}
