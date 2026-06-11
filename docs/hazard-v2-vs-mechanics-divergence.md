# Hazard Minigame: Mobile v2 Engine vs `axiomancer-mechanics` — Upstreaming Catalogue

Date: 2026-06-11
Status: Authoritative for the current mobile v2 implementation in `../axiomancer-mobile/state/hazard/`

## Why this document exists

Mobile now carries the living Hazard v2 rules locally because the published `axiomancer-mechanics@0.16.0` Hazard engine still implements the older Phase 131 / CDR-0006 doctrine. This document is the upstreaming checklist for mechanics: every current mobile rule below must be ported into `src/World/Hazard/` or explicitly rejected with rationale before mobile can delete its local engine and consume package exports again.

Primary mobile source files:

- `../axiomancer-mobile/state/hazard/types.ts`
- `../axiomancer-mobile/state/hazard/engine.ts`
- `../axiomancer-mobile/state/hazard/content.ts`
- `../axiomancer-mobile/state/hazard/deck-flags.ts`
- `../axiomancer-mobile/state/hazard/store-actions.ts`
- `../axiomancer-mobile/state/hazard/sim.ts`
- `../axiomancer-mobile/state/hazard/__tests__/engine.test.ts`
- `../axiomancer-mobile/state/hazard/__tests__/balance.sim.test.ts`
- `../axiomancer-mobile/state/e2e/hazard.flow.engine.test.ts`

## Mobile v2 rule surface

### Session flow

- `createHazardSession(seed, deckBag, hazardId)` opens in `route-select`.
- The opening hand is visible before route choice: 5 cards drawn, 0 dice cast.
- Route choice is binding for the whole hazard and casts exactly 4 dice once.
- Phase order: `route-select` → `rolling` → `playing` → `resolve-flash` → `outcome` → `rewards` → `done`.
- The `rolling` phase is an animation/interstitial state; rules begin at `playing`.
- A hazard has 3 rounds in current content.

### Progress and routes

- Progress keys are exactly `force` and `escape`.
- Safe route uses one combined `FORCE + ESCAPE` threshold per round.
- Risk route uses dual per-round thresholds `[force, escape]`; both meters must clear in the same round.
- Marks are still `O` / `X` / `pending`, but final scoring is tiered, not `O - X` arithmetic.

### Dice and powering

- Card/dice colours are exactly `red`, `blue`, `purple`, `gold`.
- Hostile die face is `hex` in code and displayed as `✕` in UI/docs.
- Die faces are six slots: `red`, `blue`, `purple`, `gold`, `hex`, `hex`.
- Four dice are cast once at route selection.
- Dice do not automatically re-cast or refresh between rounds.
- Spent dice stay spent across rounds.
- Hex dice cannot power cards.
- A card can be powered only by exactly one available die of that card's own colour.
- Gold cards require gold dice; no substitution exists.
- Re-powering a staged card with a different matching die frees the previous die.
- Temporary dice created by effects or salvage behave like normal dice and persist until spent or the hazard ends.

### Cards and hand economy

- Starter deck has 14 authored cards with weights; starter draw bag total is 28 card ids.
- Reward pool has 6 cards.
- CRACK is a dead card added by consequence.
- `HAZARD_HAND_SIZE = 5`.
- `HAZARD_PLAY_MAX = 6`.
- Played cards discard at round advance.
- Unplayed hand persists across rounds.
- At round advance, draw back up to 5; if draw effects inflate the hand above 5, keep everything and draw nothing.
- Draw pile refills by shuffling the current deck bag when low.
- Deck bag = implicit starter bag + acquired reward cards + acquired CRACK cards decoded from `GameState.flags`.

### Card rows and utilities

- Non-utility cards have a free row `f/e` and optional powered row `fp/ep`.
- Utility cards contribute 0 progress directly and use effects instead.
- Utility effects are:
  - `draw`: SCOUT AHEAD draws 1 on placement, then 2 more when powered for 3 total.
  - `recast`: SECOND WIND re-rolls only currently available dice; powered use also adds one temporary non-hex mana die.
  - `convert`: converts all available `hex` dice to the card colour; powered use also adds one temporary die of that colour.
- Utility effects fire on placement and/or powered upgrade only once per card tier; unstaging/re-staging does not double-fire.
- CRACK is dead: contributes nothing, cannot be powered, and only clogs the hand unless discarded.

### Trash bin / salvage

- Any hand or staged card can be discarded during `playing`.
- Discarding a staged card refunds its die first.
- Cards with `salvage: { type: 'progress', key, amount }` add progress to `progressBase` for the current round only.
- Cards with `salvage: { type: 'mana' }` conjure a temporary die of the card colour.
- Cards without salvage, including utilities and CRACK, discard for nothing; thinning is the benefit.
- Round advance overwrites `progressBase` with momentum carry, so progress salvage does not persist.

### Momentum and reserves

- Cleared-round surplus carries half into the next round, capped at 3 per carried meter.
- Safe route carry is based on combined surplus and is stored on `carryForce`, with `carryEscape = 0`.
- Risk route carry is computed separately per meter.
- No carry occurs on failed rounds or after the final round.
- On Complete or Perfect, each unspent non-hex die grants +1 VITAE reserve bonus.
- Failure grants no reserve bonus.

### Outcomes, rewards, and consequences

- Outcome tiers:
  - `perfect`: all rounds clear.
  - `complete`: at least one round clears.
  - `failure`: zero rounds clear.
- Perfect safe rewards: `cache`, `vitae`, `token`.
- Perfect risk rewards: `cache`, `relic`, `token`.
- Complete safe rewards: `vitae`.
- Complete risk rewards: `cache` if one win, `cache` + `relic` if two wins.
- Failure grants no rewards and no card offer.
- Non-failure outcomes roll a pick-1-of-3 reward card offer.
- Perfect offers guarantee a rare as the first card and may be skipped.
- Single-win Complete offers have 0% rare chance.
- Non-perfect offers cannot be skipped.
- Consequence ladder by losses:
  - 0 losses: none.
  - 1 loss: `tokens`.
  - 2 losses: `maxhp`, `deadcard`.
  - 3 losses: `minhp`, `maxhp`, `deadcard`, `curse`.
- Route penalty is `penaltyVitae × losses`.
- Claim applies rewards, reserve bonus, consequences, route penalty, and picked card.
- VITAE floors at 1; hazards maim, never kill.

### Current authored content

Cards:

- Red starter: `steps`, `haul`, `grip`, `quarry`.
- Blue starter: `scram`, `runner`, `leap`, `scout`.
- Purple starter: `footing`, `pole`, `windread`, `wind`.
- Gold starter: `oath`, `blessing`.
- Reward cards: `r_grip`, `r_wind`, `r_even`, `r_conv`, `r_oath`, `r_crown`.
- Consequence card: `crack`.

Hazards:

- `cracked-cliff`
  - Safe thresholds: `[19, 21, 23]`, penalty VITAE 2.
  - Risk thresholds: `[[9, 9], [10, 10], [11, 11]]`, penalty VITAE 4.
- `flooded-undercroft`
  - Safe thresholds: `[18, 21, 24]`, penalty VITAE 2.
  - Risk thresholds: `[[8, 10], [9, 11], [10, 12]]`, penalty VITAE 4.
- `ashfall-crossing`
  - Safe thresholds: `[20, 20, 22]`, penalty VITAE 2.
  - Risk thresholds: `[[10, 8], [10, 10], [12, 10]]`, penalty VITAE 4.

Reward/consequence constants:

- `vitae` reward: +6 VITAE.
- `cache` reward: +12 shillings.
- `relic` reward: +20 shillings.
- `minhp` consequence: −8 VITAE.
- `maxhp` consequence: −5 max VITAE, with max VITAE floor 5.

### Mobile-side mappings that need first-class mechanics support

These are live in mobile as best-effort adapters and should become mechanics-owned systems where possible:

- Persistent hazard deck flags: `hazard-card:<cardId>:<n>`.
- Banked token flags: `hazard-token-banked:*`.
- Hexed/curse flag: `hazard-hexed`; combat does not yet consume it.
- Max-VITAE scar recovery: mobile applies the scar, but "until next inn rest" is not wired.
- Cache/relic rewards: currently shillings; a real loot/relic table would be better.
- Out-of-combat death: absent; hazard damage floors VITAE at 1.
- Immediate save on claim: mobile calls `save()` after applying spoils/scars.

## Side-by-side divergence from mechanics v0

- Mechanics v0 has `stability`, `escape`, `supply`, `force`; mobile v2 has only `force`, `escape`.
- Mechanics v0 has red/green/blue/yellow/purple/any-style vocabulary; mobile v2 has red/blue/purple/gold plus hostile `hex`.
- Mechanics v0 has per-route single progress thresholds; mobile v2 has Safe combined and Risk dual BOTH-required thresholds.
- Mechanics v0 refreshes dice between rounds; mobile v2 casts once and preserves spent state.
- Mechanics v0 uses `computeFinalScore = O - X`; mobile v2 uses Perfect/Complete/Failure tiers.
- Mechanics v0 has placeholder/no-op card effects; mobile v2 has live draw/recast/convert/salvage behavior.
- Mechanics v0 has no persistent hazard deck; mobile v2 persists acquired cards through flags.
- Mechanics v0 has typed penalties but incomplete application; mobile v2 applies consequences at claim.
- Mechanics v0 has no store-owned session lifecycle; mobile v2 has a full session slice and claim adapter.

## Upstreaming requirements

Mechanics should port the mobile rules as the new source of truth, not preserve v0 compatibility lies. Required public package surface for mobile issue no-trbl-2-u/axiomancer-mobile#333:

- Session creation with explicit seed, deck bag/current run state, and hazard id.
- Route selection, rolling finish, card staging/unstaging, powering, discard/salvage, round resolve, continue, outcome acknowledge, reward claim.
- Pure deterministic engine transitions suitable for mobile store use and hermetic tests.
- Content exports for hazards, cards, keywords, rewards, consequences, constants, and deck-flag helpers.
- Claim/application helper or explicit adapter contract for GameState rewards/consequences.
- Seeded RNG embedded in session state; no naked `Math.random()` inside pure engine.

## Verification to port or mirror

Mirror the mobile coverage, not the old mechanics expectations:

- `state/hazard/__tests__/engine.test.ts`
  - route-select opens with hand before dice.
  - deterministic seeded sessions.
  - exactly 4 dice on route selection.
  - own-colour powering and gold-only powering.
  - utility effects: draw, recast, convert.
  - no automatic re-cast between rounds.
  - persistent unplayed hand and draw-up-to-5.
  - trash-bin discard and salvage.
  - Safe combined meter.
  - Risk BOTH-required meters.
  - momentum carry.
  - Perfect/Complete/Failure outcomes.
  - reward offers, skip rules, reserve bonus, deck flags.
- `state/hazard/__tests__/balance.sim.test.ts`
  - greedy-bot balance bands over every authored hazard and both routes.
- `state/e2e/hazard.flow.engine.test.ts`
  - store action flow and GameState application at claim.
- `state/e2e/hazard.screen.test.tsx` and `state/presenters/__tests__/hazard.engine.test.ts`
  - UI/presenter contract where relevant to package exports.

## Balance guard bands currently enforced in mobile

The mobile greedy-bot sim uses 300 seeded runs per hazard/route cell.

Safe route:

- at least-one-win rate ≥ 0.90.
- perfect rate between 0.35 and 0.78.
- failure rate ≤ 0.08.

Risk route:

- at least-one-win rate between 0.75 and 0.98.
- perfect rate between 0.08 and 0.35.
- failure rate between 0.03 and 0.25.
- average wins must be lower than Safe for the same hazard.

## Historical notes

- The v2 design descends from the 2026-06-10 Claude Design handoff, especially the four-colour redesign.
- The no-between-round-recast doctrine is user-confirmed and supersedes both the prototype's every-round re-cast and any safe/risk split recast idea.
- Enchantments are not part of current v2.
- Old CDR-0006 docs should be treated as historical until rewritten.
