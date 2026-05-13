import { Item } from '../Items/types';
import { Enemy } from '../Enemy/types';
import { Image } from '../Utils/types';
import { ContinentName, MapName } from './map.library';
import { QuestName } from './quest.library';
import { NPC } from '../NPCs/types';

/**
 * A reward grantable on event/combat completion. Either a tag (`'experience'`,
 * `'currency'`, `'skill'`, `'quest'`) or a concrete `Item`.
 */
export type Reward = 'experience' | 'currency' | 'skill' | 'quest' | Item;

/**
 * A combat encounter (Spec 07 Q5B). Wraps the list of enemies that take
 * part in the fight plus any encounter-level rewards beyond the per-enemy
 * `xpReward` / `loot` tables.
 *
 * The engine is 1v1 today — `enemies` carries a single entry. The list shape
 * is retained so future multi-enemy fights can land without touching every
 * call site that passes an encounter around.
 *
 * @property enemies  - Enemies in the encounter (length 1 today).
 * @property rewards  - Optional bonus rewards layered on top of per-enemy
 *                      drops. Useful for "first-time" rewards on a node, or
 *                      quest-driven guaranteed grants.
 * @property origin   - Optional source label (`<mapName>:<nodeId>`) so the
 *                      world can attribute the encounter to a specific node.
 */
export interface Encounter {
    enemies: Enemy[];
    rewards?: Reward[];
    origin?: string;
}

/**
 * Type of event that can occur on a map node. The actual event handler is
 * driven by an event registry (TODO).
 */
export type MapEventType =
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
 * A quest in the game world.
 *
 * @property mapName        - The map where the quest takes place.
 * @property reward         - Granted upon completion.
 * @property nextQuest      - Next quest in a chain, if any.
 */
export interface Quest {
    name: QuestName;
    description: string;
    mapName: MapName;
    reward: Reward;
    nextQuest?: QuestName;
}

/**
 * An event that can occur on a map node.
 *
 * @property type    - Discriminator for the event kind.
 * @property enemy   - Encountered enemy (only for `encounter`/`boss-encounter`).
 * @property reward  - Optional reward granted on completion.
 */
export interface MapEvent {
    type: MapEventType;
    description: string;
    enemy?: Enemy;
    reward?: Reward;
}

/**
 * An event that can only occur once per save.
 */
export interface UniqueEvent {
    id: string;
    type: MapEventType;
    description: string;
    nodeLocation: [number, number];
    completed: boolean;
}

/** Node IDs are formatted as `<map-acronym>-<number>`, e.g. `"fv-1"`. */
export type NodeId = string;

/** A traversable location on a map. */
export interface MapNode {
    id: NodeId;
    location: [number, number];
    connectedNodes: NodeId[];
}

/**
 * A traversable game area. Renamed from `Map` to avoid shadowing the JS
 * built-in `Map` constructor inside this module.
 *
 * @property startingNode    - Entry node when the player arrives.
 * @property completedNodes  - Nodes the player has fully resolved.
 * @property availableNodes  - Nodes currently traversable.
 * @property lockedNodes     - Nodes not yet unlocked.
 */
export interface WorldMap {
    name: MapName;
    continent: ContinentName;
    description: string;
    startingNode: MapNode;
    completedNodes: NodeId[];
    availableNodes: NodeId[];
    lockedNodes: NodeId[];
    npcs?: NPC[];
    enemies?: Enemy[];
    availableEvents: MapEvent[];
    uniqueEvents: UniqueEvent[];
    images?: { mapImage: Image; combatImage: Image };
}

/**
 * @deprecated Use `WorldMap`. Kept as an alias to avoid breaking older imports.
 */
export type Map = WorldMap;

/**
 * A region containing several maps.
 */
export interface Continent {
    name: ContinentName;
    description: string;
    availableMaps: MapName[];
    lockedMaps: MapName[];
    completedMaps: MapName[];
}

/**
 * Aggregate world state — the catalogue of continents plus the current
 * navigation context.
 */
export interface WorldState {
    world: Continent[];
    currentContinent: Continent;
    currentMap: WorldMap;
}
