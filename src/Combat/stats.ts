/**
 * Stat lookups for combatants. Each helper takes a `Combatant` plus a
 * `Stance` and returns the appropriate value, abstracting over the
 * Character/Enemy split.
 */

import { isCharacter } from '../Utils/typeGuards';
import { Stance, Combatant } from './types';

/** Raw base stat (heart/body/mind) for a stance. */
export function getBaseStat(combatant: Combatant, stance: Stance): number {
    return combatant.baseStats[stance];
}

/** Attack value for the given stance, taken from derivedStats. */
export function getAttackStat(combatant: Combatant, stance: Stance): number {
    switch (stance) {
        case 'body':  return combatant.derivedStats.physicalAttack;
        case 'mind':  return combatant.derivedStats.mentalAttack;
        case 'heart': return combatant.derivedStats.emotionalAttack;
    }
}

/** Defense value for the given stance, taken from derivedStats. */
export function getDefenseStat(combatant: Combatant, stance: Stance): number {
    switch (stance) {
        case 'body':  return combatant.derivedStats.physicalDefense;
        case 'mind':  return combatant.derivedStats.mentalDefense;
        case 'heart': return combatant.derivedStats.emotionalDefense;
    }
}

/**
 * Saving-throw value for the given stance. Characters have dedicated saves;
 * enemies don't, so they fall back to their defense for that stance.
 */
export function getSaveStat(combatant: Combatant, stance: Stance): number {
    if (isCharacter(combatant)) {
        switch (stance) {
            case 'body':  return combatant.nonCombatStats.physicalSave;
            case 'mind':  return combatant.nonCombatStats.mentalSave;
            case 'heart': return combatant.nonCombatStats.emotionalSave;
        }
    }
    return getDefenseStat(combatant, stance);
}

/**
 * Returns the value used to resist an effect of the given stance.
 * Defenders' baseStats[stance] is the canonical resist stat.
 */
export function getResistStat(combatant: Combatant, resistedBy: Stance): number {
    return combatant.baseStats[resistedBy];
}
