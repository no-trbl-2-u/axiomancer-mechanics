/**
 * Hazard Minigame — Public API
 * 
 * Re-exports all public types and functions for the hazard minigame system.
 */

// Core types
export type {
  HazardProgressType,
  HazardDieColor,
  HazardDieState,
  HazardManaDie,
  HazardMark,
  HazardCardRarity,
  HazardCardClass,
  HazardManaCost,
  HazardRoundState,
  HazardCardEffect,
  HazardActionCard,
  HazardReward,
  HazardPenalty,
  HazardMapBenefit,
  HazardMapPenalty,
  HazardRoute,
  HazardCard,
  HazardPhase,
  HazardRoundResult,
  HazardMinigameState,
  HazardRngFunction,
} from './hazard.types';

// Dice system
export {
  rollManaDice,
  canAffordCost,
  spendMana,
  hasXDice,
  countAvailableDice,
  transitionDiceState,
  refreshDiceBetweenRounds,
  validateDiceState,
} from './hazard.dice';

// Deck management
export {
  shuffleDeck,
  drawCards,
  playCard,
  initializeHazardDeck,
  discardHand,
  validateDeckState,
} from './hazard.deck';

// Card system
export {
  addProgress,
  addMultiProgress,
  addFocusBuff,
  createDirectProgressEffect,
  createFocusEffect,
  createMultiProgressEffect,
  noOpEffect,
  createActionCard,
  validateCard,
} from './hazard.cards';

// Card library
export {
  ACTION_CARD_LIBRARY,
  getActionCard,
  getCardsByClass,
  getCardsByRarity,
  STARTER_DECK_CARD_IDS,
  validateCardLibrary,
} from './hazard.cards.library';

// Hazard library
export {
  HAZARD_CARD_LIBRARY,
  getHazardCard,
  getRandomHazardCard,
  validateHazardLibrary,
} from './hazard.hazards.library';

// Core engine
export {
  initializeHazard,
  drawOpeningHand,
  selectRoute,
  rollDiceAndStartRound,
  playCardInRound,
  resolveRound,
  advanceToNextRound,
  computeFinalScore,
} from './hazard.engine';