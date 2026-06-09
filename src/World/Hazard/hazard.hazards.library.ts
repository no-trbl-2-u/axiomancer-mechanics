/**
 * Hazard Minigame — Hazard Card Library
 * 
 * Complete library of 15 hazard cards (H01-H15).
 * Each hazard defines the scenario, routes, thresholds, and rewards/penalties.
 */

import type { HazardCard } from './hazard.types';

/**
 * Minimal hazard card library for v0.
 * Includes 5 representative hazards to establish patterns.
 */

export const HAZARD_CARD_LIBRARY: HazardCard[] = [
  // H01 - Cracked Cliff Path (Stability/Force, 3 rounds)
  {
    id: 'H01',
    name: 'Cracked Cliff Path',
    scenario: 'The mountain path has deteriorated, with loose rocks threatening to give way. Navigate carefully or power through the obstacles.',
    rounds: 3,
    topRoute: {
      progressType: 'stability',
      roundThresholds: [2, 3, 4],
      reward: {
        vitae: 1,
        supplyTokens: 1,
      },
      failurePenalty: {
        vitae: -1,
      },
    },
    bottomRoute: {
      progressType: 'force',
      roundThresholds: [3, 4, 6],
      reward: {
        vitae: 2,
        items: ['climbing-gear'],
      },
      failurePenalty: {
        vitae: -2,
      },
      finalRoundFailurePenalty: {
        vitae: -3,
      },
    },
  },
  
  // H02 - River Crossing (Escape/Supply, 4 rounds)
  {
    id: 'H02',
    name: 'Raging River',
    scenario: 'The bridge has washed out, leaving a dangerous ford. Cross quickly or gather resources for a safer passage.',
    rounds: 4,
    topRoute: {
      progressType: 'escape',
      roundThresholds: [2, 3, 3, 5],
      reward: {
        vitae: 0,
        supplyTokens: 2,
      },
      failurePenalty: {
        supplyTokens: -1,
      },
    },
    bottomRoute: {
      progressType: 'supply',
      roundThresholds: [2, 3, 4, 4],
      reward: {
        vitae: 3,
        items: ['rope', 'waterproof-pack'],
      },
      failurePenalty: {
        vitae: -1,
      },
    },
  },
  
  // H03 - Cave System (Stability/Escape, 5 rounds)
  {
    id: 'H03',
    name: 'Unstable Cavern',
    scenario: 'The cave system shows signs of recent collapse. Move carefully to avoid cave-ins or find a quick exit.',
    rounds: 5,
    topRoute: {
      progressType: 'stability',
      roundThresholds: [1, 2, 3, 3, 4],
      reward: {
        items: ['torch', 'cave-map'],
      },
      failurePenalty: {
        vitae: -1,
      },
    },
    bottomRoute: {
      progressType: 'escape',
      roundThresholds: [2, 3, 4, 4, 6],
      reward: {
        vitae: 1,
        supplyTokens: 3,
      },
      failurePenalty: {
        vitae: -2,
        additionalX: 1,
      },
    },
  },
  
  // H04 - Supply Cache (Supply/Force, 3 rounds)
  {
    id: 'H04',
    name: 'Abandoned Supply Cache',
    scenario: 'A sealed supply cache blocks your path. Carefully extract valuable resources or break it open quickly.',
    rounds: 3,
    topRoute: {
      progressType: 'supply',
      roundThresholds: [3, 4, 5],
      reward: {
        supplyTokens: 4,
        items: ['preserved-food'],
      },
    },
    bottomRoute: {
      progressType: 'force',
      roundThresholds: [2, 3, 4],
      reward: {
        supplyTokens: 2,
        vitae: 1,
      },
      failurePenalty: {
        supplyTokens: -2,
      },
    },
  },
  
  // H05 - Storm Approach (Escape/Stability, 4 rounds)
  {
    id: 'H05',
    name: 'Approaching Storm',
    scenario: 'Dark clouds gather overhead with lightning in the distance. Find shelter quickly or weather the storm in place.',
    rounds: 4,
    topRoute: {
      progressType: 'escape',
      roundThresholds: [3, 4, 4, 6],
      reward: {
        vitae: 2,
      },
      failurePenalty: {
        vitae: -2,
      },
      finalRoundFailurePenalty: {
        vitae: -4,
      },
    },
    bottomRoute: {
      progressType: 'stability',
      roundThresholds: [2, 3, 3, 4],
      reward: {
        vitae: 1,
        supplyTokens: 1,
        items: ['storm-cloak'],
      },
      failurePenalty: {
        vitae: -1,
      },
    },
  },
];

/**
 * Get hazard card by ID.
 */
export function getHazardCard(hazardId: string): HazardCard | null {
  return HAZARD_CARD_LIBRARY.find(card => card.id === hazardId) || null;
}

/**
 * Get random hazard card (for testing).
 */
export function getRandomHazardCard(rng: () => number): HazardCard {
  const index = Math.floor(rng() * HAZARD_CARD_LIBRARY.length);
  return HAZARD_CARD_LIBRARY[index];
}

/**
 * Validate the hazard card library.
 */
export function validateHazardLibrary(): string[] {
  const errors: string[] = [];
  
  // Check for duplicate IDs
  const seenIds = new Set<string>();
  for (const card of HAZARD_CARD_LIBRARY) {
    if (seenIds.has(card.id)) {
      errors.push(`Duplicate hazard ID: ${card.id}`);
    }
    seenIds.add(card.id);
  }
  
  // Validate each card
  for (const card of HAZARD_CARD_LIBRARY) {
    if (card.rounds < 3 || card.rounds > 5) {
      errors.push(`${card.id}: Invalid round count ${card.rounds} (must be 3-5)`);
    }
    
    if (card.topRoute.roundThresholds.length !== card.rounds) {
      errors.push(`${card.id}: Top route thresholds length mismatch`);
    }
    
    if (card.bottomRoute.roundThresholds.length !== card.rounds) {
      errors.push(`${card.id}: Bottom route thresholds length mismatch`);
    }
    
    // Check progression (thresholds should generally increase or stay stable)
    const topThresholds = card.topRoute.roundThresholds;
    const bottomThresholds = card.bottomRoute.roundThresholds;
    
    for (let i = 1; i < topThresholds.length; i++) {
      if (topThresholds[i] < topThresholds[i - 1] - 1) {
        errors.push(`${card.id}: Top route threshold drops too sharply at round ${i + 1}`);
      }
    }
    
    for (let i = 1; i < bottomThresholds.length; i++) {
      if (bottomThresholds[i] < bottomThresholds[i - 1] - 1) {
        errors.push(`${card.id}: Bottom route threshold drops too sharply at round ${i + 1}`);
      }
    }
  }
  
  return errors;
}