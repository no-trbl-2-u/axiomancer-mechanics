import { describe, it, expect } from 'vitest';
import {
  determineAdvantage, getAdvantageModifier, hasAdvantage,
  calculateFinalDamage, applyDamage, heal, tickAllEffects,
  isCriticalHit, isCriticalMiss, isAttackSuccessful,
  isAlive, isDefeated, getHealthPercentage,
} from './index';
import { createCharacter } from '../Character';
import { createEnemy } from '../Enemy';
import { ActiveEffect } from '../Effects/types';

const makePlayer = () => createCharacter({ name: 'Test', level: 1, baseStats: { heart: 4, body: 3, mind: 2 } });
const makeEnemy = () => createEnemy({
  id: 'e1', name: 'Foe', description: '', level: 1,
  baseStats: { heart: 1, body: 1, mind: 1 },
  mapName: 'fishing-village', logic: 'random',
});

describe('determineAdvantage', () => {
  it('heart > body', () => expect(determineAdvantage('heart', 'body')).toBe('advantage'));
  it('body > mind', () => expect(determineAdvantage('body', 'mind')).toBe('advantage'));
  it('mind > heart', () => expect(determineAdvantage('mind', 'heart')).toBe('advantage'));
  it('same = neutral', () => expect(determineAdvantage('body', 'body')).toBe('neutral'));
  it('heart < mind', () => expect(determineAdvantage('heart', 'mind')).toBe('disadvantage'));
});

describe('getAdvantageModifier', () => {
  it('+2 for advantage', () => expect(getAdvantageModifier('advantage')).toBe(2));
  it('-2 for disadvantage', () => expect(getAdvantageModifier('disadvantage')).toBe(-2));
  it('0 for neutral', () => expect(getAdvantageModifier('neutral')).toBe(0));
});

describe('hasAdvantage', () => {
  it('true for heart vs body', () => expect(hasAdvantage('heart', 'body')).toBe(true));
  it('false for heart vs mind', () => expect(hasAdvantage('heart', 'mind')).toBe(false));
});

describe('calculateFinalDamage', () => {
  it('subtracts defense', () => expect(calculateFinalDamage(10, 3, false)).toBe(7));
  it('minimum 0', () => expect(calculateFinalDamage(2, 10, false)).toBe(0));
  it('doubles on crit', () => expect(calculateFinalDamage(10, 3, true)).toBe(17));
  it('adds damage bonus', () => expect(calculateFinalDamage(10, 3, false, 2)).toBe(9));

  // ── Phase 32 — critStyle auto-selection ──
  it('crit against low defense — double wins (10 → 2*10-3 = 17 vs 10)', () => {
    // double = 17, pierce = 10 → max 17.
    expect(calculateFinalDamage(10, 3, true)).toBe(17);
  });
  it('crit against high defense — pierce wins (8 → 2*8-12 = 4 vs 8)', () => {
    // double = max(0, 16-12) = 4, pierce = 8 → max 8.
    expect(calculateFinalDamage(8, 12, true)).toBe(8);
  });
  it('crit with bonus — bonus rides both paths', () => {
    // base=5, defense=8, bonus=3.
    // double = max(0, 2*5+3-8) = 5; pierce = 5+3 = 8 → max 8.
    expect(calculateFinalDamage(5, 8, true, 3)).toBe(8);
  });
  it('crit with bonus enough to flip — double wins after bonus', () => {
    // base=5, defense=8, bonus=10.
    // double = max(0, 2*5+10-8) = 12; pierce = 5+10 = 15 → max 15.
    expect(calculateFinalDamage(5, 8, true, 10)).toBe(15);
  });
});

describe('applyDamage', () => {
  it('reduces HP on a Character', () => {
    const p = makePlayer();
    expect(applyDamage(p, 10).health).toBe(p.health - 10);
  });
  it('reduces HP on an Enemy', () => {
    const e = makeEnemy();
    expect(applyDamage(e, 5).health).toBe(e.health - 5);
  });
  it('clamps to 0', () => {
    const p = makePlayer();
    expect(applyDamage(p, 9999).health).toBe(0);
  });
});

describe('heal', () => {
  it('heals up to max', () => {
    const p = { ...makePlayer(), health: 5 };
    const healed = heal(p, 9999);
    expect(healed.health).toBe(p.maxHealth);
  });
});

describe('isAlive / isDefeated', () => {
  it('alive when health > 0', () => expect(isAlive(makePlayer())).toBe(true));
  it('defeated when health = 0', () => expect(isDefeated({ ...makePlayer(), health: 0 })).toBe(true));
});

describe('getHealthPercentage', () => {
  it('100% at full health', () => expect(getHealthPercentage(makePlayer())).toBe(100));
  it('50% at half health', () => {
    const p = makePlayer();
    expect(getHealthPercentage({ ...p, health: p.maxHealth / 2 })).toBe(50);
  });
});

describe('crit/miss checks', () => {
  it('nat 20 = crit', () => expect(isCriticalHit(20)).toBe(true));
  it('nat 1 = miss', () => expect(isCriticalMiss(1)).toBe(true));
  it('other rolls are neither', () => {
    expect(isCriticalHit(19)).toBe(false);
    expect(isCriticalMiss(2)).toBe(false);
  });
});

describe('isAttackSuccessful', () => {
  it('higher attack wins', () => expect(isAttackSuccessful(15, 10)).toBe(true));
  it('equal or lower fails', () => {
    expect(isAttackSuccessful(10, 10)).toBe(false);
    expect(isAttackSuccessful(5, 10)).toBe(false);
  });
});

describe('tickAllEffects', () => {
  it('decrements durations and removes expired', () => {
    const effects: ActiveEffect[] = [
      { effectId: 'a', remainingDuration: 2, intensity: 1, appliedAt: 1, tier: 1 },
      { effectId: 'b', remainingDuration: 1, intensity: 1, appliedAt: 1, tier: 1 },
    ];
    const p = { ...makePlayer(), effects };
    const { target, expired } = tickAllEffects(p);
    expect(target.effects).toHaveLength(1);
    expect(target.effects[0].effectId).toBe('a');
    expect(target.effects[0].remainingDuration).toBe(1);
    expect(expired).toHaveLength(1);
    expect(expired[0].effectId).toBe('b');
  });

  it('skips permanent effects', () => {
    const effects: ActiveEffect[] = [
      { effectId: 'perm', remainingDuration: -1, intensity: 1, appliedAt: 1, tier: 1 },
    ];
    const p = { ...makePlayer(), effects };
    const { target, expired } = tickAllEffects(p);
    expect(target.effects).toHaveLength(1);
    expect(expired).toHaveLength(0);
  });
});
