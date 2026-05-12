/**
 * Equipment Library — Spec 05b content.
 *
 * Fifty equipment pieces spread across all seven slots and three tiers.
 *
 * Design rules (resolved Spec 05b open questions):
 *  - Q1: `combatStartTokens` are seeded once inside `initializeCombat` and
 *        never recalculated mid-combat. Players cannot change equipment during
 *        a fight.
 *  - Q2: Multiple equipped items' `combatStartTokens` stack additively with
 *        no per-resource cap (`berserker-axe` + `berserker-band` → body 5).
 *  - Q3 (B): `combatStartTokens` may only include `heart`, `body`, `mind` —
 *        `fallacy` / `paradox` remain skill-only. The thematic `void-sigil`
 *        was rewritten to grant `mind` instead of philosophical tokens.
 *  - Q4: Tier and resource interactions are orthogonal. Tier 1 items are
 *        deliberately clean for new players, but the engine does not enforce
 *        a tier gate — designers may balance any item via passive debuffs.
 *  - Q5: Stance alignment lives in item modifiers, not slot identity. Any
 *        slot may host any thematic alignment.
 *  - Q7: `setId` is encoded for thematic groups (Berserker, Scholar, Heart,
 *        Titan). Engine-side set-bonus checks are deferred to a later spec —
 *        the field is data-only for now.
 *  - Q10 (B): `ResourceGenerationBonus.trigger` is outcome-only — no stance
 *        filter. Library curates resource type alignment via thematic design.
 *
 * Tier-1 items intentionally carry no `resourceInteraction` so the early-game
 * baseline stays clean.
 */

import { Equipment } from './types';

/**
 * Optional set identity. Equipment with a matching `setId` belongs to the
 * same thematic group; future spec work can grant a bonus when ≥2 set
 * pieces are equipped simultaneously. Stored on the item alongside its
 * other persistent fields.
 */
type EquipmentWithSet = Equipment & { setId?: string };

// ─── Weapons (8) ─────────────────────────────────────────────────────────────

const weapons: EquipmentWithSet[] = [
    {
        id: 'iron-blade',
        name: 'Iron Blade',
        description: 'A serviceable iron edge. Reliable in any hand.',
        category: 'equipment',
        slot: 'weapon',
        tier: 1,
        statModifiers: [{ stat: 'body', value: 2 }],
    },
    {
        id: 'mind-needle',
        name: 'Mind Needle',
        description: 'A slender blade balanced for precision over force.',
        category: 'equipment',
        slot: 'weapon',
        tier: 1,
        statModifiers: [
            { stat: 'mind', value: 1 },
            { stat: 'mentalAttack', value: 1 },
        ],
    },
    {
        id: 'heartstring-bow',
        name: 'Heartstring Bow',
        description: 'A bow strung with sinew that hums when its wielder is sincere.',
        category: 'equipment',
        slot: 'weapon',
        tier: 1,
        statModifiers: [{ stat: 'heart', value: 2 }],
    },
    {
        id: 'berserker-axe',
        name: 'Berserker Axe',
        description: 'A blood-grooved axe that drinks the rage of its bearer.',
        category: 'equipment',
        slot: 'weapon',
        tier: 2,
        setId: 'berserker',
        statModifiers: [{ stat: 'body', value: 3 }],
        resourceInteraction: {
            combatStartTokens: { body: 2 },
        },
    },
    {
        id: 'philosopher-knife',
        name: "Philosopher's Knife",
        description: 'A reasoning blade. Each strike sharpens the thoughts behind it.',
        category: 'equipment',
        slot: 'weapon',
        tier: 2,
        statModifiers: [
            { stat: 'mind', value: 2 },
            { stat: 'mentalAttack', value: 1 },
        ],
        resourceInteraction: {
            generationBonus: [{ trigger: 'hit', resourceType: 'mind', bonus: 1 }],
        },
    },
    {
        id: 'soulbond-rapier',
        name: 'Soulbond Rapier',
        description: 'A duellist\'s blade that resonates with kindred conviction.',
        category: 'equipment',
        slot: 'weapon',
        tier: 2,
        statModifiers: [{ stat: 'heart', value: 3 }],
        resourceInteraction: {
            generationBonus: [{ trigger: 'defend', resourceType: 'heart', bonus: 1 }],
        },
    },
    {
        id: 'titan-cleaver',
        name: 'Titan Cleaver',
        description: 'A two-handed cleaver heavy enough to split the air.',
        category: 'equipment',
        slot: 'weapon',
        tier: 3,
        setId: 'titan',
        statModifiers: [
            { stat: 'body', value: 4 },
            { stat: 'physicalAttack', value: 2 },
        ],
        resourceInteraction: {
            combatStartTokens: { body: 3 },
        },
    },
    {
        id: 'paradox-shard',
        name: 'Paradox Shard',
        description: 'A jagged remnant of contradicting truths. It does not stay still.',
        category: 'equipment',
        slot: 'weapon',
        tier: 3,
        statModifiers: [
            { stat: 'mind', value: 3 },
            { stat: 'mentalAttack', value: 2 },
        ],
        resourceInteraction: {
            combatStartTokens: { mind: 2 },
            generationBonus: [{ trigger: 'hit', resourceType: 'mind', bonus: 1 }],
        },
    },
];

// ─── Armor (7) ───────────────────────────────────────────────────────────────

const armor: EquipmentWithSet[] = [
    {
        id: 'leather-vest',
        name: 'Leather Vest',
        description: 'Tanned, oiled, and unremarkable. Better than going bare.',
        category: 'equipment',
        slot: 'armor',
        tier: 1,
        statModifiers: [
            { stat: 'physicalDefense', value: 1 },
            { stat: 'body', value: 1 },
        ],
    },
    {
        id: 'scholar-robe',
        name: "Scholar's Robe",
        description: 'Pockets lined with index cards. The wearer thinks faster than they move.',
        category: 'equipment',
        slot: 'armor',
        tier: 1,
        setId: 'scholar',
        statModifiers: [
            { stat: 'mentalDefense', value: 1 },
            { stat: 'mind', value: 1 },
        ],
    },
    {
        id: 'heart-cuirass',
        name: 'Heart Cuirass',
        description: 'A breastplate beaten into the shape of a guarded heart.',
        category: 'equipment',
        slot: 'armor',
        tier: 1,
        setId: 'heart',
        statModifiers: [{ stat: 'emotionalDefense', value: 2 }],
    },
    {
        id: 'iron-platemail',
        name: 'Iron Platemail',
        description: 'Old, dented, still trustworthy.',
        category: 'equipment',
        slot: 'armor',
        tier: 2,
        statModifiers: [
            { stat: 'physicalDefense', value: 3 },
            { stat: 'body', value: 1 },
        ],
        resourceInteraction: {
            combatStartTokens: { body: 1 },
        },
    },
    {
        id: 'mystic-cloak',
        name: 'Mystic Cloak',
        description: 'A cloak stitched from forgotten arguments. It deflects ideas as well as blows.',
        category: 'equipment',
        slot: 'armor',
        tier: 2,
        statModifiers: [
            { stat: 'mentalDefense', value: 2 },
            { stat: 'mind', value: 2 },
        ],
        resourceInteraction: {
            generationBonus: [{ trigger: 'defend', resourceType: 'mind', bonus: 1 }],
        },
    },
    {
        id: 'guardian-mail',
        name: 'Guardian Mail',
        description: 'A vow-sworn coat of rings.  Heart-aligned and merciless to oath-breakers.',
        category: 'equipment',
        slot: 'armor',
        tier: 2,
        setId: 'heart',
        statModifiers: [
            { stat: 'emotionalDefense', value: 3 },
            { stat: 'heart', value: 1 },
        ],
        resourceInteraction: {
            generationBonus: [{ trigger: 'defend', resourceType: 'heart', bonus: 2 }],
        },
    },
    {
        id: 'titan-aegis',
        name: 'Titan Aegis',
        description: 'Armor of a forgotten god-king. The metal remembers being mountains.',
        category: 'equipment',
        slot: 'armor',
        tier: 3,
        setId: 'titan',
        statModifiers: [
            { stat: 'physicalDefense', value: 5 },
            { stat: 'body', value: 2 },
        ],
        resourceInteraction: {
            combatStartTokens: { body: 2 },
        },
    },
];

// ─── Accessories (8) ─────────────────────────────────────────────────────────

const accessories: EquipmentWithSet[] = [
    {
        id: 'iron-ring',
        name: 'Iron Ring',
        description: 'Plain, heavy, grounding.',
        category: 'equipment',
        slot: 'accessory',
        tier: 1,
        statModifiers: [{ stat: 'body', value: 1 }],
    },
    {
        id: 'crystal-pendant',
        name: 'Crystal Pendant',
        description: 'A faceted crystal that catches the light of an idea.',
        category: 'equipment',
        slot: 'accessory',
        tier: 1,
        setId: 'scholar',
        statModifiers: [{ stat: 'mind', value: 1 }],
    },
    {
        id: 'rose-talisman',
        name: 'Rose Talisman',
        description: 'A dried rose pressed into glass — a promise from someone long gone.',
        category: 'equipment',
        slot: 'accessory',
        tier: 1,
        setId: 'heart',
        statModifiers: [{ stat: 'heart', value: 1 }],
    },
    {
        id: 'berserker-band',
        name: 'Berserker Band',
        description: 'Iron-wire wrap warmed by the fire of every fight it has seen.',
        category: 'equipment',
        slot: 'accessory',
        tier: 2,
        setId: 'berserker',
        statModifiers: [{ stat: 'body', value: 2 }],
        resourceInteraction: {
            combatStartTokens: { body: 3 },
        },
    },
    {
        id: 'scholar-lens',
        name: "Scholar's Lens",
        description: 'A monocle that sees the seams in another\'s argument.',
        category: 'equipment',
        slot: 'accessory',
        tier: 2,
        setId: 'scholar',
        statModifiers: [{ stat: 'mind', value: 2 }],
        resourceInteraction: {
            combatStartTokens: { mind: 3 },
        },
    },
    {
        id: 'empathy-locket',
        name: 'Empathy Locket',
        description: 'It holds someone you carry into every battle.',
        category: 'equipment',
        slot: 'accessory',
        tier: 2,
        setId: 'heart',
        statModifiers: [{ stat: 'heart', value: 2 }],
        resourceInteraction: {
            combatStartTokens: { heart: 3 },
        },
    },
    {
        id: 'resonance-prism',
        name: 'Resonance Prism',
        description: 'A three-faced crystal that hums when body, mind, and heart align.',
        category: 'equipment',
        slot: 'accessory',
        tier: 3,
        statModifiers: [
            { stat: 'body',  value: 1 },
            { stat: 'mind',  value: 1 },
            { stat: 'heart', value: 1 },
        ],
        resourceInteraction: {
            combatStartTokens: { body: 1, mind: 1, heart: 1 },
        },
    },
    {
        id: 'void-sigil',
        name: 'Void Sigil',
        description:
            'An obsidian disc inscribed with a sentence that ends without finishing. ' +
            'Sharpens the wearer\'s mind through unresolved tension.',
        category: 'equipment',
        slot: 'accessory',
        tier: 3,
        statModifiers: [{ stat: 'mind', value: 2 }],
        // Spec 05b Q3 (B): combatStartTokens may NOT include fallacy/paradox.
        // Rewritten to grant mind tokens instead while keeping the void flavor.
        resourceInteraction: {
            combatStartTokens: { mind: 2 },
            generationBonus: [{ trigger: 'hit', resourceType: 'mind', bonus: 1 }],
        },
    },
];

// ─── Head (7) ────────────────────────────────────────────────────────────────

const headSlots: EquipmentWithSet[] = [
    {
        id: 'leather-cap',
        name: 'Leather Cap',
        description: 'A boiled-leather skullcap.',
        category: 'equipment',
        slot: 'head',
        tier: 1,
        statModifiers: [{ stat: 'physicalDefense', value: 1 }],
    },
    {
        id: 'thinking-cap',
        name: 'Thinking Cap',
        description: 'A pointed felt cap, traditionally worn by stuck philosophers.',
        category: 'equipment',
        slot: 'head',
        tier: 1,
        setId: 'scholar',
        statModifiers: [{ stat: 'mind', value: 2 }],
    },
    {
        id: 'circlet-of-valor',
        name: 'Circlet of Valor',
        description: 'A simple silver band given for not running away.',
        category: 'equipment',
        slot: 'head',
        tier: 1,
        statModifiers: [
            { stat: 'heart', value: 1 },
            { stat: 'emotionalDefense', value: 1 },
        ],
    },
    {
        id: 'iron-helm',
        name: 'Iron Helm',
        description: 'Forged for soldiers who march longer than they think.',
        category: 'equipment',
        slot: 'head',
        tier: 2,
        statModifiers: [
            { stat: 'physicalDefense', value: 2 },
            { stat: 'body', value: 1 },
        ],
        resourceInteraction: {
            combatStartTokens: { body: 1 },
        },
    },
    {
        id: 'mind-crown',
        name: 'Mind Crown',
        description: 'A crown of woven silver-thought. The wearer\'s defenses adapt mid-clash.',
        category: 'equipment',
        slot: 'head',
        tier: 2,
        setId: 'scholar',
        statModifiers: [{ stat: 'mind', value: 3 }],
        resourceInteraction: {
            generationBonus: [{ trigger: 'defend', resourceType: 'mind', bonus: 2 }],
        },
    },
    {
        id: 'vision-mask',
        name: 'Vision Mask',
        description: 'A bone mask that lets the wearer see the next move before it lands.',
        category: 'equipment',
        slot: 'head',
        tier: 3,
        statModifiers: [
            { stat: 'mind', value: 2 },
            { stat: 'mentalDefense', value: 2 },
        ],
        resourceInteraction: {
            combatStartTokens: { mind: 2 },
        },
    },
    {
        id: 'warlord-helm',
        name: 'Warlord Helm',
        description: 'A helm fitted with the trophies of every captain its wearer has bested.',
        category: 'equipment',
        slot: 'head',
        tier: 3,
        statModifiers: [
            { stat: 'body', value: 2 },
            { stat: 'physicalDefense', value: 3 },
        ],
        resourceInteraction: {
            combatStartTokens: { body: 2 },
            generationBonus: [{ trigger: 'hit', resourceType: 'body', bonus: 1 }],
        },
    },
];

// ─── Body / Chest (7) ────────────────────────────────────────────────────────

const bodyChestSlots: EquipmentWithSet[] = [
    {
        id: 'rough-tunic',
        name: 'Rough Tunic',
        description: 'Coarse linen. It does what cloth can do.',
        category: 'equipment',
        slot: 'body',
        tier: 1,
        statModifiers: [{ stat: 'physicalDefense', value: 1 }],
    },
    {
        id: 'warrior-garb',
        name: "Warrior's Garb",
        description: 'Quilted padding cinched with leather straps.',
        category: 'equipment',
        slot: 'body',
        tier: 1,
        statModifiers: [
            { stat: 'body', value: 1 },
            { stat: 'physicalDefense', value: 1 },
        ],
    },
    {
        id: 'mystic-vestment',
        name: 'Mystic Vestment',
        description: 'A robe of constantly shifting glyphs. Reads the wearer to the foe.',
        category: 'equipment',
        slot: 'body',
        tier: 2,
        statModifiers: [
            { stat: 'mind', value: 2 },
            { stat: 'mentalDefense', value: 1 },
        ],
        resourceInteraction: {
            generationBonus: [{ trigger: 'any', resourceType: 'mind', bonus: 1 }],
        },
    },
    {
        id: 'heart-mantle',
        name: "Heart's Mantle",
        description: 'A heavy mantle that weighs the wearer\'s sincerity.',
        category: 'equipment',
        slot: 'body',
        tier: 2,
        setId: 'heart',
        statModifiers: [
            { stat: 'heart', value: 2 },
            { stat: 'emotionalDefense', value: 1 },
        ],
        resourceInteraction: {
            generationBonus: [{ trigger: 'defend', resourceType: 'heart', bonus: 1 }],
        },
    },
    {
        id: 'berserker-plate',
        name: 'Berserker Plate',
        description: 'Hammered iron painted with old blood-runes.',
        category: 'equipment',
        slot: 'body',
        tier: 2,
        setId: 'berserker',
        statModifiers: [
            { stat: 'body', value: 2 },
            { stat: 'physicalDefense', value: 2 },
        ],
        resourceInteraction: {
            combatStartTokens: { body: 2 },
        },
    },
    {
        id: 'sage-vestment',
        name: "Sage's Vestment",
        description: 'Robes pristine as a finished proof. Wearer thinks in straight lines.',
        category: 'equipment',
        slot: 'body',
        tier: 3,
        setId: 'scholar',
        statModifiers: [
            { stat: 'mind', value: 4 },
            { stat: 'mentalDefense', value: 2 },
        ],
        resourceInteraction: {
            combatStartTokens: { mind: 3 },
        },
    },
    {
        id: 'champion-plate',
        name: 'Champion Plate',
        description: 'Articulated mountain-iron. Worn by those who have earned it.',
        category: 'equipment',
        slot: 'body',
        tier: 3,
        setId: 'titan',
        statModifiers: [
            { stat: 'body', value: 3 },
            { stat: 'physicalDefense', value: 3 },
        ],
        resourceInteraction: {
            combatStartTokens: { body: 3 },
            generationBonus: [{ trigger: 'hit', resourceType: 'body', bonus: 1 }],
        },
    },
];

// ─── Hands / Gloves (7) ──────────────────────────────────────────────────────

const handsSlots: EquipmentWithSet[] = [
    {
        id: 'cloth-wraps',
        name: 'Cloth Wraps',
        description: 'Bare-knuckle wraps. Better than nothing.',
        category: 'equipment',
        slot: 'hands',
        tier: 1,
        statModifiers: [{ stat: 'physicalAttack', value: 1 }],
    },
    {
        id: 'iron-gauntlets',
        name: 'Iron Gauntlets',
        description: 'Heavy fingered iron. Grip is hard-won.',
        category: 'equipment',
        slot: 'hands',
        tier: 1,
        statModifiers: [
            { stat: 'body', value: 1 },
            { stat: 'physicalAttack', value: 1 },
        ],
    },
    {
        id: 'mind-gloves',
        name: 'Mind Gloves',
        description: 'Thin gloves that channel pinpoint thought into pinpoint strikes.',
        category: 'equipment',
        slot: 'hands',
        tier: 2,
        statModifiers: [{ stat: 'mind', value: 2 }],
        resourceInteraction: {
            generationBonus: [{ trigger: 'hit', resourceType: 'mind', bonus: 1 }],
        },
    },
    {
        id: 'heart-bracers',
        name: 'Heart Bracers',
        description: 'Leather bracers tooled with the wearer\'s vow.',
        category: 'equipment',
        slot: 'hands',
        tier: 2,
        setId: 'heart',
        statModifiers: [
            { stat: 'heart', value: 1 },
            { stat: 'emotionalAttack', value: 1 },
        ],
        resourceInteraction: {
            generationBonus: [{ trigger: 'any', resourceType: 'heart', bonus: 1 }],
        },
    },
    {
        id: 'berserker-gauntlets',
        name: "Berserker's Gauntlets",
        description: 'Spiked gauntlets pitted with old enemies\' teeth.',
        category: 'equipment',
        slot: 'hands',
        tier: 2,
        setId: 'berserker',
        statModifiers: [
            { stat: 'body', value: 2 },
            { stat: 'physicalAttack', value: 1 },
        ],
        resourceInteraction: {
            combatStartTokens: { body: 2 },
        },
    },
    {
        id: 'philosopher-wraps',
        name: "Philosopher's Wraps",
        description: 'Wrappings inked with the cleanest premise of every fight.',
        category: 'equipment',
        slot: 'hands',
        tier: 3,
        setId: 'scholar',
        statModifiers: [{ stat: 'mind', value: 3 }],
        resourceInteraction: {
            combatStartTokens: { mind: 2 },
            generationBonus: [{ trigger: 'hit', resourceType: 'mind', bonus: 1 }],
        },
    },
    {
        id: 'titan-gauntlets',
        name: 'Titan Gauntlets',
        description: 'Plated war-gauntlets the size of small anvils.',
        category: 'equipment',
        slot: 'hands',
        tier: 3,
        setId: 'titan',
        statModifiers: [
            { stat: 'body', value: 3 },
            { stat: 'physicalAttack', value: 2 },
        ],
        resourceInteraction: {
            combatStartTokens: { body: 3 },
        },
    },
];

// ─── Feet / Boots (6) ────────────────────────────────────────────────────────

const feetSlots: EquipmentWithSet[] = [
    {
        id: 'soft-boots',
        name: 'Soft Boots',
        description: 'Quiet leather, half-soled.',
        category: 'equipment',
        slot: 'feet',
        tier: 1,
        statModifiers: [{ stat: 'physicalDefense', value: 1 }],
    },
    {
        id: 'iron-boots',
        name: 'Iron Boots',
        description: 'Plated boots heavy enough to root the wearer to the ground.',
        category: 'equipment',
        slot: 'feet',
        tier: 1,
        statModifiers: [
            { stat: 'body', value: 1 },
            { stat: 'physicalDefense', value: 1 },
        ],
    },
    {
        id: 'scholar-shoes',
        name: "Scholar's Shoes",
        description: 'Calf-skin slippers worn flat by long library nights.',
        category: 'equipment',
        slot: 'feet',
        tier: 1,
        setId: 'scholar',
        statModifiers: [
            { stat: 'mind', value: 1 },
            { stat: 'mentalDefense', value: 1 },
        ],
    },
    {
        id: 'fleet-boots',
        name: 'Fleet Boots',
        description: 'Quick-soled boots that follow the wearer\'s line of thought.',
        category: 'equipment',
        slot: 'feet',
        tier: 2,
        statModifiers: [{ stat: 'mind', value: 2 }],
        resourceInteraction: {
            generationBonus: [{ trigger: 'any', resourceType: 'mind', bonus: 1 }],
        },
    },
    {
        id: 'heart-treads',
        name: 'Heart Treads',
        description: 'Boots that step in time with the wearer\'s convictions.',
        category: 'equipment',
        slot: 'feet',
        tier: 2,
        setId: 'heart',
        statModifiers: [{ stat: 'heart', value: 2 }],
        resourceInteraction: {
            generationBonus: [{ trigger: 'defend', resourceType: 'heart', bonus: 1 }],
        },
    },
    {
        id: 'berserker-boots',
        name: 'Berserker Boots',
        description: 'Iron-shod warboots. They crack flagstones when the bearer charges.',
        category: 'equipment',
        slot: 'feet',
        tier: 2,
        setId: 'berserker',
        statModifiers: [{ stat: 'body', value: 2 }],
        resourceInteraction: {
            combatStartTokens: { body: 2 },
        },
    },
];

// ─── Library Export ──────────────────────────────────────────────────────────

/**
 * The full equipment library for Spec 05b. Order: weapons, armor, accessories,
 * head, body, hands, feet. Exactly 50 entries (8 + 7 + 8 + 7 + 7 + 7 + 6).
 */
export const equipmentLibrary: Equipment[] = [
    ...weapons,
    ...armor,
    ...accessories,
    ...headSlots,
    ...bodyChestSlots,
    ...handsSlots,
    ...feetSlots,
];

const equipmentRegistry = new Map<string, Equipment>(
    equipmentLibrary.map(item => [item.id, item]),
);

/**
 * O(1) lookup by equipment ID. Returns `undefined` for unknown IDs so
 * callers can decide how to handle missing entries (e.g., quietly drop a
 * loot reference vs. throw on a starting equipment misconfiguration).
 */
export function getEquipmentById(id: string): Equipment | undefined {
    return equipmentRegistry.get(id);
}

/** Equipment pieces filtered by slot. Sorted by tier ascending for UI display. */
export function getEquipmentBySlot(slot: Equipment['slot']): Equipment[] {
    return equipmentLibrary
        .filter(item => item.slot === slot)
        .slice()
        .sort((a, b) => a.tier - b.tier);
}

/** Equipment pieces filtered by tier (1 / 2 / 3). */
export function getEquipmentByTier(tier: Equipment['tier']): Equipment[] {
    return equipmentLibrary.filter(item => item.tier === tier);
}
