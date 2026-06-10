/**
 * Hazard Minigame — Core Engine (v2)
 * 
 * Mobile v2 engine: reveal → hand → route → cast → play → resolve → outcome → rewards
 * Safe combined meter and risk dual-meter logic with no-recast dice persistence.
 */

import type {
  HazardMinigameState,
  HazardCard,
  // HazardActionCard,
  // HazardRoundState,
  HazardRoundResult,
  HazardOutcome,
  HazardRngFunction,
} from './hazard.types';

import { rollManaDice, canAffordCost, spendMana, recastAvailableDice, convertXDice, countAvailableNonXDice } from './hazard.dice';
import { drawCards, playCard, initializeHazardDeck } from './hazard.deck';
import { applyCardProgress, applyMomentumBonus, calculateMomentum } from './hazard.cards';
import { getActionCard, STARTER_DECK_CARD_IDS } from './hazard.cards.library';

/**
 * Initialize a new hazard minigame session.
 * v2: includes session seed for deterministic RNG.
 */
export function initializeHazard(
  hazardCard: HazardCard,
  playerDeckCardIds: string[] = STARTER_DECK_CARD_IDS,
  sessionSeed: number
): HazardMinigameState {
  // Create seeded RNG function
  const rng: HazardRngFunction = createSeededRng(sessionSeed);
  
  const shuffledDeck = initializeHazardDeck(playerDeckCardIds, rng);
  
  return {
    phase: 'reveal',
    hazardCard,
    chosenRoute: null,
    mana: [], // Will be rolled during cast phase
    deck: shuffledDeck,
    hand: [],
    discard: [],
    rounds: [],
    currentRound: null,
    outcome: null,
    sessionSeed,
  };
}

/**
 * Draw opening hand (typically 5 cards).
 */
export function drawOpeningHand(
  state: HazardMinigameState,
  handSize: number = 5
): HazardMinigameState {
  if (state.phase !== 'reveal') {
    throw new Error('Can only draw opening hand during reveal phase');
  }
  
  const rng = createSeededRng(state.sessionSeed);
  const { newDeck, newHand, newDiscard } = drawCards(
    state.deck,
    state.hand,
    state.discard,
    handSize,
    rng
  );
  
  return {
    ...state,
    phase: 'hand',
    deck: newDeck,
    hand: newHand,
    discard: newDiscard,
  };
}

/**
 * Select safe or risk route.
 */
export function selectRoute(
  state: HazardMinigameState,
  route: 'safe' | 'risk'
): HazardMinigameState {
  if (state.phase !== 'hand') {
    throw new Error('Can only select route during hand phase');
  }
  
  return {
    ...state,
    phase: 'cast',
    chosenRoute: route,
  };
}

/**
 * Cast dice once for the entire hazard.
 * v2: Dice are cast once and persist through all rounds.
 */
export function castDice(state: HazardMinigameState): HazardMinigameState {
  if (state.phase !== 'cast') {
    throw new Error('Can only cast dice during cast phase');
  }
  
  const rng = createSeededRng(state.sessionSeed + 1); // Different seed for dice
  const mana = rollManaDice(rng);
  
  return {
    ...state,
    phase: 'play',
    mana,
    currentRound: {
      round: 1,
      progress: { force: 0, escape: 0 },
      momentum: 0,
      cardsPlayed: [],
      manaCopy: [...mana],
    },
  };
}

/**
 * Play a card during the play phase.
 * v2: Cards have direct force/escape values and optional special effects.
 */
export function playCardInRound(
  state: HazardMinigameState,
  cardId: string,
  powered: boolean = false
): HazardMinigameState {
  if (state.phase !== 'play' || !state.currentRound) {
    throw new Error('Can only play cards during play phase');
  }
  
  const card = getActionCard(cardId);
  if (!card) {
    throw new Error(`Card ${cardId} not found in library`);
  }
  
  if (!state.hand.includes(cardId)) {
    throw new Error(`Card ${cardId} not in hand`);
  }
  
  if (card.id === 'CRACK') {
    throw new Error('Cannot play CRACK dead card');
  }
  
  // Check mana cost if powered
  if (powered && card.manaCost) {
    if (!canAffordCost(state.mana, card.manaCost)) {
      throw new Error(`Cannot afford mana cost for ${cardId}`);
    }
  }
  
  // Spend mana if powered
  let newMana = state.mana;
  if (powered && card.manaCost) {
    newMana = spendMana(state.mana, card.manaCost);
  }
  
  // Remove card from hand and add to discard
  const { newHand, newDiscard } = playCard(state.hand, state.discard, cardId);
  
  // Apply card progress
  let newRoundState = applyCardProgress(state.currentRound, card, powered);
  
  // Apply special effects
  if (card.effect) {
    newRoundState = card.effect(newRoundState);
  }
  
  // Handle special card effects
  if (card.id === 'A12' && powered) {
    // Second Wind: re-cast available dice
    const rng = createSeededRng(state.sessionSeed + state.rounds.length + 2);
    newMana = recastAvailableDice(newMana, rng);
  }
  
  if (card.id === 'A13' && powered) {
    // Convert: change X dice to colors
    const rng = createSeededRng(state.sessionSeed + state.rounds.length + 3);
    newMana = convertXDice(newMana, rng);
  }
  
  if (card.id === 'A11' && powered) {
    // Draw: add cards to hand
    const rng = createSeededRng(state.sessionSeed + state.rounds.length + 4);
    const { newDeck: updatedDeck, newHand: updatedHand } = drawCards(
      state.deck, newHand, newDiscard, 1, rng
    );
    return {
      ...state,
      mana: newMana,
      deck: updatedDeck,
      hand: updatedHand,
      discard: newDiscard,
      currentRound: {
        ...newRoundState,
        cardsPlayed: [...newRoundState.cardsPlayed, cardId],
      },
    };
  }
  
  return {
    ...state,
    mana: newMana,
    hand: newHand,
    discard: newDiscard,
    currentRound: {
      ...newRoundState,
      cardsPlayed: [...newRoundState.cardsPlayed, cardId],
    },
  };
}

/**
 * Resolve the current round and check success/failure.
 * v2: Safe route uses combined meter, risk route requires BOTH meters.
 */
export function resolveRound(state: HazardMinigameState): HazardMinigameState {
  if (state.phase !== 'play' || !state.currentRound) {
    throw new Error('Can only resolve during play phase with active round');
  }
  
  if (!state.chosenRoute) {
    throw new Error('No route selected');
  }
  
  const route = state.chosenRoute === 'safe' 
    ? state.hazardCard.safeRoute 
    : state.hazardCard.riskRoute;
  
  const roundIndex = state.currentRound.round - 1;
  
  // Get threshold for this round
  let required: number | { force: number; escape: number };
  if (route.type === 'safe') {
    required = route.combinedThresholds[roundIndex];
  } else {
    required = {
      force: route.forceThresholds[roundIndex],
      escape: route.escapeThresholds[roundIndex],
    };
  }
  
  // Apply momentum bonus
  const finalProgress = applyMomentumBonus(state.currentRound, state.currentRound.momentum).progress;
  
  // Check success
  let succeeded = false;
  if (typeof required === 'number') {
    // Safe route: combined meter
    succeeded = (finalProgress.force + finalProgress.escape) >= required;
  } else {
    // Risk route: BOTH meters must succeed
    succeeded = finalProgress.force >= required.force && finalProgress.escape >= required.escape;
  }
  
  // Calculate momentum for next round
  const momentum = calculateMomentum(finalProgress, required);
  
  const roundResult: HazardRoundResult = {
    round: state.currentRound.round,
    mark: succeeded ? 'O' : 'X',
    progressAchieved: finalProgress,
    thresholdRequired: required,
    succeeded,
    momentum,
  };
  
  const newRounds = [...state.rounds, roundResult];
  const isLastRound = state.currentRound.round >= state.hazardCard.rounds;
  
  if (isLastRound) {
    // Hazard complete, determine outcome
    const successfulRounds = newRounds.filter(r => r.succeeded).length;
    const totalRounds = state.hazardCard.rounds;
    
    let outcome: HazardOutcome;
    if (successfulRounds === totalRounds) {
      outcome = 'perfect';
    } else if (successfulRounds > 0) {
      outcome = 'complete';
    } else {
      outcome = 'failure';
    }
    
    return {
      ...state,
      phase: 'outcome',
      rounds: newRounds,
      currentRound: null,
      outcome,
    };
  } else {
    // Start next round
    return {
      ...state,
      rounds: newRounds,
      currentRound: {
        round: state.currentRound.round + 1,
        progress: { force: 0, escape: 0 },
        momentum,
        cardsPlayed: [],
        manaCopy: [...state.mana],
      },
    };
  }
}

/**
 * Apply rewards based on outcome.
 * v2: Tiered rewards with card offers and reserve bonus.
 */
export function applyRewards(state: HazardMinigameState): HazardMinigameState {
  if (state.phase !== 'outcome' || !state.outcome) {
    throw new Error('Can only apply rewards during outcome phase');
  }
  
  const route = state.chosenRoute === 'safe' 
    ? state.hazardCard.safeRoute 
    : state.hazardCard.riskRoute;
  
  const rewards = route.rewards[state.outcome];
  
  // Calculate reserve bonus (unspent non-X dice)
  const _reserveBonusAmount = rewards.reserveBonus 
    ? countAvailableNonXDice(state.mana) * rewards.reserveBonus 
    : 0;
  
  return {
    ...state,
    phase: 'rewards',
    // Note: Actual reward application (VITAE, tokens, etc.) happens at GameState integration level
  };
}

/**
 * Create a simple seeded RNG function using mulberry32.
 * v2: Deterministic session RNG for replay consistency.
 */
function createSeededRng(seed: number): HazardRngFunction {
  let state = seed;
  return () => {
    state |= 0;
    state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, state | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Get current route thresholds for display/UI.
 */
export function getCurrentThresholds(state: HazardMinigameState): number[] | { force: number[]; escape: number[] } {
  if (!state.chosenRoute) return [];
  
  const route = state.chosenRoute === 'safe' 
    ? state.hazardCard.safeRoute 
    : state.hazardCard.riskRoute;
  
  if (route.type === 'safe') {
    return route.combinedThresholds;
  } else {
    return {
      force: route.forceThresholds,
      escape: route.escapeThresholds,
    };
  }
}

/**
 * Legacy function names for compatibility
 */
export function rollDiceAndStartRound(state: HazardMinigameState): HazardMinigameState {
  return castDice(state);
}

export function advanceToNextRound(state: HazardMinigameState): HazardMinigameState {
  return resolveRound(state);
}

export function computeFinalScore(state: HazardMinigameState): number {
  // v2: No numeric score, but return a score for compatibility
  if (!state.outcome) return 0;
  
  const successfulRounds = state.rounds.filter(r => r.succeeded).length;
  return successfulRounds;
}