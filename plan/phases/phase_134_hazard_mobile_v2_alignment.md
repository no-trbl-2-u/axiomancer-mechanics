# Phase 134 — Hazard Mobile v2 Alignment

## Outcome

Replace the Phase 131 / CDR-0006 hazard minigame rules with the mobile v2 rules now proven in `axiomancer-mobile/state/hazard/`, so `axiomancer-mechanics` becomes the package source of truth again and mobile can delete its local mechanics behind issue no-trbl-2-u/axiomancer-mobile#333.

## Source spec

Primary source: `docs/hazard-v2-vs-mechanics-divergence.md`, copied from `axiomancer-mobile/docs/hazard-v2-vs-mechanics-divergence.md` on 2026-06-10.

Related tracking:

- Mechanics extraction issue: no-trbl-2-u/axiomancer-mechanics#154
- Mobile package-consumption issue: no-trbl-2-u/axiomancer-mobile#333
- Existing v0 docs/API: `docs/hazard-minigame.md`, `docs/hazard-minigame-api.md`, `docs/hazard-minigame-prd.md`, `docs/hazard-minigame-tdd.md`, `docs/hazard-minigame-bdd.md`
- Existing implementation: `src/World/Hazard/`
- Mobile extraction source: `../axiomancer-mobile/state/hazard/`

## Doctrine lock

Mobile v2 is the target, not CDR-0006 v0. Preserve the following unless T explicitly overrules:

- Progress types are exactly `force` and `escape`.
- Card/dice colours are exactly `red`, `blue`, `purple`, `gold`; dice also have `x` faces.
- Die faces are six-slot casts: red, blue, purple, gold, x, x.
- Card powering costs exactly one die of the card's own colour; gold requires gold with no substitution.
- Safe route is one combined FORCE+ESCAPE meter.
- Risk route is dual FORCE and ESCAPE meters with BOTH required in the same round.
- Dice do not re-cast between rounds. Spent stays spent. Only live card effects such as SECOND WIND and conversion alter dice state.
- Outcome is tiered: Perfect / Complete / Failure, not O-X score.
- Rewards are tiered and include pick-1-of-3 card offers plus reserve bonus.
- Penalties are applied at claim with the mobile consequence ladder and VITAE floor at 1.
- Momentum carries half surplus, capped at 3, into the next round.
- Enchantments are not part of v2 unless reintroduced by T.

## Implementation units

### Unit 1 — Reconcile type surface

- **Files**: `src/World/Hazard/hazard.types.ts`, `src/World/Hazard/index.ts`, `docs/hazard-minigame-api.md`
- Replace v0 progress/colour/card-class type vocabulary with mobile v2 vocabulary.
- Keep public exports stable where possible, but prefer truthful breaking types over compatibility lies.
- Add migration notes for removed progress types (`stability`, `supply`) and removed colours (`green`, `yellow`, `any`).

### Unit 2 — Port mobile v2 content/data

- **Files**: `src/World/Hazard/hazard.cards.library.ts`, `src/World/Hazard/hazard.hazards.library.ts`
- Use mobile `state/hazard/content.ts` as extraction source.
- Port the 14 starter cards, 6 reward-pool cards, CRACK, and 3 tuned hazards.
- Preserve exact stats, weights, flavor, reward ids, consequence ladder, and tuned thresholds unless tests prove a package-shape-only adjustment is needed.

### Unit 3 — Replace engine semantics

- **Files**: `src/World/Hazard/hazard.engine.ts`, `src/World/Hazard/hazard.dice.ts`, `src/World/Hazard/hazard.cards.ts`, `src/World/Hazard/hazard.deck.ts`
- Implement mobile v2 phase order: reveal → hand → route → cast → play → resolve → outcome → rewards.
- Implement safe combined meter and risk BOTH-required dual meters.
- Implement no-between-round re-cast: spent/exhausted dice persist across rounds.
- Implement SECOND WIND / conversion / draw / CRACK behavior from mobile v2.
- Implement tiered outcomes, reward offers, reserve bonus, and claim-time consequence application hooks.
- Preserve deterministic RNG via explicit RNG/session seed surfaces; no naked `Math.random()`.

### Unit 4 — GameState integration hooks

- **Files**: `src/Game/types.ts`, `src/Game/reducer.ts` or existing hazard integration surface as appropriate, `src/World/MapEvents/resolve-map-event.ts`
- Add first-class support for the mobile-side mappings currently faked with flags where the engine can own them now:
  - banked hazard tokens / token loss;
  - hazard hexed flag / next-combat curse hook if available;
  - max-VITAE scar with recovery placeholder if inn-rest hook is unavailable;
  - cache/relic reward hooks, even if initial implementation maps to currency;
  - hazard damage floor at VITAE 1.
- If a world system is missing, document the adapter seam clearly rather than smuggling mobile-only assumptions into engine code.

### Unit 5 — Rewrite tests around mobile parity

- **Files**: `src/World/Hazard/e2e/hazard.engine.test.ts`, supporting unit tests under `src/World/Hazard/`
- Port or mirror mobile tests from:
  - `state/hazard/__tests__/engine.test.ts`
  - `state/hazard/__tests__/balance.sim.test.ts`
  - `state/e2e/hazard.flow.engine.test.ts`
- Cover at minimum:
  - force/escape-only progress types;
  - six-face dice with two X faces;
  - gold-only payment;
  - safe combined-meter success/failure;
  - risk BOTH-required success/failure;
  - no re-cast across rounds;
  - SECOND WIND and convert-X behavior;
  - Perfect / Complete / Failure tiers;
  - reserve bonus;
  - consequence ladder and VITAE floor;
  - seeded deterministic replay.

### Unit 6 — Documentation and package handoff

- Update all hazard docs to v2 doctrine and remove stale CDR-0006 contradictions.
- Mark `docs/hazard-v2-vs-mechanics-divergence.md` as drained when implementation and tests match.
- Add a short mobile handoff section naming the package exports mobile should consume for no-trbl-2-u/axiomancer-mobile#333.
- Run `npm run verify` and `npm run deploy:check`.

## Verify gate

- `npm run type-check` clean
- `npm test -- --run src/World/Hazard` clean, or the repo's accepted hazard test slice if Vitest path filtering differs
- `npm run verify` clean
- `npm run deploy:check` clean
- Manual grep confirms no live v0 doctrine remains in hazard docs/API except in historical notes
- Public exports are sufficient for mobile to implement no-trbl-2-u/axiomancer-mobile#333 without duplicating rules

## Commit body template

```text
feat(world): Phase 134 — align hazard engine with mobile v2

- Replace CDR-0006 v0 hazard rules with mobile v2 force/escape doctrine
- Port mobile hazard cards, dice, hazards, rewards, penalties, and RNG semantics
- Add hermetic parity coverage for safe/risk routes, no-recast dice, gold-only costs, and tiered outcomes
- Update hazard docs/API and package handoff notes for mobile consumption
```

## Definition of Done

- [ ] `docs/hazard-v2-vs-mechanics-divergence.md` exists in mechanics and every divergence is either implemented or explicitly rejected with rationale.
- [ ] Mechanics hazard implementation matches mobile v2 semantics.
- [ ] Tests prove the no-recast dice economy.
- [ ] Tests prove Safe combined meter and Risk BOTH-required dual meter.
- [ ] Tests prove red/blue/purple/gold/x resource behavior.
- [ ] Docs and API no longer direct implementers toward stale v0 mechanics.
- [ ] Mobile issue #333 can proceed by consuming package exports instead of keeping local mechanics.
