/**
 * Coastal Continent map definitions (Spec 08 Q5A — static templates only).
 *
 * Each export is a frozen `MapDefinition`. Runtime per-save progress lives in
 * `MapState`, built via `createMapState(definition)` and stored under
 * `WorldState.currentMap`.
 *
 * The `fishing-village` chain demos the full Spec 08 exploration loop in
 * post-Phase-23 MapEventKind terms (`npc` and `shop` were folded into
 * `interaction` and `village`):
 *   fv-1 (start) → fv-2 (interaction — quest giver) → fv-3 (village — shop)
 *                → fv-4 (encounter) → fv-5 (loot-cache) → fv-6 (encounter — boss).
 */

import { MapDefinition, Quest } from '../../types';
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
                    text: "I've got my own dead to bury — maybe later.",
                    nextNodeId: undefined,
                    // Phase 43 — declining for personal grief: scope leans
                    // individual; outlook nudges pessimistic via the weight
                    // of acknowledged loss.
                    effect: { moralDelta: 2, alignmentDelta: { outlook: -1, scope: -2 } },
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
                    text: "Take it — coin keeps a man fed.",
                    nextNodeId: undefined,
                    requires: { questCompleted: 'starting-quest' },
                    effect: { grantCurrency: 25 },
                },
                {
                    text: "Take only half — your need is greater than mine.",
                    nextNodeId: undefined,
                    requires: { questCompleted: 'starting-quest' },
                    // Phase 43 — Faith-Optimistic-Relational lean (Jean
                    // Valjean / Dorothy Day cells): mercy + service.
                    effect: {
                        grantCurrency: 12,
                        moralDelta: 5,
                        alignmentDelta: { epistemology: -2, outlook: 3, scope: 3 },
                    },
                },
                {
                    text: "This nearly killed me. Pay double or keep it.",
                    nextNodeId: undefined,
                    requires: { questCompleted: 'starting-quest' },
                    // Phase 43 — Logic-Pessimistic-Individual lean (Underground
                    // Man cell): hyper-rational grievance + self-prioritisation.
                    effect: {
                        grantCurrency: 25,
                        moralDelta: -4,
                        setFlag: 'marrow_pressed',
                        alignmentDelta: { epistemology: 3, outlook: -3, scope: -3 },
                    },
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

const beggarTree: DialogueTree = {
    rootId: 'greet',
    nodes: {
        greet: {
            id: 'greet',
            text: "A haggard figure sits against the weathered wall, an empty bowl at their feet. \"Spare a coin for one fallen on hard times? The sea took my nets... my livelihood...\"",
            choices: [
                {
                    text: "Give 10 gold generously. \"Here, take this.\"",
                    nextNodeId: 'grateful_generous',
                    // Phase 43 — Faith-Optimistic-Relational lean.
                    effect: {
                        grantCurrency: -10,
                        moralDelta: 5,
                        alignmentDelta: { epistemology: -2, outlook: 2, scope: 3 },
                    },
                },
                {
                    text: "Give 5 gold. \"I can spare a little.\"",
                    nextNodeId: 'grateful_small',
                    effect: { grantCurrency: -5, moralDelta: 1 },
                },
                {
                    text: "Offer to share your rations instead.",
                    nextNodeId: 'grateful_kind',
                    // Phase 43 — Agnostic-Optimistic-Relational lean (Atticus
                    // Finch / Dewey cells): practical kindness without
                    // metaphysical justification.
                    effect: {
                        moralDelta: 3,
                        alignmentDelta: { outlook: 2, scope: 2 },
                    },
                },
                {
                    text: "\"Everyone has their struggles.\" (Walk away)",
                    nextNodeId: 'dismissed',
                    effect: { moralDelta: -1 },
                },
                {
                    text: "\"Find work like everyone else.\" (Be harsh)",
                    nextNodeId: 'harsh',
                    // Phase 43 — Logic-Pessimistic-Individual lean: cold
                    // rationality + dismissal of relational obligation.
                    effect: {
                        moralDelta: -5,
                        alignmentDelta: { epistemology: 2, outlook: -2, scope: -3 },
                    },
                },
            ],
        },
        grateful_generous: {
            id: 'grateful_generous',
            text: "The beggar's eyes brighten with genuine gratitude. \"Ten gold! Bless you, kind soul. This will see me through the harsh season.\" They clutch the coins with trembling hands. [Moral meter +5]",
        },
        grateful_small: {
            id: 'grateful_small',
            text: "The beggar nods gratefully. \"Five gold is more kindness than most show. Thank you, friend.\" [Moral meter +1]",
        },
        grateful_kind: {
            id: 'grateful_kind',
            text: "The beggar's weathered face lights up. \"You would share your own food? Such kindness is rarer than gold. I'll remember this.\" [Moral meter +3]",
        },
        dismissed: {
            id: 'dismissed',
            text: "The beggar nods wearily, accustomed to indifference. \"Aye, we all must find our way.\" They turn back to watching the harbor. [Moral meter -1]",
        },
        harsh: {
            id: 'harsh',
            text: "The beggar recoils as if struck. \"I... I have tried. But the storms...\" They lower their head in shame and say no more. [Moral meter -5]",
        },
    },
};

const coastalBeggar: NPC = {
    name: 'Coastal Beggar',
    description: 'A weather-beaten soul whose luck ran out with the changing tides.',
    dialogueTree: beggarTree,
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

// ─── Map definitions ──────────────────────────────────────────────────────────
//
// Per Spec 23 / Phase 24, node events are no longer authored on the
// MapDefinition. The legacy `nodeEvents` block was removed in Phase 25;
// see `src/World/MapEvents/content.ts` for the per-node pool overrides
// that drive `resolveMapEvent` against fishing-village + northern-forest.

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
    npcs: [oldMarrow, tideShopkeeper, coastalBeggar],
    enemies: [],
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
    description: 'A pine-thick wood inland from the village; cold springs, low light, and a cave mouth at the far edge.',
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
    npcs: [],
    enemies: [],
    uniqueEvents: [],
    quests: [],
    images: {
        mapImage: { alt: '', src: '' },
        combatImage: { alt: '', src: '' },
    },
};

export { fishingVillage, northernForest };
