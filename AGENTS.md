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
| Lint | `npm run lint` |
| Lint + type-check | `npm run check` |
| Combat CLI | `npm run combat` |
| Character CLI | `npm run character` |
| Automated combat test | `npm run combat:auto` (requires `pexpect`: `pip3 install pexpect`) |

### Caveats

- **ESLint config has a pre-existing issue**: `npm run lint` fails with `Plugin "" not found` due to a flat-config compatibility problem in `eslint.config.mts` (the `.d.ts` block uses legacy `extends` syntax). `npm run type-check` works and is the reliable static analysis check.
- **CLI apps are interactive**: Both `combat` and `character` CLIs use `inquirer` prompts. Set `COMBAT_NO_DELAY=1` to skip animation delays in combat. For automated testing, use the Python automation script (`npm run combat:auto`) or drive prompts via `pexpect`/tmux `send-keys`.
- **No test framework**: `npm test` is a stub (`exit 1`). The project has no unit test runner configured. Use `npm run type-check` and `npm run build` as the primary correctness checks.
- **State file**: The combat CLI writes a `game-state.json` in the project root. This file is gitignored and ephemeral.
