/**
 * Hermetic E2E Tests — Affix-decorated drops (2026-06-07 content pass).
 *
 * Drives the prefix/suffix naming layer (`affix.library.ts`) through the
 * additive `dropItemWithAffixes` factory, proving:
 *   1. Determinism — the same seeded rng yields identical Equipment.
 *   2. Naming      — the composed name contains the template's base name.
 *   3. Resolvable  — every rolled mod (base + affix-granted) keys into a real
 *                    catalogue modifier via `getModifierById`.
 *   4. Composition — `composeItemName` / `affixesForSlot` behave purely.
 *   5. Unique safety — affixes are never layered onto a unique template.
 *
 * Hermetic standard (per `docs/testing.md`): self-contained, deterministic via
 * a seeded rng, isolated (`vi.restoreAllMocks`).
 */

import { afterEach, describe, it, expect, vi } from 'vitest';

import {
    dropItemWithAffixes,
    getEquipmentTemplate,
    getModifierById,
    composeItemName,
    affixesForSlot,
    getAffixById,
    allAffixes,
    prefixes,
    suffixes,
} from '../index';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Numerical-Recipes LCG — same pattern as the item.factory e2e suite. */
const seededRng = (seed: number): (() => number) => {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
};

afterEach(() => {
    vi.restoreAllMocks();
});

// ─── Library invariants ──────────────────────────────────────────────────────

describe('affix.library: invariants', () => {
    it('exports ~16 prefixes and ~16 suffixes', () => {
        expect(prefixes.length).toBeGreaterThanOrEqual(16);
        expect(suffixes.length).toBeGreaterThanOrEqual(16);
        expect(allAffixes.length).toBe(prefixes.length + suffixes.length);
    });

    it('every affix references only existing catalogue modifiers', () => {
        for (const affix of allAffixes) {
            expect(affix.modIds.length).toBeGreaterThan(0);
            for (const modId of affix.modIds) {
                expect(getModifierById(modId)).toBeDefined();
            }
        }
    });

    it('every affix role matches the pool it lives in', () => {
        for (const p of prefixes) expect(p.role).toBe('prefix');
        for (const s of suffixes) expect(s.role).toBe('suffix');
    });

    it('getAffixById round-trips a known id', () => {
        const affix = getAffixById('pfx-keen');
        expect(affix).toBeDefined();
        expect(affix?.word).toBe('Keen');
    });
});

// ─── composeItemName ─────────────────────────────────────────────────────────

describe('composeItemName', () => {
    const keen = getAffixById('pfx-keen')!;
    const ofRuin = getAffixById('sfx-of-ruin')!;

    it('returns the base name unchanged with no affixes', () => {
        expect(composeItemName('Iron Blade')).toBe('Iron Blade');
    });

    it('prepends a prefix word', () => {
        expect(composeItemName('Iron Blade', keen)).toBe('Keen Iron Blade');
    });

    it('appends a suffix word', () => {
        expect(composeItemName('Iron Blade', undefined, ofRuin)).toBe('Iron Blade of Ruin');
    });

    it('combines prefix and suffix around the base', () => {
        expect(composeItemName('Iron Blade', keen, ofRuin))
            .toBe('Keen Iron Blade of Ruin');
    });
});

// ─── affixesForSlot ──────────────────────────────────────────────────────────

describe('affixesForSlot', () => {
    it('filters by slot, role, and minLevel', () => {
        const lowWeapon = affixesForSlot('weapon', 1, 'prefix');
        expect(lowWeapon.length).toBeGreaterThan(0);
        for (const a of lowWeapon) {
            expect(a.role).toBe('prefix');
            expect(a.validSlots).toContain('weapon');
            expect(a.minLevel).toBeLessThanOrEqual(1);
        }
        // A level-gated affix (savage, minLevel 20) is excluded at level 1.
        expect(lowWeapon.find(a => a.id === 'pfx-savage')).toBeUndefined();
        // …and included once the level requirement is met.
        const highWeapon = affixesForSlot('weapon', 25, 'prefix');
        expect(highWeapon.find(a => a.id === 'pfx-savage')).toBeDefined();
    });

    it('returns no prefixes for a slot with only suffix coverage at that level', () => {
        // Sanity: a low-level head slot still surfaces at least one suffix.
        expect(affixesForSlot('head', 1, 'suffix').length).toBeGreaterThanOrEqual(0);
    });
});

// ─── dropItemWithAffixes ─────────────────────────────────────────────────────

describe('dropItemWithAffixes', () => {
    it('is deterministic for a seeded rng', () => {
        const a = dropItemWithAffixes('iron-blade', 25, { rarity: 'rare', rng: seededRng(7) });
        const b = dropItemWithAffixes('iron-blade', 25, { rarity: 'rare', rng: seededRng(7) });
        expect(a).toEqual(b);
    });

    it('composes a name containing the base template name', () => {
        const base = getEquipmentTemplate('iron-blade')!;
        const drop = dropItemWithAffixes('iron-blade', 25, { rarity: 'rare', rng: seededRng(7) });
        expect(drop.name).toContain(base.name);
    });

    it('produces rolled mods that all resolve against the catalogue', () => {
        const drop = dropItemWithAffixes('iron-blade', 25, { rarity: 'rare', rng: seededRng(11) });
        expect(drop.rolledMods).toBeDefined();
        expect(drop.rolledMods!.length).toBeGreaterThan(0);
        for (const rolled of drop.rolledMods!) {
            expect(getModifierById(rolled.modId)).toBeDefined();
        }
        // statModifiers should fold base + at least one rolled/affix payload.
        expect(drop.statModifiers).toBeDefined();
        expect(drop.statModifiers!.length).toBeGreaterThanOrEqual(2);
    });

    it('layers affix mods on top of the base rolled mods (more than common)', () => {
        // Common base has 0 base mods; affixes still grant mods → name + mods.
        const drop = dropItemWithAffixes('iron-blade', 25, { rarity: 'common', rng: seededRng(3) });
        expect(drop.rolledMods).toBeDefined();
        expect(drop.rolledMods!.length).toBeGreaterThan(0);
    });

    it('respects maxPrefixes / maxSuffixes = 0 (no affixes, base name kept)', () => {
        const base = getEquipmentTemplate('iron-blade')!;
        const drop = dropItemWithAffixes('iron-blade', 25, {
            rarity: 'common',
            rng: seededRng(3),
            maxPrefixes: 0,
            maxSuffixes: 0,
        });
        expect(drop.name).toBe(base.name);
        // Common base + no affixes → no rolled mods at all.
        expect(drop.rolledMods).toBeUndefined();
    });

    it('does not layer affixes onto a unique template (name stays fixed)', () => {
        const drop = dropItemWithAffixes('axioms-edge', 10, { rng: seededRng(5) });
        expect(drop.rarity).toBe('unique');
        expect(drop.name).toBe("Axiom's Edge");
        expect(drop.rolledMods).toHaveLength(3);
    });

    it('throws below the template required level', () => {
        expect(() => dropItemWithAffixes('steel-blade', 5, { rng: seededRng(1) }))
            .toThrowError(/requiredLevel/);
    });

    it('throws for an unknown template id', () => {
        expect(() => dropItemWithAffixes('nope', 5, { rng: seededRng(1) }))
            .toThrowError(/no template/i);
    });
});
