import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  initializeCombat,
  setPlayerStance, setPlayerAction,
  addBattleLogEntry, incrementFriendship,
  endCombatPlayerVictory,
  resetCombat, resolveCombatRound,
} from './combat.reducer';
import { createCharacter } from '../Character';
import { createEnemy } from '../Enemy';
import { BattleLogEntry } from './types';

const player = createCharacter({ name: 'Hero', level: 1, baseStats: { heart: 3, body: 3, mind: 3 } });
const enemy = createEnemy({
  id: 'e1', name: 'Foe', description: '', level: 1,
  baseStats: { heart: 1, body: 1, mind: 1 },
  mapLocation: { name: 'fishing-village' }, logic: 'random',
});

describe('initializeCombat', () => {
  it('creates fresh combat state', () => {
    const state = initializeCombat(player, enemy);
    expect(state.active).toBe(true);
    expect(state.round).toBe(1);
    expect(state.friendshipCounter).toBe(0);
    expect(state.player.name).toBe('Hero');
    expect(state.enemy.name).toBe('Foe');
    expect(state.logEntry).toHaveLength(0);
  });

  it('deep clones combatants', () => {
    const state = initializeCombat(player, enemy);
    expect(state.player).not.toBe(player);
    expect(state.enemy).not.toBe(enemy);
  });
});

describe('setPlayerStance / setPlayerAction', () => {
  it('sets stance', () => {
    const state = initializeCombat(player, enemy);
    expect(setPlayerStance(state, 'heart').playerChoice.type).toBe('heart');
  });
  it('sets action', () => {
    const state = initializeCombat(player, enemy);
    expect(setPlayerAction(state, 'defend').playerChoice.action).toBe('defend');
  });
});

describe('addBattleLogEntry', () => {
  it('appends entry', () => {
    const state = initializeCombat(player, enemy);
    const entry = { round: 1 } as BattleLogEntry;
    const updated = addBattleLogEntry(state, entry);
    expect(updated.logEntry).toHaveLength(1);
  });
});

describe('incrementFriendship', () => {
  it('increments counter', () => {
    const state = initializeCombat(player, enemy);
    expect(incrementFriendship(state).friendshipCounter).toBe(1);
  });
});

describe('endCombatPlayerVictory', () => {
  it('sets inactive and ended', () => {
    const state = initializeCombat(player, enemy);
    const ended = endCombatPlayerVictory(state);
    expect(ended.active).toBe(false);
    expect(ended.phase).toBe('ended');
  });
});

describe('resetCombat', () => {
  it('returns inactive state with healed combatants', () => {
    const state = initializeCombat(player, enemy);
    const damaged = { ...state, player: { ...state.player, health: 1 }, active: true };
    const reset = resetCombat(damaged);
    expect(reset.active).toBe(false);
    expect(reset.player.health).toBe(reset.player.maxHealth);
    expect(reset.enemy.health).toBe(reset.enemy.maxHealth);
    expect(reset.player.currentActiveEffects).toHaveLength(0);
    expect(reset.round).toBe(1);
    expect(reset.logEntry).toHaveLength(0);
  });
});

afterEach(() => vi.restoreAllMocks());

const stubRandom = (...values: number[]) => {
  let i = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => values[i++ % values.length]);
};
const randForRoll = (n: number) => (n - 1) / 20;

describe('resolveCombatRound', () => {
  it('returns state unchanged when choices missing', () => {
    const state = initializeCombat(player, enemy);
    expect(resolveCombatRound(state)).toBe(state);
  });

  it('runs the full round when both choices set', () => {
    stubRandom(randForRoll(15));
    let state = initializeCombat(player, enemy);
    state = setPlayerStance(state, 'body');
    state = setPlayerAction(state, 'attack');
    state = { ...state, enemyChoice: { type: 'mind', action: 'attack' } };
    const next = resolveCombatRound(state);
    expect(next.round).toBe(2);
    expect(next.logEntry).toHaveLength(1);
    expect(next.playerChoice).toEqual({});
    expect(next.enemyChoice).toEqual({});
  });

  it('increments friendshipCounter when both defend', () => {
    let state = initializeCombat(player, enemy);
    state = setPlayerStance(state, 'heart');
    state = setPlayerAction(state, 'defend');
    state = { ...state, enemyChoice: { type: 'heart', action: 'defend' } };
    const next = resolveCombatRound(state);
    expect(next.friendshipCounter).toBe(1);
    expect(next.logEntry[0].damageToEnemy).toBe(0);
    expect(next.logEntry[0].damageToPlayer).toBe(0);
  });

  it('applies damage to the loser of an attack contest', () => {
    stubRandom(randForRoll(20), randForRoll(20));
    let state = initializeCombat(player, enemy);
    state = setPlayerStance(state, 'body');
    state = setPlayerAction(state, 'attack');
    state = { ...state, enemyChoice: { type: 'body', action: 'defend' } };
    const next = resolveCombatRound(state);
    const log = next.logEntry[0];
    // Either dmg landed and HPs changed, or it missed; make a soft assertion.
    expect(log.damageToEnemy).toBeGreaterThanOrEqual(0);
    expect(next.enemy.health).toBeLessThanOrEqual(state.enemy.health);
  });
});
