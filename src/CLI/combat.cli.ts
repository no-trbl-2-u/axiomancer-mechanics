#!/usr/bin/env node

/**
 * Combat CLI — UI-only driver for the combat module.
 *
 * Per Spec 02 the CLI never re-implements combat math. It:
 *   1. Prints the round status and prompts for the player's stance + action.
 *   2. Calls `resolveCombatRound(state, playerAction, enemyAction, lookupSkill)`
 *      which returns `{ state, combatEvents }`.
 *   3. Hands the `combatEvents` stream to `renderRoundEvents` for display.
 *   4. Persists the new state via the game store.
 *
 * Every print* helper and the renderer live in `combat.display.ts`. If new
 * inline math creeps in here, it is by definition CLI/UI logic only — any
 * mechanics-relevant change must go through the resolver.
 */

import inquirer from 'inquirer';

import { Disatree_01 } from '../Enemy/enemy.library';
import { Player } from '../Character/characters.mock';
import {
    determineEnemyAction,
    isCombatOngoing,
    resolveCombatRound,
} from '../Combat';
import { Stance, CombatAction, CombatState } from '../Combat/types';
import { Skill } from '../Skills/types';
import { createGameStore } from '../Game/store';
import { nullAdapter } from '../Game/persistence/null.adapter';
import {
    typeColor,
    printCombatIntro,
    printCombatRules,
    printStatus,
    printCombatEnd,
    renderRoundEvents,
} from './combat.display';

const skipDelays = process.env.COMBAT_NO_DELAY === '1';

async function delay(ms: number): Promise<void> {
    if (skipDelays) return;
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Empty skill library for now — Spec 04b populates it. The CLI threads
// `lookupSkill` through `resolveCombatRound` so the engine path is exercised
// even when the library is empty.
const SKILL_LIBRARY: Record<string, Skill> = {};
const lookupSkill = (id: string): Skill | undefined => SKILL_LIBRARY[id];

// ─── Player Input ─────────────────────────────────────────────────────────────

async function promptPlayerChoice(state: CombatState): Promise<CombatAction> {
    const equipped = state.player.equippedSkills;
    const hasSkills = equipped.length > 0;

    const actionChoices: Array<{ name: string; value: 'attack' | 'defend' | 'skill' }> = [
        { name: 'attack', value: 'attack' },
        { name: 'defend', value: 'defend' },
    ];
    if (hasSkills) actionChoices.push({ name: 'skill', value: 'skill' });

    const { stance, action } = await inquirer.prompt([
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
            choices: actionChoices,
        },
    ]) as { stance: Stance; action: 'attack' | 'defend' | 'skill' };

    if (action !== 'skill') return { stance, action };

    const skillChoices = equipped.map(id => {
        const skill = lookupSkill(id);
        return { name: skill ? `${skill.name} (${id})` : id, value: id };
    });
    const { skillId } = await inquirer.prompt([
        {
            type: 'rawlist',
            name: 'skillId',
            message: 'Pick a skill...',
            choices: skillChoices,
        },
    ]) as { skillId: string };

    return { stance, action, skillId };
}

// ─── Main Turn Loop ───────────────────────────────────────────────────────────

async function runCombatTurn(state: CombatState): Promise<CombatState> {
    printStatus(state);

    const playerAction = await promptPlayerChoice(state);
    const enemyAction  = determineEnemyAction(state.enemy);

    const { state: next, combatEvents } = resolveCombatRound(
        state,
        playerAction,
        enemyAction,
        lookupSkill,
    );

    await renderRoundEvents({
        events:     combatEvents,
        playerName: next.player.name,
        enemyName:  next.enemy.name,
        delay,
    });

    return next;
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
