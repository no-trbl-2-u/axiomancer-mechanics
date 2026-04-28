import { describe, it, expect } from 'vitest';
import { applyEffect, clearTier1EffectsForType } from '../../src/effects/index';
import { ActiveEffect, Effect } from '../../src/effects/types';
import { lookupEffect } from '../../src/effects/effects.library';

const makeEffect = (overrides: Partial<Effect> = {}): Effect => ({
  id: 'test_effect',
  name: 'Test',
  description: '',
  type: 'buff',
  category: 'stat',
  duration: 3,
  stacking: 'intensity',
  teir: 'Teir 1',
  payload: {},
  ...overrides,
});

describe('applyEffect', () => {
  it('applies fresh effect', () => {
    const { activeEffects, result } = applyEffect([], makeEffect(), 1);
    expect(result.success).toBe(true);
    expect(activeEffects).toHaveLength(1);
    expect(activeEffects[0].effectId).toBe('test_effect');
    expect(activeEffects[0].remainingDuration).toBe(3);
    expect(activeEffects[0].currentIntensity).toBe(1);
  });

  it('stacks intensity', () => {
    const effect = makeEffect();
    const { activeEffects: first } = applyEffect([], effect, 1);
    const { activeEffects: second, result } = applyEffect(first, effect, 2);
    expect(second).toHaveLength(1);
    expect(second[0].currentIntensity).toBe(2);
    expect(result.stackedWith?.previousIntensity).toBe(1);
  });

  it('extends duration with stacking=duration', () => {
    const effect = makeEffect({ stacking: 'duration' });
    const { activeEffects: first } = applyEffect([], effect, 1);
    const { activeEffects: second } = applyEffect(first, effect, 2);
    expect(second[0].remainingDuration).toBe(6);
  });

  it('blocks duplicate with stacking=none', () => {
    const effect = makeEffect({ stacking: 'none' });
    const { activeEffects: first } = applyEffect([], effect, 1);
    const { activeEffects: second, result } = applyEffect(first, effect, 2);
    expect(result.success).toBe(false);
    expect(second).toHaveLength(1);
  });

  it('additive duration mode', () => {
    const effect = makeEffect();
    const { activeEffects: first } = applyEffect([], effect, 1, { intensityDelta: 1, durationMode: 'additive', durationDelta: 2 });
    expect(first[0].remainingDuration).toBe(2);
    const { activeEffects: second } = applyEffect(first, effect, 2, { intensityDelta: 1, durationMode: 'additive', durationDelta: 2 });
    expect(second[0].remainingDuration).toBe(4);
    expect(second[0].currentIntensity).toBe(2);
  });
});

describe('clearTier1EffectsForType', () => {
  it('clears buffs from other stances', () => {
    const effects: ActiveEffect[] = [
      { effectId: 'tier1_body_attack', remainingDuration: 2, currentIntensity: 1, appliedAtRound: 1, teir: 'Teir 1' },
      { effectId: 'tier1_heart_defend', remainingDuration: 3, currentIntensity: 1, appliedAtRound: 1, teir: 'Teir 1' },
    ];
    const { activeEffects, cleared } = clearTier1EffectsForType(effects, 'body');
    expect(activeEffects).toHaveLength(1);
    expect(activeEffects[0].effectId).toBe('tier1_body_attack');
    expect(cleared).toHaveLength(1);
  });

  it('keeps debuffs (opponent-applied)', () => {
    const effects: ActiveEffect[] = [
      { effectId: 'tier1_mind_mark', remainingDuration: 3, currentIntensity: 2, appliedAtRound: 1, teir: 'Teir 1' },
    ];
    const { activeEffects, cleared } = clearTier1EffectsForType(effects, 'body');
    expect(activeEffects).toHaveLength(1);
    expect(cleared).toHaveLength(0);
  });
});

describe('effectsLibrary', () => {
  it('lookupEffect finds buffs', () => {
    const effect = lookupEffect('tier1_body_attack');
    expect(effect).toBeDefined();
    expect(effect?.name).toBe('Ad Baculum');
  });

  it('lookupEffect finds debuffs', () => {
    const effect = lookupEffect('tier1_mind_mark');
    expect(effect).toBeDefined();
    expect(effect?.name).toBe('Exposed Reasoning');
  });

  it('returns undefined for unknown ID', () => {
    expect(lookupEffect('nonexistent')).toBeUndefined();
  });
});
