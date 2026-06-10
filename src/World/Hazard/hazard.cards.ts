/**
 * Hazard Minigame — Card System (v2)
 * 
 * Mobile v2 card mechanics: unified force/escape progress values,
 * single-die powering, and special effects for utility cards.
 */

import type {
  HazardActionCard,
  HazardCardEffect,
  HazardRoundState,
  HazardProgressType,
  HazardCardRarity,
  HazardCardClass,
  HazardManaCost,
} from './hazard.types';

/**
 * Apply a card's progress values to the round state.
 * v2: cards have direct force/escape values instead of complex effects.
 */
export function applyCardProgress(
  state: HazardRoundState, 
  card: HazardActionCard, 
  powered: boolean = false
): HazardRoundState {
  const forceValue = powered ? card.poweredForceValue : card.forceValue;
  const escapeValue = powered ? card.poweredEscapeValue : card.escapeValue;
  
  return {
    ...state,
    progress: {
      force: state.progress.force + forceValue,
      escape: state.progress.escape + escapeValue,
    },
  };
}

/**
 * Apply momentum bonus to progress values.
 * v2: momentum adds to both force and escape.
 */
export function applyMomentumBonus(
  state: HazardRoundState,
  momentumBonus: number = 0
): HazardRoundState {
  if (momentumBonus <= 0) return state;
  
  return {
    ...state,
    progress: {
      force: state.progress.force + momentumBonus,
      escape: state.progress.escape + momentumBonus,
    },
  };
}

/**
 * Calculate momentum for next round.
 * v2: carries ⌊surplus/2⌋ (cap 3) into the next round.
 */
export function calculateMomentum(
  achieved: { force: number; escape: number },
  required: number | { force: number; escape: number }
): number {
  let surplus = 0;
  
  if (typeof required === 'number') {
    // Safe route: combined meter
    const totalAchieved = achieved.force + achieved.escape;
    surplus = Math.max(0, totalAchieved - required);
  } else {
    // Risk route: both meters must exceed threshold, use minimum surplus
    const forceSurplus = Math.max(0, achieved.force - required.force);
    const escapeSurplus = Math.max(0, achieved.escape - required.escape);
    surplus = Math.min(forceSurplus, escapeSurplus);
  }
  
  // Carry ⌊surplus/2⌋, capped at 3
  return Math.min(3, Math.floor(surplus / 2));
}

/**
 * Focus effect: next card +2 to both stats (applied in engine)
 */
export function applyFocusBonus(
  state: HazardRoundState,
  card: HazardActionCard,
  powered: boolean = false
): HazardRoundState {
  // Focus bonus is handled by the engine when applying card progress
  return applyCardProgress(state, card, powered);
}

/**
 * Create effect functions for special cards
 */

export function createMomentumEffect(bonus: number): HazardCardEffect {
  return (state: HazardRoundState) => ({
    ...state,
    momentum: state.momentum + bonus,
  });
}

export function createDrawEffect(_cardCount: number): HazardCardEffect {
  return (state: HazardRoundState) => {
    // Draw effect is handled by the engine (adds cards to hand)
    // This just marks that the effect occurred
    return state;
  };
}

export function createSecondWindEffect(): HazardCardEffect {
  return (state: HazardRoundState) => {
    // Second Wind effect is handled by the engine (re-casts available dice)
    return state;
  };
}

export function createConvertEffect(): HazardCardEffect {
  return (state: HazardRoundState) => {
    // Convert effect is handled by the engine (converts X dice to colors)
    return state;
  };
}

/**
 * v2: No enchantment system. This function is kept for compatibility.
 */
export function noOpEffect(state: HazardRoundState): HazardRoundState {
  return state;
}

/**
 * Check if a card can be played (not CRACK dead card)
 */
export function canPlayCard(card: HazardActionCard): boolean {
  return card.id !== 'CRACK';
}

/**
 * Check if a card is a utility card with special effects
 */
export function hasSpecialEffect(card: HazardActionCard): boolean {
  return card.effect !== undefined;
}

/**
 * Get card power level for balance analysis
 */
export function getCardPowerLevel(card: HazardActionCard, powered: boolean = false): number {
  const forceValue = powered ? card.poweredForceValue : card.forceValue;
  const escapeValue = powered ? card.poweredEscapeValue : card.escapeValue;
  
  return forceValue + escapeValue;
}

/**
 * Validate card structure for v2
 */
export function validateCard(card: HazardActionCard): string[] {
  const errors: string[] = [];
  
  if (!card.id || !card.name || !card.color || !card.rarity || !card.class) {
    errors.push('Card missing required properties');
  }
  
  if (typeof card.forceValue !== 'number' || typeof card.escapeValue !== 'number') {
    errors.push('Card missing force/escape values');
  }
  
  if (typeof card.poweredForceValue !== 'number' || typeof card.poweredEscapeValue !== 'number') {
    errors.push('Card missing powered force/escape values');
  }
  
  const validColors = ['red', 'blue', 'purple', 'gold'];
  if (!validColors.includes(card.color)) {
    errors.push('Invalid card color');
  }
  
  const validRarities = ['common', 'uncommon', 'rare'];
  if (!validRarities.includes(card.rarity)) {
    errors.push('Invalid card rarity');
  }
  
  return errors;
}

// Legacy compatibility functions - simplified for v2 
export function addProgress(
  state: HazardRoundState,
  progressType: HazardProgressType,
  amount: number
): HazardRoundState {
  return {
    ...state,
    progress: {
      ...state.progress,
      [progressType]: state.progress[progressType] + amount,
    },
  };
}

export function addMultiProgress(
  state: HazardRoundState,
  progressAmounts: Partial<Record<HazardProgressType, number>>
): HazardRoundState {
  const newProgress = { ...state.progress };
  
  for (const [progressType, amount] of Object.entries(progressAmounts)) {
    if (typeof amount === 'number') {
      newProgress[progressType as HazardProgressType] += amount;
    }
  }
  
  return {
    ...state,
    progress: newProgress,
  };
}

export function addFocusBuff(
  state: HazardRoundState,
  amount: number
): HazardRoundState {
  // v2: Focus handled differently, but keep compatibility
  return { ...state, momentum: state.momentum + amount };
}

export function createDirectProgressEffect(
  progressType: HazardProgressType,
  amount: number
): HazardCardEffect {
  return (state: HazardRoundState) => addProgress(state, progressType, amount);
}

export function createFocusEffect(amount: number): HazardCardEffect {
  return (state: HazardRoundState) => addFocusBuff(state, amount);
}

export function createMultiProgressEffect(
  progressAmounts: Partial<Record<HazardProgressType, number>>
): HazardCardEffect {
  return (state: HazardRoundState) => addMultiProgress(state, progressAmounts);
}

/**
 * Legacy function for v0 compatibility - now simplified for v2
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
  _isEnchant = false
): HazardActionCard {
  // This is a legacy compatibility function
  // In v2, cards are created directly with the new format
  return {
    id,
    name,
    color: 'red', // Default color
    rarity,
    class: cardClass as HazardCardClass,
    forceValue: 1,
    escapeValue: 1,
    poweredForceValue: 2,
    poweredEscapeValue: 2,
    manaCost: bottomManaCost.length > 0 ? bottomManaCost[0] : null,
  };
}