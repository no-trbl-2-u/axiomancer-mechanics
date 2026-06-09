/**
 * Hazard Minigame — Core Type Definitions
 * 
 * Complete type system for the hazard minigame per TDD specification.
 * Covers dice, cards, rounds, state machine phases, and integration types.
 */

// Progress types — exactly four in v0
export type HazardProgressType = 'stability' | 'escape' | 'supply' | 'force';

// Mana die face — X is blocked by default
export type HazardDieColor = 'red' | 'green' | 'blue' | 'yellow' | 'purple' | 'x';

// Die state transitions:
//   available → spent (card bottom action cost)
//   available → exhausted (card effect: exhaust without spending)
//   available → preserved (enchantment: carries to next round as available)
//   spent/exhausted → available (enchantment: refresh between rounds)
//   available → locked (card effect: cannot be changed or spent this round)
export type HazardDieState =
  | 'available'
  | 'spent'
  | 'exhausted'
  | 'discarded'
  | 'locked'
  | 'preserved';

export type HazardManaDie = {
  id: string;              // unique per die per hazard ("die-0" through "die-3")
  color: HazardDieColor;
  state: HazardDieState;
  temporary: boolean;      // true = expires at end of round unless preserved
};

// Round mark
export type HazardMark = 'O' | 'X';

// Card rarity
export type HazardCardRarity = 'common' | 'uncommon' | 'rare';

// Card verb class
export type HazardCardClass =
  | 'direct-progress'
  | 'focus'
  | 'mana-conversion'
  | 'mana-creation'
  | 'card-draw'
  | 'risk-sacrifice'
  | 'failure-mitigation'
  | 'synergy-combo'
  | 'x-die-interaction'
  | 'persistent-enchantment';

// Mana cost entry
export type HazardManaCost = {
  color: HazardDieColor | 'any';  // 'any' = spend any available non-X die
  count: number;
};

// Round state for card effect evaluation
export type HazardRoundState = {
  round: number;                          // 1-indexed
  progress: Record<HazardProgressType, number>;
  focusBuffer: number;                    // accumulated Focus buff for next progress card
  cardsPlayed: string[];                  // card IDs played this round
  manaCopy: HazardManaDie[];              // snapshot at round start for undo/debug
};

// Card effect — evaluated at resolution time
export type HazardCardEffect = (state: HazardRoundState) => HazardRoundState;

// A single action card in the library
export type HazardActionCard = {
  id: string;
  name: string;
  rarity: HazardCardRarity;
  class: HazardCardClass;
  progressType?: HazardProgressType | 'any';  // primary tag for filtering/display
  topAction: HazardCardEffect;
  bottomAction: HazardCardEffect;
  bottomManaCost: HazardManaCost[];            // empty array = no mana cost
  isEnchant: boolean;                          // if true, moves to enchantment zone on bottom play
};

// Reward and penalty types
export type HazardReward = {
  vitae?: number;               // positive = recover, negative = lose
  supplyTokens?: number;
  items?: string[];             // item IDs
  mapBenefit?: HazardMapBenefit; // ⚑ future phase — not implemented in v0
};

export type HazardPenalty = {
  vitae?: number;               // negative number = VITAE loss
  additionalX?: number;         // mark N extra X marks
  supplyTokens?: number;
  mapPenalty?: HazardMapPenalty; // ⚑ future phase — not implemented in v0
};

// ⚑ These types are defined now but not wired to world state in v0.
// Filed in PHASE_CANDIDATES.md under hazard world-state tracking (score 6.4).
export type HazardMapBenefit = {
  kind: 'threshold-reduction' | 'auto-succeed' | 'hazard-cleared';
  targetNodeId?: string;
  progressType?: HazardProgressType;
  thresholdReduction?: number;
  autoSucceedBelow?: number;
};

export type HazardMapPenalty = {
  kind: 'route-blocked';
  blockedNodeId?: string;
};

// Hazard card route
export type HazardRoute = {
  progressType: HazardProgressType | 'player-choice';  // 'player-choice' = H07 special
  roundThresholds: number[];  // index 0 = round 1, last entry = final round
  reward: HazardReward;
  failurePenalty?: HazardPenalty;        // applied each failed round
  finalRoundFailurePenalty?: HazardPenalty; // additional penalty on final round failure only
};

export type HazardCard = {
  id: string;                   // "H01" through "H15"
  name: string;
  scenario: string;
  rounds: number;
  topRoute: HazardRoute;
  bottomRoute: HazardRoute;
};

// State machine phases
export type HazardPhase =
  | 'reveal'           // hazard card shown, no action yet
  | 'draw'             // player draws opening hand
  | 'route-select'     // player chooses top or bottom
  | 'dice-roll'        // dice rolled
  | 'round-play'       // player plays cards
  | 'round-resolve'    // round marked O or X, penalties applied
  | 'between-rounds'   // enchantment effects fire, dice refresh if applicable
  | 'complete';        // hazard over, score computed

// Round result for tracking completed rounds
export type HazardRoundResult = {
  round: number;
  mark: HazardMark;
  progressAchieved: Record<HazardProgressType, number>;
  thresholdRequired: Record<HazardProgressType, number>;
  penaltiesApplied: HazardPenalty[];
};

// Top-level hazard minigame session
export type HazardMinigameState = {
  phase: HazardPhase;
  hazardCard: HazardCard;
  chosenRoute: 'top' | 'bottom' | null;
  playerChoiceProgressType: HazardProgressType | null; // H07 player-choice mechanic
  mana: HazardManaDie[];              // 4 dice; persist entire hazard
  deck: string[];                     // card IDs in draw order
  hand: string[];                     // current hand (up to 5)
  discard: string[];                  // played / discarded cards
  enchantmentZone: string[];          // active ENCHANT cards
  rounds: HazardRoundResult[];        // completed rounds
  currentRound: HazardRoundState | null;
  finalScore: number | null;          // null until hazard ends
};

// RNG function type for deterministic testing
export type HazardRngFunction = () => number;