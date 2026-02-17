/**
 * Combat System Implementation
 * Turn-based RPG combat with rock-paper-scissors mechanics
 * Heart > Body > Mind > Heart (cyclic advantage)
 */

import { randomLogic } from '../Enemy/enemy.logic';
import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { isCharacter, isEnemy } from '../Utils/typeGuards';
import { randomInt, clamp } from '../Utils';

import {
    ActionType,
    Action,
    Advantage,
    CombatAction,
    BattleLogEntry,
    CombatState
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const ADVANTAGE_MODIFIER = 1.5;
const DISADVANTAGE_MODIFIER = 0.75;
const NEUTRAL_MODIFIER = 1.0;
const CRITICAL_HIT_THRESHOLD = 20;
const CRITICAL_MISS_THRESHOLD = 1;
const CRITICAL_MULTIPLIER = 2;
const DEFEND_BONUS_MULTIPLIER = 1.5;
const D20_SIDES = 20;

/**
 * Determines the enemy's action based on the enemy's logic
 * @param enemyLogic - The logic chosen by the enemy
 * @returns The enemy's action
 */
export const determineEnemyAction = (enemyLogic: 'random' | 'aggressive' | 'defensive' | 'balanced'): CombatAction => {
    switch (enemyLogic) {
        case 'random':
            return randomLogic();
        default:
            return randomLogic();
    }
}

// ============================================================================
// COMBAT END CONDITIONS
// ============================================================================

/**
 * Checks if combat is still ongoing based on health values
 * @param state - The current combat state
 * @returns True if both combatants have health above 0 and friendship counter < 3
 */
export function isCombatOngoing(state: CombatState): boolean {
    return state.player.health > 0 && state.enemy.health > 0 && state.friendshipCounter < 3;
}

/**
 * Determines the outcome of the combat
 * @param state - The current combat state
 * @returns 'player' | 'ko' | 'friendship' | 'ongoing'
 */
export function determineCombatEnd(state: CombatState): 'player' | 'ko' | 'friendship' | 'ongoing' {
    if (state.enemy.health <= 0) {
        return 'player';
    } else if (state.player.health <= 0) {
        return 'ko';
    } else if (state.friendshipCounter === 3) {
        return 'friendship';
    } else {
        return 'ongoing';
    }
}

// ============================================================================
// TYPE ADVANTAGE SYSTEM (Rock-Paper-Scissors)
// ============================================================================

/**
 * Determines the advantage relationship between two attack types
 * Heart > Body > Mind > Heart (cyclic)
 * @param attackerType - The attack type of the attacker
 * @param defenderType - The attack type of the defender
 * @returns 'advantage' | 'disadvantage' | 'neutral'
 */
export function determineAdvantage(attackerType: ActionType, defenderType: ActionType): Advantage {
    if (attackerType === defenderType) {
        return 'neutral';
    } else if (attackerType === 'heart' && defenderType === 'body') {
        return 'advantage';
    } else if (attackerType === 'body' && defenderType === 'mind') {
        return 'advantage';
    } else if (attackerType === 'mind' && defenderType === 'heart') {
        return 'advantage';
    }

    return 'disadvantage';
}

/**
 * Gets the modifier value for advantage/disadvantage
 * @param advantage - The advantage state
 * @returns Numeric modifier (1.5 for advantage, 0.75 for disadvantage, 1.0 for neutral)
 */
export function getAdvantageModifier(advantage: Advantage): number {
    switch (advantage) {
        case 'advantage':
            return ADVANTAGE_MODIFIER;
        case 'disadvantage':
            return DISADVANTAGE_MODIFIER;
        case 'neutral':
            return NEUTRAL_MODIFIER;
    }
}

/**
 * Checks if an attack type has advantage over another
 * @param attackerType - The attack type being checked
 * @param defenderType - The attack type being compared against
 * @returns True if attacker has advantage
 */
export function hasAdvantage(attackerType: ActionType, defenderType: ActionType): boolean {
    return determineAdvantage(attackerType, defenderType) === 'advantage';
}

// ============================================================================
// COMBAT ACTION UTILITIES
// ============================================================================

/**
 * Generates the enemy's attack type choice using AI logic
 * @param state - The current combat state
 * @param enemy - The enemy making the choice
 * @returns The attack type chosen by the enemy
 */
export function generateEnemyAttackType(state: CombatState, enemy: Enemy): ActionType {
    const action: CombatAction = determineEnemyAction(enemy.logic);
    return action.type;
}

/**
 * Generates the enemy's action choice using AI logic
 * @param state - The current combat state
 * @param enemy - The enemy making the choice
 * @returns The action chosen by the enemy
 */
export function generateEnemyAction(state: CombatState, enemy: Enemy): Action {
    const action: CombatAction = determineEnemyAction(enemy.logic);
    return action.action;
}

/**
 * Validates if a combat action is complete and valid
 * @param action - The combat action to validate
 * @returns True if action has both type and action defined
 */
export function isValidCombatAction(action: Partial<CombatAction>): action is CombatAction {
    return action.type !== undefined && action.action !== undefined;
}

// ============================================================================
// DICE ROLLING SYSTEM
// ============================================================================

/**
 * Rolls a single die with specified number of sides
 * @param sides - Number of sides on the die (e.g., 20 for d20)
 * @returns Random number between 1 and sides (inclusive)
 */
export function rollDie(sides: number): number {
    return randomInt(1, sides);
}

/**
 * Rolls multiple dice and returns the sum
 * @param count - Number of dice to roll
 * @param sides - Number of sides on each die
 * @returns Object containing sum and individual rolls
 */
export function rollDice(count: number, sides: number): { sum: number; rolls: number[] } {
    const rolls: number[] = Array.from({ length: count }, () => rollDie(sides));
    const sum: number = rolls.reduce((acc, roll) => acc + roll, 0);
    return { sum, rolls };
}

/**
 * Rolls a d20 for standard checks
 * @returns Number between 1 and 20
 */
export function rollD20(): number {
    return rollDie(D20_SIDES);
}

/**
 * Rolls with advantage (roll twice, take higher)
 * @param sides - Number of sides on the die
 * @returns Object with final result and both rolls
 */
export function rollWithAdvantage(sides: number): { result: number; rolls: [number, number] } {
    const roll1: number = rollDie(sides);
    const roll2: number = rollDie(sides);
    return {
        result: Math.max(roll1, roll2),
        rolls: [roll1, roll2],
    };
}

/**
 * Rolls with disadvantage (roll twice, take lower)
 * @param sides - Number of sides on the die
 * @returns Object with final result and both rolls
 */
export function rollWithDisadvantage(sides: number): { result: number; rolls: [number, number] } {
    const roll1: number = rollDie(sides);
    const roll2: number = rollDie(sides);
    return {
        result: Math.min(roll1, roll2),
        rolls: [roll1, roll2],
    };
}

/**
 * Performs a skill check roll with modifiers
 * @param baseStat - The base stat value to add as modifier
 * @param advantage - Whether the roll has advantage/disadvantage
 * @returns Object with total result, roll, and modifier
 */
export function rollSkillCheck(baseStat: number, advantage: Advantage): { total: number; roll: number; modifier: number } {
    let roll: number;

    if (advantage === 'advantage') {
        roll = rollWithAdvantage(D20_SIDES).result;
    } else if (advantage === 'disadvantage') {
        roll = rollWithDisadvantage(D20_SIDES).result;
    } else {
        roll = rollD20();
    }

    const modifier: number = baseStat;
    const total: number = roll + modifier;

    return { total, roll, modifier };
}

// ============================================================================
// STAT-BASED CALCULATIONS
// ============================================================================

/**
 * Gets the appropriate skill stat based on attack type
 * @param character - The character (player or enemy)
 * @param type - The attack type being used
 * @returns The skill stat value (physicalSkill, mentalSkill, or emotionalSkill)
 */
export function getSkillStatForType(character: Character | Enemy, type: ActionType): number {
    if (isCharacter(character)) {
        switch (type) {
            case 'body': return character.derivedStats.physicalSkill;
            case 'mind': return character.derivedStats.mentalSkill;
            case 'heart': return character.derivedStats.emotionalSkill;
        }
    } else {
        switch (type) {
            case 'body': return character.enemyStats.physicalSkill;
            case 'mind': return character.enemyStats.mentalSkill;
            case 'heart': return character.enemyStats.emotionalSkill;
        }
    }
}

/**
 * Gets the appropriate defense stat based on attack type
 * @param character - The character being attacked
 * @param type - The attack type being defended against
 * @returns The defense stat value (physicalDefense, mentalDefense, or emotionalDefense)
 */
export function getDefenseStatForType(character: Character | Enemy, type: ActionType): number {
    if (isCharacter(character)) {
        switch (type) {
            case 'body': return character.derivedStats.physicalDefense;
            case 'mind': return character.derivedStats.mentalDefense;
            case 'heart': return character.derivedStats.emotionalDefense;
        }
    } else {
        switch (type) {
            case 'body': return character.enemyStats.physicalDefense;
            case 'mind': return character.enemyStats.mentalDefense;
            case 'heart': return character.enemyStats.emotionalDefense;
        }
    }
}

/**
 * Gets the appropriate save stat based on attack type
 * @param character - The character making the save
 * @param type - The attack type requiring a save
 * @returns The save stat value (physicalSave, mentalSave, or emotionalSave)
 */
export function getSaveStatForType(character: Character | Enemy, type: ActionType): number {
    if (isCharacter(character)) {
        switch (type) {
            case 'body': return character.derivedStats.physicalSave;
            case 'mind': return character.derivedStats.mentalSave;
            case 'heart': return character.derivedStats.emotionalSave;
        }
    } else {
        /* Enemies don't have save stats, so fallback to defense */
        switch (type) {
            case 'body': return character.enemyStats.physicalDefense;
            case 'mind': return character.enemyStats.mentalDefense;
            case 'heart': return character.enemyStats.emotionalDefense;
        }
    }
}

/**
 * Calculates the base stat value for an attack type
 * @param character - The character performing the action
 * @param type - The attack type being used
 * @returns The base stat value (body, mind, or heart)
 */
export function getBaseStatForType(character: Character | Enemy, type: ActionType): number {
    if (isCharacter(character)) {
        switch (type) {
            case 'body': return character.baseStats.body;
            case 'mind': return character.baseStats.mind;
            case 'heart': return character.baseStats.heart;
        }
    } else {
        switch (type) {
            case 'body': return character.enemyStats.physicalAttack;
            case 'mind': return character.enemyStats.mentalAttack;
            case 'heart': return character.enemyStats.emotionalAttack;
        }
    }
}

// ============================================================================
// ATTACK ROLL CALCULATIONS
// ============================================================================

/**
 * Performs an attack roll for a character
 * @param attacker - The character making the attack
 * @param attackType - The type of attack being made
 * @param advantage - The advantage state for this attack
 * @returns Object with roll result, details, and breakdown
 */
export function performAttackRoll(
    attacker: Character | Enemy,
    attackType: ActionType,
    advantage: Advantage
): { total: number; roll: number; modifier: number; details: string } {
    const modifier: number = getSkillStatForType(attacker, attackType);
    const skillCheck = rollSkillCheck(modifier, advantage);
    const name: string = isCharacter(attacker) ? attacker.name : attacker.name;
    const details = `${name} rolls ${skillCheck.roll} + ${modifier} (${attackType} skill) = ${skillCheck.total}`;

    return {
        total: skillCheck.total,
        roll: skillCheck.roll,
        modifier,
        details,
    };
}

/**
 * Performs a defense roll for a character
 * @param defender - The character defending
 * @param attackType - The type of attack being defended against
 * @param isDefending - Whether the defender chose the defend action
 * @returns Object with roll result, details, and breakdown
 */
export function performDefenseRoll(
    defender: Character | Enemy,
    attackType: ActionType,
    isDefending: boolean
): { total: number; roll: number; modifier: number; details: string } {
    const baseModifier: number = getDefenseStatForType(defender, attackType);
    const modifier: number = isDefending ? Math.floor(baseModifier * DEFEND_BONUS_MULTIPLIER) : baseModifier;
    const roll: number = rollD20();
    const total: number = roll + modifier;
    const name: string = isCharacter(defender) ? defender.name : defender.name;
    const defendText: string = isDefending ? ' (defending)' : '';
    const details = `${name} defends ${roll} + ${modifier} (${attackType} defense${defendText}) = ${total}`;

    return { total, roll, modifier, details };
}

/**
 * Compares attack roll against defense to determine hit/miss
 * @param attackRoll - The attacker's total roll
 * @param defenseRoll - The defender's total roll
 * @returns True if attack hits, false if it misses
 */
export function isAttackSuccessful(attackRoll: number, defenseRoll: number): boolean {
    return attackRoll >= defenseRoll;
}

/**
 * Checks for critical hit (natural 20 on attack roll)
 * @param roll - The raw die roll (before modifiers)
 * @returns True if critical hit
 */
export function isCriticalHit(roll: number): boolean {
    return roll === CRITICAL_HIT_THRESHOLD;
}

/**
 * Checks for critical miss (natural 1 on attack roll)
 * @param roll - The raw die roll (before modifiers)
 * @returns True if critical miss
 */
export function isCriticalMiss(roll: number): boolean {
    return roll === CRITICAL_MISS_THRESHOLD;
}

// ============================================================================
// DAMAGE CALCULATIONS
// ============================================================================

/**
 * Calculates base damage for an attack
 * @param attacker - The character dealing damage
 * @param attackType - The type of attack
 * @param advantage - The advantage state
 * @returns Base damage value before reductions
 */
export function calculateBaseDamage(
    attacker: Character | Enemy,
    attackType: ActionType,
    advantage: Advantage
): number {
    const baseStat: number = getBaseStatForType(attacker, attackType);
    const advantageModifier: number = getAdvantageModifier(advantage);
    return Math.floor(baseStat * advantageModifier);
}

/**
 * Calculates damage reduction from defense
 * @param defender - The character receiving damage
 * @param attackType - The type of attack
 * @param isDefending - Whether defender chose defend action
 * @returns Amount of damage to reduce
 */
export function calculateDamageReduction(
    defender: Character | Enemy,
    attackType: ActionType,
    isDefending: boolean
): number {
    const defenseStat: number = getDefenseStatForType(defender, attackType);
    const reduction: number = isDefending
        ? Math.floor(defenseStat * DEFEND_BONUS_MULTIPLIER)
        : defenseStat;
    return Math.max(0, reduction);
}

/**
 * Calculates final damage after all modifiers
 * @param baseDamage - The base damage before reductions
 * @param damageReduction - The amount to reduce
 * @param isCritical - Whether this is a critical hit
 * @returns Final damage value (minimum 0)
 */
export function calculateFinalDamage(
    baseDamage: number,
    damageReduction: number,
    isCritical: boolean
): number {
    const effectiveDamage: number = isCritical
        ? applyCriticalMultiplier(baseDamage)
        : baseDamage;
    return Math.max(0, effectiveDamage - damageReduction);
}

/**
 * Applies critical hit multiplier to damage
 * @param baseDamage - The base damage value
 * @returns Damage multiplied by critical multiplier (2x)
 */
export function applyCriticalMultiplier(baseDamage: number): number {
    return baseDamage * CRITICAL_MULTIPLIER;
}

/**
 * Calculates damage for a complete attack sequence
 * @param attacker - The attacking character
 * @param defender - The defending character
 * @param attackType - The type of attack
 * @param advantage - The advantage state
 * @param isDefending - Whether defender is defending
 * @returns Complete damage calculation result
 */
export function calculateAttackDamage(
    attacker: Character | Enemy,
    defender: Character | Enemy,
    attackType: ActionType,
    advantage: Advantage,
    isDefending: boolean
): {
    damage: number;
    attackRoll: number;
    defenseRoll: number;
    hit: boolean;
    critical: boolean;
    details: string;
} {
    const attackResult = performAttackRoll(attacker, attackType, advantage);
    const defenseResult = performDefenseRoll(defender, attackType, isDefending);
    const hit: boolean = isAttackSuccessful(attackResult.total, defenseResult.total);
    const critical: boolean = isCriticalHit(attackResult.roll);

    let damage = 0;
    if (hit) {
        const baseDamage: number = calculateBaseDamage(attacker, attackType, advantage);
        const reduction: number = calculateDamageReduction(defender, attackType, isDefending);
        damage = calculateFinalDamage(baseDamage, reduction, critical);
    }

    const hitText: string = hit ? (critical ? 'CRITICAL HIT' : 'Hit') : 'Miss';
    const details = `${attackResult.details} vs ${defenseResult.details} - ${hitText}! ${damage} damage`;

    return {
        damage,
        attackRoll: attackResult.total,
        defenseRoll: defenseResult.total,
        hit,
        critical,
        details,
    };
}

// ============================================================================
// HEALTH MANAGEMENT
// ============================================================================

/**
 * Applies damage to a character's health
 * @param character - The character taking damage
 * @param damage - Amount of damage to apply
 * @returns Updated character with reduced health (minimum 0)
 */
export function applyDamage(character: Character | Enemy, damage: number): Character | Enemy {
    return {
        ...character,
        health: Math.max(0, character.health - damage),
    };
}

/**
 * Heals a character's health
 * @param character - The character being healed
 * @param amount - Amount of health to restore
 * @returns Updated character with increased health (maximum maxHealth)
 */
export function healCharacter(character: Character | Enemy, amount: number): Character | Enemy {
    const maxHealth: number = isCharacter(character)
        ? character.maxHealth
        : character.enemyStats.maxHealth;
    return {
        ...character,
        health: Math.min(maxHealth, character.health + amount),
    };
}

/**
 * Checks if a character is alive
 * @param character - The character to check
 * @returns True if health > 0
 */
export function isAlive(character: Character | Enemy): boolean {
    return character.health > 0;
}

/**
 * Checks if a character is defeated
 * @param character - The character to check
 * @returns True if health <= 0
 */
export function isDefeated(character: Character | Enemy): boolean {
    return character.health <= 0;
}

/**
 * Gets the current health percentage
 * @param character - The character to check
 * @returns Health percentage (0-100)
 */
export function getHealthPercentage(character: Character | Enemy): number {
    const maxHealth: number = isCharacter(character)
        ? character.maxHealth
        : character.enemyStats.maxHealth;

    if (maxHealth === 0) return 0;
    return clamp((character.health / maxHealth) * 100, 0, 100);
}

// ============================================================================
// COMBAT ROUND PROCESSING
// ============================================================================

/**
 * Processes the player's turn in the combat round
 * @param state - The current combat state
 * @returns Partial results from player's action
 */
export function processPlayerTurn(state: CombatState): {
    damageToEnemy: number;
    playerRoll: number;
    playerRollDetails: string;
} {
    const playerAction = state.playerChoice as CombatAction;
    const enemyAction = state.enemyChoice as CombatAction;
    const advantage: Advantage = determineAdvantage(playerAction.type, enemyAction.type);
    const isEnemyDefending: boolean = enemyAction.action === 'defend';

    const result = calculateAttackDamage(
        state.player,
        state.enemy,
        playerAction.type,
        advantage,
        isEnemyDefending
    );

    return {
        damageToEnemy: result.damage,
        playerRoll: result.attackRoll,
        playerRollDetails: result.details,
    };
}

/**
 * Processes the enemy's turn in the combat round
 * @param state - The current combat state
 * @returns Partial results from enemy's action
 */
export function processEnemyTurn(state: CombatState): {
    damageToPlayer: number;
    enemyRoll: number;
    enemyRollDetails: string;
} {
    const playerAction = state.playerChoice as CombatAction;
    const enemyAction = state.enemyChoice as CombatAction;
    const advantage: Advantage = determineAdvantage(enemyAction.type, playerAction.type);
    const isPlayerDefending: boolean = playerAction.action === 'defend';

    const result = calculateAttackDamage(
        state.enemy,
        state.player,
        enemyAction.type,
        advantage,
        isPlayerDefending
    );

    return {
        damageToPlayer: result.damage,
        enemyRoll: result.attackRoll,
        enemyRollDetails: result.details,
    };
}

/**
 * Determines turn order based on initiative/speed
 * @param player - The player character
 * @param enemy - The enemy character
 * @returns 'player' | 'enemy' for who goes first
 */
export function determineTurnOrder(player: Character, enemy: Enemy): 'player' | 'enemy' {
    const playerInitiative: number = rollInitiative(player);
    const enemyInitiative: number = rollInitiative(enemy);
    return playerInitiative >= enemyInitiative ? 'player' : 'enemy';
}

/**
 * Rolls initiative for combat start
 * @param character - The character rolling initiative
 * @returns Initiative roll result
 */
export function rollInitiative(character: Character | Enemy): number {
    const roll: number = rollD20();
    const modifier: number = isCharacter(character)
        ? character.derivedStats.luck
        : Math.floor((character.enemyStats.mentalSkill + character.enemyStats.physicalSkill) / 2);
    return roll + modifier;
}

// ============================================================================
// BATTLE LOG UTILITIES
// ============================================================================

/**
 * Creates a new battle log entry for the current round
 * @param state - The current combat state
 * @param roundResults - The results from resolving the round
 * @returns A new BattleLogEntry
 */
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
    }
): BattleLogEntry {
    const playerAction = state.playerChoice as CombatAction;
    const enemyAction = state.enemyChoice as CombatAction;

    const playerHPAfter: number = Math.max(0, state.player.health - roundResults.damageToPlayer);
    const enemyHPAfter: number = Math.max(0, state.enemy.health - roundResults.damageToEnemy);

    const result = `Round ${state.round}: ${state.player.name} (${playerAction.type}/${playerAction.action}) vs ${state.enemy.name} (${enemyAction.type}/${enemyAction.action}) - ${roundResults.advantage}. Player HP: ${playerHPAfter}, Enemy HP: ${enemyHPAfter}`;

    return {
        round: state.round,
        playerAction,
        enemyAction,
        advantage: roundResults.advantage,
        playerRoll: roundResults.playerRoll,
        playerRollDetails: roundResults.playerRollDetails,
        enemyRoll: roundResults.enemyRoll,
        enemyRollDetails: roundResults.enemyRollDetails,
        damageToPlayer: roundResults.damageToPlayer,
        damageToEnemy: roundResults.damageToEnemy,
        playerHPAfter,
        enemyHPAfter,
        result,
    };
}

/**
 * Gets all battle log entries as formatted strings
 * @param state - The current combat state
 * @returns Array of formatted log strings
 */
export function formatAllBattleLogs(state: CombatState): string[] {
    return state.logEntry.map((entry: BattleLogEntry) => entry.result);
}

// ============================================================================
// COMBAT RESULT STRINGS
// ============================================================================

/**
 * Generates the final combat result message
 * @param state - The final combat state
 * @returns Victory/defeat message
 */
export function generateCombatResultMessage(state: CombatState): string {
    const outcome = determineCombatEnd(state);

    switch (outcome) {
        case 'player':
            return `Victory! ${state.player.name} defeated ${state.enemy.name} in ${state.round} rounds!`;
        case 'ko':
            return `Defeat! ${state.player.name} was knocked out by ${state.enemy.name} after ${state.round} rounds.`;
        case 'friendship':
            return `Friendship! ${state.player.name} befriended ${state.enemy.name} after ${state.round} rounds!`;
        case 'ongoing':
            return `Combat is still ongoing. Round ${state.round}.`;
    }
}
