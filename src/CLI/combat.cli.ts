#!/usr/bin/env node

import inquirer from 'inquirer';

import { Disatree_01 } from '../Enemy/enemy.library';
import { Player } from '../Character/characters.mock';
import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import {
    determineEnemyAction,
    determineAdvantage,
    resolveEffectiveAdvantage,
    isCombatOngoing,
    getAttackStat,
    getBaseStat,
    getDefenseStat,
    getActiveRollModifier,
    getEffectiveStats,
    calculateFinalDamage,
    applyDamage,
    getThornsReflect,
    getStudyMarkIntensity,
    removeRandomBuff,
    extendRandomBuffDuration,
    canAct,
    processRoundStartEffects,
    processRoundEndEffects,
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
    printManaRestore,
    printDrain,
    printDotDamage,
    printForcedStance,
    printTurnSkipped,
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

/**
 * Defense value the bearer gets when they did NOT pick `defend` this round —
 * the base stat for their stance plus the stance-agnostic `defenseModifier`
 * flat bonus from active effects (`buff_barrier`, `buff_invincibility`, ...).
 */
function getPassiveDefense(combatant: Character | Enemy, stance: Stance): number {
    const { defenseDelta } = getEffectiveStats(combatant);
    return getBaseStat(combatant, stance) + defenseDelta;
}

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
        const baseDefense   = getPassiveDefense(enemy, enemyType);
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
        const baseDefense = getPassiveDefense(player, playerType);
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

    const baseDefense       = getBaseStat(player, playerType) + getEffectiveStats(player).defenseDelta;
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

    // 1. Round-start effect phase: regen → mana regen → drain → DoT (start phase).
    //    `processRoundStartEffects` orchestrates the entire start sequence and
    //    returns each component for the UI.
    const pStart = processRoundStartEffects(player);
    player = pStart.target;
    printRegenHeal('player',   player.name, pStart.healed);
    printManaRestore('player', player.name, pStart.manaRestored);
    printDrain('player',       player.name, pStart.drained);
    printDotDamage('player',   player.name, pStart.dotDamage, 'start');

    const eStart = processRoundStartEffects(enemy);
    enemy = eStart.target;
    printRegenHeal('enemy',   enemy.name, eStart.healed);
    printManaRestore('enemy', enemy.name, eStart.manaRestored);
    printDrain('enemy',       enemy.name, eStart.drained);
    printDotDamage('enemy',   enemy.name, eStart.dotDamage, 'start');

    // If start-phase ticks dropped someone, exit early — combat ends here.
    if (player.health <= 0 || enemy.health <= 0) {
        await delay(500);
        return { ...state, player, enemy, round: state.round + 1 };
    }

    printStatus({ ...state, player, enemy });

    const { stance, action } = await promptPlayerChoice();
    const enemyAction = determineEnemyAction(state.enemy);

    // 2. Action restriction resolution (per Q7 precedence). Forced stance from
    //    e.g. `debuff_charm` overrides the requested stance; `debuff_silence`
    //    blocks specific stances; `debuff_stun`/`_sleep`/`_petrify` skip the
    //    turn entirely.
    const playerCanResult = canAct(player.effects, stance);
    const enemyCanResult  = canAct(enemy.effects,  enemyAction.stance);

    const playerStance = playerCanResult.resolvedStance ?? stance;
    const enemyStance  = enemyCanResult.resolvedStance  ?? enemyAction.stance;
    if (playerCanResult.resolvedStance && playerCanResult.resolvedStance !== stance) {
        printForcedStance('player', player.name, stance, playerCanResult.resolvedStance);
    }
    if (enemyCanResult.resolvedStance && enemyCanResult.resolvedStance !== enemyAction.stance) {
        printForcedStance('enemy', enemy.name, enemyAction.stance, enemyCanResult.resolvedStance);
    }
    if (!playerCanResult.canAct) printTurnSkipped('player', player.name, playerCanResult.reason);
    if (!enemyCanResult.canAct)  printTurnSkipped('enemy',  enemy.name,  enemyCanResult.reason);

    // A skipped combatant takes no offensive or defensive action this round.
    // Modeled as a no-op: defense uses `getPassiveDefense` (no defend bonus),
    // and the combatant doesn't attack regardless of their chosen action.
    const playerActs = playerCanResult.canAct;
    const enemyActs  = enemyCanResult.canAct;
    const playerActionFinal = playerActs ? action : 'skip';
    const enemyActionFinal  = enemyActs  ? enemyAction.action : 'skip';

    // 3. Advantage. Effect grants on the attacker's stance OVERRIDE the
    //    matchup result (Q8 default). If unbalanced, propose canceling
    //    overrides instead — see `resolveEffectiveAdvantage`.
    const matchupP = determineAdvantage(playerStance, enemyStance);
    const matchupE = determineAdvantage(enemyStance,  playerStance);
    const playerAdvantage = resolveEffectiveAdvantage(matchupP, player.effects, playerStance);
    const enemyAdvantage  = resolveEffectiveAdvantage(matchupE, enemy.effects,  enemyStance);

    printRoundActions(playerActionFinal, playerStance, enemyActionFinal, enemyStance);
    printTypeMatchup(playerStance, enemyStance, playerAdvantage, enemyAdvantage);
    await delay(1500);

    let friendshipCounter = state.friendshipCounter;

    // 4. Tier 1 stance buffs: clear stale, apply new (only if combatant acted).
    const playerClear = clearTier1EffectsForStance(player.effects, playerStance);
    player = { ...player, effects: playerClear.activeEffects };
    printBuffsCleared('player', player.name, playerClear.cleared, playerStance);

    const enemyClear = clearTier1EffectsForStance(enemy.effects, enemyStance);
    enemy = { ...enemy, effects: enemyClear.activeEffects };
    printBuffsCleared('enemy', enemy.name, enemyClear.cleared, enemyStance);

    let playerTier1Outcome = null as ReturnType<typeof applyTier1CombatEffect> | null;
    let enemyTier1Outcome  = null as ReturnType<typeof applyTier1CombatEffect> | null;
    if (playerActs && (playerActionFinal === 'attack' || playerActionFinal === 'defend')) {
        playerTier1Outcome = applyTier1CombatEffect(
            player.effects, enemy.effects,
            { stance: playerStance, action: playerActionFinal },
            state.round,
        );
        player = { ...player, effects: playerTier1Outcome.actorEffects };
        enemy  = { ...enemy,  effects: playerTier1Outcome.opponentEffects };
    }
    if (enemyActs && (enemyActionFinal === 'attack' || enemyActionFinal === 'defend')) {
        enemyTier1Outcome = applyTier1CombatEffect(
            enemy.effects, player.effects,
            { stance: enemyStance, action: enemyActionFinal },
            state.round,
            enemy.tier1Overrides,
        );
        enemy  = { ...enemy,  effects: enemyTier1Outcome.actorEffects };
        player = { ...player, effects: enemyTier1Outcome.opponentEffects };
    }

    printStanceSection(
        playerTier1Outcome?.effect && playerTier1Outcome.message && playerTier1Outcome.appliedTo
            ? { effect: playerTier1Outcome.effect, message: playerTier1Outcome.message, appliedTo: playerTier1Outcome.appliedTo }
            : null,
        enemy.name,
        enemyTier1Outcome?.effect && enemyTier1Outcome.message && enemyTier1Outcome.appliedTo
            ? { effect: enemyTier1Outcome.effect, message: enemyTier1Outcome.message, appliedTo: enemyTier1Outcome.appliedTo }
            : null,
    );
    await delay(1000);

    // 5. Resolve scenario. A skipped combatant is treated as neither attacker
    //    nor defender — they take damage at PASSIVE multiplier and don't hit
    //    back. This makes `skipTurn` actually skip a turn.
    if (playerActionFinal === 'attack' && enemyActionFinal === 'attack') {
        ({ player, enemy } = await resolveAttackVsAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage,
        ));
    } else if (playerActionFinal === 'attack' && enemyActionFinal === 'defend') {
        ({ player, enemy } = await resolvePlayerAttackEnemyDefend(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage,
        ));
    } else if (playerActionFinal === 'defend' && enemyActionFinal === 'attack') {
        ({ player, enemy } = await resolvePlayerDefendEnemyAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage,
        ));
    } else if (playerActionFinal === 'attack' && enemyActionFinal === 'skip') {
        // Player attacks an unresisting enemy — passive defense, no thorns retaliation possible.
        ({ player, enemy } = await resolveAttackVsAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage,
        ));
    } else if (enemyActionFinal === 'attack' && playerActionFinal === 'skip') {
        ({ player, enemy } = await resolveAttackVsAttack(
            player, enemy, playerStance, enemyStance, playerAdvantage, enemyAdvantage,
        ));
    } else if (playerActionFinal === 'defend' && enemyActionFinal === 'defend') {
        friendshipCounter++;
        await delay(1500);
        printBothDefending(friendshipCounter - 1, friendshipCounter);
    } else {
        // skip vs skip / skip vs defend — no exchange happens.
        await delay(800);
    }

    // 6. Round-end effect phase: end-phase DoT (e.g. bleed) → tick + expiry.
    const pEnd = processRoundEndEffects(player);
    player = pEnd.target;
    printDotDamage('player', player.name, pEnd.dotDamage, 'end');

    const eEnd = processRoundEndEffects(enemy);
    enemy = eEnd.target;
    printDotDamage('enemy', enemy.name, eEnd.dotDamage, 'end');

    if (pEnd.expired.length > 0 || eEnd.expired.length > 0) {
        await delay(500);
        printEffectExpiry('player', player.name, pEnd.expired);
        printEffectExpiry('enemy',  enemy.name,  eEnd.expired);
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
