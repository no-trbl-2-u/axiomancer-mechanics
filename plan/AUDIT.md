# AUDIT.md

> Open findings for `/iterate`. Scored by `impact × ease / 10`.
> `/iterate` picks the top-scoring Pending finding each tick.
> `/oversight` reads this to brief the user.

<!-- Bias line (written by /oversight when set):
> Bias: <category> (set via oversight <date>)
-->

---

## Pending

### [Z-HIGH] Character — zero module-level tests for public API
- category: tests
- impact: 9 (THE engine entry point; `createCharacter`/`equipItem`/`unequipItem`/`getEquipmentModifiers` carry the public contract)
- ease: 6 (stat derivation + equipment fold-in requires several arrange/assert cycles)
- source: critique (pass-1)
- score: 5.4
- next: add `src/Character/e2e/character.engine.test.ts` exercising createCharacter (stat derivation, starting equipment fold-in, xp threshold) and equip/unequip round-trip.

### [Z-MED] docs/npcs.md is stale — claims "no runtime functions exported"
- category: docs
- impact: 6 (consumers read the doc to discover surface; current wording is actively wrong)
- ease: 9 (single doc edit)
- source: critique (pass-1)
- score: 5.4
- next: rewrite "Public API (current)" to document `getDialogueNode`, `visibleChoices`, `isLeafNode`, `DialogueContext`; reframe "Pending" section against the now-shipped Spec 08 surface.

### [Z-MED] Tests use raw `vi.spyOn(Math, 'random')` instead of test-utils/rng.ts
- category: tests
- impact: 6 (violates locked RNG-stub convention; future refactors of `test-utils/rng.ts` won't propagate)
- ease: 8 (3 call sites, mechanical substitution)
- source: critique (pass-1)
- score: 4.8
- next: replace `vi.spyOn(Math, 'random').mockReturnValue(...)` with `mockFixedRng(...)` in `src/Game/store.encounter.test.ts:48,99` and `src/Game/spec08.e2e.test.ts:38`; update stale comment references in `src/Enemy/loot.ts:9` and `src/Combat/combat.resolver.ts:20`.

### [MED] ESLint config broken — `npm run lint` fails
- category: test-quality
- impact: 5 (silent static-analysis gap; type-check covers most cases)
- ease: 7 (one-line fix in `eslint.config.mts` to register the plugin)
- score: 3.5
- next: Phase 13 will fix this; `/iterate` can address earlier if no phases pending.
- notes: `@typescript-eslint/no-explicit-any` referenced without plugin
  registration. See `AGENTS.md` Caveats and `plan/bearings.md` Hard Rules.

### [Z-LOW] Dead code: src/Items/_archive/ (1,104 LOC, zero references)
- category: dead-code
- impact: 3 (build size + reader confusion only)
- ease: 9 (delete + verify)
- source: critique (pass-1)
- score: 2.7

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
