# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Axiomancer Mechanics is a TypeScript TTRPG game engine (Node.js CLI). No databases, servers, or containers required. See `README.md` for architecture docs.

### Key commands

All commands are in `package.json`:

| Task | Command |
|---|---|
| Build | `npm run build` |
| Type-check | `npm run type-check` |
| Test | `npm test` (vitest) |
| Lint | `npm run lint` |
| Lint + type-check | `npm run check` |
| Combat CLI | `npm run combat` |
| Character CLI | `npm run character` |
| Automated combat test | `npm run combat:auto` (requires `pexpect`: `pip3 install pexpect`) |

### Caveats

- **ESLint config has a pre-existing issue**: `npm run lint` fails with `A configuration object specifies rule "@typescript-eslint/no-explicit-any", but could not find plugin "@typescript-eslint"` because `eslint.config.mts` declares the rule without registering the plugin in the same config object. `npm run type-check` works and is the reliable static analysis check.
- **CLI apps are interactive**: Both `combat` and `character` CLIs use `inquirer` prompts. Set `COMBAT_NO_DELAY=1` to skip animation delays in combat. For automated testing, use the Python automation script (`npm run combat:auto`) or drive prompts via `pexpect`/tmux `send-keys`.
- **Test runner**: `npm test` runs vitest. Use alongside `npm run type-check` and `npm run build` for correctness checks.
- **State file**: The combat CLI writes a `game-state.json` in the project root. This file is gitignored and ephemeral.

### Hermetic E2E testing — REQUIRED

Every implementation must land with at least one **hermetic e2e test** that
drives the change through the highest-level public entry point of its module.
If you cannot, extract logic until you can — or document the
"hermetic-test debt" in the PR description.

**Hermetic** = self-contained (no disk/network/TTY) + deterministic
(`Math.random` stubbed via `src/test-utils/rng.ts`) + isolated
(`vi.restoreAllMocks` in `afterEach`).

- **Standard:** [`docs/testing.md`](./docs/testing.md) (canonical).
- **Reference test:** [`src/Combat/e2e/combat.engine.test.ts`](./src/Combat/e2e/combat.engine.test.ts) (copy its structure).
- **Location:** `src/<Module>/e2e/<feature>.engine.test.ts`. Engine logic
  lives next to it as `*.engine.ts` so CLI files contain UI only.
- **Stub helpers:** `mockAlternatingRng`, `mockFixedRng`, `mockSequentialRng`
  from `src/test-utils/rng.ts`. Do not re-roll your own `vi.spyOn(Math, 'random')`.
- **Verification:** `npm test` green twice + `npm run type-check` clean before
  declaring done.
