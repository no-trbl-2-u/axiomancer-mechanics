# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Axiomancer Mechanics is a TypeScript TTRPG game engine (Node.js CLI). No databases, servers, or containers required. See `README.md` for architecture docs.

This is a **pure game engine library** — it will be consumed by a React Native mobile app. Avoid introducing Node-specific APIs (e.g. `fs`) in the core engine modules. The `src/Game/persistence/node.adapter.ts` is the only intentional Node-specific adapter.

---

### Key commands

All commands are in `package.json`:

| Task | Command |
|---|---|
| Build | `npm run build` |
| Type-check | `npm run type-check` |
| Test | `npm test` (vitest, 71 tests) |
| Lint | `npm run lint` |
| Lint + type-check | `npm run check` |
| Combat CLI | `npm run combat` |
| Character CLI | `npm run character` |
| Automated combat test | `npm run combat:auto` (requires `pexpect`: `pip3 install pexpect`) |

**Always run `npm run type-check` and `npm test` after code changes.** Both must pass before committing.

---

### Caveats

- **ESLint config has a pre-existing issue**: `npm run lint` fails with `Plugin "" not found` due to a flat-config compatibility problem in `eslint.config.mts`. `npm run type-check` works and is the reliable static analysis check. Do not attempt to fix this unless the task explicitly asks for it.
- **CLI apps are interactive**: Both `combat` and `character` CLIs use `inquirer` prompts. Set `COMBAT_NO_DELAY=1` to skip animation delays in combat. For automated testing, use the Python automation script (`npm run combat:auto`) or drive prompts via `pexpect`/tmux `send-keys`.
- **Test runner**: `npm test` runs vitest (71 tests across 6 files). Use alongside `npm run type-check` and `npm run build` for correctness checks.
- **State file**: The combat CLI writes a `game-state.json` in the project root. This file is gitignored and ephemeral.
- **`teir` typo**: The misspelling `teir` (should be `tier`) is used intentionally throughout the codebase — types, JSON files, and runtime checks all use it. Do NOT rename it unless the task explicitly asks for a rename pass.
- **No RNG seeding yet**: All randomness uses `Math.random()`. AX-102 tracks adding a seeded RNG.

---

### Jira integration

The project uses Jira for issue tracking. The MCP server ID is `Atlassian`.

| Key detail | Value |
|---|---|
| Site | `axiomancer.atlassian.net` |
| Cloud ID | `a7fbfd6c-fb3d-4c63-acec-54147274e42d` |
| Project key | `AX` |
| Project name | Axiomancer |

**How to use Jira in tasks:**

- Use `search` or `searchJiraIssuesUsingJql` to find issues relevant to your task before starting work.
- When implementing a story, fetch the issue with `getJiraIssue` to read its **Acceptance Criteria** and **Function Signature** sections — these are the source of truth for what to build.
- After completing a story, transition it to "In Progress" (or "Done" when fully finished) using `transitionJiraIssue`.
- If you discover scope that isn't covered by existing tickets, create a new story using `createJiraIssue` with `projectKey: "AX"`.
- Link related issues with `createIssueLink` using type `"Relates"` or `"Blocks"`.

**Useful JQL queries:**

```
# Current sprint / all open work
project = AX AND status = "To Do" ORDER BY priority DESC

# Work in a specific phase
project = AX AND summary ~ "P1" AND status = "To Do"

# High-priority stories
project = AX AND priority in (High, Highest) AND status = "To Do"

# All epics (phases)
project = AX AND issuetype = Epic ORDER BY created ASC
```

**Epic / Phase structure (AX issues):**

| Epic key | Phase |
|---|---|
| AX-1 through AX-8 | Phase 1 — Effects Engine |
| AX-9 | Phase 5 — Character Progression |
| AX-10 | Phase 6 — Enemy System |
| AX-11 | Phase 7 — World & Exploration |
| AX-12 | Phase 8 — Game Loop |
| AX-13 | Phase 9 — Base Game Content |
| AX-14 | Phase 10 — Testing & Polish |

The roadmap is in `GAME-ROADMAP.md`. Every `[ ]` item in the roadmap corresponds to one or more Jira stories. Use the roadmap for high-level context and Jira for authoritative acceptance criteria.

---

### Source layout

```
src/
  Character/      character.ts, types.d.ts, character.test.ts
  Combat/         index.ts (pure math), combat.reducer.ts, types.d.ts, combat.test.ts
  Effects/        index.ts, effects.library.ts, types.d.ts, effects.test.ts
  Enemy/          enemy.logic.ts, enemy.library.ts, types.d.ts
  Items/          item.reducer.ts, items.library.ts, types.d.ts, items.test.ts
  Skills/         index.ts, types.d.ts
  World/          world.reducer.ts, types.d.ts, world.test.ts
  Game/           game.reducer.ts, store.ts, types.d.ts, persistence/
  CLI/            combat.cli.ts, character.cli.ts
  Utils/          index.ts
  index.ts        Public barrel export for the library
automation/       Python CLI test runner (combat-test.py)
docs/             Per-system reference docs (combat.md, effects.md, character.md)
docs/references/  Source material (fallacies, paradoxes, pantheon, story, Mörk Borg)
```

---

### Code conventions quick-reference

- **File roles**: `*.reducer.ts` → pure `(state, action) => newState`; `*.library.ts` → static data; `*.mock.ts` → test fixtures; `*.cli.ts` → interactive CLI; `*.test.ts` → vitest tests.
- **Naming**: `camelCase` functions/vars, `PascalCase` types, `SCREAMING_SNAKE_CASE` constants. Reducer functions are prefixed with action verbs: `initialize`, `update`, `set`, `add`, `remove`.
- **Immutability**: Never mutate state — always return new objects with spread.
- **Types**: All exported functions must have explicit return types. Use `Pick<T, K>` and `Partial<T>` over new interfaces. Document types with JSDoc `@property`.
- **No `as any`**: The audit cleaned all `as any` casts. Use type guards instead.

---

### Design context for agents

- **Heart > Body > Mind > Heart** (rock-paper-scissors). Heart beats Body, Body beats Mind, Mind beats Heart. This drives `determineAdvantage` and is the foundation of every combat decision.
- **Three tiers of effects**: Tier 1 = guaranteed, stance-locked buffs; Tier 2/3 = probabilistic, resistible debuffs. See `docs/effects.md`.
- **Friendship mechanic**: Enough consecutive defend actions can end combat peacefully. This is a design goal, not a bug.
- **Mörk Borg tone**: Brutal, terse, atmospheric. Combat should be decisive. Failure should be interesting, not just punishing.
- **`teir` is intentional branding** — do not fix the spelling unless explicitly asked.

---

### Known open design questions

See `Knowledge-Gaps.md` for 28 open design questions. Key ones that affect implementation:

- **Attack vs defense rolls** (Q1): Current model is highest roll wins, then winner rolls damage. May change to attack vs AC in a future pass.
- **Stat modifiers from effects not applied at runtime** (Q8): `getActiveEffectModifiers` is not yet implemented. Effects with `statModifiers` in the JSON are documentation-only until that function is built.
- **`teir` spelling** (Q7): Intentional — do not fix without an explicit rename task.
- **Zustand coupling** (Q24): `Game/store.ts` may be extracted to the React Native consumer in a future refactor. Write pure reducer functions first; the store is a convenience wrapper.
