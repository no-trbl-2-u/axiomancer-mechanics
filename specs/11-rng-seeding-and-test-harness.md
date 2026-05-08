# Spec 11 — RNG Seeding & Test Harness

## Goal

Replace `Math.random()` with a seedable RNG abstraction so any combat run can
be deterministically replayed, and extend the Python combat tester to drive
scripted action sequences and assert on outcomes.

**Success state:** Passing a `seed: 'foo'` to combat produces the same
transcript every time. The Python tester accepts a script file (e.g.
`scripts/mind-mark-stack.txt`) and asserts that, e.g., Mind/Mind/Mind
results in `tier1_mind_mark` reaching intensity 3.

## Why now / dependencies

- **Unblocks:** Spec 02 testing (deterministic round resolver), regression
  tests for any future spec, real CI for the engine.
- **Depends on:** Spec 02 to have a clean entry point for assertions.
  Doable independently of the others; biggest payoff after Spec 02.

## Current state

- All randomness uses `Math.random()` directly:
  - `enemy.logic.ts` (`randomLogic`).
  - `Utils/index.ts` (`randomInt`, `createDieRoll`, `createDie`).
  - Various effect resist rolls.
- `automation/combat-test.py` runs the CLI N times with random / fixed
  inputs and writes logs to `automation/testing-logs/`. It does not seed
  the RNG and does not assert on outputs.
- `package.json` lists no test runner aside from vitest for unit tests.

## Open questions

1. **RNG type.** Pick:
   - (A) Hand-rolled LCG (small, no dep).
   - (B) `seedrandom` npm package.
   - (C) `pure-rand` npm package.
   The audit policy is "don't make up dependency versions" — if you pick
   (B) or (C), I'll install the latest at implementation time.
   > Your answer:

2. **Injection model.** How does seeded RNG reach call sites?
   - (A) `Rng` interface threaded through every function that needs it
     (explicit, verbose).
   - (B) Module-level singleton `setSeed(seed)` mutates a shared instance.
   - (C) Hybrid — a default singleton, with helpers accepting an optional
     `Rng` for tests.
   > Your answer:

3. **CLI seed argument.** Where does the seed live?
   - `npm run combat -- --seed=foo`
   - `COMBAT_SEED=foo npm run combat`
   - Both.
   > Your answer:

4. **Save state seed.** Does the saved game capture the RNG state so
   reload produces the same future rolls? Or is RNG state purely
   in-memory?
   > Your answer:

5. **Scripted-input file format.**
   - (A) Plain text, one action per line: `body attack` / `mind defend`.
   - (B) JSON: `{ seed, actions: ['heart', 'attack', ...] }`.
   - (C) YAML.
   > Your answer:

6. **Assertion model.** Pick a minimal assertion language:
   - (A) Each script ends with `EXPECT effect <id> intensity == N` lines.
   - (B) Embedded `# expect:` comments parsed by the harness.
   - (C) A separate JSON file alongside each script.
   > Your answer:

7. **Effect-state dump format.** Per-round JSON dump? Same line as the
   roll? Side-channel file?
   > Your answer:

## Proposed approach

1. **`Utils/rng.ts`** — `Rng` interface + concrete implementation per Q1;
   `setRng(rng)` / `getRng()` per Q2.
2. **Replace `Math.random()`** call sites with `getRng().random()`. Every
   helper that consumes randomness gets an optional `rng?: Rng` per Q2's
   hybrid model.
3. **Combat CLI seed support** per Q3.
4. **Save state extension** per Q4.
5. **Effect-state dump** per Q7 — emit alongside existing combat log when
   `COMBAT_DEBUG=1` is set.
6. **Python harness extensions:**
   - Accept `--script <path>` to drive scripted inputs per Q5.
   - Accept `--seed <seed>`; pipe through to the CLI.
   - Parse expectations per Q6 and exit non-zero on failure.
7. **Sample regression scripts** — at minimum:
   - Mind × 3 → mark intensity 3.
   - Body × 3 then Mind → Ad Baculum cleared, mark applied.
   - Heart attack on enemy with 1 buff → buff stripped.

## Acceptance checklist

- [ ] All 7 questions answered.
- [ ] Two runs with the same seed produce byte-identical CLI logs (modulo
      timestamps).
- [ ] At least 3 regression scripts pass via `npm run combat:auto`.
- [ ] Save/load preserves the RNG state per Q4 (verified by a save mid-fight
      and reload deterministic outcome).
- [ ] `automation/README.md` updated with the new flags.

## Out of scope

- Migrating the unit tests to use the new RNG (drop-in is enough; no
  rewrites required).
- A full property-testing framework.
