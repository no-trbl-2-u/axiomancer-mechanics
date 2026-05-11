import { Item } from '../Items/types';
import { ActiveEffect } from '../Effects/types';
import { ProcUnlocks } from '../Combat/combat-effects';

/**
 * The three core attributes from which all other character/enemy stats derive.
 *
 * @property heart - Emotion, willpower, charisma. Strong against `body`.
 * @property body  - Physical strength and constitution. Strong against `mind`.
 * @property mind  - Intelligence, reflexes, perception. Strong against `heart`.
 */
export interface BaseStats {
    heart: number;
    body: number;
    mind: number;
}

/**
 * Combat stats derived from BaseStats. Each stance contributes three values:
 * `*Attack` (used in attack rolls), `*Skill` (used by skills/philosophy),
 * and `*Defense` (used as damage reduction).
 *
 * `luck` is the average of the three base stats and gates random outcomes.
 */
export interface DerivedStats {
    physicalAttack: number;
    physicalSkill: number;
    physicalDefense: number;
    mentalAttack: number;
    mentalSkill: number;
    mentalDefense: number;
    emotionalAttack: number;
    emotionalSkill: number;
    emotionalDefense: number;
    luck: number;
}

/**
 * Out-of-combat stats — saving throws and ability tests. Player-only.
 * Saves resist effects of that stance; tests are general ability checks.
 */
export interface NonCombatStats {
    physicalSave: number;
    physicalTest: number;
    mentalSave: number;
    mentalTest: number;
    emotionalSave: number;
    emotionalTest: number;
}

/**
 * The player character.
 *
 * @property level                  - Determines stat scaling and abilities.
 * @property experience             - Total XP earned.
 * @property experienceToNextLevel  - XP threshold for the next level-up.
 * @property baseStats              - Heart/Body/Mind core attributes.
 * @property derivedStats           - Combat stats derived from baseStats.
 * @property nonCombatStats         - Saves and ability tests.
 * @property inventory              - Items the character is carrying.
 * @property effects                - Active status effects on the character.
 */
export interface Character {
    name: string;
    level: number;
    experience: number;
    experienceToNextLevel: number;
    health: number;
    maxHealth: number;
    mana: number;
    maxMana: number;
    baseStats: BaseStats;
    derivedStats: DerivedStats;
    nonCombatStats: NonCombatStats;
    inventory: Item[];
    effects: ActiveEffect[];
    /**
     * Per-cell Spec 03 proc unlock caps. Defaults to tier 1 in every cell —
     * basic actors only roll the lowest-tier proc table entries. Skills /
     * progression in Spec 04 / 06 raise the cap to unlock T2 / T3 entries.
     */
    procUnlocks?: ProcUnlocks;
}
