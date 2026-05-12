/**
 * Item Factory — `dropItem` (Spec 05c).
 *
 * Turns an authored `EquipmentTemplate` / `UniqueItemTemplate` into a runtime
 * `Equipment` instance. Rarity is decided either by the caller (loot tables /
 * tests) or by a weighted random draw against the table in Spec 05c §9.
 *
 * The mod-catalogue inlined here is a minimal Spec 05c stub — exactly enough
 * to drop Commons / Uncommons / Rares / Uniques with the right *shape* and
 * deterministic value ranges. Spec 05d will replace it with a richer catalogue
 * (and richer `rollModifiers` / `resolveModifiers` implementations). Until
 * then, dropped items mechanically work end-to-end through `equipItem` and
 * `getEquipmentModifiers`.
 *
 * Determinism — every random draw inside the factory consumes from the
 * caller-supplied `rng` (defaults to `Math.random`). Two calls with the same
 * seeded `rng` produce identical Equipment instances. This keeps Spec 05c
 * hermetically testable today and aligns with Spec 11's seeded-RNG design.
 */

import {
    Equipment,
    EquipmentTemplate,
    UniqueItemTemplate,
    ItemRarity,
    RolledModifier,
    EquipmentSlot,
} from './types';
import { StatModifier, EffectStatTarget } from '../Effects/types';
import { getEquipmentTemplate } from './equipment.templates';
import { getUniqueTemplate } from './unique.templates';

// ─── Modifier catalogue (Spec 05c stub) ──────────────────────────────────────

/**
 * Minimal mod-catalogue entry. Spec 05d replaces this with a richer shape
 * (proc triggers, multiplier mods, themed pools). Each entry declares:
 *
 *   - `stat`      — the `EffectStatTarget` the rolled mod boosts.
 *   - `slotScope` — slots this mod can roll on. `undefined` means "unique-only"
 *                   (excluded from the procedural pool — only ever drops when
 *                   referenced by a `UniqueItemTemplate.fixedModIds`).
 *   - `minBase`   — minimum rolled value at any player level.
 *   - `perLevel`  — additional rolled value cap per player level above 1.
 *
 * The roll range at level `L` is `[minBase, minBase + floor(perLevel * (L-1))]`
 * inclusive — i.e. an Uncommon dropped at level 8 with `perLevel: 1` rolls
 * between `minBase` and `minBase + 7`.
 */
interface ModCatalogueEntry {
    id: string;
    stat: EffectStatTarget;
    slotScope?: EquipmentSlot[];
    minBase: number;
    perLevel: number;
}

const MOD_CATALOGUE: ModCatalogueEntry[] = [
    // ─── Procedural — weapon ─────────────────────────────────────────────────
    { id: 'weapon_body_flat',          stat: 'body',           slotScope: ['weapon'],                          minBase: 1, perLevel: 1 },
    { id: 'weapon_physical_attack',    stat: 'physicalAttack', slotScope: ['weapon'],                          minBase: 1, perLevel: 1 },
    { id: 'weapon_mental_attack',      stat: 'mentalAttack',   slotScope: ['weapon'],                          minBase: 1, perLevel: 1 },

    // ─── Procedural — armor / head / body / feet ─────────────────────────────
    { id: 'armor_physical_defense',    stat: 'physicalDefense', slotScope: ['armor', 'head', 'body', 'feet'], minBase: 1, perLevel: 1 },
    { id: 'armor_body_flat',           stat: 'body',            slotScope: ['armor', 'head', 'body', 'feet'], minBase: 1, perLevel: 1 },
    { id: 'armor_mental_defense',      stat: 'mentalDefense',   slotScope: ['armor', 'head', 'body', 'feet'], minBase: 1, perLevel: 1 },

    // ─── Procedural — hands ──────────────────────────────────────────────────
    { id: 'hands_physical_attack',     stat: 'physicalAttack', slotScope: ['hands'], minBase: 1, perLevel: 1 },
    { id: 'hands_body_flat',           stat: 'body',           slotScope: ['hands'], minBase: 1, perLevel: 1 },

    // ─── Procedural — accessory ──────────────────────────────────────────────
    { id: 'accessory_mind_flat',       stat: 'mind',           slotScope: ['accessory'], minBase: 1, perLevel: 1 },
    { id: 'accessory_body_flat',       stat: 'body',           slotScope: ['accessory'], minBase: 1, perLevel: 1 },
    { id: 'accessory_heart_flat',      stat: 'heart',          slotScope: ['accessory'], minBase: 1, perLevel: 1 },
    { id: 'accessory_mental_defense',  stat: 'mentalDefense',  slotScope: ['accessory'], minBase: 1, perLevel: 1 },

    // ─── Unique-only signature mods (not in procedural pool) ─────────────────
    { id: 'unique_axioms_edge_crit',   stat: 'luck',           minBase: 2, perLevel: 0 },
    { id: 'unique_paradox_loop_echo',  stat: 'mentalAttack',   minBase: 2, perLevel: 0 },
];

const MOD_REGISTRY: Map<string, ModCatalogueEntry> = new Map(
    MOD_CATALOGUE.map(entry => [entry.id, entry]),
);

/**
 * Procedural pool for a given slot — every catalogue entry whose `slotScope`
 * includes the slot. Unique-only mods (`slotScope` omitted) are excluded.
 */
function proceduralPoolForSlot(slot: EquipmentSlot): ModCatalogueEntry[] {
    return MOD_CATALOGUE.filter(entry => entry.slotScope?.includes(slot));
}

/**
 * Rolls a single mod value within `[minBase, minBase + floor(perLevel * (L-1))]`
 * inclusive, using the caller-supplied RNG. Unknown mod IDs (e.g. a Unique
 * template referencing a Spec 05d mod that doesn't exist yet) roll `0` so the
 * shape stays well-formed without crashing.
 */
function rollValue(modId: string, playerLevel: number, rng: () => number): number {
    const entry = MOD_REGISTRY.get(modId);
    if (!entry) return 0;
    const levelBonus = Math.floor(entry.perLevel * Math.max(0, playerLevel - 1));
    const delta = Math.floor(rng() * (levelBonus + 1));
    return entry.minBase + delta;
}

// ─── Rarity weight table (Spec 05c §9) ───────────────────────────────────────

const RARITY_WEIGHTS: ReadonlyArray<readonly [Exclude<ItemRarity, 'unique'>, number]> = [
    ['common',   60],
    ['uncommon', 30],
    ['rare',      9],
];
const RARITY_WEIGHTS_WITH_UNIQUE: ReadonlyArray<readonly [ItemRarity, number]> = [
    ...RARITY_WEIGHTS,
    ['unique', 1],
];

function drawWeighted<T>(
    entries: ReadonlyArray<readonly [T, number]>,
    rng: () => number,
): T {
    const total = entries.reduce((acc, [, w]) => acc + w, 0);
    const roll = rng() * total;
    let cursor = 0;
    for (const [value, weight] of entries) {
        cursor += weight;
        if (roll < cursor) return value;
    }
    return entries[entries.length - 1]![0];
}

// ─── Roll & resolve ──────────────────────────────────────────────────────────

const MODS_PER_RARITY: Record<ItemRarity, number> = {
    common:   0,
    uncommon: 1,
    rare:     2,
    unique:   3,
};

/**
 * Rolls the modifier list for a given (template, rarity, playerLevel).
 *
 * - `common`            — empty array.
 * - `uncommon` / `rare` — N distinct procedural mods drawn (without replacement)
 *                         from the slot's procedural pool. Throws if the pool
 *                         is smaller than the requested count.
 * - `unique`             — the template's `fixedModIds` triple, in declaration
 *                         order, with values rolled from the catalogue. Requires
 *                         a `UniqueItemTemplate`.
 */
export function rollModifiers(
    template: EquipmentTemplate,
    rarity: ItemRarity,
    playerLevel: number,
    rng: () => number,
): RolledModifier[] {
    if (rarity === 'common') return [];

    if (rarity === 'unique') {
        if (!isUnique(template)) {
            throw new Error(
                `dropItem: rarity 'unique' requires a UniqueItemTemplate; ` +
                `template '${template.id}' has no fixedModIds.`,
            );
        }
        return template.fixedModIds.map(modId => ({
            modId,
            value: rollValue(modId, playerLevel, rng),
        }));
    }

    const count = MODS_PER_RARITY[rarity];
    const pool = proceduralPoolForSlot(template.slot);
    if (pool.length < count) {
        throw new Error(
            `dropItem: procedural pool for slot '${template.slot}' has ` +
            `${pool.length} entries; cannot roll ${count} distinct mods for ` +
            `rarity '${rarity}'.`,
        );
    }

    // Sample without replacement: pick indices in turn, swap-removed.
    const remaining = pool.slice();
    const rolled: RolledModifier[] = [];
    for (let i = 0; i < count; i++) {
        const idx = Math.floor(rng() * remaining.length);
        const entry = remaining[idx]!;
        rolled.push({ modId: entry.id, value: rollValue(entry.id, playerLevel, rng) });
        // Swap-and-pop to avoid re-rolling the same mod.
        remaining[idx] = remaining[remaining.length - 1]!;
        remaining.pop();
    }
    return rolled;
}

/**
 * Merges `template.baseStatModifiers` with the `rolledMods` payload into the
 * final `Equipment.statModifiers` list. Spec 05d will move this to the
 * modifier catalogue once the catalogue learns about non-stat payloads (proc
 * triggers, resource interactions); for Spec 05c every rolled mod adds a
 * single flat `StatModifier`.
 */
export function resolveModifiers(
    template: EquipmentTemplate,
    rolledMods: RolledModifier[],
): StatModifier[] {
    const out: StatModifier[] = [];
    if (template.baseStatModifiers) {
        out.push(...template.baseStatModifiers);
    }
    for (const rolled of rolledMods) {
        const entry = MOD_REGISTRY.get(rolled.modId);
        if (!entry) continue;
        out.push({ stat: entry.stat, value: rolled.value });
    }
    return out;
}

// ─── Public factory ──────────────────────────────────────────────────────────

function isUnique(template: EquipmentTemplate): template is UniqueItemTemplate {
    return Array.isArray((template as UniqueItemTemplate).fixedModIds);
}

/**
 * Drops an `Equipment` instance from a template.
 *
 *   1. Look up the template (regular first, then Unique).
 *   2. Resolve rarity — caller-supplied or drawn from the weighted table. For
 *      Unique templates, rarity is forced to `'unique'`.
 *   3. Assert `playerLevel >= template.requiredLevel`.
 *   4. Roll the modifier list via `rollModifiers`.
 *   5. Merge base stats + rolled mods into the final `statModifiers`.
 *   6. Return the fully-formed `Equipment` instance.
 *
 * Pure when `rng` is deterministic; calls do not mutate input.
 */
export function dropItem(
    templateId: string,
    playerLevel: number,
    rarity?: ItemRarity,
    rng: () => number = Math.random,
): Equipment {
    const template = getEquipmentTemplate(templateId) ?? getUniqueTemplate(templateId);
    if (!template) {
        throw new Error(`dropItem: no template registered for id '${templateId}'.`);
    }

    if (playerLevel < template.requiredLevel) {
        throw new Error(
            `dropItem: playerLevel ${playerLevel} is below template '${templateId}' ` +
            `requiredLevel ${template.requiredLevel}.`,
        );
    }

    const isUniqueTpl = isUnique(template);

    // Unique-rarity is "specific templates only" (Spec 05c §9). A regular
    // template never produces a unique drop — neither by explicit caller
    // request (authoring error) nor by random draw (the table excludes the
    // unique row for regular templates).
    if (rarity === 'unique' && !isUniqueTpl) {
        throw new Error(
            `dropItem: rarity 'unique' is reserved for UniqueItemTemplate; ` +
            `template '${templateId}' is a regular EquipmentTemplate.`,
        );
    }

    const finalRarity: ItemRarity = (() => {
        if (isUniqueTpl) return 'unique';
        if (rarity) return rarity;
        return drawWeighted(RARITY_WEIGHTS, rng);
    })();

    const rolledMods = rollModifiers(template, finalRarity, playerLevel, rng);
    const statModifiers = resolveModifiers(template, rolledMods);

    const instance: Equipment = {
        id:            template.id,
        name:          template.name,
        description:   template.description,
        category:      'equipment',
        slot:          template.slot,
        rarity:        finalRarity,
        requiredLevel: template.requiredLevel,
        ...(statModifiers.length > 0 ? { statModifiers } : {}),
        ...(rolledMods.length > 0    ? { rolledMods }    : {}),
    };
    return instance;
}

// Re-export the rarity weight table so Spec 05d / Spec 07 loot tables can
// introspect the same constants the factory uses.
export const rarityWeightTable: ReadonlyArray<readonly [ItemRarity, number]> =
    RARITY_WEIGHTS_WITH_UNIQUE;
