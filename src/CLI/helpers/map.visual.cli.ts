/**
 * Map Visual Helpers
 *
 * All console output for the map CLI lives here — zero game logic.
 * These helpers are intentionally separate from the mechanics package so the
 * UI layer can consume Map / MapState directly without any display coupling.
 */

import { Map, MapState, MapNode, MapEvents } from 'World/types';
import { C } from '../combat.display';

// ─── Node Symbols ─────────────────────────────────────────────────────────────

/** Single-char ASCII symbol for each event type (safe across all terminals). */
const NODE_SYMBOLS: Record<MapEvents, string> = {
    'start':          'S',
    'exit':           'X',
    'encounter':      'E',
    'boss-encounter': 'B',
    'event':          '!',
    'treasure':       'T',
    'gather':         'G',
    'quest':          'Q',
    'shop':           '$',
    'npc':            'N',
    'other':          '?',
};

/** Full display label for the legend and event announcements. */
export const NODE_LABELS: Record<MapEvents, string> = {
    'start':          'Start',
    'exit':           'Exit',
    'encounter':      'Encounter',
    'boss-encounter': 'Boss Encounter',
    'event':          'Event',
    'treasure':       'Treasure',
    'gather':         'Gather',
    'quest':          'Quest',
    'shop':           'Shop',
    'npc':            'NPC',
    'other':          'Other',
};

// ─── Node State Helpers ───────────────────────────────────────────────────────

type NodeVisualState = 'current' | 'available' | 'completed' | 'locked';

function getNodeVisualState(nodeId: string, state: MapState): NodeVisualState {
    if (state.currentNodeId === nodeId)          return 'current';
    if (state.completedNodes.includes(nodeId))   return 'completed';
    if (state.availableNodes.includes(nodeId))   return 'available';
    return 'locked';
}

// ─── Grid Renderer ────────────────────────────────────────────────────────────

/**
 * Renders the map as a column-per-depth grid.
 *
 * Layout rules:
 *   - Nodes are grouped by their x-coordinate (depth/column).
 *   - Within each column, nodes are sorted by y descending (higher = top).
 *   - A `──→` connector appears between two columns when the source node has
 *     at least one connection leading into the next column.
 *   - Locked nodes show `?` — their type is hidden until they become reachable.
 *
 * Cell format (10 visible chars):  `►[nf-1 :S]`
 *   prefix (1) + `[` + id padded to 5 + `:` + symbol (1) + `]`
 */
export function printMapGrid(map: Map, state: MapState): void {
    // Group nodes by depth (x-coordinate)
    const depthBuckets = new Map<number, MapNode[]>();
    for (const node of map.nodes) {
        const depth = node.location[0];
        if (!depthBuckets.has(depth)) depthBuckets.set(depth, []);
        depthBuckets.get(depth)!.push(node);
    }

    const sortedDepths = Array.from(depthBuckets.keys()).sort((a, b) => a - b);

    // Sort within each column: higher y → top row
    for (const depth of sortedDepths) {
        depthBuckets.get(depth)!.sort((a, b) => b.location[1] - a.location[1]);
    }

    const maxRows = Math.max(...sortedDepths.map(d => depthBuckets.get(d)!.length));

    console.log('');
    for (let row = 0; row < maxRows; row++) {
        let line = '  ';

        for (let ci = 0; ci < sortedDepths.length; ci++) {
            const nodes      = depthBuckets.get(sortedDepths[ci])!;
            const node       = nodes[row];
            const nextNodes  = ci < sortedDepths.length - 1
                ? depthBuckets.get(sortedDepths[ci + 1])!
                : [];

            // Node cell — 10 visible chars
            line += node ? renderCell(node, state) : ' '.repeat(10);

            // Connector — 4 visible chars
            if (ci < sortedDepths.length - 1) {
                const hasForwardEdge = node
                    ? node.connectedNodes.some(id => nextNodes.some(n => n.id === id))
                    : false;
                line += hasForwardEdge
                    ? `${C.dim}──→ ${C.reset}`
                    : '    ';
            }
        }

        console.log(line);
    }
    console.log('');
}

function renderCell(node: MapNode, state: MapState): string {
    const vstatus = getNodeVisualState(node.id, state);
    const isLocked = vstatus === 'locked';
    const type   = state.nodeTypes[node.id] ?? 'other';
    const sym    = isLocked ? '?' : (NODE_SYMBOLS[type] ?? '?');
    const id     = node.id.padEnd(5).slice(0, 5);
    const prefix = vstatus === 'current' ? '►' : ' ';

    let color: string;
    switch (vstatus) {
        case 'current':   color = C.bold + C.brightCyan;   break;
        case 'completed': color = C.dim  + C.green;        break;
        case 'available': color = C.brightYellow;          break;
        default:          color = C.dim;
    }

    return `${prefix}${color}[${id}:${sym}]${C.reset}`;
}

// ─── Map Header ───────────────────────────────────────────────────────────────

/** Prints the map name banner and description. */
export function printMapHeader(map: Map): void {
    const title = map.name.toUpperCase().replace(/-/g, ' ');
    console.log(`\n${C.bold}${C.brightCyan}╔══ ${title} ${'═'.repeat(Math.max(0, 46 - title.length))}╗${C.reset}`);
    console.log(`${C.dim}  ${map.description}${C.reset}`);
    console.log(`${C.bold}${C.brightCyan}╚${'═'.repeat(50)}╝${C.reset}\n`);
}

// ─── Legend ───────────────────────────────────────────────────────────────────

/** Prints the node symbol and state legend. */
export function printMapLegend(): void {
    const types: MapEvents[] = ['start', 'exit', 'boss-encounter', 'encounter', 'treasure', 'gather', 'event', 'shop', 'npc'];
    const symLine = types
        .map(t => `${NODE_SYMBOLS[t]}=${NODE_LABELS[t]}`)
        .join('  ');

    console.log(`  ${C.dim}Symbols:  ${symLine}  ?=Unknown${C.reset}`);
    console.log(
        `  ${C.dim}States:   ` +
        `${C.bold}${C.brightCyan}►[     ] Current${C.reset}  ` +
        `${C.dim}${C.brightYellow}[     ] Available${C.reset}  ` +
        `${C.dim}${C.green}[     ] Completed${C.reset}  ` +
        `${C.dim}[     ] Locked${C.reset}`,
    );
    console.log('');
}

// ─── Node Event Display ───────────────────────────────────────────────────────

/**
 * Announces the event triggered when the player arrives at a node.
 *
 * Each case logs flavour text and a TODO comment explaining what the full
 * game integration requires. The mechanics package does not run the event
 * here — that is the responsibility of the game loop / UI layer.
 */
export function printNodeEvent(nodeId: string, type: MapEvents): void {
    const label = NODE_LABELS[type];
    console.log(`\n${C.bold}${C.brightYellow}── ${nodeId.toUpperCase()}  [${label.toUpperCase()}] ${'─'.repeat(Math.max(0, 42 - nodeId.length - label.length))}${C.reset}`);

    switch (type) {
        case 'start':
            console.log(`  ${C.dim}You set out from the start of the path.${C.reset}`);
            break;

        case 'exit':
            console.log(`  ${C.brightGreen}You emerge from the other side. The path is clear.${C.reset}`);
            break;

        case 'encounter':
            console.log(`  A creature steps out of the shadows. Combat begins!`);
            console.log(`  ${C.dim}// TODO: look up a random enemy from map.enemies filtered by enemyTier,`);
            console.log(`  //         call store.startCombat(enemy), then run the combat CLI loop.${C.reset}`);
            break;

        case 'boss-encounter':
            console.log(`  ${C.brightRed}A powerful presence fills the air. The boss awaits.${C.reset}`);
            console.log(`  ${C.dim}// TODO: look up the scripted boss enemy from map.enemies (enemyTier='boss'),`);
            console.log(`  //         call store.startCombat(boss), then run the combat CLI loop.${C.reset}`);
            break;

        case 'treasure':
            console.log(`  Something glints between the roots.`);
            console.log(`  ${C.dim}// TODO: roll on map.availableEvents filtered to type 'treasure',`);
            console.log(`  //         grant the reward (item / currency) via store.addItemToInventory().${C.reset}`);
            break;

        case 'gather':
            console.log(`  The area is rich with harvestable materials.`);
            console.log(`  ${C.dim}// TODO: present the player with gather choices from map.availableEvents,`);
            console.log(`  //         add the chosen Material to inventory via store.addItemToInventory().${C.reset}`);
            break;

        case 'event':
            console.log(`  Something unusual catches your attention.`);
            console.log(`  ${C.dim}// TODO: look up the triggered MapEvent from map.availableEvents,`);
            console.log(`  //         run the narrative / choice flow, then apply rewards.${C.reset}`);
            break;

        case 'shop':
            console.log(`  A merchant has set up camp nearby.`);
            console.log(`  ${C.dim}// TODO: open the shop UI, pulling inventory from map.availableEvents`);
            console.log(`  //         filtered to type 'shop'. Allow buy/sell via store actions.${C.reset}`);
            break;

        case 'npc':
            console.log(`  A figure steps forward to speak with you.`);
            console.log(`  ${C.dim}// TODO: look up the NPC from map.npcs by the node's eventId,`);
            console.log(`  //         run the dialogue flow, then apply any quest / reward outcomes.${C.reset}`);
            break;

        case 'quest':
            console.log(`  A quest objective is within reach.`);
            console.log(`  ${C.dim}// TODO: check player's active quests against map.availableEvents,`);
            console.log(`  //         advance quest state via world reducer completeUniqueEvent().${C.reset}`);
            break;

        default:
            console.log(`  Nothing of note here... for now.`);
            console.log(`  ${C.dim}// TODO: define event handling for type '${type}'.${C.reset}`);
    }

    console.log('');
}

// ─── Run Summary ──────────────────────────────────────────────────────────────

/** Prints a summary of nodes visited at the end of a map run. */
export function printMapRunSummary(map: Map, state: MapState): void {
    const visited  = state.completedNodes.length + 1; // +1 for current (exit)
    const total    = map.nodes.length;
    const typeList = state.completedNodes
        .concat(state.currentNodeId)
        .map(id => {
            const t = state.nodeTypes[id] ?? 'other';
            return `${id}(${NODE_SYMBOLS[t]})`;
        })
        .join(' → ');

    console.log(`\n${C.bold}Run complete — ${visited} / ${total} nodes visited${C.reset}`);
    console.log(`  ${C.dim}${typeList}${C.reset}\n`);
}
