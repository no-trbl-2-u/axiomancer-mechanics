import { describe, it, expect } from 'vitest';
import { applyEffect, clearTier1EffectsForType, processDamageOverTime, processRoundStartEffects } from './index';
import { ActiveEffect, Effect } from './types';
import { lookupEffect } from './effects.library';
import { createCharacter } from '../Character';
import { createEnemy } from '../Enemy';
import { initializeCombat } from '../Combat/combat.reducer';

const makePlayer = () => createCharacter({ name: 'Test', level: 1, baseStats: { heart: 4, body: 3, mind: 2 } });
const makeEnemy = () => createEnemy({
  id: 'e1', name: 'Foe', description: '', level: 1,
  baseStats: { heart: 1, body: 1, mind: 1 },
  mapLocation: { name: 'fishing-village' }, logic: 'random',
});

const makeDoTEffect = (
  id: string,
  damagePerRound: number,
  intensity: number,
  duration: number,
): ActiveEffect => ({
  effectId: id,
  remainingDuration: duration,
  currentIntensity: intensity,
  appliedAtRound: 1,
  teir: 'Teir 2',
});

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

describe('processDamageOverTime', () => {
  it('returns zero totals with no active effects', () => {
    const { totalDamage, messages } = processDamageOverTime([]);
    expect(totalDamage).toBe(0);
    expect(messages).toHaveLength(0);
  });

  it('returns zero totals when no effects have damageOverTime', () => {
    const effects: ActiveEffect[] = [
      { effectId: 'tier1_body_attack', remainingDuration: 2, currentIntensity: 1, appliedAtRound: 1, teir: 'Teir 1' },
    ];
    const { totalDamage, messages } = processDamageOverTime(effects);
    expect(totalDamage).toBe(0);
    expect(messages).toHaveLength(0);
  });

  it('computes damage: damagePerRound × intensity for a single DoT effect', () => {
    // debuff_poison: damagePerRound = 3
    const effects: ActiveEffect[] = [
      { effectId: 'debuff_poison', remainingDuration: 3, currentIntensity: 2, appliedAtRound: 1, teir: 'Teir 2' },
    ];
    const { totalDamage, messages } = processDamageOverTime(effects);
    expect(totalDamage).toBe(6); // 3 × 2
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('6');
    expect(messages[0]).toContain('intensity 2');
  });

  it('sums multiple DoT effects and generates one message per source', () => {
    // debuff_poison: 3/round, debuff_strong_poison: 5/round
    const effects: ActiveEffect[] = [
      { effectId: 'debuff_poison',        remainingDuration: 3, currentIntensity: 1, appliedAtRound: 1, teir: 'Teir 2' },
      { effectId: 'debuff_strong_poison', remainingDuration: 2, currentIntensity: 1, appliedAtRound: 1, teir: 'Teir 2' },
    ];
    const { totalDamage, messages } = processDamageOverTime(effects);
    expect(totalDamage).toBe(8); // 3 + 5
    expect(messages).toHaveLength(2);
  });

  it('ignores effects without damageOverTime in a mixed array', () => {
    const effects: ActiveEffect[] = [
      { effectId: 'tier1_mind_mark', remainingDuration: 2, currentIntensity: 1, appliedAtRound: 1, teir: 'Teir 1' },
      { effectId: 'debuff_poison',   remainingDuration: 3, currentIntensity: 1, appliedAtRound: 1, teir: 'Teir 2' },
    ];
    const { totalDamage, messages } = processDamageOverTime(effects);
    expect(totalDamage).toBe(3);
    expect(messages).toHaveLength(1);
  });
});

describe('processRoundStartEffects', () => {
  it('returns a new state object (does not mutate)', () => {
    const state = initializeCombat(makePlayer(), makeEnemy());
    const next = processRoundStartEffects(state);
    expect(next).not.toBe(state);
    expect(next.player).not.toBe(state.player);
    expect(next.enemy).not.toBe(state.enemy);
  });

  it('returns unchanged HP when there are no active effects', () => {
    const state = initializeCombat(makePlayer(), makeEnemy());
    const next = processRoundStartEffects(state);
    expect(next.player.health).toBe(state.player.health);
    expect(next.enemy.health).toBe(state.enemy.health);
  });

  it('applies DoT damage to the player before regen', () => {
    const player = {
      ...makePlayer(),
      currentActiveEffects: [
        { effectId: 'debuff_poison', remainingDuration: 3, currentIntensity: 1, appliedAtRound: 1, teir: 'Teir 2' as const },
      ],
    };
    const state = initializeCombat(player, makeEnemy());
    const next = processRoundStartEffects(state);
    // debuff_poison: 3 dmg/round × intensity 1 = 3 damage
    expect(next.player.health).toBe(state.player.health - 3);
    expect(next.enemy.health).toBe(state.enemy.health);
  });

  it('applies DoT damage to the enemy', () => {
    const enemy = {
      ...makeEnemy(),
      currentActiveEffects: [
        { effectId: 'debuff_poison', remainingDuration: 3, currentIntensity: 2, appliedAtRound: 1, teir: 'Teir 2' as const },
      ],
    };
    const state = initializeCombat(makePlayer(), enemy);
    const next = processRoundStartEffects(state);
    expect(next.enemy.health).toBe(state.enemy.health - 6); // 3 × 2
  });

  it('applies regen to the player', () => {
    const player = {
      ...makePlayer(),
      health: 5,
      currentActiveEffects: [
        { effectId: 'tier1_heart_defend', remainingDuration: 3, currentIntensity: 1, appliedAtRound: 1, teir: 'Teir 1' as const },
      ],
    };
    const state = initializeCombat(player, makeEnemy());
    const regenDef = lookupEffect('tier1_heart_defend');
    const perRound = regenDef?.payload.regeneration?.healthPerRound ?? 0;
    const next = processRoundStartEffects(state);
    // Health should increase by regen amount (capped at maxHealth)
    expect(next.player.health).toBeGreaterThanOrEqual(state.player.health);
    if (perRound > 0) {
      expect(next.player.health).toBe(Math.min(state.player.maxHealth, state.player.health + perRound));
    }
  });

  it('ticks effect durations and removes expired effects', () => {
    const player = {
      ...makePlayer(),
      currentActiveEffects: [
        { effectId: 'tier1_body_attack', remainingDuration: 1, currentIntensity: 1, appliedAtRound: 1, teir: 'Teir 1' as const },
        { effectId: 'tier1_heart_defend', remainingDuration: 3, currentIntensity: 1, appliedAtRound: 1, teir: 'Teir 1' as const },
      ],
    };
    const state = initializeCombat(player, makeEnemy());
    const next = processRoundStartEffects(state);
    // tier1_body_attack had duration 1 — should be expired and removed
    expect(next.player.currentActiveEffects).toHaveLength(1);
    expect(next.player.currentActiveEffects[0].effectId).toBe('tier1_heart_defend');
    expect(next.player.currentActiveEffects[0].remainingDuration).toBe(2);
  });

  it('does not end combat when DoT reduces HP to 0 (leaves that to resolveCombatRound)', () => {
    const enemy = {
      ...makeEnemy(),
      health: 1,
      currentActiveEffects: [
        { effectId: 'debuff_poison', remainingDuration: 3, currentIntensity: 1, appliedAtRound: 1, teir: 'Teir 2' as const },
      ],
    };
    const state = initializeCombat(makePlayer(), enemy);
    const next = processRoundStartEffects(state);
    expect(next.active).toBe(true);
    expect(next.enemy.health).toBe(0);
  });

  it('preserves all other CombatState fields unchanged', () => {
    const state = initializeCombat(makePlayer(), makeEnemy());
    const next = processRoundStartEffects(state);
    expect(next.round).toBe(state.round);
    expect(next.phase).toBe(state.phase);
    expect(next.friendshipCounter).toBe(state.friendshipCounter);
    expect(next.logEntry).toBe(state.logEntry);
  });
});
