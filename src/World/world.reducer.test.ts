import { describe, it, expect } from 'vitest';
import {
  completeMap, unlockMap, completeNode, unlockNode, completeUniqueEvent,
  changeMap, changeContinent, moveToNode, moveToNodeWithEffects,
} from './world.reducer';
import { createStartingWorld } from './index';
import { createCharacter } from '../Character';

const world = () => createStartingWorld();

describe('completeMap', () => {
  it('adds to completedMaps', () => {
    const w = completeMap(world(), 'fishing-village');
    expect(w.currentContinent.completedMaps).toContain('fishing-village');
  });
  it('idempotent', () => {
    const w1 = completeMap(world(), 'fishing-village');
    const w2 = completeMap(w1, 'fishing-village');
    expect(w2.currentContinent.completedMaps.filter(m => m === 'fishing-village')).toHaveLength(1);
  });
});

describe('unlockMap', () => {
  it('moves from locked to available', () => {
    // 'northern-forest' starts in both availableMaps and lockedMaps per createStartingWorld
    // Use a map that's locked but not available
    const w0 = world();
    // Manually set up a locked-only map for testing
    const w1 = {
      ...w0,
      currentContinent: {
        ...w0.currentContinent,
        availableMaps: ['fishing-village' as const],
        lockedMaps: ['northern-forest' as const],
      },
    };
    const w = unlockMap(w1, 'northern-forest');
    expect(w.currentContinent.lockedMaps).not.toContain('northern-forest');
    expect(w.currentContinent.availableMaps).toContain('northern-forest');
  });
});

describe('completeNode', () => {
  it('adds to completedNodes', () => {
    const w = completeNode(world(), 'fv-2');
    expect(w.currentMap.completedNodes).toContain('fv-2');
  });
});

describe('unlockNode', () => {
  it('moves from locked to available', () => {
    const w = unlockNode(world(), 'fv-3');
    expect(w.currentMap.lockedNodes).not.toContain('fv-3');
    expect(w.currentMap.availableNodes).toContain('fv-3');
  });
});

describe('changeMap', () => {
  it('replaces currentMap', () => {
    const w = world();
    const newMap = { ...w.currentMap, name: 'northern-forest' as const };
    expect(changeMap(w, newMap).currentMap.name).toBe('northern-forest');
  });
});

describe('changeContinent', () => {
  it('returns state unchanged when continent not found', () => {
    const w = world();
    expect(changeContinent(w, 'northern-continent').currentContinent.name)
      .toBe(w.currentContinent.name);
  });
});

describe('completeUniqueEvent', () => {
  it('marks the matching event as completed', () => {
    const w = world();
    const withEvents = {
      ...w,
      currentMap: {
        ...w.currentMap,
        uniqueEvents: [
          { id: 'evt-1', completed: false } as never,
        ],
      },
    };
    const after = completeUniqueEvent(withEvents, 'evt-1');
    expect((after.currentMap.uniqueEvents[0] as { completed: boolean }).completed).toBe(true);
  });
});

describe('moveToNode (legacy stub)', () => {
  it('returns state unchanged', () => {
    const w = world();
    expect(moveToNode(w, 'fv-2')).toBe(w);
  });
});

describe('moveToNodeWithEffects', () => {
  const player = () => createCharacter({
    name: 'Hero', level: 1,
    baseStats: { heart: 2, body: 2, mind: 2 },
  });

  it('no-ops when target node is not available', () => {
    const result = moveToNodeWithEffects(world(), 'unknown-node', player());
    expect(result.tick).toBeNull();
  });

  it('ticks effects when moving to an available node', () => {
    const w = world();
    expect(w.currentMap.availableNodes.length).toBeGreaterThan(0);
    const result = moveToNodeWithEffects(w, w.currentMap.availableNodes[0], player());
    expect(result.tick).toBeDefined();
    expect(result.tick?.player).toBeDefined();
  });
});
