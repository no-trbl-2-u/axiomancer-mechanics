/**
 * Hazard Minigame — End-to-End Tests
 * 
 * Hermetic testing of core hazard minigame scenarios using deterministic RNG.
 * Covers BDD scenarios from docs/hazard-minigame-bdd.md.
 */

import { describe, it, expect } from 'vitest';
import { mockFixedRng, mockSequentialRng } from '../../../test-utils/rng';
import {
  initializeHazard,
  drawOpeningHand,
  selectRoute,
  rollDiceAndStartRound,
  playCardInRound,
  resolveRound,
  advanceToNextRound,
  computeFinalScore,
  getHazardCard,
  getActionCard,
  STARTER_DECK_CARD_IDS,
} from '../index';

describe('Hazard Minigame Engine', () => {
  describe('BDD Scenario: Hazard Start Sequence', () => {
    it('reveals hazard card and draws opening hand before route choice', () => {
      // Given a hazard card H01 (Cracked Cliff Path, 3 rounds)
      const hazardCard = getHazardCard('H01');
      expect(hazardCard).toBeDefined();
      expect(hazardCard!.rounds).toBe(3);
      
      // And the player has a deck of starter cards
      const playerDeck = STARTER_DECK_CARD_IDS;
      expect(playerDeck.length).toBeGreaterThan(5);
      
      // When the hazard is initialized
      const rng = mockFixedRng(0.5);
      let state = initializeHazard(hazardCard!, playerDeck, rng);
      
      // Then the phase is 'reveal'
      expect(state.phase).toBe('reveal');
      expect(state.chosenRoute).toBeNull();
      expect(state.mana).toHaveLength(0);
      
      // When the player draws their opening hand
      state = drawOpeningHand(state, rng);
      
      // Then the player holds exactly 5 cards
      expect(state.hand).toHaveLength(5);
      expect(state.deck.length).toBe(playerDeck.length - 5);
      expect(state.phase).toBe('route-select');
      expect(state.mana).toHaveLength(0); // No dice rolled yet
    });
    
    it('allows route selection before dice roll', () => {
      const hazardCard = getHazardCard('H01')!;
      const rng = mockFixedRng(0.5);
      
      let state = initializeHazard(hazardCard, STARTER_DECK_CARD_IDS, rng);
      state = drawOpeningHand(state, rng);
      
      // Given the hazard phase is 'route-select'
      expect(state.phase).toBe('route-select');
      expect(state.hand).toHaveLength(5);
      
      // When the player selects 'bottom' route
      state = selectRoute(state, 'bottom');
      
      // Then the chosen route is 'bottom'
      expect(state.chosenRoute).toBe('bottom');
      expect(state.phase).toBe('dice-roll');
      expect(state.mana).toHaveLength(0); // No dice rolled yet
    });
  });
  
  describe('BDD Scenario: Full Round Cycle', () => {
    it('completes a basic round with direct progress cards', () => {
      const hazardCard = getHazardCard('H01')!; // Stability/Force, thresholds [2,3,4]
      const rng = mockSequentialRng([0.1, 0.2, 0.3, 0.4]); // Predictable dice
      
      // Use a deck with guaranteed stability cards
      const testDeck = ['A01', 'A01', 'A01', 'A07', 'A07']; // 3 stability, 2 focus
      
      let state = initializeHazard(hazardCard, testDeck, rng);
      state = drawOpeningHand(state, rng);
      state = selectRoute(state, 'top'); // Stability route, threshold 2 for round 1
      state = rollDiceAndStartRound(state, rng);
      
      // Should have 4 dice and be in round-play phase
      expect(state.mana).toHaveLength(4);
      expect(state.phase).toBe('round-play');
      expect(state.currentRound?.round).toBe(1);
      expect(state.currentRound?.progress.stability).toBe(0);
      
      // Play stability cards to reach threshold
      let stabilityProgress = 0;
      for (const cardId of state.hand) {
        const card = getActionCard(cardId);
        if (card && card.progressType === 'stability') {
          state = playCardInRound(state, cardId, false); // Top action
          stabilityProgress += 1; // A01 top action gives +1 stability
          if (stabilityProgress >= 2) break; // Reached threshold
        }
      }
      
      expect(state.currentRound?.progress.stability).toBeGreaterThanOrEqual(2);
      
      // Resolve round - should pass threshold of 2
      state = resolveRound(state);
      
      expect(state.rounds).toHaveLength(1);
      expect(state.rounds[0].mark).toBe('O'); // Passed
      expect(state.rounds[0].round).toBe(1);
    });
    
    it('handles round failure and penalty application', () => {
      const hazardCard = getHazardCard('H01')!;
      const rng = mockFixedRng(0.5);
      
      // Use only focus cards (no direct progress)
      const testDeck = ['A07', 'A08', 'A07', 'A07', 'A07']; // Only focus cards
      
      let state = initializeHazard(hazardCard, testDeck, rng);
      state = drawOpeningHand(state, rng);
      state = selectRoute(state, 'top'); // Stability route
      state = rollDiceAndStartRound(state, rng);
      
      // Play focus cards (don't provide stability progress directly)
      const firstCard = state.hand[0];
      if (firstCard) {
        const card = getActionCard(firstCard);
        expect(card).toBeDefined();
        state = playCardInRound(state, firstCard, false);
      }
      
      // Current progress should be 0 stability (focus buffs don't apply without progress cards)
      expect(state.currentRound?.progress.stability).toBe(0);
      
      // Resolve round - should fail threshold of 2
      state = resolveRound(state);
      
      expect(state.rounds[0].mark).toBe('X'); // Failed
      // Penalty application would be tested here when penalties are implemented
    });
  });
  
  describe('BDD Scenario: Dice Persistence', () => {
    it('maintains dice state across rounds', () => {
      const hazardCard = getHazardCard('H02')!; // 4 rounds
      const rng = mockSequentialRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]); // Predictable sequence
      
      let state = initializeHazard(hazardCard, STARTER_DECK_CARD_IDS, rng);
      state = drawOpeningHand(state, rng);
      state = selectRoute(state, 'top');
      state = rollDiceAndStartRound(state, rng);
      
      const originalDice = [...state.mana];
      expect(originalDice).toHaveLength(4);
      
      // Complete first round
      state = resolveRound(state);
      expect(state.phase).toBe('between-rounds');
      
      // Advance to second round
      state = advanceToNextRound(state, rng);
      
      // Dice should persist (same IDs and colors, but state reset)
      expect(state.mana).toHaveLength(4);
      for (let i = 0; i < 4; i++) {
        expect(state.mana[i].id).toBe(originalDice[i].id);
        expect(state.mana[i].color).toBe(originalDice[i].color);
        expect(state.mana[i].state).toBe('available'); // Reset from any spent state
      }
    });
  });
  
  describe('BDD Scenario: Focus Buff Mechanics', () => {
    it('applies focus buffs to next progress card only', () => {
      const hazardCard = getHazardCard('H01')!;
      const rng = mockFixedRng(0.5);
      
      let state = initializeHazard(hazardCard, ['A07', 'A01'], rng); // Focus + Stability
      state = drawOpeningHand(state, rng);
      state = selectRoute(state, 'top');
      state = rollDiceAndStartRound(state, rng);
      
      // Play focus card first (+1 focus buffer)
      if (state.hand.includes('A07')) {
        state = playCardInRound(state, 'A07', false);
        expect(state.currentRound?.focusBuffer).toBe(1);
        expect(state.currentRound?.progress.stability).toBe(0);
      }
      
      // Play stability card (+1 stability + 1 focus = 2 total)
      if (state.hand.includes('A01')) {
        state = playCardInRound(state, 'A01', false);
        expect(state.currentRound?.progress.stability).toBe(2); // 1 + 1 focus
        expect(state.currentRound?.focusBuffer).toBe(0); // Consumed
      }
    });
  });
  
  describe('BDD Scenario: Final Scoring', () => {
    it('computes score as O count minus X count', () => {
      const hazardCard = getHazardCard('H01')!; // 3 rounds
      
      // Manually create a completed hazard state
      const state = {
        phase: 'complete' as const,
        hazardCard,
        chosenRoute: 'top' as const,
        playerChoiceProgressType: null,
        mana: [],
        deck: [],
        hand: [],
        discard: [],
        enchantmentZone: [],
        rounds: [
          { round: 1, mark: 'O' as const, progressAchieved: {stability: 3, escape: 0, supply: 0, force: 0}, thresholdRequired: {stability: 2, escape: 0, supply: 0, force: 0}, penaltiesApplied: [] },
          { round: 2, mark: 'X' as const, progressAchieved: {stability: 1, escape: 0, supply: 0, force: 0}, thresholdRequired: {stability: 3, escape: 0, supply: 0, force: 0}, penaltiesApplied: [] },
          { round: 3, mark: 'O' as const, progressAchieved: {stability: 5, escape: 0, supply: 0, force: 0}, thresholdRequired: {stability: 4, escape: 0, supply: 0, force: 0}, penaltiesApplied: [] },
        ],
        currentRound: null,
        finalScore: null,
      };
      
      const finalState = computeFinalScore(state);
      
      // 2 O's - 1 X = score of 1
      expect(finalState.finalScore).toBe(1);
    });
  });
  
  describe('Library Validation', () => {
    it('has valid action card library structure', () => {
      // Basic starter deck should be valid
      expect(STARTER_DECK_CARD_IDS.length).toBeGreaterThan(5);
      
      // All starter cards should exist in library
      for (const cardId of STARTER_DECK_CARD_IDS) {
        const card = getActionCard(cardId);
        expect(card).toBeDefined();
        expect(card!.id).toBe(cardId);
      }
    });
    
    it('has valid hazard card library structure', () => {
      const h01 = getHazardCard('H01');
      expect(h01).toBeDefined();
      expect(h01!.id).toBe('H01');
      expect(h01!.rounds).toBeGreaterThanOrEqual(3);
      expect(h01!.rounds).toBeLessThanOrEqual(5);
      expect(h01!.topRoute.roundThresholds).toHaveLength(h01!.rounds);
      expect(h01!.bottomRoute.roundThresholds).toHaveLength(h01!.rounds);
    });
  });
});