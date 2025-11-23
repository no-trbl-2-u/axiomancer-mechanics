/**
 * Combat module type definitions
 * 
 * This module contains types for combat mechanics, including:
 * - Combat state and flow
 * - Turn order and initiative
 * - Combat actions and abilities
 * - Damage calculation
 * - Combat results and outcomes
 */

/**
 * Combat System Types
 * Rock-paper-scissors combat: Heart > Body > Mind > Heart
 */

import { Character } from '@Character/types';
import { Enemy } from '@Enemy/types';


/**
 * Combat type representing the three approaches to conflict
 * Heart > Body > Mind > Heart (cyclic advantage)
 */
export type AttackType = 'heart' | 'body' | 'mind';

/**
 * Combat action type
 */
export type AttackAction = 'attack' | 'defend';

/**
 * Advantage result from type matchup
 */
export type Advantage = 'advantage' | 'disadvantage' | 'neutral';

/**
 * Combat phase state
 */
export type CombatPhase = 'choosing_type' | 'choosing_action' | 'resolving' | 'ended';

/**
 * Player's combat decision for a single round
 */
export interface CombatAction {
    type: AttackType;
    action: AttackAction;
}

/**
 * Battle log entry recording a single round's results
 */
export interface BattleLogEntry {
    round: number;
    playerAction: CombatAction;
    enemyAction: CombatAction;
    advantage: Advantage;
    playerRoll?: number;
    playerRollDetails?: string;
    enemyRoll?: number;
    enemyRollDetails?: string;
    damageToPlayer: number;
    damageToEnemy: number;
    playerHPAfter: number;
    enemyHPAfter: number;
    result: string;
}

/**
 * Combat state for active battle
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
