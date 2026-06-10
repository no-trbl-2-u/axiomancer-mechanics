/**
 * Hazard Minigame — Deck Management (v2)
 * 
 * Handles deck shuffling, card drawing, discard pile management.
 * v2: No enchantment zone, simplified deck persistence across hazards.
 */

import type { HazardRngFunction } from './hazard.types';

/**
 * Shuffle an array using Fisher-Yates algorithm with provided RNG.
 * Returns a new shuffled array, does not mutate input.
 */
export function shuffleDeck<T>(deck: T[], rng: HazardRngFunction): T[] {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Draw cards from deck into hand. If deck empties, reshuffle discard pile.
 * v2: No enchantment zone, simplified reshuffling.
 */
export function drawCards(
  deck: string[],
  hand: string[],
  discard: string[],
  count: number,
  rng: HazardRngFunction
): {
  newDeck: string[];
  newHand: string[];
  newDiscard: string[];
} {
  let workingDeck = [...deck];
  let workingDiscard = [...discard];
  const newHand = [...hand];
  
  let cardsDrawn = 0;
  
  while (cardsDrawn < count) {
    // If deck is empty, reshuffle discard pile
    if (workingDeck.length === 0) {
      if (workingDiscard.length === 0) {
        // No more cards available
        break;
      }
      
      // v2: Simple reshuffle of all discard cards
      workingDeck = shuffleDeck(workingDiscard, rng);
      workingDiscard = [];
    }
    
    // Draw one card
    if (workingDeck.length > 0) {
      const drawnCard = workingDeck.pop()!;
      newHand.push(drawnCard);
      cardsDrawn++;
    }
  }
  
  return {
    newDeck: workingDeck,
    newHand,
    newDiscard: workingDiscard,
  };
}

/**
 * Play a card from hand to discard pile.
 * v2: All cards go to discard pile, no enchantment zone.
 */
export function playCard(
  hand: string[],
  discard: string[],
  cardId: string
): {
  newHand: string[];
  newDiscard: string[];
} {
  const cardIndex = hand.indexOf(cardId);
  if (cardIndex === -1) {
    throw new Error(`Card ${cardId} not found in hand`);
  }
  
  const newHand = [...hand];
  newHand.splice(cardIndex, 1);
  
  return {
    newHand,
    newDiscard: [...discard, cardId],
  };
}

/**
 * Initialize a player deck for a hazard. 
 * v2: Uses starter deck + any acquired cards from previous hazards.
 */
export function initializeHazardDeck(
  playerDeckCardIds: string[],
  rng: HazardRngFunction
): string[] {
  return shuffleDeck(playerDeckCardIds, rng);
}

/**
 * Discard hand to discard pile (between rounds).
 */
export function discardHand(
  hand: string[],
  discard: string[]
): {
  newHand: string[];
  newDiscard: string[];
} {
  return {
    newHand: [],
    newDiscard: [...discard, ...hand],
  };
}

/**
 * Validate deck state consistency (for debugging/testing).
 * v2: No enchantment zone to validate.
 */
export function validateDeckState(
  deck: string[],
  hand: string[],
  discard: string[]
): string[] {
  const errors: string[] = [];
  
  // Check for duplicate cards across zones
  const allCards = [...deck, ...hand, ...discard];
  const cardCounts: Record<string, number> = {};
  
  for (const cardId of allCards) {
    cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
  }
  
  for (const [cardId, count] of Object.entries(cardCounts)) {
    if (count > 1) {
      errors.push(`Card ${cardId} appears ${count} times in deck/hand/discard`);
    }
  }
  
  // Hand size should not exceed 5 during play
  if (hand.length > 5) {
    errors.push(`Hand size ${hand.length} exceeds maximum of 5`);
  }
  
  return errors;
}

// Legacy compatibility functions for v0 API
export function drawCards_v0(
  deck: string[],
  hand: string[],
  discard: string[],
  enchantmentZone: string[],
  count: number,
  rng: HazardRngFunction
) {
  const result = drawCards(deck, hand, discard, count, rng);
  return {
    newDeck: result.newDeck,
    newHand: result.newHand,
    newDiscard: result.newDiscard,
  };
}

export function playCard_v0(
  hand: string[],
  discard: string[],
  enchantmentZone: string[],
  cardId: string,
  _isEnchantment: boolean
) {
  const result = playCard(hand, discard, cardId);
  return {
    newHand: result.newHand,
    newDiscard: result.newDiscard,
    newEnchantmentZone: enchantmentZone, // unchanged in v2
  };
}