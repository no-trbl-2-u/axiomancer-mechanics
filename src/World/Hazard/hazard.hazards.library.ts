/**
 * Hazard Minigame — Hazard Card Library (v2)
 * 
 * Mobile v2 hazard set: 3 hazards tuned for no-re-cast economy.
 * Safe route: combined FORCE+ESCAPE thresholds ~19-24
 * Risk route: dual meters BOTH required ~9-12 per meter
 */

import type { HazardCard } from './hazard.types';

/**
 * Hazard card library for mobile v2.
 * Tuned thresholds based on Monte-Carlo evidence from mobile balance.sim.test.ts
 */

export const HAZARD_CARD_LIBRARY: HazardCard[] = [
  // H01 - Unstable Bridge (3 rounds, moderate difficulty)
  {
    id: 'H01',
    name: 'Unstable Bridge',
    scenario: 'An ancient rope bridge spans a deep chasm. The planks creak ominously, and several ropes have already snapped. Cross with care or push through with determination.',
    rounds: 3,
    safeRoute: {
      type: 'safe',
      combinedThresholds: [6, 7, 8], // Total: 21 combined FORCE+ESCAPE
      rewards: {
        perfect: {
          vitae: 3,
          tokens: 2,
          cardOffers: [{ cards: ['R01', 'R02', 'R03'], guaranteedRare: true, skippable: true }],
          reserveBonus: 1, // +1 VITAE per unspent non-X die
        },
        complete: {
          vitae: 2,
          tokens: 1,
          cardOffers: [{ cards: ['A11', 'A12', 'A13'], guaranteedRare: false, skippable: false }],
        },
        failure: {
          vitae: 0,
          tokens: 0,
        },
      },
      penalties: {
        roundOne: { tokens: -1 }, // Lose banked tokens
        roundTwo: { maxVitae: -5, deadCard: 'CRACK' }, // Max VITAE scar + CRACK
        roundThree: { vitae: -8, maxVitae: -5, deadCard: 'CRACK', tokens: -1, hexed: true }, // All penalties + hexed
        routePenalty: { vitae: -2 }, // Applied per failed round
      },
    },
    riskRoute: {
      type: 'risk',
      forceThresholds: [5, 5, 6], // Total: 16 force required
      escapeThresholds: [4, 5, 5], // Total: 14 escape required, BOTH needed per round
      rewards: {
        perfect: {
          vitae: 5,
          tokens: 3,
          cardOffers: [{ cards: ['R03', 'R05', 'R06'], guaranteedRare: true, skippable: true }],
          relicReward: 'hazard-relic-bridge',
          reserveBonus: 1,
        },
        complete: {
          vitae: 3,
          tokens: 2,
          cacheReward: 20,
        },
        failure: {
          vitae: 0,
          tokens: 0,
        },
      },
      penalties: {
        roundOne: { tokens: -1 },
        roundTwo: { maxVitae: -5, deadCard: 'CRACK' },
        roundThree: { vitae: -8, maxVitae: -5, deadCard: 'CRACK', tokens: -1, hexed: true },
        routePenalty: { vitae: -3 }, // Higher penalty for risk route
      },
    },
  },

  // H02 - Treacherous Ravine (3 rounds, higher difficulty)
  {
    id: 'H02',
    name: 'Treacherous Ravine',
    scenario: 'A narrow ledge winds around a cliff face above a misty ravine. Loose stones rain down from above while the path crumbles beneath your feet.',
    rounds: 3,
    safeRoute: {
      type: 'safe',
      combinedThresholds: [7, 8, 9], // Total: 24 combined FORCE+ESCAPE
      rewards: {
        perfect: {
          vitae: 4,
          tokens: 3,
          cardOffers: [{ cards: ['R01', 'R02', 'R04'], guaranteedRare: true, skippable: true }],
          reserveBonus: 1,
        },
        complete: {
          vitae: 2,
          tokens: 2,
          cardOffers: [{ cards: ['A14', 'A09', 'A06'], guaranteedRare: false, skippable: false }],
        },
        failure: {
          vitae: 0,
          tokens: 0,
        },
      },
      penalties: {
        roundOne: { tokens: -1 },
        roundTwo: { maxVitae: -5, deadCard: 'CRACK' },
        roundThree: { vitae: -8, maxVitae: -5, deadCard: 'CRACK', tokens: -1, hexed: true },
        routePenalty: { vitae: -2 },
      },
    },
    riskRoute: {
      type: 'risk',
      forceThresholds: [6, 6, 6], // Total: 18 force required
      escapeThresholds: [5, 6, 6], // Total: 17 escape required
      rewards: {
        perfect: {
          vitae: 6,
          tokens: 4,
          cardOffers: [{ cards: ['R04', 'R05', 'R06'], guaranteedRare: true, skippable: true }],
          relicReward: 'hazard-relic-ravine',
          cacheReward: 25,
          reserveBonus: 1,
        },
        complete: {
          vitae: 4,
          tokens: 3,
          cacheReward: 15,
        },
        failure: {
          vitae: 0,
          tokens: 0,
        },
      },
      penalties: {
        roundOne: { tokens: -1 },
        roundTwo: { maxVitae: -5, deadCard: 'CRACK' },
        roundThree: { vitae: -8, maxVitae: -5, deadCard: 'CRACK', tokens: -1, hexed: true },
        routePenalty: { vitae: -3 },
      },
    },
  },

  // H03 - Collapsing Tunnel (2 rounds, speed challenge)
  {
    id: 'H03',
    name: 'Collapsing Tunnel',
    scenario: 'The ancient tunnel groans and shudders. Chunks of stone fall from the ceiling as cracks spread along the walls. Time is running out.',
    rounds: 2,
    safeRoute: {
      type: 'safe',
      combinedThresholds: [9, 10], // Total: 19 combined FORCE+ESCAPE
      rewards: {
        perfect: {
          vitae: 3,
          tokens: 2,
          cardOffers: [{ cards: ['R02', 'R04', 'R06'], guaranteedRare: true, skippable: true }],
          reserveBonus: 1,
        },
        complete: {
          vitae: 2,
          tokens: 1,
          cardOffers: [{ cards: ['A05', 'A12', 'A13'], guaranteedRare: false, skippable: false }],
        },
        failure: {
          vitae: 0,
          tokens: 0,
        },
      },
      penalties: {
        roundOne: { tokens: -1 },
        roundTwo: { maxVitae: -5, deadCard: 'CRACK', tokens: -1, hexed: true }, // Shortened timeline, harsher penalties
        roundThree: { vitae: -8, maxVitae: -5, deadCard: 'CRACK', tokens: -1, hexed: true }, // Fallback (shouldn't trigger)
        routePenalty: { vitae: -3 }, // Higher penalty for speed challenge
      },
    },
    riskRoute: {
      type: 'risk',
      forceThresholds: [6, 6], // Total: 12 force required
      escapeThresholds: [6, 6], // Total: 12 escape required
      rewards: {
        perfect: {
          vitae: 5,
          tokens: 3,
          cardOffers: [{ cards: ['R01', 'R03', 'R05'], guaranteedRare: true, skippable: true }],
          relicReward: 'hazard-relic-tunnel',
          cacheReward: 30,
          reserveBonus: 1,
        },
        complete: {
          vitae: 3,
          tokens: 2,
          cacheReward: 20,
        },
        failure: {
          vitae: 0,
          tokens: 0,
        },
      },
      penalties: {
        roundOne: { tokens: -1 },
        roundTwo: { maxVitae: -5, deadCard: 'CRACK', tokens: -1, hexed: true },
        roundThree: { vitae: -8, maxVitae: -5, deadCard: 'CRACK', tokens: -1, hexed: true },
        routePenalty: { vitae: -4 }, // Highest penalty for speed risk
      },
    },
  },

  // H08 - Poisoned Spring (Phase 135 persistent: supply threshold -2)
  {
    id: 'H08',
    name: 'Poisoned Spring',
    scenario: 'A corrupted water source blocks your path. The spring runs black with toxic sludge, but you can see pure water bubbling beneath. Purify it for future travelers or force your way around.',
    rounds: 2,
    safeRoute: {
      type: 'safe',
      combinedThresholds: [8, 9], // Total: 17 combined FORCE+ESCAPE
      rewards: {
        perfect: {
          vitae: 2,
          tokens: 2,
          cardOffers: [{ cards: ['A02', 'A07', 'A10'], guaranteedRare: false, skippable: true }],
          persistenceEffect: 'purify-spring', // Phase 135: triggers world-state modification
        },
        complete: {
          vitae: 1,
          tokens: 1,
          cardOffers: [{ cards: ['A01', 'A03'], guaranteedRare: false, skippable: false }],
        },
        failure: {
          vitae: 0,
          tokens: 0,
        },
      },
      penalties: {
        roundOne: { vitae: -2 },
        roundTwo: { vitae: -4, tokens: -1 },
        roundThree: { vitae: -6, tokens: -1 },
        routePenalty: { vitae: -2 },
      },
    },
    riskRoute: {
      type: 'risk',
      forceThresholds: [5, 6], // Total: 11 force required
      escapeThresholds: [4, 5], // Total: 9 escape required
      rewards: {
        perfect: {
          vitae: 3,
          tokens: 3,
          cardOffers: [{ cards: ['R01', 'R04'], guaranteedRare: true, skippable: true }],
          cacheReward: 15,
        },
        complete: {
          vitae: 2,
          tokens: 2,
          cacheReward: 10,
        },
        failure: {
          vitae: 0,
          tokens: 0,
        },
      },
      penalties: {
        roundOne: { vitae: -3 },
        roundTwo: { vitae: -5, tokens: -1 },
        roundThree: { vitae: -7, tokens: -1 },
        routePenalty: { vitae: -3 },
      },
    },
  },

  // H12 - Riddled Bridge (Phase 135 persistent: auto-success ≤6 + route blocking)
  {
    id: 'H12',
    name: 'Riddled Bridge',
    scenario: 'A stone bridge riddled with structural damage spans a rushing river. Repair it properly for safe future passage, or risk everything on a dangerous crossing.',
    rounds: 3,
    safeRoute: {
      type: 'safe',
      combinedThresholds: [7, 8, 9], // Total: 24 combined FORCE+ESCAPE
      rewards: {
        perfect: {
          vitae: 4,
          tokens: 3,
          cardOffers: [{ cards: ['R02', 'R05', 'R06'], guaranteedRare: true, skippable: true }],
          persistenceEffect: 'repair-bridge', // Phase 135: enables auto-success for stability ≤6
        },
        complete: {
          vitae: 2,
          tokens: 2,
          cardOffers: [{ cards: ['A08', 'A11'], guaranteedRare: false, skippable: false }],
          persistenceEffect: 'repair-bridge',
        },
        failure: {
          vitae: 0,
          tokens: 0,
          persistenceEffect: 'collapse-bridge', // Phase 135: blocks route permanently
        },
      },
      penalties: {
        roundOne: { vitae: -1 },
        roundTwo: { vitae: -3, tokens: -1 },
        roundThree: { vitae: -6, maxVitae: -2, tokens: -1 },
        routePenalty: { vitae: -2 },
      },
    },
    riskRoute: {
      type: 'risk',
      forceThresholds: [6, 7, 8], // Total: 21 force required
      escapeThresholds: [5, 6, 7], // Total: 18 escape required
      rewards: {
        perfect: {
          vitae: 5,
          tokens: 4,
          cardOffers: [{ cards: ['R03', 'R07'], guaranteedRare: true, skippable: true }],
          relicReward: 'bridge-relic',
          cacheReward: 25,
          persistenceEffect: 'master-bridge',
        },
        complete: {
          vitae: 3,
          tokens: 3,
          cacheReward: 20,
          persistenceEffect: 'repair-bridge',
        },
        failure: {
          vitae: 0,
          tokens: 0,
          persistenceEffect: 'collapse-bridge',
        },
      },
      penalties: {
        roundOne: { vitae: -2 },
        roundTwo: { vitae: -4, tokens: -1 },
        roundThree: { vitae: -7, maxVitae: -3, tokens: -2 },
        routePenalty: { vitae: -3 },
      },
    },
  },

  // H15 - Dark Narrows (Phase 135 persistent: hazard removal)
  {
    id: 'H15',
    name: 'Dark Narrows',
    scenario: 'An unnatural darkness chokes this narrow passage, whispering threats and sapping strength. Cleanse the corruption to ensure safe future travel, or endure its malice.',
    rounds: 2,
    safeRoute: {
      type: 'safe',
      combinedThresholds: [10, 11], // Total: 21 combined FORCE+ESCAPE
      rewards: {
        perfect: {
          vitae: 3,
          tokens: 3,
          cardOffers: [{ cards: ['R01', 'R08'], guaranteedRare: true, skippable: true }],
          persistenceEffect: 'cleanse-narrows', // Phase 135: removes hazard permanently
        },
        complete: {
          vitae: 2,
          tokens: 2,
          cardOffers: [{ cards: ['A04', 'A09'], guaranteedRare: false, skippable: false }],
        },
        failure: {
          vitae: 0,
          tokens: 0,
        },
      },
      penalties: {
        roundOne: { vitae: -3, maxVitae: -1 },
        roundTwo: { vitae: -5, maxVitae: -2, tokens: -1, hexed: true },
        roundThree: { vitae: -8, maxVitae: -3, tokens: -2, hexed: true },
        routePenalty: { vitae: -3 },
      },
    },
    riskRoute: {
      type: 'risk',
      forceThresholds: [7, 8], // Total: 15 force required
      escapeThresholds: [6, 7], // Total: 13 escape required
      rewards: {
        perfect: {
          vitae: 4,
          tokens: 4,
          cardOffers: [{ cards: ['R04', 'R09'], guaranteedRare: true, skippable: true }],
          relicReward: 'darkness-relic',
          cacheReward: 30,
        },
        complete: {
          vitae: 2,
          tokens: 3,
          cacheReward: 20,
        },
        failure: {
          vitae: 0,
          tokens: 0,
        },
      },
      penalties: {
        roundOne: { vitae: -4, maxVitae: -2 },
        roundTwo: { vitae: -7, maxVitae: -3, tokens: -1, hexed: true },
        roundThree: { vitae: -10, maxVitae: -4, tokens: -2, hexed: true },
        routePenalty: { vitae: -4 },
      },
    },
  },
];

/**
 * Get a hazard by ID from the library
 */
export function getHazardCard(id: string): HazardCard | null {
  return HAZARD_CARD_LIBRARY.find(hazard => hazard.id === id) || null;
}

// ── Phase 135 Persistence Effects ─────────────────────────────────────────

import { MapState, NodeId, HazardModifierEntry } from '../types';
import { recordHazardOutcome } from '../world.reducer';

/**
 * H08 - Poisoned Spring bottom route success effect.
 * Records a supply threshold -2 modifier for future hazards at this node.
 */
export function purifySpringEffect(mapState: MapState, nodeId: NodeId): MapState {
  const outcome = {
    nodeId,
    hazardId: 'H08',
    outcome: 'modified' as const,
    appliedDate: new Date().toISOString(),
    modifierEffects: [{
      hazardType: 'supply' as const,
      thresholdAdjustment: -2,
      description: 'Purified spring makes supply hazards easier (-2 threshold)'
    } as HazardModifierEntry]
  };
  return recordHazardOutcome(mapState, outcome);
}

/**
 * H12 - Riddled Bridge repair effect.
 * Records a stability auto-success modifier for thresholds ≤6.
 */
export function bridgeRepairEffect(mapState: MapState, nodeId: NodeId): MapState {
  const outcome = {
    nodeId,
    hazardId: 'H12',
    outcome: 'modified' as const,
    appliedDate: new Date().toISOString(),
    modifierEffects: [{
      hazardType: 'stability' as const,
      thresholdAdjustment: -6, // Effectively auto-succeeds thresholds ≤6
      description: 'Repaired bridge enables auto-success for stability challenges ≤6'
    } as HazardModifierEntry]
  };
  return recordHazardOutcome(mapState, outcome);
}

/**
 * H12 - Riddled Bridge collapse effect.
 * Blocks the route permanently due to bridge destruction.
 */
export function bridgeCollapseEffect(mapState: MapState, nodeId: NodeId): MapState {
  const outcome = {
    nodeId,
    hazardId: 'H12',
    outcome: 'blocked' as const,
    appliedDate: new Date().toISOString(),
  };
  
  // Also add to blocked routes - we need to know the connected nodes
  // For now, we'll record the outcome and let the route blocking be handled
  // by the integration layer that knows the map topology
  return recordHazardOutcome(mapState, outcome);
}

/**
 * H15 - Dark Narrows bottom route success effect.
 * Permanently removes the hazard for future encounters.
 */
export function clearNarrowsEffect(mapState: MapState, nodeId: NodeId): MapState {
  const outcome = {
    nodeId,
    hazardId: 'H15',
    outcome: 'cleared' as const,
    appliedDate: new Date().toISOString(),
  };
  return recordHazardOutcome(mapState, outcome);
}

/**
 * Get a random hazard card from the library
 */
export function getRandomHazardCard(): HazardCard {
  const randomIndex = Math.floor(Math.random() * HAZARD_CARD_LIBRARY.length);
  return HAZARD_CARD_LIBRARY[randomIndex];
}

/**
 * Get a hazard by difficulty (rounds count as rough difficulty)
 */
export function getHazardsByRounds(rounds: number): HazardCard[] {
  return HAZARD_CARD_LIBRARY.filter(hazard => hazard.rounds === rounds);
}

/**
 * Validate the hazard library for consistency
 */
export function validateHazardLibrary(): boolean {
  const allIds = HAZARD_CARD_LIBRARY.map(hazard => hazard.id);
  const uniqueIds = new Set(allIds);
  
  if (allIds.length !== uniqueIds.size) {
    console.error('Hazard library has duplicate IDs');
    return false;
  }
  
  // Check that all hazards have required properties
  for (const hazard of HAZARD_CARD_LIBRARY) {
    if (!hazard.id || !hazard.name || !hazard.scenario || !hazard.rounds) {
      console.error('Hazard missing required properties:', hazard.id);
      return false;
    }
    
    if (!hazard.safeRoute || !hazard.riskRoute) {
      console.error('Hazard missing safe/risk routes:', hazard.id);
      return false;
    }
    
    // Validate threshold arrays match rounds count
    if (hazard.safeRoute.combinedThresholds.length !== hazard.rounds) {
      console.error('Safe route threshold count mismatch:', hazard.id);
      return false;
    }
    
    if (hazard.riskRoute.forceThresholds.length !== hazard.rounds ||
        hazard.riskRoute.escapeThresholds.length !== hazard.rounds) {
      console.error('Risk route threshold count mismatch:', hazard.id);
      return false;
    }
  }
  
  return true;
}

/**
 * Get total safe route difficulty (sum of thresholds) for balance analysis
 */
export function getSafeRouteDifficulty(hazardId: string): number {
  const hazard = getHazardCard(hazardId);
  if (!hazard) return 0;
  
  return hazard.safeRoute.combinedThresholds.reduce((sum, threshold) => sum + threshold, 0);
}

/**
 * Get total risk route difficulty (sum of both force and escape thresholds)
 */
export function getRiskRouteDifficulty(hazardId: string): number {
  const hazard = getHazardCard(hazardId);
  if (!hazard) return 0;
  
  const forceTotal = hazard.riskRoute.forceThresholds.reduce((sum, threshold) => sum + threshold, 0);
  const escapeTotal = hazard.riskRoute.escapeThresholds.reduce((sum, threshold) => sum + threshold, 0);
  
  return forceTotal + escapeTotal;
}