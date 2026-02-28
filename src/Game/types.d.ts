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
 * GameState represents the complete state of the game.
 * This is the root state object that contains all game data.
 *
 * @property version     - Schema version. Increment when the shape changes so
 *                         save-file migrations can be applied without data loss.
 * @property player      - The player character with all their stats and progression
 * @property world       - The game world containing all maps, NPCs, and events
 * @property combatState - The current combat state (if in combat) or null (inactive)
 */
export interface GameState {
    version: number;
    player: Character;
    world: WorldState;
    combatState: CombatState | null;
}