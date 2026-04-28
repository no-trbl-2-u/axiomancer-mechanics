#!/usr/bin/env node
/**
 * Game CLI — Phase 8 entry point.
 *
 * A minimal, menu-driven main loop wired around the Zustand store and
 * the new `gameReducer`. The CLI does NOT replace the dedicated
 * `combat.cli.ts` and `character.cli.ts` flows; it sits above them as a
 * coordinator (start a new game, inspect status, move between nodes,
 * trigger an encounter, save / load, exit).
 */

import inquirer from 'inquirer';
import { createGameStore } from '../Game/store';
import { nullAdapter } from '../Game/persistence/null.adapter';
import { gameReducer } from '../Game/game.reducer';
import { generateEncounter } from '../Enemy';
import { initializeCombat, resolveCombatRound } from '../Combat/combat.reducer';
import { isCombatOngoing, determineCombatEnd } from '../Combat/index';
import { Stance, Action, CombatState } from '../Combat/types';

function statusBlock(state: ReturnType<ReturnType<typeof createGameStore>['getState']>): string {
    const p = state.player;
    return [
        `${p.name} — Lv ${p.level}  HP ${p.health}/${p.maxHealth}  MP ${p.mana}/${p.maxMana}`,
        `Map: ${state.world.currentMap.name}`,
        `Active effects: ${p.currentActiveEffects.length}`,
    ].join('\n');
}

async function chooseAction(): Promise<{ stance: Stance; action: Action }> {
    return inquirer.prompt<{ stance: Stance; action: Action }>([
        {
            type: 'rawlist', name: 'stance', message: 'Stance', choices: [
                { name: 'heart', value: 'heart' },
                { name: 'body', value: 'body' },
                { name: 'mind', value: 'mind' },
            ],
        },
        {
            type: 'rawlist', name: 'action', message: 'Action', choices: [
                { name: 'attack', value: 'attack' },
                { name: 'defend', value: 'defend' },
            ],
        },
    ]);
}

async function runEncounter(store: ReturnType<typeof createGameStore>): Promise<void> {
    const state = store.getState();
    const enc = generateEncounter(state.world.currentMap.name, state.player.level);
    if (!enc) {
        console.log('No suitable encounter on this map.');
        return;
    }
    const enemy = enc.enemies[0];
    console.log(`\nA wild ${enemy.name} (Lv ${enemy.level}) appears!`);

    let combat: CombatState = initializeCombat(state.player, enemy);
    while (isCombatOngoing(combat)) {
        console.log(`\nRound ${combat.round}  HP ${combat.player.health}/${combat.player.maxHealth}  vs  ${enemy.name} ${combat.enemy.health}/${combat.enemy.maxHealth}`);
        const { stance, action } = await chooseAction();
        const enemyChoice = { type: ['heart', 'body', 'mind'][Math.floor(Math.random() * 3)] as Stance, action: (Math.random() < 0.5 ? 'attack' : 'defend') as Action };
        combat = {
            ...combat,
            playerChoice: { type: stance, action },
            enemyChoice,
        };
        combat = resolveCombatRound(combat);
        const last = combat.logEntry[combat.logEntry.length - 1];
        console.log(`  ${last.result}`);
    }

    const outcome = determineCombatEnd(combat);
    console.log(`\nCombat ended: ${outcome}.`);

    // Promote player back to root state via the gameReducer pipeline.
    store.setState(s => gameReducer({ ...s, combatState: combat }, { type: 'END_COMBAT' }));
}

async function mainMenu(): Promise<void> {
    const store = createGameStore(nullAdapter);

    while (true) {
        const state = store.getState();
        console.log('\n— Axiomancer —');
        console.log(statusBlock(state));

        const { choice } = await inquirer.prompt<{ choice: string }>([{
            type: 'rawlist', name: 'choice', message: 'What now?', choices: [
                { name: 'Move to next node (tick effects)', value: 'move' },
                { name: 'Trigger encounter', value: 'encounter' },
                { name: 'Save', value: 'save' },
                { name: 'Quit', value: 'quit' },
            ],
        }]);

        if (choice === 'quit') return;
        if (choice === 'save') { store.getState().save(); console.log('Saved.'); continue; }

        if (choice === 'move') {
            const target = state.world.currentMap.availableNodes[0];
            if (!target) { console.log('No nodes available.'); continue; }
            store.setState(s => gameReducer(s, { type: 'MOVE_TO_NODE', nodeId: target }));
            console.log(`Moved to node ${target}.`);
            continue;
        }

        if (choice === 'encounter') {
            await runEncounter(store);
        }
    }
}

mainMenu();
