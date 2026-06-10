/**
 * Hazard Minigame — Action Card Library
 * 
 * Complete library of 30 action cards across 10 verb classes and 3 rarity tiers.
 * Each card has a free top action and a mana-cost bottom action.
 */

import type { HazardActionCard } from './hazard.types';
import {
  createActionCard,
  createDirectProgressEffect,
  createFocusEffect,
  createMultiProgressEffect,
  noOpEffect,
} from './hazard.cards';

/**
 * All action cards available in the hazard minigame.
 * Organized by class and rarity for easier maintenance.
 */

// DIRECT PROGRESS CLASS (6 cards)
const directProgressCards: HazardActionCard[] = [
  // Common (3 cards)
  createActionCard(
    'A01',
    'Steady Footing',
    'common',
    'direct-progress',
    createDirectProgressEffect('stability', 1),
    createDirectProgressEffect('stability', 3),
    [{ color: 'any', count: 1 }],
    'stability'
  ),
  
  createActionCard(
    'A02',
    'Quick Sprint',
    'common',
    'direct-progress',
    createDirectProgressEffect('escape', 1),
    createDirectProgressEffect('escape', 3),
    [{ color: 'green', count: 1 }],
    'escape'
  ),
  
  createActionCard(
    'A03',
    'Gather Supplies',
    'common',
    'direct-progress',
    createDirectProgressEffect('supply', 1),
    createDirectProgressEffect('supply', 3),
    [{ color: 'blue', count: 1 }],
    'supply'
  ),
  
  // Uncommon (2 cards)
  createActionCard(
    'A04',
    'Forceful Push',
    'uncommon',
    'direct-progress',
    createDirectProgressEffect('force', 2),
    createDirectProgressEffect('force', 5),
    [{ color: 'red', count: 1 }],
    'force'
  ),
  
  createActionCard(
    'A05',
    'Adaptive Movement',
    'uncommon',
    'direct-progress',
    createDirectProgressEffect('escape', 1),
    createMultiProgressEffect({ escape: 2, stability: 2 }),
    [{ color: 'any', count: 1 }],
    'any'
  ),
  
  // Rare (1 card)
  createActionCard(
    'A06',
    'All-Out Effort',
    'rare',
    'direct-progress',
    createDirectProgressEffect('force', 1),
    createMultiProgressEffect({ 
      stability: 2, 
      escape: 2, 
      supply: 2, 
      force: 2 
    }),
    [{ color: 'any', count: 1 }],
    'any'
  ),
];

// FOCUS CLASS (3 cards)
const focusCards: HazardActionCard[] = [
  createActionCard(
    'A07',
    'Center Yourself',
    'common',
    'focus',
    createFocusEffect(1),
    createFocusEffect(3),
    [{ color: 'yellow', count: 1 }]
  ),
  
  createActionCard(
    'A08',
    'Deep Concentration',
    'uncommon',
    'focus',
    createFocusEffect(2),
    createFocusEffect(5),
    [{ color: 'purple', count: 1 }]
  ),
  
  createActionCard(
    'A09',
    'Meditation Mastery',
    'rare',
    'focus',
    createFocusEffect(3),
    createFocusEffect(8),
    [{ color: 'purple', count: 1 }]
  ),
];

// MANA CONVERSION CLASS (3 cards - placeholder implementations)
const manaConversionCards: HazardActionCard[] = [
  createActionCard(
    'A10',
    'Transmute Energy',
    'common',
    'mana-conversion',
    noOpEffect, // Top: no effect (mana conversion is bottom-only)
    noOpEffect, // Bottom: convert 1 die to different color (TODO: implement)
    [{ color: 'any', count: 1 }]
  ),
  
  createActionCard(
    'A11',
    'Elemental Shift',
    'uncommon',
    'mana-conversion',
    noOpEffect,
    noOpEffect, // Bottom: convert 2 dice (TODO: implement)
    [{ color: 'any', count: 1 }]
  ),
  
  createActionCard(
    'A12',
    'Prismatic Flow',
    'rare',
    'mana-conversion',
    noOpEffect,
    noOpEffect, // Bottom: convert all available dice to chosen color (TODO: implement)
    [{ color: 'any', count: 1 }]
  ),
];

// MANA CREATION CLASS (3 cards - placeholder implementations)
const manaCreationCards: HazardActionCard[] = [
  createActionCard(
    'A13',
    'Spark',
    'common',
    'mana-creation',
    noOpEffect,
    noOpEffect, // Bottom: create 1 temporary die (TODO: implement)
    [{ color: 'red', count: 1 }]
  ),
  
  createActionCard(
    'A14',
    'Surge',
    'uncommon',
    'mana-creation',
    noOpEffect,
    noOpEffect, // Bottom: create 2 temporary dice (TODO: implement)
    [{ color: 'blue', count: 1 }]
  ),
  
  createActionCard(
    'A15',
    'Overflow',
    'rare',
    'mana-creation',
    noOpEffect,
    noOpEffect, // Bottom: create 3 temporary dice of chosen colors (TODO: implement)
    [{ color: 'any', count: 1 }]
  ),
];

// CARD DRAW CLASS (3 cards - placeholder implementations)
const cardDrawCards: HazardActionCard[] = [
  createActionCard(
    'A16',
    'Survey Options',
    'common',
    'card-draw',
    noOpEffect, // Top: draw 1 card (TODO: implement)
    noOpEffect, // Bottom: draw 3 cards (TODO: implement)
    [{ color: 'green', count: 1 }]
  ),
  
  createActionCard(
    'A17',
    'Tactical Review',
    'uncommon',
    'card-draw',
    noOpEffect,
    noOpEffect, // Bottom: draw 2 cards, discard 1 (TODO: implement)
    [{ color: 'blue', count: 1 }]
  ),
  
  createActionCard(
    'A18',
    'Perfect Insight',
    'rare',
    'card-draw',
    noOpEffect,
    noOpEffect, // Bottom: look at top 5, choose 2 to hand (TODO: implement)
    [{ color: 'purple', count: 1 }]
  ),
];

// Additional classes will be implemented in subsequent units...
// For now, create placeholder arrays to maintain the 30-card structure

const riskSacrificeCards: HazardActionCard[] = [];
const failureMitigationCards: HazardActionCard[] = [];
const synergyComboCards: HazardActionCard[] = [];
const xDieInteractionCards: HazardActionCard[] = [];
const persistentEnchantmentCards: HazardActionCard[] = [];

/**
 * Complete action card library - all 30 cards.
 */
export const ACTION_CARD_LIBRARY: HazardActionCard[] = [
  ...directProgressCards,
  ...focusCards,
  ...manaConversionCards,
  ...manaCreationCards,
  ...cardDrawCards,
  ...riskSacrificeCards,
  ...failureMitigationCards,
  ...synergyComboCards,
  ...xDieInteractionCards,
  ...persistentEnchantmentCards,
];

/**
 * Get card by ID.
 */
export function getActionCard(cardId: string): HazardActionCard | null {
  return ACTION_CARD_LIBRARY.find(card => card.id === cardId) || null;
}

/**
 * Get all cards of a specific class.
 */
export function getCardsByClass(cardClass: string): HazardActionCard[] {
  return ACTION_CARD_LIBRARY.filter(card => card.class === cardClass);
}

/**
 * Get all cards of a specific rarity.
 */
export function getCardsByRarity(rarity: string): HazardActionCard[] {
  return ACTION_CARD_LIBRARY.filter(card => card.rarity === rarity);
}

/**
 * Basic starter deck for new players (common cards only).
 */
export const STARTER_DECK_CARD_IDS = [
  'A01', 'A01', 'A02', 'A02', 'A03', 'A03', // Direct progress basics (2x each)
  'A07', 'A07', // Focus basics (2x)
  'A10', 'A13', 'A16', // One of each other common class
];

/**
 * Validate the complete card library.
 */
export function validateCardLibrary(): string[] {
  const errors: string[] = [];
  
  // Check for duplicate IDs
  const seenIds = new Set<string>();
  for (const card of ACTION_CARD_LIBRARY) {
    if (seenIds.has(card.id)) {
      errors.push(`Duplicate card ID: ${card.id}`);
    }
    seenIds.add(card.id);
  }
  
  // Check total count
  const expectedCount = 30;
  if (ACTION_CARD_LIBRARY.length !== expectedCount) {
    errors.push(`Expected ${expectedCount} cards, got ${ACTION_CARD_LIBRARY.length}`);
  }
  
  // Check class distribution (6/3/3/3/3/3/3/3/3/3)
  const classCounts: Record<string, number> = {};
  for (const card of ACTION_CARD_LIBRARY) {
    classCounts[card.class] = (classCounts[card.class] || 0) + 1;
  }
  
  const expectedClassCounts = {
    'direct-progress': 6,
    'focus': 3,
    'mana-conversion': 3,
    'mana-creation': 3,
    'card-draw': 3,
    'risk-sacrifice': 3,
    'failure-mitigation': 3,
    'synergy-combo': 3,
    'x-die-interaction': 3,
    'persistent-enchantment': 3,
  };
  
  for (const [cardClass, expectedCount] of Object.entries(expectedClassCounts)) {
    const actualCount = classCounts[cardClass] || 0;
    if (actualCount !== expectedCount) {
      errors.push(`Class ${cardClass}: expected ${expectedCount}, got ${actualCount}`);
    }
  }
  
  return errors;
}