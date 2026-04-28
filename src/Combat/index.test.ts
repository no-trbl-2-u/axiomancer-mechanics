import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  determineAdvantage, getAdvantageModifier, hasAdvantage,
  calculateFinalDamage, applyDamage, healCharacter, tickAllEffects,
  isCriticalHit, isCriticalMiss, isAttackSuccessful,
  isAlive, isDefeated, getHealthPercentage,
  performAttackRoll, performDefenseRoll,
  calculateBaseDamage, calculateDamageReduction, calculateAttackDamage,
} from './index';
import { createCharacter } from '../Character';
import { createEnemy } from '../Enemy';
import { ActiveEffect } from '../Effects/types';

const makePlayer = () => createCharacter({ name: 'Test', level: 1, baseStats: { heart: 4, body: 3, mind: 2 } });
const makeEnemy = () => createEnemy({
  id: 'e1', name: 'Foe', description: '', level: 1,
  baseStats: { heart: 1, body: 1, mind: 1 },
  mapLocation: { name: 'fishing-village' }, logic: 'random',
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
});

describe('applyDamage', () => {
  it('reduces HP', () => {
    const p = makePlayer();
    expect(applyDamage(p, 10).health).toBe(p.health - 10);
  });
  it('clamps to 0', () => {
    const p = makePlayer();
    expect(applyDamage(p, 9999).health).toBe(0);
  });
});

describe('healCharacter', () => {
  it('heals up to max', () => {
    const p = { ...makePlayer(), health: 5 };
    const healed = healCharacter(p, 9999);
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

// ---- Phase 2a Combat Math ----

afterEach(() => {
  vi.restoreAllMocks();
});

const stubRandom = (...values: number[]) => {
  let i = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    const v = values[i++ % values.length];
    return v;
  });
};

// Math.random returns [0,1); randomInt(1,20) = floor(rand * 20) + 1.
// To force a roll of N: rand = (N - 1) / 20  (so floor((N-1)/20 * 20) = N-1, +1 = N).
const randForRoll = (n: number) => (n - 1) / 20;

describe('performAttackRoll', () => {
  it('rolls d20 + attack stat, returns details breakdown', () => {
    stubRandom(randForRoll(15));
    const player = makePlayer();
    const r = performAttackRoll(player, 'body', 'neutral');
    expect(r.roll).toBe(15);
    expect(r.modifier).toBe(player.derivedStats.physicalAttack);
    expect(r.total).toBe(15 + player.derivedStats.physicalAttack);
    expect(r.details).toContain('body attack');
  });

  it('honours advantage by taking max of two d20 rolls', () => {
    stubRandom(randForRoll(5), randForRoll(18));
    const player = makePlayer();
    const r = performAttackRoll(player, 'body', 'advantage');
    expect(r.roll).toBe(18);
    expect(r.details).toContain('(adv)');
  });
});

describe('performDefenseRoll', () => {
  it('returns defense stat modifier when defending', () => {
    const enemy = makeEnemy();
    const r = performDefenseRoll(enemy, 'body', true);
    expect(r.total).toBe(enemy.derivedStats.physicalDefense);
    expect(r.details).toContain('body defense');
  });
  it('returns base stat when not defending', () => {
    const enemy = makeEnemy();
    const r = performDefenseRoll(enemy, 'body', false);
    expect(r.total).toBe(enemy.derivedStats.physicalAttack);
    expect(r.details).toContain('body base');
  });
});

describe('calculateBaseDamage', () => {
  it('returns d20 + attack stat modifier', () => {
    stubRandom(randForRoll(10));
    const player = makePlayer();
    const dmg = calculateBaseDamage(player, 'body', 'neutral');
    expect(dmg).toBe(10 + player.derivedStats.physicalAttack);
  });
});

describe('calculateDamageReduction', () => {
  it('uses passive multiplier when not defending', () => {
    const enemy = makeEnemy();
    const r = calculateDamageReduction(enemy, 'body', false);
    expect(r).toBe(enemy.derivedStats.physicalAttack * 1);
  });
  it('uses neutral defense multiplier (×2) when defending', () => {
    const enemy = makeEnemy();
    const r = calculateDamageReduction(enemy, 'body', true);
    expect(r).toBe(enemy.derivedStats.physicalDefense * 2);
  });
});

describe('calculateAttackDamage', () => {
  it('reports a miss when attack roll loses to defense', () => {
    stubRandom(randForRoll(1));
    const player = makePlayer();
    const enemy = makeEnemy();
    const tank = { ...enemy, baseStats: { heart: 10, body: 10, mind: 10 },
      derivedStats: { ...enemy.derivedStats, physicalAttack: 50, physicalDefense: 50 } };
    const r = calculateAttackDamage(player, tank, 'body', 'neutral', false);
    expect(r.hit).toBe(false);
    expect(r.damage).toBe(0);
    expect(r.details).toContain('Miss');
  });

  it('reports a hit and computes mitigated damage', () => {
    stubRandom(randForRoll(20), randForRoll(15));
    const player = makePlayer();
    const enemy = makeEnemy();
    const r = calculateAttackDamage(player, enemy, 'body', 'neutral', false);
    expect(r.hit).toBe(true);
    expect(r.critical).toBe(true);
    expect(r.damage).toBeGreaterThan(0);
    expect(r.details).toContain('CRIT');
  });
});

describe('tickAllEffects', () => {
  it('decrements durations and removes expired', () => {
    const effects: ActiveEffect[] = [
      { effectId: 'a', remainingDuration: 2, currentIntensity: 1, appliedAtRound: 1, teir: 'Teir 1' },
      { effectId: 'b', remainingDuration: 1, currentIntensity: 1, appliedAtRound: 1, teir: 'Teir 1' },
    ];
    const p = { ...makePlayer(), currentActiveEffects: effects };
    const { target, expired } = tickAllEffects(p);
    expect(target.currentActiveEffects).toHaveLength(1);
    expect(target.currentActiveEffects[0].effectId).toBe('a');
    expect(target.currentActiveEffects[0].remainingDuration).toBe(1);
    expect(expired).toHaveLength(1);
    expect(expired[0].effectId).toBe('b');
  });

  it('skips permanent effects', () => {
    const effects: ActiveEffect[] = [
      { effectId: 'perm', remainingDuration: -1, currentIntensity: 1, appliedAtRound: 1, teir: 'Teir 1' },
    ];
    const p = { ...makePlayer(), currentActiveEffects: effects };
    const { target, expired } = tickAllEffects(p);
    expect(target.currentActiveEffects).toHaveLength(1);
    expect(expired).toHaveLength(0);
  });
});
