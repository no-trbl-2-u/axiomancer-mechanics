# AUDIT.md

> Open findings for `/iterate`. Scored by `impact × ease / 10`.
> `/iterate` picks the top-scoring Pending finding each tick.
> `/oversight` reads this to brief the user.

<!-- Bias line (written by /oversight when set):
> Bias: <category> (set via oversight <date>)
-->

---

## Pending

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
- next: Phase 15 will close this (promoted via oversight 2026-05-14).

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
- next: Phase 16 will close this — direction is "migrate sibling tests into `e2e/`"
  (chosen via oversight 2026-05-14, not "broaden bearings").

---

## Done

- [x] **[MED] `docs/gameloop.md` lags two phases behind the live `GameState` shape** — header listed `GAME_STATE_VERSION = 2` (actual: 4), state shape omitted `moralMeter` (Spec 10) and `rngState` (Spec 11), GameAction union missed `SHIFT_MORAL_METER`, the "reducer is pure" claim no longer held for `SAVE_GAME`'s rngState stamp, and the migration ladder advice still told readers to write `migrateV2toV3` (it already exists). Rewrote shape, action list, purity caveat, and migration section. Shipped at commit `d15298f` (2026-05-13). Impact 6 × Ease 7 / 10 = 4.2.
- [x] **[MED] Stale "Spec 11 / seedable RNG" references in docs and source headers** — Phase 11 shipped the seedable RNG singleton, but `docs/testing.md`, `docs/combat.md`, `docs/skills.md`, `src/Combat/combat.resolver.ts`, `src/Combat/e2e/combat.resolver.test.ts`, and `src/Enemy/enemy.logic.ts` still framed it as future tense. Rewrote each to acknowledge the live `getRng()` pipeline and how the Math-backed test harness now controls it end-to-end. Shipped at commit `0c2ce22` (2026-05-13). Impact 5 × Ease 8 / 10 = 4.0.
- [x] **[MED] README Public API table out of sync with `src/index.ts`** — table omitted entire groups (Skills, NPCs, Combat resolver, RNG) and lagged on Items/Game/World/Enemy/Effects expansions. Rewrote against the live barrel (`src/index.ts`) at commit `69c2cb0` (2026-05-13). Impact 6 × Ease 7 / 10 = 4.2.
- [x] **[HIGH] Baseline tests red — Phase 11 RNG plumbing leak + 4 stale assertions** — root cause: Phase 11's `getRng()` singleton bypassed `Math.random`, so `src/test-utils/rng.ts` mocks no longer controlled production rolls; tests passed by luck and order. Fix: helpers now also `setRng()` a Math-backed singleton so existing `Math.random` spies route to all `getRng().random()` callers; also fixed the 4 stale assertions in `game.loop.engine.test.ts` (snapshot + reducer SAVE_GAME contract) and `moral.meter.engine.test.ts` (friendship-counter seeding + currency setup). Shipped at commit `5626d30` (2026-05-13). 373/373 green.
- [x] **[Z-HIGH] NPCs — exported dialogue runtime has no tests** — shipped `src/NPCs/e2e/dialogue.engine.test.ts` (13 cases) at commit `00cda59` (2026-05-13). Drains critique pass-1 finding.
- [x] **[Z-HIGH] Character — zero module-level tests for public API** — shipped `src/Character/e2e/character.engine.test.ts` (16 cases) at commit `8e20626` (2026-05-13). Drains critique pass-1 finding.
- [x] **[Z-MED] docs/npcs.md stale** — rewrote `docs/npcs.md` against the live Spec 08 Q9 surface at commit `1193b19` (2026-05-13). Drains critique pass-1 finding.
- [x] **[Z-MED] Tests use raw `vi.spyOn(Math, 'random')`** — migrated 3 call sites to `mockSequentialRng` and refreshed stale header comments at commit `6b5ea3f` (2026-05-13). Drains critique pass-1 finding.
- [x] **[Z-LOW] Dead code: src/Items/_archive/** — deleted 1,104 LOC plus tsconfig / vitest exclude entries at commit `cdcc630` (2026-05-13). Drains critique pass-1 finding.
