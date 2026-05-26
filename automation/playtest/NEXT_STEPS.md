# Automated Playtest Harness — Pinned Next Steps

Pinned by T after the first harness run. Return here before hiring The Kid or expanding the agentic layer.

## Current branch / commit

- Branch: `feat/automated-playtest-harness`
- Commit at time of pin: `f39f89f feat(playtest): add automated encounter harness`
- Resume pass: battle log capture restored for resolver-driven playtests, richer damage/end-state metrics added, scenario cap raised to `maxRounds: 75`.

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

Observed outcome after resume pass:

- 25 runs at `maxRounds: 75`.
- 44% victory.
- 0% defeat.
- 32% friendship.
- 24% timeout.
- Pure `friendship` policy still times out: it builds sufficient counter, but never lowers The Coastal Tyrant below the HP gate.
- `mixed` and `random` policies can now surface friendship outcomes because they combine damage with later mercy/defend behavior.
- Resolver-driven playtests now preserve `CombatState.log`, so stance/skill-based friendship eligibility can be evaluated outside the reducer dispatch path.

## Why this matters

This may indicate one or more of:

- The Coastal Tyrant's HP gate is not reachable through a passive mercy policy; peaceful resolution currently requires first bringing him low.
- `defensive` still times out in half its runs, suggesting defensive play lacks finishing pressure or mercy transition rules.
- Pure `friendship` policy is useful as a diagnostic negative control, not as a realistic player route.
- Next tuning should decide whether the desired peaceful route is “wound then spare” or “nonviolent patience.”
- Enemy defensive behavior and Achilles Gambit still create long fights; keep watching timeout rate as more scenarios are added.

## Investigation pass completed

1. Inspected `coastal-tyrant` stats, logic, friendship requirements, and skill behavior.
2. Inspected `isFriendshipEligible`; boss friendship requires HP below 40%, heart stance evidence, and 5 both-defend rounds.
3. Restored resolver-side battle log entries so direct harness runs satisfy log-derived eligibility checks.
4. Added report fields for:
   - total player damage dealt
   - total enemy damage dealt
   - average final player HP
   - average final enemy HP
   - max friendship counter
   - per-policy end-state/damage summaries
5. Re-ran the report at `maxRounds: 75` and verified friendship can surface under mixed/random policies.

## Remaining judgment

Decide whether to tune:

- policy intelligence: add an explicit “mercy” policy that damages until the HP gate, then defends in heart;
- encounter balance: reduce Coastal Tyrant durability or defensive stall;
- friendship design: allow nonviolent patience to satisfy the HP gate by some alternate surrender condition;
- report depth: add damage prevented/defended and compact hp-delta traces.

## Useful commands

```bash
npm run playtest -- --no-json
npm run verify
```

Use the file reader or open:

```bash
automation/playtest/reports/late-game-coastal-tyrant.md
```

## Judge's pinned judgment

Do not expand to Playwright, MCP, or agentic UI playtesting until this timeout is explained. The first arena must produce interpretable evidence before we give it a scout.
