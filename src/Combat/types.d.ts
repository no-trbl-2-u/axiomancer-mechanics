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


import { Character } from '@Character/types';
import { Enemy } from '@Enemy/types';


/**
 * Combat type representing the three approaches to conflict
 * Follows rock-paper-scissors mechanics: Heart > Body > Mind > Heart (cyclic advantage)
 * - 'heart': Emotional options (strong against body)
 * - 'body': Physical options (strong against mind)
 * - 'mind': Mental options (strong against heart)
 */
export type ActionType = 'heart' | 'body' | 'mind';

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
 * Player's combat decision for a single round
 * Combines attack type and action to form a complete combat choice.
 * @property type - The attack type (heart/body/mind) chosen for this round
 * @property action - The action (attack/defend) chosen for this round
 * @property skill - The skill chosen for this round
 */
export interface CombatAction {
    type: ActionType;
    action: Action;
    skill?: string | 'back'; // TODO: Create type for skill, then create an ENUM of skills
}

/**
 * Combat phase state tracking the current stage of battle
 * - 'choosing_type': Player is selecting attack type (heart/body/mind)
 * - 'choosing_action': Player is selecting action (attack/defend/skill)
 * - 'choosing_skill': Player is selecting skill to use
 * - 'resolving': Combat round is being calculated and resolved
 * - 'ended': Combat has concluded
 * - null: No active combat
 */
export type CombatPhase = 'choosing_type' | 'choosing_action' | 'choosing_skill' | 'resolving' | 'ended' | null;


/**
 * The log to describe the result of a round of combat
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
