/**
 * Hermetic e2e — Character presets.
 *
 * Verifies that the three shipped presets build into valid Characters
 * whose level / stats / skill rotation / inventory match the
 * declarative recipe, and that two builds with the same RNG produce
 * structurally equal Characters.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
    apprenticePreset, wandererPreset, sagePreset,
    characterPresets, getPresetById, buildCharacterFromPreset,
} from '../presets';
import { mockSequentialRng } from '../../test-utils/rng';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('characterPresets', () => {
    it('lists three presets with stable ids', () => {
        const ids = characterPresets.map(p => p.id);
        expect(ids).toEqual(['apprentice', 'wanderer', 'sage']);
    });

    it('getPresetById returns the matching record', () => {
        expect(getPresetById('apprentice')).toBe(apprenticePreset);
        expect(getPresetById('wanderer')).toBe(wandererPreset);
        expect(getPresetById('sage')).toBe(sagePreset);
        expect(getPresetById('does-not-exist')).toBeUndefined();
    });
});

describe('buildCharacterFromPreset', () => {
    it('builds Apprentice as a bare level-1 starter', () => {
        mockSequentialRng(0.5);
        const player = buildCharacterFromPreset(apprenticePreset);
        expect(player.name).toBe('Apprentice');
        expect(player.level).toBe(1);
        expect(player.baseStats).toEqual({ heart: 3, body: 2, mind: 2 });
        expect(player.equipment).toEqual({});
        expect(player.knownSkills).toHaveLength(6);
        expect(player.equippedSkills).toHaveLength(4);
        expect(player.inventory).toHaveLength(1);
        expect(player.inventory[0]?.id).toBe('minor-healing-potion');
        expect(player.inventory[0]?.quantity).toBe(3);
        expect(player.currency).toBe(0);
    });

    it('builds Wanderer with light armor and mixed-tier skills', () => {
        mockSequentialRng(0.5);
        const player = buildCharacterFromPreset(wandererPreset);
        expect(player.level).toBe(8);
        expect(player.baseStats).toEqual({ heart: 5, body: 4, mind: 4 });
        expect(player.knownSkills).toHaveLength(9);
        expect(player.equippedSkills).toHaveLength(4);
        expect(player.equipment.weapon?.id).toBe('iron-blade');
        expect(player.equipment.armor?.id).toBe('hide-vest');
        expect(player.equipment.head?.id).toBe('leather-cap');
        expect(player.currency).toBe(25);
    });

    it('builds Sage with mid-tier gear and every skill known', () => {
        mockSequentialRng(0.5);
        const player = buildCharacterFromPreset(sagePreset);
        expect(player.level).toBe(15);
        expect(player.baseStats).toEqual({ heart: 7, body: 6, mind: 6 });
        expect(player.knownSkills).toHaveLength(12);
        expect(player.equippedSkills).toContain('bootstrap-paradox');
        expect(player.equipment.weapon?.id).toBe('steel-blade');
        expect(player.equipment.armor?.id).toBe('chain-mail');
        expect(player.equipment.head?.id).toBe('chain-coif');
        expect(player.currency).toBe(75);
    });

    it('is deterministic for a given RNG seed', () => {
        mockSequentialRng(0.5);
        const a = buildCharacterFromPreset(sagePreset);
        vi.restoreAllMocks();
        mockSequentialRng(0.5);
        const b = buildCharacterFromPreset(sagePreset);
        expect(a).toEqual(b);
    });

    it('clones consumables from the library — no shared references', () => {
        mockSequentialRng(0.5);
        const a = buildCharacterFromPreset(apprenticePreset);
        const b = buildCharacterFromPreset(apprenticePreset);
        expect(a.inventory[0]).not.toBe(b.inventory[0]);
        expect(a.inventory[0]).toEqual(b.inventory[0]);
    });
});
