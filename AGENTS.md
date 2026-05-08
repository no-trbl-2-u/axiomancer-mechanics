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
