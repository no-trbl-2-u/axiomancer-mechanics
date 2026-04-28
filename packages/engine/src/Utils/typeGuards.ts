/**
 * Type guard utilities for runtime type checking
 */

import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { CombatState } from '../Combat/types';
import { GameState } from '../Game/types';

/**
 * Type guard to check if an entity is a Character
 * @param entity - The entity to check
 * @returns True if entity is a Character
 */
export function isCharacter(entity: Character | Enemy): entity is Character {
    return 'nonCombatStats' in entity;
}

/**
 * Type guard to check if an entity is an Enemy
 * @param entity - The entity to check
 * @returns True if entity is an Enemy
 */
export function isEnemy(entity: Character | Enemy): entity is Enemy {
    return 'logic' in entity;
}

/**
 * Type guard to check if combat is currently active in the game state
 * @param state - The game state to check
 * @returns True if combat is active with proper CombatState
 */
export function isCombatActive(state: GameState): state is GameState & { combatState: CombatState } {
    return state.combatState !== null;
}
