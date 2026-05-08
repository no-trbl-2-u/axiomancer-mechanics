/**
 * Health helpers shared by Character and Enemy. All functions are pure and
 * preserve the input combatant's discriminant (Character vs Enemy).
 */

import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { Combatant } from './types';

/** Returns a copy of the combatant with `damage` subtracted from health (clamped at 0). */
export function applyDamage<T extends Combatant>(combatant: T, damage: number): T {
    return { ...combatant, health: Math.max(0, combatant.health - damage) };
}

/** Returns a copy of the combatant with `amount` healed (clamped at maxHealth). */
export function heal<T extends Combatant>(combatant: T, amount: number): T {
    return { ...combatant, health: Math.min(combatant.maxHealth, combatant.health + amount) };
}

/** True if the combatant has positive health remaining. */
export function isAlive(combatant: Combatant): boolean { return combatant.health > 0; }

/** True if the combatant has been defeated (health ≤ 0). */
export function isDefeated(combatant: Combatant): boolean { return combatant.health <= 0; }

/** Health as a percentage (0-100) of max. */
export function getHealthPercentage(combatant: Combatant): number {
    return (combatant.health / combatant.maxHealth) * 100;
}

// Backwards-compat alias used in older callers.
export const healCharacter: {
    (c: Character, amount: number): Character;
    (c: Enemy, amount: number): Enemy;
} = heal as unknown as {
    (c: Character, amount: number): Character;
    (c: Enemy, amount: number): Enemy;
};
