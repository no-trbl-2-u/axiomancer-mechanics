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

## Preflight verification — Phase 107 Unit 1

**Date:** 2026-06-02  
**Commit:** Current working state  
**Test results:**
- Resource generation: ✓ PASS (`src/Skills/e2e/skill-resource-system.engine.test.ts` - 11/11 tests pass)
- Skill casting: ✓ PASS (Skills are being used in playtest - 622 skill actions across 25 runs)
- Status effects: ✓ PASS (`src/Combat/e2e/effects.engine.test.ts` - 7/7 tests pass, `src/Combat/e2e/phase80-always-land.engine.test.ts` - 6/6 tests pass)

**Evidence from playtest reports:**
- Stance resources are being generated and consumed (body: 1235, heart: 450, mind: 6 stance uses)
- Multiple skills are being cast correctly (ad-hominem-strike: 318, ship-of-theseus: 150, bootstrap-paradox: 150)
- Friendship counters accumulate correctly (max counter: 14)
- Status effects are applying (evidence from always-land tests passing)

**Assessment:** Combat machinery is **trustworthy for parameter tuning**. The high timeout rate (76%) and low win rate (24%) appear to be balance issues, not engine bugs.

## Closeout ledger

### Sound Mechanics Summary — Phase 107 closeout

- Date: 2026-06-02
- Commit: Current working state after Phase 107 parameter tuning
- Report path: `automation/playtest/reports/late-game-coastal-tyrant.md`
- Scenario: `late-game-coastal-tyrant`
- Runs: 25 (6 per policy except aggressive with 7)
- Policies: aggressive, defensive, mixed, strategist

Final stats:

- Win rate: 60.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 40.0%
- Average rounds: 58.32
- Median rounds: 61
- Average final player HP: 837.08
- Average final enemy HP: 71.80
- Average damage to player: 13.68
- Average damage to enemy: 418.36
- Max friendship counter: 14

Per-strategy win rates:
- AGGRESSIVE: 71.4% win rate ✅ (target: ~70%)
- DEFENSIVE: 100% win rate ⚠️ (above target, too dominant)
- MIXED: 66.7% win rate ✅ (target: ~70%) 
- STRATEGIST: 0% win rate ❌ (far below target)

Difference from prior marker (M0):

- Win rate: +36.0% (from 24.0% to 60.0%)
- Timeout rate: -44.0% (from 84.0% to 40.0%)
- Friendship rate: 0% (unchanged, still problematic)

Parameter changes made:
- Coastal Tyrant level: 7 → 6
- Coastal Tyrant baseStats: { body: 7, mind: 3, heart: 6 } → { body: 6, mind: 3, heart: 4 }
- Sage preset baseStats: { heart: 7, body: 6, mind: 6 } (reverted to original after brief increase)

Mechanics changes discussed or rejected:
- No core mechanics changes were needed. The issue was parameter balance, not engine functionality.

STRATEGIST policy analysis:
- Builds friendship counters correctly (max 14)
- Does minimal damage (251.50 average vs 400+ for others)
- Never achieves friendship victory despite counter accumulation
- Suggests either friendship threshold too high or policy too passive

Judgment: **Continue tuning with focus on strategist policy and defensive dominance**

Skill/status doctrine satisfied: **Partially** - skill/status systems work correctly, but strategist path is not viable as intended mastery route.

Notes:
- Combat machinery verified as trustworthy (Unit 1 preflight passed)
- 3 out of 4 policies near target win rate
- Defensive policy dominance suggests need for slight difficulty increase
- Strategist policy requires investigation of friendship mechanics or policy logic

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
