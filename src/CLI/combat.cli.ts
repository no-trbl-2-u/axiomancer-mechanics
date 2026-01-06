#!/usr/bin/env node

import inquirer from 'inquirer';

/* Import types */
import { Character, BaseStats } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { CombatState, ActionType, Action, CombatAction, BattleLogEntry, Advantage } from '../Combat/types';
import { GameState } from '../Game/types';

/* Import libraries */
import { EnemyLibrary } from '../Enemy/enemy.library';

/* Import functions */
import { determineEnemyAction, determineAdvantage, determineCombatEnd } from '../Combat/index';
import { getEnemyRelatedStat } from '../Enemy/index';
import { createDieRoll, deepClone } from '../Utils/index';
import { createCharacter } from '../Character/index';

/* Import reducers */
import {
    initializeCombat,
    setPlayerAttackType,
    setPlayerAction,
    setEnemyAction,
    applyDamageToPlayer,
    applyDamageToEnemy,
    advanceRound,
    incrementFriendship,
    endCombatPlayerVictory,
    endCombatPlayerDefeat,
    addBattleLogEntry,
    updateCombatPhase,
} from '../Combat/combat.reducer';

import {
    loadGameState,
    saveGameState,
    setCombatState,
    endCombat,
} from '../Game/game.reducer';

// ============================================================================
// CONSTANTS
// ============================================================================

const DELAY_MS = 1000;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Waits for a specified amount of time
 * @param ms - Milliseconds to wait
 */
async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Displays a divider line in the console
 */
function displayDivider(): void {
    console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Displays the current health status of both combatants
 */
function displayHealthStatus(combatState: CombatState): void {
    const playerHealthPercent = Math.round((combatState.player.health / combatState.player.maxHealth) * 100);
    const enemyHealthPercent = Math.round((combatState.enemy.health / combatState.enemy.enemyStats.maxHealth) * 100);
    
    console.log(`\n📊 HEALTH STATUS`);
    console.log(`   ${combatState.player.name}: ${combatState.player.health}/${combatState.player.maxHealth} HP (${playerHealthPercent}%)`);
    console.log(`   ${combatState.enemy.name}: ${combatState.enemy.health}/${combatState.enemy.enemyStats.maxHealth} HP (${enemyHealthPercent}%)`);
    console.log(`   Friendship Counter: ${combatState.friendshipCounter}/3`);
}

// ============================================================================
// ENEMY SELECTION
// ============================================================================

/**
 * Flattens the enemy library into a single array of enemies
 */
function getAllEnemies(): Enemy[] {
    const allEnemies: Enemy[] = [];
    for (const location of Object.values(EnemyLibrary)) {
        allEnemies.push(...location);
    }
    return allEnemies;
}

/**
 * Prompts the user to select an enemy to fight
 */
async function selectEnemy(): Promise<Enemy> {
    const enemies = getAllEnemies();
    
    const answer = await inquirer.prompt<{ enemyIndex: number }>([
        {
            type: 'rawlist',
            name: 'enemyIndex',
            message: 'Select an enemy to fight...',
            choices: enemies.map((enemy, index) => ({
                name: `${enemy.name} (Level ${enemy.level}) - ${enemy.description}`,
                value: index,
            })),
        }
    ]);

    return deepClone(enemies[answer.enemyIndex]);
}

// ============================================================================
// PLAYER ACTION SELECTION
// ============================================================================

/**
 * Prompts the player to select their reaction type (heart/body/mind)
 */
async function selectReactionType(): Promise<ActionType> {
    const answer = await inquirer.prompt<{ reactionType: ActionType }>([
        {
            type: 'rawlist',
            name: 'reactionType',
            message: 'Select which part of yourself you choose to respond with...',
            choices: [
                { name: '❤️  Heart (Strong vs Body)', value: 'heart' },
                { name: '💪 Body (Strong vs Mind)', value: 'body' },
                { name: '🧠 Mind (Strong vs Heart)', value: 'mind' },
            ]
        }
    ]);
    return answer.reactionType;
}

/**
 * Prompts the player to select their action type (attack/defend)
 */
async function selectActionType(): Promise<Action> {
    const answer = await inquirer.prompt<{ actionType: Action }>([
        {
            type: 'rawlist',
            name: 'actionType',
            message: 'Select the action you want to take...',
            choices: [
                { name: '⚔️  Attack', value: 'attack' },
                { name: '🛡️  Defend', value: 'defend' },
            ]
        }
    ]);
    return answer.actionType;
}

// ============================================================================
// COMBAT RESOLUTION
// ============================================================================

/**
 * Resolves a combat turn where both player and enemy attack
 */
async function resolveBothAttack(
    state: CombatState,
    playerChoice: CombatAction,
    enemyChoice: CombatAction
): Promise<CombatState> {
    let combatState = state;
    
    /* Calculate advantages */
    const playerAdvantage = determineAdvantage(playerChoice.type, enemyChoice.type);
    const enemyAdvantage = determineAdvantage(enemyChoice.type, playerChoice.type);
    
    /* Create die rolls */
    const playerDieRoll = createDieRoll(playerAdvantage);
    const enemyDieRoll = createDieRoll(enemyAdvantage);
    
    /* Get modifiers */
    const playerRollModifier = combatState.player.baseStats[playerChoice.type as keyof BaseStats];
    const enemyRollModifier = getEnemyRelatedStat(combatState.enemy, enemyChoice.type, false);
    
    /* Roll for initiative/attack */
    const playerRollTotal = playerDieRoll() + playerRollModifier;
    const enemyRollTotal = enemyDieRoll() + enemyRollModifier;
    
    console.log(`\n⚔️  BATTLE OF WIT!`);
    console.log(`   Player rolls: ${playerRollTotal} (advantage: ${playerAdvantage})`);
    await delay(DELAY_MS);
    console.log(`   Enemy rolls: ${enemyRollTotal} (advantage: ${enemyAdvantage})`);
    await delay(DELAY_MS);
    
    let damageToPlayer = 0;
    let damageToEnemy = 0;
    let result = '';
    
    if (playerRollTotal > enemyRollTotal) {
        /* Player wins the attack */
        console.log('\n✅ Player wins the battle of wit!');
        await delay(DELAY_MS);
        
        const playersDamageRoll = playerDieRoll() + playerRollModifier;
        const enemyDefenseStat = getEnemyRelatedStat(combatState.enemy, enemyChoice.type, true);
        damageToEnemy = Math.max(0, playersDamageRoll - enemyDefenseStat);
        
        combatState = applyDamageToEnemy(combatState, damageToEnemy);
        console.log(`   Player deals ${damageToEnemy} damage! (${playersDamageRoll} - ${enemyDefenseStat} defense)`);
        result = `Player dealt ${damageToEnemy} damage to ${combatState.enemy.name}`;
        
    } else if (playerRollTotal < enemyRollTotal) {
        /* Enemy wins the attack */
        console.log('\n❌ Enemy wins the attack!');
        await delay(DELAY_MS);
        
        const enemiesDamageRoll = enemyDieRoll() + enemyRollModifier;
        const playerDefenseStat = combatState.player.baseStats[playerChoice.type as keyof BaseStats];
        damageToPlayer = Math.max(0, enemiesDamageRoll - playerDefenseStat);
        
        combatState = applyDamageToPlayer(combatState, damageToPlayer);
        console.log(`   Enemy deals ${damageToPlayer} damage! (${enemiesDamageRoll} - ${playerDefenseStat} defense)`);
        result = `${combatState.enemy.name} dealt ${damageToPlayer} damage to Player`;
        
    } else {
        /* Tie */
        console.log('\n⚖️  Your wit clashes with the enemy\'s wit - both miss!');
        result = 'Both attacks missed - it was a tie';
    }
    
    /* Add battle log entry */
    const logEntry: BattleLogEntry = {
        round: combatState.round,
        playerAction: playerChoice,
        enemyAction: enemyChoice,
        advantage: playerAdvantage,
        playerRoll: playerRollTotal,
        playerRollDetails: `Roll + ${playerRollModifier} ${playerChoice.type} modifier`,
        enemyRoll: enemyRollTotal,
        enemyRollDetails: `Roll + ${enemyRollModifier} ${enemyChoice.type} modifier`,
        damageToPlayer,
        damageToEnemy,
        playerHPAfter: combatState.player.health,
        enemyHPAfter: combatState.enemy.health,
        result,
    };
    
    return addBattleLogEntry(combatState, logEntry);
}

/**
 * Resolves a combat turn where player attacks and enemy defends
 */
async function resolvePlayerAttackEnemyDefend(
    state: CombatState,
    playerChoice: CombatAction,
    enemyChoice: CombatAction
): Promise<CombatState> {
    let combatState = state;
    
    const playerAdvantage = determineAdvantage(playerChoice.type, enemyChoice.type);
    const playerDieRoll = createDieRoll(playerAdvantage);
    const playerRollModifier = combatState.player.baseStats[playerChoice.type as keyof BaseStats];
    
    /* Enemy defense is boosted when defending */
    const enemyDefenseStat = getEnemyRelatedStat(combatState.enemy, enemyChoice.type, true) * 1.5;
    
    const playersDamageRoll = playerDieRoll() + playerRollModifier;
    const damageToEnemy = Math.max(0, Math.floor(playersDamageRoll - enemyDefenseStat));
    
    console.log(`\n⚔️  Player attacks defending enemy!`);
    console.log(`   Player damage roll: ${playersDamageRoll}`);
    console.log(`   Enemy boosted defense: ${enemyDefenseStat}`);
    await delay(DELAY_MS);
    
    combatState = applyDamageToEnemy(combatState, damageToEnemy);
    console.log(`   Player deals ${damageToEnemy} damage!`);
    
    const logEntry: BattleLogEntry = {
        round: combatState.round,
        playerAction: playerChoice,
        enemyAction: enemyChoice,
        advantage: playerAdvantage,
        playerRoll: playersDamageRoll,
        playerRollDetails: `Damage roll + ${playerRollModifier} ${playerChoice.type} modifier`,
        enemyRoll: 0,
        enemyRollDetails: `Defending with ${enemyDefenseStat} defense`,
        damageToPlayer: 0,
        damageToEnemy,
        playerHPAfter: combatState.player.health,
        enemyHPAfter: combatState.enemy.health,
        result: `Player dealt ${damageToEnemy} damage while enemy defended`,
    };
    
    return addBattleLogEntry(combatState, logEntry);
}

/**
 * Resolves a combat turn where player defends and enemy attacks
 */
async function resolvePlayerDefendEnemyAttack(
    state: CombatState,
    playerChoice: CombatAction,
    enemyChoice: CombatAction
): Promise<CombatState> {
    let combatState = state;
    
    const enemyAdvantage = determineAdvantage(enemyChoice.type, playerChoice.type);
    const enemyDieRoll = createDieRoll(enemyAdvantage);
    const enemyRollModifier = getEnemyRelatedStat(combatState.enemy, enemyChoice.type, false);
    
    /* Player defense is boosted when defending */
    const playerDefenseStat = combatState.player.baseStats[playerChoice.type as keyof BaseStats] * 1.5;
    
    const enemiesDamageRoll = enemyDieRoll() + enemyRollModifier;
    const damageToPlayer = Math.max(0, Math.floor(enemiesDamageRoll - playerDefenseStat));
    
    console.log(`\n🛡️  Player defends against enemy attack!`);
    console.log(`   Enemy damage roll: ${enemiesDamageRoll}`);
    console.log(`   Player boosted defense: ${playerDefenseStat}`);
    await delay(DELAY_MS);
    
    combatState = applyDamageToPlayer(combatState, damageToPlayer);
    console.log(`   Enemy deals ${damageToPlayer} damage!`);
    
    const logEntry: BattleLogEntry = {
        round: combatState.round,
        playerAction: playerChoice,
        enemyAction: enemyChoice,
        advantage: enemyAdvantage,
        playerRoll: 0,
        playerRollDetails: `Defending with ${playerDefenseStat} defense`,
        enemyRoll: enemiesDamageRoll,
        enemyRollDetails: `Damage roll + ${enemyRollModifier} ${enemyChoice.type} modifier`,
        damageToPlayer,
        damageToEnemy: 0,
        playerHPAfter: combatState.player.health,
        enemyHPAfter: combatState.enemy.health,
        result: `${combatState.enemy.name} dealt ${damageToPlayer} damage while player defended`,
    };
    
    return addBattleLogEntry(combatState, logEntry);
}

/**
 * Resolves a combat turn where both player and enemy defend
 */
async function resolveBothDefend(
    state: CombatState,
    playerChoice: CombatAction,
    enemyChoice: CombatAction
): Promise<CombatState> {
    let combatState = state;
    
    console.log(`\n🤝 Both combatants chose to defend...`);
    await delay(DELAY_MS);
    
    combatState = incrementFriendship(combatState);
    console.log(`   The player feels closer to the enemy. Friendship counter: ${combatState.friendshipCounter}/3`);
    
    if (combatState.friendshipCounter >= 3) {
        console.log(`\n💕 A bond has formed! Combat ends in FRIENDSHIP!`);
    }
    
    const logEntry: BattleLogEntry = {
        round: combatState.round,
        playerAction: playerChoice,
        enemyAction: enemyChoice,
        advantage: 'neutral',
        playerRoll: 0,
        playerRollDetails: 'Both defending',
        enemyRoll: 0,
        enemyRollDetails: 'Both defending',
        damageToPlayer: 0,
        damageToEnemy: 0,
        playerHPAfter: combatState.player.health,
        enemyHPAfter: combatState.enemy.health,
        result: `Both defended - friendship increased to ${combatState.friendshipCounter}`,
    };
    
    return addBattleLogEntry(combatState, logEntry);
}

/**
 * Resolves a complete combat turn
 */
async function resolveTurn(
    state: CombatState,
    playerChoice: CombatAction,
    enemyChoice: CombatAction
): Promise<CombatState> {
    if (playerChoice.action === 'attack' && enemyChoice.action === 'attack') {
        return resolveBothAttack(state, playerChoice, enemyChoice);
    } else if (playerChoice.action === 'attack' && enemyChoice.action === 'defend') {
        return resolvePlayerAttackEnemyDefend(state, playerChoice, enemyChoice);
    } else if (playerChoice.action === 'defend' && enemyChoice.action === 'attack') {
        return resolvePlayerDefendEnemyAttack(state, playerChoice, enemyChoice);
    } else {
        return resolveBothDefend(state, playerChoice, enemyChoice);
    }
}

// ============================================================================
// MAIN COMBAT LOOP
// ============================================================================

/**
 * Runs a single combat turn
 */
async function runCombatTurn(gameState: GameState): Promise<GameState> {
    let combatState = gameState.combatState!;
    
    displayDivider();
    console.log(`⚔️  ROUND ${combatState.round}`);
    displayHealthStatus(combatState);
    
    /* Get player choices */
    console.log(`\n📋 ${combatState.player.name}'s Turn`);
    const reactionType = await selectReactionType();
    combatState = setPlayerAttackType(combatState, reactionType);
    
    const actionType = await selectActionType();
    combatState = setPlayerAction(combatState, actionType);
    
    const playerChoice: CombatAction = {
        type: reactionType,
        action: actionType,
    };
    
    /* Generate enemy action */
    const enemyChoice = determineEnemyAction(combatState.enemy.logic);
    combatState = setEnemyAction(combatState, enemyChoice);
    
    console.log(`\n🎭 Actions Revealed:`);
    console.log(`   ${combatState.player.name}: ${actionType} with ${reactionType}`);
    console.log(`   ${combatState.enemy.name}: ${enemyChoice.action} with ${enemyChoice.type}`);
    await delay(DELAY_MS);
    
    /* Resolve the turn */
    combatState = await resolveTurn(combatState, playerChoice, enemyChoice);
    
    /* Update phase to resolving */
    combatState = updateCombatPhase(combatState, 'resolving');
    
    /* Check combat end conditions */
    const combatResult = determineCombatEnd(combatState);
    
    if (combatResult !== 'ongoing') {
        if (combatResult === 'player') {
            combatState = endCombatPlayerVictory(combatState);
        } else if (combatResult === 'ko') {
            combatState = endCombatPlayerDefeat(combatState);
        }
        // friendship case is already handled in incrementFriendship
    } else {
        /* Advance to next round */
        combatState = advanceRound(combatState);
    }
    
    /* Update game state with new combat state */
    return setCombatState(gameState, combatState);
}

/**
 * Displays the combat result
 */
function displayCombatResult(combatState: CombatState): void {
    displayDivider();
    const result = determineCombatEnd(combatState);
    
    if (result === 'player') {
        console.log(`🎉 VICTORY!`);
        console.log(`   ${combatState.player.name} has defeated ${combatState.enemy.name}!`);
    } else if (result === 'ko') {
        console.log(`💀 DEFEAT!`);
        console.log(`   ${combatState.player.name} has been defeated by ${combatState.enemy.name}!`);
    } else if (result === 'friendship') {
        console.log(`💕 FRIENDSHIP!`);
        console.log(`   ${combatState.player.name} and ${combatState.enemy.name} have become friends!`);
    }
    
    console.log(`\n📜 Battle lasted ${combatState.round} round(s)`);
    displayHealthStatus(combatState);
    displayDivider();
}

/**
 * Main combat simulation function
 */
async function main(): Promise<void> {
    console.log('🎮 AXIOMANCER COMBAT SIMULATOR');
    console.log('================================\n');
    
    /* Load existing game state or create new one */
    let gameState = loadGameState();
    console.log(`Loaded game state for: ${gameState.player.name}`);
    
    /* Select enemy */
    console.log('\n🗡️  Select your opponent:\n');
    const selectedEnemy = await selectEnemy();
    
    /* Initialize combat */
    const initialCombatState = initializeCombat(gameState.player, selectedEnemy);
    gameState = setCombatState(gameState, initialCombatState);
    
    console.log(`\n⚔️  Combat initiated: ${gameState.player.name} vs ${selectedEnemy.name}!`);
    console.log(`   ${selectedEnemy.description}`);
    
    /* Save initial combat state */
    saveGameState(gameState);
    console.log('💾 Game state saved.');
    
    /* Main combat loop */
    while (gameState.combatState && gameState.combatState.active) {
        gameState = await runCombatTurn(gameState);
        
        /* Save game state after each turn */
        saveGameState(gameState);
        console.log('\n💾 Game state saved after turn.');
        
        /* Small delay before next turn */
        if (gameState.combatState && gameState.combatState.active) {
            await delay(DELAY_MS);
        }
    }
    
    /* Display final results */
    const finalCombatState = gameState.combatState;
    if (finalCombatState) {
        displayCombatResult(finalCombatState);
    }
    
    /* Clear combat state and save */
    gameState = endCombat(gameState);
    saveGameState(gameState);
    console.log('💾 Final game state saved (combat cleared).');
}

main().catch(console.error);
