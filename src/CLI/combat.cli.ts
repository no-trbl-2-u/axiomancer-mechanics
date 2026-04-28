#!/usr/bin/env node

import inquirer from 'inquirer';

import { Disatree_01 } from '../Enemy/enemy.library';
import { Player } from '../Character/characters.mock';
import {
    determineEnemyAction,
    isCombatOngoing,
} from '../Combat/index';
import { resolveCombatRoundWithEvents, ResolveCombatRoundEvents } from '../Combat/combat.reducer';
import { Stance, Action, CombatState } from '../Combat/types';
import { createGameStore } from '../Game/store';
import { nullAdapter } from '../Game/persistence/null.adapter';
import {
    typeColor,
    printCombatIntro,
    printCombatRules,
    printStatus,
    printRoundActions,
    printTypeMatchup,
    printCombatEnd,
    printStanceSection,
    printEffectExpiry,
    printBuffsCleared,
    printRegenHeal,
    printBothDefending,
    printActiveEffects,
    sectionHeader,
    HR_MAJOR,
    HR_MINOR,
    C,
} from './combat.display';
import { determineAdvantage } from '../Combat/index';

const skipDelays = process.env.COMBAT_NO_DELAY === '1';

async function delay(ms: number): Promise<void> {
    if (skipDelays) return;
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Player Input ─────────────────────────────────────────────────────────────

async function promptPlayerChoice(): Promise<{
    reactionType: Stance;
    action: Action;
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
            name: 'action',
            message: 'Action...',
            choices: [
                { name: 'attack', value: 'attack' },
                { name: 'defend', value: 'defend' },
                { name: `${C.dim}skill (Phase 3 — coming soon)${C.reset}`, value: 'skill' },
                { name: `${C.dim}item  (Phase 4 — coming soon)${C.reset}`, value: 'item' },
            ],
        },
    ]);
}

// ─── Effect Display Helpers ──────────────────────────────────────────────────

function printActiveEffectsPanel(state: CombatState): void {
    const playerHas = state.player.currentActiveEffects.length > 0;
    const enemyHas = state.enemy.currentActiveEffects.length > 0;
    if (!playerHas && !enemyHas) return;
    console.log(sectionHeader('Active Effects'));
    if (playerHas) printActiveEffects(state.player.name, state.player.currentActiveEffects);
    if (enemyHas) printActiveEffects(state.enemy.name, state.enemy.currentActiveEffects);
}

function printProcs(events: ResolveCombatRoundEvents, playerName: string, enemyName: string): void {
    if (events.procs.byPlayer.length === 0 && events.procs.byEnemy.length === 0) return;
    console.log(sectionHeader('Effect Procs'));
    for (const p of events.procs.byPlayer) {
        const target = p.appliedTo === 'player' ? playerName : enemyName;
        console.log(`  ${C.dim}${playerName} → ${target}:${C.reset} ${p.message}`);
    }
    for (const p of events.procs.byEnemy) {
        const target = p.appliedTo === 'player' ? playerName : enemyName;
        console.log(`  ${C.dim}${enemyName} → ${target}:${C.reset} ${p.message}`);
    }
}

function printRoundStart(events: ResolveCombatRoundEvents, state: CombatState): void {
    if (events.roundStart.player.healed > 0) {
        printRegenHeal('player', state.player.name, events.roundStart.player.healed);
    }
    if (events.roundStart.enemy.healed > 0) {
        printRegenHeal('enemy', state.enemy.name, events.roundStart.enemy.healed);
    }
    for (const m of events.roundStart.player.messages) {
        if (m.includes('damage')) console.log(`  ${C.red}${state.player.name}: ${m}${C.reset}`);
    }
    for (const m of events.roundStart.enemy.messages) {
        if (m.includes('damage')) console.log(`  ${C.red}${state.enemy.name}: ${m}${C.reset}`);
    }
}

function printDamageSummary(events: ResolveCombatRoundEvents, state: CombatState): void {
    if (events.bothDefend) return;
    console.log(sectionHeader('Damage'));
    if (events.damage.toEnemy > 0) {
        console.log(`  ${state.player.name} → ${state.enemy.name}: ${C.red}${events.damage.toEnemy}${C.reset}`);
    }
    if (events.damage.toPlayer > 0) {
        console.log(`  ${state.enemy.name} → ${state.player.name}: ${C.red}${events.damage.toPlayer}${C.reset}`);
    }
    if (events.thorns.toEnemy > 0) {
        console.log(`  ${C.dim}thorns → ${state.enemy.name}: ${events.thorns.toEnemy}${C.reset}`);
    }
    if (events.thorns.toPlayer > 0) {
        console.log(`  ${C.dim}thorns → ${state.player.name}: ${events.thorns.toPlayer}${C.reset}`);
    }
    if (events.damage.toEnemy === 0 && events.damage.toPlayer === 0) {
        console.log(`  ${C.dim}— no damage dealt —${C.reset}`);
    }
    console.log(`  ${C.dim}roll log:${C.reset} ${events.logEntry.playerRollDetails}`);
    console.log(`  ${C.dim}roll log:${C.reset} ${events.logEntry.enemyRollDetails}`);
}

// ─── Main Turn Loop ───────────────────────────────────────────────────────────

async function runCombatTurn(state: CombatState): Promise<CombatState> {
    printStatus(state);
    printActiveEffectsPanel(state);

    const { reactionType, action } = await promptPlayerChoice();

    if (action === 'skill') {
        console.log(`\n${C.dim}Skill selection coming in Phase 3 — defending instead.${C.reset}`);
        return runCombatTurnWithChoice(state, reactionType, 'defend');
    }
    if (action === 'item') {
        console.log(`\n${C.dim}Item usage coming in Phase 4 — defending instead.${C.reset}`);
        return runCombatTurnWithChoice(state, reactionType, 'defend');
    }
    return runCombatTurnWithChoice(state, reactionType, action);
}

async function runCombatTurnWithChoice(
    state: CombatState,
    reactionType: Stance,
    action: Action,
): Promise<CombatState> {
    const enemyAction = determineEnemyAction(state.enemy.logic);
    const playerAdvantage = determineAdvantage(reactionType, enemyAction.type);
    const enemyAdvantage = determineAdvantage(enemyAction.type, reactionType);

    printRoundActions(action as 'attack' | 'defend', reactionType, enemyAction.action, enemyAction.type);
    printTypeMatchup(reactionType, enemyAction.type, playerAdvantage, enemyAdvantage);
    await delay(800);

    const stateWithChoices: CombatState = {
        ...state,
        playerChoice: { type: reactionType, action },
        enemyChoice: enemyAction,
    };

    const { state: nextState, events } = resolveCombatRoundWithEvents(stateWithChoices);
    if (!events) return nextState;

    printRoundStart(events, state);

    printBuffsCleared('player', state.player.name, events.cleared.player, reactionType);
    printBuffsCleared('enemy', state.enemy.name, events.cleared.enemy, enemyAction.type);

    if (events.tier1.player || events.tier1.enemy) {
        printStanceSection(events.tier1.player, state.enemy.name, events.tier1.enemy);
        await delay(500);
    }

    printDamageSummary(events, nextState);

    printProcs(events, nextState.player.name, nextState.enemy.name);

    if (events.bothDefend) {
        await delay(800);
        printBothDefending(state.friendshipCounter, nextState.friendshipCounter);
    }

    const playerExpired = events.roundStart.player.expired;
    const enemyExpired = events.roundStart.enemy.expired;
    if (playerExpired.length > 0 || enemyExpired.length > 0) {
        await delay(400);
        printEffectExpiry('player', state.player.name, playerExpired);
        printEffectExpiry('enemy', state.enemy.name, enemyExpired);
    }

    console.log(HR_MAJOR);
    await delay(800);
    return nextState;
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
