import { describe, it, expect } from 'vitest';
import {
  calculateExperienceToNextLevel,
  grantExperience,
  levelUp,
  allocateStatPoint,
  getAvailableSkills,
  learnSkill,
  equipSkill,
  unequipSkill,
  MAX_EQUIPPED_SKILLS,
} from './progression';
import { createCharacter } from './index';
import { EXPERIENCE_PER_LEVEL } from '../Game/game-mechanics.constants';
import { Skill } from '../Skills/types';

const player = () => createCharacter({
  name: 'Hero', level: 1,
  baseStats: { heart: 4, body: 4, mind: 4 },
});

describe('calculateExperienceToNextLevel', () => {
  it('returns level × per-level constant', () => {
    expect(calculateExperienceToNextLevel(1)).toBe(EXPERIENCE_PER_LEVEL);
    expect(calculateExperienceToNextLevel(3)).toBe(3 * EXPERIENCE_PER_LEVEL);
  });
});

describe('grantExperience', () => {
  it('adds XP to the character', () => {
    const c = grantExperience(player(), 250);
    expect(c.experience).toBe(player().experience + 250);
  });
  it('ignores non-positive amounts', () => {
    const p = player();
    expect(grantExperience(p, 0)).toBe(p);
    expect(grantExperience(p, -10)).toBe(p);
  });
});

describe('levelUp', () => {
  it('does not level up when underqualified', () => {
    const p = player();
    expect(levelUp(p)).toBe(p);
  });
  it('levels up and grants stat points when qualified', () => {
    const p = grantExperience(player(), EXPERIENCE_PER_LEVEL);
    const after = levelUp(p);
    expect(after.level).toBe(2);
    expect(after.availableStatPoints).toBe(2);
    expect(after.maxHealth).toBeGreaterThan(p.maxHealth);
  });
  it('chains repeated calls for multi-level XP grants', () => {
    let c = grantExperience(player(), 5 * EXPERIENCE_PER_LEVEL);
    while (c.experience >= calculateExperienceToNextLevel(c.level)) c = levelUp(c);
    expect(c.level).toBeGreaterThanOrEqual(5);
  });
});

describe('allocateStatPoint', () => {
  it('spends one point and recomputes derived stats', () => {
    const p = { ...player(), availableStatPoints: 1 };
    const after = allocateStatPoint(p, 'body');
    expect(after.baseStats.body).toBe(p.baseStats.body + 1);
    expect(after.availableStatPoints).toBe(0);
    expect(after.derivedStats.physicalAttack).toBeGreaterThan(p.derivedStats.physicalAttack);
  });
  it('is a no-op when no points are available', () => {
    const p = player();
    expect(allocateStatPoint(p, 'body')).toBe(p);
  });
});

const fakeSkill = (over: Partial<Skill> = {}): Skill => ({
  id: 'sk_a', name: 'Skill A', description: '',
  category: 'fallacy', philosophicalAspect: 'body',
  level: 1, manaCost: 1,
  targetType: 'enemy', basePower: 1, scalingStat: 'physicalAttack',
  advantageInteraction: 'standard', teir: 'Teir 1', combatEffects: [],
  ...over,
});

describe('getAvailableSkills', () => {
  it('filters out already-known skills', () => {
    const c = { ...player(), knownSkills: ['sk_a'] };
    const result = getAvailableSkills(c, [fakeSkill({ id: 'sk_a' }), fakeSkill({ id: 'sk_b' })]);
    expect(result.map(s => s.id)).toEqual(['sk_b']);
  });
  it('respects level requirements', () => {
    const c = player();
    const skill = fakeSkill({ id: 'sk_high', learningRequirement: { level: 5 } });
    expect(getAvailableSkills(c, [skill])).toHaveLength(0);
  });
  it('respects stat requirements', () => {
    const c = player();
    const skill = fakeSkill({
      id: 'sk_high',
      learningRequirement: { level: 1, statRequirementType: 'body', statRequirementValue: 999 },
    });
    expect(getAvailableSkills(c, [skill])).toHaveLength(0);
  });
});

describe('learnSkill (Character module)', () => {
  it('adds the skill ID when requirements pass', () => {
    const c = learnSkill(player(), fakeSkill({ id: 'sk_a' }));
    expect(c.knownSkills).toContain('sk_a');
  });
  it('is idempotent', () => {
    const skill = fakeSkill({ id: 'sk_a' });
    const c = learnSkill(learnSkill(player(), skill), skill);
    expect(c.knownSkills).toEqual(['sk_a']);
  });
});

describe('equipSkill / unequipSkill', () => {
  it('only equips known skills', () => {
    const c = player();
    expect(equipSkill(c, 'unknown')).toBe(c);
  });
  it('equips when known and slots are open', () => {
    const c = learnSkill(player(), fakeSkill({ id: 'sk_a' }));
    const equipped = equipSkill(c, 'sk_a');
    expect(equipped.equippedSkills).toEqual(['sk_a']);
  });
  it('respects MAX_EQUIPPED_SKILLS', () => {
    let c = player();
    for (let i = 0; i < MAX_EQUIPPED_SKILLS + 1; i++) {
      c = learnSkill(c, fakeSkill({ id: `sk_${i}` }));
      c = equipSkill(c, `sk_${i}`);
    }
    expect(c.equippedSkills?.length).toBe(MAX_EQUIPPED_SKILLS);
  });
  it('unequips a slotted skill', () => {
    const c = equipSkill(learnSkill(player(), fakeSkill({ id: 'sk_a' })), 'sk_a');
    const after = unequipSkill(c, 'sk_a');
    expect(after.equippedSkills).toEqual([]);
  });
});
