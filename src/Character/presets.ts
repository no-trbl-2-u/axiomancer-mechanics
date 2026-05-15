/**
 * Character presets — curated progression tiers selectable at boot.
 *
 * Each preset is a declarative recipe. `buildCharacterFromPreset` lifts
 * the recipe into a real `Character` by calling `createCharacter`
 * through the canonical path: equipment is constructed via
 * `dropItem(templateId, level, 'common')` so stat folding goes through
 * the same code combat uses, and consumables are cloned from the
 * shared `consumableLibrary` so the canonical library is never
 * mutated.
 *
 * Common rarity returns an empty rolled-modifier list (Spec 05d), so
 * shipped preset builds are deterministic. The `rng` parameter exists
 * for future presets that carry Uncommon+ equipment.
 */

import { Character, BaseStats } from './types';
import { createCharacter } from './index';
import { dropItem } from '../Items/item.factory';
import { consumableLibrary } from '../Items/consumable.library';
import type { EquipmentSlot, Equipment, Item } from '../Items/types';

export interface CharacterPresetEquipmentEntry {
    /** EquipmentTemplate id (e.g. 'iron-blade'). */
    templateId: string;
    slot: EquipmentSlot;
}

export interface CharacterPreset {
    id: string;
    name: string;
    /** Short blurb shown in the picker. */
    summary: string;
    level: number;
    baseStats: BaseStats;
    /** Equipment to drop and equip. Each slot is filled at 'common' rarity. */
    equipment: CharacterPresetEquipmentEntry[];
    /** Skill IDs the character knows. */
    knownSkills: string[];
    /** Skill IDs in active rotation (must be subset of knownSkills, ≤4). */
    equippedSkills: string[];
    /** Consumable IDs (and quantities) to seed the inventory. */
    consumables: { id: string; quantity: number }[];
    currency: number;
}

// ─── Preset records ───────────────────────────────────────────────────────────

const TIER_1_SKILLS = [
    'ad-hominem-strike',
    'false-dilemma',
    'appeal-to-pity',
    'achilles-gambit',
    'liars-echo',
    'ship-of-theseus',
];

const TIER_2_SKILLS = [
    'mob-appeal',
    'undistributed-middle',
    'eternal-regress',
];

const TIER_3_SKILLS = [
    'sorites-cascade',
    'straw-giant',
    'bootstrap-paradox',
];

export const apprenticePreset: CharacterPreset = {
    id: 'apprentice',
    name: 'Apprentice',
    summary: 'Just stepping out — balanced stats, basic skills, no gear.',
    level: 1,
    baseStats: { heart: 3, body: 2, mind: 2 },
    equipment: [],
    knownSkills: [...TIER_1_SKILLS],
    equippedSkills: TIER_1_SKILLS.slice(0, 4),
    consumables: [
        { id: 'minor-healing-potion', quantity: 3 },
    ],
    currency: 0,
};

export const wandererPreset: CharacterPreset = {
    id: 'wanderer',
    name: 'Wanderer',
    summary: 'Mid-game — light armor, mixed-tier skills, a pouch of coin.',
    level: 8,
    baseStats: { heart: 5, body: 4, mind: 4 },
    equipment: [
        { templateId: 'iron-blade',  slot: 'weapon' },
        { templateId: 'hide-vest',   slot: 'armor'  },
        { templateId: 'leather-cap', slot: 'head'   },
    ],
    knownSkills: [...TIER_1_SKILLS, ...TIER_2_SKILLS],
    equippedSkills: [
        'ad-hominem-strike',
        'ship-of-theseus',
        'mob-appeal',
        'undistributed-middle',
    ],
    consumables: [
        { id: 'healing-potion', quantity: 5 },
        { id: 'antidote',       quantity: 2 },
    ],
    currency: 25,
};

export const sagePreset: CharacterPreset = {
    id: 'sage',
    name: 'Sage',
    summary: 'Late-game — mid-tier kit, every skill known, paradox in reach.',
    level: 15,
    baseStats: { heart: 7, body: 6, mind: 6 },
    equipment: [
        { templateId: 'steel-blade', slot: 'weapon' },
        { templateId: 'chain-mail',  slot: 'armor'  },
        { templateId: 'chain-coif',  slot: 'head'   },
    ],
    knownSkills: [...TIER_1_SKILLS, ...TIER_2_SKILLS, ...TIER_3_SKILLS],
    equippedSkills: [
        'liars-echo',
        'mob-appeal',
        'sorites-cascade',
        'bootstrap-paradox',
    ],
    consumables: [
        { id: 'healing-potion', quantity: 6 },
        { id: 'clarity-serum',  quantity: 2 },
        { id: 'focus-vial',     quantity: 2 },
    ],
    currency: 75,
};

export const characterPresets: CharacterPreset[] = [
    apprenticePreset, wandererPreset, sagePreset,
];

export function getPresetById(id: string): CharacterPreset | undefined {
    return characterPresets.find(p => p.id === id);
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildCharacterFromPreset(
    preset: CharacterPreset,
    rng: () => number = Math.random,
): Character {
    const inventory: Item[] = preset.consumables.map(({ id, quantity }) => {
        const source = consumableLibrary.find(c => c.id === id);
        if (!source) {
            throw new Error(`buildCharacterFromPreset: unknown consumable id '${id}'.`);
        }
        return { ...source, quantity };
    });

    const equipment: Partial<Record<EquipmentSlot, Equipment>> = {};
    for (const entry of preset.equipment) {
        equipment[entry.slot] = dropItem(entry.templateId, preset.level, 'common', rng);
    }

    return createCharacter({
        name: preset.name,
        level: preset.level,
        baseStats: preset.baseStats,
        currency: preset.currency,
        inventory,
        equipment,
        knownSkills: preset.knownSkills,
        equippedSkills: preset.equippedSkills,
    });
}
