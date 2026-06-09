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