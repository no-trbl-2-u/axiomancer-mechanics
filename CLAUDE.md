# Axiomancer Mechanics — Claude Context

This is a **TypeScript TTRPG mechanics engine** — not a game, but the pure library that powers one. It will be consumed by a React Native mobile app.

---

## Core design

### The trinity
Combat is built on three stat types with rock-paper-scissors advantage:

| Type  | Flavor                        | Beats  |
|-------|-------------------------------|--------|
| Heart | Emotion, willpower, charisma  | Body   |
| Body  | Physical strength, endurance  | Mind   |
| Mind  | Intelligence, reflexes, perception | Heart |

### Theme
Skills are named after **logical fallacies** and **philosophical paradoxes**. Enemies and effects share this flavor. Every mechanic should feel like it belongs in this conceptual space.

### Philosophy (Mörk Borg-influenced)
- Combat is quick and decisive — rounds should resolve fast
- Failure is **interesting**, not just punishing — a miss or a debuff should create drama
- Randomness (d4–d20) is purposeful; dice rolls should feel meaningful
- Stats are weighty; no stat should be a dump stat
- Effect tiers (1 / 2 / 3) model escalating power with clear resist mechanics

---

## Code conventions

### File roles
| Suffix           | Purpose                                         |
|------------------|-------------------------------------------------|
| `index.ts`       | Module exports and pure utility functions       |
| `types.d.ts`     | Type definitions with JSDoc `@property` comments|
| `*.reducer.ts`   | Pure functions: `(state, action) => newState`   |
| `*.library.ts`   | Static data registries                          |
| `*.mock.ts`      | Test fixtures                                   |
| `*.test.ts`      | Unit tests                                      |
| `*.cli.ts`       | CLI presentation layer                          |

### Naming
- `camelCase` — functions and variables
- `PascalCase` — types and interfaces
- `SCREAMING_SNAKE_CASE` — constants
- Reducer functions prefixed with action verbs: `initialize`, `update`, `set`, `add`, `remove`

### Functional patterns
- Reducers are **pure**: `(state, action) => newState` — never mutate state
- Use spread for immutable updates
- Extract calculation logic into separate pure functions
- All exported functions must have explicit return types

---

## Current development phase

**Active: Phase 1 (Effects Engine) wrapping up + Phase 2 (Combat System) in progress.**

Key pending work:
- `removeEffect`, `getActiveEffectModifiers`, `canAct`, `processDamageOverTime`
- `resolveCombatRound` reducer (Phase 2c) — currently wired inline in the CLI
- Tier 2 / 3 status effect proc matrix for combat actions
- Unit test suite (no test runner configured yet — vitest is the plan)

See `GAME-ROADMAP.md` for the full phased plan.

---

## PR review checklist

When reviewing or writing PRs for this repo, verify:

1. **Description has three required sections**: "Future Goals", "How to Use This", "How to Try Out the Code"
2. **Scope discipline**: changes match exactly what the description says — no bundled refactoring
3. **No over-engineering**: no abstractions for single uses, no speculative future-proofing
4. **Game design soundness**: new mechanics have clear player purpose, balance is acknowledged
5. **TTRPG alignment**: Heart/Body/Mind respected, dice randomness is meaningful, effects have thematic flavor
6. **Code conventions**: pure reducers, explicit return types, JSDoc on types, constants named correctly

---

## Running the project

```bash
npm run combat       # interactive combat demo
npm run combat:auto  # automated Python test runner
npm run check        # lint + type-check
npm run build        # compile to dist/
```

No test runner is wired yet. Manual testing is done via the CLI scripts.
