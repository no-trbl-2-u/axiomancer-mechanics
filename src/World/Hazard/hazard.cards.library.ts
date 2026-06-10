/**
 * Hazard Minigame — Action Card Library (v2)
 * 
 * Mobile v2 card set: 14 starter cards + 6 reward-pool cards + CRACK dead card.
 * Cards have color identity with force/escape stats and single-die powering.
 */

import type { HazardActionCard } from './hazard.types';

/**
 * All action cards available in the hazard minigame v2.
 * Ported from mobile state/hazard/content.ts with exact stats, weights, and flavor.
 */

// STARTER CARDS (14 cards) - Basic deck for every hazard
const STARTER_CARDS: HazardActionCard[] = [
  // Red cards (high FORCE)
  {
    id: 'A01',
    name: 'Strike',
    flavor: 'Direct approach. Hit hard, hit fast.',
    color: 'red',
    rarity: 'common',
    class: 'direct-progress',
    forceValue: 3,
    escapeValue: 1,
    poweredForceValue: 6,
    poweredEscapeValue: 2,
    manaCost: { color: 'red', count: 1 },
  },
  
  {
    id: 'A02', 
    name: 'Charge',
    flavor: 'Momentum builds. Break through their line.',
    color: 'red',
    rarity: 'common',
    class: 'direct-progress',
    forceValue: 4,
    escapeValue: 0,
    poweredForceValue: 8,
    poweredEscapeValue: 1,
    manaCost: { color: 'red', count: 1 },
  },

  {
    id: 'A03',
    name: 'Rally',
    flavor: 'Together we stand. Together we fight.',
    color: 'red',
    rarity: 'uncommon',
    class: 'utility',
    forceValue: 2,
    escapeValue: 1,
    poweredForceValue: 4,
    poweredEscapeValue: 3,
    manaCost: { color: 'red', count: 1 },
    effect: (state) => {
      // Rally: +1 momentum
      return { ...state, momentum: state.momentum + 1 };
    },
  },

  // Blue cards (high ESCAPE)
  {
    id: 'A04',
    name: 'Dodge',
    flavor: 'Step left. Duck right. Stay alive.',
    color: 'blue',
    rarity: 'common',
    class: 'direct-progress',
    forceValue: 1,
    escapeValue: 3,
    poweredForceValue: 2,
    poweredEscapeValue: 6,
    manaCost: { color: 'blue', count: 1 },
  },
  
  {
    id: 'A05',
    name: 'Sprint',
    flavor: 'When in doubt, run faster.',
    color: 'blue',
    rarity: 'common',
    class: 'direct-progress',
    forceValue: 0,
    escapeValue: 4,
    poweredForceValue: 1,
    poweredEscapeValue: 8,
    manaCost: { color: 'blue', count: 1 },
  },

  {
    id: 'A06',
    name: 'Misdirection',
    flavor: 'Look here. Move there. Escape everywhere.',
    color: 'blue',
    rarity: 'uncommon',
    class: 'utility',
    forceValue: 1,
    escapeValue: 2,
    poweredForceValue: 3,
    poweredEscapeValue: 4,
    manaCost: { color: 'blue', count: 1 },
    effect: (state) => {
      // Misdirection: +1 momentum
      return { ...state, momentum: state.momentum + 1 };
    },
  },

  // Purple cards (balanced FORCE/ESCAPE)
  {
    id: 'A07',
    name: 'Adapt',
    flavor: 'Bend, don\'t break. Flow with the challenge.',
    color: 'purple',
    rarity: 'common',
    class: 'direct-progress',
    forceValue: 2,
    escapeValue: 2,
    poweredForceValue: 4,
    poweredEscapeValue: 4,
    manaCost: { color: 'purple', count: 1 },
  },
  
  {
    id: 'A08',
    name: 'Balance',
    flavor: 'Equal parts courage and caution.',
    color: 'purple',
    rarity: 'common',
    class: 'direct-progress',
    forceValue: 3,
    escapeValue: 2,
    poweredForceValue: 5,
    poweredEscapeValue: 4,
    manaCost: { color: 'purple', count: 1 },
  },

  {
    id: 'A09',
    name: 'Flow State',
    flavor: 'Mind clear. Body ready. Spirit focused.',
    color: 'purple',
    rarity: 'uncommon',
    class: 'utility',
    forceValue: 2,
    escapeValue: 2,
    poweredForceValue: 3,
    poweredEscapeValue: 3,
    manaCost: { color: 'purple', count: 1 },
    effect: (state) => {
      // Flow State: +1 momentum
      return { ...state, momentum: state.momentum + 1 };
    },
  },

  // Gold cards (strong both)
  {
    id: 'A10',
    name: 'Masterful Strike',
    flavor: 'Precision and power in perfect harmony.',
    color: 'gold',
    rarity: 'rare',
    class: 'direct-progress',
    forceValue: 4,
    escapeValue: 3,
    poweredForceValue: 7,
    poweredEscapeValue: 6,
    manaCost: { color: 'gold', count: 1 }, // Gold-only, no substitution
  },

  // Utility cards
  {
    id: 'A11',
    name: 'Draw',
    flavor: 'Knowledge is preparation. Preparation is survival.',
    color: 'purple',
    rarity: 'common',
    class: 'draw',
    forceValue: 1,
    escapeValue: 1,
    poweredForceValue: 1,
    poweredEscapeValue: 1,
    manaCost: null, // Free to play powered action
    effect: (state) => {
      // Draw: +1 card when powered (implemented in engine)
      return state;
    },
  },

  {
    id: 'A12',
    name: 'Second Wind',
    flavor: 'The body tires. The spirit endures.',
    color: 'red',
    rarity: 'uncommon',
    class: 'recast',
    forceValue: 1,
    escapeValue: 0,
    poweredForceValue: 2,
    poweredEscapeValue: 1,
    manaCost: { color: 'red', count: 1 },
    effect: (state) => {
      // Second Wind: re-cast available dice (implemented in engine)
      return state;
    },
  },

  {
    id: 'A13',
    name: 'Convert',
    flavor: 'Transform weakness into strength.',
    color: 'blue',
    rarity: 'uncommon',
    class: 'conversion',
    forceValue: 0,
    escapeValue: 1,
    poweredForceValue: 1,
    poweredEscapeValue: 2,
    manaCost: { color: 'blue', count: 1 },
    effect: (state) => {
      // Convert: change X dice to available (implemented in engine)
      return state;
    },
  },

  {
    id: 'A14',
    name: 'Focus',
    flavor: 'Clear the mind. Sharpen the intent.',
    color: 'purple',
    rarity: 'common',
    class: 'utility',
    forceValue: 1,
    escapeValue: 1,
    poweredForceValue: 2,
    poweredEscapeValue: 2,
    manaCost: { color: 'purple', count: 1 },
    effect: (state) => {
      // Focus: next card +2 to both stats (implemented in engine)
      return state;
    },
  },
];

// REWARD POOL CARDS (6 cards) - Rare cards available as rewards
const REWARD_POOL_CARDS: HazardActionCard[] = [
  {
    id: 'R01',
    name: 'Overwhelming Force',
    flavor: 'When subtlety fails, use more force.',
    color: 'red',
    rarity: 'rare',
    class: 'direct-progress',
    forceValue: 6,
    escapeValue: 2,
    poweredForceValue: 12,
    poweredEscapeValue: 3,
    manaCost: { color: 'red', count: 1 },
    weight: 3,
  },

  {
    id: 'R02',
    name: 'Perfect Escape',
    flavor: 'Gone without a trace. Present without detection.',
    color: 'blue',
    rarity: 'rare',
    class: 'direct-progress',
    forceValue: 2,
    escapeValue: 6,
    poweredForceValue: 3,
    poweredEscapeValue: 12,
    manaCost: { color: 'blue', count: 1 },
    weight: 3,
  },

  {
    id: 'R03',
    name: 'Transcendence',
    flavor: 'Beyond force, beyond escape. Beyond limitation.',
    color: 'gold',
    rarity: 'rare',
    class: 'direct-progress',
    forceValue: 5,
    escapeValue: 5,
    poweredForceValue: 10,
    poweredEscapeValue: 10,
    manaCost: { color: 'gold', count: 1 },
    weight: 2,
  },

  {
    id: 'R04',
    name: 'Unlimited Draw',
    flavor: 'Every option available. Every path clear.',
    color: 'purple',
    rarity: 'rare',
    class: 'draw',
    forceValue: 2,
    escapeValue: 2,
    poweredForceValue: 2,
    poweredEscapeValue: 2,
    manaCost: null,
    effect: (state) => {
      // Unlimited Draw: +3 cards when powered
      return state;
    },
    weight: 2,
  },

  {
    id: 'R05',
    name: 'Perfect Conversion',
    flavor: 'Turn every setback into advantage.',
    color: 'gold',
    rarity: 'rare',
    class: 'conversion',
    forceValue: 3,
    escapeValue: 3,
    poweredForceValue: 4,
    poweredEscapeValue: 4,
    manaCost: { color: 'gold', count: 1 },
    effect: (state) => {
      // Perfect Conversion: convert all X dice + re-cast available dice
      return state;
    },
    weight: 1,
  },

  {
    id: 'R06',
    name: 'Momentum Master',
    flavor: 'Every action builds. Every success multiplies.',
    color: 'purple',
    rarity: 'rare',
    class: 'utility',
    forceValue: 3,
    escapeValue: 3,
    poweredForceValue: 5,
    poweredEscapeValue: 5,
    manaCost: { color: 'purple', count: 1 },
    effect: (state) => {
      // Momentum Master: +3 momentum
      return { ...state, momentum: state.momentum + 3 };
    },
    weight: 2,
  },
];

// DEAD CARD - Penalty card that cannot be played
const DEAD_CARDS: HazardActionCard[] = [
  {
    id: 'CRACK',
    name: 'CRACK',
    flavor: 'Broken. Useless. A reminder of failure.',
    color: 'red', // Dead cards take up red slots typically
    rarity: 'common',
    class: 'utility',
    forceValue: 0,
    escapeValue: 0,
    poweredForceValue: 0,
    poweredEscapeValue: 0,
    manaCost: null, // Cannot be played
    effect: (state) => {
      // CRACK: Dead card, no effect
      return state;
    },
  },
];

// COMBINED LIBRARY
export const ACTION_CARD_LIBRARY: HazardActionCard[] = [
  ...STARTER_CARDS,
  ...REWARD_POOL_CARDS,
  ...DEAD_CARDS,
];

// DECK CONFIGURATIONS
export const STARTER_DECK_CARD_IDS: string[] = STARTER_CARDS.map(card => card.id);
export const REWARD_POOL_CARD_IDS: string[] = REWARD_POOL_CARDS.map(card => card.id);

/**
 * Get a card by ID from the library
 */
export function getActionCard(id: string): HazardActionCard | null {
  return ACTION_CARD_LIBRARY.find(card => card.id === id) || null;
}

/**
 * Get cards by class
 */
export function getCardsByClass(cardClass: string): HazardActionCard[] {
  return ACTION_CARD_LIBRARY.filter(card => card.class === cardClass);
}

/**
 * Get cards by rarity
 */
export function getCardsByRarity(rarity: string): HazardActionCard[] {
  return ACTION_CARD_LIBRARY.filter(card => card.rarity === rarity);
}

/**
 * Get cards by color
 */
export function getCardsByColor(color: string): HazardActionCard[] {
  return ACTION_CARD_LIBRARY.filter(card => card.color === color);
}

/**
 * Get reward pool cards with weights for selection
 */
export function getWeightedRewardCards(): HazardActionCard[] {
  return REWARD_POOL_CARDS.filter(card => card.weight && card.weight > 0);
}

/**
 * Validate the card library for consistency
 */
export function validateCardLibrary(): boolean {
  const allIds = ACTION_CARD_LIBRARY.map(card => card.id);
  const uniqueIds = new Set(allIds);
  
  if (allIds.length !== uniqueIds.size) {
    console.error('Card library has duplicate IDs');
    return false;
  }
  
  // Check that all cards have required properties
  for (const card of ACTION_CARD_LIBRARY) {
    if (!card.id || !card.name || !card.color || !card.rarity || !card.class) {
      console.error('Card missing required properties:', card.id);
      return false;
    }
    
    if (typeof card.forceValue !== 'number' || typeof card.escapeValue !== 'number') {
      console.error('Card missing force/escape values:', card.id);
      return false;
    }
  }
  
  return true;
}