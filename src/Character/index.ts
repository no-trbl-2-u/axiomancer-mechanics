import { Character, BaseStats } from './types';
import { ActiveEffect } from '../Effects/types';
import { ProcUnlocks } from '../Combat/combat-effects';
import { Equipment, EquipmentSlot, Item } from '../Items/types';
import { deriveStats, deriveNonCombatStats, calculateMaxHealth } from '../Utils';
import { EXPERIENCE_PER_LEVEL } from '../Game/game-mechanics.constants';
import { equipItem, getEquipmentModifiers, recomputeDerivedStats } from './equipment.reducer';

/**
 * Inputs required to create a new Character.
 */
export interface CreateCharacterOptions {
    name: string;
    level: number;
    baseStats: BaseStats;
    inventory?: Item[];
    /** Starting currency (Spec 08 Q8). Defaults to 0. */
    currency?: number;
    /**
     * Optional starting equipment, keyed by slot. Stat modifiers from each
     * piece are folded into the resulting `derivedStats` at character-create
     * time (Spec 05 Q3 option A) so the returned `Character` is already
     * "post-equipment".
     */
    equipment?: Partial<Record<EquipmentSlot, Equipment>>;
    effects?: ActiveEffect[];
    knownSkills?: string[];
    equippedSkills?: string[];
    procUnlocks?: ProcUnlocks;
}

/**
 * Builds a fully-initialised Character. Resources and derived stats are
 * computed automatically from `baseStats` and `level`.
 */
export function createCharacter(options: CreateCharacterOptions): Character {
    const {
        name, level, baseStats, inventory = [], currency = 0, equipment = {}, effects = [],
        knownSkills = [], equippedSkills = [], procUnlocks,
    } = options;

    const maxHealth = calculateMaxHealth(level, baseStats);

    const baseChar: Character = {
        name,
        level,
        experience: (level - 1) * EXPERIENCE_PER_LEVEL,
        experienceToNextLevel: level * EXPERIENCE_PER_LEVEL,
        health: maxHealth,
        maxHealth,
        baseStats,
        derivedStats: deriveStats(baseStats),
        nonCombatStats: deriveNonCombatStats(baseStats),
        inventory,
        currency,
        equipment: {},
        effects,
        knownSkills,
        equippedSkills,
        availableStatPoints: 0,
        procUnlocks,
    };

    // Equip every slot in `equipment` so stat modifiers and passive effects
    // get folded in via the canonical path.
    let initialised = baseChar;
    for (const slot of Object.keys(equipment) as EquipmentSlot[]) {
        const piece = equipment[slot];
        if (!piece) continue;
        initialised = equipItem(initialised, piece);
    }
    return initialised;
}

/**
 * Spec 06 Q3 — spend one entry from `availableStatPoints` to raise the
 * named base stat by 1, re-derive equipment-aware derived stats + non-
 * combat stats + maxHealth, and grow current HP by the maxHealth delta.
 *
 * Returns the unchanged character (and logs a warning at the call site,
 * not here) when `availableStatPoints <= 0`.
 *
 * Pure; equipment passives are not touched — only the base-stat math.
 */
export function allocateStatPoint(
    character: Character,
    stat: 'heart' | 'body' | 'mind',
): Character {
    if (character.availableStatPoints <= 0) return character;

    const nextBase: BaseStats = {
        ...character.baseStats,
        [stat]: character.baseStats[stat] + 1,
    };
    const mods = getEquipmentModifiers(character.equipment);
    const nextDerived = recomputeDerivedStats(nextBase, mods);
    const nextNonCombat = deriveNonCombatStats(nextBase);
    const nextMaxHealth = calculateMaxHealth(character.level, nextBase);
    // Grow current HP by the maxHealth delta — allocation isn't a free
    // heal, but neither does raising max-HP leave the player stuck below
    // the new ceiling.
    const hpDelta = nextMaxHealth - character.maxHealth;

    return {
        ...character,
        baseStats:           nextBase,
        derivedStats:        nextDerived,
        nonCombatStats:      nextNonCombat,
        maxHealth:           nextMaxHealth,
        health:              character.health + hpDelta,
        availableStatPoints: character.availableStatPoints - 1,
    };
}

export type { Character, BaseStats, DerivedStats, NonCombatStats } from './types';
export { equipItem, unequipItem, getEquipmentModifiers } from './equipment.reducer';
export type { AggregatedEquipmentModifiers } from './equipment.reducer';
export {
    characterPresets, apprenticePreset, wandererPreset, sagePreset,
    getPresetById, buildCharacterFromPreset,
} from './presets';
export type { CharacterPreset, CharacterPresetEquipmentEntry } from './presets';
