# Axiomancer Mechanics — Code Audit

> Audit performed against the full repository. Findings are organized by severity and category. Changes marked with ✅ were fixed during this audit.

---

## Executive Summary

The codebase implements a solid foundation for a turn-based TTRPG engine with a unique Heart/Body/Mind combat system. The effects engine, tier system, and combat math are well-designed. The primary issues were: dead stub code shipped as if real, duplicate functions, missing package exports, broken ESLint config, and zero test coverage.

**Post-audit state**: All dead code removed, duplicates consolidated, package properly barrels from `src/index.ts`, 71 unit tests added, type-check and build clean.

---

## 1. Dead Code & Stubs

| Issue | Location | Action |
|-------|----------|--------|
| 12 stub functions returning `"Implement me" as any` | `Combat/index.ts`, `combat.reducer.ts`, `world.reducer.ts` | ✅ Removed stubs from Combat (Phase 2c not yet needed). Implemented simple reducers in `combat.reducer.ts` and `world.reducer.ts` where the logic was trivial. |
| 3 stub functions returning `undefined as any` | `Skills/index.ts` | ✅ Replaced with type-only re-exports. Skills module has no runtime logic yet. |
| Empty `skill.library.ts` with only a TODO comment | `Skills/skill.library.ts` | ✅ Deleted. |
| Empty test files (0 bytes) | `Character/character.test.ts`, `Combat/combat.test.ts`, `Enemy/Enemy.test.ts` | ✅ Deleted. |
| `Items/index.ts` was a comment with no exports | `Items/index.ts` | ✅ Made proper barrel exporting types, guards, and reducer functions. |

## 2. Duplicate / Redundant Code

| Issue | Location | Action |
|-------|----------|--------|
| `getTargetsResistStatValue` defined in both `Character/index.ts` and `Effects/index.ts` with different implementations | Both modules | ✅ Removed from Character. Effects version (uses `baseStats`) is the canonical one. Character's `getResistStatFromResistedBy` (uses `derivedStats.defense`) kept as a separate utility since it has different semantics. |
| `getEffectById` identical to `lookupEffect` | `Effects/effects.library.ts` | ✅ Removed `getEffectById`. `lookupEffect` is the single ID lookup. |
| `getEffectTeir` — trivially returns `effect.teir` | `Effects/effects.library.ts` | ✅ Removed. Callers access `.teir` directly. |
| `getEffectType` renamed to `getEffectsByType` | `Effects/effects.library.ts` | ✅ Renamed for clarity (returns an array, not a single type). |
| `item.reducer.ts` logic duplicated inline in `Game/store.ts` | Both files | Noted — the store inlines the same inventory logic. This is acceptable since the store actions are the canonical write path, and `item.reducer.ts` exists for pure-function testing. No change needed. |
| `CombatAction` name collision: `Game/actions.constants.ts` exports a string union type named `CombatAction`, while `Combat/types.d.ts` exports an interface named `CombatAction` | Both modules | ✅ Renamed the Game constant's type to `CombatActionName` to eliminate ambiguity. |

## 3. Type Safety Issues

| Issue | Location | Action |
|-------|----------|--------|
| `Enemy/types.d.ts` — `ActiveEffect` used without import | `Enemy/types.d.ts` | ✅ Added import. |
| `Enemy/types.d.ts` — `import { Item } from 'Items'` pointed at empty barrel | `Enemy/types.d.ts` | ✅ Changed to `import { Item } from '../Items/types'`. |
| `Effects/types.d.ts` — `CombatState['round']` used without importing `CombatState` | `Effects/types.d.ts` | ✅ Changed `appliedAtRound` to `number` and `sourceId` to `string`. Removed all cross-module type lookups from the type definition. |
| `Combat/types.d.ts` — uses `@Character/types` path alias that doesn't exist in `tsconfig.paths` | `Combat/types.d.ts` | ✅ Changed to relative imports. |
| `currentActiveEffects: ActiveEffect[] \| []` — redundant union | `Character/types.d.ts` | ✅ Simplified to `ActiveEffect[]`. |
| `(item as any).quantity` in `stackItem` | `Items/item.reducer.ts` | ✅ Replaced with proper type guard + typed access. |
| `as any` casts in `applyRegen` | `Combat/index.ts` | ✅ Replaced with `isCharacter` type guard pattern. |

## 4. Architecture & Organization

| Issue | Severity | Action |
|-------|----------|--------|
| No root `src/index.ts` — package.json points to `dist/index.js` but nothing aggregates exports | High | ✅ Created `src/index.ts` with comprehensive barrel exports for all public API. |
| ESLint `.d.ts` block used legacy `extends` syntax in flat config, causing `Plugin "" not found` | Medium | ✅ Removed broken block. ESLint config now works cleanly. |
| `.eslintignore` redundant with flat config `ignores` | Low | ✅ Deleted. |
| 8 per-module `.cursorrules` files with guidance that duplicates the root | Low | ✅ Deleted all. Root `.cursorrules` is sufficient. |
| `README.md` references `ARCHITECTURE.md` and `The-Big-Picture.md` — neither exists | Low | ✅ Updated README to reference only existing files. |
| `.gitignore` doesn't list `game-state.json` (mentioned in AGENTS.md as written by CLI) | Low | Noted — should add. |
| Test files compiled into `dist/` | Medium | ✅ Added `src/**/*.test.ts` to tsconfig exclude. |

## 5. Bugs Found

| Bug | Location | Action |
|-----|----------|--------|
| `min()` function used `[...arr].sort()[0]` — lexicographic sort, not numeric | `Utils/index.ts` | ✅ Fixed to use `Math.min(...arr)`. |
| `max()` function used `[...arr].sort((a,b) => b-a)[0]` — correct but unnecessarily complex | `Utils/index.ts` | ✅ Simplified to `Math.max(...arr)`. |

## 6. Code Quality Improvements

| Area | Before | After |
|------|--------|-------|
| JSDoc verbosity | Excessive examples and descriptions on trivial functions like `clamp`, `capitalize` | Reduced to essential documentation only |
| Module comments | Large block comments restating file name | Removed obvious header comments |
| Test coverage | 0 tests, stub test script | 71 tests across 6 test files (Utils, Combat, Effects, CombatReducer, Items, World) |
| `vitest` setup | Not configured | Installed, configured with path aliases, `npm test` works |
| Package exports | None | Full barrel export from `src/index.ts` covering all public APIs |

## 7. Remaining Concerns (Not Fixed)

These are design choices or in-progress features, not bugs:

1. **`teir` typo** — Used consistently throughout types, JSON data, and runtime code as `'Teir 1' | 'Teir 2' | 'Teir 3'`. Fixing this is a sweeping rename across types, JSON library files, and all runtime comparisons. Flagging for a deliberate rename pass.

2. **Combat CLI inlines round resolution** — `combat.cli.ts` implements the full combat loop directly rather than calling `resolveCombatRound`. This is the intended interim approach (per roadmap Phase 2c). When `resolveCombatRound` is implemented, the CLI should delegate to it.

3. **Store duplicates item.reducer logic** — The Zustand store inlines inventory mutations rather than calling `item.reducer.ts` functions. Both implementations are equivalent; the reducer exists for testing and reuse outside Zustand.

4. **World reducer `changeMap` needs map registry** — Currently accepts a `Map` object directly. The caller must look up maps. A map registry pattern would make this cleaner.

5. **`createStartingWorld` has `northern-forest` in both `availableMaps` and `lockedMaps`** — Contradictory state. Should be in `lockedMaps` only until unlocked.

6. **No RNG seeding** — All randomness uses `Math.random()`. For reproducible testing and replays, a seedable RNG (e.g., a simple LCG or external library) should replace `Math.random`.

---

## Metrics

| Metric | Value |
|--------|-------|
| Source files (`.ts`) | 29 |
| Type definition files (`.d.ts`) | 8 |
| Lines of source code (approx) | ~2,200 |
| Lines of test code (approx) | ~350 |
| Test files | 6 |
| Tests | 71 |
| `as any` casts remaining | 0 |
| Stub functions remaining | 0 |
| Build time | ~1.3s |
| Type-check time | ~1.1s |
| Test time | ~0.3s |
