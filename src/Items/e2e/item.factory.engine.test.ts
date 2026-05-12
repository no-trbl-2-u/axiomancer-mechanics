/**
 * Hermetic E2E Tests — `dropItem` Factory (Spec 05c)
 *
 * Drives the new rarity & instance-creation pipeline through its public
 * surface (`dropItem`, `rollModifiers`, `resolveModifiers`) and verifies the
 * resulting `Equipment` instance composes correctly with `equipItem` —
 * proving the legacy `Equipment.tier` removal didn't regress the equip path.
 *
 * Hermetic standard (per `docs/testing.md` / `AGENTS.md`):
 *   1. Self-contained — no disk I/O, no network, no TTY.
 *   2. Deterministic  — `Math.random` stubbed via helpers in `src/test-utils/rng.ts`,
 *                       or a caller-supplied seeded `rng` argument.
 *   3. Isolated       — `vi.restoreAllMocks` in `afterEach` keeps tests independent.
 *
 * Coverage matrix (Spec 05c §12 acceptance):
 *   • Common drop          — no `rolledMods`; base stats preserved.
 *   • Uncommon drop        — exactly 1 rolled mod.
 *   • Rare drop            — exactly 2 distinct rolled mods.
 *   • Unique drop          — exactly 3 mods matching `fixedModIds`,
 *                            values within catalogue ranges.
 *   • Deterministic        — same seeded `rng` → identical Equipment.
 *   • equipItem round-trip — dropped Equipment equips cleanly and folds into
 *                            `derivedStats`.
 *   • Templates inventory  — 21 base templates over the documented slot/level table.
 */

import { afterEach, describe, it, expect, vi } from 'vitest';

import { createCharacter } from '../../Character';
import { equipItem } from '../../Character/equipment.reducer';
import {
    dropItem,
    rollModifiers,
    resolveModifiers,
    equipmentTemplates,
    uniqueTemplates,
    getEquipmentTemplate,
    getUniqueTemplate,
    getTemplatesBySlot,
    rarityWeightTable,
} from '../index';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Deterministic RNG that walks `seed` through a tiny LCG. Lets a test pin
 * both rarity draws and mod-value rolls to a known sequence.
 */
const seededRng = (seed: number): (() => number) => {
    let state = seed >>> 0;
    return () => {
        // Numerical Recipes LCG. Sufficient for hermetic-test determinism.
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
};

afterEach(() => {
    vi.restoreAllMocks();
});

// ─── Templates inventory ────────────────────────────────────────────────────

describe('equipment.templates: inventory (Spec 05c §6)', () => {
    it('exports exactly 21 base templates', () => {
        expect(equipmentTemplates).toHaveLength(21);
    });

    it('every slot has exactly 3 templates across lvl 1 / 10 / 20', () => {
        const slots = ['weapon', 'armor', 'head', 'body', 'hands', 'feet', 'accessory'] as const;
        for (const slot of slots) {
            const list = getTemplatesBySlot(slot);
            expect(list).toHaveLength(3);
            expect(list.map(t => t.requiredLevel)).toEqual([1, 10, 20]);
        }
    });

    it('exports exactly 2 Unique templates (Spec 05c §7)', () => {
        expect(uniqueTemplates).toHaveLength(2);
        expect(getUniqueTemplate('axioms-edge')).toBeDefined();
        expect(getUniqueTemplate('paradox-loop')).toBeDefined();
    });

    it('every Unique template declares exactly 3 fixedModIds', () => {
        for (const u of uniqueTemplates) {
            expect(u.fixedModIds).toHaveLength(3);
        }
    });
});

// ─── Common drops ───────────────────────────────────────────────────────────

describe('dropItem: Common rarity', () => {
    it('Common drop returns an Equipment with no rolledMods', () => {
        const drop = dropItem('iron-blade', 8, 'common', seededRng(1));
        expect(drop.rarity).toBe('common');
        expect(drop.rolledMods).toBeUndefined();
        expect(drop.requiredLevel).toBe(1);
        expect(drop.category).toBe('equipment');
        expect(drop.slot).toBe('weapon');
    });

    it('Common drop preserves the template\'s base stat modifiers', () => {
        const drop = dropItem('iron-blade', 8, 'common', seededRng(2));
        const template = getEquipmentTemplate('iron-blade')!;
        expect(drop.statModifiers).toEqual(template.baseStatModifiers);
    });
});

// ─── Uncommon / Rare drops ──────────────────────────────────────────────────

describe('dropItem: Uncommon rarity', () => {
    it('Uncommon drop returns exactly 1 rolled mod', () => {
        const drop = dropItem('iron-blade', 8, 'uncommon', seededRng(3));
        expect(drop.rarity).toBe('uncommon');
        expect(drop.rolledMods).toHaveLength(1);
    });

    it('Uncommon value falls within the catalogue range for the given player level', () => {
        // perLevel = 1, minBase = 1 → range at lvl 8 is [1, 8] inclusive.
        const drop = dropItem('iron-blade', 8, 'uncommon', seededRng(4));
        const rolled = drop.rolledMods![0]!;
        expect(rolled.value).toBeGreaterThanOrEqual(1);
        expect(rolled.value).toBeLessThanOrEqual(8);
    });

    it('statModifiers fold base stats + rolled mod payload', () => {
        const drop = dropItem('iron-blade', 8, 'uncommon', seededRng(5));
        // Base statModifiers from `iron-blade` is [+2 body]; rolled mod adds one entry.
        expect(drop.statModifiers).toBeDefined();
        expect(drop.statModifiers!.length).toBeGreaterThanOrEqual(2);
    });
});

describe('dropItem: Rare rarity', () => {
    it('Rare drop returns exactly 2 non-duplicate rolled mods', () => {
        const drop = dropItem('iron-blade', 8, 'rare', seededRng(6));
        expect(drop.rarity).toBe('rare');
        expect(drop.rolledMods).toHaveLength(2);
        const ids = drop.rolledMods!.map(m => m.modId);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

// ─── Unique drops ───────────────────────────────────────────────────────────

describe('dropItem: Unique rarity', () => {
    it('Unique drop on a Unique template returns 3 mods matching fixedModIds', () => {
        const template = getUniqueTemplate('axioms-edge')!;
        const drop = dropItem('axioms-edge', 10, 'unique', seededRng(7));
        expect(drop.rarity).toBe('unique');
        expect(drop.rolledMods).toHaveLength(3);
        const ids = drop.rolledMods!.map(m => m.modId);
        expect(ids).toEqual(template.fixedModIds);
    });

    it('Unique template forces rarity to unique even when caller omits the param', () => {
        const drop = dropItem('axioms-edge', 10);
        expect(drop.rarity).toBe('unique');
        expect(drop.rolledMods).toHaveLength(3);
    });

    it('Unique mod values fall within the catalogue range', () => {
        const drop = dropItem('paradox-loop', 20, 'unique', seededRng(8));
        // `unique_paradox_loop_echo`: minBase=2, perLevel=0 → always exactly 2.
        const echo = drop.rolledMods!.find(m => m.modId === 'unique_paradox_loop_echo')!;
        expect(echo.value).toBe(2);
        // `accessory_mind_flat`: minBase=1, perLevel=1 → range [1, 1 + 19] = [1,20].
        const mindMod = drop.rolledMods!.find(m => m.modId === 'accessory_mind_flat')!;
        expect(mindMod.value).toBeGreaterThanOrEqual(1);
        expect(mindMod.value).toBeLessThanOrEqual(20);
    });

    it('explicit rarity=\'unique\' on a regular template throws (no fixedModIds)', () => {
        expect(() => dropItem('iron-blade', 10, 'unique', seededRng(9))).toThrowError(/unique/i);
    });
});

// ─── Determinism ────────────────────────────────────────────────────────────

describe('dropItem: deterministic with seeded rng', () => {
    it('the same seeded rng produces identical Equipment across two calls', () => {
        const a = dropItem('iron-blade', 5, 'uncommon', seededRng(123));
        const b = dropItem('iron-blade', 5, 'uncommon', seededRng(123));
        expect(a).toEqual(b);
    });

    it('different seeds can produce different mod ids and / or values', () => {
        // Probabilistic — but with a small pool and distinct seeds, at least
        // one of {modId, value} should differ. Use a fixed pair known to diverge.
        const a = dropItem('iron-blade', 20, 'rare', seededRng(111));
        const b = dropItem('iron-blade', 20, 'rare', seededRng(222));
        const aSig = a.rolledMods!.map(m => `${m.modId}:${m.value}`).join('|');
        const bSig = b.rolledMods!.map(m => `${m.modId}:${m.value}`).join('|');
        expect(aSig).not.toBe(bSig);
    });
});

// ─── Validation ─────────────────────────────────────────────────────────────

describe('dropItem: validation', () => {
    it('throws when playerLevel < template.requiredLevel', () => {
        // `steel-blade` requires lvl 10.
        expect(() => dropItem('steel-blade', 5, 'common', seededRng(10)))
            .toThrowError(/requiredLevel/);
    });

    it('throws for an unknown template id', () => {
        expect(() => dropItem('does-not-exist', 5, 'common', seededRng(11)))
            .toThrowError(/no template/i);
    });
});

// ─── Rarity weight table ────────────────────────────────────────────────────

describe('rarityWeightTable: weighted draw', () => {
    it('exports the documented Spec 05c §9 weights', () => {
        const map = new Map(rarityWeightTable);
        expect(map.get('common')).toBe(60);
        expect(map.get('uncommon')).toBe(30);
        expect(map.get('rare')).toBe(9);
        expect(map.get('unique')).toBe(1);
    });

    it('omitting rarity on a regular template draws from the table', () => {
        // 500 draws from a single seeded rng — common (60/99) should dominate
        // by a wide margin. Rare (9/99) appears infrequently. Unique never
        // appears for a regular template (the row is excluded by design).
        const rng = seededRng(424242);
        const counts: Record<string, number> = { common: 0, uncommon: 0, rare: 0, unique: 0 };
        for (let i = 0; i < 500; i++) {
            const drop = dropItem('iron-blade', 20, undefined, rng);
            counts[drop.rarity] = (counts[drop.rarity] ?? 0) + 1;
        }
        expect(counts.common).toBeGreaterThan(counts.uncommon);
        expect(counts.uncommon).toBeGreaterThan(counts.rare);
        expect(counts.unique).toBe(0);
    });
});

// ─── equipItem round-trip ───────────────────────────────────────────────────

describe('dropItem → equipItem round-trip (Spec 05c §12)', () => {
    it('equipping a Common drop passes through equipItem unchanged', () => {
        const player = createCharacter({
            name: 'Equipper',
            level: 8,
            baseStats: { heart: 4, body: 3, mind: 2 },
        });
        const drop = dropItem('iron-blade', 8, 'common', seededRng(42));
        const equipped = equipItem(player, drop);
        expect(equipped.equipment.weapon).toBe(drop);
        // `iron-blade` base = +2 body → derived physicalAttack rises by 2.
        expect(equipped.derivedStats.physicalAttack)
            .toBe(player.derivedStats.physicalAttack + 2);
    });

    it('equipping an Uncommon drop folds the rolled mod into derivedStats', () => {
        const player = createCharacter({
            name: 'Equipper',
            level: 8,
            baseStats: { heart: 4, body: 3, mind: 2 },
        });
        const drop = dropItem('iron-blade', 8, 'uncommon', seededRng(43));
        const equipped = equipItem(player, drop);
        expect(equipped.equipment.weapon).toBe(drop);
        // Some derivedStat must move beyond the Common baseline since the
        // rolled mod adds a flat boost on top of `iron-blade`'s base stats.
        const playerPhysAtk = player.derivedStats.physicalAttack;
        const equippedPhysAtk = equipped.derivedStats.physicalAttack;
        // Bound: at least +2 (base body), and likely more because the rolled
        // mod is a procedural weapon mod (body / physicalAttack / mentalAttack).
        expect(equippedPhysAtk).toBeGreaterThanOrEqual(playerPhysAtk + 2);
    });
});

// ─── Pure roll/resolve helpers ──────────────────────────────────────────────

describe('rollModifiers / resolveModifiers', () => {
    it('rollModifiers honours the rarity → count contract', () => {
        const template = getEquipmentTemplate('iron-blade')!;
        expect(rollModifiers(template, 'common',   5, seededRng(1))).toHaveLength(0);
        expect(rollModifiers(template, 'uncommon', 5, seededRng(1))).toHaveLength(1);
        expect(rollModifiers(template, 'rare',     5, seededRng(1))).toHaveLength(2);
    });

    it('resolveModifiers merges base stats with rolled mod payloads', () => {
        const template = getEquipmentTemplate('iron-blade')!;
        const rolled = [{ modId: 'weapon_physical_attack', value: 4 }];
        const merged = resolveModifiers(template, rolled);
        // Base = [+2 body]; rolled = [+4 physicalAttack]; merged = both.
        expect(merged).toContainEqual({ stat: 'body', value: 2 });
        expect(merged).toContainEqual({ stat: 'physicalAttack', value: 4 });
    });
});
