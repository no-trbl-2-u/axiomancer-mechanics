/**
 * Item Factory — `dropItem` (Spec 05c) + Spec 05d catalogue integration.
 *
 * Turns an authored `EquipmentTemplate` / `UniqueItemTemplate` into a runtime
 * `Equipment` instance. Rarity is decided either by the caller (loot tables /
 * tests) or by a weighted random draw against the table in Spec 05c §9.
 *
 * Modifier rolls and payload merging now run through the Spec 05d catalogue
 * (`src/Items/modifier.catalogue.ts`). Per Spec 05d Q3 the resolve step
 * substitutes rolled values into `value: 0` / `bonus: 0` / `0` token sentinels
 * inside each mod's `payload`, then concatenates array fields and sums
 * `combatStartTokens` across mods so the existing `equipItem` /
 * `getEquipmentModifiers` / `aggregateCombatStartTokens` pipeline picks
 * everything up transparently.
 *
 * Determinism — every random draw inside the factory consumes from the
 * caller-supplied `rng` (defaults to `Math.random`). Two calls with the same
 * seeded `rng` produce identical Equipment instances. This keeps Spec 05c /
 * 05d hermetically testable today and aligns with Spec 11's seeded-RNG design.
 */

import {
    Equipment,
    EquipmentTemplate,
    UniqueItemTemplate,
    ItemRarity,
    RolledModifier,
    EquipmentProcTrigger,
    ResourceInteraction,
    ResourceGenerationBonus,
} from './types';
import { CombatResources } from '../Skills/types';
import { StatModifier } from '../Effects/types';
import { getEquipmentTemplate } from './equipment.templates';
import { getUniqueTemplate } from './unique.templates';
import {
    Modifier,
    HiddenModRarity,
    HIDDEN_MOD_RARITY_WEIGHTS,
} from './modifier.types';
import {
    MOD_POOLS,
    uniqueModPool,
    getModifierById,
    pickValueTier,
} from './modifier.catalogue';

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

function isUnique(template: EquipmentTemplate): template is UniqueItemTemplate {
    return Array.isArray((template as UniqueItemTemplate).fixedModIds);
}

/** Inclusive uniform integer roll across `[min, max]`. */
function rollInRange(min: number, max: number, rng: () => number): number {
    if (max <= min) return min;
    return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Filters a pool to mods with at least one `levelTier.levelReq <= playerLevel`.
 * Mods with no eligible tier are excluded from the procedural draw.
 */
function eligibleMods(pool: Modifier[], playerLevel: number): Modifier[] {
    return pool.filter(mod => mod.levelTiers.some(t => t.levelReq <= playerLevel));
}

/**
 * Weighted sample without replacement from `pool` using each mod's
 * `hiddenRarity` weight. Throws if `count` exceeds the pool size.
 */
function sampleByHiddenRarity(
    pool: Modifier[],
    count: number,
    rng: () => number,
): Modifier[] {
    if (pool.length < count) {
        throw new Error(
            `dropItem: requested ${count} mods but only ${pool.length} eligible.`,
        );
    }
    const remaining = pool.slice();
    const picked: Modifier[] = [];
    for (let i = 0; i < count; i++) {
        const entries = remaining.map(mod =>
            [mod, HIDDEN_MOD_RARITY_WEIGHTS[mod.hiddenRarity as HiddenModRarity]] as const,
        );
        const choice = drawWeighted(entries, rng);
        picked.push(choice);
        const idx = remaining.indexOf(choice);
        remaining.splice(idx, 1);
    }
    return picked;
}

/**
 * Rolls the modifier list for a given (template, rarity, playerLevel).
 *
 * - `common`            — empty array.
 * - `uncommon` / `rare` — N distinct procedural mods drawn (weighted-without-
 *                         replacement) from the slot's procedural pool. Mods
 *                         without an eligible level tier are filtered out.
 * - `unique`            — the template's `fixedModIds` triple, in declaration
 *                         order, with values rolled from the catalogue.
 *                         Requires a `UniqueItemTemplate`.
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
        return template.fixedModIds.map(modId => {
            const mod = getModifierById(modId);
            if (!mod) {
                // Unknown unique-template mod ID — keep the shape stable, roll 0.
                return { modId, value: 0 };
            }
            const tier = pickValueTier(mod, playerLevel);
            const value = tier ? rollInRange(tier.range[0], tier.range[1], rng) : 0;
            return { modId, value };
        });
    }

    const count = MODS_PER_RARITY[rarity];
    const pool = MOD_POOLS[template.slot] ?? [];
    const eligible = eligibleMods(pool, playerLevel);
    if (eligible.length < count) {
        throw new Error(
            `dropItem: eligible procedural pool for slot '${template.slot}' at ` +
            `playerLevel ${playerLevel} has ${eligible.length} entries; ` +
            `cannot roll ${count} distinct mods for rarity '${rarity}'.`,
        );
    }

    const sampled = sampleByHiddenRarity(eligible, count, rng);
    return sampled.map(mod => {
        const tier = pickValueTier(mod, playerLevel)!;
        return { modId: mod.id, value: rollInRange(tier.range[0], tier.range[1], rng) };
    });
}

/**
 * Resolves rolled mods + base template stats into the `Equipment` payload
 * fields the engine consumes (`statModifiers`, `passiveEffects`,
 * `onHitEffects`, `onDefendEffects`, `resourceInteraction`).
 *
 * Per Spec 05d:
 *   - Array fields are concatenated (not replaced).
 *   - `value: 0` sentinels in `payload.statModifiers` get the rolled value.
 *   - `bonus: 0` sentinels in `generationBonus` entries get the rolled value.
 *   - `0` values inside `combatStartTokens` get the rolled value, then the
 *     keys are summed across all rolled mods (additive — Spec 05b Q2).
 */
export function resolveModifiers(
    template: EquipmentTemplate,
    rolledMods: RolledModifier[],
): Pick<Equipment,
    'statModifiers' | 'passiveEffects' | 'onHitEffects' | 'onDefendEffects' | 'resourceInteraction'
> {
    const statModifiers: StatModifier[] = [];
    const passiveEffects: string[] = [];
    const onHitEffects: EquipmentProcTrigger[] = [];
    const onDefendEffects: EquipmentProcTrigger[] = [];
    const startTokens: Partial<CombatResources> = {};
    const generationBonus: ResourceGenerationBonus[] = [];

    if (template.baseStatModifiers) {
        statModifiers.push(...template.baseStatModifiers);
    }

    const addStartTokens = (delta: Partial<CombatResources>, rolledValue: number): void => {
        for (const key of Object.keys(delta) as Array<keyof CombatResources>) {
            const raw = delta[key];
            if (typeof raw !== 'number') continue;
            const concrete = raw === 0 ? rolledValue : raw;
            startTokens[key] = (startTokens[key] ?? 0) + concrete;
        }
    };

    for (const rolled of rolledMods) {
        const mod = getModifierById(rolled.modId);
        if (!mod) continue;
        const { payload } = mod;

        if (payload.statModifiers) {
            for (const sm of payload.statModifiers) {
                const value = sm.value === 0 ? rolled.value : sm.value;
                const next: StatModifier = { stat: sm.stat, value };
                if (sm.isMultiplier) next.isMultiplier = true;
                statModifiers.push(next);
            }
        }
        if (payload.passiveEffects) {
            passiveEffects.push(...payload.passiveEffects);
        }
        if (payload.onHitEffects) {
            onHitEffects.push(...payload.onHitEffects);
        }
        if (payload.onDefendEffects) {
            onDefendEffects.push(...payload.onDefendEffects);
        }
        if (payload.resourceInteraction) {
            const ri = payload.resourceInteraction;
            if (ri.combatStartTokens) addStartTokens(ri.combatStartTokens, rolled.value);
            if (ri.generationBonus) {
                for (const entry of ri.generationBonus) {
                    const bonus = entry.bonus === 0 ? rolled.value : entry.bonus;
                    generationBonus.push({
                        trigger: entry.trigger,
                        resourceType: entry.resourceType,
                        bonus,
                    });
                }
            }
        }
    }

    const out: Pick<Equipment,
        'statModifiers' | 'passiveEffects' | 'onHitEffects' | 'onDefendEffects' | 'resourceInteraction'
    > = {};

    if (statModifiers.length > 0) out.statModifiers = statModifiers;
    if (passiveEffects.length > 0) out.passiveEffects = passiveEffects;
    if (onHitEffects.length > 0)   out.onHitEffects   = onHitEffects;
    if (onDefendEffects.length > 0) out.onDefendEffects = onDefendEffects;

    const startKeys = Object.keys(startTokens) as Array<keyof CombatResources>;
    if (startKeys.length > 0 || generationBonus.length > 0) {
        const ri: ResourceInteraction = {};
        if (startKeys.length > 0) ri.combatStartTokens = startTokens;
        if (generationBonus.length > 0) ri.generationBonus = generationBonus;
        out.resourceInteraction = ri;
    }

    return out;
}

// ─── Public factory ──────────────────────────────────────────────────────────

/**
 * Drops an `Equipment` instance from a template.
 *
 *   1. Look up the template (regular first, then Unique).
 *   2. Resolve rarity — caller-supplied or drawn from the weighted table. For
 *      Unique templates, rarity is forced to `'unique'`.
 *   3. Assert `playerLevel >= template.requiredLevel`.
 *   4. Roll the modifier list via `rollModifiers`.
 *   5. Merge base stats + rolled-mod payloads via `resolveModifiers`.
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
    const resolved = resolveModifiers(template, rolledMods);

    const instance: Equipment = {
        id:            template.id,
        name:          template.name,
        description:   template.description,
        category:      'equipment',
        slot:          template.slot,
        rarity:        finalRarity,
        requiredLevel: template.requiredLevel,
        ...resolved,
        ...(rolledMods.length > 0 ? { rolledMods } : {}),
    };
    return instance;
}

// Re-export the rarity weight table so Spec 05d / Spec 07 loot tables can
// introspect the same constants the factory uses.
export const rarityWeightTable: ReadonlyArray<readonly [ItemRarity, number]> =
    RARITY_WEIGHTS_WITH_UNIQUE;

// Re-export the unique-pool shape so tests / loot tables can introspect it
// without reaching into `modifier.catalogue.ts` directly.
export { uniqueModPool };
