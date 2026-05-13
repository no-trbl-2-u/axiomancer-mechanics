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
import { generateEncounter } from '../World/encounter';
import { Encounter } from '../World/types';
import { Enemy } from '../Enemy/types';
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
 * Picks the opponent for the CLI session.
 *
 * Resolution order:
 *   1. `COMBAT_ENEMY=<slug>` (or `--enemy=<slug>`) — explicit pin; used by
 *      `auto:combat` and CI runners to lock onto a specific opponent.
 *   2. `COMBAT_ENCOUNTER=1` — Spec 07's encounter generator picks an enemy
 *      from the player's authored starting node (`fv-1`).
 *   3. Default — Disatree, preserving the original demo flow.
 *
 * Returning a tuple of `{ enemy, encounter? }` lets the caller forward an
 * `Encounter` to `store.startCombat` so XP / loot grants fire on victory.
 */
interface ResolvedOpponent {
    enemy: Enemy;
    encounter?: Encounter;
    label: string;
}

function resolveOpponentFromEnv(playerLevel: number): ResolvedOpponent {
    const cliFlag = process.argv.find(arg => arg.startsWith('--enemy='));
    const cliSlug = cliFlag?.split('=')[1];
    const explicitSlug = (cliSlug ?? process.env.COMBAT_ENEMY)?.toLowerCase();

    if (explicitSlug) {
        if (explicitSlug in ENEMY_REGISTRY) {
            const enemy = ENEMY_REGISTRY[explicitSlug as EnemySlug];
            return { enemy, encounter: { enemies: [enemy] }, label: explicitSlug };
        }
        console.warn(
            `[combat] Unknown enemy slug "${explicitSlug}". Known: ${Object.keys(ENEMY_REGISTRY).join(', ')}. Falling back to Disatree.`,
        );
        return { enemy: Disatree_01, encounter: { enemies: [Disatree_01] }, label: 'disatree' };
    }

    if (process.env.COMBAT_ENCOUNTER === '1') {
        const startingNode = { id: 'fv-1', location: [0, 0] as [number, number], connectedNodes: [] };
        const encounter = generateEncounter(startingNode, playerLevel);
        return { enemy: encounter.enemies[0], encounter, label: 'encounter' };
    }

    return { enemy: Disatree_01, encounter: { enemies: [Disatree_01] }, label: 'disatree' };
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
    const enemyAction  = determineEnemyAction(state.enemy, state);

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

    const { enemy, encounter } = resolveOpponentFromEnv(playerWithSkills.level);

    printCombatIntro(playerWithSkills.name, playerWithSkills.level, enemy.name, enemy.level);
    printCombatRules();

    // Spec 07 — startCombat accepts either a bare Enemy or an Encounter. The
    // CLI always passes the encounter when one is available so XP / loot
    // grants fire on victory.
    store.getState().startCombat(encounter ?? enemy);

    while (true) {
        const combat = store.getState().combat;
        if (!combat || !isCombatOngoing(combat)) break;

        const next = await runCombatTurn(combat);
        store.getState().updateCombat(next);
    }

    const finalCombat = store.getState().combat!;
    const report = store.getState().endCombat();
    printCombatEnd(finalCombat);
    if (report.outcome === 'victory') {
        console.log(`\nYou gained ${report.xpGained} XP.`);
        if (report.loot.length > 0) {
            console.log('Loot:');
            for (const item of report.loot) console.log(`  • ${item.name}`);
        }
    }
}

main();
