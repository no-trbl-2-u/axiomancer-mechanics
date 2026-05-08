import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';

/**
 * The three stances. Combat works as rock-paper-scissors:
 * `heart` > `body` > `mind` > `heart`.
 */
export type Stance = 'heart' | 'body' | 'mind';

/**
 * The action a combatant performs each round.
 * - `attack` deals damage based on the attacker's stance.
 * - `defend` reduces incoming damage based on the defender's stance.
 * - `skill`  uses a learned skill (consumes mana).
 * - `item`   uses an item from the inventory.
 * - `flee`   attempts to leave combat.
 */
export type Action = 'attack' | 'defend' | 'skill' | 'item' | 'flee';

/**
 * The advantage state of a roll, from the attacker's perspective.
 * - `advantage`    — the attacker's stance counters the defender's.
 * - `neutral`      — same stance or no relationship.
 * - `disadvantage` — the defender's stance counters the attacker's.
 */
export type Advantage = 'advantage' | 'neutral' | 'disadvantage';

/**
 * How a critical hit resolves on an attack roll.
 * `double` doubles raw damage before defence. `pierce` ignores defence entirely.
 */
export type CritStyle = 'double' | 'pierce';

/**
 * A combatant's choice for a single round: their stance plus their action.
 *
 * @property stance - heart/body/mind.
 * @property action - attack/defend/skill/item/flee.
 * @property skill  - Skill ID, only set when `action` is `'skill'`.
 */
export interface CombatAction {
    stance: Stance;
    action: Action;
    skill?: string;
}

/**
 * The current phase of a combat encounter.
 * - `choosing_stance` — selecting heart/body/mind.
 * - `choosing_action` — selecting attack/defend/skill/item/flee.
 * - `choosing_skill`  — selecting a skill (when action is 'skill').
 * - `resolving`       — round resolution in progress.
 * - `ended`           — combat is over.
 */
export type CombatPhase =
    | 'choosing_stance'
    | 'choosing_action'
    | 'choosing_skill'
    | 'resolving'
    | 'ended';

/**
 * A record of one resolved round, suitable for the battle log.
 */
export interface BattleLogEntry {
    round: number;
    playerAction: CombatAction;
    enemyAction: CombatAction;
    advantage: Advantage;
    playerRoll: number;
    playerRollDetails: string;
    enemyRoll: number;
    enemyRollDetails: string;
    damageToPlayer: number;
    damageToEnemy: number;
    playerHPAfter: number;
    enemyHPAfter: number;
    result: string;
}

/**
 * Snapshot of a combat encounter in progress.
 *
 * Both `player` and `enemy` are deep-cloned at combat start so mutations
 * during the fight don't leak back into the root game state until combat ends.
 *
 * @property active            - True while combat is in progress.
 * @property phase             - Current step within the round.
 * @property round             - 1-indexed round number.
 * @property friendshipCounter - Increments when both combatants defend.
 * @property playerChoice      - Player's choice for the current round (built up over phases).
 * @property enemyChoice       - Enemy's choice for the current round.
 * @property log               - Resolved-round entries, oldest first.
 */
export interface CombatState {
    active: boolean;
    phase: CombatPhase;
    round: number;
    friendshipCounter: number;
    player: Character;
    enemy: Enemy;
    playerChoice: Partial<CombatAction>;
    enemyChoice: Partial<CombatAction>;
    log: BattleLogEntry[];
}

/**
 * Convenience union for utilities that operate on either a player or an enemy.
 */
export type Combatant = Character | Enemy;
