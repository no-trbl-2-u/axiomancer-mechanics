import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createSkill,
  canUseSkill,
  calculateSkillDamage,
  executeSkill,
  learnSkill,
  skillLibrary,
  lookupSkill,
  getSkillsByAspect,
  getSkillsByCategory,
} from './index';
import { initializeCombat } from '../Combat/combat.reducer';
import { createCharacter } from '../Character';
import { createEnemy } from '../Enemy';

const player = createCharacter({
  name: 'Hero',
  level: 6,
  baseStats: { heart: 8, body: 8, mind: 8 },
});
const enemy = createEnemy({
  id: 'foe', name: 'Foe', description: '', level: 1,
  baseStats: { heart: 3, body: 3, mind: 3 },
  mapLocation: { name: 'fishing-village' as never }, logic: 'random',
});

afterEach(() => vi.restoreAllMocks());

describe('skill.library', () => {
  it('contains 18 skills (3 per stat × 2 categories)', () => {
    expect(skillLibrary).toHaveLength(18);
  });

  it('has 3 skills for every stat × category pair', () => {
    for (const aspect of ['body', 'mind', 'heart'] as const) {
      for (const category of ['fallacy', 'paradox'] as const) {
        const matches = skillLibrary.filter(
          s => s.philosophicalAspect === aspect && s.category === category,
        );
        expect(matches).toHaveLength(3);
      }
    }
  });

  it('every skill has a basePower, scalingStat, and combatEffects array', () => {
    for (const s of skillLibrary) {
      expect(s.basePower).toBeGreaterThanOrEqual(0);
      expect(s.scalingStat).toBeDefined();
      expect(Array.isArray(s.combatEffects)).toBe(true);
    }
  });

  it('lookupSkill returns the matching skill', () => {
    expect(lookupSkill('skill_appeal_to_emotion')?.name).toBe('Appeal to Emotion');
  });

  it('getSkillsByAspect filters by stat', () => {
    expect(getSkillsByAspect('body').every(s => s.philosophicalAspect === 'body')).toBe(true);
  });

  it('getSkillsByCategory filters by category', () => {
    expect(getSkillsByCategory('paradox').every(s => s.category === 'paradox')).toBe(true);
  });
});

describe('createSkill', () => {
  it('builds a Skill with sensible defaults', () => {
    const s = createSkill({
      id: 'tmp', name: 'Tmp', description: '',
      category: 'fallacy', philosophicalAspect: 'body',
      level: 1, manaCost: 1,
      targetType: 'enemy', basePower: 1, scalingStat: 'physicalAttack',
    });
    expect(s.advantageInteraction).toBe('standard');
    expect(s.teir).toBe('Teir 1');
    expect(s.combatEffects).toEqual([]);
  });
});

describe('canUseSkill', () => {
  const skill = lookupSkill('skill_ad_baculum_strike')!;

  it('returns true when mana, level, and stats are met', () => {
    expect(canUseSkill(player, skill)).toBe(true);
  });

  it('returns false when mana is too low', () => {
    const broke = { ...player, mana: 0 };
    expect(canUseSkill(broke, skill)).toBe(false);
  });

  it('returns false when level requirement fails', () => {
    const lowLevel = { ...player, level: 1 };
    expect(canUseSkill(lowLevel, skill)).toBe(false);
  });

  it('returns false when stat requirement fails', () => {
    const weakBody = { ...player, baseStats: { ...player.baseStats, body: 1 } };
    expect(canUseSkill(weakBody, skill)).toBe(false);
  });
});

describe('calculateSkillDamage', () => {
  const skill = lookupSkill('skill_appeal_to_force')!;

  it('returns basePower + scalingStat at neutral', () => {
    const dmg = calculateSkillDamage(player, skill, 'neutral');
    expect(dmg).toBe(skill.basePower + player.derivedStats.physicalAttack);
  });

  it('applies +2 advantage for standard interaction', () => {
    const dmg = calculateSkillDamage(player, skill, 'advantage');
    const neutral = calculateSkillDamage(player, skill, 'neutral');
    expect(dmg).toBe(neutral + 2);
  });

  it('amplifies advantage for amplify interaction', () => {
    const amp = lookupSkill('skill_ad_baculum_strike')!;
    const dmg = calculateSkillDamage(player, amp, 'advantage');
    const neutral = calculateSkillDamage(player, amp, 'neutral');
    expect(dmg).toBe(neutral + 4);
  });

  it('reverses advantage for reverse interaction', () => {
    const liar = lookupSkill('skill_liar_paradox')!;
    const adv = calculateSkillDamage(player, liar, 'advantage');
    const dis = calculateSkillDamage(player, liar, 'disadvantage');
    expect(adv).toBeLessThan(dis);
  });

  it('ignores advantage for ignore interaction', () => {
    const ignore = lookupSkill('skill_ship_of_theseus')!;
    const adv = calculateSkillDamage(player, ignore, 'advantage');
    const dis = calculateSkillDamage(player, ignore, 'disadvantage');
    expect(adv).toBe(dis);
  });
});

describe('executeSkill', () => {
  const baseState = initializeCombat(player, enemy);

  it('damages the enemy when targetType=enemy', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // procs miss
    const r = executeSkill(baseState, 'skill_appeal_to_force', 'player');
    expect(r.damageDealt).toBeGreaterThan(0);
    expect(r.state.enemy.health).toBeLessThan(enemy.health);
    expect(r.state.player.mana).toBeLessThan(player.maxMana);
  });

  it('heals the actor when targetType=self', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const damaged = { ...baseState, player: { ...baseState.player, health: 1 } };
    const r = executeSkill(damaged, 'skill_paradox_of_tolerance', 'player');
    expect(r.healing).toBeGreaterThan(0);
    expect(r.state.player.health).toBeGreaterThan(1);
  });

  it('returns unchanged state when mana is insufficient', () => {
    const broke = { ...baseState, player: { ...baseState.player, mana: 0 } };
    const r = executeSkill(broke, 'skill_appeal_to_force', 'player');
    expect(r.state).toBe(broke);
    expect(r.message).toContain("can't afford");
  });

  it('returns unchanged state for unknown skill', () => {
    const r = executeSkill(baseState, 'skill_does_not_exist', 'player');
    expect(r.state).toBe(baseState);
    expect(r.message).toContain('Unknown skill');
  });

  it('applies combat-effect triggers when their roll succeeds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // every chance fires
    const r = executeSkill(baseState, 'skill_appeal_to_force', 'player');
    expect(r.procs.length).toBeGreaterThan(0);
    expect(r.state.enemy.currentActiveEffects.length).toBeGreaterThan(0);
  });
});

describe('learnSkill', () => {
  it('adds the skill to knownSkills when requirements pass', () => {
    const updated = learnSkill(player, 'skill_appeal_to_force');
    expect(updated.knownSkills).toContain('skill_appeal_to_force');
  });

  it('returns the character unchanged when level requirement fails', () => {
    const lowLevel = { ...player, level: 1 };
    const updated = learnSkill(lowLevel, 'skill_strawman_smash');
    expect(updated.knownSkills).not.toContain('skill_strawman_smash');
  });

  it('does not duplicate an already-known skill', () => {
    const taught = learnSkill(player, 'skill_appeal_to_force');
    const again = learnSkill(taught, 'skill_appeal_to_force');
    expect(again.knownSkills).toHaveLength(1);
  });

  it('returns the character unchanged for an unknown skill ID', () => {
    const updated = learnSkill(player, 'definitely_not_a_skill');
    expect(updated.knownSkills).not.toContain('definitely_not_a_skill');
  });
});
