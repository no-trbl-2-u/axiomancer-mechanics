/**
 * Hazard Minigame — Deck Management
 * 
 * Handles deck shuffling, card drawing, discard pile management, 
 * and enchantment zone mechanics with deterministic RNG.
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
 * Returns updated deck, hand, and discard state.
 */
export function drawCards(
  deck: string[],
  hand: string[],
  discard: string[],
  enchantmentZone: string[],
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
    // If deck is empty, reshuffle discard pile (excluding enchantments)
    if (workingDeck.length === 0) {
      if (workingDiscard.length === 0) {
        // No more cards available
        break;
      }
      
      // Filter out enchantment cards from discard before reshuffling
      const reshufflableCards = workingDiscard.filter(
        cardId => !enchantmentZone.includes(cardId)
      );
      
      if (reshufflableCards.length === 0) {
        // No reshufflable cards available
        break;
      }
      
      workingDeck = shuffleDeck(reshufflableCards, rng);
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
 * Enchantment cards go to enchantment zone instead of discard.
 */
export function playCard(
  hand: string[],
  discard: string[],
  enchantmentZone: string[],
  cardId: string,
  isEnchantment: boolean
): {
  newHand: string[];
  newDiscard: string[];
  newEnchantmentZone: string[];
} {
  const cardIndex = hand.indexOf(cardId);
  if (cardIndex === -1) {
    throw new Error(`Card ${cardId} not found in hand`);
  }
  
  const newHand = [...hand];
  newHand.splice(cardIndex, 1);
  
  if (isEnchantment) {
    return {
      newHand,
      newDiscard: [...discard],
      newEnchantmentZone: [...enchantmentZone, cardId],
    };
  } else {
    return {
      newHand,
      newDiscard: [...discard, cardId],
      newEnchantmentZone: [...enchantmentZone],
    };
  }
}

/**
 * Initialize a player deck for a hazard. 
 * In v0, this is the player's current hazard deck.
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
 */
export function validateDeckState(
  deck: string[],
  hand: string[],
  discard: string[],
  enchantmentZone: string[]
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
  
  // Check enchantment zone doesn't overlap with other zones
  for (const enchantCard of enchantmentZone) {
    if (allCards.includes(enchantCard)) {
      errors.push(`Enchantment card ${enchantCard} also appears in deck/hand/discard`);
    }
  }
  
  // Hand size should not exceed 5 during play
  if (hand.length > 5) {
    errors.push(`Hand size ${hand.length} exceeds maximum of 5`);
  }
  
  return errors;
}