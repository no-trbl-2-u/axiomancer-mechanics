#!/usr/bin/env node

/**
 * Game CLI — demonstrational full-loop driver (Spec 09 Q7).
 *
 * Wires every public verb on the game store into a tabbed inquirer prompt
 * so the engine can be exercised by hand. Five tabs:
 *
 *   • Map        — list adjacent nodes, dispatch MOVE_TO_NODE, then
 *                  PROCESS_NODE to trigger the node's authored event.
 *   • Combat     — re-uses combat.cli's resolver-driven loop on the active
 *                  encounter. Skipped when no combat is in progress.
 *   • Journal    — read-only: active / completed quests + alignment stub.
 *   • Skills     — read-only: known + equipped skills.
 *   • Inventory  — read-only listing of carried items.
 *
 * Logic stays in the store / reducer. This file only formats and dispatches.
 *
 * Run with: `npx ts-node src/CLI/game.cli.ts` (or via the package's
 * `npm run game` script when it lands).
 */

import inquirer from 'inquirer';

import { Player } from '../Character/characters.mock';
import { Disatree_01 } from '../Enemy/enemy.library';
import { createGameStore } from '../Game/store';
import { createEventEmitter } from '../Game/events';
import { nullAdapter } from '../Game/persistence/null.adapter';
import { getMapDefinition } from '../World/map.registry';
import { processNode } from '../World/process-node';
import { isCombatOngoing, determineEnemyAction, resolveCombatRound } from '../Combat';
import { Stance, CombatState } from '../Combat/types';
import { getSkillById, skillLibrary } from '../Skills/skill.library';
import { consumableLibrary } from '../Items/consumable.library';
import { Item, isConsumable } from '../Items/types';
import { CombatEndReport } from '../Game/store';

type Tab = 'map' | 'combat' | 'journal' | 'skills' | 'inventory' | 'quit';

const skillLookup = (id: string) => getSkillById(id);

function bootstrapStore() {
    const events = createEventEmitter();
    events.onAny(ev => console.log(`  [event] ${ev.type}`));

    const demoConsumables: Item[] = consumableLibrary.map(c => ({ ...c })) as Item[];
    const seededPlayer = {
        ...Player,
        knownSkills:    skillLibrary.map(s => s.id),
        equippedSkills: skillLibrary.slice(0, 4).map(s => s.id),
        inventory:      [...Player.inventory, ...demoConsumables],
    };

    return createGameStore(nullAdapter, { player: seededPlayer }, events);
}

async function pickTab(canFight: boolean): Promise<Tab> {
    const tabs: Array<{ name: string; value: Tab }> = [
        { name: 'Map        — travel + resolve node events', value: 'map' },
        ...(canFight ? [{ name: 'Combat     — resume the active fight', value: 'combat' as Tab }] : []),
        { name: 'Journal    — quests + alignment', value: 'journal' },
        { name: 'Skills     — known + equipped', value: 'skills' },
        { name: 'Inventory  — items in pack', value: 'inventory' },
        { name: 'Quit',                                 value: 'quit' },
    ];
    const { tab } = await inquirer.prompt<{ tab: Tab }>([
        { type: 'rawlist', name: 'tab', message: 'Where to?', choices: tabs },
    ]);
    return tab;
}

async function mapTab(store: ReturnType<typeof bootstrapStore>): Promise<void> {
    const state   = store.getState();
    const current = state.world.currentMap.currentNode;
    const def     = getMapDefinition(state.world.currentMap.continent, state.world.currentMap.name);
    const node    = def.nodes.find(n => n.id === current);

    console.log(`\n— Map: ${def.name} —`);
    console.log(`You are at ${current}.`);

    const available = state.world.currentMap.availableNodes;
    const reachable = (node?.connectedNodes ?? []).filter(id => available.includes(id));
    if (reachable.length === 0) {
        console.log('No adjacent nodes are open right now.');
        return;
    }

    const { target } = await inquirer.prompt<{ target: string }>([
        {
            type: 'rawlist',
            name: 'target',
            message: 'Move to which node?',
            choices: [
                ...reachable.map(id => ({ name: id, value: id })),
                { name: 'Stay put', value: '' },
            ],
        },
    ]);
    if (!target) return;

    store.getState().moveToNode(target);
    console.log(`Moved to ${target}.`);

    // PROCESS_NODE — let the authored event for the new node resolve.
    const before = store.getState();
    const result = processNode(before);
    store.setState({
        player: result.gameState.player,
        world:  result.gameState.world,
        quests: result.gameState.quests,
        flags:  result.gameState.flags,
    });
    console.log(result.message);

    if (result.event.kind === 'encounter') {
        // The CLI consumer is responsible for pushing the encounter into
        // combat. Driving combat here lets the player feel the loop close.
        store.getState().startCombat(result.event.encounter);
        await combatTab(store);
    }
}

async function combatTab(store: ReturnType<typeof bootstrapStore>): Promise<void> {
    let combat = store.getState().combat;
    if (!combat) {
        console.log('No combat in progress — pick the Map tab to trigger an encounter.');
        return;
    }

    while (combat && isCombatOngoing(combat)) {
        const { stance, action } = await inquirer.prompt<{ stance: Stance; action: 'attack' | 'defend' }>([
            { type: 'rawlist', name: 'stance', message: 'Stance?',
              choices: ['heart', 'body', 'mind'] },
            { type: 'rawlist', name: 'action', message: 'Action?',
              choices: ['attack', 'defend'] },
        ]);

        const enemyAction = determineEnemyAction(combat.enemy, combat);
        const { state: next } = resolveCombatRound(
            combat,
            { stance, action },
            enemyAction,
            skillLookup,
        );
        store.getState().updateCombat(next);
        combat = store.getState().combat;
        console.log(
            `  player HP ${combat?.player.health}/${combat?.player.maxHealth}` +
            `  ·  enemy HP ${combat?.enemy.health}/${combat?.enemy.maxHealth}`,
        );
    }

    const report: CombatEndReport = store.getState().endCombat();
    console.log(`\nCombat ended: ${report.outcome}  ·  XP +${report.xpGained}  ·  loot ×${report.loot.length}`);
    if (report.outcome === 'victory') store.getState().levelUp();
}

function journalTab(store: ReturnType<typeof bootstrapStore>): void {
    const { quests, flags } = store.getState();
    console.log('\n— Journal —');
    console.log(`Active quests   : ${quests.active.map(q => q.name).join(', ') || '(none)'}`);
    console.log(`Completed quests: ${quests.completed.join(', ') || '(none)'}`);
    console.log(`World flags     : ${flags.join(', ') || '(none)'}`);
    // Alignment / philosophy meter is the Phase 10 hook — print a placeholder
    // so the tab is reachable today.
    console.log('Alignment       : neutral (Spec 10 will compute this)');
}

function skillsTab(store: ReturnType<typeof bootstrapStore>): void {
    const { player } = store.getState();
    console.log('\n— Skills —');
    console.log('Known skills:');
    for (const id of player.knownSkills) {
        const s = getSkillById(id);
        console.log(`  • ${s?.name ?? id}${player.equippedSkills.includes(id) ? '  (equipped)' : ''}`);
    }
}

function inventoryTab(store: ReturnType<typeof bootstrapStore>): void {
    const { inventory } = store.getState().player;
    console.log('\n— Inventory —');
    if (inventory.length === 0) {
        console.log('(empty)');
        return;
    }
    for (const item of inventory) {
        const qty = isConsumable(item) ? `  ×${item.quantity}` : '';
        console.log(`  • ${item.name}${qty}  — ${item.description}`);
    }
}

async function main(): Promise<void> {
    const store = bootstrapStore();
    console.log('Axiomancer — game loop demo.\n');

    // If we wanted to demo a fight immediately we'd pre-load combat — leave
    // that off so the loop starts on the Map tab and the player walks into
    // the first encounter naturally. Boot a tutorial fight on demand:
    const { tutorial } = await inquirer.prompt<{ tutorial: boolean }>([
        { type: 'confirm', name: 'tutorial', message: 'Pre-load a tutorial fight?', default: false },
    ]);
    if (tutorial) {
        store.getState().startCombat({ enemies: [Disatree_01] });
    }

    while (true) {
        const tab = await pickTab(store.getState().combat !== null);
        switch (tab) {
            case 'map':       await mapTab(store);       break;
            case 'combat':    await combatTab(store);    break;
            case 'journal':   journalTab(store);         break;
            case 'skills':    skillsTab(store);          break;
            case 'inventory': inventoryTab(store);       break;
            case 'quit':      console.log('Goodbye.');   return;
        }
    }
}

main();
