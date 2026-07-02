# Goal — skills-in-combat walkthrough

**Surface under test:** skills/cards being played inside a live
Hazard-Pattern combat encounter reached organically from the map. The
old interactive `{"stance"}/{"action":"skill"}` answers drove the
removed legacy combat loop; in scripted mode the game CLI now
auto-resolves encounters through the combat driver (default policy
`status`), whose whole point is playing status-effect cards — the graded
surface is that card/skill plays appear in the combat telemetry.

Script: fv-1 → fv-2 (loot-cache; `{"pick":"delve"}`, `{"pick":"seal"}`)
→ fv-12 (encounter: Salt-Gnaw Rat — auto-combat, NO answers consumed) →
quit.

**Pass conditions (the agent should verify against the state log +
event stream):**

1. Bootstrap records the blank level-1 character.
2. `moveToNode fv-12` → `resolveMapEvent` kind `'encounter'` with the
   Salt-Gnaw Rat.
3. The event stream shows `hazardCombat:start`
   (`policy: 'status'`) and `hazardCombat:end` whose summary carries a
   non-empty per-card attribution (`rows` with card ids/names — e.g.
   Befriend / False Dilemma / Ad Hominem Strike), proving the driver
   played cards rather than only basic strikes.
4. An `endCombat` state-log record follows with the mapped outcome
   (any of victory / friendship / defeat / flee — unseeded run).
5. The session exits cleanly via `quit` (`cli:exit` reason `'quit'`).

**Fail conditions:**

- No `hazardCombat:start` at fv-12 (encounter staged instead of run).
- The combat summary shows zero card rows (the policy degenerated to
  strike-trading — a doctrine smell worth flagging).
- The CLI exited with `reason: 'error'`.

**Diagnostic notes for the agent:**

- For deterministic card-by-card scripting, use the combat CLI
  subcommand directly (`npm run game -- combat --enemy wet-hound
  --script ... --seed N`); this walkthrough pins the map-to-combat
  integration instead.
