# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Axiomancer Mechanics is a TypeScript TTRPG game engine. The repo is an **npm-workspaces monorepo** with three packages:

| Package | Purpose | Published? |
|---|---|---|
| `packages/engine` (`axiomancer-mechanics`) | The library: types, reducers, combat math, effects, persistence adapters. Subpath-exported (e.g. `axiomancer-mechanics/combat`, `axiomancer-mechanics/persistence/node`). Dual ESM + CJS via `tsup`. | yes |
| `packages/cli` (`axiomancer-cli`) | Interactive `inquirer` front-ends (combat, character). Consumes the engine via the package name. | no (private) |
| `packages/automation` | Python combat-tester (`combat-test.py`). | n/a |

See `README.md` for the higher-level architecture and `REORG-PROPOSAL.md` for the rationale behind the layout.

### Key commands

All scripts run from the **workspace root** unless noted.

| Task | Command |
|---|---|
| Build the engine | `npm run build` |
| Type-check both packages | `npm run type-check` |
| Run engine tests (vitest) | `npm test` |
| Watch engine tests | `npm run test:watch` |
| Lint | `npm run lint` |
| Combat CLI | `npm run combat` (rebuilds engine first) |
| Character CLI | `npm run character` (rebuilds engine first) |
| Automated combat tester | `npm run combat:auto` (requires `pip3 install pexpect`) |
| Subpath smoke examples | `npm run examples` (rebuilds engine, then runs ESM + CJS examples) |
| Clean | `npm run clean` |

### Caveats

- **CLI depends on a built engine.** `npm run combat` and `npm run character` first run `npm run build --workspace packages/engine`. If you change engine sources, the CLI scripts pick up the changes automatically; if you start the CLI manually with `ts-node`, build the engine first.
- **CLI prompts are interactive.** Set `COMBAT_NO_DELAY=1` to skip animation delays. For non-interactive testing use the Python tester (`npm run combat:auto`) or drive prompts via `pexpect` / tmux `send-keys`.
- **Test runner** is vitest, scoped to the engine package (71 tests). Tests live in `packages/engine/tests/`, mirroring `src/`. Use alongside `npm run type-check` and `npm run build` for correctness checks.
- **State file**: the combat CLI writes a `game-state.json` in the workspace root via `createNodeAdapter`. The file is gitignored and ephemeral.
- **ESLint config** uses flat config. Lint runs per-workspace. There were historical issues with the `.d.ts` block; that block is no longer present after the rename to `*.ts`.
- **Built artifacts** (`packages/engine/dist/`) are gitignored. Build before publishing or running CJS/ESM examples.

### Public API surface

The engine is consumable from a UI app via subpath imports:

```ts
import { createCharacter } from 'axiomancer-mechanics';                       // root barrel
import { resolveCombatRound } from 'axiomancer-mechanics/combat';             // combat
import { applyEffect } from 'axiomancer-mechanics/effects';                   // effects engine
import { effectsLibrary } from 'axiomancer-mechanics/content/effects';        // bundled content
import { createGameStore } from 'axiomancer-mechanics/store';                 // optional Zustand binding
import { createNodeAdapter } from 'axiomancer-mechanics/persistence/node';    // Node fs (Node-only)
import { createAsyncStorageAdapter } from 'axiomancer-mechanics/persistence/async-storage'; // RN
import { createWebStorageAdapter } from 'axiomancer-mechanics/persistence/web-storage';     // browser
```

The default `axiomancer-mechanics/persistence` barrel only exposes `nullAdapter`, `createMemoryAdapter`, and the `PersistenceAdapter` interface so UI bundlers never see Node's `fs` unless they explicitly opt into the `/node` subpath.
