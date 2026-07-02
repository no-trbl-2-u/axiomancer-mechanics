# Goal — synergy-skills-chain walkthrough

**Surface under test:** the Phase 66 synergy PAIR acquisition through
the DEV learn-skills pick flow — both `eternal-regress` (the predicate
setter: applies `debuff_confusion`) and `resonance-burst` (the synergy
payoff card) granted in one checkbox pick and rendered on the Skills
tab.

The old form of this walkthrough cast the pair in sequence through the
removed legacy combat loop (`eternal-regress` → confusion →
`resonance-burst` synergy-fired). The in-combat synergy trigger is now
covered at engine tier and by the Hazard-Pattern combat CLI e2e; this
walkthrough pins the CLI-visible half of the chain — the pair existing
together on a character — which is the precondition every synergy play
depends on.

Script: `{"tab":"dev"}` → `{"action":"learn-skills"}` →
`{"mode":"pick"}` → `{"skills":["eternal-regress","resonance-burst"]}`
→ `{"tab":"skills"}` → `{"tab":"quit"}`.

**Pass conditions (the agent should verify against the state log +
event stream):**

1. Bootstrap records the blank character (`knownSkills: []`).
2. After the DEV step, `player.knownSkills` contains BOTH
   `eternal-regress` and `resonance-burst`.
3. The Skills tab renders `Eternal Regress` and `Resonance Burst`.
4. The session exits cleanly via `quit` (`cli:exit` reason `'quit'`).

**Fail conditions:**

- Either skill missing from `knownSkills` / the Skills tab.
- The CLI exited with `reason: 'error'`.

**Diagnostic notes for the agent:**

- The synergy fire itself (`resonance-burst` consuming the standing
  `debuff_confusion`) is asserted hermetically in the skills/cards
  engine tests; a scripted in-combat demonstration would need the
  combat CLI subcommand with a deck containing both cards.
