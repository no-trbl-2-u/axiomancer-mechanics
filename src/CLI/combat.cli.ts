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
    getAttackStat,
    getBaseStat,
    getDefenseStat,
    getActiveRollModifier,
    calculateFinalDamage,
    applyDamage,
    tickAllEffects,
    getThornsReflect,
    getStudyMarkIntensity,
    removeRandomBuff,
    extendRandomBuffDuration,
    applyRegen,
} from '../Combat';
import { createDieRoll } from '../Utils';
import { Stance, Advantage, CombatState } from '../Combat/types';
import { createGameStore } from '../Game/store';
import { nullAdapter } from '../Game/persistence/null.adapter';
import {
    DEFENSE_MULTIPLIERS,
    PASSIVE_DEFENSE_MULTIPLIER,
} from '../Game/game-mechanics.constants';
import { applyTier1CombatEffect, clearTier1EffectsForStance } from '../Effects';
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

const skipDelays = process.env.COMBAT_NO_DELAY === '1';

async function delay(ms: number): Promise<void> {
    if (skipDelays) return;
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Player Input ─────────────────────────────────────────────────────────────

async function promptPlayerChoice(): Promise<{
    stance: Stance;
    action: 'attack' | 'defend';
}> {
    return inquirer.prompt([
        {
            type: 'rawlist',
            name: 'stance',
            message: 'Respond with...',
            choices: [
                { name: `${typeColor('heart', 'Heart')}  (emotional)`, value: 'heart' },
                { name: `${typeColor('body', 'Body')}   (physical)`, value: 'body' },
                { name: `${typeColor('mind', 'Mind')}   (mental)`, value: 'mind' },
            ],
        },
        {
            type: 'rawlist',
            name: 'action',
            message: 'Action...',
            choices: ['attack', 'defend'],
        },
    ]);
}

// ─── Combat Scenarios ─────────────────────────────────────────────────────────

async function resolveAttackVsAttack(
    player: Character,
    enemy: Enemy,
    playerType: Stance,
    enemyType: Stance,
    playerAdv: Advantage,
    enemyAdv: Advantage,
): Promise<{ player: Character; enemy: Enemy }> {
    const playerDieRoll = createDieRoll(playerAdv);
    const enemyDieRoll  = createDieRoll(enemyAdv);

    const pRollMod  = getActiveRollModifier(player);
    const pBaseStat = getAttackStat(player, playerType);
    const pMod      = pBaseStat + pRollMod;
    const playerRaw = playerDieRoll();
    const playerTotal = playerRaw + pMod;

    const eRollMod  = getActiveRollModifier(enemy);
    const eBaseStat = getAttackStat(enemy, enemyType);
    const eMod      = eBaseStat + eRollMod;
    const enemyRaw  = enemyDieRoll();
    const enemyTotal = enemyRaw + eMod;

    printContestHeader(
        playerRaw, pBaseStat, playerAdv,
        enemyRaw,  eBaseStat, enemyAdv,
        pRollMod || undefined,
        eRollMod || undefined,
    );
    await delay(1500);
    printContestOutcome(playerTotal, enemyTotal);
    await delay(1500);

    if (playerTotal > enemyTotal) {
        const baseDefense   = getDefenseStat(enemy, enemyType);
        const studyBonus    = playerType === 'mind' ? getStudyMarkIntensity(enemy) : 0;
        const damageRaw     = playerDieRoll();
        const damageRoll    = damageRaw + pMod;
        console.log('\n[ Player Damage Roll ]');
        printRollLine('Player damage roll:', damageRaw, pBaseStat, playerAdv, pRollMod || undefined);
        await delay(800);
        const finalDamage   = calculateFinalDamage(damageRoll, baseDefense * PASSIVE_DEFENSE_MULTIPLIER, false, studyBonus);

        printDamageCalc({
            header: 'Player Damage',
            defender: 'enemy',
            attackStatName: `${playerType} attack`,
            attackStatValue: pMod,
            damageRoll,
            damageBonus: studyBonus || undefined,
            defenseStatName: `${enemyType} defense`,
            baseDefense,
            defenseMultiplier: PASSIVE_DEFENSE_MULTIPLIER,
            finalDamage,
            hpBefore: enemy.health,
            hpAfter: Math.max(0, enemy.health - finalDamage),
        });

        let updatedEnemy = applyDamage(enemy, finalDamage);
        let updatedPlayer = player;

        if (playerType === 'heart') {
            const buffResult = removeRandomBuff(updatedEnemy);
            updatedEnemy = buffResult.target;
            const extResult = extendRandomBuffDuration(updatedPlayer, 1);
            updatedPlayer = extResult.target;
            printHeartAttackSpecials(
                buffResult.removed ? (lookupEffect(buffResult.removed.effectId)?.name ?? null) : null,
                enemy.name,
                extResult.extended ? (lookupEffect(extResult.extended.effectId)?.name ?? null) : null,
            );
        }

        return { player: updatedPlayer, enemy: updatedEnemy };
    }

    if (enemyTotal > playerTotal) {
        const baseDefense = getBaseStat(player, playerType);
        const studyBonus  = enemyType === 'mind' ? getStudyMarkIntensity(player) : 0;
        const damageRaw   = enemyDieRoll();
        const damageRoll  = damageRaw + eMod;
        console.log('\n[ Enemy Damage Roll ]');
        printRollLine('Enemy damage roll:', damageRaw, eBaseStat, enemyAdv, eRollMod || undefined);
        await delay(800);
        const finalDamage = calculateFinalDamage(damageRoll, baseDefense * PASSIVE_DEFENSE_MULTIPLIER, false, studyBonus);

        printDamageCalc({
            header: 'Enemy Damage',
            defender: 'player',
            attackStatName: `${enemyType} attack`,
            attackStatValue: eMod,
            damageRoll,
            damageBonus: studyBonus || undefined,
            defenseStatName: `${playerType} base`,
            baseDefense,
            defenseMultiplier: PASSIVE_DEFENSE_MULTIPLIER,
            finalDamage,
            hpBefore: player.health,
            hpAfter: Math.max(0, player.health - finalDamage),
        });

        const updatedPlayer = applyDamage(player, finalDamage);
        let   updatedEnemy  = enemy;

        const thorns = getThornsReflect(updatedPlayer);
        if (thorns > 0) {
            await delay(500);
            const hpBefore = updatedEnemy.health;
            updatedEnemy   = applyDamage(updatedEnemy, thorns);
            printThornsReflect(enemy.name, thorns, hpBefore, updatedEnemy.health);
        }

        return { player: updatedPlayer, enemy: updatedEnemy };
    }

    return { player, enemy };
}

async function resolvePlayerAttackEnemyDefend(
    player: Character,
    enemy: Enemy,
    playerType: Stance,
    enemyType: Stance,
    playerAdv: Advantage,
    enemyAdv: Advantage,
): Promise<{ player: Character; enemy: Enemy }> {
    const playerDieRoll = createDieRoll(playerAdv);
    const pRollMod      = getActiveRollModifier(player);
    const pBaseStat     = getAttackStat(player, playerType);
    const attackMod     = pBaseStat + pRollMod;
    const playerRaw     = playerDieRoll();

    console.log('\n[ Player Attack Roll ]');
    printRollLine('Player attack roll:', playerRaw, pBaseStat, playerAdv, pRollMod || undefined);
    await delay(1500);

    const baseDefense       = getDefenseStat(enemy, enemyType);
    const defenseMultiplier = DEFENSE_MULTIPLIERS[enemyAdv];
    const studyBonus        = playerType === 'mind' ? getStudyMarkIntensity(enemy) : 0;
    const damageRaw         = playerDieRoll();
    const damageRoll        = damageRaw + attackMod;
    console.log('\n[ Player Damage Roll ]');
    printRollLine('Player damage roll:', damageRaw, pBaseStat, playerAdv, pRollMod || undefined);
    await delay(800);
    const finalDamage       = calculateFinalDamage(damageRoll, baseDefense * defenseMultiplier, false, studyBonus);

    printDamageCalc({
        header: 'Player Damage vs Defending Enemy',
        defender: 'enemy',
        attackStatName: `${playerType} attack`,
        attackStatValue: attackMod,
        damageRoll,
        damageBonus: studyBonus || undefined,
        defenseStatName: `${enemyType} defense`,
        baseDefense,
        defenseMultiplier,
        finalDamage,
        hpBefore: enemy.health,
        hpAfter: Math.max(0, enemy.health - finalDamage),
    });

    let updatedEnemy  = applyDamage(enemy, finalDamage);
    let updatedPlayer = player;

    if (playerType === 'heart') {
        const buffResult = removeRandomBuff(updatedEnemy);
        updatedEnemy  = buffResult.target;
        const extResult = extendRandomBuffDuration(updatedPlayer, 1);
        updatedPlayer = extResult.target;
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
    playerType: Stance,
    enemyType: Stance,
    playerAdv: Advantage,
    enemyAdv: Advantage,
): Promise<{ player: Character; enemy: Enemy }> {
    const enemyDieRoll = createDieRoll(enemyAdv);
    const eRollMod     = getActiveRollModifier(enemy);
    const eBaseStat    = getAttackStat(enemy, enemyType);
    const attackMod    = eBaseStat + eRollMod;
    const enemyRaw     = enemyDieRoll();

    console.log('\n[ Enemy Attack Roll ]');
    printRollLine('Enemy attack roll:', enemyRaw, eBaseStat, enemyAdv, eRollMod || undefined);
    await delay(1500);

    const baseDefense       = getBaseStat(player, playerType);
    const defenseMultiplier = DEFENSE_MULTIPLIERS[playerAdv];
    const studyBonus        = enemyType === 'mind' ? getStudyMarkIntensity(player) : 0;
    const damageRaw         = enemyDieRoll();
    const damageRoll        = damageRaw + attackMod;
    console.log('\n[ Enemy Damage Roll ]');
    printRollLine('Enemy damage roll:', damageRaw, eBaseStat, enemyAdv, eRollMod || undefined);
    await delay(800);
    const finalDamage       = calculateFinalDamage(damageRoll, baseDefense * defenseMultiplier, false, studyBonus);

    printDamageCalc({
        header: 'Enemy Damage vs Defending Player',
        defender: 'player',
        attackStatName: `${enemyType} attack`,
        attackStatValue: attackMod,
        damageRoll,
        damageBonus: studyBonus || undefined,
        defenseStatName: `${playerType} base`,
        baseDefense,
        defenseMultiplier,
        finalDamage,
        hpBefore: player.health,
        hpAfter: Math.max(0, player.health - finalDamage),
    });

    const updatedPlayer = applyDamage(player, finalDamage);
    let   updatedEnemy  = enemy;

    const thorns = getThornsReflect(updatedPlayer);
    if (thorns > 0) {
        await delay(500);
        const hpBefore = updatedEnemy.health;
        updatedEnemy   = applyDamage(updatedEnemy, thorns);
        printThornsReflect(enemy.name, thorns, hpBefore, updatedEnemy.health);
    }

    return { player: updatedPlayer, enemy: updatedEnemy };
}

// ─── Main Turn Loop ───────────────────────────────────────────────────────────

async function runCombatTurn(state: CombatState): Promise<CombatState> {
    let player = state.player;
    let enemy  = state.enemy;

    const playerRegen = applyRegen(player);
    player = playerRegen.target;
    printRegenHeal('player', player.name, playerRegen.healed);

    const enemyRegen = applyRegen(enemy);
    enemy = enemyRegen.target;
    printRegenHeal('enemy', enemy.name, enemyRegen.healed);

    printStatus({ ...state, player, enemy });

    const { stance, action } = await promptPlayerChoice();
    const enemyAction     = determineEnemyAction(state.enemy);
    const playerAdvantage = determineAdvantage(stance, enemyAction.stance);
    const enemyAdvantage  = determineAdvantage(enemyAction.stance, stance);

    printRoundActions(action, stance, enemyAction.action, enemyAction.stance);
    printTypeMatchup(stance, enemyAction.stance, playerAdvantage, enemyAdvantage);
    await delay(1500);

    let friendshipCounter = state.friendshipCounter;

    const playerClear = clearTier1EffectsForStance(player.effects, stance);
    player = { ...player, effects: playerClear.activeEffects };
    printBuffsCleared('player', player.name, playerClear.cleared, stance);

    const enemyClear = clearTier1EffectsForStance(enemy.effects, enemyAction.stance);
    enemy = { ...enemy, effects: enemyClear.activeEffects };
    printBuffsCleared('enemy', enemy.name, enemyClear.cleared, enemyAction.stance);

    const playerTier1 = applyTier1CombatEffect(
        player.effects,
        enemy.effects,
        { stance, action },
        state.round,
    );
    player = { ...player, effects: playerTier1.actorEffects };
    enemy  = { ...enemy,  effects: playerTier1.opponentEffects };

    const enemyTier1 = applyTier1CombatEffect(
        enemy.effects,
        player.effects,
        enemyAction,
        state.round,
        enemy.tier1Overrides,
    );
    enemy  = { ...enemy,  effects: enemyTier1.actorEffects };
    player = { ...player, effects: enemyTier1.opponentEffects };

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

    if (action === 'attack' && enemyAction.action === 'attack') {
        ({ player, enemy } = await resolveAttackVsAttack(
            player, enemy, stance, enemyAction.stance, playerAdvantage, enemyAdvantage,
        ));
    } else if (action === 'attack' && enemyAction.action === 'defend') {
        ({ player, enemy } = await resolvePlayerAttackEnemyDefend(
            player, enemy, stance, enemyAction.stance, playerAdvantage, enemyAdvantage,
        ));
    } else if (action === 'defend' && enemyAction.action === 'attack') {
        ({ player, enemy } = await resolvePlayerDefendEnemyAttack(
            player, enemy, stance, enemyAction.stance, playerAdvantage, enemyAdvantage,
        ));
    } else {
        friendshipCounter++;
        await delay(1500);
        printBothDefending(friendshipCounter - 1, friendshipCounter);
    }

    const playerTick = tickAllEffects(player);
    player = playerTick.target;

    const enemyTick = tickAllEffects(enemy);
    enemy = enemyTick.target;

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
        const combat = store.getState().combat;
        if (!combat || !isCombatOngoing(combat)) break;

        const next = await runCombatTurn(combat);
        store.getState().updateCombat(next);
    }

    const finalCombat = store.getState().combat!;
    store.getState().endCombat();
    printCombatEnd(finalCombat);
}

main();
