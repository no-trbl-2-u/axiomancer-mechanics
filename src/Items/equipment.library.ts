/**
 * Equipment Library
 *
 * 18 stat-aligned items: 6 weapons, 6 armor, 6 accessories — two each
 * for body / mind / heart alignment. Every item references existing
 * effect IDs from the buffs / debuffs libraries.
 *
 * Slots used:
 *   - weapon    — body / mind / heart attack equipment
 *   - armor     — body / mind / heart defense equipment
 *   - accessory — utility / hybrid pieces (rings, talismans, charms)
 */

import { Equipment } from './types';

export const equipmentLibrary: Equipment[] = [
    // ── Weapons (×6) ────────────────────────────────────────────────────
    {
        id: 'wpn-body-1',
        name: 'Iron Mace',
        description: 'Heavy, blunt, eloquent in its own way.',
        category: 'equipment',
        slot: 'weapon',
        teir: 'Teir 1',
        statModifiers: [
            { stat: 'physicalAttack', value: 2 },
        ],
    },
    {
        id: 'wpn-body-2',
        name: 'Aetherbreaker Hammer',
        description: 'Each strike echoes through the listener\'s convictions.',
        category: 'equipment',
        slot: 'weapon',
        teir: 'Teir 2',
        statModifiers: [
            { stat: 'physicalAttack', value: 4 },
            { stat: 'body', value: 1 },
        ],
        onHitEffects: [
            { effectId: 'debuff_bleed', chance: 0.15, target: 'opponent' },
        ],
    },
    {
        id: 'wpn-mind-1',
        name: 'Cryptarch\'s Stylus',
        description: 'A thin glass quill that writes counterarguments mid-air.',
        category: 'equipment',
        slot: 'weapon',
        teir: 'Teir 1',
        statModifiers: [
            { stat: 'mentalAttack', value: 2 },
        ],
    },
    {
        id: 'wpn-mind-2',
        name: 'Sophist\'s Codex',
        description: 'A book that turns to the relevant fallacy on its own.',
        category: 'equipment',
        slot: 'weapon',
        teir: 'Teir 2',
        statModifiers: [
            { stat: 'mentalAttack', value: 4 },
            { stat: 'mind', value: 1 },
        ],
        onHitEffects: [
            { effectId: 'debuff_confusion', chance: 0.15, target: 'opponent' },
        ],
    },
    {
        id: 'wpn-heart-1',
        name: 'Empath\'s Rapier',
        description: 'Slim, exquisite, and sympathetic to the wielder\'s grief.',
        category: 'equipment',
        slot: 'weapon',
        teir: 'Teir 1',
        statModifiers: [
            { stat: 'emotionalAttack', value: 2 },
        ],
    },
    {
        id: 'wpn-heart-2',
        name: 'Pity\'s Edge',
        description: 'A blade that wounds the conscience as much as the body.',
        category: 'equipment',
        slot: 'weapon',
        teir: 'Teir 2',
        statModifiers: [
            { stat: 'emotionalAttack', value: 4 },
            { stat: 'heart', value: 1 },
        ],
        onHitEffects: [
            { effectId: 'debuff_charm', chance: 0.10, target: 'opponent' },
        ],
    },

    // ── Armor (×6) ──────────────────────────────────────────────────────
    {
        id: 'arm-body-1',
        name: 'Banded Cuirass',
        description: 'Layered iron bands, straightforward and stubborn.',
        category: 'equipment',
        slot: 'armor',
        teir: 'Teir 1',
        statModifiers: [{ stat: 'physicalDefense', value: 3 }],
    },
    {
        id: 'arm-body-2',
        name: 'Theseus\' Plate',
        description: 'Scarred, replaced, scarred again — and unbroken.',
        category: 'equipment',
        slot: 'armor',
        teir: 'Teir 2',
        statModifiers: [
            { stat: 'physicalDefense', value: 6 },
            { stat: 'body', value: 1 },
        ],
        passiveEffects: ['buff_regeneration'],
    },
    {
        id: 'arm-mind-1',
        name: 'Scholar\'s Robe',
        description: 'Light cloth threaded with calming theorems.',
        category: 'equipment',
        slot: 'armor',
        teir: 'Teir 1',
        statModifiers: [{ stat: 'mentalDefense', value: 3 }],
    },
    {
        id: 'arm-mind-2',
        name: 'Epistemic Mantle',
        description: 'Knows that you know that the blow is coming. Deflects accordingly.',
        category: 'equipment',
        slot: 'armor',
        teir: 'Teir 2',
        statModifiers: [
            { stat: 'mentalDefense', value: 6 },
            { stat: 'mind', value: 1 },
        ],
        passiveEffects: ['buff_evasion_up'],
    },
    {
        id: 'arm-heart-1',
        name: 'Choir Vestments',
        description: 'A robe woven from prayers — soft, but resolute.',
        category: 'equipment',
        slot: 'armor',
        teir: 'Teir 1',
        statModifiers: [{ stat: 'emotionalDefense', value: 3 }],
    },
    {
        id: 'arm-heart-2',
        name: 'Devotee\'s Shroud',
        description: 'Faith made fabric. The wearer shrugs off cruelty.',
        category: 'equipment',
        slot: 'armor',
        teir: 'Teir 2',
        statModifiers: [
            { stat: 'emotionalDefense', value: 6 },
            { stat: 'heart', value: 1 },
        ],
        passiveEffects: ['buff_resistance_heart'],
    },

    // ── Accessories (×6) ────────────────────────────────────────────────
    {
        id: 'acc-body-1',
        name: 'Ironbound Pendant',
        description: 'A plain iron disk that grounds wearer\'s body.',
        category: 'equipment',
        slot: 'accessory',
        teir: 'Teir 1',
        statModifiers: [{ stat: 'body', value: 1 }],
    },
    {
        id: 'acc-body-2',
        name: 'Briar Ring',
        description: 'Reflects pain back at any who would deal it.',
        category: 'equipment',
        slot: 'accessory',
        teir: 'Teir 2',
        statModifiers: [{ stat: 'body', value: 2 }],
        onDefendEffects: [
            { effectId: 'tier1_body_defend', chance: 0.50, target: 'self' },
        ],
    },
    {
        id: 'acc-mind-1',
        name: 'Amulet of Insight',
        description: 'Whispers reminders mid-thought.',
        category: 'equipment',
        slot: 'accessory',
        teir: 'Teir 1',
        statModifiers: [{ stat: 'mind', value: 1 }],
    },
    {
        id: 'acc-mind-2',
        name: 'Cogito Lens',
        description: 'A monocle that doubles every thought.',
        category: 'equipment',
        slot: 'accessory',
        teir: 'Teir 2',
        statModifiers: [{ stat: 'mind', value: 2 }],
        onHitEffects: [
            { effectId: 'tier1_mind_mark', chance: 0.30, target: 'opponent' },
        ],
    },
    {
        id: 'acc-heart-1',
        name: 'Sympathetic Locket',
        description: 'Holds a charcoal sketch of a friend. Warmth on demand.',
        category: 'equipment',
        slot: 'accessory',
        teir: 'Teir 1',
        statModifiers: [{ stat: 'heart', value: 1 }],
    },
    {
        id: 'acc-heart-2',
        name: 'Empath\'s Charm',
        description: 'Quiet kindness loops back, making allies a touch braver.',
        category: 'equipment',
        slot: 'accessory',
        teir: 'Teir 2',
        statModifiers: [{ stat: 'heart', value: 2 }],
        passiveEffects: ['buff_regeneration'],
    },
];

const equipmentRegistry = new Map<string, Equipment>();
for (const e of equipmentLibrary) equipmentRegistry.set(e.id, e);

/** O(1) lookup by equipment ID. */
export const lookupEquipment = (id: string): Equipment | undefined => equipmentRegistry.get(id);

/** Returns every equipment item in the library. */
export const getAllEquipment = (): Equipment[] => [...equipmentLibrary];

/** Returns every equipment item with the given slot. */
export const getEquipmentBySlot = (slot: Equipment['slot']): Equipment[] =>
    equipmentLibrary.filter(e => e.slot === slot);
