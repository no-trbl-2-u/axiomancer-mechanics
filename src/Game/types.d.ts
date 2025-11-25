import { CombatState } from "../Combat/types";
import { WorldState } from "../World/types";
import { Character } from "../Character/types";

/**
 * Game module type definitions
 * 
 * This module contains the top-level game state that aggregates
 * all major game systems (player, world, combat).
 */

/**
 * Combat state action types
 */
export type CombatStateActionType =
    'combat/attack' |
    'combat/defend' |
    'combat/skill' |
    'combat/item' |
    'combat/flee' |
    'combat/back' |
    'combat/start' |
    'combat/end' |
    'combat/nextPhase';

/**
 * Character state action types
 */
export type CharacterStateActionType =
    'character/levelUp' |
    'character/takeDamage' |
    'character/heal' |
    'character/restoreMana' |
    'character/spendMana' |
    'character/updateStats';

/**
 * World state action types
 */
export type WorldStateActionType =
    'world/changeMap' |
    'world/addQuest' |
    'world/completeQuest' |
    'world/updateNPC' |
    'world/triggerEvent';

/**
 * Composed game action type from all state domains
 */
export type GameActionType =
    CombatStateActionType |
    CharacterStateActionType |
    WorldStateActionType;

/**
 * GameAction represents an action that can be dispatched to update game state
 * @property type - The action type identifier from one of the state domains
 * @property payload - Optional data associated with the action
 */
export interface GameAction {
    type: GameActionType;
    payload?: any;
}

/**
 * GameState represents the complete state of the game
 * This is the root state object that contains all game data.
 * @property player - The player character with all their stats and progression
 * @property world - The game world containing all maps, NPCs, and events
 * @property combatState - The current combat state (if in combat) or inactive combat state
 */
export interface GameState {
    player: Character;
    world: WorldState;
    combatState: CombatState;
}