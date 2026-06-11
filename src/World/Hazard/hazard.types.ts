/**
 * Hazard Minigame — Core Type Definitions
 * 
 * Complete type system for the hazard minigame per TDD specification.
 * Covers dice, cards, rounds, state machine phases, and integration types.
 */

// Progress types — exactly two in v2 (mobile alignment)
export type HazardProgressType = 'force' | 'escape';

// Migration note: v0 progress types 'stability' and 'supply' removed in v2
// v0 had four types: 'stability' | 'escape' | 'supply' | 'force'
// v2 only uses: 'force' | 'escape'

// Die colors — exactly four resource colors plus X in v2
export type HazardDieColor = 'red' | 'blue' | 'purple' | 'gold' | 'x';

// Migration note: v0 die colors 'green' and 'yellow' removed in v2
// v0 had: 'red' | 'green' | 'blue' | 'yellow' | 'purple' | 'x'
// v2 only uses: 'red' | 'blue' | 'purple' | 'gold' | 'x'

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
  color: HazardDieColor;   // v2: 6 faces = red, blue, purple, gold, x, x (1/3 hostile)
  state: HazardDieState;
};

// Round mark
export type HazardMark = 'O' | 'X';

// Card rarity
export type HazardCardRarity = 'common' | 'uncommon' | 'rare';

// Card color-to-stats mapping (mobile v2)
export type HazardCardColor = 'red' | 'blue' | 'purple' | 'gold';

// Card verb class (simplified for v2)
export type HazardCardClass =
  | 'direct-progress'
  | 'utility'
  | 'draw'
  | 'conversion'
  | 'recast';

// Mana cost — v2 always exactly one die of own color
export type HazardManaCost = {
  color: HazardDieColor;  // v2: no 'any' color, must match card color exactly
  count: 1;               // v2: always exactly 1 die
};

// Migration note: v0 allowed 'any' color and count > 1
// v2 requires exact color match and count is always 1

// Round state for card effect evaluation (v2)
export type HazardRoundState = {
  round: number;                          // 1-indexed
  progress: Record<HazardProgressType, number>;
  momentum: number;                       // v2: surplus progress carries over
  cardsPlayed: string[];                  // card IDs played this round
  manaCopy: HazardManaDie[];              // snapshot at round start for undo/debug
};

// Migration note: v0 had focusBuffer, v2 has momentum system

// Card effect — evaluated at resolution time
export type HazardCardEffect = (state: HazardRoundState) => HazardRoundState;

// A single action card in the library (v2)
export type HazardActionCard = {
  id: string;
  name: string;
  flavor?: string;
  color: HazardCardColor;                      // v2: cards have explicit color identity
  rarity: HazardCardRarity;
  class: HazardCardClass;
  forceValue: number;                          // v2: every card has force progress
  escapeValue: number;                         // v2: every card has escape progress
  poweredForceValue: number;                   // v2: powered (bottom) action force
  poweredEscapeValue: number;                  // v2: powered (bottom) action escape
  manaCost: HazardManaCost | null;             // v2: single cost or free
  effect?: HazardCardEffect;                   // v2: optional special effect
  weight?: number;                             // v2: for reward pool selection
};

// Migration note: v0 had separate top/bottom actions and enchantment system
// v2 has unified progress values and optional effects

// Reward and penalty types
// v2 Tiered reward system
export type HazardTieredRewards = {
  perfect: HazardReward;        // all rounds succeeded
  complete: HazardReward;       // at least 1 round succeeded
  failure: HazardReward;        // 0 rounds succeeded
};

export type HazardReward = {
  vitae?: number;               // positive = recover, negative = lose
  tokens?: number;              // v2: paradox tokens
  cardOffers?: HazardCardOffer[]; // v2: pick-1-of-3 card offers
  reserveBonus?: number;        // v2: +1 VITAE per unspent non-X die
  cacheReward?: number;         // v2: currency/loot reward
  relicReward?: string;         // v2: item ID
  persistenceEffect?: string;   // Phase 135: world-state modification id
};

export type HazardCardOffer = {
  cards: string[];              // card IDs to choose from (usually 3)
  guaranteedRare?: boolean;     // Perfect outcomes guarantee rare
  skippable?: boolean;          // Perfect outcomes can skip
};

// v2 Tiered penalty system (consequence ladder)
export type HazardTieredPenalties = {
  roundOne: HazardPenalty;      // 1 round lost
  roundTwo: HazardPenalty;      // 2 rounds lost
  roundThree: HazardPenalty;    // 3+ rounds lost
  routePenalty: HazardPenalty;  // applied per failure
};

export type HazardPenalty = {
  vitae?: number;               // negative number = VITAE loss (floors at 1)
  maxVitae?: number;            // max VITAE scar
  tokens?: number;              // lose banked tokens
  hexed?: boolean;              // curse flag for next combat
  deadCard?: string;            // CRACK dead card
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

// Hazard routes (v2 safe/risk system)
export type HazardSafeRoute = {
  type: 'safe';
  combinedThresholds: number[];           // v2: combined FORCE+ESCAPE meter per round
  rewards: HazardTieredRewards;
  penalties: HazardTieredPenalties;
};

export type HazardRiskRoute = {
  type: 'risk';
  forceThresholds: number[];              // v2: dual meters, BOTH required
  escapeThresholds: number[];
  rewards: HazardTieredRewards;
  penalties: HazardTieredPenalties;
};

export type HazardRoute = HazardSafeRoute | HazardRiskRoute;

// Migration note: v0 had single-progress thresholds per route
// v2 has safe (combined) vs risk (dual BOTH-required) meter systems

export type HazardCard = {
  id: string;                   // "H01" through "H03" in v2 tuned set
  name: string;
  scenario: string;
  rounds: number;
  safeRoute: HazardSafeRoute;
  riskRoute: HazardRiskRoute;
};

// Migration note: v0 had top/bottom route, v2 has safe/risk route

// State machine phases (v2)
export type HazardPhase =
  | 'reveal'           // hazard card shown, no action yet
  | 'hand'             // player draws opening hand
  | 'route-select'     // player chooses safe or risk
  | 'cast'             // dice cast once per hazard
  | 'play'             // player plays cards in round
  | 'resolve'          // round resolved, progress checked
  | 'outcome'          // hazard complete, tier determined
  | 'rewards';         // rewards distributed

// Migration note: v2 removes 'between-rounds' phase (no dice refresh)
// v2 adds 'outcome' and 'rewards' phases for tiered system

// Round result for tracking completed rounds (v2)
export type HazardRoundResult = {
  round: number;
  mark: HazardMark;
  progressAchieved: Record<HazardProgressType, number>;
  thresholdRequired: Record<HazardProgressType, number> | number; // v2: safe=number, risk=Record
  succeeded: boolean;
  momentum: number;                                                // v2: surplus carried over
};

// Top-level hazard minigame session (v2)
export type HazardMinigameState = {
  phase: HazardPhase;
  hazardCard: HazardCard;
  chosenRoute: 'safe' | 'risk' | null;
  mana: HazardManaDie[];              // 4 dice; persist entire hazard, no re-cast
  deck: string[];                     // card IDs in draw order
  hand: string[];                     // current hand (up to 5)
  discard: string[];                  // played / discarded cards
  rounds: HazardRoundResult[];        // completed rounds
  currentRound: HazardRoundState | null;
  outcome: HazardOutcome | null;      // v2: tiered outcome instead of score
  sessionSeed: number;                // v2: deterministic RNG seed
};

// v2 outcome system
export type HazardOutcome = 'perfect' | 'complete' | 'failure';

// Migration note: v0 had top/bottom route choice and enchantment zone
// v2 has safe/risk route choice and no enchantments
// v0 had numeric final score, v2 has tiered outcomes

// RNG function type for deterministic testing
export type HazardRngFunction = () => number;