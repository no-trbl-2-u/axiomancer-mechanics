# Automated Playtest Harness — Pinned Next Steps

Pinned by T after the first harness run. Return here before hiring The Kid or expanding the agentic layer.

## Current branch / commit

- Branch: `feat/automated-playtest-harness`
- Commit at time of pin: `f39f89f feat(playtest): add automated encounter harness`

## Current observed problem

The default scenario:

```bash
npm run playtest
```

runs:

```bash
automation/playtest/scenarios/late-game-coastal-tyrant.json
```

Current report:

```bash
automation/playtest/reports/late-game-coastal-tyrant.md
```

Observed outcome:

- 25 / 25 runs timed out.
- 0% victory.
- 0% defeat.
- 0% friendship.
- `friendship` policy increases `friendshipCounter`, but still does not resolve into friendship before `maxRounds: 30`.
- Aggressive/resource policies damage the enemy but do not end combat by round 30.

## Why this matters

This may indicate one or more of:

- `coastal-tyrant` is too durable for `sage` under current policy behavior.
- The policies are too naive to represent plausible late-game play.
- Friendship eligibility may require conditions the current `friendship` policy does not satisfy.
- `maxRounds: 30` may be too low for this encounter, or the encounter itself may be too slow.
- Enemy defensive behavior may be causing stall loops.
- Skill/resource policy may be selecting available skills but not the highest-leverage ones.
- The harness may need richer instrumentation around damage, defense, friendship thresholds, and enemy state.

## First investigation pass when we return

1. Inspect `coastal-tyrant` stats, logic, friendship requirements, and skill behavior.
2. Inspect `isFriendshipEligible` and friendship counter thresholds/conditions.
3. Inspect the first 1–3 replay seeds from the report, especially:
   - `late-game-coastal-tyrant-v0:1`
   - `late-game-coastal-tyrant-v0:3`
   - `late-game-coastal-tyrant-v0:8`
4. Add report fields for:
   - total player damage dealt
   - total enemy damage dealt
   - damage prevented/defended if available
   - final friendship counter vs required friendship threshold
   - enemy defend count
   - round-by-round hp deltas summary
5. Decide whether to fix:
   - scenario tuning,
   - policy intelligence,
   - encounter balance,
   - friendship visibility/eligibility,
   - or harness metrics.

## Useful commands

```bash
npm run playtest -- --no-json
npm run verify
```

To inspect the generated markdown:

```bash
sed -n '1,220p' automation/playtest/reports/late-game-coastal-tyrant.md
```

## Judge's pinned judgment

Do not expand to Playwright, MCP, or agentic UI playtesting until this timeout is explained. The first arena must produce interpretable evidence before we give it a scout.
