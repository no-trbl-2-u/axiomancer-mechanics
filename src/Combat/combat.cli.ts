#!/usr/bin/env node

import inquirer from 'inquirer';

import { Disatree_01 } from '../Enemy/enemy.library';
import { Player } from '../Character/characters.mock';
import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import {
    determineEnemyAction,
    determineAdvantage,
    isCombatOngoing,
    getAttackStatForType,
    getBaseStatForType,
    getDefenseStatForType,
    calculateFinalDamage,
    applyDamage,
    tickAllEffects,
    getThornsReflect,
    getStudyMarkIntensity,
    removeRandomBuff,
    extendRandomBuffDuration,
    applyRegen,
} from './index';
import { createDieRoll } from '../Utils';
import { ActionType, Advantage, CombatState } from './types';
import { createGameStore } from '../Game/store';
import { nullAdapter } from '../Game/persistence/null.adapter';
import {
    DEFENSE_MULTIPLIERS,
    PASSIVE_DEFENSE_MULTIPLIER,
} from '../Game/game-mechanics.constants';
import { applyTier1CombatEffectWithResult, clearTier1EffectsForType } from '../Effects';
import { lookupEffect } from '../Effects/effects.library';
import {
    typeColor,
    printCombatIntro,
    printCombatRules,
    printStatus,
    printRoundActions,
    printTypeMatchup,
    printRollLine,
    printDamageCalc,
    printContestHeader,
    printContestOutcome,
    printBothDefending,
    printCombatEnd,
    printStanceSection,
    printEffectExpiry,
    printBuffsCleared,
    printRegenHeal,
    printThornsReflect,
    printHeartAttackSpecials,
} from './combat.display';

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// ─── Player Input ─────────────────────────────────────────────────────────────

async function promptPlayerChoice(): Promise<{
    reactionType: ActionType;
    actionType: 'attack' | 'defend';
}> {
    return inquirer.prompt([
        {
            type: 'rawlist',
            name: 'reactionType',
            message: 'Respond with...',
            choices: [
                { name: `${typeColor('heart', 'Heart')}  (emotional)`, value: 'heart' },
                { name: `${typeColor('body', 'Body')}   (physical)`, value: 'body' },
                { name: `${typeColor('mind', 'Mind')}   (mental)`, value: 'mind' },
            ],
        },
        {
            type: 'rawlist',
            name: 'actionType',
            message: 'Action...',
            choices: ['attack', 'defend'],
        },
    ]);
}

// ─── Combat Scenarios ─────────────────────────────────────────────────────────
//
// One function per action-pair outcome. Each prints its own sections and
// returns the updated combatants. State is never mutated.
//
// Defense multiplier rules:
//   Both attack  → loser has no active defense: PASSIVE_DEFENSE_MULTIPLIER (×1)
//   One defends  → defender's type-advantage over the attacker sets the multiplier
//
// Special modifiers applied before damage rolls:
//   Mind/attack   → add studying mark intensity (Exposed Reasoning) to damage roll
//   Heart/attack  → –5 to the attack roll modifier; on hit: strip enemy buff, extend player buff
//   Thorns        → after ANY hit on a combatant with Briar Stance, reflect intensity dmg back

/** Returns the attack modifier for a player action, including Heart/Attack –5 penalty. */
function playerAttackMod(player: Character, type: ActionType, action: 'attack' | 'defend'): number {
    const base = getAttackStatForType(player, type);
    return type === 'heart' && action === 'attack' ? base - 5 : base;
}

async function resolveAttackVsAttack(
    player: Character,
    enemy: Enemy,
    playerType: ActionType,
    enemyType: ActionType,
    playerAdv: Advantage,
    enemyAdv: Advantage,
    playerAction: 'attack' | 'defend',
): Promise<{ player: Character; enemy: Enemy }> {
    const playerDieRoll = createDieRoll(playerAdv);
    const enemyDieRoll  = createDieRoll(enemyAdv);

    const pMod      = playerAttackMod(player, playerType, playerAction);
    const playerRaw = playerDieRoll();
    const playerTotal = playerRaw + pMod;

    const eMod     = getAttackStatForType(enemy, enemyType);
    const enemyRaw = enemyDieRoll();
    const enemyTotal = enemyRaw + eMod;

    printContestHeader(playerRaw, pMod, playerAdv, enemyRaw, eMod, enemyAdv);
    await delay(1500);
    printContestOutcome(playerTotal, enemyTotal);
    await delay(1500);

    if (playerTotal > enemyTotal) {
        const baseDefense   = getDefenseStatForType(enemy, enemyType);
        const studyBonus    = playerType === 'mind' ? getStudyMarkIntensity(enemy) : 0;
        const damageRoll    = playerDieRoll() + pMod;
        const finalDamage   = calculateFinalDamage(damageRoll, baseDefense * PASSIVE_DEFENSE_MULTIPLIER, false, studyBonus);

        printDamageCalc({
            header: 'Player Damage',
            defender: 'enemy',
            attackStatName: `${playerType} attack`,
            attackStatValue: pMod,
            damageRoll,
            defenseStatName: `${enemyType} defense`,
            baseDefense,
            defenseMultiplier: PASSIVE_DEFENSE_MULTIPLIER,
            finalDamage,
            hpBefore: enemy.health,
            hpAfter: Math.max(0, enemy.health - finalDamage),
        });

        let updatedEnemy = applyDamage(enemy, finalDamage);
        let updatedPlayer = player;

        // Heart/Attack special effects on hit
        if (playerType === 'heart') {
            const buffResult = removeRandomBuff(updatedEnemy);
            updatedEnemy = buffResult.target as Enemy;
            const extResult = extendRandomBuffDuration(updatedPlayer, 1);
            updatedPlayer = extResult.target as Character;
            printHeartAttackSpecials(
                buffResult.removed ? (lookupEffect(buffResult.removed.effectId)?.name ?? null) : null,
                enemy.name,
                extResult.extended ? (lookupEffect(extResult.extended.effectId)?.name ?? null) : null,
            );
        }

        return { player: updatedPlayer, enemy: updatedEnemy };
    }

    if (enemyTotal > playerTotal) {
        const baseDefense = getBaseStatForType(player, playerType);
        const studyBonus  = enemyType === 'mind' ? getStudyMarkIntensity(player) : 0;
        const damageRoll  = enemyDieRoll() + eMod;
        const finalDamage = calculateFinalDamage(damageRoll, baseDefense * PASSIVE_DEFENSE_MULTIPLIER, false, studyBonus);

        printDamageCalc({
            header: 'Enemy Damage',
            defender: 'player',
            attackStatName: `${enemyType} attack`,
            attackStatValue: eMod,
            damageRoll,
            defenseStatName: `${playerType} base`,
            baseDefense,
            defenseMultiplier: PASSIVE_DEFENSE_MULTIPLIER,
            finalDamage,
            hpBefore: player.health,
            hpAfter: Math.max(0, player.health - finalDamage),
        });

        const updatedPlayer = applyDamage(player, finalDamage);
        let   updatedEnemy  = enemy;

        // Thorns: player was hit — reflect to enemy
        const thorns = getThornsReflect(updatedPlayer);
        if (thorns > 0) {
            await delay(500);
            const hpBefore = updatedEnemy.health;
            updatedEnemy   = applyDamage(updatedEnemy, thorns) as Enemy;
            printThornsReflect(enemy.name, thorns, hpBefore, updatedEnemy.health);
        }

        return { player: updatedPlayer, enemy: updatedEnemy };
    }

    return { player, enemy };
}

async function resolvePlayerAttackEnemyDefend(
    player: Character,
    enemy: Enemy,
    playerType: ActionType,
    enemyType: ActionType,
    playerAdv: Advantage,
    enemyAdv: Advantage,
    playerAction: 'attack' | 'defend',
): Promise<{ player: Character; enemy: Enemy }> {
    const playerDieRoll   = createDieRoll(playerAdv);
    const attackMod       = playerAttackMod(player, playerType, playerAction);
    const playerRaw       = playerDieRoll();

    console.log('\n[ Player Attack Roll ]');
    printRollLine('Player attack roll:', playerRaw, attackMod, playerAdv);
    await delay(1500);

    const baseDefense      = getDefenseStatForType(enemy, enemyType);
    const defenseMultiplier = DEFENSE_MULTIPLIERS[enemyAdv];
    const studyBonus       = playerType === 'mind' ? getStudyMarkIntensity(enemy) : 0;
    const damageRoll       = playerDieRoll() + attackMod;
    const finalDamage      = calculateFinalDamage(damageRoll, baseDefense * defenseMultiplier, false, studyBonus);

    printDamageCalc({
        header: 'Player Damage vs Defending Enemy',
        defender: 'enemy',
        attackStatName: `${playerType} attack`,
        attackStatValue: attackMod,
        damageRoll,
        defenseStatName: `${enemyType} defense`,
        baseDefense,
        defenseMultiplier,
        finalDamage,
        hpBefore: enemy.health,
        hpAfter: Math.max(0, enemy.health - finalDamage),
    });

    let updatedEnemy  = applyDamage(enemy, finalDamage);
    let updatedPlayer = player;

    // Heart/Attack specials
    if (playerType === 'heart') {
        const buffResult = removeRandomBuff(updatedEnemy);
        updatedEnemy  = buffResult.target as Enemy;
        const extResult = extendRandomBuffDuration(updatedPlayer, 1);
        updatedPlayer = extResult.target as Character;
        printHeartAttackSpecials(
            buffResult.removed ? (lookupEffect(buffResult.removed.effectId)?.name ?? null) : null,
            enemy.name,
            extResult.extended ? (lookupEffect(extResult.extended.effectId)?.name ?? null) : null,
        );
    }

    return { player: updatedPlayer, enemy: updatedEnemy };
}

async function resolvePlayerDefendEnemyAttack(
    player: Character,
    enemy: Enemy,
    playerType: ActionType,
    enemyType: ActionType,
    playerAdv: Advantage,
    enemyAdv: Advantage,
): Promise<{ player: Character; enemy: Enemy }> {
    const enemyDieRoll = createDieRoll(enemyAdv);
    const attackMod    = getAttackStatForType(enemy, enemyType);
    const enemyRaw     = enemyDieRoll();

    console.log('\n[ Enemy Attack Roll ]');
    printRollLine('Enemy attack roll:', enemyRaw, attackMod, enemyAdv);
    await delay(1500);

    const baseDefense       = getBaseStatForType(player, playerType);
    const defenseMultiplier = DEFENSE_MULTIPLIERS[playerAdv];
    const studyBonus        = enemyType === 'mind' ? getStudyMarkIntensity(player) : 0;
    const damageRoll        = enemyDieRoll() + attackMod;
    const finalDamage       = calculateFinalDamage(damageRoll, baseDefense * defenseMultiplier, false, studyBonus);

    printDamageCalc({
        header: 'Enemy Damage vs Defending Player',
        defender: 'player',
        attackStatName: `${enemyType} attack`,
        attackStatValue: attackMod,
        damageRoll,
        defenseStatName: `${playerType} base`,
        baseDefense,
        defenseMultiplier,
        finalDamage,
        hpBefore: player.health,
        hpAfter: Math.max(0, player.health - finalDamage),
    });

    const updatedPlayer = applyDamage(player, finalDamage);
    let   updatedEnemy  = enemy;

    // Thorns: player was hit while defending — reflect to enemy
    const thorns = getThornsReflect(updatedPlayer);
    if (thorns > 0) {
        await delay(500);
        const hpBefore = updatedEnemy.health;
        updatedEnemy   = applyDamage(updatedEnemy, thorns) as Enemy;
        printThornsReflect(enemy.name, thorns, hpBefore, updatedEnemy.health);
    }

    return { player: updatedPlayer, enemy: updatedEnemy };
}

// ─── Main Turn Loop ───────────────────────────────────────────────────────────

async function runCombatTurn(state: CombatState): Promise<CombatState> {
    // ── Regen phase (start of round, before player choice) ──────────────────
    let player = state.player;
    let enemy  = state.enemy;

    const playerRegen = applyRegen(player);
    player = playerRegen.target as Character;
    printRegenHeal('player', player.name, playerRegen.healed);

    const enemyRegen = applyRegen(enemy);
    enemy = enemyRegen.target as Enemy;
    printRegenHeal('enemy', enemy.name, enemyRegen.healed);

    printStatus({ ...state, player, enemy });

    const { reactionType, actionType } = await promptPlayerChoice();
    const enemyAction   = determineEnemyAction(state.enemy.logic);
    const playerAdvantage = determineAdvantage(reactionType, enemyAction.type);
    const enemyAdvantage  = determineAdvantage(enemyAction.type, reactionType);

    printRoundActions(actionType, reactionType, enemyAction.action, enemyAction.type);
    printTypeMatchup(reactionType, enemyAction.type, playerAdvantage, enemyAdvantage);
    await delay(1500);

    let friendshipCounter = state.friendshipCounter;

    // ── Clear stale Tier 1 buffs on action type switch ───────────────────────
    const playerClear = clearTier1EffectsForType(player.currentActiveEffects, reactionType);
    player = { ...player, currentActiveEffects: playerClear.activeEffects };
    printBuffsCleared('player', player.name, playerClear.cleared);

    const enemyClear = clearTier1EffectsForType(enemy.currentActiveEffects, enemyAction.type);
    enemy = { ...enemy, currentActiveEffects: enemyClear.activeEffects };
    printBuffsCleared('enemy', enemy.name, enemyClear.cleared);

    // ── Apply Tier 1 stance effects ──────────────────────────────────────────
    // Player's action may mark the enemy (Mind); enemy's action may mark the player.
    const playerTier1 = applyTier1CombatEffectWithResult(
        player.currentActiveEffects,
        enemy.currentActiveEffects,
        { type: reactionType, action: actionType },
        state.round,
    );
    player = { ...player, currentActiveEffects: playerTier1.actorEffects };
    enemy  = { ...enemy,  currentActiveEffects: playerTier1.opponentEffects };

    const enemyTier1 = applyTier1CombatEffectWithResult(
        enemy.currentActiveEffects,
        player.currentActiveEffects,
        enemyAction,
        state.round,
        enemy.tier1Effects,
    );
    enemy  = { ...enemy,  currentActiveEffects: enemyTier1.actorEffects };
    player = { ...player, currentActiveEffects: enemyTier1.opponentEffects };

    printStanceSection(
        playerTier1.effect && playerTier1.message && playerTier1.appliedTo
            ? { effect: playerTier1.effect, message: playerTier1.message, appliedTo: playerTier1.appliedTo }
            : null,
        enemy.name,
        enemyTier1.effect && enemyTier1.message && enemyTier1.appliedTo
            ? { effect: enemyTier1.effect, message: enemyTier1.message, appliedTo: enemyTier1.appliedTo }
            : null,
    );
    await delay(1000);

    // ── Resolve combat ───────────────────────────────────────────────────────
    if (actionType === 'attack' && enemyAction.action === 'attack') {
        ({ player, enemy } = await resolveAttackVsAttack(
            player, enemy, reactionType, enemyAction.type, playerAdvantage, enemyAdvantage, actionType,
        ));
    } else if (actionType === 'attack' && enemyAction.action === 'defend') {
        ({ player, enemy } = await resolvePlayerAttackEnemyDefend(
            player, enemy, reactionType, enemyAction.type, playerAdvantage, enemyAdvantage, actionType,
        ));
    } else if (actionType === 'defend' && enemyAction.action === 'attack') {
        ({ player, enemy } = await resolvePlayerDefendEnemyAttack(
            player, enemy, reactionType, enemyAction.type, playerAdvantage, enemyAdvantage,
        ));
    } else {
        // Both defend → friendship mechanic
        friendshipCounter++;
        await delay(1500);
        printBothDefending(friendshipCounter - 1, friendshipCounter);
    }

    // ── Tick effect durations ────────────────────────────────────────────────
    const playerTick = tickAllEffects(player);
    player = playerTick.target as Character;

    const enemyTick = tickAllEffects(enemy);
    enemy = enemyTick.target as Enemy;

    if (playerTick.expired.length > 0 || enemyTick.expired.length > 0) {
        await delay(500);
        printEffectExpiry('player', player.name, playerTick.expired);
        printEffectExpiry('enemy', enemy.name, enemyTick.expired);
    }

    await delay(1500);
    return { ...state, player, enemy, friendshipCounter, round: state.round + 1 };
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const store = createGameStore(nullAdapter, { player: Player });

    printCombatIntro(Player.name, Player.level, Disatree_01.name, Disatree_01.level);
    printCombatRules();

    store.getState().startCombat(Disatree_01);

    while (true) {
        const combat = store.getState().combatState;
        if (!combat || !isCombatOngoing(combat)) break;

        const next = await runCombatTurn(combat);
        store.getState().applyCombatTurn(next);
    }

    const finalCombat = store.getState().combatState!;
    store.getState().endCombat();
    printCombatEnd(finalCombat);
}

main();
