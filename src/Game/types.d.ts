import { CombatState } from '../Combat/types';
import { WorldState, QuestLog, Encounter } from '../World/types';
import { Character } from '../Character/types';
import { PhilosophicalAlignment } from '../Philosophy/types';

/**
 * Top-level game state. The root object that aggregates the player,
 * the world, any in-progress combat, the quest log, and world flags.
 *
 * @property version          - Schema version, incremented on breaking changes
 *                              so save files can be migrated.
 * @property combat           - The active combat encounter, or `null` when not
 *                              in combat.
 * @property currentEncounter - Spec 07 — the full encounter the player is
 *                              fighting. Carries multi-enemy info plus the
 *                              origin tag so `END_COMBAT` can roll loot and
 *                              advance kill objectives. Transient: excluded
 *                              from persisted saves (encounters re-roll on
 *                              load).
 * @property quests           - Player's quest log (Spec 08 Q7B per-objective
 *                              tracking).
 * @property flags            - Generic world flags set by dialogue / events.
 *                              Used by dialogue `requires.flag` gates and by
 *                              quest objectives of type `'flag'`.
 * @property moralMeter       - Moral choice difficulty meter (-100 to +100).
 *                              Tracks player alignment from choices: negative
 *                              values (ruthless), positive values (compassionate).
 *                              Affects available dialogue options and story paths.
 * @property rngState         - Current RNG seed state for deterministic replays.
 *                              Persisted and restored to maintain reproducible
 *                              random sequences across save/load cycles.
 * @property philosophicalAlignment - Three-axis alignment cube (Phase 42):
 *                              epistemology / outlook / scope, each integer
 *                              in [-100, +100], defaults 0/0/0. Buckets to
 *                              one of 27 cells in `philosophicalAlignmentLibrary`.
 *                              Orthogonal to `moralMeter` — see docs/philosophy.md.
 */
export interface GameState {
    version: number;
    player: Character;
    world: WorldState;
    combat: CombatState | null;
    currentEncounter?: Encounter;
    quests: QuestLog;
    flags: string[];
    moralMeter: number;
    rngState: number;
    philosophicalAlignment: PhilosophicalAlignment;
}
