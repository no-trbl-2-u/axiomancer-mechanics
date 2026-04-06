/**
 * Map CLI Simulator
 *
 * Entry point for the map traversal simulation.
 *
 * Responsibilities (CLI only — none of this belongs in the mechanics package):
 *   1. Let the player choose which map to simulate.
 *   2. Initialise a fresh MapState (random event assignment).
 *   3. Loop: show the map grid → prompt for next node → fire the node event.
 *   4. End when the player reaches the exit.
 *
 * The core logic (initializeMapState, advanceToNode) lives in World/index.ts
 * so that it can be consumed by a UI layer without any CLI coupling.
 */

import inquirer from 'inquirer';
import { MapName } from 'World/map.library';
import { Map, MapState } from 'World/types';
import { getMapByName, initializeMapState, advanceToNode } from 'World/index';
import {
    printMapHeader,
    printMapGrid,
    printMapLegend,
    printNodeEvent,
    printMapRunSummary,
    NODE_LABELS,
} from './helpers/map.visual.cli';
import { C } from './combat.display';

// ─── Available maps ───────────────────────────────────────────────────────────

/** Maps the player can select in the simulator. Extend as new maps are added. */
const AVAILABLE_MAPS: { name: string; value: MapName }[] = [
    { name: 'Northern Forest  (Coastal Continent)',  value: 'northern-forest' },
    { name: 'Fishing Village  (Coastal Continent)',  value: 'fishing-village' },
];

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    console.clear();
    console.log(`\n${C.bold}${C.brightCyan}  AXIOMANCER — Map Simulator${C.reset}`);
    console.log(`  ${C.dim}Navigate node-by-node. Every run is unique.${C.reset}\n`);

    // ── 1. Choose map ─────────────────────────────────────────────────────────
    const { mapName } = await inquirer.prompt<{ mapName: MapName }>([{
        type:    'rawlist',
        name:    'mapName',
        message: 'Select a map to explore:',
        choices: AVAILABLE_MAPS,
    }]);

    const map: Map           = getMapByName(mapName);
    let   mapState: MapState = initializeMapState(map);

    // ── 2. Game loop ──────────────────────────────────────────────────────────
    while (true) {
        printMapHeader(map);
        printMapGrid(map, mapState);
        printMapLegend();

        const currentType = mapState.nodeTypes[mapState.currentNodeId];

        // Fire the event for the current node (skipped for 'start' to avoid
        // triggering an event before the player moves for the first time)
        if (currentType !== 'start') {
            printNodeEvent(mapState.currentNodeId, currentType);
        }

        // ── Exit reached ──────────────────────────────────────────────────────
        if (mapState.currentNodeId === map.exitNodeId) {
            printMapRunSummary(map, mapState);
            console.log(`${C.bold}${C.brightGreen}  You have completed ${map.name.replace(/-/g, ' ').toUpperCase()}.${C.reset}\n`);
            break;
        }

        // ── Dead end (should not happen in a well-formed map) ─────────────────
        if (mapState.availableNodes.length === 0) {
            console.log(`\n${C.brightRed}  No paths forward. The way is blocked.${C.reset}\n`);
            break;
        }

        // ── 3. Prompt: choose next node ───────────────────────────────────────
        const choices = mapState.availableNodes.map(id => {
            const type      = mapState.nodeTypes[id] ?? 'other';
            const typeLabel = NODE_LABELS[type];
            const node      = map.nodes.find(n => n.id === id);
            const depth     = node ? `depth ${node.location[0]}` : '';
            return {
                name:  `${id.padEnd(6)}  ${typeLabel.padEnd(16)}  ${C.dim}(${depth})${C.reset}`,
                value: id,
                short: id,
            };
        });

        const { nextNodeId } = await inquirer.prompt<{ nextNodeId: string }>([{
            type:    'rawlist',
            name:    'nextNodeId',
            message: 'Choose your path:',
            choices,
        }]);

        // ── 4. Advance state ──────────────────────────────────────────────────
        mapState = advanceToNode(map, mapState, nextNodeId);
    }

    // ── 5. Play again? ────────────────────────────────────────────────────────
    const { again } = await inquirer.prompt<{ again: boolean }>([{
        type:    'rawlist',
        name:    'again',
        message: 'Simulate another map?',
        choices: [
            { name: 'No',  value: false },
            { name: 'Yes', value: true  },
        ],
    }]);

    if (again) {
        await main();
    } else {
        console.log(`\n${C.dim}  Goodbye, adventurer.${C.reset}\n`);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
