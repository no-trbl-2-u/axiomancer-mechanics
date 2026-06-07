/**
 * Equipment Templates — Spec 05c content (procedural base items).
 *
 * Forty-three `EquipmentTemplate`s across seven slots spanning required-level
 * 1 → 50. The original lvl 1 / 10 / 20 tiers are kept; the 2026-06-07 content
 * pass added lvl 30 / 40 / 50 lines to every gear slot (and an extra lvl 15 /
 * 30 / 40 / 50 accessory line). A template carries only the *base* identity and
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
    {
        id: 'runed-glaive',
        name: 'Runed Glaive',
        description: 'A polearm scored with biting runes that hum when swung.',
        slot: 'weapon',
        requiredLevel: 30,
        baseStatModifiers: [
            { stat: 'body',           value: 6 },
            { stat: 'physicalAttack', value: 4 },
            { stat: 'physicalSkill',  value: 2 },
        ],
        addedIn: '2026-06-07',
        tags: ['weapon', 'mid-game'],
    },
    {
        id: 'dragonbone-saber',
        name: 'Dragonbone Saber',
        description: 'Carved from a wyrm\'s rib, it remembers fire it never held.',
        slot: 'weapon',
        requiredLevel: 40,
        baseStatModifiers: [
            { stat: 'body',           value: 8 },
            { stat: 'physicalAttack', value: 6 },
            { stat: 'physicalSkill',  value: 3 },
        ],
        addedIn: '2026-06-07',
        tags: ['weapon', 'late-game'],
    },
    {
        id: 'axiom-greatsword',
        name: 'Axiom Greatsword',
        description: 'A two-handed proof in steel; each cut closes an argument.',
        slot: 'weapon',
        requiredLevel: 50,
        baseStatModifiers: [
            { stat: 'body',           value: 11 },
            { stat: 'physicalAttack', value: 9 },
            { stat: 'physicalSkill',  value: 4 },
        ],
        addedIn: '2026-06-07',
        tags: ['weapon', 'late-game', 'endgame'],
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
    {
        id: 'runed-cuirass',
        name: 'Runed Cuirass',
        description: 'Plate inscribed with warding glyphs that drink incoming force.',
        slot: 'armor',
        requiredLevel: 30,
        baseStatModifiers: [
            { stat: 'physicalDefense', value: 8 },
            { stat: 'body',            value: 3 },
        ],
        addedIn: '2026-06-07',
        tags: ['armor', 'mid-game'],
    },
    {
        id: 'dragonscale-harness',
        name: 'Dragonscale Harness',
        description: 'Overlapping scales that turn a killing blow into a bruise.',
        slot: 'armor',
        requiredLevel: 40,
        baseStatModifiers: [
            { stat: 'physicalDefense', value: 11 },
            { stat: 'body',            value: 4 },
            { stat: 'mentalDefense',   value: 2 },
        ],
        addedIn: '2026-06-07',
        tags: ['armor', 'late-game'],
    },
    {
        id: 'aegis-plate',
        name: 'Aegis Plate',
        description: 'A bulwark of mirror-bright steel said to repel certainty itself.',
        slot: 'armor',
        requiredLevel: 50,
        baseStatModifiers: [
            { stat: 'physicalDefense', value: 15 },
            { stat: 'body',            value: 5 },
            { stat: 'mentalDefense',   value: 3 },
        ],
        addedIn: '2026-06-07',
        tags: ['armor', 'late-game', 'endgame'],
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
    {
        id: 'sage-circlet',
        name: 'Sage Circlet',
        description: 'A thin silver band that quiets noise and sharpens thought.',
        slot: 'head',
        requiredLevel: 30,
        baseStatModifiers: [
            { stat: 'mentalDefense', value: 5 },
            { stat: 'mind',          value: 3 },
        ],
        addedIn: '2026-06-07',
        tags: ['head', 'mid-game', 'mental'],
    },
    {
        id: 'warlords-greathelm',
        name: "Warlord's Greathelm",
        description: 'A crested helm that has outlived three generals.',
        slot: 'head',
        requiredLevel: 40,
        baseStatModifiers: [
            { stat: 'physicalDefense', value: 8 },
            { stat: 'mentalDefense',   value: 4 },
            { stat: 'body',            value: 2 },
        ],
        addedIn: '2026-06-07',
        tags: ['head', 'late-game'],
    },
    {
        id: 'oracle-crown',
        name: 'Oracle Crown',
        description: 'A diadem of foresight; the wearer flinches a half-second early.',
        slot: 'head',
        requiredLevel: 50,
        baseStatModifiers: [
            { stat: 'mentalDefense', value: 9 },
            { stat: 'mind',          value: 5 },
            { stat: 'luck',          value: 2 },
        ],
        addedIn: '2026-06-07',
        tags: ['head', 'late-game', 'endgame'],
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
    {
        id: 'brigandine',
        name: 'Brigandine',
        description: 'Riveted plates sewn between cloth. A soldier\'s second skin.',
        slot: 'body',
        requiredLevel: 30,
        baseStatModifiers: [
            { stat: 'physicalDefense', value: 7 },
            { stat: 'body',            value: 3 },
        ],
        addedIn: '2026-06-07',
        tags: ['body', 'mid-game'],
    },
    {
        id: 'warded-robe',
        name: 'Warded Robe',
        description: 'Layered silk stitched with deflective sigils.',
        slot: 'body',
        requiredLevel: 40,
        baseStatModifiers: [
            { stat: 'physicalDefense', value: 9 },
            { stat: 'mentalDefense',   value: 4 },
            { stat: 'body',            value: 3 },
        ],
        addedIn: '2026-06-07',
        tags: ['body', 'late-game'],
    },
    {
        id: 'titan-carapace',
        name: 'Titan Carapace',
        description: 'A shell of fused alloy plates that makes its wearer a wall.',
        slot: 'body',
        requiredLevel: 50,
        baseStatModifiers: [
            { stat: 'physicalDefense', value: 13 },
            { stat: 'body',            value: 5 },
        ],
        addedIn: '2026-06-07',
        tags: ['body', 'late-game', 'endgame'],
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
    {
        id: 'runed-bracers',
        name: 'Runed Bracers',
        description: 'Etched vambraces that steady a strike at the last instant.',
        slot: 'hands',
        requiredLevel: 30,
        baseStatModifiers: [
            { stat: 'physicalAttack', value: 5 },
            { stat: 'physicalSkill',  value: 3 },
        ],
        addedIn: '2026-06-07',
        tags: ['hands', 'mid-game'],
    },
    {
        id: 'dragonclaw-gauntlets',
        name: 'Dragonclaw Gauntlets',
        description: 'Taloned gauntlets that turn a fist into a finishing blow.',
        slot: 'hands',
        requiredLevel: 40,
        baseStatModifiers: [
            { stat: 'physicalAttack', value: 7 },
            { stat: 'physicalSkill',  value: 4 },
            { stat: 'body',           value: 2 },
        ],
        addedIn: '2026-06-07',
        tags: ['hands', 'late-game'],
    },
    {
        id: 'titan-grips',
        name: 'Titan Grips',
        description: 'Colossal gauntlets that crush what they hold.',
        slot: 'hands',
        requiredLevel: 50,
        baseStatModifiers: [
            { stat: 'physicalAttack', value: 10 },
            { stat: 'physicalSkill',  value: 5 },
            { stat: 'body',           value: 3 },
        ],
        addedIn: '2026-06-07',
        tags: ['hands', 'late-game', 'endgame'],
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
    {
        id: 'swiftstride-boots',
        name: 'Swiftstride Boots',
        description: 'Light boots that seem to find the ground a step early.',
        slot: 'feet',
        requiredLevel: 30,
        baseStatModifiers: [
            { stat: 'physicalSave', value: 6 },
            { stat: 'luck',         value: 2 },
        ],
        addedIn: '2026-06-07',
        tags: ['feet', 'mid-game'],
    },
    {
        id: 'runed-sabatons',
        name: 'Runed Sabatons',
        description: 'Glyph-warded plate boots that root the wearer like an oath.',
        slot: 'feet',
        requiredLevel: 40,
        baseStatModifiers: [
            { stat: 'physicalDefense', value: 8 },
            { stat: 'physicalSave',    value: 4 },
            { stat: 'body',            value: 2 },
        ],
        addedIn: '2026-06-07',
        tags: ['feet', 'late-game'],
    },
    {
        id: 'windwalker-greaves',
        name: 'Windwalker Greaves',
        description: 'Greaves so light the wearer half-forgets the ground.',
        slot: 'feet',
        requiredLevel: 50,
        baseStatModifiers: [
            { stat: 'physicalSave', value: 10 },
            { stat: 'luck',         value: 3 },
            { stat: 'body',         value: 2 },
        ],
        addedIn: '2026-06-07',
        tags: ['feet', 'late-game', 'endgame'],
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
    {
        id: 'jade-amulet',
        name: 'Jade Amulet',
        description: 'A carved jade pendant, cool and steady against the pulse.',
        slot: 'accessory',
        requiredLevel: 15,
        baseStatModifiers: [
            { stat: 'heart', value: 2 },
            { stat: 'mind',  value: 1 },
        ],
        addedIn: '2026-06-07',
        tags: ['accessory', 'mid-game'],
    },
    {
        id: 'sigil-pendant',
        name: 'Sigil Pendant',
        description: 'A pendant graven with a sigil that hums in three keys at once.',
        slot: 'accessory',
        requiredLevel: 30,
        baseStatModifiers: [
            { stat: 'body',  value: 3 },
            { stat: 'mind',  value: 3 },
            { stat: 'heart', value: 2 },
        ],
        addedIn: '2026-06-07',
        tags: ['accessory', 'mid-game'],
    },
    {
        id: 'platinum-band',
        name: 'Platinum Band',
        description: 'A flawless band that lends its bearer an uncanny edge.',
        slot: 'accessory',
        requiredLevel: 40,
        baseStatModifiers: [
            { stat: 'body',  value: 4 },
            { stat: 'mind',  value: 4 },
            { stat: 'heart', value: 3 },
            { stat: 'luck',  value: 2 },
        ],
        addedIn: '2026-06-07',
        tags: ['accessory', 'late-game'],
    },
    {
        id: 'astral-circlet',
        name: 'Astral Circlet',
        description: 'A ring of cold starlight worn at the brow of the resolute.',
        slot: 'accessory',
        requiredLevel: 50,
        baseStatModifiers: [
            { stat: 'body',  value: 5 },
            { stat: 'mind',  value: 5 },
            { stat: 'heart', value: 5 },
            { stat: 'luck',  value: 3 },
        ],
        addedIn: '2026-06-07',
        tags: ['accessory', 'late-game', 'endgame'],
    },
];

/**
 * The full equipment template library for Spec 05c. 43 entries spanning
 * `requiredLevel` 1 → 50 across all 7 slots.
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
