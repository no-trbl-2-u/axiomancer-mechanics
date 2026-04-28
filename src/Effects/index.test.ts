import { describe, it, expect } from 'vitest';
import {
  applyEffect,
  clearTier1EffectsForType,
  removeEffect,
  getActiveEffectModifiers,
  canAct,
  processDamageOverTime,
  processRoundStartEffects,
  processWorldEffectTick,
} from './index';
import { ActiveEffect, Effect } from './types';
import { lookupEffect } from './effects.library';
import { createCharacter } from '../Character';
import { createEnemy } from '../Enemy';

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

const ae = (effectId: string, overrides: Partial<ActiveEffect> = {}): ActiveEffect => ({
  effectId,
  remainingDuration: 3,
  currentIntensity: 1,
  appliedAtRound: 1,
  teir: 'Teir 1',
  ...overrides,
});

const makePlayer = (effects: ActiveEffect[] = []) =>
  createCharacter({
    name: 'Tester',
    level: 1,
    baseStats: { heart: 5, body: 5, mind: 5 },
    currentActiveEffects: effects,
  });

const makeFoe = (effects: ActiveEffect[] = []) =>
  createEnemy({
    id: 'foe',
    name: 'Foe',
    description: '',
    level: 1,
    baseStats: { heart: 5, body: 5, mind: 5 },
    mapLocation: { name: 'Coastal Village' as never },
    logic: 'random',
    currentActiveEffects: effects,
  });

describe('removeEffect', () => {
  it('removes the matching effect and reports it', () => {
    const list = [ae('tier1_body_attack'), ae('tier1_heart_defend')];
    const { activeEffects, removed } = removeEffect(list, 'tier1_body_attack');
    expect(activeEffects).toHaveLength(1);
    expect(activeEffects[0].effectId).toBe('tier1_heart_defend');
    expect(removed?.effectId).toBe('tier1_body_attack');
  });

  it('returns the array unchanged if effect not found', () => {
    const list = [ae('tier1_body_attack')];
    const { activeEffects, removed } = removeEffect(list, 'nope');
    expect(activeEffects).toBe(list);
    expect(removed).toBeNull();
  });
});

describe('getActiveEffectModifiers', () => {
  it('aggregates additive stat modifiers scaled by intensity', () => {
    const list = [ae('tier1_body_attack', { currentIntensity: 2 })];
    const mods = getActiveEffectModifiers(list);
    expect(mods.statModifiers.physicalAttack).toBe(2);
    expect(mods.rollModifier).toBe(2);
  });

  it('multiplies multiplier-style modifiers separately', async () => {
    const customLib: Effect = {
      id: 'mult_test', name: 'Mult', description: '', type: 'buff',
      category: 'stat', duration: 3, stacking: 'none', teir: 'Teir 2',
      payload: { statModifiers: [{ stat: 'body', value: 1.5, isMultiplier: true }] },
    };
    const { effectsLibrary } = await import('./effects.library');
    effectsLibrary.registry.set(customLib.id, customLib);
    try {
      const mods = getActiveEffectModifiers([
        ae(customLib.id, { teir: 'Teir 2' }),
        ae(customLib.id, { teir: 'Teir 2' }),
      ]);
      expect(mods.statMultipliers.body).toBeCloseTo(2.25);
    } finally {
      effectsLibrary.registry.delete(customLib.id);
    }
  });

  it('aggregates advantage modifiers from real library effects', () => {
    const mods = getActiveEffectModifiers([
      ae('debuff_confusion', { currentIntensity: 1, teir: 'Teir 2' }),
    ]);
    expect(mods.grantsDisadvantage.length).toBeGreaterThan(0);
    expect(mods.rollModifier).toBe(-4);
  });

  it('skips effects whose definition is missing', () => {
    const mods = getActiveEffectModifiers([ae('definitely_unknown_effect')]);
    expect(mods.rollModifier).toBe(0);
    expect(mods.statModifiers).toEqual({});
  });
});

describe('canAct', () => {
  it('reports canAct=true with no restrictions', () => {
    const r = canAct([]);
    expect(r.canAct).toBe(true);
    expect(r.skipTurn).toBe(false);
    expect(r.allowedStances.sort()).toEqual(['body', 'heart', 'mind']);
  });

  it('skipTurn from any single effect blocks acting', () => {
    const r = canAct([ae('debuff_stun', { teir: 'Teir 2' })]);
    expect(r.skipTurn).toBe(true);
    expect(r.canAct).toBe(false);
  });

  it('forcedStance overrides blocked stances and limits allowed list', () => {
    const r = canAct([ae('debuff_charm', { teir: 'Teir 2' })]);
    expect(r.forcedStance).toBe('heart');
    expect(r.allowedStances).toEqual(['heart']);
    expect(r.canAct).toBe(true);
  });

  it('returns blockedStances when an effect blocks specific stances', () => {
    const r = canAct([ae('debuff_silence', { teir: 'Teir 2' })]);
    expect(r.blockedStances).toContain('heart');
    expect(r.allowedStances).not.toContain('heart');
  });
});

describe('processDamageOverTime', () => {
  it('sums DoT damage across effects scaled by intensity', () => {
    const list = [ae('debuff_poison', { currentIntensity: 2, teir: 'Teir 2' })];
    const dot = processDamageOverTime(list);
    expect(dot.total).toBeGreaterThan(0);
    expect(dot.contributions).toHaveLength(1);
    expect(dot.messages[0]).toContain('damage');
  });

  it('returns 0 when no effects do DoT', () => {
    const dot = processDamageOverTime([ae('tier1_body_attack')]);
    expect(dot.total).toBe(0);
    expect(dot.contributions).toHaveLength(0);
  });
});

describe('processRoundStartEffects', () => {
  it('applies regen, DoT, and ticks duration in one pass', () => {
    const player = makePlayer([ae('tier1_heart_defend', { currentIntensity: 2, remainingDuration: 1 })]);
    const enemy = makeFoe([ae('debuff_poison', { currentIntensity: 1, remainingDuration: 1, teir: 'Teir 2' })]);
    const damaged = { ...player, health: player.maxHealth - 5 };
    const state = { player: damaged, enemy };
    const { state: next, events } = processRoundStartEffects(state);
    expect(events.player.healed).toBe(2);
    expect(next.player.health).toBe(damaged.health + 2);
    expect(events.enemy.dotDamage).toBeGreaterThan(0);
    expect(next.enemy.health).toBeLessThan(enemy.health);
    expect(events.enemy.expired.map(e => e.effectId)).toContain('debuff_poison');
    expect(next.enemy.currentActiveEffects).toHaveLength(0);
  });

  it('preserves permanent effects (duration -1)', () => {
    const player = makePlayer([ae('tier1_heart_defend', { remainingDuration: -1 })]);
    const enemy = makeFoe();
    const { state: next } = processRoundStartEffects({ player, enemy });
    expect(next.player.currentActiveEffects[0].remainingDuration).toBe(-1);
  });
});

describe('processWorldEffectTick', () => {
  it('returns a healed character with regen events', () => {
    const player = makePlayer([ae('tier1_heart_defend', { currentIntensity: 1, remainingDuration: 5 })]);
    const damaged = { ...player, health: player.maxHealth - 3 };
    const result = processWorldEffectTick(damaged);
    expect(result.healed).toBe(1);
    expect(result.player.health).toBe(damaged.health + 1);
    expect(result.events.some(e => e.includes('Regenerated'))).toBe(true);
  });

  it('returns DoT damage and expired effect when poison expires', () => {
    const player = makePlayer([ae('debuff_poison', { currentIntensity: 1, remainingDuration: 1, teir: 'Teir 2' })]);
    const result = processWorldEffectTick(player);
    expect(result.dotDamage).toBeGreaterThan(0);
    expect(result.expired).toHaveLength(1);
    expect(result.player.currentActiveEffects).toHaveLength(0);
  });
});
