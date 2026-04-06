import { Map } from 'World/types';

/**
 * CoastalContinentMapNames are all the maps in the Coastal Continent.
 * - 'fishing-village': Starting village. Get quest to build a boat.
 * - 'northern-forest': Small forest. First set of encounters. Gather wood.
 * @todo Add more maps
 */
export type CoastalContinentMapNames =
    | 'fishing-village'
    | 'northern-forest';

/**
 * Fishing Village — the player's starting map.
 *
 * Graph layout (x = depth left→right, y = vertical position high→low):
 *
 *                        fv-4(2,0)──fv-6(3, 1)╮
 *  fv-1(0,0)──fv-2(1,1)╱                      fv-9(4,0)──fv-10(5,0)
 *             fv-3(1,-1)╲──fv-5(2,-2)──fv-7(3,-1)╯
 *                                    ╲──fv-8(3,-2)╯
 *
 * fv-1 (start) and fv-10 (exit) have fixed types.
 * All other nodes receive randomly assigned types each run via initializeMapState().
 */
export const fishingVillage: Map = {
    name: 'fishing-village',
    continent: 'coastal-continent',
    description:
        'Your home town is filled with familiar faces, salty air, and old shacks connected to the docks. The waves crash in the distance as you prepare to leave.',
    startNodeId: 'fv-1',
    exitNodeId: 'fv-10',
    nodes: [
        // ── Fixed nodes ──────────────────────────────────────────────────────
        { id: 'fv-1',  type: 'start', location: [0, 0],  connectedNodes: ['fv-2', 'fv-3'] },
        { id: 'fv-10', type: 'exit',  location: [5, 0],  connectedNodes: [] },

        // ── Randomly-typed nodes ─────────────────────────────────────────────
        { id: 'fv-2',  location: [1,  1],  connectedNodes: ['fv-4'] },
        { id: 'fv-3',  location: [1, -1],  connectedNodes: ['fv-4', 'fv-5'] },
        { id: 'fv-4',  location: [2,  0],  connectedNodes: ['fv-6', 'fv-7'] },
        { id: 'fv-5',  location: [2, -2],  connectedNodes: ['fv-7', 'fv-8'] },
        { id: 'fv-6',  location: [3,  1],  connectedNodes: ['fv-9'] },
        { id: 'fv-7',  location: [3, -1],  connectedNodes: ['fv-9'] },
        { id: 'fv-8',  location: [3, -2],  connectedNodes: ['fv-9'] },
        { id: 'fv-9',  location: [4,  0],  connectedNodes: ['fv-10'] },
    ],
    availableEvents: [],
    uniqueEvents: [],
    enemies: [],
    npcs: [],
    images: {
        mapImage:    { alt: 'Fishing Village Map',    src: '' },
        combatImage: { alt: 'Fishing Village Docks',  src: '' },
    },
};
