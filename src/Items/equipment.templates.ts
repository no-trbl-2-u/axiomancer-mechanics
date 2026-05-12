/**
 * Equipment Templates — Spec 05c content (procedural base items).
 *
 * Twenty-one `EquipmentTemplate`s across seven slots × three required-level
 * tiers (lvl 1 / 10 / 20). A template carries only the *base* identity and
 * stat floor; rarity, rolled modifiers, and the rest of the runtime instance
 * shape are decided by `dropItem` in `item.factory.ts`.
 *
 * Spec 05c Q5 — Common drops are intentionally weak-but-meaningful: a Common
 * `iron-blade` is a valid starting weapon, not vendor fodder. Progression is
 * gated by `requiredLevel`, not by making low-tier items useless.
 *
 * The exact `baseStatModifiers` figures here are the authoritative floor for
 * each template; Uncommon / Rare / Unique drops layer rolled modifiers from
 * Spec 05d on top.
 */

import { EquipmentTemplate } from './types';

// ─── Weapons ─────────────────────────────────────────────────────────────────

const weapons: EquipmentTemplate[] = [
    {
        id: 'iron-blade',
        name: 'Iron Blade',
        description: 'A serviceable iron edge. Reliable in any hand.',
        slot: 'weapon',
        requiredLevel: 1,
        baseStatModifiers: [{ stat: 'body', value: 2 }],
    },
    {
        id: 'steel-blade',
        name: 'Steel Blade',
        description: 'Folded steel keeps its edge through a longer fight.',
        slot: 'weapon',
        requiredLevel: 10,
        baseStatModifiers: [
            { stat: 'body',           value: 3 },
            { stat: 'physicalAttack', value: 1 },
        ],
    },
    {
        id: 'mithril-blade',
        name: 'Mithril Blade',
        description: 'A blade of starlit alloy. Light enough to feel inevitable.',
        slot: 'weapon',
        requiredLevel: 20,
        baseStatModifiers: [
            { stat: 'body',           value: 4 },
            { stat: 'physicalAttack', value: 2 },
        ],
    },
];

// ─── Armor ───────────────────────────────────────────────────────────────────

const armor: EquipmentTemplate[] = [
    {
        id: 'hide-vest',
        name: 'Hide Vest',
        description: 'Stitched hides, oiled and patched. Honest protection.',
        slot: 'armor',
        requiredLevel: 1,
        baseStatModifiers: [{ stat: 'physicalDefense', value: 1 }],
    },
    {
        id: 'chain-mail',
        name: 'Chain Mail',
        description: 'A coat of interlocking rings. Heavier than it looks; reassuringly so.',
        slot: 'armor',
        requiredLevel: 10,
        baseStatModifiers: [
            { stat: 'physicalDefense', value: 3 },
            { stat: 'body',            value: 1 },
        ],
    },
    {
        id: 'plate-mail',
        name: 'Plate Mail',
        description: 'Articulated plates over mail. Forged for those who hold the line.',
        slot: 'armor',
        requiredLevel: 20,
        baseStatModifiers: [
            { stat: 'physicalDefense', value: 5 },
            { stat: 'body',            value: 2 },
        ],
    },
];

// ─── Head ────────────────────────────────────────────────────────────────────

const head: EquipmentTemplate[] = [
    {
        id: 'leather-cap',
        name: 'Leather Cap',
        description: 'A boiled-leather skullcap.',
        slot: 'head',
        requiredLevel: 1,
        baseStatModifiers: [{ stat: 'physicalDefense', value: 1 }],
    },
    {
        id: 'chain-coif',
        name: 'Chain Coif',
        description: 'A hood of fine ring-mail. Quiet under a plain hood.',
        slot: 'head',
        requiredLevel: 10,
        baseStatModifiers: [
            { stat: 'physicalDefense', value: 2 },
            { stat: 'body',            value: 1 },
        ],
    },
    {
        id: 'full-helm',
        name: 'Full Helm',
        description: 'A closed helm with a narrow visor. Reduces the world to the next blow.',
        slot: 'head',
        requiredLevel: 20,
        baseStatModifiers: [
            { stat: 'physicalDefense', value: 4 },
            { stat: 'body',            value: 1 },
        ],
    },
];

// ─── Body / Chest ────────────────────────────────────────────────────────────

const body: EquipmentTemplate[] = [
    {
        id: 'cloth-wrap',
        name: 'Cloth Wrap',
        description: 'Plain linen wrappings. Better than nothing.',
        slot: 'body',
        requiredLevel: 1,
        baseStatModifiers: [{ stat: 'physicalDefense', value: 1 }],
    },
    {
        id: 'leather-coat',
        name: 'Leather Coat',
        description: 'A long coat of tanned hide. Lets the wearer move.',
        slot: 'body',
        requiredLevel: 10,
        baseStatModifiers: [
            { stat: 'physicalDefense', value: 2 },
            { stat: 'body',            value: 1 },
        ],
    },
    {
        id: 'scaled-coat',
        name: 'Scaled Coat',
        description: 'Lacquered scales over heavy fabric. Sheds glancing blows.',
        slot: 'body',
        requiredLevel: 20,
        baseStatModifiers: [
            { stat: 'physicalDefense', value: 4 },
            { stat: 'body',            value: 2 },
        ],
    },
];

// ─── Hands ───────────────────────────────────────────────────────────────────

const hands: EquipmentTemplate[] = [
    {
        id: 'cloth-gloves',
        name: 'Cloth Gloves',
        description: 'Padded cloth gloves. They hold a grip.',
        slot: 'hands',
        requiredLevel: 1,
        baseStatModifiers: [{ stat: 'physicalAttack', value: 1 }],
    },
    {
        id: 'chain-gauntlets',
        name: 'Chain Gauntlets',
        description: 'Mail-backed gauntlets with hardened knuckles.',
        slot: 'hands',
        requiredLevel: 10,
        baseStatModifiers: [
            { stat: 'physicalAttack', value: 2 },
            { stat: 'body',           value: 1 },
        ],
    },
    {
        id: 'plate-gauntlets',
        name: 'Plate Gauntlets',
        description: 'Articulated plate over the back of the hand.',
        slot: 'hands',
        requiredLevel: 20,
        baseStatModifiers: [
            { stat: 'physicalAttack', value: 3 },
            { stat: 'body',           value: 2 },
        ],
    },
];

// ─── Feet ────────────────────────────────────────────────────────────────────

const feet: EquipmentTemplate[] = [
    {
        id: 'sandals',
        name: 'Sandals',
        description: 'Plain leather sandals. Quiet on flagstones.',
        slot: 'feet',
        requiredLevel: 1,
        baseStatModifiers: [{ stat: 'physicalDefense', value: 1 }],
    },
    {
        id: 'leather-boots',
        name: 'Leather Boots',
        description: 'Well-stitched boots, oiled for the road.',
        slot: 'feet',
        requiredLevel: 10,
        baseStatModifiers: [
            { stat: 'physicalDefense', value: 2 },
            { stat: 'body',            value: 1 },
        ],
    },
    {
        id: 'iron-greaves',
        name: 'Iron Greaves',
        description: 'Plated greaves over heavy boots. Trade speed for ground.',
        slot: 'feet',
        requiredLevel: 20,
        baseStatModifiers: [
            { stat: 'physicalDefense', value: 4 },
            { stat: 'body',            value: 2 },
        ],
    },
];

// ─── Accessory ───────────────────────────────────────────────────────────────

const accessory: EquipmentTemplate[] = [
    {
        id: 'copper-ring',
        name: 'Copper Ring',
        description: 'A plain copper band, warm against the skin.',
        slot: 'accessory',
        requiredLevel: 1,
        baseStatModifiers: [{ stat: 'body', value: 1 }],
    },
    {
        id: 'silver-ring',
        name: 'Silver Ring',
        description: 'A silver band etched with a quiet sigil.',
        slot: 'accessory',
        requiredLevel: 10,
        baseStatModifiers: [
            { stat: 'body',  value: 1 },
            { stat: 'mind',  value: 1 },
        ],
    },
    {
        id: 'gold-ring',
        name: 'Gold Ring',
        description: 'A heavy gold band cast for a forgotten oath.',
        slot: 'accessory',
        requiredLevel: 20,
        baseStatModifiers: [
            { stat: 'body',  value: 2 },
            { stat: 'mind',  value: 2 },
            { stat: 'heart', value: 1 },
        ],
    },
];

/**
 * The full equipment template library for Spec 05c. Exactly 21 entries
 * (7 slots × 3 progression tiers by `requiredLevel`).
 */
export const equipmentTemplates: EquipmentTemplate[] = [
    ...weapons,
    ...armor,
    ...head,
    ...body,
    ...hands,
    ...feet,
    ...accessory,
];

const templateRegistry = new Map<string, EquipmentTemplate>(
    equipmentTemplates.map(t => [t.id, t]),
);

/** O(1) lookup by template ID. Returns `undefined` for unknown IDs. */
export function getEquipmentTemplate(id: string): EquipmentTemplate | undefined {
    return templateRegistry.get(id);
}

/** Templates filtered by slot, sorted by `requiredLevel` ascending. */
export function getTemplatesBySlot(
    slot: EquipmentTemplate['slot'],
): EquipmentTemplate[] {
    return equipmentTemplates
        .filter(t => t.slot === slot)
        .slice()
        .sort((a, b) => a.requiredLevel - b.requiredLevel);
}
