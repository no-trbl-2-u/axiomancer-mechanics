# Axiomancer Balance Ledger

This ledger records balance markers and later sound-mechanics summaries for the Phase 107 fix → playthrough loop.

Purpose:

- Preserve a **marker** before roster-wide tuning begins.
- When workers judge mechanics sound, append a **sound-mechanics summary** comparing that state against the latest marker. Mechanics are sound only when every current strategy reaches the target band, not when the aggregate hides a weak strategy.
- Record final stats so later doctrine is written from evidence rather than memory.

## Required entry shape

Every marker or closeout entry must include:

- date / commit / report path
- scenario(s) and policies
- win rate
- defeat rate
- friendship rate
- timeout rate
- average / median rounds
- average final player HP
- average final enemy HP
- average damage to player
- average damage to enemy
- max friendship counter
- policy-level abnormalities
- status-effect evidence, especially STRATEGIST skill/status planning
- summary difference from the prior marker, when applicable
- next judgment: continue tuning / mechanics sound / discuss mechanics change

## Marker M0 — Phase 107 starting point

- Date: 2026-06-02
- Commit: `264e9a3` (`plan: promote phase 107 difficulty tuning loop`)
- Report path: `automation/playtest/reports/late-game-coastal-tyrant.md`
- Command: `npm run playtest`
- Scenario: `late-game-coastal-tyrant`
- Preset: `sage`
- Enemy: `coastal-tyrant`
- Seed: `late-game-coastal-tyrant-v0`
- Max rounds: 75
- Runs: 25
- Policies: aggressive, defensive, friendship, resource-optimal, random, mixed
- Required future canonical play styles: aggressive, defensive, mixed, strategist

Stats:

- Win rate: 16.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 84.0%
- Average rounds: 70.56
- Median rounds: 75
- Average final player HP: 788.08
- Average final enemy HP: 220.28
- Average damage to player: 32.68
- Average damage to enemy: 495.04
- Max friendship counter: 36

Policy abnormalities:

- Defensive policy wins 100% of its 4 runs.
- Aggressive, friendship, resource-optimal, random, and mixed policies all timeout 100%.
- Friendship policy reaches max counter 36 but never resolves friendship because the HP gate remains unmet; average final enemy HP under friendship policy is 455.
- Enemy action profile is heavily stall-shaped: 716 defends and 634 `skill:achilles-gambit` uses across the aggregate.

Marker judgment:

- Mechanics are **not yet sound for balance doctrine**.
- This marker proves the active failure: combat is not lethal, not resolving, and not enabling mercy/friendship despite substantial counter accumulation.
- Phase 107 must first verify resources / skills / status effects, then tune parameters until the report approaches ~70% win rate without defensive-only dominance.

## Closeout ledger

Append sound-mechanics summaries below this line.

### Template — Sound Mechanics Summary

- Date:
- Commit:
- Report path(s):
- Scenario(s):
- Runs / policies:

Final stats:

- Win rate:
- Defeat rate:
- Friendship rate:
- Timeout rate:
- Average rounds:
- Median rounds:
- Average final player HP:
- Average final enemy HP:
- Average damage to player:
- Average damage to enemy:
- Max friendship counter:

Difference from prior marker:

- Win rate:
- Timeout rate:
- Friendship rate:
- Per-strategy win rates, including AGGRESSIVE / DEFENSIVE / MIXED / STRATEGIST:
- Dominant policy changes:
- Skill/resource/status-effect evidence, including whether STRATEGIST proves the intended mastery path:
- Parameter changes made:
- Mechanics changes discussed or rejected:

Judgment:

- Continue tuning / mechanics sound / discuss mechanics change:
- Skill/status doctrine satisfied? yes / no:
- Notes:
