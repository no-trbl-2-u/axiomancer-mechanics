/**
 * Modifier Catalogue — Spec 05d content (minimum viable).
 *
 * Seven slot-keyed pools + one unique-only pool. Each `Modifier` is a static
 * data object — no functions on the modifier (Q1) — so the whole catalogue is
 * serialisable for save files and Spec 11's seeded-RNG harness.
 *
 * Substitution at resolve time (Spec 05d Q3):
 *   - `value: 0`  in `payload.statModifiers`               → rolled value
 *   - `bonus: 0`  in `payload.resourceInteraction.generationBonus`  → rolled value
 *   - `0` keys    in `payload.resourceInteraction.combatStartTokens` → rolled value
 *   - `passiveEffects` / `onHitEffects` / `onDefendEffects` are presence-only
 *     (the rolled value is a presence marker; the array is concatenated as-is).
 *
 * Effect-ID references resolve against the global effects library
 * (`src/Effects/buffs.library.json`, `debuffs.library.json`). Where the spec's
 * suggested payload (e.g. "reflectDamage +N", "expose proc chance +N%") has no
 * direct primitive in the engine today, the catalogue maps to the closest
 * existing effect — see the per-mod comments. Future engine work can swap the
 * mapping without changing IDs.
 *
 * Q4 — `uniqueModPool` is *never* drawn by the procedural roll path. The
 * factory only resolves these IDs when `UniqueItemTemplate.fixedModIds`
 * references them.
 */

import { EquipmentSlot } from './types';
import { Modifier, ModValueTier } from './modifier.types';

// ─── Weapon pool ─────────────────────────────────────────────────────────────

export const weaponModPool: Modifier[] = [
    {
        id: 'wm-flat-damage',
        name: 'Keen Edge',
        hiddenRarity: 'common_mod',
        validSlots: ['weapon'],
        levelTiers: [
            { levelReq: 1,  range: [1, 3] },
            { levelReq: 10, range: [4, 8] },
            { levelReq: 20, range: [9, 15] },
        ],
        payload: {
            statModifiers: [{ stat: 'physicalAttack', value: 0 }],
        },
    },
    {
        id: 'wm-lifesteal',
        name: 'Vampiric Strike',
        hiddenRarity: 'uncommon_mod',
        validSlots: ['weapon'],
        levelTiers: [
            { levelReq: 1,  range: [1, 2] },
            { levelReq: 10, range: [2, 3] },
            { levelReq: 20, range: [3, 5] },
        ],
        // `buff_life_steal` — wearer regenerates a fraction of damage dealt.
        payload: {
            onHitEffects: [{
                effectId: 'buff_life_steal',
                target: 'self',
                baseChance: 0.35,
                tier: 2,
            }],
        },
    },
    {
        id: 'wm-body-gen',
        name: 'Body Resonance',
        hiddenRarity: 'uncommon_mod',
        validSlots: ['weapon'],
        levelTiers: [
            { levelReq: 1,  range: [1, 1] },
            { levelReq: 10, range: [1, 2] },
            { levelReq: 20, range: [2, 3] },
        ],
        payload: {
            resourceInteraction: {
                generationBonus: [{ trigger: 'hit', resourceType: 'body', bonus: 0 }],
            },
        },
    },
    {
        id: 'wm-exploit',
        name: 'Exploit Weakness',
        hiddenRarity: 'rare_mod',
        validSlots: ['weapon'],
        levelTiers: [
            { levelReq: 10, range: [2, 4] },
            { levelReq: 20, range: [5, 8] },
        ],
        // Stat boost is parameterised by the rolled value; the proc chance is
        // a fixed fraction (Spec 05d's "+N% chance" is a design intent —
        // implementing it as a per-mod scalable chance is deferred until the
        // proc engine supports value-templated `baseChance`).
        payload: {
            statModifiers: [{ stat: 'physicalAttack', value: 0 }],
            onHitEffects: [{
                effectId: 'debuff_vulnerability_body',
                target: 'opponent',
                baseChance: 0.20,
                tier: 2,
            }],
        },
    },
];

// ─── Head pool ───────────────────────────────────────────────────────────────

export const headModPool: Modifier[] = [
    {
        id: 'hm-max-hp',
        name: 'Resilient Mind',
        hiddenRarity: 'common_mod',
        validSlots: ['head'],
        levelTiers: [
            { levelReq: 1,  range: [5, 15] },
            { levelReq: 10, range: [16, 35] },
            { levelReq: 20, range: [36, 60] },
        ],
        // `EffectStatTarget` has no `maxHp` today — the closest primitive is
        // the `buff_max_hp_up` passive. The rolled value is a presence marker
        // until the engine supports per-mod intensity overrides for passives.
        payload: {
            passiveEffects: ['buff_max_hp_up'],
        },
    },
    {
        id: 'hm-mind-gen',
        name: 'Clear Thought',
        hiddenRarity: 'uncommon_mod',
        validSlots: ['head'],
        levelTiers: [
            { levelReq: 1,  range: [1, 1] },
            { levelReq: 10, range: [1, 2] },
            { levelReq: 20, range: [2, 3] },
        ],
        payload: {
            resourceInteraction: {
                generationBonus: [{ trigger: 'any', resourceType: 'mind', bonus: 0 }],
            },
        },
    },
    {
        id: 'hm-effect-dur',
        name: 'Focused Channel',
        hiddenRarity: 'rare_mod',
        validSlots: ['head'],
        levelTiers: [
            { levelReq: 10, range: [1, 1] },
        ],
        payload: {
            passiveEffects: ['buff_buff_duration_up'],
        },
    },
];

// ─── Body / Chest pool ───────────────────────────────────────────────────────

export const bodyModPool: Modifier[] = [
    {
        id: 'bm-armor',
        name: 'Fortified',
        hiddenRarity: 'common_mod',
        validSlots: ['body'],
        levelTiers: [
            { levelReq: 1,  range: [2, 5] },
            { levelReq: 10, range: [6, 12] },
            { levelReq: 20, range: [13, 22] },
        ],
        payload: {
            statModifiers: [{ stat: 'physicalDefense', value: 0 }],
        },
    },
    {
        id: 'bm-heart-gen',
        name: 'Steady Heart',
        hiddenRarity: 'uncommon_mod',
        validSlots: ['body'],
        levelTiers: [
            { levelReq: 1,  range: [1, 1] },
            { levelReq: 10, range: [1, 2] },
            { levelReq: 20, range: [2, 3] },
        ],
        payload: {
            resourceInteraction: {
                generationBonus: [{ trigger: 'defend', resourceType: 'heart', bonus: 0 }],
            },
        },
    },
    {
        id: 'bm-reflect',
        name: 'Thorned',
        hiddenRarity: 'rare_mod',
        validSlots: ['body'],
        levelTiers: [
            { levelReq: 10, range: [1, 3] },
            { levelReq: 20, range: [4, 7] },
        ],
        // No `reflectDamage` stat in `EffectStatTarget`; modelled as the
        // `buff_reflect` passive. Rolled value is a presence marker today.
        payload: {
            passiveEffects: ['buff_reflect'],
        },
    },
];

// ─── Hands pool ──────────────────────────────────────────────────────────────

export const handsModPool: Modifier[] = [
    {
        id: 'hndm-body-gen',
        name: 'Iron Grip',
        hiddenRarity: 'common_mod',
        validSlots: ['hands'],
        levelTiers: [
            { levelReq: 1,  range: [1, 1] },
            { levelReq: 10, range: [1, 2] },
            { levelReq: 20, range: [2, 2] },
        ],
        payload: {
            resourceInteraction: {
                generationBonus: [{ trigger: 'hit', resourceType: 'body', bonus: 0 }],
            },
        },
    },
    {
        id: 'hndm-crit',
        name: 'Precise Hands',
        hiddenRarity: 'uncommon_mod',
        validSlots: ['hands'],
        levelTiers: [
            { levelReq: 1,  range: [1, 2] },
            { levelReq: 10, range: [3, 5] },
            { levelReq: 20, range: [6, 9] },
        ],
        payload: {
            statModifiers: [{ stat: 'physicalSkill', value: 0 }],
        },
    },
    {
        id: 'hndm-block',
        name: 'Shield Training',
        hiddenRarity: 'rare_mod',
        validSlots: ['hands'],
        levelTiers: [
            { levelReq: 5, range: [1, 1] },
        ],
        payload: {
            onDefendEffects: [{
                effectId: 'buff_damage_reduction',
                target: 'self',
                baseChance: 0.40,
                tier: 2,
            }],
        },
    },
];

// ─── Feet pool ───────────────────────────────────────────────────────────────

export const feetModPool: Modifier[] = [
    {
        id: 'fm-evasion',
        name: 'Swift Feet',
        hiddenRarity: 'common_mod',
        validSlots: ['feet'],
        levelTiers: [
            { levelReq: 1,  range: [1, 3] },
            { levelReq: 10, range: [4, 7] },
            { levelReq: 20, range: [8, 12] },
        ],
        payload: {
            statModifiers: [{ stat: 'physicalSave', value: 0 }],
        },
    },
    {
        id: 'fm-cs-tokens',
        name: 'Ready Stride',
        hiddenRarity: 'uncommon_mod',
        validSlots: ['feet'],
        levelTiers: [
            { levelReq: 1,  range: [1, 1] },
            { levelReq: 10, range: [1, 2] },
            { levelReq: 20, range: [2, 3] },
        ],
        // Per Spec 05d "one resource type, designer's choice per template" —
        // catalogue picks `body`. Future per-template variants can replace
        // this entry with a heart- or mind-flavoured sibling.
        payload: {
            resourceInteraction: {
                combatStartTokens: { body: 0 },
            },
        },
    },
    {
        id: 'fm-initiative',
        name: 'First Step',
        hiddenRarity: 'rare_mod',
        validSlots: ['feet'],
        levelTiers: [
            { levelReq: 5,  range: [1, 3] },
            { levelReq: 20, range: [4, 7] },
        ],
        payload: {
            statModifiers: [{ stat: 'luck', value: 0 }],
        },
    },
];

// ─── Accessory pool ──────────────────────────────────────────────────────────

export const accessoryModPool: Modifier[] = [
    {
        id: 'am-cross-stat',
        name: 'Balanced Focus',
        hiddenRarity: 'common_mod',
        validSlots: ['accessory'],
        levelTiers: [
            { levelReq: 1,  range: [1, 2] },
            { levelReq: 10, range: [2, 4] },
            { levelReq: 20, range: [4, 7] },
        ],
        // Two different stats, each receiving the rolled value (both sentinels
        // resolve to the same N — Spec 05d's "+N each" reading).
        payload: {
            statModifiers: [
                { stat: 'body', value: 0 },
                { stat: 'mind', value: 0 },
            ],
        },
    },
    {
        id: 'am-stance-res',
        name: 'Resonant Stone',
        hiddenRarity: 'uncommon_mod',
        validSlots: ['accessory'],
        levelTiers: [
            { levelReq: 1,  range: [1, 2] },
            { levelReq: 10, range: [2, 3] },
            { levelReq: 20, range: [3, 4] },
        ],
        // Picks `mind` as the stance the catalogue grants. Sibling variants
        // can be added later for body / heart flavours.
        payload: {
            resourceInteraction: {
                combatStartTokens: { mind: 0 },
            },
        },
    },
    {
        id: 'am-proc-boost',
        name: 'Catalyst Charm',
        hiddenRarity: 'rare_mod',
        validSlots: ['accessory'],
        levelTiers: [
            { levelReq: 10, range: [5, 10] },
            { levelReq: 20, range: [11, 20] },
        ],
        // Spec 05d's "increases baseChance of existing onHitEffects by N%"
        // is a meta-mod operating on other equipment. With data-only payloads
        // (Q1) that needs a proc-boost engine pass; until then the rolled
        // value buffs `luck`, which already feeds proc-adjacent rolls.
        payload: {
            statModifiers: [{ stat: 'luck', value: 0 }],
        },
    },
];

// ─── Armor pool ──────────────────────────────────────────────────────────────

export const armorModPool: Modifier[] = [
    {
        id: 'armm-defense',
        name: 'Hardened',
        hiddenRarity: 'common_mod',
        validSlots: ['armor'],
        levelTiers: [
            { levelReq: 1,  range: [3, 7] },
            { levelReq: 10, range: [8, 16] },
            { levelReq: 20, range: [17, 28] },
        ],
        payload: {
            statModifiers: [{ stat: 'physicalDefense', value: 0 }],
        },
    },
    {
        id: 'armm-heart-start',
        name: 'Brave Bearing',
        hiddenRarity: 'uncommon_mod',
        validSlots: ['armor'],
        levelTiers: [
            { levelReq: 1,  range: [1, 2] },
            { levelReq: 10, range: [2, 3] },
            { levelReq: 20, range: [3, 5] },
        ],
        payload: {
            resourceInteraction: {
                combatStartTokens: { heart: 0 },
            },
        },
    },
    {
        id: 'armm-regen',
        name: 'Enduring',
        hiddenRarity: 'rare_mod',
        validSlots: ['armor'],
        levelTiers: [
            { levelReq: 5, range: [1, 1] },
        ],
        payload: {
            passiveEffects: ['buff_regeneration'],
        },
    },
];

// ─── Unique-only pool (Q4 — never in procedural draws) ───────────────────────

export const uniqueModPool: Modifier[] = [
    {
        id: 'um-stance-echo',
        name: 'Stance Echo',
        hiddenRarity: 'rare_mod',
        // `validSlots` lists hosts — Uniques on either weapon or accessory may
        // currently carry this signature mod via `fixedModIds`.
        validSlots: ['weapon', 'accessory'],
        levelTiers: [
            { levelReq: 5,  range: [1, 1] },
            { levelReq: 15, range: [1, 2] },
        ],
        payload: {
            resourceInteraction: {
                generationBonus: [
                    { trigger: 'any', resourceType: 'heart', bonus: 0 },
                    { trigger: 'any', resourceType: 'body',  bonus: 0 },
                    { trigger: 'any', resourceType: 'mind',  bonus: 0 },
                ],
            },
        },
    },
    {
        id: 'um-paradox-edge',
        name: 'Paradox Edge',
        hiddenRarity: 'rare_mod',
        validSlots: ['weapon'],
        levelTiers: [
            { levelReq: 10, range: [1, 1] },
        ],
        // Two procs ride the same hit — vulnerability and a confusion debuff,
        // landing simultaneously when the wearer connects.
        payload: {
            onHitEffects: [
                {
                    effectId: 'debuff_vulnerability_body',
                    target: 'opponent',
                    baseChance: 0.30,
                    tier: 3,
                },
                {
                    effectId: 'debuff_confusion',
                    target: 'opponent',
                    baseChance: 0.30,
                    tier: 3,
                },
            ],
        },
    },
    {
        id: 'um-resonance-prime',
        name: 'Resonance Prime',
        hiddenRarity: 'rare_mod',
        validSlots: ['accessory'],
        levelTiers: [
            { levelReq: 15, range: [1, 2] },
            { levelReq: 20, range: [2, 3] },
        ],
        payload: {
            resourceInteraction: {
                combatStartTokens: { heart: 0, body: 0, mind: 0 },
            },
        },
    },
];

// ─── Slot → procedural pool map (Spec 05d §4 helper) ─────────────────────────

/**
 * Procedural mod pools keyed by slot. `rollModifiers` (`item.factory.ts`)
 * draws from these; `uniqueModPool` is excluded by design (Q4).
 */
export const MOD_POOLS: Record<EquipmentSlot, Modifier[]> = {
    weapon:    weaponModPool,
    armor:     armorModPool,
    head:      headModPool,
    body:      bodyModPool,
    hands:     handsModPool,
    feet:      feetModPool,
    accessory: accessoryModPool,
};

// ─── Unified registry for O(1) resolve-time lookups ──────────────────────────

const allMods: Modifier[] = [
    ...weaponModPool,
    ...armorModPool,
    ...headModPool,
    ...bodyModPool,
    ...handsModPool,
    ...feetModPool,
    ...accessoryModPool,
    ...uniqueModPool,
];

const modRegistry = new Map<string, Modifier>(allMods.map(m => [m.id, m]));

/** O(1) lookup across every pool (procedural + unique). */
export function getModifierById(id: string): Modifier | undefined {
    return modRegistry.get(id);
}

/**
 * Picks the highest `ModValueTier` whose `levelReq <= playerLevel`. Returns
 * `undefined` when the mod has no eligible tier (caller filters this out
 * before sampling).
 */
export function pickValueTier(mod: Modifier, playerLevel: number): ModValueTier | undefined {
    let best: ModValueTier | undefined;
    for (const tier of mod.levelTiers) {
        if (tier.levelReq <= playerLevel) {
            if (!best || tier.levelReq > best.levelReq) best = tier;
        }
    }
    return best;
}

/** All catalogue mods exported as a frozen array — handy for invariants tests. */
export const allModifiers: ReadonlyArray<Modifier> = allMods;
