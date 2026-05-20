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
        // Phase 43 — arriving among people: gentle relational pull.
        alignmentDelta: { scope: 1 },
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
        // Phase 43 — solitary scavenging leans individual.
        alignmentDelta: { scope: -1 },
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
        // Phase 43 — peaceful rest at an unattended campfire (someone left
        // it warm for whoever followed): small optimistic + relational pull.
        alignmentDelta: { outlook: 2, scope: 1 },
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
        // Phase 43 — the world is indifferent and bites; pessimistic +
        // logical-acceptance lean (Camus / Schopenhauer territory).
        alignmentDelta: { epistemology: 1, outlook: -1 },
    }],
};

// ─── Phase 65 — fishing-village expansion pools ─────────────────────────────
//
// Per Phase 65 D5: reuse existing enemies + NPCs (no new content). Per D6:
// gathering pools that lack a canonical material id ship as description-
// only payloads. Per D8: alignmentDelta annotations only where thematically
// tight (~60% density mirroring Phase 43's first-pass).

const fvFishmongerRow: MapEventPool = {
    id: 'fv-11.village',
    entries: [{
        kind: 'village', weight: 1,
        payload: {
            kind: 'village',
            villageName: 'Fishmonger Row',
            merchants: [{ name: 'Net-Mender Joss', isShopkeeper: true }],
            shop: {
                wares: [
                    { itemId: 'minor-healing-potion', price: 12 },
                    { itemId: 'driftwood',            price: 3 },
                ],
            },
            description: 'A line of fishmonger stalls; nets, bait, salt.',
        },
    }],
};

const fvFerrySlip: MapEventPool = {
    id: 'fv-12.cutscene',
    entries: [{
        kind: 'cutscene', weight: 1,
        payload: {
            kind: 'cutscene',
            lines: [
                'The ferry slip is empty.',
                'The ferrier\'s lantern is dark; the water laps unanswered.',
            ],
            description: 'At the empty ferry slip.',
        },
        // Phase 43 — absent ferrier reads as small pessimistic-relational pull.
        alignmentDelta: { outlook: -1 },
    }],
};

const fvQuaysideChapel: MapEventPool = {
    id: 'fv-13.rest',
    entries: [{
        kind: 'rest', weight: 1,
        payload: {
            kind: 'rest',
            healFraction: 0.5,
            description: 'A small chapel at the quayside. The bench is worn smooth.',
        },
        // Phase 43 — chapel rest leans faith-transcendent.
        alignmentDelta: { epistemology: -1, scope: 1 },
    }],
};

const fvTidePools: MapEventPool = {
    id: 'fv-14.gathering',
    entries: [{
        kind: 'gathering', weight: 1,
        payload: {
            kind: 'gathering',
            items: [{
                id: 'tide-shell', name: 'Tide Shell',
                description: 'Spiral and chalk-pale; the inside still smells of salt.',
                category: 'material', quantity: 1,
            }],
            description: 'Tide pools at low tide — small treasures wedged among the kelp.',
        },
    }],
};

const fvGullCrag: MapEventPool = {
    id: 'fv-15.encounter',
    entries: [{
        kind: 'encounter', weight: 1,
        payload: {
            kind: 'encounter',
            enemySlug: 'mournful-gull',
            isBoss: false,
            description: 'The mournful gull circles her crag, screaming her tallies.',
        },
    }],
};

const fvTownWell: MapEventPool = {
    id: 'fv-16.rest',
    entries: [{
        kind: 'rest', weight: 1,
        payload: {
            kind: 'rest',
            healFraction: 0.75,
            description: 'The town well; cold water, old stone, kind to throats.',
        },
    }],
};

const fvSmokehouse: MapEventPool = {
    id: 'fv-17.gathering',
    entries: [{
        kind: 'gathering', weight: 1,
        payload: {
            kind: 'gathering',
            items: [{
                id: 'salt-fish', name: 'Salt-Fish Strip',
                description: 'Cured hard; chewy, salty, will keep for the road.',
                category: 'material', quantity: 1,
            }],
            description: 'A smokehouse rack half-loaded with salt-fish; some pieces have fallen.',
        },
        // Phase 43 — opportunistic gathering at an unattended rack.
        alignmentDelta: { scope: -1 },
    }],
};

const fvBackAlley: MapEventPool = {
    id: 'fv-18.encounter',
    entries: [{
        kind: 'encounter', weight: 1,
        payload: {
            kind: 'encounter',
            enemySlug: 'hollow-eyed-beggar',
            isBoss: false,
            description: 'In the back alley a hollow-eyed figure waits without waiting.',
        },
    }],
};

const fvAbandonedShack: MapEventPool = {
    id: 'fv-19.loot-cache',
    entries: [{
        kind: 'loot-cache', weight: 1,
        payload: {
            kind: 'loot-cache',
            currency: 8,
            description: 'A widow\'s shack. The chest under the bed has a stuck latch.',
        },
    }],
};

const fvOldShrine: MapEventPool = {
    id: 'fv-20.cutscene',
    entries: [{
        kind: 'cutscene', weight: 1,
        payload: {
            kind: 'cutscene',
            lines: [
                'A weathered shrine to a half-forgotten sea-god.',
                'The offerings are recent. Someone still remembers.',
            ],
            description: 'The old shrine on the back lane.',
        },
        // Phase 43 — small faith-transcendent pull at the kept shrine.
        alignmentDelta: { epistemology: -2, scope: 2 },
    }],
};

const fvGullTossedSteps: MapEventPool = {
    id: 'fv-21.cutscene',
    entries: [{
        kind: 'cutscene', weight: 1,
        payload: {
            kind: 'cutscene',
            lines: [
                'A returning fisherman pauses on the gull-tossed steps to catch his breath.',
                'He nods. Says nothing. Keeps climbing.',
            ],
            description: 'On the gull-tossed steps.',
        },
    }],
};

const fvSeaStack: MapEventPool = {
    id: 'fv-22.loot-cache',
    entries: [{
        kind: 'loot-cache', weight: 1,
        payload: {
            kind: 'loot-cache',
            currency: 12,
            description: 'A kelp-bound bundle wedged at the sea-stack base.',
        },
    }],
};

const fvLighthouseRuin: MapEventPool = {
    id: 'fv-23.cutscene',
    entries: [{
        kind: 'cutscene', weight: 1,
        payload: {
            kind: 'cutscene',
            lines: [
                'The lighthouse ruin. The lamp-room is open to the sky.',
                'You can see the whole coast from here, and how small you are inside it.',
            ],
            description: 'At the lighthouse ruin.',
        },
        // Phase 43 — vastness from the cliff: small outlook-pessimistic
        // pull + transcendent-scope shift.
        alignmentDelta: { outlook: -1, scope: 2 },
    }],
};

const fvKeepersCottage: MapEventPool = {
    id: 'fv-24.rest',
    entries: [{
        kind: 'rest', weight: 1,
        payload: {
            kind: 'rest',
            healFraction: 1.0,
            description: 'The keeper\'s cottage stands open. The kettle is still warm.',
        },
        // Phase 43 — abandoned but welcoming: small optimistic +
        // relational pull (someone left it for whoever came after).
        alignmentDelta: { outlook: 1, scope: 1 },
    }],
};

const fvGullsNest: MapEventPool = {
    id: 'fv-25.hazard',
    entries: [{
        kind: 'hazard', weight: 1,
        payload: {
            kind: 'hazard',
            damage: 1,
            description: 'A gull\'s nest above the cliff path; fledglings strike at intruders.',
        },
        // Phase 43 — territorial fauna at the dead-end; small pessimistic pull.
        alignmentDelta: { outlook: -1 },
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
        // Phase 43 — the spring's hush invites the larger picture:
        // transcendent scope, mild faith-leaning epistemology.
        alignmentDelta: { epistemology: -1, scope: 2 },
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
        // Phase 43 — cosmic dread at the dark gate: Lovecraft / Cioran
        // territory (Agnostic-Pessimistic-Transcendent).
        alignmentDelta: { outlook: -2, scope: 3 },
    }],
};

// ─── register everything on module load ───────────────────────────────────────

const FISHING_VILLAGE_POOLS: ReadonlyArray<{ nodeId: string; pool: MapEventPool }> = [
    // Spine (Phase 23 / 24 era)
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
    // Harbor district (Phase 65)
    { nodeId: 'fv-11', pool: fvFishmongerRow },
    { nodeId: 'fv-12', pool: fvFerrySlip     },
    { nodeId: 'fv-13', pool: fvQuaysideChapel },
    { nodeId: 'fv-14', pool: fvTidePools     },
    { nodeId: 'fv-15', pool: fvGullCrag      },
    // Inland streets (Phase 65)
    { nodeId: 'fv-16', pool: fvTownWell      },
    { nodeId: 'fv-17', pool: fvSmokehouse    },
    { nodeId: 'fv-18', pool: fvBackAlley     },
    { nodeId: 'fv-19', pool: fvAbandonedShack },
    { nodeId: 'fv-20', pool: fvOldShrine     },
    // Cliff path (Phase 65)
    { nodeId: 'fv-21', pool: fvGullTossedSteps },
    { nodeId: 'fv-22', pool: fvSeaStack       },
    { nodeId: 'fv-23', pool: fvLighthouseRuin },
    { nodeId: 'fv-24', pool: fvKeepersCottage },
    { nodeId: 'fv-25', pool: fvGullsNest      },
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
