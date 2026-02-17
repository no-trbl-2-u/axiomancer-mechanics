/**
 * Effects Module Tests
 * Tests for effect application, ticking, stacking, and library data
 */

import { applyEffect, tickEffect, isEffectExpired, stackEffect } from './index';
import { getBuffById, getBuffsByCategory, BUFF_LIBRARY } from './buff.library';
import { getDebuffById, getDebuffsByCategory, DEBUFF_LIBRARY } from './debuff.library';
import {
    Effect,
    ActiveEffect,
    EffectApplicationResult,
    EffectType,
    EffectStacking,
    EffectCategory,
} from './types';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockBuff(): Effect {
    return {
        id: 'test-buff-01',
        name: 'Test Buff',
        description: 'A test buff effect',
        type: 'buff',
        category: 'stat',
        duration: 3,
        stacking: 'intensity',
        payload: {
            statModifiers: [
                { stat: 'body', value: 2, isMultiplier: false },
            ],
            rollModifier: 1,
        },
    };
}

function createMockDebuff(): Effect {
    return {
        id: 'test-debuff-01',
        name: 'Test Debuff',
        description: 'A test debuff effect',
        type: 'debuff',
        category: 'damage',
        duration: 2,
        stacking: 'duration',
        payload: {
            damageOverTime: {
                damagePerRound: 3,
                damageType: 'body',
            },
        },
    };
}

function createMockActiveEffect(overrides?: Partial<ActiveEffect>): ActiveEffect {
    return {
        effectId: 'test-buff-01',
        remainingDuration: 3,
        currentIntensity: 1,
        sourceId: 'player-01',
        appliedAtRound: 1,
        ...overrides,
    };
}

// ============================================================================
// applyEffect
// ============================================================================

describe('applyEffect', () => {
    it('should successfully apply an effect', () => {
        const effect: Effect = createMockBuff();
        const result: EffectApplicationResult = applyEffect(effect, 'player-01', 1);
        expect(result.success).toBe(true);
    });

    it('should create an active effect with correct effectId', () => {
        const effect: Effect = createMockBuff();
        const result: EffectApplicationResult = applyEffect(effect, 'player-01', 1);
        expect(result.activeEffect?.effectId).toBe(effect.id);
    });

    it('should set remaining duration from effect definition', () => {
        const effect: Effect = createMockBuff();
        const result: EffectApplicationResult = applyEffect(effect, 'player-01', 1);
        expect(result.activeEffect?.remainingDuration).toBe(effect.duration);
    });

    it('should set the source ID', () => {
        const effect: Effect = createMockBuff();
        const result: EffectApplicationResult = applyEffect(effect, 'enemy-01', 3);
        expect(result.activeEffect?.sourceId).toBe('enemy-01');
    });

    it('should set the applied at round', () => {
        const effect: Effect = createMockBuff();
        const result: EffectApplicationResult = applyEffect(effect, 'player-01', 5);
        expect(result.activeEffect?.appliedAtRound).toBe(5);
    });

    it('should set default intensity of 1', () => {
        const effect: Effect = createMockBuff();
        const result: EffectApplicationResult = applyEffect(effect, 'player-01', 1);
        expect(result.activeEffect?.currentIntensity).toBe(1);
    });

    it('should use effect intensity when provided', () => {
        const effect: Effect = { ...createMockBuff(), intensity: 3 };
        const result: EffectApplicationResult = applyEffect(effect, 'player-01', 1);
        expect(result.activeEffect?.currentIntensity).toBe(3);
    });

    it('should include a success message', () => {
        const effect: Effect = createMockBuff();
        const result: EffectApplicationResult = applyEffect(effect, 'player-01', 1);
        expect(result.message).toContain(effect.name);
    });
});

// ============================================================================
// tickEffect
// ============================================================================

describe('tickEffect', () => {
    it('should reduce remaining duration by 1', () => {
        const active: ActiveEffect = createMockActiveEffect({ remainingDuration: 3 });
        const result: ActiveEffect | null = tickEffect(active);
        expect(result?.remainingDuration).toBe(2);
    });

    it('should return null when duration reaches 0', () => {
        const active: ActiveEffect = createMockActiveEffect({ remainingDuration: 1 });
        const result: ActiveEffect | null = tickEffect(active);
        expect(result).toBeNull();
    });

    it('should not expire permanent effects (duration -1)', () => {
        const active: ActiveEffect = createMockActiveEffect({ remainingDuration: -1 });
        const result: ActiveEffect | null = tickEffect(active);
        expect(result).not.toBeNull();
        expect(result?.remainingDuration).toBe(-1);
    });

    it('should preserve other properties', () => {
        const active: ActiveEffect = createMockActiveEffect({
            remainingDuration: 5,
            currentIntensity: 2,
            sourceId: 'test-source',
        });
        const result: ActiveEffect | null = tickEffect(active);
        expect(result?.currentIntensity).toBe(2);
        expect(result?.sourceId).toBe('test-source');
    });
});

// ============================================================================
// isEffectExpired
// ============================================================================

describe('isEffectExpired', () => {
    it('should return true when remaining duration is 0', () => {
        const active: ActiveEffect = createMockActiveEffect({ remainingDuration: 0 });
        const result: boolean = isEffectExpired(active);
        expect(result).toBe(true);
    });

    it('should return false when remaining duration is > 0', () => {
        const active: ActiveEffect = createMockActiveEffect({ remainingDuration: 2 });
        const result: boolean = isEffectExpired(active);
        expect(result).toBe(false);
    });

    it('should return false for permanent effects', () => {
        const active: ActiveEffect = createMockActiveEffect({ remainingDuration: -1 });
        const result: boolean = isEffectExpired(active);
        expect(result).toBe(false);
    });
});

// ============================================================================
// stackEffect
// ============================================================================

describe('stackEffect', () => {
    it('should increase intensity for intensity stacking', () => {
        const existing: ActiveEffect = createMockActiveEffect({ currentIntensity: 1 });
        const effect: Effect = { ...createMockBuff(), stacking: 'intensity' };
        const result: EffectApplicationResult = stackEffect(existing, effect);
        expect(result.activeEffect?.currentIntensity).toBe(2);
    });

    it('should reset duration for duration stacking', () => {
        const existing: ActiveEffect = createMockActiveEffect({ remainingDuration: 1 });
        const effect: Effect = { ...createMockDebuff(), stacking: 'duration', duration: 5 };
        const result: EffectApplicationResult = stackEffect(existing, effect);
        expect(result.activeEffect?.remainingDuration).toBe(5);
    });

    it('should not change for none stacking', () => {
        const existing: ActiveEffect = createMockActiveEffect({ currentIntensity: 1, remainingDuration: 2 });
        const effect: Effect = { ...createMockBuff(), stacking: 'none' };
        const result: EffectApplicationResult = stackEffect(existing, effect);
        expect(result.activeEffect?.currentIntensity).toBe(1);
        expect(result.activeEffect?.remainingDuration).toBe(2);
    });

    it('should include previous stacking information', () => {
        const existing: ActiveEffect = createMockActiveEffect({ currentIntensity: 2, remainingDuration: 3 });
        const effect: Effect = createMockBuff();
        const result: EffectApplicationResult = stackEffect(existing, effect);
        expect(result.stackedWith?.previousIntensity).toBe(2);
        expect(result.stackedWith?.previousDuration).toBe(3);
    });

    it('should return success', () => {
        const existing: ActiveEffect = createMockActiveEffect();
        const effect: Effect = createMockBuff();
        const result: EffectApplicationResult = stackEffect(existing, effect);
        expect(result.success).toBe(true);
    });
});

// ============================================================================
// BUFF LIBRARY
// ============================================================================

describe('BUFF_LIBRARY', () => {
    it('should contain buffs', () => {
        expect(BUFF_LIBRARY.length).toBeGreaterThan(0);
    });

    it('should have all entries as buff type', () => {
        BUFF_LIBRARY.forEach((buff: Effect) => {
            expect(buff.type).toBe('buff');
        });
    });

    it('should have unique IDs for all buffs', () => {
        const ids: string[] = BUFF_LIBRARY.map((buff: Effect) => buff.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have required fields for all buffs', () => {
        BUFF_LIBRARY.forEach((buff: Effect) => {
            expect(buff.id).toBeDefined();
            expect(buff.name).toBeDefined();
            expect(buff.description).toBeDefined();
            expect(buff.category).toBeDefined();
            expect(buff.duration).toBeDefined();
            expect(buff.stacking).toBeDefined();
            expect(buff.payload).toBeDefined();
        });
    });

    it('should have valid stacking types', () => {
        const validStacking: EffectStacking[] = ['none', 'intensity', 'duration'];
        BUFF_LIBRARY.forEach((buff: Effect) => {
            expect(validStacking).toContain(buff.stacking);
        });
    });

    it('should have valid category types', () => {
        const validCategories: EffectCategory[] = ['stat', 'damage', 'defense', 'control', 'regeneration', 'advantage'];
        BUFF_LIBRARY.forEach((buff: Effect) => {
            expect(validCategories).toContain(buff.category);
        });
    });
});

describe('getBuffById', () => {
    it('should find a buff by its ID', () => {
        const buff: Effect | undefined = getBuffById('buff_body_attack_up');
        expect(buff).toBeDefined();
        expect(buff?.name).toBe("Achilles' Momentum");
    });

    it('should return undefined for a non-existent ID', () => {
        const buff: Effect | undefined = getBuffById('non_existent_buff');
        expect(buff).toBeUndefined();
    });
});

describe('getBuffsByCategory', () => {
    it('should return buffs matching the given category', () => {
        const statBuffs: Effect[] = getBuffsByCategory('stat');
        expect(statBuffs.length).toBeGreaterThan(0);
        statBuffs.forEach((buff: Effect) => {
            expect(buff.category).toBe('stat');
        });
    });

    it('should return an empty array for a non-existent category', () => {
        const result: Effect[] = getBuffsByCategory('nonexistent');
        expect(result).toEqual([]);
    });
});

// ============================================================================
// DEBUFF LIBRARY
// ============================================================================

describe('DEBUFF_LIBRARY', () => {
    it('should contain debuffs', () => {
        expect(DEBUFF_LIBRARY.length).toBeGreaterThan(0);
    });

    it('should have all entries as debuff type', () => {
        DEBUFF_LIBRARY.forEach((debuff: Effect) => {
            expect(debuff.type).toBe('debuff');
        });
    });

    it('should have unique IDs for all debuffs', () => {
        const ids: string[] = DEBUFF_LIBRARY.map((debuff: Effect) => debuff.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have required fields for all debuffs', () => {
        DEBUFF_LIBRARY.forEach((debuff: Effect) => {
            expect(debuff.id).toBeDefined();
            expect(debuff.name).toBeDefined();
            expect(debuff.description).toBeDefined();
            expect(debuff.category).toBeDefined();
            expect(debuff.duration).toBeDefined();
            expect(debuff.stacking).toBeDefined();
            expect(debuff.payload).toBeDefined();
        });
    });
});

describe('getDebuffById', () => {
    it('should find a debuff by its ID', () => {
        const debuff: Effect | undefined = getDebuffById('debuff_poison');
        expect(debuff).toBeDefined();
        expect(debuff?.name).toBe("Curry's Corruption");
    });

    it('should return undefined for a non-existent ID', () => {
        const debuff: Effect | undefined = getDebuffById('non_existent_debuff');
        expect(debuff).toBeUndefined();
    });
});

describe('getDebuffsByCategory', () => {
    it('should return debuffs matching the given category', () => {
        const damageDebuffs: Effect[] = getDebuffsByCategory('damage');
        expect(damageDebuffs.length).toBeGreaterThan(0);
        damageDebuffs.forEach((debuff: Effect) => {
            expect(debuff.category).toBe('damage');
        });
    });

    it('should return an empty array for a non-existent category', () => {
        const result: Effect[] = getDebuffsByCategory('nonexistent');
        expect(result).toEqual([]);
    });
});
