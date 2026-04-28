/**
 * Combat module type definitions
 *
 * This module contains types for the combat mechanics, including:
 * - Combat state and flow
 * - Turn order and initiative
 * - Combat actions and abilities
 * - Damage calculation
 * - Status effect and buff triggers
 * - Combat results and outcomes
 */

import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';

/**
 * The three combat stances a combatant can adopt each round.
 * Follows rock-paper-scissors mechanics: Heart > Body > Mind > Heart (cyclic advantage)
 * - 'heart': Emotional options (strong against body)
 * - 'body': Physical options (strong against mind)
 * - 'mind': Mental options (strong against heart)
 */
export type Stance = 'heart' | 'body' | 'mind';

/**
 * Combat action type determining the tactical approach
 * - 'attack': Offensive action to deal damage
 * - 'defend': Defensive action to reduce incoming damage
 * - 'skill': Use a skill
 * - 'item': Use an item
 * - 'flee': Flee the combat
 * - 'back': Go back to the previous menu
 */
export type Action = 'attack' | 'defend' | 'skill' | 'item' | 'flee' | 'back';

/**
 * Advantage result from type matchup in rock-paper-scissors combat
 * - 'advantage': Attacker has type advantage (e.g., heart vs body)
 * - 'neutral': Same types or no advantage
 * - 'disadvantage': Attacker has type disadvantage (e.g., heart vs mind)
 */
export type Advantage = 'advantage' | 'neutral' | 'disadvantage';

/**
 * How a critical hit (natural 20) resolves on an attack roll.
 * - 'double': Raw damage is doubled before subtracting the enemy's defense.
 * - 'pierce': Defense is ignored entirely — base damage lands unmitigated.
 * The system auto-selects whichever option deals more final damage.
 */
export type CritStyle = 'double' | 'pierce';

/**
 * Player's combat decision for a single round.
 * Combines stance and action to form a complete combat choice.
 * @property type - The stance (heart/body/mind) chosen for this round
 * @property action - The action (attack/defend/skill/item/flee) chosen for this round
 * @property skill - The skill chosen for this round (when action is 'skill')
 */
export interface CombatAction {
    type: Stance;
    action: Action;
    skill?: string | 'back';
}

/**
 * Combat phase state tracking the current stage of battle
 * - 'choosing_type': Player is selecting attack type (heart/body/mind)
 * - 'choosing_action': Player is selecting action (attack/defend/skill)
 * - 'choosing_skill': Player is selecting skill to use
 * - 'resolving': Combat round is being calculated and resolved
 * - 'ended': Combat has concluded
 */
export type CombatPhase = 'choosing_type' | 'choosing_action' | 'choosing_skill' | 'resolving' | 'ended';

/**
 * Trigger entry mapping a `Stance × Action` pair to a chance of applying
 * a Tier 2 or Tier 3 effect when the action lands.
 *
 * Used by `combat-effects.library.ts` to power the "physical attacks may
 * cause bleed" / "mental defends may grant evasion" matrix described in
 * `docs/combat.md`.
 *
 * @property effectId - ID of the effect from the effects library to apply
 * @property chance - Probability in [0, 1] that the trigger fires on a normal hit/defend
 * @property target - Where the effect lands when it fires:
 *   - 'self' — the actor (defender on defend, attacker on offensive triggers)
 *   - 'opponent' — the other combatant
 * @property critGuaranteed - When true, a natural-20 attack roll forces the trigger to fire
 *   regardless of `chance`. Used for "crit guarantees strongest proc."
 * @property fumbleSelfTarget - When true, a natural-1 attack roll fires the trigger but applies
 *   it to the actor instead of the opponent (self-debuff on fumble).
 */
export interface CombatEffectTrigger {
    effectId: string;
    chance: number;
    target: 'self' | 'opponent';
    critGuaranteed?: boolean;
    fumbleSelfTarget?: boolean;
}

/**
 * The log entry describing the result of a round of combat
 * @property round - The round the result occurred in
 * @property playerAction - The player's attack type and action
 * @property enemyAction - The enemy's attack type and action
 * @property advantage - The advantage result from type matchup
 * @property playerRoll - The value of the player's roll
 * @property playerRollDetails - How the player's roll was calculated
 * @property enemyRoll - The value of the enemy's roll
 * @property enemyRollDetails - How the enemy's roll was calculated
 * @property damageToPlayer - The damage dealt to the player
 * @property damageToEnemy - The damage dealt to the enemy
 * @property playerHPAfter - The player's HP after the round
 * @property enemyHPAfter - The enemy's HP after the round
 * @property result - A full description of the round's result
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
 * A State object to represent the current state of a combat
 * @property active - Whether the combat is active
 * @property phase - The current phase of the combat
 * @property round - The current round of the combat
 * @property friendshipCounter - The current friendship counter
 * @property player - The player character and the state of their hp/mp
 * @property enemy - The enemy character and the state of their hp/mp
 * @property playerChoice - The player's choice for the current round
 * @property enemyChoice - The enemy's choice for the current round
 * @property logEntry - The log of the combat
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
    logEntry: BattleLogEntry[];
}
