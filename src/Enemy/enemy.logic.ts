/**
 * Enemy AI strategies (Spec 07).
 *
 * Every strategy is a pure function from `(enemy, state?)` → `CombatAction`.
 * Strategies may read the live `CombatState` so they can react to player HP /
 * active effects / last declared stance (Spec 07 Q2).
 *
 * Variety comes from `Math.random`; tests stub it via the harness in
 * `src/test-utils/rng.ts`. Seeded RNG arrives in Spec 11.
 */

import { Stance, Action, CombatAction, CombatState } from '../Combat/types';
import { Enemy, EnemyLogic } from './types';
import { getRng } from '../Utils/rng';

const STANCES: readonly Stance[] = ['heart', 'body', 'mind'];
const ATTACK_OR_DEFEND: readonly Extract<Action, 'attack' | 'defend'>[] =
    ['attack', 'defend'];

/** Stance that beats `s` in rock-paper-scissors: heart > body > mind > heart. */
export function counterStanceOf(s: Stance): Stance {
    switch (s) {
        case 'body':  return 'heart';
        case 'mind':  return 'body';
        case 'heart': return 'mind';
    }
}

function pickRandom<T>(items: readonly T[]): T {
    return items[Math.floor(getRng().random() * items.length)];
}

function chance(p: number): boolean {
    return getRng().random() < p;
}

/** Stance with the lowest base stat on `target` — the easiest to break. */
export function weakestStanceOf(target: { baseStats: { heart: number; body: number; mind: number } }): Stance {
    const entries: Array<[Stance, number]> = [
        ['heart', target.baseStats.heart],
        ['body',  target.baseStats.body],
        ['mind',  target.baseStats.mind],
    ];
    entries.sort((a, b) => a[1] - b[1]);
    return entries[0][0];
}

/** The player's last *declared* stance, or `undefined` if no rounds resolved. */
function lastPlayerStance(state: CombatState | undefined): Stance | undefined {
    if (!state) return undefined;
    const lastEntry = state.log[state.log.length - 1];
    return lastEntry?.playerAction.stance;
}

/** Maps the three Spec 03 vulnerability debuffs to the stance that exploits them. */
const VULN_TO_STANCE: Record<string, Stance | undefined> = {
    debuff_vulnerability_body:  'body',
    debuff_vulnerability_mind:  'mind',
    debuff_vulnerability_heart: 'heart',
};

// ─── Per-strategy decision functions ──────────────────────────────────────────

/** Picks a uniformly random stance and a uniformly random action. */
export function randomLogic(): CombatAction {
    return {
        stance: pickRandom(STANCES),
        action: pickRandom(ATTACK_OR_DEFEND),
    };
}

/**
 * Aggressive: attack 75% of the time; preferred stance counters the player's
 * last declared stance, otherwise random.
 */
export function aggressiveLogic(state?: CombatState): CombatAction {
    const action: 'attack' | 'defend' = chance(0.75) ? 'attack' : 'defend';
    const prev = lastPlayerStance(state);
    const stance: Stance = prev ? counterStanceOf(prev) : pickRandom(STANCES);
    return { stance, action };
}

/**
 * Defensive: defend in a random stance until HP drops to or below 50%, then
 * attack with the stance the player is weakest in.
 */
export function defensiveLogic(enemy: Enemy, state?: CombatState): CombatAction {
    const hpPercent = enemy.maxHealth > 0 ? enemy.health / enemy.maxHealth : 1;
    if (hpPercent <= 0.5 && state) {
        return { stance: weakestStanceOf(state.player), action: 'attack' };
    }
    return { stance: pickRandom(STANCES), action: 'defend' };
}

/**
 * Balanced: attack while above 50% HP, defend below. Stance counters the
 * player's last stance.
 */
export function balancedLogic(enemy: Enemy, state?: CombatState): CombatAction {
    const hpPercent = enemy.maxHealth > 0 ? enemy.health / enemy.maxHealth : 1;
    const action: 'attack' | 'defend' = hpPercent > 0.5 ? 'attack' : 'defend';
    const prev = lastPlayerStance(state);
    const stance: Stance = prev ? counterStanceOf(prev) : pickRandom(STANCES);
    return { stance, action };
}

/**
 * Strategic: exploits stance-aligned `debuff_vulnerability_*` on the player
 * by attacking with the matching stance. Falls back to `aggressiveLogic`
 * when nothing exploitable is in play.
 */
export function strategicLogic(_enemy: Enemy, state?: CombatState): CombatAction {
    if (state) {
        for (const ae of state.player.effects) {
            const exploit = VULN_TO_STANCE[ae.effectId];
            if (exploit) {
                return { stance: exploit, action: 'attack' };
            }
        }
    }
    return aggressiveLogic(state);
}

/**
 * Boss: deterministic 4-round phase script. Counts off the current round
 * (1-indexed) and emits a telegraphed signature pattern, then loops.
 *
 *   round mod 4 === 1 → Body defend  (set posture + Tier 1 body buff)
 *   round mod 4 === 2 → counter-attack against the player's last stance
 *   round mod 4 === 3 → Mind attack  (signature pressure on the player's HP)
 *   round mod 4 === 0 → Heart defend (recover; sets up next loop)
 */
export function bossLogic(_enemy: Enemy, state?: CombatState): CombatAction {
    const round = state?.round ?? 1;
    const phase = ((round - 1) % 4) + 1;
    switch (phase) {
        case 1: return { stance: 'body',  action: 'defend' };
        case 2: {
            const prev = lastPlayerStance(state);
            return { stance: prev ? counterStanceOf(prev) : 'body', action: 'attack' };
        }
        case 3: return { stance: 'mind',  action: 'attack' };
        default: return { stance: 'heart', action: 'defend' };
    }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

/**
 * Resolves the enemy's CombatAction for the round.
 *
 * Overloads:
 *   `decideEnemyAction(enemy, state?)` — the canonical Spec 07 path. The
 *      strategy receives `state` so it can react to the player.
 *   `decideEnemyAction(logic)` — legacy convenience that only knows the AI
 *      tag. Used by older tests; falls through to stateless heuristics.
 */
export function decideEnemyAction(enemy: Enemy, state?: CombatState): CombatAction;
export function decideEnemyAction(logic: EnemyLogic): CombatAction;
export function decideEnemyAction(
    arg: Enemy | EnemyLogic,
    state?: CombatState,
): CombatAction {
    const enemy: Enemy | undefined = typeof arg === 'object' ? arg : undefined;
    const logic: EnemyLogic = typeof arg === 'string' ? arg : arg.logic;

    switch (logic) {
        case 'random':
            return randomLogic();
        case 'aggressive':
            return aggressiveLogic(state);
        case 'defensive':
            return enemy ? defensiveLogic(enemy, state) : randomLogic();
        case 'balanced':
            return enemy ? balancedLogic(enemy, state) : randomLogic();
        case 'strategic':
            return enemy ? strategicLogic(enemy, state) : randomLogic();
        case 'boss':
            return enemy ? bossLogic(enemy, state) : randomLogic();
        default: {
            const _exhaustive: never = logic;
            void _exhaustive;
            return randomLogic();
        }
    }
}
