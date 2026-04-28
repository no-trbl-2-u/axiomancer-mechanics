import { describe, it, expect } from 'vitest';
import { completeMap, unlockMap, completeNode, unlockNode, completeUniqueEvent } from './world.reducer';
import { createStartingWorld } from './index';

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
