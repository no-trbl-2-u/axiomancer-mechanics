import { describe, it, expect } from 'vitest';
import {
  createNewGameState, gameReducer, processNode,
} from './game.reducer';
import { createEnemy } from '../Enemy';

const initial = () => createNewGameState();

const enemy = createEnemy({
  id: 'e1', name: 'Foe', description: '', level: 1,
  baseStats: { heart: 1, body: 1, mind: 1 },
  mapLocation: { name: 'fishing-village' as never },
  logic: 'random',
});

describe('gameReducer', () => {
  it('returns input for unknown actions', () => {
    const s = initial();
    expect(gameReducer(s, { type: 'UNKNOWN' as never })).toBe(s);
  });

  it('NEW_GAME returns a fresh state', () => {
    const s = initial();
    const after = gameReducer(s, { type: 'NEW_GAME' });
    expect(after.combatState).toBeNull();
    expect(after.player.level).toBe(1);
  });

  it('START_COMBAT initializes a combatState', () => {
    const s = gameReducer(initial(), { type: 'START_COMBAT', enemy });
    expect(s.combatState).not.toBeNull();
    expect(s.combatState?.enemy.id).toBe('e1');
  });

  it('END_COMBAT promotes player from combat back and clears combatState', () => {
    let s = gameReducer(initial(), { type: 'START_COMBAT', enemy });
    s = gameReducer(s, { type: 'END_COMBAT' });
    expect(s.combatState).toBeNull();
  });

  it('END_COMBAT is a no-op when no combat is active', () => {
    const s = initial();
    expect(gameReducer(s, { type: 'END_COMBAT' })).toBe(s);
  });

  it('ADD_ITEM and REMOVE_ITEM update the player\'s inventory', () => {
    const item = { id: 'rock', name: 'Rock', description: '', category: 'material', quantity: 1 } as const;
    let s = gameReducer(initial(), { type: 'ADD_ITEM', item });
    expect(s.player.inventory).toHaveLength(1);
    s = gameReducer(s, { type: 'REMOVE_ITEM', itemId: 'rock' });
    expect(s.player.inventory).toHaveLength(0);
  });

  it('SET_PLAYER replaces the player', () => {
    const s = initial();
    const replaced = { ...s.player, name: 'Replacement' };
    const after = gameReducer(s, { type: 'SET_PLAYER', player: replaced });
    expect(after.player.name).toBe('Replacement');
  });
});

describe('processNode', () => {
  it('returns an inaccessible event when the node is not unlocked', () => {
    const s = initial();
    const r = processNode(s, { id: 'definitely-not-a-node' });
    expect(r.state).toBe(s);
    expect(r.events.some(e => e.includes('not yet accessible'))).toBe(true);
  });

  it('returns updated state and events when the node is accessible', () => {
    const s = initial();
    const target = s.world.currentMap.availableNodes[0];
    expect(target).toBeDefined();
    const r = processNode(s, { id: target });
    expect(Array.isArray(r.events)).toBe(true);
  });
});
