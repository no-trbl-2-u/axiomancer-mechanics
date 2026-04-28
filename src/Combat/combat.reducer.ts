/**
 * Combat Reducer
 * Functions that create or modify CombatState objects.
 * All functions here are pure and return new state objects.
 */

import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { Stance, Action, CombatPhase, CombatState, BattleLogEntry, CombatAction } from './types';
import { deepClone } from '../Utils';
import {
    determineAdvantage,
    applyDamage,
    processPlayerTurn,
    processEnemyTurn,
    createBattleLogEntry,
    rollForCombatEffects,
    applyCombatEffects,
    isValidCombatAction,
    getThornsReflect,
} from './index';
import {
    applyTier1CombatEffectWithResult,
    clearTier1EffectsForType,
    processRoundStartEffects,
} from '../Effects';

// ============================================================================
// COMBAT STATE INITIALIZATION
// ============================================================================

/**
 * Initializes a new combat state between a player and an enemy
 * @param player - The player character entering combat
 * @param enemy - The enemy character being fought
 * @returns A new CombatState object with initial values
 */
export function initializeCombat(player: Character, enemy: Enemy): CombatState {
    return {
        active: true,
        phase: 'choosing_type',
        round: 1,
        friendshipCounter: 0,
        player: deepClone(player),
        enemy: deepClone(enemy),
        playerChoice: {},
        enemyChoice: {},
        logEntry: [],
    };
}

// ============================================================================
// COMBAT PHASE MANAGEMENT
// ============================================================================

/**
 * Updates the combat phase
 * @param state - The current combat state
 * @param phase - The new phase to transition to
 * @returns Updated combat state with new phase
 */
export function updateCombatPhase(state: CombatState, phase: CombatPhase): CombatState {
    return { ...state, phase };
}

// ============================================================================
// COMBAT ACTION SELECTION
// ============================================================================

/**
 * Sets the player's chosen stance for the current round
 * @param state - The current combat state
 * @param stance - The stance chosen by the player (heart/body/mind)
 * @returns Updated combat state with player's stance choice
 */
export function setPlayerStance(state: CombatState, stance: Stance): CombatState {
    return { ...state, playerChoice: { ...state.playerChoice, type: stance } };
}

/**
 * Sets the player's chosen action for the current round
 * @param state - The current combat state
 * @param action - The action chosen by the player (attack/defend/skill/item/flee)
 * @returns Updated combat state with player's action choice
 */
export function setPlayerAction(state: CombatState, action: Action): CombatState {
    return { ...state, playerChoice: { ...state.playerChoice, action } };
}

// ============================================================================
// COMBAT ROUND RESOLUTION
// ============================================================================

/**
 * Resets the combat state to the empty / inactive shape returned for a
 * brand-new game. Called when the player exits combat without finishing
 * it (e.g. flee succeeds) or after `endCombat*` clean-up.
 *
 * NOTE: this returns a state with `active: false` and zeroed combatants
 * — callers that want to re-enter combat should call `initializeCombat`
 * fresh instead.
 *
 * @param state - The current combat state (used only for player/enemy refs;
 *   pass any `CombatState` if you don't have one available, the player
 *   and enemy will be deep-cloned with health restored to maxHealth)
 * @returns A clean inactive `CombatState`
 */
export function resetCombat(state: CombatState): CombatState {
    const player = deepClone(state.player);
    const enemy = deepClone(state.enemy);
    return {
        active: false,
        phase: 'choosing_type',
        round: 1,
        friendshipCounter: 0,
        player: { ...player, health: player.maxHealth, mana: player.maxMana, currentActiveEffects: [] },
        enemy: { ...enemy, health: enemy.maxHealth, mana: enemy.maxMana, currentActiveEffects: [] },
        playerChoice: {},
        enemyChoice: {},
        logEntry: [],
    };
}

/**
 * Resolves a complete combat round with both combatants' choices already
 * set on the state.
 *
 * Pipeline (mirrors `docs/combat.md`):
 *   1. Round-start: regen → DoT → tick (`processRoundStartEffects`)
 *   2. Clear stale Tier 1 self-buffs on stance change
 *   3. Apply Tier 1 stance effects (mind mark, ad baculum, etc.)
 *   4. Resolve combat:
 *        - both attack → contested rolls; loser takes mitigated damage,
 *          winner may apply Heart-attack specials and Mind mark bonus
 *        - one attacks, one defends → attacker resolved against defender
 *        - both defend → friendship counter ++
 *   5. Apply Tier 2/3 procs from `rollForCombatEffects`
 *   6. Build `BattleLogEntry`, append, advance round, clear choices
 *
 * Pure — accepts and returns a `CombatState` without mutation. Calls
 * into `processPlayerTurn` / `processEnemyTurn` for damage math, then
 * applies that damage and creates the log entry.
 *
 * @param state - The current combat state with both `playerChoice` and
 *   `enemyChoice` fully populated
 * @returns The updated combat state with damage applied, effects ticked,
 *   procs applied, and the round advanced
 */
export function resolveCombatRound(state: CombatState): CombatState {
    if (!isValidCombatAction(state.playerChoice) || !isValidCombatAction(state.enemyChoice)) {
        return state;
    }

    let working = state;

    // 1) Round-start effects
    const { state: afterTick } = processRoundStartEffects(working);
    working = afterTick;

    const playerChoice = working.playerChoice as CombatAction;
    const enemyChoice = working.enemyChoice as CombatAction;

    // 2) Clear stale Tier 1 self-buffs
    const playerCleared = clearTier1EffectsForType(working.player.currentActiveEffects, playerChoice.type);
    const enemyCleared = clearTier1EffectsForType(working.enemy.currentActiveEffects, enemyChoice.type);
    working = {
        ...working,
        player: { ...working.player, currentActiveEffects: playerCleared.activeEffects },
        enemy: { ...working.enemy, currentActiveEffects: enemyCleared.activeEffects },
    };

    // 3) Apply Tier 1 stance effects (player → enemy first, then enemy → player)
    const t1Player = applyTier1CombatEffectWithResult(
        working.player.currentActiveEffects,
        working.enemy.currentActiveEffects,
        playerChoice,
        working.round,
    );
    working = {
        ...working,
        player: { ...working.player, currentActiveEffects: t1Player.actorEffects },
        enemy: { ...working.enemy, currentActiveEffects: t1Player.opponentEffects },
    };

    const t1Enemy = applyTier1CombatEffectWithResult(
        working.enemy.currentActiveEffects,
        working.player.currentActiveEffects,
        enemyChoice,
        working.round,
        working.enemy.tier1Effects,
    );
    working = {
        ...working,
        enemy: { ...working.enemy, currentActiveEffects: t1Enemy.actorEffects },
        player: { ...working.player, currentActiveEffects: t1Enemy.opponentEffects },
    };

    // 4) Combat resolution
    const advantage = determineAdvantage(playerChoice.type, enemyChoice.type);
    const bothDefend = playerChoice.action === 'defend' && enemyChoice.action === 'defend';

    let damageToEnemy = 0;
    let damageToPlayer = 0;
    let playerRoll = 0;
    let enemyRoll = 0;
    let playerRollDetails = '';
    let enemyRollDetails = '';
    let friendshipCounter = working.friendshipCounter;

    if (bothDefend) {
        friendshipCounter += 1;
        playerRollDetails = 'Both defended — friendship +1.';
        enemyRollDetails = 'Both defended — friendship +1.';
    } else {
        const playerTurn = processPlayerTurn(working);
        const enemyTurn = processEnemyTurn(working);
        damageToEnemy = playerTurn.damageToEnemy;
        damageToPlayer = enemyTurn.damageToPlayer;
        playerRoll = playerTurn.playerRoll;
        enemyRoll = enemyTurn.enemyRoll;
        playerRollDetails = playerTurn.playerRollDetails;
        enemyRollDetails = enemyTurn.enemyRollDetails;

        // Apply damage
        if (damageToEnemy > 0) {
            working = { ...working, enemy: applyDamage(working.enemy, damageToEnemy) };
        }
        if (damageToPlayer > 0) {
            working = { ...working, player: applyDamage(working.player, damageToPlayer) };
        }

        // Thorns: reflect when a hit lands on the bearer
        if (damageToPlayer > 0) {
            const thorns = getThornsReflect(working.player);
            if (thorns > 0) {
                working = { ...working, enemy: applyDamage(working.enemy, thorns) };
            }
        }
        if (damageToEnemy > 0) {
            const thorns = getThornsReflect(working.enemy);
            if (thorns > 0) {
                working = { ...working, player: applyDamage(working.player, thorns) };
            }
        }
    }

    // 5) Tier 2/3 procs (only when an attack landed; or always for self-buff defends)
    if (playerChoice.action === 'attack' || playerChoice.action === 'defend') {
        const procs = rollForCombatEffects(working.player, playerChoice, playerRoll || 10);
        const result = applyCombatEffects(working, 'player', procs);
        working = result.state;
    }
    if (enemyChoice.action === 'attack' || enemyChoice.action === 'defend') {
        const procs = rollForCombatEffects(working.enemy, enemyChoice, enemyRoll || 10);
        const result = applyCombatEffects(working, 'enemy', procs);
        working = result.state;
    }

    // 6) Build log entry, append, advance round, clear choices
    const entry = createBattleLogEntry(working, {
        advantage,
        playerRoll,
        playerRollDetails,
        enemyRoll,
        enemyRollDetails,
        damageToPlayer,
        damageToEnemy,
    });

    return {
        ...working,
        friendshipCounter,
        logEntry: [...working.logEntry, entry],
        round: working.round + 1,
        playerChoice: {},
        enemyChoice: {},
    };
}

// ============================================================================
// BATTLE LOG MANAGEMENT
// ============================================================================

/**
 * Adds a new log entry to combat state for the current round of combat
 * @param state - The current combat state
 * @param entry - The log entry to add
 * @returns Updated combat state with new log entry appended
 */
export function addBattleLogEntry(state: CombatState, entry: BattleLogEntry): CombatState {
    return { ...state, logEntry: [...state.logEntry, entry] };
}

// ============================================================================
// FRIENDSHIP COUNTER (Special Mechanic)
// ============================================================================

/**
 * Increments the friendship counter by 1.
 * Called when both combatants choose 'defend' on the same turn.
 * @param state - The current combat state
 * @returns Updated state with incremented friendship counter
 */
export function incrementFriendship(state: CombatState): CombatState {
    return { ...state, friendshipCounter: state.friendshipCounter + 1 };
}

/**
 * Ends combat with a friendship victory.
 * TODO (Phase 2c): add friendship-specific rewards/outcomes.
 * @param state - The current combat state
 * @returns Updated state with combat ended via friendship
 */
export function endCombatWithFriendship(state: CombatState): CombatState {
    return { ...state, active: false, phase: 'ended' };
}

// ============================================================================
// COMBAT END STATE
// ============================================================================

/**
 * Ends combat with player victory
 * @param state - The current combat state
 * @returns Updated state with combat ended (player won)
 */
export function endCombatPlayerVictory(state: CombatState): CombatState {
    return { ...state, active: false, phase: 'ended' };
}

/**
 * Ends combat with player defeat
 * @param state - The current combat state
 * @returns Updated state with combat ended (player lost)
 */
export function endCombatPlayerDefeat(state: CombatState): CombatState {
    return { ...state, active: false, phase: 'ended' };
}
