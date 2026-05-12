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

import { ENEMY_REGISTRY, Disatree_01, EnemySlug } from '../Enemy/enemy.library';
import { Player } from '../Character/characters.mock';
import {
    determineEnemyAction,
    isCombatOngoing,
    resolveCombatRound,
} from '../Combat';
import { Stance, CombatAction, CombatState } from '../Combat/types';
import { Skill } from '../Skills/types';
import { getSkillById, skillLibrary } from '../Skills/skill.library';
import { createGameStore } from '../Game/store';
import { nullAdapter } from '../Game/persistence/null.adapter';
import { isConsumable, Consumable, Item } from '../Items/types';
import { consumableLibrary } from '../Items/consumable.library';
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

// Spec 04b — full early-game skill library wired in. `getSkillById` is the
// canonical lookup; the CLI passes it straight through to `resolveCombatRound`
// so the resolver can route `action: 'skill'` through `executeSkill`.
const lookupSkill = (id: string): Skill | undefined => getSkillById(id);

/**
 * Picks the opponent for the CLI session. Resolved from `COMBAT_ENEMY`
 * (or the optional `--enemy=<slug>` flag) against `ENEMY_REGISTRY`. Defaults
 * to Disatree so the existing demo flow stays stable. Spec 04b Q5: the
 * `sandbag` slug surfaces the high-HP / low-stat dummy used for testing
 * long combats (skills, effects, etc.).
 */
function resolveEnemyFromEnv(): typeof Disatree_01 {
    const cliFlag = process.argv.find(arg => arg.startsWith('--enemy='));
    const cliSlug = cliFlag?.split('=')[1];
    const slug = (cliSlug ?? process.env.COMBAT_ENEMY ?? 'disatree').toLowerCase();
    if (slug in ENEMY_REGISTRY) {
        return ENEMY_REGISTRY[slug as EnemySlug];
    }
    console.warn(
        `[combat] Unknown enemy slug "${slug}". Known: ${Object.keys(ENEMY_REGISTRY).join(', ')}. Falling back to Disatree.`,
    );
    return Disatree_01;
}

// ─── Player Input ─────────────────────────────────────────────────────────────

async function promptPlayerChoice(state: CombatState): Promise<CombatAction> {
    const equipped = state.player.equippedSkills;
    const hasSkills = equipped.length > 0;
    const consumables = state.player.inventory.filter(isConsumable) as Consumable[];
    const hasItems = consumables.length > 0;

    const actionChoices: Array<{ name: string; value: 'attack' | 'defend' | 'skill' | 'item' }> = [
        { name: 'attack', value: 'attack' },
        { name: 'defend', value: 'defend' },
    ];
    if (hasSkills) actionChoices.push({ name: 'skill', value: 'skill' });
    if (hasItems)  actionChoices.push({ name: 'item',  value: 'item'  });

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
    ]) as { stance: Stance; action: 'attack' | 'defend' | 'skill' | 'item' };

    if (action === 'skill') {
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

    if (action === 'item') {
        const itemChoices = consumables.map(c => ({
            name: `${c.name}  (×${c.quantity})  ${c.description}`,
            value: c.id,
        }));
        const { itemId } = await inquirer.prompt([
            {
                type: 'rawlist',
                name: 'itemId',
                message: 'Use which item?',
                choices: itemChoices,
            },
        ]) as { itemId: string };
        return { stance, action, itemId };
    }

    return { stance, action };
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
    const enemy = resolveEnemyFromEnv();

    // Equip the first 4 skills from the library so the CLI demoer immediately
    // has a meaningful Skills sub-prompt. Spec 06 will turn this into a real
    // out-of-combat equipping flow.
    const demoSkillIds = skillLibrary.slice(0, 4).map(s => s.id);

    // Seed the demo player's inventory with the consumable library so the
    // `item` action is reachable from the CLI. Spec 05b populated the
    // library with 12 entries spanning heals, cleanses, and resource grants.
    const demoConsumables: Item[] = consumableLibrary.map(c => ({ ...c })) as Item[];
    const playerWithSkills = {
        ...Player,
        knownSkills:    skillLibrary.map(s => s.id),
        equippedSkills: demoSkillIds,
        inventory:      [...Player.inventory, ...demoConsumables],
    };
    const store = createGameStore(nullAdapter, { player: playerWithSkills });

    printCombatIntro(playerWithSkills.name, playerWithSkills.level, enemy.name, enemy.level);
    printCombatRules();

    store.getState().startCombat(enemy);

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
