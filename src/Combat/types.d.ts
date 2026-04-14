import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';

export type Stance = 'heart' | 'body' | 'mind';
export type Action = 'attack' | 'defend' | 'skill' | 'item' | 'flee' | 'back';
export type Advantage = 'advantage' | 'neutral' | 'disadvantage';
export type CritStyle = 'double' | 'pierce';

export interface CombatAction {
    type: Stance;
    action: Action;
    skill?: string | 'back';
}

export type CombatPhase = 'choosing_type' | 'choosing_action' | 'choosing_skill' | 'resolving' | 'ended';

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
