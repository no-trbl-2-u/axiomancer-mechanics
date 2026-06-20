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
import type { EnemySlug } from '../../Enemy/enemy.library';

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

const _fvTidePools: MapEventPool = {
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

const _fvTownWell: MapEventPool = {
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

const _nfThorns: MapEventPool = {
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

const _nfBuriedCache: MapEventPool = {
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

const _nfCrow: MapEventPool = {
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

// ─── Phase 115 — Story Content NPCs interaction pools ────────────────────────

const fvCaptainBlackwater: MapEventPool = {
    id: 'fv-14.interaction',
    entries: [{
        kind: 'interaction', weight: 1,
        payload: {
            kind: 'interaction',
            npcName: 'Captain Blackwater',
            description: 'Captain Blackwater tallies cargo manifests at the trading docks.',
        },
    }],
};

const fvFishermansDaughter: MapEventPool = {
    id: 'fv-16.interaction',
    entries: [{
        kind: 'interaction', weight: 1,
        payload: {
            kind: 'interaction',
            npcName: "Fisherman's Daughter",
            description: 'The fisherman\'s daughter tends nets, her eyes bright with curiosity.',
        },
    }],
};

const nfShrineKeeper: MapEventPool = {
    id: 'nf-3.interaction',
    entries: [{
        kind: 'interaction', weight: 1,
        payload: {
            kind: 'interaction',
            npcName: 'Shrine Keeper',
            description: 'The Shrine Keeper tends ancient carved stones among the forest growth.',
        },
        alignmentDelta: { epistemology: 1, scope: 1 },
    }],
};

const nfChronicler: MapEventPool = {
    id: 'nf-5.interaction',
    entries: [{
        kind: 'interaction', weight: 1,
        payload: {
            kind: 'interaction',
            npcName: 'The Chronicler',
            description: 'The Chronicler sits surrounded by leather-bound tomes and parchments.',
        },
        alignmentDelta: { epistemology: 1 },
    }],
};

const nfWanderingPhilosopher: MapEventPool = {
    id: 'nf-9.interaction',
    entries: [{
        kind: 'interaction', weight: 1,
        payload: {
            kind: 'interaction',
            npcName: 'The Wandering Philosopher',
            description: 'A contemplative figure in simple robes sits among the trees.',
        },
        alignmentDelta: { epistemology: 1, scope: 1 },
    }],
};

// ─── Phase 117 northern-forest expansion pools ────────────────────────────────
const nfMossyClearing: MapEventPool = {
    id: 'nf-11.rest',
    entries: [{
        kind: 'rest', weight: 1,
        payload: {
            kind: 'rest',
            healFraction: 0.75,
            description: 'A mossy clearing with a fallen log that serves as a natural bench.',
        },
        alignmentDelta: { scope: 1 },
    }],
};

const nfDenseThicket: MapEventPool = {
    id: 'nf-12.encounter',
    entries: [{
        kind: 'encounter', weight: 1,
        payload: {
            kind: 'encounter',
            enemySlug: 'thorned-sentinel',
            isBoss: false,
            description: 'Dense thickets block the way; something large and thorned moves within.',
        },
    }],
};

const nfBerryBushes: MapEventPool = {
    id: 'nf-13.gathering',
    entries: [{
        kind: 'gathering', weight: 1,
        payload: {
            kind: 'gathering',
            items: [{
                id: 'dark-berries', name: 'Dark Berries',
                description: 'Plump and sweet, with a hint of bitterness.',
                category: 'material', quantity: 2,
            }],
            description: 'Berry bushes heavy with dark fruit. You gather what you can.',
        },
    }],
};

const nfStoneMarker: MapEventPool = {
    id: 'nf-14.interaction',
    entries: [{
        kind: 'interaction', weight: 1,
        payload: {
            kind: 'interaction',
            npcName: 'Ancient Stone Marker',
            description: 'An old stone marker left by previous travelers. Carved runes mark the way forward.',
        },
    }],
};

const nfBrambleTrap: MapEventPool = {
    id: 'nf-15.hazard',
    entries: [{
        kind: 'hazard', weight: 1,
        payload: {
            kind: 'hazard',
            damage: 1,
            description: 'Hidden brambles catch at your feet and tear at exposed skin.',
        },
        alignmentDelta: { outlook: -1 },
    }],
};

const nfHuntersCache: MapEventPool = {
    id: 'nf-16.loot-cache',
    entries: [{
        kind: 'loot-cache', weight: 1,
        payload: {
            kind: 'loot-cache',
            currency: 10,
            description: 'An old hunter\'s cache buried beneath gnarled roots.',
        },
    }],
};

const nfBoneCircle: MapEventPool = {
    id: 'nf-17.cutscene',
    entries: [{
        kind: 'cutscene', weight: 1,
        payload: {
            kind: 'cutscene',
            lines: [
                'Ancient bones are scattered in a perfect circle beneath the canopy.',
                'Time has bleached them white, but their arrangement speaks of purpose.',
                'Something old and final happened here.'
            ],
            description: 'A circle of ancient bones in the hollow.',
        },
        alignmentDelta: { epistemology: -2, scope: -1 },
    }],
};

const nfHerbTrader: MapEventPool = {
    id: 'nf-18.village',
    entries: [{
        kind: 'village', weight: 1,
        payload: {
            kind: 'village',
            villageName: 'Hidden Camp',
            merchants: [{ name: 'Herb Trader', isShopkeeper: true }],
            shop: {
                wares: [
                    { itemId: 'minor-healing-potion', price: 10 },
                    { itemId: 'antidote',             price: 15 },
                    { itemId: 'clarity-serum',        price: 25 },
                ],
            },
            description: 'A herb trader\'s carefully hidden camp among the mist-shrouded trees.',
        },
    }],
};

const nfShadowWolfTerritory: MapEventPool = {
    id: 'nf-19.encounter',
    entries: [{
        kind: 'encounter', weight: 1,
        payload: {
            kind: 'encounter',
            enemySlug: 'mistwalker-shade',
            isBoss: false,
            description: 'A shadowy form drifts between the mist-wreathed trees.',
        },
    }],
};

const nfAxeHead: MapEventPool = {
    id: 'nf-20.loot-cache',
    entries: [{
        kind: 'loot-cache', weight: 1,
        payload: {
            kind: 'loot-cache',
            currency: 8,
            description: 'A woodcutter\'s forgotten axe head, still sharp beneath the rust.',
        },
    }],
};

const nfRangerCairn: MapEventPool = {
    id: 'nf-21.cutscene',
    entries: [{
        kind: 'cutscene', weight: 1,
        payload: {
            kind: 'cutscene',
            lines: [
                'A careful stack of stones marks this quiet spot.',
                'Someone is buried here — a ranger who never came home.'
            ],
            description: 'A memorial cairn for a lost ranger.',
        },
        alignmentDelta: { outlook: -1, epistemology: 1 },
    }],
};

const nfMoonbellFlowers: MapEventPool = {
    id: 'nf-22.gathering',
    entries: [{
        kind: 'gathering', weight: 1,
        payload: {
            kind: 'gathering',
            items: [{
                id: 'moonbell-petals', name: 'Moonbell Petals',
                description: 'Silvery petals that glow with their own light.',
                category: 'material', quantity: 1,
            }],
            description: 'Rare moonbell flowers bloom in silver clusters, their petals glowing faintly.',
        },
    }],
};

const nfEchoStone: MapEventPool = {
    id: 'nf-23.interaction',
    entries: [{
        kind: 'interaction', weight: 1,
        payload: {
            kind: 'interaction',
            npcName: 'Echo Stone',
            description: 'A smooth stone formation that echoes back whispered words with perfect clarity.',
        },
        alignmentDelta: { epistemology: 1 },
    }],
};

const nfHiddenGrove: MapEventPool = {
    id: 'nf-24.rest',
    entries: [{
        kind: 'rest', weight: 1,
        payload: {
            kind: 'rest',
            healFraction: 1.0,
            description: 'A hidden grove surrounds a natural spring. The water runs clear and cold.',
        },
        alignmentDelta: { scope: 2 },
    }],
};

const nfMistPools: MapEventPool = {
    id: 'nf-25.hazard',
    entries: [{
        kind: 'hazard', weight: 1,
        payload: {
            kind: 'hazard',
            damage: 2,
            description: 'Thick pools of mist swirl and eddy, confusing your sense of direction.',
        },
        alignmentDelta: { epistemology: -1 },
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
    { nodeId: 'fv-14', pool: fvCaptainBlackwater },
    { nodeId: 'fv-15', pool: fvGullCrag      },
    // Inland streets (Phase 65)
    { nodeId: 'fv-16', pool: fvFishermansDaughter },
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
    // Existing pools (preserved)
    { nodeId: 'nf-1',  pool: nfCutscene     },
    { nodeId: 'nf-2',  pool: nfWoodGather   },
    { nodeId: 'nf-3',  pool: nfShrineKeeper },
    { nodeId: 'nf-4',  pool: nfSpring       },
    { nodeId: 'nf-5',  pool: nfChronicler   },
    { nodeId: 'nf-6',  pool: nfSprite       },
    { nodeId: 'nf-7',  pool: nfHermit       },
    { nodeId: 'nf-8',  pool: nfForestMarket },
    { nodeId: 'nf-9',  pool: nfWanderingPhilosopher },
    { nodeId: 'nf-10', pool: nfCaveMouth    },
    // Phase 117 expansion pools
    { nodeId: 'nf-11', pool: nfMossyClearing    },
    { nodeId: 'nf-12', pool: nfDenseThicket     },
    { nodeId: 'nf-13', pool: nfBerryBushes      },
    { nodeId: 'nf-14', pool: nfStoneMarker      },
    { nodeId: 'nf-15', pool: nfBrambleTrap      },
    { nodeId: 'nf-16', pool: nfHuntersCache     },
    { nodeId: 'nf-17', pool: nfBoneCircle       },
    { nodeId: 'nf-18', pool: nfHerbTrader       },
    { nodeId: 'nf-19', pool: nfShadowWolfTerritory },
    { nodeId: 'nf-20', pool: nfAxeHead          },
    { nodeId: 'nf-21', pool: nfRangerCairn      },
    { nodeId: 'nf-22', pool: nfMoonbellFlowers  },
    { nodeId: 'nf-23', pool: nfEchoStone        },
    { nodeId: 'nf-24', pool: nfHiddenGrove      },
    { nodeId: 'nf-25', pool: nfMistPools        },
];

for (const { nodeId, pool } of FISHING_VILLAGE_POOLS) {
    registerMapEventPool(pool);
    setNodeEventPoolOverride('coastal-continent', 'fishing-village', nodeId, pool.id);
}

for (const { nodeId, pool } of NORTHERN_FOREST_POOLS) {
    registerMapEventPool(pool);
    setNodeEventPoolOverride('coastal-continent', 'northern-forest', nodeId, pool.id);
}

// ─── New-player fishing-village override (2026-06) ────────────────────────────
//
// Directive: the first continent's STARTING map is a combat-focused new-player
// gauntlet — exactly ONE quest node (the story hook) and ONE boss node (the
// region climax); every other node is a balanced low-level encounter. This
// block re-registers all fishing-village nodes, superseding the legacy authored
// pools above (Old Marrow, the stalls, gathering, rest, hazards remain defined
// in source for easy restoration but are no longer wired on this map).
//
// Foes are kept to the gentlest L1–L2 simple/normal roster: the gauntlet has no
// rest/shop node, so a new player cannot heal or restock mid-map — difficulty is
// held down by the foe tier rather than by recovery nodes. Boss stays at fv-6
// (the node wired for region progression); the quest sits at fv-15.

const FV_NEW_PLAYER_FOES: ReadonlyArray<{ slug: EnemySlug; description: string }> = [
    { slug: 'tidepool-crab',  description: 'A tidepool crab pincers up from the dock pilings.' },
    { slug: 'sea-mist-wisp',  description: 'A sea-mist wisp coils out of the fog.' },
    { slug: 'salt-gnaw-rat',  description: 'A salt-gnaw rat bares its teeth among the crates.' },
    { slug: 'driftwood-husk', description: 'A driftwood husk shudders upright on the strand.' },
    { slug: 'wet-hound',      description: 'A wet-hound bristles between the shacks.' },
    { slug: 'mournful-gull',  description: 'A mournful gull wheels down, shrieking.' },
];

function fvEncounterPool(
    nodeId: string,
    foe: { slug: EnemySlug; description: string },
): MapEventPool {
    return {
        id: `${nodeId}.encounter`,
        entries: [{
            kind: 'encounter', weight: 1,
            payload: {
                kind: 'encounter',
                enemySlug: foe.slug,
                isBoss: false,
                description: foe.description,
            },
        }],
    };
}

const fvBuildTheBoatQuest: MapEventPool = {
    id: 'fv-15.quest',
    entries: [{
        kind: 'quest', weight: 1,
        payload: {
            kind: 'quest',
            boardId: 'build-the-boat',
            description: 'The half-built hull waits on the strand; the village is counting on it.',
        },
    }],
};

/** The single quest node and single boss node on the new-player map. */
const FV_QUEST_NODE = 'fv-15';
const FV_BOSS_NODE = 'fv-6';

const FISHING_VILLAGE_NEW_PLAYER_POOLS: ReadonlyArray<{ nodeId: string; pool: MapEventPool }> =
    (() => {
        const out: Array<{ nodeId: string; pool: MapEventPool }> = [];
        let foeIdx = 0;
        for (let i = 1; i <= 25; i++) {
            const nodeId = `fv-${i}`;
            if (nodeId === FV_BOSS_NODE) {
                out.push({ nodeId, pool: fvBoss });
            } else if (nodeId === FV_QUEST_NODE) {
                out.push({ nodeId, pool: fvBuildTheBoatQuest });
            } else {
                const foe = FV_NEW_PLAYER_FOES[foeIdx % FV_NEW_PLAYER_FOES.length]!;
                foeIdx++;
                out.push({ nodeId, pool: fvEncounterPool(nodeId, foe) });
            }
        }
        return out;
    })();

for (const { nodeId, pool } of FISHING_VILLAGE_NEW_PLAYER_POOLS) {
    registerMapEventPool(pool);
    setNodeEventPoolOverride('coastal-continent', 'fishing-village', nodeId, pool.id);
}
