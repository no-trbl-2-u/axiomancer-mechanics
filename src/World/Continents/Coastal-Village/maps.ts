/**
 * Coastal Continent map definitions (Spec 08 Q5A — static templates only).
 *
 * Each export is a frozen `MapDefinition`. Runtime per-save progress lives in
 * `MapState`, built via `createMapState(definition)` and stored under
 * `WorldState.currentMap`.
 *
 * The `fishing-village` chain demos the full Spec 08 exploration loop:
 *   fv-1 (start) → fv-2 (npc — quest giver) → fv-3 (shop) → fv-4 (encounter)
 *                → fv-5 (treasure) → fv-6 (boss-encounter).
 */

import { MapDefinition, MapEvent, NodeId, Quest } from '../../types';
import { NPC, DialogueTree } from '../../../NPCs/types';

/**
 * CoastalContinentMapNames are all the maps in the Coastal Continent
 * - 'fishing-village': Starting village. Quest giver + shop + boss chain.
 * - 'northern-forest': Small forest. Gather Wood.
 */
export type CoastalContinentMapNames =
  'fishing-village' |
  'northern-forest';

// ─── NPC content for fishing-village ──────────────────────────────────────────

const oldDockmasterTree: DialogueTree = {
    rootId: 'greet',
    nodes: {
        greet: {
            id: 'greet',
            text: "Old Marrow looks up from a tangle of nets. \"You've a sturdy back, child. Care to earn a coin?\"",
            choices: [
                {
                    text: "What needs doing?",
                    nextNodeId: 'offer',
                },
                {
                    text: "Leave him be.",
                    nextNodeId: undefined,
                },
            ],
        },
        offer: {
            id: 'offer',
            text: "\"A great crab — bigger than my hauling-table — has nested at the breakwater. Bring me proof you've slain it and the coin is yours.\"",
            choices: [
                {
                    text: "Consider it done. (Accept the quest.)",
                    nextNodeId: 'accepted',
                    effect: { startQuest: 'starting-quest' },
                },
                {
                    text: "Maybe later.",
                    nextNodeId: undefined,
                },
            ],
        },
        accepted: {
            id: 'accepted',
            text: "Old Marrow nods slowly. \"Mind the tide. The reef takes the careless.\"",
        },
        thanks: {
            id: 'thanks',
            text: "\"You did it, then. Take this — gods know I've no use for coin where I'm headed.\"",
            choices: [
                {
                    text: "Accept the reward.",
                    nextNodeId: undefined,
                    requires: { questCompleted: 'starting-quest' },
                    effect: { grantCurrency: 25 },
                },
            ],
        },
    },
};

const tideshopkeeperTree: DialogueTree = {
    rootId: 'greet',
    nodes: {
        greet: {
            id: 'greet',
            text: "\"Saltwater hardtack and twine. Coin only.\"",
            choices: [
                {
                    text: "Browse the stall.",
                    nextNodeId: 'browse',
                },
                {
                    text: "Walk on.",
                    nextNodeId: undefined,
                },
            ],
        },
        browse: {
            id: 'browse',
            text: "The shopkeeper gestures at three crates. (Shop implementation lands in a later spec.)",
        },
    },
};

const oldMarrow: NPC = {
    name: 'Old Marrow',
    description: 'A weather-worn dockmaster who has lost too many to the tide.',
    dialogueTree: oldDockmasterTree,
};

const tideShopkeeper: NPC = {
    name: 'Tide-Shopkeeper',
    description: 'Sells salt-cured fare from a stall by the wharf.',
    dialogueTree: tideshopkeeperTree,
    isShopkeeper: true,
};

// ─── Quest content ────────────────────────────────────────────────────────────

const startingQuest: Quest = {
    name: 'starting-quest',
    description: "Slay the Coastal Tyrant nesting at the breakwater. Old Marrow will reward you.",
    mapName: 'fishing-village',
    status: 'available',
    objectives: [
        {
            id: 'kill-tyrant',
            type: 'kill',
            target: 'The Coastal Tyrant',
            description: "Defeat the Coastal Tyrant.",
            requiredCount: 1,
            currentCount: 0,
        },
    ],
    reward: { kind: 'currency', amount: 25 },
};

// ─── Node events ──────────────────────────────────────────────────────────────

const fishingVillageEvents: Partial<Record<NodeId, MapEvent>> = {
    'fv-2': {
        type: 'npc',
        description: 'Old Marrow tends his nets by the docks.',
        npcName: 'Old Marrow',
    },
    'fv-3': {
        type: 'shop',
        description: 'A stall stacked with salt-cured wares.',
        npcName: 'Tide-Shopkeeper',
    },
    'fv-4': {
        type: 'encounter',
        description: 'A wet-hound bristles between the shacks.',
    },
    'fv-5': {
        type: 'treasure',
        description: 'A salt-stiff satchel half-buried in the sand.',
        reward: { kind: 'currency', amount: 10 },
    },
    'fv-6': {
        type: 'boss-encounter',
        description: 'The Coastal Tyrant rises from the breakwater.',
        enemySlug: 'coastal-tyrant',
    },
};

// ─── Map definitions ──────────────────────────────────────────────────────────

const fishingVillage: MapDefinition = {
    name: 'fishing-village',
    continent: 'coastal-continent',
    description: 'Your home town: familiar faces, salty air, old shacks lining the docks.',
    startingNode: {
        id: 'fv-1',
        location: [0, 0],
        connectedNodes: ['fv-2'],
    },
    nodes: [
        { id: 'fv-1',  location: [0, 0], connectedNodes: ['fv-2'] },
        { id: 'fv-2',  location: [1, 0], connectedNodes: ['fv-3'] },
        { id: 'fv-3',  location: [2, 0], connectedNodes: ['fv-4'] },
        { id: 'fv-4',  location: [3, 0], connectedNodes: ['fv-5'] },
        { id: 'fv-5',  location: [4, 0], connectedNodes: ['fv-6'] },
        { id: 'fv-6',  location: [5, 0], connectedNodes: ['fv-7'] },
        { id: 'fv-7',  location: [6, 0], connectedNodes: ['fv-8'] },
        { id: 'fv-8',  location: [7, 0], connectedNodes: ['fv-9'] },
        { id: 'fv-9',  location: [8, 0], connectedNodes: ['fv-10'] },
        { id: 'fv-10', location: [9, 0], connectedNodes: [] },
    ],
    nodeEvents: fishingVillageEvents,
    npcs: [oldMarrow, tideShopkeeper],
    enemies: [],
    availableEvents: [],
    uniqueEvents: [],
    quests: [startingQuest],
    images: {
        mapImage: { alt: '', src: '' },
        combatImage: { alt: '', src: '' },
    },
};

const northernForest: MapDefinition = {
    name: 'northern-forest',
    continent: 'coastal-continent',
    description: 'TODO',
    startingNode: {
        id: 'nf-1',
        location: [0, 0],
        connectedNodes: ['nf-2', 'nf-3'],
    },
    nodes: [
        { id: 'nf-1',  location: [0, 0], connectedNodes: ['nf-2', 'nf-3'] },
        { id: 'nf-2',  location: [1, 0], connectedNodes: ['nf-4'] },
        { id: 'nf-3',  location: [1, 1], connectedNodes: ['nf-5'] },
        { id: 'nf-4',  location: [2, 0], connectedNodes: ['nf-6'] },
        { id: 'nf-5',  location: [2, 1], connectedNodes: ['nf-6'] },
        { id: 'nf-6',  location: [3, 0], connectedNodes: ['nf-7'] },
        { id: 'nf-7',  location: [4, 0], connectedNodes: ['nf-8'] },
        { id: 'nf-8',  location: [5, 0], connectedNodes: ['nf-9'] },
        { id: 'nf-9',  location: [6, 0], connectedNodes: ['nf-10'] },
        { id: 'nf-10', location: [7, 0], connectedNodes: [] },
    ],
    nodeEvents: {
        'nf-4': {
            type: 'event',
            description: 'A clearing with a cold spring. You catch your breath.',
            healFraction: 1.0,
        },
    },
    npcs: [],
    enemies: [],
    availableEvents: [],
    uniqueEvents: [],
    quests: [],
    images: {
        mapImage: { alt: '', src: '' },
        combatImage: { alt: '', src: '' },
    },
};

export { fishingVillage, northernForest };
