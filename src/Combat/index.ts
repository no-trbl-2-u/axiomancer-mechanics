/**
 * Combat System Implementation
 * Turn-based RPG combat with rock-paper-scissors mechanics
 * Heart > Body > Mind > Heart (cyclic advantage)
 */

import { randomLogic } from '../Enemy/enemy.logic';
import { Character } from '../Character/types';
import { Enemy, EnemyLogic } from '../Enemy/types';
import { getEnemyRelatedStat } from '../Enemy';
import { isCharacter } from '../Utils/typeGuards';
import { randomInt, createDieRoll } from '../Utils';
import { FRIENDSHIP_COUNTER_MAX } from '../Game/game-mechanics.constants';

import {
    ActionType,
    Action,
    Advantage,
    CombatAction,
    BattleLogEntry,
    CombatState,
} from './types';

// ============================================================================
// ENEMY ACTION
// ============================================================================

/**
 * Determines the enemy's action based on the enemy's logic
 * @param enemyLogic - The logic chosen by the enemy
 * @returns The enemy's action
 */
export const determineEnemyAction = (enemyLogic: EnemyLogic): CombatAction => {
    switch (enemyLogic) {
        case 'random':
            return randomLogic();
        default:
            return randomLogic();
    }
};

// ============================================================================
// COMBAT END CONDITIONS
// ============================================================================

/**
 * Checks if combat should end based on health values
 * @param state - The current combat state
 * @returns True if either combatant has 0 or less health
 */
export function isCombatOngoing(state: CombatState): boolean {
    return state.active && state.player.health > 0 && state.enemy.health > 0 && state.friendshipCounter < FRIENDSHIP_COUNTER_MAX;
}

/**
 * Determines the winner of the combat
 * @param state - The current combat state
 * @returns 'player' | 'ko' | 'friendship' | 'ongoing'
 */
export function determineCombatEnd(state: CombatState): 'player' | 'ko' | 'friendship' | 'ongoing' {
    if (state.enemy.health <= 0) return 'player';
    if (state.player.health <= 0) return 'ko';
    if (state.friendshipCounter >= FRIENDSHIP_COUNTER_MAX) return 'friendship';
    return 'ongoing';
}

// ============================================================================
// TYPE ADVANTAGE SYSTEM (Rock-Paper-Scissors)
// ============================================================================

/**
 * Determines the advantage relationship between two attack types.
 * Heart > Body > Mind > Heart (cyclic)
 */
export function determineAdvantage(attackerType: ActionType, defenderType: ActionType): Advantage {
    if (attackerType === defenderType) return 'neutral';
    if (attackerType === 'heart' && defenderType === 'body') return 'advantage';
    if (attackerType === 'body' && defenderType === 'mind') return 'advantage';
    if (attackerType === 'mind' && defenderType === 'heart') return 'advantage';
    return 'disadvantage';
}

/**
 * Returns a flat roll modifier for advantage/disadvantage.
 * Tune the values here to adjust balance.
 * Roadmap note: "+2 / 0 / −2 or whatever the balance calls for"
 */
export function getAdvantageModifier(advantage: Advantage): number {
    switch (advantage) {
        case 'advantage': return 2;
        case 'disadvantage': return -2;
        default: return 0;
    }
}

/**
 * Returns true if the attacker has type advantage over the defender.
 */
export function hasAdvantage(attackerType: ActionType, defenderType: ActionType): boolean {
    return determineAdvantage(attackerType, defenderType) === 'advantage';
}

// ============================================================================
// COMBAT ACTION UTILITIES
// ============================================================================

/** Generates the enemy's attack type choice using AI logic. */
export function generateEnemyAttackType(_state: CombatState, enemy: Enemy): ActionType {
    return determineEnemyAction(enemy.logic).type;
}

/** Generates the enemy's action (attack/defend) using AI logic. */
export function generateEnemyAction(_state: CombatState, enemy: Enemy): Action {
    return determineEnemyAction(enemy.logic).action;
}

/**
 * Validates if a combat action is complete and valid.
 * @param action - The combat action to validate
 * @returns True if action has both type and action defined
 */
export function isValidCombatAction(action: Partial<CombatAction>): action is CombatAction {
    return action.type !== undefined && action.action !== undefined;
}

// ============================================================================
// STAT LOOKUP BY ACTION TYPE
// ============================================================================

/**
 * Returns the raw base stat for a given action type.
 * Character → baseStats.heart / .body / .mind
 * Enemy     → attack stat (serves as the base for AI combatants)
 */
export function getBaseStatForType(character: Character | Enemy, type: ActionType): number {
    if (isCharacter(character)) {
        return character.baseStats[type];
    }
    return getEnemyRelatedStat(character, type, false) ?? 0;
}

/**
 * Returns the attack/skill stat for a given action type.
 * Character → derivedStats (physicalSkill / mentalSkill / emotionalSkill)
 * Enemy     → enemyStats attack values
 *
 * Note: with STAT_MULTIPLIERS.SKILL = 1, Character skill == baseStats right now.
 * Adjust STAT_MULTIPLIERS in Character/index.ts to change this.
 */
export function getSkillStatForType(character: Character | Enemy, type: ActionType): number {
    if (isCharacter(character)) {
        switch (type) {
            case 'body': return character.derivedStats.physicalSkill;
            case 'mind': return character.derivedStats.mentalSkill;
            case 'heart': return character.derivedStats.emotionalSkill;
        }
    }
    return getEnemyRelatedStat(character as Enemy, type, false) ?? 0;
}

/**
 * Returns the defense stat for a given action type.
 * Character → derivedStats (physicalDefense / mentalDefense / emotionalDefense)
 * Enemy     → enemyStats defense values
 *
 * Note: STAT_MULTIPLIERS.DEFENSE = 3 makes Character defense 3× their base stat.
 * Use getBaseStatForType for the player if you want the old 1× behavior while
 * tuning multipliers.
 */
export function getDefenseStatForType(character: Character | Enemy, type: ActionType): number {
    if (isCharacter(character)) {
        switch (type) {
            case 'body': return character.derivedStats.physicalDefense;
            case 'mind': return character.derivedStats.mentalDefense;
            case 'heart': return character.derivedStats.emotionalDefense;
        }
    }
    return getEnemyRelatedStat(character as Enemy, type, true) ?? 0;
}

/**
 * Returns the saving throw stat for a given action type.
 * Used when resisting effects (Phase 1 effects engine).
 */
export function getSaveStatForType(character: Character | Enemy, type: ActionType): number {
    if (isCharacter(character)) {
        switch (type) {
            case 'body': return character.derivedStats.physicalSave;
            case 'mind': return character.derivedStats.mentalSave;
            case 'heart': return character.derivedStats.emotionalSave;
        }
    }
    return getDefenseStatForType(character, type);
}

// ============================================================================
// DICE ROLLING
// ============================================================================

/**
 * Performs a d20 skill check roll, respecting advantage/disadvantage.
 * @param baseStat  - The stat modifier to add to the roll
 * @param advantage - Whether the roll has advantage, neutral, or disadvantage
 */
export function rollSkillCheck(
    baseStat: number,
    advantage: Advantage,
): { total: number; roll: number; modifier: number } {
    const roll = createDieRoll(advantage)();
    return { total: roll + baseStat, roll, modifier: baseStat };
}

// ============================================================================
// CRITICAL HIT / MISS
// ============================================================================

/** Returns true on a natural 20 (critical hit). */
export function isCriticalHit(roll: number): boolean {
    return roll === 20;
}

/** Returns true on a natural 1 (critical miss / fumble). */
export function isCriticalMiss(roll: number): boolean {
    return roll === 1;
}

// ============================================================================
// DAMAGE CALCULATIONS
// ============================================================================

/** Doubles damage for a critical hit. Adjust multiplier here for balance. */
export function applyCriticalMultiplier(baseDamage: number): number {
    return baseDamage * 2;
}

/**
 * Calculates final damage after reductions, applying the critical multiplier
 * before subtracting defence.
 * @param baseDamage      - Raw damage before reductions
 * @param damageReduction - Defence value to subtract (already includes the defence multiplier)
 * @param isCritical      - Whether this hit is a critical
 * @returns Final damage, minimum 0
 */
export function calculateFinalDamage(
    baseDamage: number,
    damageReduction: number,
    isCritical: boolean,
): number {
    const damage = isCritical ? applyCriticalMultiplier(baseDamage) : baseDamage;
    return Math.max(0, damage - damageReduction);
}

// ============================================================================
// ATTACK / DEFENSE ROLL CALCULATIONS (Phase 2 — not yet wired to reducer)
// ============================================================================

/**
 * Performs an attack roll for a character.
 * TODO (Phase 2a): wire advantage modifier from active effects (Phase 1).
 */
export function performAttackRoll(
    attacker: Character | Enemy,
    attackType: ActionType,
    advantage: Advantage,
): { total: number; roll: number; modifier: number; details: string } {
    return 'Implement me' as any;
}

/**
 * Performs a defense roll for a character.
 * TODO (Phase 2a): wire defense modifier from active effects (Phase 1).
 */
export function performDefenseRoll(
    defender: Character | Enemy,
    attackType: ActionType,
    isDefending: boolean,
): { total: number; roll: number; modifier: number; details: string } {
    return 'Implement me' as any;
}

/** Compares attack and defence rolls to determine whether the hit lands. */
export function isAttackSuccessful(attackRoll: number, defenseRoll: number): boolean {
    return attackRoll > defenseRoll;
}

/**
 * Calculates base damage for an attack.
 * TODO (Phase 2a): integrate stat-based damage formula once designed.
 */
export function calculateBaseDamage(
    attacker: Character | Enemy,
    attackType: ActionType,
    advantage: Advantage,
): number {
    return 'Implement me' as any;
}

/**
 * Calculates the damage reduction from defence.
 * TODO (Phase 2a): integrate active effect modifiers (Phase 1).
 */
export function calculateDamageReduction(
    defender: Character | Enemy,
    attackType: ActionType,
    isDefending: boolean,
): number {
    return 'Implement me' as any;
}

/**
 * Full attack sequence: rolls, hit check, damage, breakdown string.
 * TODO (Phase 2a): implement using performAttackRoll / performDefenseRoll.
 */
export function calculateAttackDamage(
    attacker: Character | Enemy,
    defender: Character | Enemy,
    attackType: ActionType,
    advantage: Advantage,
    isDefending: boolean,
): {
    damage: number;
    attackRoll: number;
    defenseRoll: number;
    hit: boolean;
    critical: boolean;
    details: string;
} {
    return 'Implement me' as any;
}

// ============================================================================
// HEALTH MANAGEMENT
// ============================================================================

/**
 * Applies damage to a Character, clamping health to 0.
 * @overload
 */
export function applyDamage(character: Character, damage: number): Character;
/** Applies damage to an Enemy, clamping health to 0. */
export function applyDamage(character: Enemy, damage: number): Enemy;
export function applyDamage(character: Character | Enemy, damage: number): Character | Enemy {
    const newHealth = Math.max(0, character.health - damage);
    if (isCharacter(character)) {
        return { ...character, health: newHealth };
    }
    return { ...(character as Enemy), health: newHealth };
}

/**
 * Heals a Character, clamping health to maxHealth.
 * @overload
 */
export function healCharacter(character: Character, amount: number): Character;
/** Heals an Enemy, clamping health to enemyStats.maxHealth. */
export function healCharacter(character: Enemy, amount: number): Enemy;
export function healCharacter(character: Character | Enemy, amount: number): Character | Enemy {
    if (isCharacter(character)) {
        return { ...character, health: Math.min(character.maxHealth, character.health + amount) };
    }
    const enemy = character as Enemy;
    return { ...enemy, health: Math.min(enemy.enemyStats.maxHealth, enemy.health + amount) };
}

/** Returns true if the combatant still has health remaining. */
export function isAlive(character: Character | Enemy): boolean {
    return character.health > 0;
}

/** Returns true if the combatant has been defeated (health ≤ 0). */
export function isDefeated(character: Character | Enemy): boolean {
    return character.health <= 0;
}

/** Returns current health as a percentage of max health (0–100). */
export function getHealthPercentage(character: Character | Enemy): number {
    const maxHealth = isCharacter(character)
        ? character.maxHealth
        : character.enemyStats.maxHealth;
    return (character.health / maxHealth) * 100;
}

// ============================================================================
// COMBAT ROUND PROCESSING (Phase 2c — stubs for the reducer)
// ============================================================================

/** TODO (Phase 2c): process the player's turn within resolveCombatRound. */
export function processPlayerTurn(state: CombatState): {
    damageToEnemy: number;
    playerRoll: number;
    playerRollDetails: string;
} {
    return 'Implement me' as any;
}

/** TODO (Phase 2c): process the enemy's turn within resolveCombatRound. */
export function processEnemyTurn(state: CombatState): {
    damageToPlayer: number;
    enemyRoll: number;
    enemyRollDetails: string;
} {
    return 'Implement me' as any;
}

/** TODO (Phase 2c): determine who acts first based on initiative. */
export function determineTurnOrder(player: Character, enemy: Enemy): 'player' | 'enemy' {
    return 'Implement me' as any;
}

/** TODO (Phase 2c): roll initiative for a combatant. */
export function rollInitiative(character: Character | Enemy): number {
    return 'Implement me' as any;
}

// ============================================================================
// BATTLE LOG UTILITIES (Phase 2c)
// ============================================================================

/** TODO (Phase 2c): create a BattleLogEntry from a resolved round. */
export function createBattleLogEntry(
    state: CombatState,
    roundResults: {
        advantage: Advantage;
        playerRoll: number;
        playerRollDetails: string;
        enemyRoll: number;
        enemyRollDetails: string;
        damageToPlayer: number;
        damageToEnemy: number;
    },
): BattleLogEntry {
    return 'Implement me' as any;
}

/** TODO (Phase 2c): format all battle log entries as readable strings. */
export function formatAllBattleLogs(state: CombatState): string[] {
    return 'Implement me' as any;
}

/** TODO (Phase 2c): generate the victory/defeat summary message. */
export function generateCombatResultMessage(state: CombatState): string {
    return 'Implement me' as any;
}
