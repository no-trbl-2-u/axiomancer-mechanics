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
} from '../Combat/index';
import { createDieRoll } from '../Utils';
import { Stance, Advantage, CombatState } from '../Combat/types';
import { createGameStore } from '../Game/store';
import { nullAdapter } from '../Game/persistence/null.adapter';
import {
    DEFENSE_MULTIPLIERS,
    PASSIVE_DEFENSE_MULTIPLIER,
} from '../Game/game-mechanics.constants';
import {
    applyTier1CombatEffectWithResult,
    canAct,
    clearTier1EffectsForType,
    getActiveEffectModifiers,
    processDamageOverTime,
} from '../Effects';
import { ActiveEffect } from '../Effects/types';
import { EffectStatTarget } from '../Effects/types';
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
    printDotDamage,
    printSkipTurn,
    printForcedStance,
    printBlockedStance,
    printAdvantageOverride,
} from './combat.display';

const skipDelays = process.env.COMBAT_NO_DELAY === '1';

async function delay(ms: number): Promise<void> {
    if (skipDelays) return;
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Local helpers ────────────────────────────────────────────────────────────

/**
 * Returns the effective attack modifier (base stat + effect stat delta + roll modifier).
 * Replaces bare getActiveRollModifier() calls so stat-buffing effects (e.g. Achilles' Momentum)
 * are correctly included in damage rolls.
 */
function getEffectiveAttackMod(target: Character | Enemy, type: Stance): {
    statTotal: number;
    rollMod: number;
    mod: number;
} {
    const mods  = getActiveEffectModifiers(target.currentActiveEffects as ActiveEffect[]);
    const base  = getAttackStatForType(target, type);
    const key   = (type === 'body' ? 'physicalAttack' : type === 'mind' ? 'mentalAttack' : 'emotionalAttack') as EffectStatTarget;
    const delta = mods.statDeltas[key] ?? 0;
    const statTotal = base + delta;
    return { statTotal, rollMod: mods.rollModifier, mod: statTotal + mods.rollModifier };
}

/**
 * Returns the effective damage reduction for a defender, incorporating stat deltas and
 * the flat defense modifier from active effects.
 *
 * Formula: (baseDefense + statDelta) × stanceMultiplier + flatDefenseModifier
 */
function getEffectiveDefenseReduction(
    target: Character | Enemy,
    attackType: Stance,
    multiplier: number,
): number {
    const mods = getActiveEffectModifiers(target.currentActiveEffects as ActiveEffect[]);
    const base = getDefenseStatForType(target, attackType);
    const key  = (attackType === 'body' ? 'physicalDefense' : attackType === 'mind' ? 'mentalDefense' : 'emotionalDefense') as EffectStatTarget;
    const delta = mods.statDeltas[key] ?? 0;
    return (base + delta) * multiplier + mods.defenseModifier;
}

// ─── Player Input ─────────────────────────────────────────────────────────────

async function promptPlayerChoice(restrictions: {
    blockedStances: Stance[];
    forcedStance: Stance | null;
} = { blockedStances: [], forcedStance: null }): Promise<{
    reactionType: Stance;
    action: 'attack' | 'defend';
}> {
    const allChoices = [
        { name: `${typeColor('heart', 'Heart')}  (emotional)`, value: 'heart' as Stance },
        { name: `${typeColor('body', 'Body')}   (physical)`,   value: 'body'  as Stance },
        { name: `${typeColor('mind', 'Mind')}   (mental)`,     value: 'mind'  as Stance },
    ];

    // Apply forced stance or filter out blocked stances
    const stanceChoices = restrictions.forcedStance
        ? allChoices.filter(c => c.value === restrictions.forcedStance)
        : allChoices.filter(c => !restrictions.blockedStances.includes(c.value));

    // Guard: if all stances somehow blocked, fall back to full list
    const safeChoices = stanceChoices.length > 0 ? stanceChoices : allChoices;

    if (safeChoices.length === 1) {
        // Only one stance available — prompt only for action
        const { action } = await inquirer.prompt([{
            type: 'rawlist',
            name:    'action',
            message: `Action (${safeChoices[0].name})...`,
            choices: ['attack', 'defend'],
        }]);
        return { reactionType: safeChoices[0].value, action };
    }

    return inquirer.prompt([
        {
            type:    'rawlist',
            name:    'reactionType',
            message: 'Respond with...',
            choices: safeChoices,
        },
        {
            type:    'rawlist',
            name:    'action',
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

async function resolveAttackVsAttack(
    player: Character,
    enemy: Enemy,
    playerType: Stance,
    enemyType: Stance,
    playerAdv: Advantage,
    enemyAdv: Advantage,
    playerAction: 'attack' | 'defend',
): Promise<{ player: Character; enemy: Enemy }> {
    const playerDieRoll = createDieRoll(playerAdv);
    const enemyDieRoll  = createDieRoll(enemyAdv);

    const { statTotal: pBaseStat, rollMod: pRollMod, mod: pMod } = getEffectiveAttackMod(player, playerType);
    const playerRaw   = playerDieRoll();
    const playerTotal = playerRaw + pMod;

    const { statTotal: eBaseStat, rollMod: eRollMod, mod: eMod } = getEffectiveAttackMod(enemy, enemyType);
    const enemyRaw   = enemyDieRoll();
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
        const studyBonus    = playerType === 'mind' ? getStudyMarkIntensity(enemy) : 0;
        const damageRaw     = playerDieRoll();
        const damageRoll    = damageRaw + pMod;
        console.log('\n[ Player Damage Roll ]');
        printRollLine('Player damage roll:', damageRaw, pBaseStat, playerAdv, pRollMod || undefined);
        await delay(800);
        const baseDefense  = getDefenseStatForType(enemy, enemyType);
        const damageReduce = getEffectiveDefenseReduction(enemy, enemyType, PASSIVE_DEFENSE_MULTIPLIER);
        const finalDamage  = calculateFinalDamage(damageRoll, damageReduce, false, studyBonus);

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
        const studyBonus  = enemyType === 'mind' ? getStudyMarkIntensity(player) : 0;
        const damageRaw   = enemyDieRoll();
        const damageRoll  = damageRaw + eMod;
        console.log('\n[ Enemy Damage Roll ]');
        printRollLine('Enemy damage roll:', damageRaw, eBaseStat, enemyAdv, eRollMod || undefined);
        await delay(800);
        const baseDefense  = getDefenseStatForType(player, playerType);
        const damageReduce = getEffectiveDefenseReduction(player, playerType, PASSIVE_DEFENSE_MULTIPLIER);
        const finalDamage  = calculateFinalDamage(damageRoll, damageReduce, false, studyBonus);

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
    playerType: Stance,
    enemyType: Stance,
    playerAdv: Advantage,
    enemyAdv: Advantage,
    playerAction: 'attack' | 'defend',
): Promise<{ player: Character; enemy: Enemy }> {
    const playerDieRoll = createDieRoll(playerAdv);
    const { statTotal: pBaseStat, rollMod: pRollMod, mod: attackMod } = getEffectiveAttackMod(player, playerType);
    const playerRaw = playerDieRoll();

    console.log('\n[ Player Attack Roll ]');
    printRollLine('Player attack roll:', playerRaw, pBaseStat, playerAdv, pRollMod || undefined);
    await delay(1500);

    const baseDefense       = getDefenseStatForType(enemy, enemyType);
    const defenseMultiplier = DEFENSE_MULTIPLIERS[enemyAdv];
    const studyBonus        = playerType === 'mind' ? getStudyMarkIntensity(enemy) : 0;
    const damageRaw         = playerDieRoll();
    const damageRoll        = damageRaw + attackMod;
    console.log('\n[ Player Damage Roll ]');
    printRollLine('Player damage roll:', damageRaw, pBaseStat, playerAdv, pRollMod || undefined);
    await delay(800);
    const damageReduce = getEffectiveDefenseReduction(enemy, enemyType, defenseMultiplier);
    const finalDamage  = calculateFinalDamage(damageRoll, damageReduce, false, studyBonus);

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
    playerType: Stance,
    enemyType: Stance,
    playerAdv: Advantage,
    enemyAdv: Advantage,
): Promise<{ player: Character; enemy: Enemy }> {
    const enemyDieRoll = createDieRoll(enemyAdv);
    const { statTotal: eBaseStat, rollMod: eRollMod, mod: attackMod } = getEffectiveAttackMod(enemy, enemyType);
    const enemyRaw = enemyDieRoll();

    console.log('\n[ Enemy Attack Roll ]');
    printRollLine('Enemy attack roll:', enemyRaw, eBaseStat, enemyAdv, eRollMod || undefined);
    await delay(1500);

    const baseDefense       = getDefenseStatForType(player, playerType);
    const defenseMultiplier = DEFENSE_MULTIPLIERS[playerAdv];
    const studyBonus        = enemyType === 'mind' ? getStudyMarkIntensity(player) : 0;
    const damageRaw         = enemyDieRoll();
    const damageRoll        = damageRaw + attackMod;
    console.log('\n[ Enemy Damage Roll ]');
    printRollLine('Enemy damage roll:', damageRaw, eBaseStat, enemyAdv, eRollMod || undefined);
    await delay(800);
    const damageReduce = getEffectiveDefenseReduction(player, playerType, defenseMultiplier);
    const finalDamage  = calculateFinalDamage(damageRoll, damageReduce, false, studyBonus);

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
    // ── DoT + Regen phase (start of round, before player choice) ────────────
    let player = state.player;
    let enemy  = state.enemy;

    // Damage over time
    const playerDot = processDamageOverTime(player.currentActiveEffects as ActiveEffect[]);
    if (playerDot.totalDamage > 0) {
        player = applyDamage(player, playerDot.totalDamage) as Character;
        printDotDamage('player', player.name, playerDot.messages, playerDot.totalDamage);
        await delay(600);
    }
    const enemyDot = processDamageOverTime(enemy.currentActiveEffects as ActiveEffect[]);
    if (enemyDot.totalDamage > 0) {
        enemy = applyDamage(enemy, enemyDot.totalDamage) as Enemy;
        printDotDamage('enemy', enemy.name, enemyDot.messages, enemyDot.totalDamage);
        await delay(600);
    }

    // Regeneration
    const playerRegen = applyRegen(player);
    player = playerRegen.target as Character;
    printRegenHeal('player', player.name, playerRegen.healed);

    const enemyRegen = applyRegen(enemy);
    enemy = enemyRegen.target as Enemy;
    printRegenHeal('enemy', enemy.name, enemyRegen.healed);

    printStatus({ ...state, player, enemy });

    // ── Resolve action restrictions ──────────────────────────────────────────
    const playerRestrictions = canAct(player.currentActiveEffects as ActiveEffect[]);
    const enemyRestrictions  = canAct(enemy.currentActiveEffects as ActiveEffect[]);

    // ── Player choice (with restriction enforcement) ─────────────────────────
    let reactionType: Stance;
    let action: 'attack' | 'defend';

    if (playerRestrictions.skipTurn) {
        const skipEffect = (player.currentActiveEffects as ActiveEffect[])
            .find(ae => lookupEffect(ae.effectId)?.payload.actionRestriction?.skipTurn);
        const skipName = skipEffect ? (lookupEffect(skipEffect.effectId)?.name ?? 'stun') : 'stun';
        printSkipTurn('player', player.name, skipName);
        reactionType = playerRestrictions.forcedStance ?? 'body';
        action = 'defend';
    } else {
        if (playerRestrictions.forcedStance) {
            const forcedEffect = (player.currentActiveEffects as ActiveEffect[])
                .find(ae => lookupEffect(ae.effectId)?.payload.actionRestriction?.forcedStance);
            const name = forcedEffect ? (lookupEffect(forcedEffect.effectId)?.name ?? 'charm') : 'charm';
            printForcedStance('player', player.name, playerRestrictions.forcedStance, name);
        } else if (playerRestrictions.blockedStances.length > 0) {
            const blockedEffect = (player.currentActiveEffects as ActiveEffect[])
                .find(ae => (lookupEffect(ae.effectId)?.payload.actionRestriction?.blockedStances?.length ?? 0) > 0);
            const name = blockedEffect ? (lookupEffect(blockedEffect.effectId)?.name ?? 'silence') : 'silence';
            printBlockedStance('player', player.name, playerRestrictions.blockedStances, name);
        }
        const choice = await promptPlayerChoice(playerRestrictions);
        reactionType = choice.reactionType;
        action       = choice.action;
    }

    // ── Enemy choice (with restriction enforcement) ──────────────────────────
    let enemyAction = determineEnemyAction(state.enemy.logic);

    if (enemyRestrictions.skipTurn) {
        const skipEffect = (enemy.currentActiveEffects as ActiveEffect[])
            .find(ae => lookupEffect(ae.effectId)?.payload.actionRestriction?.skipTurn);
        const skipName = skipEffect ? (lookupEffect(skipEffect.effectId)?.name ?? 'stun') : 'stun';
        printSkipTurn('enemy', enemy.name, skipName);
        enemyAction = { type: enemyRestrictions.forcedStance ?? enemyAction.type, action: 'defend' };
    } else {
        if (enemyRestrictions.forcedStance) {
            const forcedEffect = (enemy.currentActiveEffects as ActiveEffect[])
                .find(ae => lookupEffect(ae.effectId)?.payload.actionRestriction?.forcedStance);
            const name = forcedEffect ? (lookupEffect(forcedEffect.effectId)?.name ?? 'charm') : 'charm';
            printForcedStance('enemy', enemy.name, enemyRestrictions.forcedStance, name);
            enemyAction = { ...enemyAction, type: enemyRestrictions.forcedStance };
        } else if (enemyRestrictions.blockedStances.includes(enemyAction.type)) {
            const allStances: Stance[] = ['body', 'mind', 'heart'];
            const allowed = allStances.filter(s => !enemyRestrictions.blockedStances.includes(s));
            if (allowed.length > 0) {
                enemyAction = { ...enemyAction, type: allowed[Math.floor(Math.random() * allowed.length)] };
            }
        }
    }

    // ── Advantage (RPS base + active-effect overrides) ───────────────────────
    let playerAdvantage = determineAdvantage(reactionType, enemyAction.type);
    let enemyAdvantage  = determineAdvantage(enemyAction.type, reactionType);

    const playerMods = getActiveEffectModifiers(player.currentActiveEffects as ActiveEffect[]);
    const enemyMods  = getActiveEffectModifiers(enemy.currentActiveEffects as ActiveEffect[]);

    // Player attacking: check player's own attack boosts/penalties and enemy evasion
    if (playerMods.attackAdvantage.includes(enemyAction.type)) {
        playerAdvantage = 'advantage';
        printAdvantageOverride('player', 'Haste/buff', 'advantage');
    } else if (playerMods.attackDisadvantage.includes(reactionType) ||
               enemyMods.evasionDisadvantage.includes(reactionType)) {
        playerAdvantage = 'disadvantage';
        const src = playerMods.attackDisadvantage.includes(reactionType) ? 'Status debuff' : 'Enemy evasion';
        printAdvantageOverride('player', src, 'disadvantage');
    }

    // Enemy attacking: check enemy's own attack boosts/penalties and player evasion
    if (enemyMods.attackAdvantage.includes(reactionType)) {
        enemyAdvantage = 'advantage';
        printAdvantageOverride('enemy', 'Haste/buff', 'advantage');
    } else if (enemyMods.attackDisadvantage.includes(enemyAction.type) ||
               playerMods.evasionDisadvantage.includes(enemyAction.type)) {
        enemyAdvantage = 'disadvantage';
        const src = enemyMods.attackDisadvantage.includes(enemyAction.type) ? 'Status debuff' : 'Player evasion';
        printAdvantageOverride('enemy', src, 'disadvantage');
    }

    printRoundActions(action, reactionType, enemyAction.action, enemyAction.type);
    printTypeMatchup(reactionType, enemyAction.type, playerAdvantage, enemyAdvantage);
    await delay(1500);

    let friendshipCounter = state.friendshipCounter;

    // ── Clear stale Tier 1 buffs on action type switch ───────────────────────
    const playerClear = clearTier1EffectsForType(player.currentActiveEffects, reactionType);
    player = { ...player, currentActiveEffects: playerClear.activeEffects };
    printBuffsCleared('player', player.name, playerClear.cleared, reactionType);

    const enemyClear = clearTier1EffectsForType(enemy.currentActiveEffects, enemyAction.type);
    enemy = { ...enemy, currentActiveEffects: enemyClear.activeEffects };
    printBuffsCleared('enemy', enemy.name, enemyClear.cleared, enemyAction.type);

    // ── Apply Tier 1 stance effects ──────────────────────────────────────────
    // Player's action may mark the enemy (Mind); enemy's action may mark the player.
    const playerTier1 = applyTier1CombatEffectWithResult(
        player.currentActiveEffects,
        enemy.currentActiveEffects,
        { type: reactionType, action },
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
    if (action === 'attack' && enemyAction.action === 'attack') {
        ({ player, enemy } = await resolveAttackVsAttack(
            player, enemy, reactionType, enemyAction.type, playerAdvantage, enemyAdvantage, action,
        ));
    } else if (action === 'attack' && enemyAction.action === 'defend') {
        ({ player, enemy } = await resolvePlayerAttackEnemyDefend(
            player, enemy, reactionType, enemyAction.type, playerAdvantage, enemyAdvantage, action,
        ));
    } else if (action === 'defend' && enemyAction.action === 'attack') {
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
