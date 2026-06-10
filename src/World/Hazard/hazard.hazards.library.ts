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
];

/**
 * Get a hazard by ID from the library
 */
export function getHazardCard(id: string): HazardCard | null {
  return HAZARD_CARD_LIBRARY.find(hazard => hazard.id === id) || null;
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