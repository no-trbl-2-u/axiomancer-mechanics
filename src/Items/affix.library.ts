/**
 * Affix Library — prefix/suffix naming layer (2026-06-07 content pass).
 *
 * A thin, data-only naming layer that sits *on top of* the Spec 05d rolled-
 * modifier engine. Each `Affix` (see `modifier.types.ts`) couples a flavourful
 * display `word` to one or more existing catalogue modifier IDs via `modIds`.
 *
 * The drop factory (`dropItemWithAffixes` in `item.factory.ts`) selects affixes
 * appropriate to an item's slot + level, folds their `modIds` into the rolled
 * modifier set, and decorates the item's name via `composeItemName`:
 *   - prefix  → "<word> <base>"            e.g. "Keen Iron Blade"
 *   - suffix  → "<base> <word>"            e.g. "Iron Blade of the Bear"
 *   - both    → "<prefix> <base> <suffix>" e.g. "Keen Iron Blade of the Bear"
 *
 * Invariants kept here on purpose (mirrors the catalogue conventions):
 *   - `modIds` reference EXISTING catalogue modifiers only (procedural or
 *     unique). The factory resolves them through the same `getModifierById` /
 *     `pickValueTier` machinery a normal rolled mod uses.
 *   - `validSlots` must be compatible with every referenced mod's own
 *     `validSlots` (an affix is never offered on a slot its mods can't roll on).
 *   - `hiddenRarity` reuses the `HiddenModRarity` weights so affix selection
 *     shares the catalogue's common/uncommon/rare draw distribution.
 *
 * This layer is purely additive — `dropItem` is untouched; callers opt in via
 * `dropItemWithAffixes`.
 */

import { EquipmentSlot } from './types';
import { Affix, AffixRole, HiddenModRarity } from './modifier.types';

// ─── Prefixes (lead the item name) ───────────────────────────────────────────

export const prefixes: Affix[] = [
    {
        id: 'pfx-keen',
        word: 'Keen',
        role: 'prefix',
        modIds: ['wm-flat-damage'],
        validSlots: ['weapon'],
        hiddenRarity: 'common_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'prefix', 'weapon', 'offense'],
    },
    {
        id: 'pfx-honed',
        word: 'Honed',
        role: 'prefix',
        modIds: ['wm-skill-edge'],
        validSlots: ['weapon'],
        hiddenRarity: 'common_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'prefix', 'weapon', 'offense'],
    },
    {
        id: 'pfx-vicious',
        word: 'Vicious',
        role: 'prefix',
        modIds: ['wm-flat-damage', 'wm-crit-rate'],
        validSlots: ['weapon'],
        hiddenRarity: 'uncommon_mod',
        minLevel: 10,
        addedIn: '2026-06-07',
        tags: ['affix', 'prefix', 'weapon', 'offense', 'crit'],
    },
    {
        id: 'pfx-savage',
        word: 'Savage',
        role: 'prefix',
        modIds: ['wm-crit-damage'],
        validSlots: ['weapon'],
        hiddenRarity: 'rare_mod',
        minLevel: 20,
        addedIn: '2026-06-07',
        tags: ['affix', 'prefix', 'weapon', 'offense', 'crit'],
    },
    {
        id: 'pfx-vampiric',
        word: 'Vampiric',
        role: 'prefix',
        modIds: ['wm-lifesteal'],
        validSlots: ['weapon'],
        hiddenRarity: 'uncommon_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'prefix', 'weapon', 'sustain'],
    },
    {
        id: 'pfx-crushing',
        word: 'Crushing',
        role: 'prefix',
        modIds: ['hndm-strength'],
        validSlots: ['hands'],
        hiddenRarity: 'common_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'prefix', 'hands', 'offense'],
    },
    {
        id: 'pfx-fortified',
        word: 'Fortified',
        role: 'prefix',
        modIds: ['bm-armor'],
        validSlots: ['body'],
        hiddenRarity: 'common_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'prefix', 'body', 'defense'],
    },
    {
        id: 'pfx-hardened',
        word: 'Hardened',
        role: 'prefix',
        modIds: ['armm-defense'],
        validSlots: ['armor'],
        hiddenRarity: 'common_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'prefix', 'armor', 'defense'],
    },
    {
        id: 'pfx-stalwart',
        word: 'Stalwart',
        role: 'prefix',
        modIds: ['bm-vitality'],
        validSlots: ['body'],
        hiddenRarity: 'common_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'prefix', 'body', 'defense'],
    },
    {
        id: 'pfx-swift',
        word: 'Swift',
        role: 'prefix',
        modIds: ['fm-evasion'],
        validSlots: ['feet'],
        hiddenRarity: 'common_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'prefix', 'feet', 'evasion'],
    },
    {
        id: 'pfx-phantom',
        word: 'Phantom',
        role: 'prefix',
        modIds: ['fm-evasion-proc'],
        validSlots: ['feet'],
        hiddenRarity: 'uncommon_mod',
        minLevel: 10,
        addedIn: '2026-06-07',
        tags: ['affix', 'prefix', 'feet', 'evasion'],
    },
    {
        id: 'pfx-warded',
        word: 'Warded',
        role: 'prefix',
        modIds: ['hm-mental-defense'],
        validSlots: ['head'],
        hiddenRarity: 'common_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'prefix', 'head', 'defense', 'mental'],
    },
    {
        id: 'pfx-sage',
        word: 'Sage',
        role: 'prefix',
        modIds: ['hm-insight'],
        validSlots: ['head'],
        hiddenRarity: 'uncommon_mod',
        minLevel: 5,
        addedIn: '2026-06-07',
        tags: ['affix', 'prefix', 'head', 'mental'],
    },
    {
        id: 'pfx-balanced',
        word: 'Balanced',
        role: 'prefix',
        modIds: ['am-cross-stat'],
        validSlots: ['accessory'],
        hiddenRarity: 'common_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'prefix', 'accessory', 'utility'],
    },
    {
        id: 'pfx-resonant',
        word: 'Resonant',
        role: 'prefix',
        modIds: ['am-stance-res'],
        validSlots: ['accessory'],
        hiddenRarity: 'uncommon_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'prefix', 'accessory', 'resource'],
    },
    {
        id: 'pfx-blazing',
        word: 'Blazing',
        role: 'prefix',
        modIds: ['wm-bleeding-edge'],
        validSlots: ['weapon'],
        hiddenRarity: 'uncommon_mod',
        minLevel: 10,
        addedIn: '2026-06-07',
        tags: ['affix', 'prefix', 'weapon', 'dot'],
    },
];

// ─── Suffixes (trail the item name) ──────────────────────────────────────────

export const suffixes: Affix[] = [
    {
        id: 'sfx-of-the-bear',
        word: 'of the Bear',
        role: 'suffix',
        modIds: ['armm-vitality'],
        validSlots: ['armor'],
        hiddenRarity: 'common_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'suffix', 'armor', 'defense'],
    },
    {
        id: 'sfx-of-the-ox',
        word: 'of the Ox',
        role: 'suffix',
        modIds: ['bm-vitality'],
        validSlots: ['body'],
        hiddenRarity: 'common_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'suffix', 'body', 'defense'],
    },
    {
        id: 'sfx-of-clarity',
        word: 'of Clarity',
        role: 'suffix',
        modIds: ['hm-mind-gen'],
        validSlots: ['head'],
        hiddenRarity: 'uncommon_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'suffix', 'head', 'mental', 'resource'],
    },
    {
        id: 'sfx-of-insight',
        word: 'of Insight',
        role: 'suffix',
        modIds: ['hm-insight'],
        validSlots: ['head'],
        hiddenRarity: 'uncommon_mod',
        minLevel: 5,
        addedIn: '2026-06-07',
        tags: ['affix', 'suffix', 'head', 'mental'],
    },
    {
        id: 'sfx-of-warding',
        word: 'of Warding',
        role: 'suffix',
        modIds: ['armm-stoic'],
        validSlots: ['armor'],
        hiddenRarity: 'uncommon_mod',
        minLevel: 10,
        addedIn: '2026-06-07',
        tags: ['affix', 'suffix', 'armor', 'defense'],
    },
    {
        id: 'sfx-of-the-fortress',
        word: 'of the Fortress',
        role: 'suffix',
        modIds: ['bm-damage-reduction'],
        validSlots: ['body'],
        hiddenRarity: 'rare_mod',
        minLevel: 15,
        addedIn: '2026-06-07',
        tags: ['affix', 'suffix', 'body', 'defense'],
    },
    {
        id: 'sfx-of-thorns',
        word: 'of Thorns',
        role: 'suffix',
        modIds: ['bm-reflect'],
        validSlots: ['body'],
        hiddenRarity: 'rare_mod',
        minLevel: 10,
        addedIn: '2026-06-07',
        tags: ['affix', 'suffix', 'body', 'defense', 'proc'],
    },
    {
        id: 'sfx-of-the-fox',
        word: 'of the Fox',
        role: 'suffix',
        modIds: ['fm-physical-save'],
        validSlots: ['feet'],
        hiddenRarity: 'common_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'suffix', 'feet', 'defense'],
    },
    {
        id: 'sfx-of-the-wind',
        word: 'of the Wind',
        role: 'suffix',
        modIds: ['fm-haste'],
        validSlots: ['feet'],
        hiddenRarity: 'rare_mod',
        minLevel: 20,
        addedIn: '2026-06-07',
        tags: ['affix', 'suffix', 'feet', 'utility'],
    },
    {
        id: 'sfx-of-precision',
        word: 'of Precision',
        role: 'suffix',
        modIds: ['hndm-crit-rate'],
        validSlots: ['hands'],
        hiddenRarity: 'uncommon_mod',
        minLevel: 10,
        addedIn: '2026-06-07',
        tags: ['affix', 'suffix', 'hands', 'crit'],
    },
    {
        id: 'sfx-of-the-duelist',
        word: 'of the Duelist',
        role: 'suffix',
        modIds: ['hndm-counter'],
        validSlots: ['hands'],
        hiddenRarity: 'rare_mod',
        minLevel: 20,
        addedIn: '2026-06-07',
        tags: ['affix', 'suffix', 'hands', 'proc'],
    },
    {
        id: 'sfx-of-the-leech',
        word: 'of the Leech',
        role: 'suffix',
        modIds: ['wm-lifesteal'],
        validSlots: ['weapon'],
        hiddenRarity: 'uncommon_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'suffix', 'weapon', 'sustain'],
    },
    {
        id: 'sfx-of-ruin',
        word: 'of Ruin',
        role: 'suffix',
        modIds: ['wm-exploit'],
        validSlots: ['weapon'],
        hiddenRarity: 'rare_mod',
        minLevel: 10,
        addedIn: '2026-06-07',
        tags: ['affix', 'suffix', 'weapon', 'offense'],
    },
    {
        id: 'sfx-of-mending',
        word: 'of Mending',
        role: 'suffix',
        modIds: ['am-regen'],
        validSlots: ['accessory'],
        hiddenRarity: 'uncommon_mod',
        minLevel: 10,
        addedIn: '2026-06-07',
        tags: ['affix', 'suffix', 'accessory', 'sustain'],
    },
    {
        id: 'sfx-of-the-heart',
        word: 'of the Heart',
        role: 'suffix',
        modIds: ['am-heart-focus'],
        validSlots: ['accessory'],
        hiddenRarity: 'common_mod',
        minLevel: 1,
        addedIn: '2026-06-07',
        tags: ['affix', 'suffix', 'accessory', 'emotional'],
    },
    {
        id: 'sfx-of-the-triune',
        word: 'of the Triune',
        role: 'suffix',
        modIds: ['am-all-attunement'],
        validSlots: ['accessory'],
        hiddenRarity: 'rare_mod',
        minLevel: 25,
        addedIn: '2026-06-07',
        tags: ['affix', 'suffix', 'accessory', 'utility'],
    },
];

// ─── Registry + helpers ──────────────────────────────────────────────────────

/** Every affix (prefixes followed by suffixes), in declaration order. */
export const allAffixes: ReadonlyArray<Affix> = [...prefixes, ...suffixes];

const affixRegistry = new Map<string, Affix>(allAffixes.map(a => [a.id, a]));

/** O(1) lookup by affix id. Returns `undefined` for unknown ids. */
export function getAffixById(id: string): Affix | undefined {
    return affixRegistry.get(id);
}

/**
 * Composes a decorated item name from a base name and optional affixes.
 *
 *   - prefix only → "<prefix.word> <base>"
 *   - suffix only → "<base> <suffix.word>"
 *   - both        → "<prefix.word> <base> <suffix.word>"
 *   - neither     → "<base>"
 *
 * Pure; never mutates its inputs.
 */
export function composeItemName(
    baseName: string,
    prefix?: Affix,
    suffix?: Affix,
): string {
    let name = baseName;
    if (prefix) name = `${prefix.word} ${name}`;
    if (suffix) name = `${name} ${suffix.word}`;
    return name;
}

/**
 * Returns every affix eligible for the given (slot, level, role):
 *   - `validSlots` includes `slot`, and
 *   - `minLevel <= level`.
 *
 * Declaration order is preserved so callers get a deterministic candidate
 * list (the factory then samples it with a seeded rng).
 */
export function affixesForSlot(
    slot: EquipmentSlot,
    level: number,
    role: AffixRole,
): Affix[] {
    const pool = role === 'prefix' ? prefixes : suffixes;
    return pool.filter(a => a.validSlots.includes(slot) && a.minLevel <= level);
}

/** Affix draw weights, reusing the hidden-mod rarity scale. */
export const AFFIX_RARITY_WEIGHTS: Record<HiddenModRarity, number> = {
    common_mod: 10,
    uncommon_mod: 3,
    rare_mod: 1,
};
