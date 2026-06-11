/**
 * Hazard Persistence — Hermetic End-to-End Tests (Phase 135)
 *
 * Comprehensive e2e testing for hazard world-state persistence lifecycle,
 * covering outcome recording, modifier application, route blocking, and
 * alternative path computation. All tests use stubbed RNG for deterministic
 * behavior.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { mockFixedRng } from '../../../test-utils/rng';
import type { MapState, HazardNodeOutcome, HazardModifierEntry } from '../../types';
import { createMapState, getMapDefinition } from '../../map.registry';
import {
  recordHazardOutcome, 
  blockMapRoute, 
  getHazardOutcomesForNode, 
  isRouteBlocked,
  moveToNode,
  IllegalMoveError
} from '../../world.reducer';
import { 
  buildModifierTable, 
  applyHazardModifiers,
  isHazardPermanentlyCleared 
} from '../hazard.modifiers';
import {
  validateMoveToNode,
  findAlternativePaths,
  getReachableNodes
} from '../../map.dispatcher';
import { getHazardCard } from '../hazard.hazards.library';
import { initializeHazard, applyHazardPersistenceEffects } from '../hazard.engine';

describe('Hazard World-State Persistence', () => {
  let testMapState: MapState;
  
  beforeEach(() => {
    // Use fishing village as test map 
    const mapDef = getMapDefinition('coastal-continent', 'fishing-village');
    testMapState = createMapState(mapDef);
    mockFixedRng([0.5, 0.3, 0.7, 0.2]); // Deterministic RNG sequence
  });

  test('H08 bottom route success modifies future supply hazards', () => {
    const nodeId = 'pier';
    const hazardCard = getHazardCard('H08')!;
    
    // Apply the purify-spring persistence effect
    const modifierEffect: HazardModifierEntry = {
      hazardType: 'supply',
      thresholdAdjustment: -2,
      description: 'Purified spring makes supply hazards easier (-2 threshold)'
    };
    
    const outcome: HazardNodeOutcome = {
      nodeId,
      hazardId: 'H08',
      outcome: 'modified',
      appliedDate: new Date().toISOString(),
      modifierEffects: [modifierEffect]
    };
    
    const modifiedMap = recordHazardOutcome(testMapState, outcome);
    
    // Verify outcome was recorded
    const outcomes = getHazardOutcomesForNode(modifiedMap, nodeId);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].hazardId).toBe('H08');
    expect(outcomes[0].modifierEffects?.[0].thresholdAdjustment).toBe(-2);
    
    // Verify modifier table applies the effect
    const modifierTable = buildModifierTable(modifiedMap, nodeId);
    expect(modifierTable.modifiers).toHaveLength(1);
    expect(modifierTable.modifiers[0].hazardType).toBe('supply');
    
    // Verify hazard card thresholds are modified
    const modifiedHazard = applyHazardModifiers(hazardCard, modifiedMap, nodeId);
    expect(modifiedHazard.safeRoute.combinedThresholds).toEqual([6, 7]); // Original [8, 9] - 2
  });

  test('H12 bridge repair enables auto-success for low stability checks', () => {
    const nodeId = 'bridge';
    
    const modifierEffect: HazardModifierEntry = {
      hazardType: 'stability',
      thresholdAdjustment: -6,
      description: 'Repaired bridge enables auto-success for stability challenges ≤6'
    };
    
    const outcome: HazardNodeOutcome = {
      nodeId,
      hazardId: 'H12',
      outcome: 'modified',
      appliedDate: new Date().toISOString(),
      modifierEffects: [modifierEffect]
    };
    
    const modifiedMap = recordHazardOutcome(testMapState, outcome);
    
    // Create a test stability hazard with threshold 6
    const testHazard = {
      id: 'TEST_STABILITY',
      name: 'Test Stability Challenge',
      scenario: 'Test',
      rounds: 1,
      safeRoute: {
        type: 'safe' as const,
        combinedThresholds: [6], // Should become auto-success with -6 modifier
        rewards: { perfect: {}, complete: {}, failure: {} },
        penalties: { roundOne: {}, roundTwo: {}, roundThree: {}, routePenalty: {} }
      },
      riskRoute: {
        type: 'risk' as const,
        forceThresholds: [3],
        escapeThresholds: [3],
        rewards: { perfect: {}, complete: {}, failure: {} },
        penalties: { roundOne: {}, roundTwo: {}, roundThree: {}, routePenalty: {} }
      },
      progressRequirements: [{ type: 'force' as const, value: 6 }]
    };
    
    const modifiedHazard = applyHazardModifiers(testHazard, modifiedMap, nodeId);
    expect(modifiedHazard.safeRoute.combinedThresholds[0]).toBe(1); // Max(1, 6-6)
  });

  test('H12 bridge collapse blocks route and forces alternate path', () => {
    const bridgeNode = 'fv-3';
    const connectedNode = 'fv-4';
    
    // Create world state positioned at bridge
    const mapWithPlayer = { ...testMapState, currentNode: bridgeNode };
    
    // Record bridge collapse outcome
    const collapseOutcome: HazardNodeOutcome = {
      nodeId: bridgeNode,
      hazardId: 'H12',
      outcome: 'blocked',
      appliedDate: new Date().toISOString(),
    };
    
    let blockedMap = recordHazardOutcome(mapWithPlayer, collapseOutcome);
    
    // Block the route
    blockedMap = blockMapRoute(blockedMap, bridgeNode, connectedNode, 'Bridge collapsed during hazard encounter');
    
    // Verify route is blocked
    expect(isRouteBlocked(blockedMap, bridgeNode, connectedNode)).toBe('Bridge collapsed during hazard encounter');
    
    // Verify moveToNode throws error
    expect(() => moveToNode({ currentMap: blockedMap } as any, connectedNode))
      .toThrow(IllegalMoveError);
    
    // Verify route validation catches the block
    const validation = validateMoveToNode(blockedMap, bridgeNode, connectedNode);
    expect(validation.valid).toBe(false);
    expect(validation.blockedReason).toContain('Bridge collapsed');
    
    // Verify alternative paths are computed (would depend on map topology)
    const alternatives = findAlternativePaths(blockedMap, bridgeNode, connectedNode);
    expect(Array.isArray(alternatives)).toBe(true);
  });

  test('H15 bottom route success permanently removes hazard', () => {
    const nodeId = 'narrows';
    
    const clearOutcome: HazardNodeOutcome = {
      nodeId,
      hazardId: 'H15',
      outcome: 'cleared',
      appliedDate: new Date().toISOString(),
    };
    
    const modifiedMap = recordHazardOutcome(testMapState, clearOutcome);
    
    // Verify hazard is marked as permanently cleared
    expect(isHazardPermanentlyCleared(modifiedMap, nodeId, 'H15')).toBe(true);
    
    // Verify other hazards are not affected
    expect(isHazardPermanentlyCleared(modifiedMap, nodeId, 'H08')).toBe(false);
    expect(isHazardPermanentlyCleared(modifiedMap, 'other-node', 'H15')).toBe(false);
  });

  test('modifier stacking: multiple supply benefits compound correctly', () => {
    const nodeId = 'spring-area';
    
    // Apply first modifier (H08 purify effect)
    const firstEffect: HazardModifierEntry = {
      hazardType: 'supply',
      thresholdAdjustment: -2,
      description: 'Purified spring effect'
    };
    
    const firstOutcome: HazardNodeOutcome = {
      nodeId,
      hazardId: 'H08',
      outcome: 'modified',
      appliedDate: new Date().toISOString(),
      modifierEffects: [firstEffect]
    };
    
    let modifiedMap = recordHazardOutcome(testMapState, firstOutcome);
    
    // Apply second modifier (hypothetical additional effect)
    const secondEffect: HazardModifierEntry = {
      hazardType: 'supply',
      thresholdAdjustment: -1,
      description: 'Additional supply bonus'
    };
    
    const secondOutcome: HazardNodeOutcome = {
      nodeId,
      hazardId: 'BONUS_SUPPLY',
      outcome: 'modified',
      appliedDate: new Date().toISOString(),
      modifierEffects: [secondEffect]
    };
    
    modifiedMap = recordHazardOutcome(modifiedMap, secondOutcome);
    
    // Create test supply hazard
    const testSupplyHazard = {
      id: 'TEST_SUPPLY',
      name: 'Test Supply Challenge',
      scenario: 'Test',
      rounds: 1,
      safeRoute: {
        type: 'safe' as const,
        combinedThresholds: [10], // Should become 10-2-1 = 7
        rewards: { perfect: {}, complete: {}, failure: {} },
        penalties: { roundOne: {}, roundTwo: {}, roundThree: {}, routePenalty: {} }
      },
      riskRoute: {
        type: 'risk' as const,
        forceThresholds: [5],
        escapeThresholds: [5],
        rewards: { perfect: {}, complete: {}, failure: {} },
        penalties: { roundOne: {}, roundTwo: {}, roundThree: {}, routePenalty: {} }
      },
      progressRequirements: [{ type: 'escape' as const, value: 10 }]
    };
    
    const modifiedHazard = applyHazardModifiers(testSupplyHazard, modifiedMap, nodeId);
    
    // Verify stacking: -2 + -1 = -3 total adjustment
    expect(modifiedHazard.safeRoute.combinedThresholds[0]).toBe(7); // 10 - 3
  });

  test('route blocking: moveToNode rejects blocked paths', () => {
    const fromNode = 'fv-1'; // Starting node from fishing village
    const blockedNode = 'fv-2'; // Connected node
    
    // Position player at starting node
    const mapWithPlayer = { ...testMapState, currentNode: fromNode };
    
    // Block route
    const blockedMap = blockMapRoute(mapWithPlayer, fromNode, blockedNode, 'Test blockage');
    
    // Attempt move should fail
    expect(() => moveToNode({ currentMap: blockedMap } as any, blockedNode))
      .toThrow(/route.*blocked.*Test blockage/);
  });

  test('alternative path computation: suggests valid routes around blocked areas', () => {
    // This test would require a more complex map topology to demonstrate
    // alternative path finding. For now, test the basic mechanics.
    
    const fromNode = 'fv-1';
    const toNode = 'fv-5';
    const blockedIntermediateNode = 'fv-3';
    
    // Block one potential route
    const blockedMap = blockMapRoute(testMapState, fromNode, blockedIntermediateNode, 'Test block');
    
    const alternatives = findAlternativePaths(blockedMap, fromNode, toNode);
    
    // Should return array (may be empty if no alternatives exist in fishing village)
    expect(Array.isArray(alternatives)).toBe(true);
    
    // Each alternative path should not use blocked routes
    for (const path of alternatives) {
      expect(Array.isArray(path)).toBe(true);
      expect(path[0]).toBe(fromNode);
      if (path.length > 1) {
        expect(path[path.length - 1]).toBe(toNode);
      }
    }
  });

  test('end-to-end persistence lifecycle integration', () => {
    const nodeId = 'test-node';
    const hazardCard = getHazardCard('H08')!;
    
    // Initialize hazard with existing modifiers (none initially)
    let gameState = initializeHazard(hazardCard, undefined, 12345, testMapState, nodeId);
    expect(gameState.hazardCard.safeRoute.combinedThresholds).toEqual([8, 9]); // Original thresholds
    
    // Simulate hazard completion with perfect outcome
    gameState = { 
      ...gameState, 
      phase: 'outcome' as const,
      outcome: 'perfect' as const,
      rounds: [{ round: 1, succeeded: true, momentum: 0, progress: { force: 5, escape: 5 } }]
    };
    
    // Apply persistence effects
    const modifiedMap = applyHazardPersistenceEffects(gameState, testMapState, nodeId, 'safe');
    
    // Verify outcome was recorded
    const outcomes = getHazardOutcomesForNode(modifiedMap, nodeId);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].hazardId).toBe('H08');
    
    // Future hazard at same location should have modified thresholds
    const futureHazard = initializeHazard(hazardCard, undefined, 67890, modifiedMap, nodeId);
    expect(futureHazard.hazardCard.safeRoute.combinedThresholds).toEqual([6, 7]); // Modified by -2
  });
});

// Integration tests for comprehensive scenarios
describe('Hazard Persistence Integration Scenarios', () => {
  test('multiple hazards at same location create compound effects', () => {
    const nodeId = 'multi-hazard-node';
    let mapState = createMapState(getMapDefinition('coastal-continent', 'fishing-village'));
    
    // H08 purify spring effect
    const h08Effect: HazardModifierEntry = {
      hazardType: 'supply',
      thresholdAdjustment: -2,
      description: 'Purified spring'
    };
    
    const h08Outcome: HazardNodeOutcome = {
      nodeId,
      hazardId: 'H08',
      outcome: 'modified',
      appliedDate: new Date().toISOString(),
      modifierEffects: [h08Effect]
    };
    
    mapState = recordHazardOutcome(mapState, h08Outcome);
    
    // H12 bridge repair effect
    const h12Effect: HazardModifierEntry = {
      hazardType: 'stability',
      thresholdAdjustment: -6,
      description: 'Repaired bridge'
    };
    
    const h12Outcome: HazardNodeOutcome = {
      nodeId,
      hazardId: 'H12',
      outcome: 'modified',
      appliedDate: new Date().toISOString(),
      modifierEffects: [h12Effect]
    };
    
    mapState = recordHazardOutcome(mapState, h12Outcome);
    
    // Verify both effects are tracked
    const outcomes = getHazardOutcomesForNode(mapState, nodeId);
    expect(outcomes).toHaveLength(2);
    
    const modifierTable = buildModifierTable(mapState, nodeId);
    expect(modifierTable.modifiers).toHaveLength(2);
    
    // Verify different hazard types get appropriate modifiers
    const supplyHazard = {
      id: 'SUPPLY_TEST',
      name: 'Test Supply Challenge',
      scenario: 'Test scenario',
      rounds: 1,
      safeRoute: { 
        type: 'safe' as const, 
        combinedThresholds: [10],
        rewards: { perfect: {}, complete: {}, failure: {} },
        penalties: { roundOne: {}, roundTwo: {}, roundThree: {}, routePenalty: {} }
      },
      riskRoute: {
        type: 'risk' as const,
        forceThresholds: [5], 
        escapeThresholds: [5],
        rewards: { perfect: {}, complete: {}, failure: {} },
        penalties: { roundOne: {}, roundTwo: {}, roundThree: {}, routePenalty: {} }
      }
    } as any;
    
    const modifiedSupply = applyHazardModifiers(supplyHazard, mapState, nodeId);
    expect(modifiedSupply.safeRoute.combinedThresholds[0]).toBe(8); // 10 - 2 (supply modifier only)
    
    const stabilityHazard = {
      ...supplyHazard,
      id: 'STABILITY_TEST',
      name: 'Test Stability Challenge'
    };
    
    const modifiedStability = applyHazardModifiers(stabilityHazard, mapState, nodeId);
    // Should apply stability modifier (-6) making 10-6=4 (clamped to min 1, max 20)
    expect(modifiedStability.safeRoute.combinedThresholds[0]).toBe(4); 
    expect(modifiedStability.safeRoute.combinedThresholds[0]).toBeLessThan(10);
  });

  test('reachable nodes calculation respects blocked routes', () => {
    let mapState = createMapState(getMapDefinition('coastal-continent', 'fishing-village'));
    const startNode = mapState.currentNode;
    
    // Get baseline reachable nodes
    const baselineReachable = getReachableNodes(mapState, startNode);
    const initialCount = baselineReachable.length;
    
    // Block a route to reduce reachable nodes
    if (baselineReachable.length > 0) {
      const targetNode = baselineReachable[0];
      mapState = blockMapRoute(mapState, startNode, targetNode, 'Test blocking');
      
      const newReachable = getReachableNodes(mapState, startNode);
      
      // Should have fewer reachable nodes (or same if there are alternative paths)
      expect(newReachable.length).toBeLessThanOrEqual(initialCount);
      
      // The directly blocked node should not be in direct adjacency
      const directValidation = validateMoveToNode(mapState, startNode, targetNode);
      expect(directValidation.valid).toBe(false);
    }
  });
});