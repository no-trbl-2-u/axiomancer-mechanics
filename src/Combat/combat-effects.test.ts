import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  rollForCombatEffects,
  applyCombatEffects,
} from './index';
import {
  COMBAT_EFFECTS,
  getCombatEffectTriggers,
} from './combat-effects.library';
import { CombatAction, CombatState } from './types';
import { initializeCombat } from './combat.reducer';
import { createCharacter } from '../Character';
import { createEnemy } from '../Enemy';

const player = createCharacter({
  name: 'Tester', level: 1, baseStats: { heart: 5, body: 5, mind: 5 },
});
const enemy = createEnemy({
  id: 'foe', name: 'Foe', description: '', level: 1,
  baseStats: { heart: 5, body: 5, mind: 5 },
  mapLocation: { name: 'fishing-village' as never }, logic: 'random',
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('combat-effects library', () => {
  it('exposes triggers for every stance + action combo', () => {
    for (const stance of ['heart', 'body', 'mind'] as const) {
      expect(COMBAT_EFFECTS[stance].attack.length).toBeGreaterThan(0);
      expect(COMBAT_EFFECTS[stance].defend.length).toBeGreaterThan(0);
    }
  });

  it('returns [] for non-attack/defend actions', () => {
    expect(getCombatEffectTriggers('body', 'flee')).toEqual([]);
    expect(getCombatEffectTriggers('body', 'skill')).toEqual([]);
  });
});

describe('rollForCombatEffects', () => {
  const action: CombatAction = { type: 'body', action: 'attack' };

  it('crit forces the strongest critGuaranteed trigger to fire', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const results = rollForCombatEffects(player, action, 20);
    const critFired = results.find(r => r.reason === 'crit');
    expect(critFired?.fired).toBe(true);
    expect(critFired?.trigger.critGuaranteed).toBe(true);
  });

  it('fumble swaps target onto the actor for fumbleSelfTarget triggers', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // every chance < 1 fires
    const results = rollForCombatEffects(player, action, 1);
    const fumble = results.find(r => r.trigger.fumbleSelfTarget);
    expect(fumble?.targetSwap).toBe(true);
    expect(fumble?.reason).toBe('fumble');
  });

  it('fumble does not fire triggers without fumbleSelfTarget', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const results = rollForCombatEffects(player, action, 1);
    for (const r of results) {
      if (!r.trigger.fumbleSelfTarget) expect(r.fired).toBe(false);
    }
  });

  it('normal roll succeeds when random < chance', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // always fire
    const results = rollForCombatEffects(player, action, 10);
    expect(results.every(r => r.fired)).toBe(true);
    expect(results.every(r => r.reason === 'roll')).toBe(true);
  });

  it('normal roll fails when random >= chance', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // never fire normally
    const results = rollForCombatEffects(player, action, 10);
    expect(results.every(r => r.fired)).toBe(false);
    expect(results.every(r => r.reason === 'miss')).toBe(true);
  });

  it('non-combat actions return []', () => {
    const results = rollForCombatEffects(player, { type: 'body', action: 'flee' }, 10);
    expect(results).toEqual([]);
  });
});

describe('applyCombatEffects', () => {
  const baseState: CombatState = initializeCombat(player, enemy);

  it('applies opponent-targeted triggers to the receiver', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const action: CombatAction = { type: 'body', action: 'attack' };
    const rolls = rollForCombatEffects(player, action, 10);
    const { state, applied } = applyCombatEffects(baseState, 'player', rolls);
    expect(applied.length).toBeGreaterThan(0);
    expect(state.enemy.currentActiveEffects.length).toBeGreaterThan(0);
    expect(state.player.currentActiveEffects.length).toBe(0);
    expect(applied[0].appliedTo).toBe('enemy');
  });

  it('respects targetSwap from a fumble (self-debuff)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const rolls = rollForCombatEffects(player, { type: 'body', action: 'attack' }, 1);
    const { state, applied } = applyCombatEffects(baseState, 'player', rolls);
    expect(applied.length).toBeGreaterThan(0);
    expect(applied.every(a => a.appliedTo === 'player')).toBe(true);
    expect(state.player.currentActiveEffects.length).toBeGreaterThan(0);
  });

  it('skips triggers that did not fire', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const rolls = rollForCombatEffects(player, { type: 'body', action: 'attack' }, 10);
    const { state, applied } = applyCombatEffects(baseState, 'player', rolls);
    expect(applied).toHaveLength(0);
    expect(state.player.currentActiveEffects).toHaveLength(0);
    expect(state.enemy.currentActiveEffects).toHaveLength(0);
  });

  it('applies self-target defense triggers to the actor', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const rolls = rollForCombatEffects(player, { type: 'body', action: 'defend' }, 10);
    const { state, applied } = applyCombatEffects(baseState, 'player', rolls);
    expect(applied.every(a => a.appliedTo === 'player')).toBe(true);
    expect(state.player.currentActiveEffects.length).toBeGreaterThan(0);
  });
});
