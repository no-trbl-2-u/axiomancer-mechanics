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
 * MapEvents represents the types of events that can occur on a map
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
export type MapEvents = 'encounter' | 'boss-encounter' | 'event' | 'treasure' | 'gather' | 'quest' | 'shop' | 'npc' | 'other';

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
 * @property name - The type of event that occurs
 * @property description - Narration presented for event
 * @property nodeLocation - The coordinates of the node where this event occurs
 * @property completed - Whether or not this event has been completed
 * @todo Implement this type fully
 */
interface UniqueEvent {
    // name: MapEvents;
    // description: string;
    // nodeLocation: [number, number];
    // completed: boolean;
    // TODO: Implement more properties
    undefined
}

/**
 * Node Id is in the form of "mapAcronym-number"
 * @example "fv-1"
 */
type NodeId = string;

/**
 * MapNode represents a location on a map that can be traversed by the player
 * @property id - The unique identifier for this node
 * @property location - The coordinates of this node on the map
 * @property connectedNodes - The nodes that are connected to this node
 */
interface MapNode {
    id: NodeId;
    location: [number, number]
    connectedNodes: NodeId[];
}

/**
 * Map is a collection of map nodes that are traversable by the player
 * Represents a game area or level with encounters, events, and NPCs.
 * @property name - The name of the map/area
 * @property continent - The continent the map is located on
 * @property description - A brief description of the map's theme or setting
 * @property numberOfNodes - The number of nodes/locations on this map
 * @property enemies - A list of enemies that can be encountered on the map
 * @property events - Optional: list of events that can occur on the map (TODO: make mandatory)
 * @property npcs - Optional: list of NPCs that can be interacted with on the map (TODO: make mandatory)
 * @property images - Optional: visual assets for the map (mapImage for exploration, combatImage for battles)
 * @todo Create a collection of maps
 * @todo Implement "Node"
 */
export interface Map {
    name: MapName;
    continent: ContinentName;
    description: string;
    startingNode: MapNode;
    completedNodes: NodeId[] | [];
    availableNodes: NodeId[] | [];
    lockedNodes: NodeId[] | [];
    npcs?: NPC[];
    enemies?: Enemy[];
    availableEvents: MapEvent[];
    uniqueEvents: UniqueEvent[] | [];
    images?: {
        mapImage: Image,
        combatImage: Image
    }
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
    lockedMaps: MapName[] | [];
    completedMaps: MapName[] | [];
}

/**
 * World is the aggregation of all world states to maintain
 * a single source of truth for all parts of the world.
 * @property world - Array of all continents available in the game world
 * @property currentContinent - The current continent the player is on
 * @property currentMap - The current map the player is on
 */
export type WorldState = {
    world: Continent[];
    currentContinent: Continent;
    currentMap: Map;
}