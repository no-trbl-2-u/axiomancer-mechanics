# Testing Standard — Hermetic E2E by Default

> **Audience:** humans and AI agents writing or modifying code in this repo.
>
> **Rule of thumb:** every implementation lands with at least one hermetic
> end-to-end test that exercises the change through the highest-level public
> entry point that touches it. If you can't write one, you must explain why in
> the PR description (and ideally fix the architecture so you can).

---

## What "hermetic" means here

A test is **hermetic** if and only if all three of these hold:

1. **Self-contained.** No disk I/O (use `nullAdapter`), no network, no TTY,
   no subprocess. The test must run in plain `vitest` with no environment
   setup beyond `npm install`.
2. **Deterministic.** No reliance on wall-clock time, real `Math.random`,
   process IDs, or environment variables. Stub `Math.random` via
   `mockAlternatingRng` / `mockFixedRng` from `src/test-utils/rng.ts`. (When
   Spec 11 lands, swap these stubs for the seedable RNG.)
3. **Isolated.** No shared mutable state across tests. `afterEach` restores
   any `vi.spyOn` mocks. Fixtures are deep-cloned by the code under test,
   not by the test.

If a test reads files, opens sockets, depends on the system clock, or fails
intermittently when run in a different order, it is not hermetic. Fix it.

## What "e2e" means here

A test is **end-to-end** if it drives the change through the highest-level
public entry point of its module — *not* through a private helper. The test
asserts on observable state (`CombatState`, `GameState`, return values), not
on intermediate function calls.

Examples of e2e entry points by module:

| Module           | Hermetic e2e entry point                                                             |
| ---------------- | ------------------------------------------------------------------------------------- |
| `Combat`         | `resolveCombatRound` (in `Combat/combat.resolver.ts`) + the `createGameStore` lifecycle |
| `Effects`        | `applyEffect` / `applyTier1CombatEffect` / `tickAllEffects` driving an effect to expiry |
| `Game`           | `createGameStore(nullAdapter, …)` driven through `startCombat` / `updateCombat` / `endCombat` |
| `World`          | World reducer chained through map → node → continent transitions                      |
| `Items`          | Item reducer chained through `addItem` → `useConsumable` → `removeItem`               |
| `Character`      | `createCharacter` → `deriveStats` → `calculateMaxHealth` round-trip                   |
| `Skills` (TBD)   | Once Spec 04 lands: skill resolver invoked through the combat engine                  |

Unit tests for individual helpers are still welcome, but they do not satisfy
the hermetic-e2e requirement on their own.

## What CANNOT be tested hermetically (today)

- **The interactive CLIs** (`combat.cli.ts`, `character.cli.ts`). They own
  display logic and need TTY prompts via `inquirer`. They are exercised by
  the `pexpect`-based Python harness (`npm run combat:auto`) — that is *not*
  hermetic, and is a smoke test, not a substitute for the engine-level
  hermetic e2e tests.
- **`Math.random` seeding** until [Spec 11](../specs/11-rng-seeding-and-test-harness.md)
  ships a seedable PRNG. Until then, stub via the helpers in
  [`src/test-utils/rng.ts`](../src/test-utils/rng.ts).

If your change touches the CLI layer, the hermetic e2e test must target the
underlying engine function (e.g. `resolveCombatRound`) and the CLI must
delegate to that function. Inline math in a CLI file is a code-smell that
blocks hermetic testing — extract it.

---

## File and naming conventions

- **Location:** `src/<Module>/e2e/<feature>.engine.test.ts` for hermetic
  full-flow tests. The `.engine.test.ts` suffix is a fixed marker meaning
  "hermetic e2e suite" — the SUT is whatever public entry point the test
  drives. The engine code itself lives next to the module as
  `<feature>.resolver.ts` (composite orchestrators returning
  `{ state, events }`) or `<feature>.reducer.ts` (single state-shape edits),
  not under `e2e/`.
- **Pure unit tests** stay alongside the source: `src/<Module>/<file>.test.ts`.
- **Fixtures / mocks** live in `*.mock.ts` files, e.g.
  `src/Character/characters.mock.ts`. They must be plain data — no `Math.random`,
  no environment reads.
- **Test utilities** live in [`src/test-utils/`](../src/test-utils/) and are
  excluded from the published build via `tsconfig.json`.

## Required test categories per implementation

For every non-trivial implementation, the e2e file should cover at minimum:

1. **Happy path** — the typical success scenario, end-to-end.
2. **Boundary / win conditions** — every terminal state the change can reach
   (e.g. `combat.resolver.test.ts` covers all three: `friendship`, `player`, `ko`).
3. **Invariants** — properties that must hold throughout (HP ≥ 0, round
   counter monotonic, fixtures unmutated).
4. **Lifecycle integration** — at least one test that drives the change
   through the `createGameStore` lifecycle with `nullAdapter`, asserting no
   disk access (`vi.spyOn(nullAdapter, 'save')`).

## Canonical example

[`src/Combat/e2e/combat.resolver.test.ts`](../src/Combat/e2e/combat.resolver.test.ts)
is the reference implementation. Read it before writing a new e2e test —
its top-of-file comment, its alternating-RNG helper, its three win-condition
suites, and its store-lifecycle suite together demonstrate every property
above. Copy the structure.

---

## Copy-pasteable scaffold

```ts
/**
 * Hermetic E2E Tests — <Module / Feature>
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { afterEach, describe, it, expect, vi } from 'vitest';

import { mockAlternatingRng } from '../../test-utils/rng';
import { Player } from '../../Character/characters.mock';
// import the public entry point under test

afterEach(() => {
    vi.restoreAllMocks();
});

describe('<feature>: happy path', () => {
    it('drives the change through the public entry point', () => {
        mockAlternatingRng();
        // ...arrange, act, assert on observable state...
    });
});

describe('<feature>: invariants', () => {
    it('preserves <invariant> across N steps', () => {
        // ...
    });
});
```

## PR self-check

Before opening a PR, confirm:

- [ ] At least one new (or modified) test under `src/<Module>/e2e/` covers
      the change.
- [ ] The new test runs green via `npm test` — no flakes when run twice.
- [ ] Every randomness source is stubbed (`mockAlternatingRng`,
      `mockFixedRng`, etc.) — no raw `Math.random` in the test.
- [ ] No file I/O, network, or subprocess in the test path.
- [ ] `vi.restoreAllMocks()` (or equivalent) runs in `afterEach`.
- [ ] If the change is CLI-only, the underlying engine logic was extracted
      and tested hermetically; the CLI test was added to the `combat:auto`
      harness if appropriate.
- [ ] `npm run type-check` and `npm test` are clean.

If you cannot satisfy this list, write a one-paragraph "Hermetic-test debt"
note in the PR description explaining why and what would unblock it.
