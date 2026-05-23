/**
 * Phase 75 — `previewTemplateAtRarity` helper (closes the user-jot
 * at `b5c8165` / mobile item-library mod-visibility).
 *
 * Pins the happy path (rolled-mod count matches rarity tier), the
 * determinism contract (default rng produces identical Equipment
 * across calls), and the three soft-error paths per D1 (unknown
 * templateId / level-too-low / unique-rarity on regular template).
 *
 * The wrapped `dropItem` is already covered by its own e2e; this
 * file only pins the preview-helper-specific behaviour.
 */
import { describe, it, expect } from 'vitest';
import { previewTemplateAtRarity } from '../index';

describe('Phase 75 — previewTemplateAtRarity', () => {
    it('returns Equipment with rolled-mod count matching the rarity tier (common=0 / uncommon=1 / rare=2)', () => {
        const common = previewTemplateAtRarity('iron-blade', 'common', 5);
        const uncommon = previewTemplateAtRarity('iron-blade', 'uncommon', 5);
        const rare = previewTemplateAtRarity('iron-blade', 'rare', 5);

        expect(common).toBeDefined();
        expect(uncommon).toBeDefined();
        expect(rare).toBeDefined();

        // Common drops carry no rolledMods (MODS_PER_RARITY['common'] === 0).
        expect(common!.rolledMods ?? []).toHaveLength(0);
        expect(uncommon!.rolledMods).toHaveLength(1);
        expect(rare!.rolledMods).toHaveLength(2);

        // Rarity threads through onto the Equipment instance.
        expect(common!.rarity).toBe('common');
        expect(uncommon!.rarity).toBe('uncommon');
        expect(rare!.rarity).toBe('rare');
    });

    it('is deterministic per (template, rarity, playerLevel) with the default rng (D2)', () => {
        const a = previewTemplateAtRarity('iron-blade', 'uncommon', 5);
        const b = previewTemplateAtRarity('iron-blade', 'uncommon', 5);
        expect(a).toEqual(b);
    });

    it('returns undefined for unknown templateId (D1 — UI-tier safety)', () => {
        expect(previewTemplateAtRarity('no-such-template', 'common', 1)).toBeUndefined();
    });

    it('returns undefined when playerLevel < template.requiredLevel (D1)', () => {
        // mithril-blade is requiredLevel 20; preview at level 5 is unreachable
        // for the player, so the helper returns undefined rather than throwing.
        expect(previewTemplateAtRarity('mithril-blade', 'rare', 5)).toBeUndefined();
    });

    it('returns undefined for rarity="unique" against a regular template (D1)', () => {
        // iron-blade is a regular EquipmentTemplate; unique rarity is reserved
        // for UniqueItemTemplate per Spec 05c §9.
        expect(previewTemplateAtRarity('iron-blade', 'unique', 5)).toBeUndefined();
    });
});
