import { CombatState } from '../Combat/types';
import { WorldState } from '../World/types';
import { Character } from '../Character/types';

/**
 * Top-level game state. The root object that aggregates the player,
 * the world, and any in-progress combat.
 *
 * @property version - Schema version, incremented on breaking changes so save
 *                     files can be migrated.
 * @property combat  - The active combat encounter, or `null` when not in combat.
 */
export interface GameState {
    version: number;
    player: Character;
    world: WorldState;
    combat: CombatState | null;
}
