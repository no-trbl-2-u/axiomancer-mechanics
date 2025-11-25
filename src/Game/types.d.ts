import { CombatState } from "../Combat/types";
import { World } from "../World/types";
import { Character } from "../Character/types";

/**
 * Game module type definitions
 * 
 * This module contains the top-level game state that aggregates
 * all major game systems (player, world, combat).
 */

/**
 * GameState represents the complete state of the game
 * This is the root state object that contains all game data.
 * @property player - The player character with all their stats and progression
 * @property world - The game world containing all maps, NPCs, and events
 * @property combatState - The current combat state (if in combat) or inactive combat state
 */
export interface GameState {
    player: Character;
    world: World;
    combatState: CombatState;
}