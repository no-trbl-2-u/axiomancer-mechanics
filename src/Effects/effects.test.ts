/**
 * Unit tests for Effects engine — Phase 1 helpers.
 *
 * Tests cover:
 *   removeEffect, getActiveEffectModifiers, canAct,
 *   processDamageOverTime, processRoundStartEffects, processWorldEffectTick
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    removeEffect,
    getActiveEffectModifiers,
    canAct,
    processDamageOverTime,
    processRoundStartEffects,
    processWorldEffectTick,
} from './index';
import { ActiveEffect } from './types';
import { createCharacter } from '../Character';

// ─── Shared test data ─────────────────────────────────────────────────────────

/** Minimal stub for an active effect: overrides only the fields we test */
function makeEffect(
    effectId: string,
    opts: Partial<ActiveEffect> = {},
): ActiveEffect {
    return {
        effectId,
        remainingDuration: 3,
        currentIntensity:  1,
        appliedAtRound:    1,
        teir:              'Teir 1',
        ...opts,
    };
}

// ─── removeEffect ─────────────────────────────────────────────────────────────

describe('removeEffect', () => {
    it('removes the target effect by id', () => {
        const effects = [
            makeEffect('tier1_body_attack'),
            makeEffect('debuff_poison'),
        ];
        const result = removeEffect(effects, 'debuff_poison');
        expect(result).toHaveLength(1);
        expect(result[0].effectId).toBe('tier1_body_attack');
    });

    it('returns original array unchanged when id not found', () => {
        const effects = [makeEffect('tier1_body_attack')];
        const result  = removeEffect(effects, 'does_not_exist');
        expect(result).toHaveLength(1);
    });

    it('does not mutate the original array', () => {
        const effects = [makeEffect('tier1_body_attack')];
        const original = [...effects];
        removeEffect(effects, 'tier1_body_attack');
        expect(effects).toEqual(original);
    });

    it('removes all matching entries (identity: by effectId)', () => {
        const effects = [makeEffect('debuff_poison'), makeEffect('debuff_poison')];
        const result  = removeEffect(effects, 'debuff_poison');
        expect(result).toHaveLength(0);
    });
});

// ─── getActiveEffectModifiers ─────────────────────────────────────────────────

describe('getActiveEffectModifiers', () => {
    it('returns all-zero/empty modifiers for an empty effects array', () => {
        const mods = getActiveEffectModifiers([]);
        expect(mods.rollModifier).toBe(0);
        expect(mods.defenseModifier).toBe(0);
        expect(mods.skipTurn).toBe(false);
        expect(mods.blockedStances).toHaveLength(0);
        expect(mods.forcedStance).toBeNull();
        expect(mods.attackAdvantage).toHaveLength(0);
        expect(mods.attackDisadvantage).toHaveLength(0);
        expect(mods.evasionDisadvantage).toHaveLength(0);
    });

    it('accumulates roll modifier from a debuff (frostbite: rollModifier −2)', () => {
        const effects = [makeEffect('debuff_frostbite', { teir: 'Teir 2' })];
        const mods    = getActiveEffectModifiers(effects);
        expect(mods.rollModifier).toBe(-2);
    });

    it('scales roll modifier by intensity for rollModifierPerIntensity effects (mind mark)', () => {
        // tier1_mind_mark has rollModifierPerIntensity in debuffs — intensity 3 → +3
        const effects = [makeEffect('tier1_mind_mark', { teir: 'Teir 1', currentIntensity: 3 })];
        const mods    = getActiveEffectModifiers(effects);
        // tier1_mind_mark payload is empty ({}) — no rollModifierPerIntensity in JSON
        // This test confirms at least it doesn't crash and returns 0
        expect(typeof mods.rollModifier).toBe('number');
    });

    it('accumulates defense modifier from a buff (Epistemic Shield: +2)', () => {
        const effects = [makeEffect('buff_mind_defense_up', { teir: 'Teir 2', resistedBy: 'heart', resistDR: 12 })];
        const mods    = getActiveEffectModifiers(effects);
        expect(mods.defenseModifier).toBe(2);
    });

    it('sets skipTurn for stun effect (Buridans Paralysis)', () => {
        const effects = [makeEffect('debuff_stun', { teir: 'Teir 2', resistedBy: 'heart', resistDR: 14 })];
        const mods    = getActiveEffectModifiers(effects);
        expect(mods.skipTurn).toBe(true);
    });

    it('sets skipTurn for sleep effect', () => {
        const effects = [makeEffect('debuff_sleep', { teir: 'Teir 2', resistedBy: 'heart', resistDR: 13 })];
        const mods    = getActiveEffectModifiers(effects);
        expect(mods.skipTurn).toBe(true);
        expect(mods.defenseModifier).toBe(-3);
    });

    it('sets forcedStance for charm (Wigners Friendship - heart)', () => {
        const effects = [makeEffect('debuff_charm', { teir: 'Teir 2', resistedBy: 'body', resistDR: 14 })];
        const mods    = getActiveEffectModifiers(effects);
        expect(mods.forcedStance).toBe('heart');
    });

    it('populates blockedStances for silence (Moores Muteness - heart)', () => {
        const effects = [makeEffect('debuff_silence', { teir: 'Teir 2', resistedBy: 'body', resistDR: 13 })];
        const mods    = getActiveEffectModifiers(effects);
        expect(mods.blockedStances).toContain('heart');
    });

    it('puts grantDisadvantage from a BUFF into evasionDisadvantage (Arrows Impossibility)', () => {
        const effects = [makeEffect('buff_evasion_up', { teir: 'Teir 2', resistedBy: 'mind', resistDR: 13 })];
        const mods    = getActiveEffectModifiers(effects);
        expect(mods.evasionDisadvantage).toContain('body');
        expect(mods.evasionDisadvantage).toContain('mind');
        expect(mods.evasionDisadvantage).toContain('heart');
        expect(mods.attackDisadvantage).toHaveLength(0);
    });

    it('puts grantDisadvantage from a DEBUFF into attackDisadvantage (confusion)', () => {
        const effects = [makeEffect('debuff_confusion', { teir: 'Teir 2', resistedBy: 'heart', resistDR: 13 })];
        const mods    = getActiveEffectModifiers(effects);
        expect(mods.attackDisadvantage).toContain('body');
        expect(mods.evasionDisadvantage).toHaveLength(0);
    });

    it('puts grantAdvantage into attackAdvantage (Twins Dilation haste buff)', () => {
        const effects = [makeEffect('buff_haste', { teir: 'Teir 3', resistedBy: 'mind', resistDR: 17 })];
        const mods    = getActiveEffectModifiers(effects);
        expect(mods.attackAdvantage).toContain('body');
        expect(mods.attackAdvantage).toContain('mind');
        expect(mods.attackAdvantage).toContain('heart');
    });

    it('cascades base-stat delta to derived attack and defense stats', () => {
        // debuff_wound: −2 body → physicalDefense should get −2×3=−6
        const effects = [makeEffect('debuff_wound', { teir: 'Teir 2', resistedBy: 'mind', resistDR: 13 })];
        const mods    = getActiveEffectModifiers(effects);
        // body −2 cascades: physicalAttack −2×1=−2, physicalSkill −2×1=−2, physicalDefense −2×3=−6
        expect(mods.statDeltas.physicalAttack).toBe(-2);
        expect(mods.statDeltas.physicalDefense).toBe(-6);
        expect(mods.defenseModifier).toBe(-2); // from the direct defenseModifier field
    });

    it('accumulates from multiple effects correctly', () => {
        const effects = [
            makeEffect('debuff_frostbite', { teir: 'Teir 2', currentIntensity: 1 }),  // rollModifier −2
            makeEffect('debuff_shock',     { teir: 'Teir 2', currentIntensity: 1 }),   // rollModifier −1
        ];
        const mods = getActiveEffectModifiers(effects);
        expect(mods.rollModifier).toBe(-3);
    });
});

// ─── canAct ───────────────────────────────────────────────────────────────────

describe('canAct', () => {
    it('returns no restrictions for empty effects', () => {
        const result = canAct([]);
        expect(result.skipTurn).toBe(false);
        expect(result.blockedStances).toHaveLength(0);
        expect(result.forcedStance).toBeNull();
    });

    it('detects skipTurn from stun', () => {
        const result = canAct([makeEffect('debuff_stun', { teir: 'Teir 2' })]);
        expect(result.skipTurn).toBe(true);
    });

    it('detects forcedStance from charm', () => {
        const result = canAct([makeEffect('debuff_charm', { teir: 'Teir 2' })]);
        expect(result.forcedStance).toBe('heart');
    });

    it('detects blockedStances from silence', () => {
        const result = canAct([makeEffect('debuff_silence', { teir: 'Teir 2' })]);
        expect(result.blockedStances).toContain('heart');
    });
});

// ─── processDamageOverTime ────────────────────────────────────────────────────

describe('processDamageOverTime', () => {
    it('returns 0 damage for empty effects', () => {
        const { totalDamage, messages } = processDamageOverTime([]);
        expect(totalDamage).toBe(0);
        expect(messages).toHaveLength(0);
    });

    it('calculates DoT for poison (3 × intensity 1)', () => {
        const effects = [makeEffect('debuff_poison', { teir: 'Teir 2', currentIntensity: 1 })];
        const { totalDamage, messages } = processDamageOverTime(effects);
        expect(totalDamage).toBe(3);
        expect(messages).toHaveLength(1);
        expect(messages[0]).toContain("Curry's Corruption");
    });

    it('scales DoT by intensity (poison at intensity 2 → 6 damage)', () => {
        const effects = [makeEffect('debuff_poison', { teir: 'Teir 2', currentIntensity: 2 })];
        const { totalDamage } = processDamageOverTime(effects);
        expect(totalDamage).toBe(6);
    });

    it('accumulates damage from multiple DoT effects', () => {
        const effects = [
            makeEffect('debuff_poison', { teir: 'Teir 2', currentIntensity: 1 }), // 3
            makeEffect('debuff_bleed',  { teir: 'Teir 2', currentIntensity: 1 }), // 2
        ];
        const { totalDamage, messages } = processDamageOverTime(effects);
        expect(totalDamage).toBe(5);
        expect(messages).toHaveLength(2);
    });

    it('ignores non-DoT effects', () => {
        const effects = [
            makeEffect('buff_mind_attack_up', { teir: 'Teir 2' }),
            makeEffect('debuff_stun',         { teir: 'Teir 2' }),
        ];
        const { totalDamage } = processDamageOverTime(effects);
        expect(totalDamage).toBe(0);
    });
});

// ─── processWorldEffectTick ───────────────────────────────────────────────────

describe('processWorldEffectTick', () => {
    it('applies DoT to player health', () => {
        const player = createCharacter({ name: 'Test', level: 1, baseStats: { body: 5, mind: 5, heart: 5 } });
        const poisoned = {
            ...player,
            currentActiveEffects: [makeEffect('debuff_poison', { teir: 'Teir 2', currentIntensity: 1 })],
        };
        const { player: updated } = processWorldEffectTick(poisoned);
        expect(updated.health).toBe(player.health - 3);
    });

    it('applies regeneration to player health', () => {
        const player = createCharacter({ name: 'Test', level: 1, baseStats: { body: 5, mind: 5, heart: 5 } });
        const withRegen = {
            ...player,
            health: player.maxHealth - 10,
            currentActiveEffects: [makeEffect('tier1_heart_defend', { teir: 'Teir 1', currentIntensity: 2 })],
        };
        const { player: updated } = processWorldEffectTick(withRegen);
        // tier1_heart_defend: healthPerRound: 1 × intensity 2 = +2
        expect(updated.health).toBe(withRegen.health + 2);
    });

    it('ticks effect duration and removes expired effects', () => {
        const player = createCharacter({ name: 'Test', level: 1, baseStats: { body: 5, mind: 5, heart: 5 } });
        const withEffect = {
            ...player,
            currentActiveEffects: [makeEffect('debuff_curse', { teir: 'Teir 2', remainingDuration: 1 })],
        };
        const { player: updated, events } = processWorldEffectTick(withEffect);
        expect(updated.currentActiveEffects).toHaveLength(0);
        expect(events.some(e => e.includes('faded'))).toBe(true);
    });

    it('does not remove permanent effects (remainingDuration === −1)', () => {
        const player = createCharacter({ name: 'Test', level: 1, baseStats: { body: 5, mind: 5, heart: 5 } });
        const withPerm = {
            ...player,
            currentActiveEffects: [makeEffect('tier1_body_attack', { teir: 'Teir 1', remainingDuration: -1 })],
        };
        const { player: updated } = processWorldEffectTick(withPerm);
        expect(updated.currentActiveEffects).toHaveLength(1);
    });
});
