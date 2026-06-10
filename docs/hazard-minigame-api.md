# Hazard Minigame API Guide

Date: 2026-06-10  
Status: Shipped consumer guide for `axiomancer-mechanics@0.16.0`  
Owner: Mechanics / Mobile integration

## Purpose

This guide is the downstream-consumer document for the Hazard minigame engine. The larger design documents define intent, requirements, architecture, and behavior. This file answers the mobile-facing question: **which package exports drive the minigame, in what order, and what truths must the UI not invent locally?**

Companion source-of-truth documents:

- [`docs/hazard-minigame.md`](./hazard-minigame.md) — accepted CDR/design doctrine.
- [`docs/hazard-minigame-prd.md`](./hazard-minigame-prd.md) — product requirements and success metrics.
- [`docs/hazard-minigame-tdd.md`](./hazard-minigame-tdd.md) — state machine, module layout, and integration notes.
- [`docs/hazard-minigame-bdd.md`](./hazard-minigame-bdd.md) — behavior scenarios mirrored by hermetic tests.

## Package surface

Import Hazard helpers from the top-level package barrel:

```ts
import {
  ACTION_CARD_LIBRARY,
  HAZARD_CARD_LIBRARY,
  STARTER_DECK_CARD_IDS,
  advanceToNextRound,
  computeFinalScore,
  drawOpeningHand,
  getActionCard,
  getHazardCard,
  getRandomHazardCard,
  initializeHazard,
  playCardInRound,
  resolveRound,
  rollDiceAndStartRound,
  selectRoute,
  type HazardActionCard,
  type HazardCard,
  type HazardDieColor,
  type HazardManaDie,
  type HazardMinigameState,
  type HazardPhase,
  type HazardProgressType,
  type HazardRoundResult,
} from 'axiomancer-mechanics';
```

The deeper `src/World/Hazard` path is not a supported package import. Mobile should use the top-level barrel.

## Engine-owned state machine

The legal phase order is:

```text
reveal
  -> route-select
  -> dice-roll
  -> round-play
  -> round-resolve / between-rounds
  -> round-play ...
  -> complete
```

The public helper sequence is:

```ts
const hazardCard = getHazardCard('H01') ?? getRandomHazardCard(rng);

let hazard = initializeHazard(
  hazardCard,
  STARTER_DECK_CARD_IDS,
  rng,
);

hazard = drawOpeningHand(hazard, rng);
hazard = selectRoute(hazard, 'top');
hazard = rollDiceAndStartRound(hazard, rng);

hazard = playCardInRound(hazard, hazard.hand[0], false); // top action
hazard = resolveRound(hazard);

if (hazard.phase === 'between-rounds') {
  hazard = advanceToNextRound(hazard, rng);
}

if (hazard.phase === 'complete') {
  hazard = computeFinalScore(hazard);
}
```

Each helper validates the current phase and throws if the caller drives the state machine out of order. UI should treat those errors as presenter bugs, not recoverable player actions.

## Core UI contract

Mobile should render these engine-owned fields directly:

- `hazard.phase` — which screen/control state is legal.
- `hazard.hazardCard` — scenario copy, route definitions, round count, rewards, penalties.
- `hazard.hand` — action-card ids in the current hand.
- `hazard.mana` — persistent dice board.
- `hazard.currentRound?.progress` — accumulated typed progress this round.
- `hazard.currentRound?.focusBuffer` — pending Focus bonus before the next progress card.
- `hazard.rounds` — completed `O` / `X` ledger.
- `hazard.finalScore` — final `O - X` score after completion.

Mobile may derive display labels, colors, animations, and affordance hints, but it must not simulate route thresholds, dice legality, scoring, card effects, or hand/discard/enchantment movement separately from the mechanics package.


## Expected mobile playthrough contract

Mobile should stage player intent before resolving a round:

1. Render the compact 5-card hand at the bottom of the screen; avoid horizontal scrolling by shrinking or slightly overlapping cards.
2. Tapping a card opens readable details and keyword explanations.
3. Dragging a card into the play area stages it; the play area should support up to 6 staged cards.
4. Tapping a staged card unstages it and returns it to the hand.
5. Dragging a die onto a staged card assigns the single mana needed for that card's bottom action. No card should require more than 1 mana.
6. The progress presenter previews staged values before state resolution.
7. The **Play** button commits the staged cards and calls the engine helpers in legal order.
8. After round resolution, remaining hand cards are discarded, played cards move to discard/enchantment zones, a new 5-card hand is drawn for the next round, and the round ledger updates.

The mechanics package remains the rule owner. The staging surface is mobile intent; it must not mutate or invent card effects before the Play confirmation dispatches engine actions.

## Hazard card display

A `HazardCard` has:

```ts
type HazardCard = {
  id: string;
  name: string;
  scenario: string;
  rounds: number;
  topRoute: HazardRoute;
  bottomRoute: HazardRoute;
};
```

Display both routes before the player chooses:

- **Top route:** safer, easier target, lower reward.
- **Bottom route:** harder target, greedier reward, sharper failure risk.

A route has a progress type and per-round thresholds. The active threshold is chosen from `roundThresholds[currentRound - 1]`.

## Action card display

A `HazardActionCard` has:

```ts
type HazardActionCard = {
  id: string;
  name: string;
  rarity: HazardCardRarity;
  class: HazardCardClass;
  progressType?: HazardProgressType | 'any';
  bottomManaCost: HazardManaCost[];
  isEnchant: boolean;
};
```

Every card has two effects:

- **Top action:** free, usually smaller or safer.
- **Bottom action:** costs mana when `bottomManaCost` is non-empty; stronger, stranger, or persistent.
- **Single-mana law:** no card should expose more than 1 mana cost in v0; mobile may tint compact card stock by that one cost color.

The effect functions themselves are engine data. Mobile should use `playCardInRound(state, cardId, useBottomAction)` rather than attempting to run equivalent local card logic.

## Mana dice display

The minigame uses four mana dice. Safe route dice persist as board objects; Risk route dice re-cast between rounds. Each die has a color and a state:

```ts
type HazardManaDie = {
  id: string;
  color: 'red' | 'blue' | 'purple' | 'gold' | 'x'; // x appears on two die faces
  state: 'available' | 'spent' | 'exhausted' | 'discarded' | 'locked' | 'preserved';
  temporary: boolean;
};
```

Important laws:

- `x` is blocked mana by default.
- X dice cannot pay normal costs.
- Only X-interaction card text can make X dice useful.
- Safe route dice persist across rounds as board objects.
- Risk route dice re-cast between rounds; prior spent/exhausted state does not carry into the next advanced round.
- Between-round transitions are engine-owned; mobile must not invent local dice resets.

Mobile affordance guidance:

- Mark `available` dice as spendable.
- Mark `spent`, `exhausted`, `locked`, and `discarded` dice as unavailable.
- Mark `preserved` as carried/kept.
- Render X dice as blocked unless the selected card can legally interact with X.

## Route choice and player-choice routes

Most routes name a concrete `HazardProgressType`:

```ts
type HazardProgressType = 'stability' | 'escape' | 'supply' | 'force';
```

Some routes may use `progressType: 'player-choice'`. In that case, mobile must ask the player which legal progress type they are committing to and pass it into `selectRoute`:

```ts
hazard = selectRoute(hazard, 'bottom', 'escape');
```

Do not infer the chosen type from the first card played. Route commitment is part of the tactical decision.

## Round resolution and score

Each resolved round appends a `HazardRoundResult`:

```ts
type HazardRoundResult = {
  round: number;
  mark: 'O' | 'X';
  progressAchieved: Record<HazardProgressType, number>;
  thresholdRequired: Record<HazardProgressType, number>;
  penaltiesApplied: HazardPenalty[];
};
```

Final scoring is:

```text
count(O) - count(X)
```

Use `computeFinalScore(state)` when the hazard is complete. Do not compute reward tiers locally until the mechanics package exposes the final reward-resolution primitive.

## Current v0 implementation caveats

These are intentional v0 boundaries, not mobile bugs:

- Hazard penalties are represented in types but round penalty application is not yet fully wired.
- Map benefits and map penalties are typed as future integration surfaces, not live world-state mutations.
- Hazard sessions are standalone engine state; no `GameState` reducer action owns a live hazard session yet.
- The CLI/demo surface exists for mechanics validation; mobile should consume package exports, not CLI output.

## Minimal mobile presenter shape

A mobile presenter can stay thin:

```ts
type HazardPresenter = {
  phase: HazardPhase;
  title: string;
  scenario: string;
  routeChoiceVisible: boolean;
  dice: HazardManaDie[];
  hand: HazardActionCard[];
  completedMarks: Array<'O' | 'X'>;
  finalScore: number | null;
};

function presentHazard(state: HazardMinigameState): HazardPresenter {
  return {
    phase: state.phase,
    title: state.hazardCard.name,
    scenario: state.hazardCard.scenario,
    routeChoiceVisible: state.phase === 'route-select',
    dice: state.mana,
    hand: state.hand
      .map(getActionCard)
      .filter((card): card is HazardActionCard => Boolean(card)),
    completedMarks: state.rounds.map((round) => round.mark),
    finalScore: state.finalScore,
  };
}
```

## Verification expectations for consumers

After bumping mobile to a Hazard-capable mechanics version, run:

```bash
npm run typecheck
npm run verify
```

Recommended focused tests:

- presenter maps `phase` to legal UI controls;
- route choice is visible before dice roll;
- X dice render blocked unless X-interaction card affordance is active;
- completed rounds render `O` / `X` in order;
- final score renders only after `computeFinalScore`.

## Design verdict

The Hazard minigame is a tactical card/dice crisis loop. Mechanics owns the rules. Mobile owns legibility, pressure, animation, and player choice. Keep that boundary bright.
