/**
 * Hazard Minigame — Public API (v2)
 * 
 * Re-exports all public types and functions for the hazard minigame system.
 * Mobile v2 aligned interface for package consumption.
 */

// Core types (v2)
export type {
  HazardProgressType,
  HazardDieColor,
  HazardDieState,
  HazardManaDie,
  HazardMark,
  HazardCardRarity,
  HazardCardColor,
  HazardCardClass,
  HazardManaCost,
  HazardRoundState,
  HazardCardEffect,
  HazardActionCard,
  HazardSafeRoute,
  HazardRiskRoute,
  HazardRoute,
  HazardTieredRewards,
  HazardTieredPenalties,
  HazardReward,
  HazardPenalty,
  HazardCardOffer,
  HazardCard,
  HazardPhase,
  HazardRoundResult,
  HazardMinigameState,
  HazardOutcome,
  HazardRngFunction,
} from './hazard.types';

// Dice system (v2)
export {
  rollManaDice,
  canAffordCost,
  spendMana,
  hasXDice,
  countAvailableDice,
  countAvailableNonXDice,
  transitionDiceState,
  recastAvailableDice,
  convertXDice,
  refreshDiceBetweenRounds, // v2: no-op but kept for compatibility
  resetDiceStates,
  validateDiceState,
  getDiceColorDistribution,
} from './hazard.dice';

// Deck management (v2)
export {
  shuffleDeck,
  drawCards,
  playCard,
  initializeHazardDeck,
  discardHand,
  validateDeckState,
} from './hazard.deck';

// Card system (v2)
export {
  applyCardProgress,
  applyMomentumBonus,
  calculateMomentum,
  applyFocusBonus,
  createMomentumEffect,
  createDrawEffect,
  createSecondWindEffect,
  createConvertEffect,
  canPlayCard,
  hasSpecialEffect,
  getCardPowerLevel,
  // Legacy compatibility functions
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

// Card library (v2)
export {
  ACTION_CARD_LIBRARY,
  STARTER_DECK_CARD_IDS,
  REWARD_POOL_CARD_IDS,
  getActionCard,
  getCardsByClass,
  getCardsByRarity,
  getCardsByColor,
  getWeightedRewardCards,
  validateCardLibrary,
} from './hazard.cards.library';

// Hazard library (v2)
export {
  HAZARD_CARD_LIBRARY,
  getHazardCard,
  getRandomHazardCard,
  getHazardsByRounds,
  getSafeRouteDifficulty,
  getRiskRouteDifficulty,
  validateHazardLibrary,
} from './hazard.hazards.library';

// Core engine (v2)
export {
  initializeHazard,
  drawOpeningHand,
  selectRoute,
  castDice,
  playCardInRound,
  resolveRound,
  applyRewards,
  getCurrentThresholds,
  // Legacy compatibility functions
  rollDiceAndStartRound,
  advanceToNextRound,
  computeFinalScore,
} from './hazard.engine';