# Hazard tuning report — 2026-06-16T1259Z

Skill: `/hazard-tuning` (full sweep; `--focus` empty). One numeric change
applied. Verify gate (`npm run verify`) green.

## Headline

The hazard minigame's **X-interaction (hex-convert) draw rate from the
starter bag was below the CDR-0006 target** (36.7% vs ≥40% in a 5-card
hand). The starter bag also leans **direct-progress-heavy** (64% of cards),
which is the flat-round pressure the load-bearing doctrine warns against.

One change applied: `READ THE WIND` (`windread`) starter weight **2 → 3**,
adding a third convert copy to the bag. This lifts convert draw to **48.8%**
(clears the 40% target) and trims direct-progress share to 61.5%, while every
balance-sim cell stays inside its live band.

## Method / evidence harness

The shipped CLI (`npm run hazard`) is **blocked by a pre-existing,
unrelated ts-node compile error** in `src/CLI/game.cli.ts:185`
(`TS2366` — `describeResolvedEvent` switch is non-exhaustive over the
`ResolvedEvent` union). This is outside the hazard tuning surface and is a
structural code fix (T approval). The vitest CLI e2e suite
(`src/CLI/e2e/hazard.cli.engine.test.ts`) still passes, so the engine path
is sound — only the ts-node entrypoint is broken.

Empirical witness used instead: the deterministic Monte-Carlo harness
`src/World/Hazard/hazard.sim.ts` (`simulateHazard`), the same harness the
balance-guard test asserts against. 500 seeded runs per cell, all six
hazards × {safe, risk}.

Note on doc drift: the skill's target table (top-floor 5–7, `computeFinalScore`,
H01/top labels) predates the no-re-cast rebuild. Shipped reality: hazard IDs
are slugs (`cracked-cliff`…), routes are `safe`/`risk`, thresholds are
combined 19–26 (safe) / dual 8–13 (risk), and the live objective function is
the balance-sim band guard in `hazard.balance.sim.test.ts`. Clear-rate maps to
`perfectRate` (skill headroom), not `atLeastOneWinRate` (near-ceiling by design).

## Matrix — before (500 runs/cell)

| hazard | route | win+ | perfect | fail | avgWins |
|---|---|---|---|---|---|
| cracked-cliff | safe | 98.6% | 41.2% | 1.4% | 2.25 |
| cracked-cliff | risk | 87.8% | 10.4% | 12.2% | 1.46 |
| flooded-undercroft | safe | 98.6% | 37.4% | 1.4% | 2.25 |
| flooded-undercroft | risk | 87.6% | 9.4% | 12.4% | 1.47 |
| ashfall-crossing | safe | 97.2% | 28.8% | 2.8% | 2.03 |
| ashfall-crossing | risk | 91.0% | 12.0% | 9.0% | 1.53 |
| famine-march | safe | 98.6% | 41.2% | 1.4% | 2.25 |
| famine-march | risk | 87.8% | 10.4% | 12.2% | 1.46 |
| bandit-hunt | safe | 98.6% | 37.4% | 1.4% | 2.25 |
| bandit-hunt | risk | 87.6% | 9.4% | 12.4% | 1.47 |
| fever-rot | safe | 97.2% | 28.8% | 2.8% | 2.03 |
| fever-rot | risk | 91.0% | 12.0% | 9.0% | 1.53 |

## Matrix — after (`windread` 2→3, 500 runs/cell)

| hazard | route | win+ | perfect | fail | avgWins |
|---|---|---|---|---|---|
| cracked-cliff | safe | 98.6% | 39.8% | 1.4% | 2.26 |
| cracked-cliff | risk | 84.4% | 9.6% | 15.6% | 1.40 |
| flooded-undercroft | safe | 99.8% | 37.6% | 0.2% | 2.26 |
| flooded-undercroft | risk | 85.4% | 7.4% | 14.6% | 1.39 |
| ashfall-crossing | safe | 96.0% | 29.0% | 4.0% | 2.04 |
| ashfall-crossing | risk | 86.4% | 9.8% | 13.6% | 1.44 |
| famine-march | safe | 98.6% | 39.8% | 1.4% | 2.26 |
| famine-march | risk | 84.4% | 9.6% | 15.6% | 1.40 |
| bandit-hunt | safe | 99.8% | 37.6% | 0.2% | 2.26 |
| bandit-hunt | risk | 85.4% | 7.4% | 14.6% | 1.39 |
| fever-rot | safe | 96.0% | 29.0% | 4.0% | 2.04 |
| fever-rot | risk | 86.4% | 9.8% | 13.6% | 1.44 |

All cells in band: safe perfect ∈ [18%, 52%], safe fail ≤ 10%, risk win+
∈ [74%, 97%], risk perfect ∈ [3%, 22%], risk fail ∈ [3%, 25%], risk avgWins
< safe avgWins. Guard test `hazard.balance.sim.test.ts` (25 tests) green.

## Applied change

| File | Card | Field | old → new | Rationale |
|---|---|---|---|---|
| `hazard.content.ts` | `windread` (READ THE WIND) | `weight` | 2 → 3 | X-interaction (convert) starter-bag draw 36.7% → 48.8% (≥40% target); trims direct-progress share 64% → 61.5%. The bag's only hex-counter card; raising it makes hostile-die play a real option in sessions 1–2 per the status-effect-first doctrine. |

Starter-bag class tally after change (26 cards): direct-progress 16, draw 4,
convert 3, recast 3.

## Propose-only (structural — T approval)

1. **Direct-progress share still 61.5% (> 50% doctrine ceiling).** The
   starter bag is dominated by plain FORCE/ESCAPE number cards (16/26). This
   is the flat-round risk in CDR-0006 §Design Tensions and contradicts the
   load-bearing "status effects are the main fun" doctrine. A numeric weight
   re-balance alone cannot fix it without breaking the FORCE/ESCAPE number
   floor the balance sim depends on. Proposed: introduce 1–2 more
   interaction-class cards (convert/recast/burst) into the *starter* roster
   (currently most interaction cards are reward-pool only), then re-band the
   guard test. This is roster composition, not a magnitude tweak — propose-only.

2. **CLI entrypoint compile blocker.** `src/CLI/game.cli.ts:185`
   `describeResolvedEvent` lacks an exhaustive return over `ResolvedEvent`
   (`TS2366`). Pre-existing; blocks `npm run hazard` even though the engine and
   vitest e2e are green. Out of tuning surface — flag for a code fix.

## Known engine gaps (flag only; not tuned around)

| Gap | Shipped state | CDR-0006 doctrine |
|---|---|---|
| Per-round failure penalties | `penaltiesApplied` TODO (`hazard.engine.ts`) | Applied per round on X resolution |
| Spent-dice refresh between rounds | resets all spent | Spent dice should not auto-reset |
| Exhausted-dice reset | unverified | Exhausted reset, spent do not |
| Dual-type risk resolution | single-type check | Both meters required to score O |
| Persistent map benefits | types defined, not wired | H08/H12/H15 emit map events |

The penalty gap means VITAE-drain consequences cannot be measured from sim
outcomes (`failureRate` is the only failure signal); tuning of penalty
magnitudes stays blocked.
