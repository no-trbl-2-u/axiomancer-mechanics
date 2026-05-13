import { CombatState } from '../Combat/types';
import { WorldState, QuestLog } from '../World/types';
import { Character } from '../Character/types';

/**
 * Top-level game state. The root object that aggregates the player,
 * the world, any in-progress combat, the quest log, and world flags.
 *
 * @property version - Schema version, incremented on breaking changes so save
 *                     files can be migrated.
 * @property combat  - The active combat encounter, or `null` when not in combat.
 * @property quests  - Player's quest log (Spec 08 Q7B per-objective tracking).
 * @property flags   - Generic world flags set by dialogue / events. Used by
 *                     dialogue `requires.flag` gates and by quest objectives
 *                     of type `'flag'`.
 */
export interface GameState {
    version: number;
    player: Character;
    world: WorldState;
    combat: CombatState | null;
    quests: QuestLog;
    flags: string[];
}
