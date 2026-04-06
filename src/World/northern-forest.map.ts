import { Map } from 'World/types';

/**
 * Northern Forest — second map of the Coastal Continent.
 *
 * Only the start (nf-1), boss (nf-10), and exit (nf-11) have fixed types.
 * All branching nodes (nf-2 through nf-9) are left without a type so that
 * initializeMapState() assigns them randomly, making every traversal unique.
 *
 * Graph layout (x = depth left→right, y = vertical position high→low):
 *
 *                    nf-4(2,2)──nf-7(3,1)╮
 *  nf-1(0,0)──nf-2(1,1)                  nf-9(4,0)──nf-10(5,0)──nf-11(6,0)
 *            ╲        ╲──nf-5(2,0)──────╯╱
 *             nf-3(1,-1)╲               ╱
 *                        nf-6(2,-2)──nf-8(3,-1)╯
 */
export const northernForest: Map = {
    name: 'northern-forest',
    continent: 'coastal-continent',
    description:
        'A dense forest where the canopy blocks the sky. Ancient trees whisper forgotten words as you venture deeper. The path forks endlessly — every traversal reveals a different face of the wood.',
    startNodeId: 'nf-1',
    exitNodeId:  'nf-11',
    nodes: [
        // ── Fixed nodes ──────────────────────────────────────────────────────
        { id: 'nf-1',  type: 'start',          location: [0, 0],  connectedNodes: ['nf-2', 'nf-3']   },
        { id: 'nf-10', type: 'boss-encounter',  location: [5, 0],  connectedNodes: ['nf-11']          },
        { id: 'nf-11', type: 'exit',            location: [6, 0],  connectedNodes: []                 },

        // ── Randomly-typed branching nodes ───────────────────────────────────
        // Types are assigned per-run by initializeMapState(); nothing is fixed here.
        { id: 'nf-2',  location: [1,  1],  connectedNodes: ['nf-4', 'nf-5']   },
        { id: 'nf-3',  location: [1, -1],  connectedNodes: ['nf-5', 'nf-6']   },
        { id: 'nf-4',  location: [2,  2],  connectedNodes: ['nf-7']           },
        { id: 'nf-5',  location: [2,  0],  connectedNodes: ['nf-7', 'nf-8']   },
        { id: 'nf-6',  location: [2, -2],  connectedNodes: ['nf-8']           },
        { id: 'nf-7',  location: [3,  1],  connectedNodes: ['nf-9']           },
        { id: 'nf-8',  location: [3, -1],  connectedNodes: ['nf-9']           },
        { id: 'nf-9',  location: [4,  0],  connectedNodes: ['nf-10']          },
    ],
    availableEvents: [],
    uniqueEvents: [],
    // TODO: populate enemies from EnemyLibrary.northernForest once encounter spawning is wired
    enemies: [],
    npcs: [],
    images: {
        mapImage:    { alt: 'Northern Forest Map',       src: '' },
        combatImage: { alt: 'Northern Forest Clearing',  src: '' },
    },
};
