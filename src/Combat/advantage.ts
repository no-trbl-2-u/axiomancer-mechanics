/**
 * Type-advantage system. Heart > Body > Mind > Heart (cyclic).
 */

import { Stance, Advantage } from './types';

/** Returns the advantage relationship of `attacker` against `defender`. */
export function determineAdvantage(attacker: Stance, defender: Stance): Advantage {
    if (attacker === defender) return 'neutral';
    if (attacker === 'heart' && defender === 'body') return 'advantage';
    if (attacker === 'body'  && defender === 'mind') return 'advantage';
    if (attacker === 'mind'  && defender === 'heart') return 'advantage';
    return 'disadvantage';
}

/** Convenience: true iff the attacker has type advantage. */
export function hasAdvantage(attacker: Stance, defender: Stance): boolean {
    return determineAdvantage(attacker, defender) === 'advantage';
}

/** Flat roll modifier corresponding to an advantage state (+2 / 0 / -2). */
export function getAdvantageModifier(advantage: Advantage): number {
    switch (advantage) {
        case 'advantage':    return 2;
        case 'disadvantage': return -2;
        default:             return 0;
    }
}
