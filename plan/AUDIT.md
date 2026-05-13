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
- next: Phase 13 will fix this; `/iterate` can address earlier if no phases pending
- notes: `@typescript-eslint/no-explicit-any` referenced without plugin
  registration. See `AGENTS.md` Caveats and `plan/bearings.md` Hard Rules.

### [LOW] `game.reducer.ts` is intentionally minimal
- category: spec-gap
- impact: 3 (blocked by Phase 09; not actionable until then)
- ease: 0 (NOT to be addressed by iterate — reserved for Phase 09)
- next: Phase 09

### [LOW] `Knowledge-Gaps.md` contains open design questions not yet spec'd
- category: spec-gap
- impact: 4 (answers needed before implementation; doesn't block current phases)
- ease: 6 (can be triaged by reading + filing in specs/)
- next: `/iterate` pass to move resolved items from Knowledge-Gaps into specs

---

## Done

(Empty — no iterate ticks have run yet.)
