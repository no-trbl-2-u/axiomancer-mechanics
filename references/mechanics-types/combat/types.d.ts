/**
 * Combat System Types
 * Rock-paper-scissors combat: Heart > Body > Mind > Heart
 */

import { Character } from '../character/types';
import { Enemy } from '../enemy/types';

/**
 * Combat type representing the three approaches to conflict
 * Heart > Body > Mind > Heart (cyclic advantage)
 */
export type CombatType = 'heart' | 'body' | 'mind';

/**
 * Combat action type
 */
export type CombatActionType = 'attack' | 'defend';

/**
 * Advantage result from type matchup
 */
export type AdvantageType = 'player' | 'enemy' | 'none';

/**
 * Combat phase state
 */
export type CombatPhase = 'choosing_type' | 'choosing_action' | 'resolving' | 'ended';

/**
 * Player's combat decision for a single round
 */
export interface CombatDecision {
  type: CombatType;
  action: CombatActionType;
}

/**
 * Battle log entry recording a single round's results
 */
export interface BattleLogEntry {
  round: number;
  playerDecision: CombatDecision;
  enemyDecision: CombatDecision;
  advantage: AdvantageType;
  playerRoll?: number;
  playerRollDetails?: string;
  enemyRoll?: number;
  enemyRollDetails?: string;
  damageToPlayer: number;
  damageToEnemy: number;
  playerHPAfter: number;
  enemyHPAfter: number;
  result: string;
  timestamp: number;
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
  playerChoice: Partial<CombatDecision>;
  enemyChoice: Partial<CombatDecision>;
  logEntry: BattleLogEntry[];
}

/**
 * Combat resolution result for a single round
 */
export interface CombatResolutionResult {
  advantage: AdvantageType;
  playerRoll?: number;
  playerRollDetails?: string;
  enemyRoll?: number;
  enemyRollDetails?: string;
  damageToPlayer: number;
  damageToEnemy: number;
  result: string;
  friendshipIncrement: boolean;
}
