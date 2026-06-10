/**
 * Hazard Minigame — Dice System (v2)
 * 
 * Mobile v2 dice: 6 faces = red, blue, purple, gold, x, x (1/3 hostile)
 * No re-cast between rounds. Spent stays spent. Only card effects change dice state.
 */

import type {
  HazardDieColor,
  HazardDieState,
  HazardManaDie,
  HazardManaCost,
  HazardRngFunction,
} from './hazard.types';

// v2 Die face distribution: exactly 6 faces with 2 X faces (1/3 hostile)
const DIE_FACES: HazardDieColor[] = ['red', 'blue', 'purple', 'gold', 'x', 'x'];

/**
 * Roll 4 mana dice with v2 6-face distribution.
 * Each die has equal chance of any of the 6 faces: red, blue, purple, gold, x, x
 * This gives 1/3 chance of X (hostile) and 2/3 chance of useful colors.
 */
export function rollManaDice(rng: HazardRngFunction): HazardManaDie[] {
  return Array.from({ length: 4 }, (_, index) => {
    const faceIndex = Math.floor(rng() * DIE_FACES.length);
    
    return {
      id: `die-${index}`,
      color: DIE_FACES[faceIndex],
      state: 'available' as HazardDieState,
    };
  });
}

/**
 * Check if the player can afford a mana cost with available dice.
 * v2: cards require exactly one die of their own color (no 'any' substitution).
 * Gold cards require gold dice specifically.
 */
export function canAffordCost(dice: HazardManaDie[], cost: HazardManaCost | null): boolean {
  if (!cost) return true; // Free cards
  
  // v2: always exactly 1 die of specific color
  const availableDice = dice.filter(die => 
    die.state === 'available' && die.color === cost.color
  );
  
  return availableDice.length >= cost.count;
}

/**
 * Spend mana dice to pay a card cost.
 * v2: exactly one die of the specified color.
 */
export function spendMana(dice: HazardManaDie[], cost: HazardManaCost | null): HazardManaDie[] {
  if (!cost) return dice; // Free cards
  
  const newDice = [...dice];
  let spentCount = 0;
  
  for (let i = 0; i < newDice.length && spentCount < cost.count; i++) {
    const die = newDice[i];
    if (die.state === 'available' && die.color === cost.color) {
      newDice[i] = { ...die, state: 'spent' };
      spentCount++;
    }
  }
  
  return newDice;
}

/**
 * Check if any dice are X (hostile) and available.
 */
export function hasXDice(dice: HazardManaDie[]): boolean {
  return dice.some(die => die.color === 'x' && die.state === 'available');
}

/**
 * Count available dice of a specific color.
 */
export function countAvailableDice(dice: HazardManaDie[], color?: HazardDieColor): number {
  return dice.filter(die => {
    if (die.state !== 'available') return false;
    if (color && die.color !== color) return false;
    return true;
  }).length;
}

/**
 * Count available non-X dice (for reserve bonus calculation).
 */
export function countAvailableNonXDice(dice: HazardManaDie[]): number {
  return dice.filter(die => 
    die.state === 'available' && die.color !== 'x'
  ).length;
}

/**
 * Transition dice state (for card effects like Second Wind, Convert).
 */
export function transitionDiceState(
  dice: HazardManaDie[], 
  fromState: HazardDieState, 
  toState: HazardDieState,
  colorFilter?: HazardDieColor
): HazardManaDie[] {
  return dice.map(die => {
    if (die.state === fromState && (!colorFilter || die.color === colorFilter)) {
      return { ...die, state: toState };
    }
    return die;
  });
}

/**
 * Second Wind effect: re-cast all available dice.
 */
export function recastAvailableDice(dice: HazardManaDie[], rng: HazardRngFunction): HazardManaDie[] {
  return dice.map(die => {
    if (die.state === 'available') {
      const faceIndex = Math.floor(rng() * DIE_FACES.length);
      return { ...die, color: DIE_FACES[faceIndex] };
    }
    return die;
  });
}

/**
 * Convert effect: change X dice to available state with new colors.
 */
export function convertXDice(dice: HazardManaDie[], rng: HazardRngFunction): HazardManaDie[] {
  // Convert available X dice to random non-X colors
  const nonXFaces: HazardDieColor[] = ['red', 'blue', 'purple', 'gold'];
  
  return dice.map(die => {
    if (die.state === 'available' && die.color === 'x') {
      const colorIndex = Math.floor(rng() * nonXFaces.length);
      return { ...die, color: nonXFaces[colorIndex] };
    }
    return die;
  });
}

/**
 * v2: NO refresh between rounds. Dice persist their state entire hazard.
 * This function is kept for compatibility but does nothing in v2.
 */
export function refreshDiceBetweenRounds(dice: HazardManaDie[]): HazardManaDie[] {
  // v2: No dice refresh between rounds - spent stays spent
  return dice;
}

/**
 * Reset dice to initial available state (for new hazard start).
 */
export function resetDiceStates(dice: HazardManaDie[]): HazardManaDie[] {
  return dice.map(die => ({ ...die, state: 'available' }));
}

/**
 * Validate dice state consistency.
 */
export function validateDiceState(dice: HazardManaDie[]): boolean {
  // Should have exactly 4 dice
  if (dice.length !== 4) return false;
  
  // Each die should have valid properties
  for (const die of dice) {
    if (!die.id || !DIE_FACES.includes(die.color)) return false;
    
    const validStates: HazardDieState[] = [
      'available', 'spent', 'exhausted', 'discarded', 'locked', 'preserved'
    ];
    if (!validStates.includes(die.state)) return false;
  }
  
  return true;
}

/**
 * Get color distribution for balance analysis.
 */
export function getDiceColorDistribution(dice: HazardManaDie[]): Record<HazardDieColor, number> {
  const distribution: Record<HazardDieColor, number> = {
    red: 0,
    blue: 0,
    purple: 0,
    gold: 0,
    x: 0,
  };
  
  for (const die of dice) {
    distribution[die.color]++;
  }
  
  return distribution;
}