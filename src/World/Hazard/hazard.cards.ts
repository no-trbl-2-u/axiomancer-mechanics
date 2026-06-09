/**
 * Hazard Minigame — Card Effect System
 * 
 * Core card effect functions and utilities for implementing
 * the 10 verb classes and card interaction mechanics.
 */

import type {
  HazardRoundState,
  HazardProgressType,
  HazardActionCard,
  HazardCardClass,
  HazardCardRarity,
  HazardCardEffect,
  HazardManaCost,
} from './hazard.types';

/**
 * Add progress to a specific type with focus buffer application.
 */
export function addProgress(
  state: HazardRoundState,
  progressType: HazardProgressType,
  amount: number
): HazardRoundState {
  const totalAmount = amount + state.focusBuffer;
  
  return {
    ...state,
    progress: {
      ...state.progress,
      [progressType]: state.progress[progressType] + totalAmount,
    },
    focusBuffer: 0, // Focus buffer consumed
  };
}

/**
 * Add progress to multiple types with focus buffer application.
 */
export function addMultiProgress(
  state: HazardRoundState,
  progressAmounts: Partial<Record<HazardProgressType, number>>
): HazardRoundState {
  let remainingFocus = state.focusBuffer;
  let newProgress = { ...state.progress };
  
  // Apply focus to first progress type only
  let firstType = true;
  
  for (const [progressType, amount] of Object.entries(progressAmounts)) {
    if (typeof amount === 'number') {
      const totalAmount = firstType ? amount + remainingFocus : amount;
      newProgress[progressType as HazardProgressType] += totalAmount;
      if (firstType) {
        remainingFocus = 0;
        firstType = false;
      }
    }
  }
  
  return {
    ...state,
    progress: newProgress,
    focusBuffer: remainingFocus,
  };
}

/**
 * Add focus buff for next progress card.
 */
export function addFocusBuff(
  state: HazardRoundState,
  amount: number
): HazardRoundState {
  return {
    ...state,
    focusBuffer: state.focusBuffer + amount,
  };
}

/**
 * Create a direct progress card effect.
 */
export function createDirectProgressEffect(
  progressType: HazardProgressType,
  amount: number
): HazardCardEffect {
  return (state: HazardRoundState) => addProgress(state, progressType, amount);
}

/**
 * Create a focus buff card effect.
 */
export function createFocusEffect(amount: number): HazardCardEffect {
  return (state: HazardRoundState) => addFocusBuff(state, amount);
}

/**
 * Create a multi-progress card effect.
 */
export function createMultiProgressEffect(
  progressAmounts: Partial<Record<HazardProgressType, number>>
): HazardCardEffect {
  return (state: HazardRoundState) => addMultiProgress(state, progressAmounts);
}

/**
 * No-op effect for cards that don't affect progress directly.
 */
export const noOpEffect: HazardCardEffect = (state: HazardRoundState) => state;

/**
 * Create a basic action card with common patterns.
 */
export function createActionCard(
  id: string,
  name: string,
  rarity: HazardCardRarity,
  cardClass: HazardCardClass,
  topAction: HazardCardEffect,
  bottomAction: HazardCardEffect,
  bottomManaCost: HazardManaCost[] = [],
  progressType?: HazardProgressType | 'any',
  isEnchant = false
): HazardActionCard {
  return {
    id,
    name,
    rarity,
    class: cardClass,
    progressType,
    topAction,
    bottomAction,
    bottomManaCost,
    isEnchant,
  };
}

/**
 * Validate a card definition (for debugging/testing).
 */
export function validateCard(card: HazardActionCard): string[] {
  const errors: string[] = [];
  
  if (!card.id) {
    errors.push('Card missing ID');
  }
  
  if (!card.name) {
    errors.push('Card missing name');
  }
  
  if (card.isEnchant && card.class !== 'persistent-enchantment') {
    errors.push('Only persistent-enchantment cards can be enchantments');
  }
  
  if (card.bottomManaCost.length > 0) {
    for (const cost of card.bottomManaCost) {
      if (cost.count <= 0) {
        errors.push(`Invalid mana cost: ${cost.count} ${cost.color}`);
      }
    }
  }
  
  return errors;
}