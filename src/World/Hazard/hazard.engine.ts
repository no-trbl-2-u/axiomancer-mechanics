/**
 * Hazard Minigame — Core Engine
 * 
 * State machine implementation for hazard minigame progression.
 * Handles initialization, round resolution, scoring, and state transitions.
 */

import type {
  HazardMinigameState,
  HazardCard,
  HazardRoundState,
  HazardRoundResult,
  HazardProgressType,
  HazardPhase,
  HazardMark,
  HazardManaDie,
  HazardRngFunction,
} from './hazard.types';
import { rollManaDice, spendMana, canAffordCost, refreshDiceBetweenRounds } from './hazard.dice';
import { initializeHazardDeck, drawCards, playCard, discardHand } from './hazard.deck';
import { getActionCard } from './hazard.cards.library';

/**
 * Initialize a new hazard minigame session.
 */
export function initializeHazard(
  hazardCard: HazardCard,
  playerDeckCardIds: string[],
  rng: HazardRngFunction
): HazardMinigameState {
  const shuffledDeck = initializeHazardDeck(playerDeckCardIds, rng);
  
  return {
    phase: 'reveal',
    hazardCard,
    chosenRoute: null,
    playerChoiceProgressType: null,
    mana: [],
    deck: shuffledDeck,
    hand: [],
    discard: [],
    enchantmentZone: [],
    rounds: [],
    currentRound: null,
    finalScore: null,
  };
}

/**
 * Draw opening hand and advance to route selection.
 */
export function drawOpeningHand(
  state: HazardMinigameState,
  rng: HazardRngFunction
): HazardMinigameState {
  if (state.phase !== 'reveal') {
    throw new Error(`Cannot draw hand in phase: ${state.phase}`);
  }
  
  const { newDeck, newHand, newDiscard } = drawCards(
    state.deck,
    state.hand,
    state.discard,
    state.enchantmentZone,
    5,
    rng
  );
  
  return {
    ...state,
    phase: 'route-select',
    deck: newDeck,
    hand: newHand,
    discard: newDiscard,
  };
}

/**
 * Select route (top or bottom) and advance to dice rolling.
 */
export function selectRoute(
  state: HazardMinigameState,
  route: 'top' | 'bottom',
  playerChoiceProgressType?: HazardProgressType
): HazardMinigameState {
  if (state.phase !== 'route-select') {
    throw new Error(`Cannot select route in phase: ${state.phase}`);
  }
  
  return {
    ...state,
    phase: 'dice-roll',
    chosenRoute: route,
    playerChoiceProgressType: playerChoiceProgressType || null,
  };
}

/**
 * Roll mana dice and start first round.
 */
export function rollDiceAndStartRound(
  state: HazardMinigameState,
  rng: HazardRngFunction
): HazardMinigameState {
  if (state.phase !== 'dice-roll') {
    throw new Error(`Cannot roll dice in phase: ${state.phase}`);
  }
  
  const mana = rollManaDice(rng);
  const currentRound = createRoundState(1, mana);
  
  return {
    ...state,
    phase: 'round-play',
    mana,
    currentRound,
  };
}

/**
 * Play a card during the round-play phase.
 */
export function playCardInRound(
  state: HazardMinigameState,
  cardId: string,
  useBottomAction = false
): HazardMinigameState {
  if (state.phase !== 'round-play') {
    throw new Error(`Cannot play card in phase: ${state.phase}`);
  }
  
  if (!state.currentRound) {
    throw new Error('No current round active');
  }
  
  const card = getActionCard(cardId);
  if (!card) {
    throw new Error(`Card not found: ${cardId}`);
  }
  
  // Check mana cost for bottom action
  if (useBottomAction && card.bottomManaCost.length > 0) {
    const canInteractWithX = card.class === 'x-die-interaction';
    if (!canAffordCost(state.mana, card.bottomManaCost, canInteractWithX)) {
      throw new Error(`Cannot afford bottom action of ${cardId}`);
    }
  }
  
  // Update deck state
  const { newHand, newDiscard, newEnchantmentZone } = playCard(
    state.hand,
    state.discard,
    state.enchantmentZone,
    cardId,
    useBottomAction && card.isEnchant
  );
  
  // Spend mana if bottom action
  let newMana = state.mana;
  if (useBottomAction && card.bottomManaCost.length > 0) {
    const canInteractWithX = card.class === 'x-die-interaction';
    newMana = spendMana(state.mana, card.bottomManaCost, canInteractWithX);
  }
  
  // Apply card effect
  const cardEffect = useBottomAction ? card.bottomAction : card.topAction;
  const updatedRound = cardEffect(state.currentRound);
  
  return {
    ...state,
    mana: newMana,
    hand: newHand,
    discard: newDiscard,
    enchantmentZone: newEnchantmentZone,
    currentRound: {
      ...updatedRound,
      cardsPlayed: [...updatedRound.cardsPlayed, cardId],
    },
  };
}

/**
 * Resolve the current round (mark O or X, apply penalties).
 */
export function resolveRound(state: HazardMinigameState): HazardMinigameState {
  if (state.phase !== 'round-play') {
    throw new Error(`Cannot resolve round in phase: ${state.phase}`);
  }
  
  if (!state.currentRound || !state.chosenRoute) {
    throw new Error('No current round or chosen route');
  }
  
  const route = state.chosenRoute === 'top' 
    ? state.hazardCard.topRoute 
    : state.hazardCard.bottomRoute;
  
  const roundIndex = state.currentRound.round - 1;
  const thresholdRequired = route.roundThresholds[roundIndex] || 0;
  
  // Determine required progress type
  let requiredProgressType = route.progressType;
  if (requiredProgressType === 'player-choice' && state.playerChoiceProgressType) {
    requiredProgressType = state.playerChoiceProgressType;
  }
  
  // Check if threshold is met
  const progressAchieved = requiredProgressType === 'player-choice'
    ? Object.values(state.currentRound.progress).reduce((sum, val) => sum + val, 0)
    : state.currentRound.progress[requiredProgressType as HazardProgressType];
  
  const mark: HazardMark = progressAchieved >= thresholdRequired ? 'O' : 'X';
  
  // Create round result
  const roundResult: HazardRoundResult = {
    round: state.currentRound.round,
    mark,
    progressAchieved: { [requiredProgressType]: progressAchieved } as Record<HazardProgressType, number>,
    thresholdRequired: { [requiredProgressType]: thresholdRequired } as Record<HazardProgressType, number>,
    penaltiesApplied: [], // TODO: Apply penalties for failed rounds
  };
  
  const isLastRound = state.currentRound.round >= state.hazardCard.rounds;
  const nextPhase: HazardPhase = isLastRound ? 'complete' : 'between-rounds';
  
  return {
    ...state,
    phase: nextPhase,
    rounds: [...state.rounds, roundResult],
    currentRound: null,
  };
}

/**
 * Transition between rounds (refresh dice, draw new hand).
 */
export function advanceToNextRound(
  state: HazardMinigameState,
  rng: HazardRngFunction
): HazardMinigameState {
  if (state.phase !== 'between-rounds') {
    throw new Error(`Cannot advance round in phase: ${state.phase}`);
  }
  
  const nextRoundNumber = state.rounds.length + 1;
  
  // Discard current hand
  const { newHand, newDiscard } = discardHand(state.hand, state.discard);
  
  // Refresh dice
  const refreshedMana = refreshDiceBetweenRounds(state.mana);
  
  // Draw new hand
  const { newDeck, newHand: finalHand, newDiscard: finalDiscard } = drawCards(
    state.deck,
    newHand,
    newDiscard,
    state.enchantmentZone,
    5,
    rng
  );
  
  // Create next round
  const currentRound = createRoundState(nextRoundNumber, refreshedMana);
  
  return {
    ...state,
    phase: 'round-play',
    mana: refreshedMana,
    deck: newDeck,
    hand: finalHand,
    discard: finalDiscard,
    currentRound,
  };
}

/**
 * Compute final score and complete the hazard.
 */
export function computeFinalScore(state: HazardMinigameState): HazardMinigameState {
  if (state.phase !== 'complete') {
    throw new Error(`Cannot compute score in phase: ${state.phase}`);
  }
  
  const oCount = state.rounds.filter(r => r.mark === 'O').length;
  const xCount = state.rounds.filter(r => r.mark === 'X').length;
  const finalScore = oCount - xCount;
  
  return {
    ...state,
    finalScore,
  };
}

/**
 * Create initial round state.
 */
function createRoundState(roundNumber: number, mana: HazardManaDie[]): HazardRoundState {
  return {
    round: roundNumber,
    progress: {
      stability: 0,
      escape: 0,
      supply: 0,
      force: 0,
    },
    focusBuffer: 0,
    cardsPlayed: [],
    manaCopy: [...mana],
  };
}