# Quickstart — Combat

> Initialize a Hazard-Pattern encounter, play cards across threat
> phases, and read the outcome. For full API reference see
> [`combat.md`](./combat.md).

## Initialize an encounter

```typescript
import { createCharacter, createEnemy, initializeCombatEncounter } from 'axiomancer-mechanics';

const player = createCharacter({ name: 'P', level: 1, baseStats: { body: 4, mind: 4, heart: 4 } });
const enemy = createEnemy({
  id: 'test-foe', name: 'Test Foe', description: 'A sparring partner.',
  level: 1, baseStats: { body: 3, mind: 3, heart: 3 },
  mapName: 'test-map', logic: 'random',
});

// A seed makes the dice/deck deterministic; an explicit deck is optional
// (omit it to auto-build one from the player's cards).
const state = initializeCombatEncounter(player, enemy, /* playerDeck */ undefined, /* seed */ 42);
// state.phase === 'reveal', state.enemy is the SOLE bar (HP), state.hand
// holds the opening 5-card draw, state.threatPhases is the telegraphed
// enemy sequence, state.finalOutcome === null.
```

## Play a turn

Each engine call returns a `CombatTransition` — `{ state, events }` — so
you thread the updated `state` forward and render the typed `events`.

```typescript
import { rollEncounterDice, draftStanceDie, playCombatCard } from 'axiomancer-mechanics';

// 1. Open phase-play and roll this turn's stance dice.
let s = rollEncounterDice(state).state;

// 2. Draft one die as the stance (colours: body=red, mind=blue,
//    heart=purple, wild=gold). The unpicked die converts to Conviction;
//    winning the hidden-stance read grants bonus Conviction.
s = draftStanceDie(s, s.dice[0].id).state;

// 3. Play a card from hand. The die is OPTIONAL — pass its id to POWER
//    the card, or omit it for the free/unpowered version (hazard model).
//    useBottom picks the card's bottom (READ) half.
const entry = s.hand[0];
const played = playCombatCard(s, { uid: entry.uid }, /* useBottom */ false, s.draftedDieId ?? undefined);
s = played.state;
// played.events includes { kind: 'card-played', ... } and any
// { kind: 'effect-landed' } / { kind: 'damage-dealt' } that followed.
```

Status effects are the efficient path to zero: DoT erodes enemy HP far
faster than the deliberately weak basic strike, and control denies the
enemy its telegraphed turn. Stage as many cards as your dice/Conviction
allow before resolving.

## Resolve the phase and tick between phases

```typescript
import { resolveThreatPhase, processBetweenPhases } from 'axiomancer-mechanics';

// Compare effect kinds, fire the enemy's telegraphed threat, mark the
// phase Clear/Overwhelmed.
s = resolveThreatPhase(s).state;

// DoT ticks, durations decrement, hand redraws to 5 for the next phase.
s = processBetweenPhases(s).state;
```

## Subscribe to events

```typescript
for (const event of played.events) {
  switch (event.kind) {
    case 'damage-dealt':
      console.log(`${event.cardId} dealt ${event.amount} to ${event.target}`);
      break;
    case 'effect-landed':
      console.log(`${event.effectId} landed on ${event.target}`);
      break;
    case 'combat-ended':
      console.log(`Combat over: ${event.outcome}`);
      break;
  }
}
```

## Outcomes

Combat ends when the enemy's HP reaches 0, the player falls, or the
player retreats. Read `state.finalOutcome` (or the terminal
`{ kind: 'combat-ended' }` event).

```typescript
import { buildCombatSummary } from 'axiomancer-mechanics';

if (state.finalOutcome) {
  const summary = buildCombatSummary(state);
  // summary.outcome: 'victory' | 'mercy' | 'defeat' | 'retreat'
  // summary.headline, summary.totalDotDamage, summary.directDamage,
  // summary.bestCard, summary.rows (per-card attribution)
}
```

## Mercy / befriend path

Saturating the enemy with control opens a spare/exploit modal
(`state.mercyChoiceActive`, signalled by a `{ kind: 'mercy-opened' }`
event). Resolve it explicitly — sparing ends combat with
`outcome: 'mercy'`, exploiting fires a free heavy strike instead.

```typescript
import { selectEncounterMercyChoice } from 'axiomancer-mechanics';

if (state.mercyChoiceActive) {
  state = selectEncounterMercyChoice(state, 'spare').state; // → 'mercy'
}
```

## Deep-dive

- Full engine + event reference: [`combat.md`](./combat.md)
- Cards & effects: [`quickstart-skills.md`](./quickstart-skills.md)
- End-to-end example: `src/Combat/e2e/hazard-pattern-combat.engine.test.ts`
