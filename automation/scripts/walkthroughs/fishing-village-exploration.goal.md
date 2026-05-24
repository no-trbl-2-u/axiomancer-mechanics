# Goal — fishing-village-exploration walkthrough

**Surface under test:** Phase 65 25-node fishing-village grid with
sub-area traversal (Harbor District) + Phase 60 befriendable
placement (MournfulGull at fv-15 gull crag). The walkthrough boots
the Apprentice preset, drives the Map tab through three moves into
the Harbor District dead-end (fv-1 → fv-11 → fv-14 → fv-15), and
exercises the encounter trigger at fv-15 where MournfulGull is
guaranteed (weight-1 pool `fvGullCrag` per `src/World/MapEvents/content.ts:243-254`).

The walkthrough is **demonstration-grade**: the value is exercising
the 25-node grid + the Harbor District sub-area path + the
befriendable encounter trigger. The combat that fires at fv-15 is
**not** graded on outcome — the script issues 2-3 defend rounds
then quits. Apprentice (level 1, baseStats 5/5/5) defending in
heart stance against MournfulGull (level 2, 2/2/4 body/mind/heart)
is safe enough that the walkthrough doesn't risk a death.

**Pass conditions (the agent should verify against the state log +
event stream):**

1. **Bootstrap** records the Apprentice preset (level 1, baseStats
   `{ heart: 5, body: 5, mind: 5 }`, `knownSkills.length === 6` —
   the Tier 1 set).

2. **Three moveToNode records** appear in the state log in order:
   `target: 'fv-11'` → `target: 'fv-14'` → `target: 'fv-15'`. These
   exercise the Harbor District spine off the fv-1 main path
   (fv-1 → fv-11 → fv-14 → fv-15 is the canonical "harbor dead-end"
   per Phase 65's authored grid). The connectedNodes wiring at
   `src/World/Continents/Coastal-Village/maps.ts:344-359` confirms
   each move is reachable.

3. **Encounter triggers at fv-15** — the state log records a
   `resolveMapEvent` action (or equivalent map-event resolution)
   showing `event.kind === 'encounter'` with `event.enemySlug ===
   'mournful-gull'`. The pool `fv-15.encounter` is weight-1 so the
   encounter is deterministic; no RNG variance on the pick.

4. **Combat starts** — a `combat:started` event fires on the JSON
   event stream after the move to fv-15. The enemy snapshot
   should carry `name === 'Mournful Gull'`, level 2, and
   `friendshipReward` (Phase 60 — befriendable).

5. **At least one combatRound** appears in the state log with
   `event.playerAction.action === 'defend'` and
   `event.playerAction.stance === 'heart'`. The script drives 3
   defend rounds; the agent grader accepts any number from 1-3
   (combat may end early if the friendship counter capping fires
   with MournfulGull, which carries `befriendabilityConfig` per
   Phase 68 if authored — the agent grader notes which outcome
   surfaced).

6. **Session exit** — either:
   - **Friendship outcome** — `combat:ended` event with
     `outcome === 'friendship'` (acceptable; the both-defend +
     heart-stance pattern naturally caps with MournfulGull if
     the friendship rounds threshold is reached during the script).
   - **Script exhaustion** — the trailing `tab: quit` action is
     consumed cleanly after combat resolves or while combat is
     still running. `cli:exit` with `reason: 'quit'` or
     `reason: 'scriptExhausted'` both acceptable.

**Fail conditions:**

- Any of the three moveToNode targets returns an "unreachable" /
  "no path" error (would indicate the Phase 65 sub-area connectedNodes
  wiring drifted).
- `resolveMapEvent` at fv-15 returns `{ kind: 'none' }` (would
  indicate the `fvGullCrag` pool isn't auto-registered at startup).
- The `combat:started` event payload doesn't carry
  `enemy.name === 'Mournful Gull'` (would indicate the
  pool's `enemySlug` lookup drifted).
- The CLI exited with `reason: 'error'` for any reason other than
  script exhaustion or quit.

**Diagnostic notes for the agent:**

- This walkthrough is the canonical "tour the Harbor District sub-area"
  demonstration of Phase 65's authored grid. Other sub-areas
  (Inland Streets fv-17 ↔ fv-19; Cliff Path fv-21 → fv-25) are
  candidates for future walkthroughs but ship in separate iterate
  ticks.
- Apprentice's `knownSkills` ships with the Tier 1 set (6 skills);
  Apprentice can technically `skill: liars-echo` during combat for
  variety, but the walkthrough deliberately uses defend-only to
  avoid combat-outcome RNG noise. The Phase 78 audit row for
  `liars-echo` (zero direct test pin) drains via a separate iterate
  commit, not this walkthrough.
- MournfulGull's `friendshipReward` (per Phase 60) — if friendship
  fires, the report carries `xpBonus: 10` + a heart-draught item +
  `alignmentDelta: { outlook: +3 }` (per Phase 69) + `codexEntryUnlocked`
  (per Phase 73, `codex-mournful-gull` "The Catalogue of Slights").
  None of these are *required* to surface for the walkthrough to
  pass — they're bonus visibility if the friendship outcome lands.
- The Phase 80 mechanic shift (skills always-land effects + Tier 2
  debuff target-resist removed) doesn't affect this walkthrough
  directly — Apprentice doesn't cast effect-bearing skills here.
- The walkthrough deliberately does NOT progress to fv-2 onward
  (the canonical Old Marrow interaction at fv-2 is covered by the
  `map-events` walkthrough; the canonical Wet Hound combat at fv-4
  is covered by `skills-in-combat`).
