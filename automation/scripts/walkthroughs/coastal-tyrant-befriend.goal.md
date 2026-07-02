# Goal — coastal-tyrant-befriend walkthrough

**Surface under test:** the mercy/befriend ending's CLI plumbing against
the boss — the `COMBAT_OUTCOME_TO_END_COMBAT` mapping
(`mercy → 'friendship'`), and the fact that a befriended boss ALSO
completes the map (mercy is a first-class ending per VISION.md; boss
progression fires on victory OR mercy).

The Phase 68 heart-stance-defend predicate script this walkthrough used
to drive belonged to the removed legacy combat loop. The current script
takes the same organic route as `boss-encounter` (fv-2 loot-cache →
fv-3 rest → fv-4 village → fv-5 gathering → fv-6 boss) and lets the
auto-combat driver fight the Tyrant. **The mercy ending is NOT
policy-reachable against the Tyrant today** (no auto policy satisfies
the befriend gate before the HP race resolves), so this walkthrough
grades on the befriend-capable plumbing being exercised, not on the
mercy outcome landing.

**Pass conditions (the agent should verify against the state log +
event stream):**

1. Bootstrap records the blank level-1 character; the route's five
   `moveToNode` records land on fv-6.
2. At fv-6 the boss encounter fires: `hazardCombat:start` with
   `enemy: 'The Coastal Tyrant'`, later `hazardCombat:end` with any of
   `victory` / `mercy` / `defeat` / `retreat`.
3. An `endCombat` state-log record shows the outcome mapped through the
   fold-back verb table — in particular, IF the outcome was `mercy`,
   the record's outcome is `'friendship'` and a `map:completed` event
   fires exactly as it would for a kill.
4. On `victory` as well: `map:completed` with
   `unlocked: ['northern-forest']`.
5. The session exits cleanly via `quit` (`cli:exit` reason `'quit'`).

**Fail conditions:**

- A `mercy` combat outcome folds back as anything other than
  `'friendship'`.
- A `mercy`/`victory` outcome does NOT complete the map (boss
  progression must treat both as "dealt with").
- No `hazardCombat:start` fires at fv-6.
- The CLI exited with `reason: 'error'`.

**Diagnostic notes for the agent:**

- The mercy path IS deterministic at engine tier: the store-level
  befriend e2e (`src/Game/e2e/befriend.engine.test.ts`) and the
  first-map mercy case in
  `src/Game/e2e/first-map-completability.engine.test.ts` pin it. This
  walkthrough exists to keep the CLI mapping honest, not to win the
  gate.
- Auto policies befriend TRASH foes readily (the status/greedy drivers
  play the Befriend card), so `hazardCombat:end` with `mercy` against
  weaker enemies is normal in sibling walkthroughs.
