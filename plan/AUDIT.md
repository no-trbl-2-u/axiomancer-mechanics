# AUDIT.md

> Open findings for `/iterate`. Scored by `impact × ease / 10`.
> `/iterate` picks the top-scoring Pending finding each tick.
> `/oversight` reads this to brief the user.

<!-- Bias line (written by /oversight when set):
> Bias: <category> (set via oversight <date>)
-->

---

## Pending

### [HIGH] Baseline tests red — Phase 10/11 left 4 stale assertions
- category: test-quality
- impact: 9 (`npm test` red on main blocks every other iterate / phase tick — verify gate fails on arrival)
- ease: 8 (mechanical: 1 file shape mismatch, 2 stale value assertions, 1 misuse of a helper signature)
- score: 7.2
- failures:
  - `src/Game/e2e/game.loop.engine.test.ts:116` — round-trip snapshot omits `moralMeter` + `rngState` added in Phase 10/11.
  - `src/Game/e2e/game.loop.engine.test.ts:131` — Phase 11 made `SAVE_GAME` stamp `rngState`, no longer strict-equal to input.
  - `src/Game/e2e/moral.meter.engine.test.ts:100` — friendship-victory test relies on `TidepoolCrab` (aggressive AI) to mutually defend; needs to seed `friendshipCounter` directly.
  - `src/Game/e2e/moral.meter.engine.test.ts:147` — kindChoice block missing the `currency = 50` setup line; also `beforeEach` calls `mockFixedRng(0.5)` with a non-array (helper signature changed but caller didn't).
- next: ship test fixes only; do not touch reducer purity / SAVE_GAME rngState design (deeper finding to file separately).

### [MED] ESLint config broken — `npm run lint` fails
- category: test-quality
- impact: 5 (silent static-analysis gap; type-check covers most cases)
- ease: 7 (one-line fix in `eslint.config.mts` to register the plugin)
- score: 3.5
- next: Phase 13 will fix this; `/iterate` can address earlier if no phases pending.
- notes: `@typescript-eslint/no-explicit-any` referenced without plugin
  registration. See `AGENTS.md` Caveats and `plan/bearings.md` Hard Rules.

### [LOW] `Knowledge-Gaps.md` contains open design questions not yet spec'd
- category: spec-gap
- impact: 4 (answers needed before implementation; doesn't block current phases)
- ease: 6 (can be triaged by reading + filing in specs/)
- score: 2.4
- next: `/iterate` pass to move resolved items from Knowledge-Gaps into specs.

### [Z-MED] combat.resolver.ts is 1000 LOC — phase logic unsplit
- category: structure
- impact: 7 (a single file owns six distinct round phases; refactor pays back in every future combat change)
- ease: 3 (must preserve event order across the resolver public contract; risky)
- source: critique (pass-1)
- score: 2.1

### [Z-LOW] Empty committed directory: src/Game/backups/
- category: structure
- impact: 2
- ease: 9
- source: critique (pass-1)
- score: 1.8

### [Z-LOW] Hermetic e2e layout is half-adopted across modules
- category: structure
- impact: 3 (consistency only; tests run regardless)
- ease: 4 (policy decision then mechanical migration)
- source: critique (pass-1)
- score: 1.2

---

## Done

- [x] **[Z-HIGH] NPCs — exported dialogue runtime has no tests** — shipped `src/NPCs/e2e/dialogue.engine.test.ts` (13 cases) at commit `00cda59` (2026-05-13). Drains critique pass-1 finding.
- [x] **[Z-HIGH] Character — zero module-level tests for public API** — shipped `src/Character/e2e/character.engine.test.ts` (16 cases) at commit `8e20626` (2026-05-13). Drains critique pass-1 finding.
- [x] **[Z-MED] docs/npcs.md stale** — rewrote `docs/npcs.md` against the live Spec 08 Q9 surface at commit `1193b19` (2026-05-13). Drains critique pass-1 finding.
- [x] **[Z-MED] Tests use raw `vi.spyOn(Math, 'random')`** — migrated 3 call sites to `mockSequentialRng` and refreshed stale header comments at commit `6b5ea3f` (2026-05-13). Drains critique pass-1 finding.
- [x] **[Z-LOW] Dead code: src/Items/_archive/** — deleted 1,104 LOC plus tsconfig / vitest exclude entries at commit `cdcc630` (2026-05-13). Drains critique pass-1 finding.
