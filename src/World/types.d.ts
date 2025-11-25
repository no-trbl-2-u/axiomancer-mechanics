import { Item } from 'Items/types';
import { Enemy } from '../Enemy/types'
import { Image } from '../Utils/types'

/**
 * MapEvents represents the types of events that can occur on a map
 * - 'encounter': Combat encounter with an enemy
 * - 'event': Story or scripted event
 * - 'treasure': Loot or item discovery
 * - 'gather': Resource gathering. Forced decision between gathering nodes
 * - 'quest': Quest-related event
 * - 'npc': NPC interaction
 * - 'other': Miscellaneous event type
 */
export type MapEvents = 'encounter' | 'event' | 'treasure' | 'gather' | 'quest' | 'npc' | 'other';

/**
 * Reward types that can be obtained from events or combat
 * - 'experience': Experience points for the player (typically from encounter, but can come from other sources)
 * - 'item': Items (e.g. equipment, consumables, materials, etc.)
 * - 'currency': Currency (e.g. gold, gems, tomes, etc.)
 * - 'skill': New abilities or skills
 * - 'quest': An attached quest for continued quest lines
 * - 'quest-item': An item that is required to progress in a quest
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
    enemy: Enemy;
    reward?: Reward;
}

/**
 * Map is a collection of map nodes that are traversable by the player
 * Represents a game area or level with encounters, events, and NPCs.
 * @property name - The name of the map/area
 * @property description - A brief description of the map's theme or setting
 * @property numberOfNodes - The number of nodes/locations on this map
 * @property enemies - A list of enemies that can be encountered on the map
 * @property events - Optional: list of events that can occur on the map (TODO: make mandatory)
 * @property npcs - Optional: list of NPCs that can be interacted with on the map (TODO: make mandatory)
 * @property images - Optional: visual assets for the map (mapImage for exploration, combatImage for battles)
 */
export interface Map {
    name: string;
    description: string;
    numberOfNodes: number;
    enemies: Enemy[];
    events?: MapEvent[]; // TODO: Make mandatory once implemented
    npcs?: NPC[]; // TODO: Make mandatory once implemented
    images?: {
        mapImage: Image,
        combatImage: Image
    }
}

/**
 * World is the aggregation of all world states to maintain
 * a single source of truth for all parts of the world.
 * @property maps - Array of all maps/areas available in the game world
 */
export type World = {
    maps: Map[];
}