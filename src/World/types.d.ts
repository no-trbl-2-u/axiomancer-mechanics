import { Item } from '../Items/types';
import { Enemy } from '../Enemy/types';
import { Image } from '../Utils/types';
import { ContinentName, MapName } from './map.library';
import { QuestName } from './quest.library';
import { NPC } from '../NPCs/types';

/**
 * Quest represents a quest in the game world
 * @property name - The unique identifier for this quest
 * @property description - Description of the quest objectives
 * @property containingMap - The map where this quest takes place or is obtained
 * @property reward - The reward granted upon quest completion
 * @property connectingQuest - The next quest in a quest chain
 */
export interface Quest {
    name: QuestName;
    description: string;
    containingMap: MapName;
    reward: Reward;
    connectingQuest?: QuestName;
}

/**
 * MapEvents represents the types of events that can occur on a map node.
 * Every node has exactly one type, which determines what is triggered when
 * the player arrives.
 * - 'start': The entry point of the map (exactly one per map)
 * - 'exit': The exit point of the map (exactly one per map)
 * - 'encounter': Combat encounter with an enemy
 * - 'boss-encounter': Encounter with a boss enemy
 * - 'event': Story or scripted event
 * - 'treasure': Loot or item discovery
 * - 'gather': Resource gathering. Forced decision between gathering nodes
 * - 'quest': Quest-related event
 * - 'shop': Shop for player to spend currency
 * - 'npc': NPC interaction
 * - 'other': Miscellaneous event type
 * @todo: Create an EventLibrary (or EventManager) to enumerate and handle these events
 */
export type MapEvents =
    | 'start'
    | 'exit'
    | 'encounter'
    | 'boss-encounter'
    | 'event'
    | 'treasure'
    | 'gather'
    | 'quest'
    | 'shop'
    | 'npc'
    | 'other';

/**
 * Reward types that can be obtained from events or combat
 * - 'experience': Experience points for the player (typically from encounter, but can come from other sources)
 * - 'item': Items (e.g. equipment, consumables, materials, etc.)
 * - 'currency': Currency (e.g. gold, gems, tomes, etc.)
 * - 'skill': New abilities or skills
 * - 'quest': An attached quest for continued quest lines
 * - 'quest-item': An item that is required to progress in a quest
 * @todo: Create a RewardLibrary (or RewardManager) to enumerate and handle these rewards
 */
export type Reward = 'experience' | Item | 'currency' | 'skill' | 'quest';

/**
 * MapEvent represents a specific event that can occur on a map node
 * @property name - The type of event that occurs
 * @property description - Text description of the event
 * @property enemy - (Guess) The enemy encountered in this event (may only apply to 'encounter' type events)
 * @property reward - Optional: reward granted upon completing this event
 */
export interface MapEvent {
    name: MapEvents;
    description: string;
    enemy?: Enemy;
    reward?: Reward;
}

/**
 * A Unique Event is an event that can only occur once in the game
 * @property id - Unique identifier for this event
 * @property name - The type of event that occurs
 * @property description - Narration presented for event
 * @property nodeLocation - The coordinates of the node where this event occurs
 * @property completed - Whether or not this event has been completed
 * @todo Implement this type fully with proper event data
 */
interface UniqueEvent {
    id: string;
    name: MapEvents;
    description: string;
    nodeLocation: [number, number];
    completed: boolean;
    // TODO: Add more properties as needed (rewards, requirements, etc.)
}

/**
 * Node Id is in the form of "mapAcronym-number"
 * @example "fv-1"
 */
type NodeId = string;

/**
 * MapNode represents a location on a map that can be traversed by the player.
 * @property id             - Unique identifier for this node (e.g. "fv-1")
 * @property type           - What is triggered when the player arrives at this node
 * @property location       - [x, y] coordinates used by the frontend renderer
 * @property connectedNodes - IDs of nodes reachable from this one (directed graph)
 * @property eventId        - Optional reference to a specific event/encounter in the library.
 *                            If absent, a random eligible event for this node's type is used.
 */
export interface MapNode {
    id: NodeId;
    type: MapEvents;
    location: [number, number];
    connectedNodes: NodeId[];
    eventId?: string;
}

/**
 * Map is the static definition of a traversable area — its nodes, layout,
 * possible events, and visual assets. Contains no runtime state.
 *
 * Runtime progress (which nodes are completed/available/locked) lives in
 * MapState so this definition is always reusable across play-throughs.
 *
 * @property name            - The name of the map/area
 * @property continent       - The continent the map is located on
 * @property description     - A brief description of the map's theme or setting
 * @property nodes           - All MapNode objects in this map (the full node graph)
 * @property startNodeId     - ID of the entry node (type === 'start')
 * @property exitNodeId      - ID of the exit node (type === 'exit')
 * @property availableEvents - Pool of events that can fire on eligible nodes
 * @property uniqueEvents    - One-time events tied to specific node locations
 * @property enemies         - Enemies that can appear in encounter nodes on this map
 * @property npcs            - NPCs that can be interacted with on this map
 * @property images          - Optional visual assets (exploration view + combat backdrop)
 * @todo Create a collection of maps
 */
export interface Map {
    name: MapName;
    continent: ContinentName;
    description: string;
    nodes: MapNode[];
    startNodeId: NodeId;
    exitNodeId: NodeId;
    availableEvents: MapEvent[];
    uniqueEvents: UniqueEvent[];
    enemies?: Enemy[];
    npcs?: NPC[];
    images?: {
        mapImage: Image;
        combatImage: Image;
    };
}

/**
 * MapState tracks a player's runtime progress through a Map.
 * Separated from the static Map definition so maps are reusable across runs.
 *
 * @property mapName         - Which map this state belongs to
 * @property completedNodes  - Nodes the player has already visited and resolved
 * @property availableNodes  - Nodes currently reachable from the player's position
 * @property lockedNodes     - Nodes not yet reachable
 * @property currentNodeId   - The node the player is currently standing on
 */
export interface MapState {
    mapName: MapName;
    completedNodes: NodeId[];
    availableNodes: NodeId[];
    lockedNodes: NodeId[];
    currentNodeId: NodeId;
}


/**
 * Continent is a section of the World Map that contains a 
 * collection of maps.
 * @property name - The name of the continent
 * @property description - A brief description of the continent's theme or setting
 * @property availableMaps - The maps that are available to the player on this continent
 * @property lockedMaps - The maps that are locked and cannot be accessed yet
 * @property completedMaps - The maps that have been completed by the player
 * @todo Create a collection of continents
 */
export interface Continent {
    name: ContinentName;
    description: string;
    availableMaps: MapName[];
    lockedMaps: MapName[];
    completedMaps: MapName[];
}

/**
 * World is the aggregation of all world states to maintain
 * a single source of truth for all parts of the world.
 * @property world            - Array of all continents available in the game world
 * @property currentContinent - The current continent the player is on
 * @property currentMap       - The static definition of the map the player is on
 * @property currentMapState  - The player's runtime progress through the current map
 */
export type WorldState = {
    world: Continent[];
    currentContinent: Continent;
    currentMap: Map;
    currentMapState: MapState;
}