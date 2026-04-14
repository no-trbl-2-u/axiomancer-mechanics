import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { CombatState } from '../Combat/types';
import { GameState } from '../Game/types';

export function isCharacter(entity: Character | Enemy): entity is Character {
    return 'nonCombatStats' in entity;
}

export function isEnemy(entity: Character | Enemy): entity is Enemy {
    return 'logic' in entity;
}

export function isCombatActive(state: GameState): state is GameState & { combatState: CombatState } {
    return state.combatState !== null;
}
