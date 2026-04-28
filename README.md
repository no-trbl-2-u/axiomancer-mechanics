# Axiomancer — Mechanics Engine

Turn-based RPG engine with Heart/Body/Mind combat. Status effects, skills, and enemies are themed around logical fallacies and philosophical paradoxes.

This repository is the game engine — not the final game. It's published as `axiomancer-mechanics` and consumed as a library from a UI application (React Native, web, Electron, …).

---

## Repository layout

```
axiomancer/
├── packages/
│   ├── engine/        ← published as `axiomancer-mechanics` (subpath-exported, dual ESM + CJS)
│   ├── cli/           ← interactive inquirer CLIs (combat, character); consumes the engine
│   └── automation/    ← Python combat-test runner
├── examples/          ← minimal Node-CJS / Node-ESM smoke examples
└── docs/              ← per-system references (combat, effects, character, ...)
```

## Engine surface

`axiomancer-mechanics` is consumable from a UI app via subpath imports:

```ts
// Universal — types, factories, reducers
import { createCharacter, createNewGameState } from 'axiomancer-mechanics';
import { resolveCombatRound } from 'axiomancer-mechanics/combat';
import { applyEffect, lookupEffect } from 'axiomancer-mechanics/effects';
import { effectsLibrary } from 'axiomancer-mechanics/content/effects';

// Optional — Zustand binding (peer-dep)
import { createGameStore } from 'axiomancer-mechanics/store';

// Platform-specific persistence (only one of these per app)
import { createNodeAdapter }         from 'axiomancer-mechanics/persistence/node';
import { createAsyncStorageAdapter } from 'axiomancer-mechanics/persistence/async-storage';
import { createWebStorageAdapter }   from 'axiomancer-mechanics/persistence/web-storage';
```

The default `/persistence` barrel only exposes `nullAdapter`, `createMemoryAdapter`, and the `PersistenceAdapter` interface — so UI bundlers (Metro, Vite, Webpack) never see Node's `fs` unless an app explicitly imports `/persistence/node`.

## Common scripts (workspace root)

| Task | Command |
|---|---|
| Build engine (ESM + CJS) | `npm run build` |
| Type-check both packages | `npm run type-check` |
| Run engine tests | `npm test` |
| Run combat CLI | `npm run combat` |
| Run character CLI | `npm run character` |
| Run subpath smoke examples | `npm run examples` |

## Reference docs

- `GAME-ROADMAP.md` — phased development plan with progress tracking
- `BRAINDUMP.md` — unorganized design ideas
- `AUDIT.md` — code audit and quality assessment
- `REORG-PROPOSAL.md` — rationale and design behind the current repo layout
- `docs/` — per-system references (combat, effects, character)
- `docs/references/` — source material (fallacies, paradoxes, pantheon, story)
