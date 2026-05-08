/**
 * Runtime type guards.
 */

import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { CombatState } from '../Combat/types';
import { GameState } from '../Game/types';

/** True if `entity` is a Character (has `nonCombatStats`). */
export function isCharacter(entity: Character | Enemy): entity is Character {
    return 'nonCombatStats' in entity;
}

/** True if `entity` is an Enemy (has `logic`). */
export function isEnemy(entity: Character | Enemy): entity is Enemy {
    return 'logic' in entity;
}

/** Narrow GameState to one with an active combat encounter. */
export function isCombatActive(state: GameState): state is GameState & { combat: CombatState } {
    return state.combat !== null;
}
