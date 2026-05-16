/**
 * MapEvent pool content for fishing-village + northern-forest (Spec 24).
 *
 * Each existing fv-N / nf-N node gets a single-entry pool override so
 * the new dispatcher reproduces (and extends) the authored events
 * `processNode` used to fire. All 8 `MapEventKind` values are covered
 * at least once across the two maps.
 *
 * This file side-effects on import: `src/World/index.ts` imports it
 * for that side effect, so consumers of the package get the pools
 * registered automatically when they touch the world barrel.
 */

import {
    registerMapEventPool,
    setNodeEventPoolOverride,
} from './resolve-map-event';
import type { MapEventPool } from './types';

// ─── fishing-village pools ────────────────────────────────────────────────────

const fvCutscene: MapEventPool = {
    id: 'fv-1.cutscene',
    entries: [{
        kind: 'cutscene', weight: 1,
        payload: {
            kind: 'cutscene',
            lines: [
                'You step onto the weathered dock.',
                'Salt and smoke; the village wakes around you.',
            ],
            description: 'Arrival at the fishing village.',
        },
    }],
};

const fvOldMarrow: MapEventPool = {
    id: 'fv-2.interaction',
    entries: [{
        kind: 'interaction', weight: 1,
        payload: {
            kind: 'interaction',
            npcName: 'Old Marrow',
            description: 'Old Marrow tends his nets by the docks.',
        },
    }],
};

const fvShop: MapEventPool = {
    id: 'fv-3.village',
    entries: [{
        kind: 'village', weight: 1,
        payload: {
            kind: 'village',
            villageName: 'Fishing Village Stalls',
            merchants: [{ name: 'Tide-Shopkeeper', isShopkeeper: true }],
            shop: {
                wares: [
                    { itemId: 'healing-potion',       price: 25 },
                    { itemId: 'minor-healing-potion', price: 12 },
                    { itemId: 'antidote',             price: 30 },
                    { itemId: 'heart-draught',        price: 22 },
                ],
            },
            description: 'A stall stacked with salt-cured wares.',
        },
    }],
};

const fvWetHound: MapEventPool = {
    id: 'fv-4.encounter',
    entries: [{
        kind: 'encounter', weight: 1,
        payload: {
            kind: 'encounter',
            enemySlug: 'wet-hound',
            isBoss: false,
            description: 'A wet-hound bristles between the shacks.',
        },
    }],
};

const fvSatchel: MapEventPool = {
    id: 'fv-5.loot-cache',
    entries: [{
        kind: 'loot-cache', weight: 1,
        payload: {
            kind: 'loot-cache',
            currency: 10,
            description: 'A salt-stiff satchel half-buried in the sand.',
        },
    }],
};

const fvBoss: MapEventPool = {
    id: 'fv-6.encounter-boss',
    entries: [{
        kind: 'encounter', weight: 1,
        payload: {
            kind: 'encounter',
            enemySlug: 'coastal-tyrant',
            isBoss: true,
            description: 'The Coastal Tyrant rises from the breakwater.',
        },
    }],
};

const fvBeggar: MapEventPool = {
    id: 'fv-7.interaction',
    entries: [{
        kind: 'interaction', weight: 1,
        payload: {
            kind: 'interaction',
            npcName: 'Coastal Beggar',
            description: 'A beggar sits by the weathered wall, bowl at their feet.',
        },
    }],
};

const fvDriftwood: MapEventPool = {
    id: 'fv-8.gathering',
    entries: [{
        kind: 'gathering', weight: 1,
        payload: {
            kind: 'gathering',
            items: [{
                id: 'driftwood', name: 'Driftwood',
                description: 'Salt-bleached and brittle, but burns clean.',
                category: 'material', quantity: 1,
            }],
            description: 'Driftwood, piled against the dunes.',
        },
    }],
};

const fvCampfire: MapEventPool = {
    id: 'fv-9.rest',
    entries: [{
        kind: 'rest', weight: 1,
        payload: {
            kind: 'rest',
            healFraction: 1.0,
            description: 'An old fisher\'s campfire still warm. You catch your breath.',
        },
    }],
};

const fvHazard: MapEventPool = {
    id: 'fv-10.hazard',
    entries: [{
        kind: 'hazard', weight: 1,
        payload: {
            kind: 'hazard',
            damage: 2,
            description: 'You stumble through a thicket of jagged barnacles.',
        },
    }],
};

// ─── northern-forest pools ────────────────────────────────────────────────────

const nfCutscene: MapEventPool = {
    id: 'nf-1.cutscene',
    entries: [{
        kind: 'cutscene', weight: 1,
        payload: {
            kind: 'cutscene',
            lines: [
                'The forest opens before you in green hush.',
                'Distant birds; closer, the creak of unseen branches.',
            ],
            description: 'You step into the northern forest.',
        },
    }],
};

const nfWoodGather: MapEventPool = {
    id: 'nf-2.gathering',
    entries: [{
        kind: 'gathering', weight: 1,
        payload: {
            kind: 'gathering',
            items: [{
                id: 'oak-branch', name: 'Oak Branch',
                description: 'Sturdy, fresh-fallen.',
                category: 'material', quantity: 1,
            }],
            description: 'A windfall of oak branches.',
        },
    }],
};

const nfThorns: MapEventPool = {
    id: 'nf-3.hazard',
    entries: [{
        kind: 'hazard', weight: 1,
        payload: {
            kind: 'hazard',
            effectIds: ['debuff_bleed'],
            damage: 1,
            description: 'A wall of thorn-brush. You bleed easing through.',
        },
    }],
};

const nfSpring: MapEventPool = {
    id: 'nf-4.rest',
    entries: [{
        kind: 'rest', weight: 1,
        payload: {
            kind: 'rest',
            healFraction: 1.0,
            description: 'A clearing with a cold spring. You catch your breath.',
        },
    }],
};

const nfBuriedCache: MapEventPool = {
    id: 'nf-5.loot-cache',
    entries: [{
        kind: 'loot-cache', weight: 1,
        payload: {
            kind: 'loot-cache',
            currency: 15,
            description: 'A waxed pouch under a flat stone.',
        },
    }],
};

const nfSprite: MapEventPool = {
    id: 'nf-6.encounter',
    entries: [{
        kind: 'encounter', weight: 1,
        payload: {
            kind: 'encounter',
            enemySlug: 'forest-sprite',
            isBoss: false,
            description: 'A forest sprite flickers between the boughs.',
        },
    }],
};

const nfHermit: MapEventPool = {
    id: 'nf-7.interaction',
    entries: [{
        kind: 'interaction', weight: 1,
        payload: {
            kind: 'interaction',
            npcName: 'Forest Hermit',
            description: 'A reed hut hides among the pines.',
        },
    }],
};

const nfForestMarket: MapEventPool = {
    id: 'nf-8.village',
    entries: [{
        kind: 'village', weight: 1,
        payload: {
            kind: 'village',
            villageName: 'Glen Market',
            merchants: [{ name: 'Glen Marketeer', isShopkeeper: true }],
            shop: {
                wares: [
                    { itemId: 'minor-healing-potion', price: 12 },
                    { itemId: 'philosopher-tea',      price: 35 },
                    { itemId: 'void-essence',         price: 40 },
                    { itemId: 'clarity-serum',        price: 28 },
                ],
            },
            description: 'A small forest market keeps trade alive on the path.',
        },
    }],
};

const nfCrow: MapEventPool = {
    id: 'nf-9.encounter',
    entries: [{
        kind: 'encounter', weight: 1,
        payload: {
            kind: 'encounter',
            enemySlug: 'argumentative-crow',
            isBoss: false,
            description: 'An argumentative crow drops from a low branch.',
        },
    }],
};

const nfCaveMouth: MapEventPool = {
    id: 'nf-10.cutscene',
    entries: [{
        kind: 'cutscene', weight: 1,
        payload: {
            kind: 'cutscene',
            lines: [
                'A cave mouth yawns in the cliff face.',
                'Cold air spills out; something deeper is breathing.',
            ],
            description: 'The cave at the forest\'s edge.',
        },
    }],
};

// ─── register everything on module load ───────────────────────────────────────

const FISHING_VILLAGE_POOLS: ReadonlyArray<{ nodeId: string; pool: MapEventPool }> = [
    { nodeId: 'fv-1',  pool: fvCutscene  },
    { nodeId: 'fv-2',  pool: fvOldMarrow },
    { nodeId: 'fv-3',  pool: fvShop      },
    { nodeId: 'fv-4',  pool: fvWetHound  },
    { nodeId: 'fv-5',  pool: fvSatchel   },
    { nodeId: 'fv-6',  pool: fvBoss      },
    { nodeId: 'fv-7',  pool: fvBeggar    },
    { nodeId: 'fv-8',  pool: fvDriftwood },
    { nodeId: 'fv-9',  pool: fvCampfire  },
    { nodeId: 'fv-10', pool: fvHazard    },
];

const NORTHERN_FOREST_POOLS: ReadonlyArray<{ nodeId: string; pool: MapEventPool }> = [
    { nodeId: 'nf-1',  pool: nfCutscene     },
    { nodeId: 'nf-2',  pool: nfWoodGather   },
    { nodeId: 'nf-3',  pool: nfThorns       },
    { nodeId: 'nf-4',  pool: nfSpring       },
    { nodeId: 'nf-5',  pool: nfBuriedCache  },
    { nodeId: 'nf-6',  pool: nfSprite       },
    { nodeId: 'nf-7',  pool: nfHermit       },
    { nodeId: 'nf-8',  pool: nfForestMarket },
    { nodeId: 'nf-9',  pool: nfCrow         },
    { nodeId: 'nf-10', pool: nfCaveMouth    },
];

for (const { nodeId, pool } of FISHING_VILLAGE_POOLS) {
    registerMapEventPool(pool);
    setNodeEventPoolOverride('coastal-continent', 'fishing-village', nodeId, pool.id);
}

for (const { nodeId, pool } of NORTHERN_FOREST_POOLS) {
    registerMapEventPool(pool);
    setNodeEventPoolOverride('coastal-continent', 'northern-forest', nodeId, pool.id);
}
