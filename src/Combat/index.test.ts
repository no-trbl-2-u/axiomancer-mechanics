import { describe, it, expect } from 'vitest';
import {
  determineAdvantage, getAdvantageModifier, hasAdvantage,
  calculateFinalDamage, applyDamage, healCharacter, tickAllEffects,
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
  // baseDefense=3, defenseMultiplier=1 → effectiveDefense=3; 10−3=7
  it('subtracts defense (passive multiplier ×1)', () => expect(calculateFinalDamage(10, 3, 1, false)).toBe(7));
  // baseDefense=10, defenseMultiplier=1 → effectiveDefense=10; max(0, 2−10)=0
  it('minimum 0', () => expect(calculateFinalDamage(2, 10, 1, false)).toBe(0));
  // crit: 10×2=20; 20−3=17
  it('doubles on crit', () => expect(calculateFinalDamage(10, 3, 1, true)).toBe(17));
  // damage bonus: 10+2=12; 12−3=9
  it('adds damage bonus', () => expect(calculateFinalDamage(10, 3, 1, false, 2)).toBe(9));
  // defense multiplier: baseDefense=3, multiplier=2 → effectiveDefense=6; 10−6=4
  it('applies defense multiplier', () => expect(calculateFinalDamage(10, 3, 2, false)).toBe(4));
  // effect defense modifier: baseDefense=3, multiplier=1, effectModifier=−2 → effectiveDefense=max(0,1)=1; 10−1=9
  it('applies effectDefenseModifier', () => expect(calculateFinalDamage(10, 3, 1, false, 0, -2)).toBe(9));
  // effectiveDefense floor: baseDefense=3, multiplier=1, effectModifier=−10 → effectiveDefense=max(0,−7)=0; 10−0=10
  it('clamps effectiveDefense to 0', () => expect(calculateFinalDamage(10, 3, 1, false, 0, -10)).toBe(10));
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
