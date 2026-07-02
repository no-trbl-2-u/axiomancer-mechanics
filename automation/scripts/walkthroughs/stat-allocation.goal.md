# Goal — stat-allocation walkthrough

**Surface under test:** the stat surface reachable from the current
game CLI — `devSetStats` rebuilding the character with new base stats
and the Character tab rendering the recomputed derived stats.

The old form of this walkthrough (Sage grinding the Coastal Tyrant for
a level-up, then spending 3 points via the Character-tab Allocate
prompt) drove the removed legacy combat loop. In the current CLI the
Allocate prompt is UNREACHABLE organically: XP from the Hazard-Pattern
fold-back accumulates on `player.experience`, but no code path
dispatches `LEVEL_UP` (the only grantor of `availableStatPoints`), and
`devSetLevel` rebuilds the character with 0 points. Until level-ups are
wired into the fold-back, this walkthrough pins the dev-driven stat
path; the `allocateStatPoint` reducer itself stays covered by
`src/Game/e2e` engine tests.

Script: `{"tab":"dev"}` → `{"action":"set-stats"}` →
`{"heart":8,"body":9,"mind":7}` (one answer — the three number
questions share a single prompt call) → `{"tab":"character"}` →
`{"skillId":"skip"}` (blank characters have learnable tier-1 skills) →
`{"tab":"quit"}`.

**Pass conditions (the agent should verify against the state log +
event stream):**

1. Bootstrap records the blank character (5/5/5).
2. After the DEV step, `player.baseStats` is
   `{ heart: 8, body: 9, mind: 7 }` and derived stats moved with it
   (e.g. `physicalAttack` reflects body 9 on the rendered sheet).
3. The Character tab renders the new stats; no `allocateStatPoint`
   record appears (`availableStatPoints` is 0 throughout).
4. The session exits cleanly via `quit` (`cli:exit` reason `'quit'`).

**Fail conditions:**

- Base stats unchanged after the DEV step.
- The CLI exited with `reason: 'error'`.

**Diagnostic notes for the agent:**

- If a future phase wires XP-threshold level-ups into the combat
  fold-back, restore the organic form: encounter victory → `levelUp` →
  Allocate prompt → three `allocateStatPoint` records. Flag it if you
  see `availableStatPoints > 0` appear organically — that means the
  wiring landed and this goal is stale.
