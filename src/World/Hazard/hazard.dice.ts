/**
 * Hazard Minigame — Dice System
 * 
 * Mana dice rolling, state validation, cost checking, and state transitions.
 * X dice are blocked by default — only specific card classes can interact with them.
 */

import type {
  HazardDieColor,
  HazardDieState,
  HazardManaDie,
  HazardManaCost,
  HazardRngFunction,
} from './hazard.types';

// Die face distribution — equal weight except X is rare
const DIE_FACES: HazardDieColor[] = ['red', 'green', 'blue', 'yellow', 'purple', 'x'];
const DIE_WEIGHTS = [1, 1, 1, 1, 1, 0.5]; // X is half as likely

/**
 * Roll 4 mana dice using weighted random distribution.
 * X dice are blocked by default and require specific cards to interact with.
 */
export function rollManaDice(rng: HazardRngFunction): HazardManaDie[] {
  const totalWeight = DIE_WEIGHTS.reduce((sum, w) => sum + w, 0);
  
  return Array.from({ length: 4 }, (_, index) => {
    const roll = rng() * totalWeight;
    let weightSum = 0;
    
    for (let i = 0; i < DIE_FACES.length; i++) {
      weightSum += DIE_WEIGHTS[i];
      if (roll <= weightSum) {
        return {
          id: `die-${index}`,
          color: DIE_FACES[i],
          state: 'available' as HazardDieState,
          temporary: false,
        };
      }
    }
    
    // Fallback (shouldn't happen with proper weights)
    return {
      id: `die-${index}`,
      color: 'red',
      state: 'available' as HazardDieState,
      temporary: false,
    };
  });
}

/**
 * Check if the player can afford a mana cost with available dice.
 * X dice are blocked unless card has X-die interaction capability.
 */
export function canAffordCost(
  dice: HazardManaDie[],
  cost: HazardManaCost[],
  canInteractWithX = false
): boolean {
  const availableDice = dice.filter(die => 
    die.state === 'available' && (canInteractWithX || die.color !== 'x')
  );
  
  // Group available dice by color
  const availableColors: Record<string, number> = {};
  for (const die of availableDice) {
    availableColors[die.color] = (availableColors[die.color] || 0) + 1;
  }
  
  // Check each cost requirement
  for (const requirement of cost) {
    if (requirement.color === 'any') {
      // Count total available non-X dice (or all if X-interaction enabled)
      const totalAvailable = availableDice.length;
      if (totalAvailable < requirement.count) {
        return false;
      }
    } else {
      const available = availableColors[requirement.color] || 0;
      if (available < requirement.count) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Spend mana dice to pay a cost, returning updated dice state.
 * Marks dice as 'spent'. Throws if cost cannot be afforded.
 */
export function spendMana(
  dice: HazardManaDie[],
  cost: HazardManaCost[],
  canInteractWithX = false
): HazardManaDie[] {
  if (!canAffordCost(dice, cost, canInteractWithX)) {
    throw new Error('Cannot afford mana cost');
  }
  
  const updatedDice = [...dice];
  
  for (const requirement of cost) {
    let remainingCount = requirement.count;
    
    if (requirement.color === 'any') {
      // Spend any available non-X dice (or any dice if X-interaction enabled)
      for (let i = 0; i < updatedDice.length && remainingCount > 0; i++) {
        const die = updatedDice[i];
        if (die.state === 'available' && (canInteractWithX || die.color !== 'x')) {
          updatedDice[i] = { ...die, state: 'spent' };
          remainingCount--;
        }
      }
    } else {
      // Spend specific color
      for (let i = 0; i < updatedDice.length && remainingCount > 0; i++) {
        const die = updatedDice[i];
        if (die.state === 'available' && die.color === requirement.color) {
          updatedDice[i] = { ...die, state: 'spent' };
          remainingCount--;
        }
      }
    }
  }
  
  return updatedDice;
}

/**
 * Check if any dice are in X state (blocked by default).
 */
export function hasXDice(dice: HazardManaDie[]): boolean {
  return dice.some(die => die.color === 'x');
}

/**
 * Count available dice of a specific color (or any color).
 */
export function countAvailableDice(
  dice: HazardManaDie[],
  color?: HazardDieColor | 'any',
  canInteractWithX = false
): number {
  return dice.filter(die => {
    if (die.state !== 'available') return false;
    if (!canInteractWithX && die.color === 'x') return false;
    if (!color || color === 'any') return true;
    return die.color === color;
  }).length;
}

/**
 * Transition all dice to a new state (used by card effects).
 */
export function transitionDiceState(
  dice: HazardManaDie[],
  fromState: HazardDieState,
  toState: HazardDieState
): HazardManaDie[] {
  return dice.map(die => 
    die.state === fromState 
      ? { ...die, state: toState }
      : die
  );
}

/**
 * Refresh dice between rounds: spent/exhausted → available, temporary dice expire.
 */
export function refreshDiceBetweenRounds(dice: HazardManaDie[]): HazardManaDie[] {
  return dice
    .filter(die => !die.temporary) // Remove temporary dice
    .map(die => {
      // Reset spent/exhausted to available, preserve other states
      if (die.state === 'spent' || die.state === 'exhausted') {
        return { ...die, state: 'available' };
      }
      return die;
    });
}

/**
 * Validate dice state consistency (for debugging/testing).
 */
export function validateDiceState(dice: HazardManaDie[]): string[] {
  const errors: string[] = [];
  
  if (dice.length !== 4) {
    errors.push(`Expected 4 dice, got ${dice.length}`);
  }
  
  const seenIds = new Set<string>();
  for (const die of dice) {
    if (seenIds.has(die.id)) {
      errors.push(`Duplicate die ID: ${die.id}`);
    }
    seenIds.add(die.id);
    
    if (!die.id.startsWith('die-')) {
      errors.push(`Invalid die ID format: ${die.id}`);
    }
  }
  
  return errors;
}