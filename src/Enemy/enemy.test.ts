import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  randomLogic, aggressiveLogic, defensiveLogic, balancedLogic,
  strategicLogic, bossLogic, dispatchEnemyLogic,
} from './enemy.logic';
import {
  enemyLibrary, lookupEnemy, getEnemiesByMap, getEnemiesByTier,
  Disatree_01, Architect_of_Axioms,
} from './enemy.library';
import {
  generateEncounter, listEncountersForMap, listAllEncounters,
} from './encounter.library';
import { createEnemy } from './index';

afterEach(() => vi.restoreAllMocks());

const make = (over: Partial<Parameters<typeof createEnemy>[0]> = {}) => createEnemy({
  id: 'e1', name: 'F', description: '', level: 3,
  baseStats: { heart: 1, body: 5, mind: 1 },
  mapLocation: { name: 'fishing-village' as never },
  logic: 'random',
  ...over,
});

describe('AI strategies', () => {
  it('randomLogic returns a valid attack/defend action', () => {
    const a = randomLogic();
    expect(['heart', 'body', 'mind']).toContain(a.type);
    expect(['attack', 'defend']).toContain(a.action);
  });

  it('aggressiveLogic always attacks', () => {
    const e = make();
    for (let i = 0; i < 10; i++) {
      expect(aggressiveLogic(e).action).toBe('attack');
    }
  });

  it('defensiveLogic favours defend at high HP', () => {
    const e = make();
    vi.spyOn(Math, 'random').mockReturnValue(0); // < 0.7 → defend
    const action = defensiveLogic(e, { enemyHpPercent: 100 });
    expect(action.action).toBe('defend');
  });

  it('defensiveLogic favours attack at low HP', () => {
    const e = make();
    vi.spyOn(Math, 'random').mockReturnValue(0); // < 0.3 → defend (small chance) → attack majority
    // at low HP, defendChance = 0.3, so rand=0 falls below 0.3 = defend.
    // So flip to test attack: rand=0.5 > 0.3 → attack.
    vi.restoreAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const action = defensiveLogic(e, { enemyHpPercent: 10 });
    expect(action.action).toBe('attack');
  });

  it('strategicLogic counters the player\'s last stance (mind beats heart)', () => {
    const e = make();
    const action = strategicLogic(e, { playerLastStance: 'heart', enemyHpPercent: 100 });
    expect(action.type).toBe('mind');
  });

  it('bossLogic always attacks below 25%', () => {
    const e = make();
    const action = bossLogic(e, { enemyHpPercent: 10 });
    expect(action.action).toBe('attack');
  });

  it('balancedLogic returns an action', () => {
    const e = make();
    const action = balancedLogic(e);
    expect(['attack', 'defend']).toContain(action.action);
  });

  it('dispatchEnemyLogic routes to the right strategy', () => {
    const aggro = make({ logic: 'aggressive' });
    expect(dispatchEnemyLogic(aggro).action).toBe('attack');
    expect(dispatchEnemyLogic(null).type).toBeDefined(); // null → random
  });
});

describe('enemy library', () => {
  it('contains 15 enemies across all tiers', () => {
    expect(enemyLibrary.length).toBeGreaterThanOrEqual(15);
  });

  it('every enemy has an id, name, baseStats, and mapLocation', () => {
    for (const e of enemyLibrary) {
      expect(e.id).toBeTruthy();
      expect(e.name).toBeTruthy();
      expect(e.baseStats).toBeDefined();
      expect(e.mapLocation.name).toBeTruthy();
    }
  });

  it('lookupEnemy finds Disatree', () => {
    expect(lookupEnemy(Disatree_01.id)?.name).toBe('Disatree');
  });

  it('getEnemiesByMap filters correctly', () => {
    const onForest = getEnemiesByMap('northern-forest');
    expect(onForest.every(e => e.mapLocation.name === 'northern-forest')).toBe(true);
    expect(onForest.length).toBeGreaterThan(0);
  });

  it('getEnemiesByTier returns boss-tier entries', () => {
    const bosses = getEnemiesByTier('boss');
    expect(bosses.length).toBeGreaterThan(0);
    expect(bosses.every(e => e.enemyTier === 'boss')).toBe(true);
  });
});

describe('encounter library', () => {
  it('generateEncounter returns a closest-level match', () => {
    const enc = generateEncounter('northern-forest', 1);
    expect(enc).toBeDefined();
    expect(enc?.recommendedLevel).toBeLessThanOrEqual(2);
  });

  it('generateEncounter returns undefined for empty maps', () => {
    expect(generateEncounter('does-not-exist', 1)).toBeUndefined();
  });

  it('generateEncounter returns undefined when nothing fits within ±3 levels', () => {
    expect(generateEncounter('northern-forest', 99)).toBeUndefined();
  });

  it('listEncountersForMap returns one entry per enemy', () => {
    const enc = listEncountersForMap('northern-forest');
    expect(enc.length).toBeGreaterThan(0);
    enc.forEach(e => expect(e.mapName).toBe('northern-forest'));
  });

  it('listAllEncounters covers every library entry', () => {
    expect(listAllEncounters()).toHaveLength(enemyLibrary.length);
  });
});

describe('boss-tier integrity', () => {
  it('Architect of Axioms is a boss with high stats', () => {
    expect(Architect_of_Axioms.enemyTier).toBe('boss');
    expect(Architect_of_Axioms.baseStats.mind).toBeGreaterThan(7);
  });
});
