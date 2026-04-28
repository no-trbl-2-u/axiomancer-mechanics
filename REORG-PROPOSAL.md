# Repository Reorganization Proposal

> Goal: ship `axiomancer-mechanics` as a clean, embeddable game-engine library
> that a UI application (React Native, Web, Electron, …) can import — with the
> CLIs, fixtures, and dev tooling clearly separated from the publishable engine.

---

## 1. Why reorganize

The repo today is a hybrid: a library, a CLI app, and a content/tooling
playground living under one `src/` tree. That made sense while bootstrapping,
but it now causes friction whenever the engine is consumed externally.

### Current pain points

| # | Issue | Impact on a UI consumer |
|---|---|---|
| 1 | CLI sources (`src/CLI/`, `inquirer`, `commander`, ANSI helpers) live in `src/` and ship in `dist/`. | UI app pulls Node-only deps and dead bytes. Bundlers (Metro, Vite) trip on `inquirer`. |
| 2 | `Game/persistence/node.adapter.ts` uses `fs` and is exported from `src/index.ts`. | RN/Web bundlers will error on `fs`. The Node adapter must not be on the default surface. |
| 3 | `inquirer` and `commander` are listed as **`dependencies`** in `package.json`, not `devDependencies`. | Forced on every consumer. |
| 4 | `eslint-plugin-typescript` is listed as a **runtime** `dependency`. | Same — forced on consumers. |
| 5 | A single root barrel (`src/index.ts`) re-exports ~70 symbols. No subpath entry points. | Bundlers cannot tree-shake by domain. Cannot lazily import combat without the world reducer. |
| 6 | `package.json` only declares `main` + `types`. No `exports` field, no ESM build. | RN/Vite users get CJS-only; package is not Node 22 ESM compatible. |
| 7 | Path aliases `Character/types`, `Effects/types`, etc. require `tsc-alias` + `tsconfig-paths` at runtime. | Works for the in-repo CLI but couples consumers to our build setup. Mixed with relative imports inconsistently. |
| 8 | `.d.ts` files used as authoring sources (`types.d.ts` next to `.ts`). | TS allows it, but it confuses tooling (`vitest`, `tsc --build`) and breaks the convention that `.d.ts` is generated. |
| 9 | JSON content (`buffs.library.json`, `debuffs.library.json`, …) is imported through the engine. | OK for Node, but RN Metro requires `resolveJsonModule` discipline; preferable to keep content addressable as a separate subpath. |
| 10 | `Combat/index.ts` is ~825 lines and owns: enemy AI dispatch, stat lookups, dice rolls, effects, regen, type guards. | Hard for a UI app to import only “damage math” without dragging in the whole module. |
| 11 | `Game/store.ts` couples Zustand into the public surface. | A UI consumer that already has Redux/Jotai/MobX must take Zustand anyway. Store should be optional. |
| 12 | `Character`, `Combat`, `Effects` cross-import each other’s `types.d.ts` with mixed alias/relative paths. | Latent circular-import risk; awkward to publish as a sub-entry. |
| 13 | Tests, mocks, libraries, reducers, and CLI display code share folders. | Hard to tell what is *engine surface* vs. *content* vs. *fixture*. |
| 14 | `dist/` is committed. | Publish artifacts in version control bloat diffs and risk drift. |

### Goals of the reorg

1. **One importable engine package** that runs unchanged in Node, RN, and the browser.
2. **Subpath entry points** so a UI can `import { resolveCombatRound } from 'axiomancer-mechanics/combat'` without paying for the world or persistence.
3. **Platform adapters as opt-in subpaths** (`/persistence/node`, `/persistence/async-storage`, …) so the default bundle stays platform-neutral.
4. **CLIs and automation as separate workspaces**, not part of the published library.
5. **Content (libraries, mocks) as a separate subpath** so a UI app can rebrand or ship different content without forking the engine.
6. **Dual ESM + CJS build with proper `exports` map** and types for both.
7. **Stable, hand-curated public API** — anything not re-exported from the package root or a subpath barrel is internal.

---

## 2. Proposed layout

A single repo, **npm workspaces**, with the engine cleanly split from CLIs and tooling. (A monorepo with separate published packages is overkill for this stage; workspaces give us the same separation with one `package.json` to publish.)

```
axiomancer/
├── packages/
│   ├── engine/                    ← published as `axiomancer-mechanics`
│   │   ├── src/
│   │   │   ├── index.ts                  (root barrel — re-exports the curated public API)
│   │   │   │
│   │   │   ├── core/                     ← pure primitives, no game knowledge
│   │   │   │   ├── math.ts               (clamp, randomInt, average, sum, min, max, inRange)
│   │   │   │   ├── dice.ts               (createDie, createDieRoll, rollSkillCheck, isCriticalHit/Miss)
│   │   │   │   ├── format.ts             (capitalize, formatPercent)
│   │   │   │   ├── deep-clone.ts
│   │   │   │   ├── rng.ts                (seedable RNG abstraction; Math.random fallback today)
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── character/
│   │   │   │   ├── types.ts              (renamed from .d.ts)
│   │   │   │   ├── stats.ts              (deriveStats, deriveNonCombatStats, calculateMaxHealth/Mana)
│   │   │   │   ├── factory.ts            (createCharacter)
│   │   │   │   ├── resists.ts            (getResistStatFromResistedBy)
│   │   │   │   └── index.ts              (subpath barrel — see §3)
│   │   │   │
│   │   │   ├── enemy/
│   │   │   │   ├── types.ts
│   │   │   │   ├── factory.ts            (createEnemy)
│   │   │   │   ├── stats.ts              (getEnemyRelatedStat)
│   │   │   │   ├── ai/
│   │   │   │   │   ├── random.ts
│   │   │   │   │   └── index.ts          (re-export each AI strategy)
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── effects/
│   │   │   │   ├── types.ts
│   │   │   │   ├── apply.ts              (applyEffect, ApplyEffectOptions)
│   │   │   │   ├── tier1.ts              (applyTier1CombatEffect / WithResult, clearTier1EffectsForType)
│   │   │   │   ├── resistance.ts         (getTargetsResistStatValue)
│   │   │   │   ├── tick.ts               (tickAllEffects, updateEffectDuration, applyRegen)
│   │   │   │   ├── queries.ts            (isEffectApplied, getStudyMarkIntensity, getThornsReflect, …)
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── combat/
│   │   │   │   ├── types.ts
│   │   │   │   ├── advantage.ts          (determineAdvantage, getAdvantageModifier, hasAdvantage)
│   │   │   │   ├── stat-lookup.ts        (getBaseStatForType, getAttackStatForType, getDefenseStatForType, getSaveStatForType)
│   │   │   │   ├── damage.ts             (applyCriticalMultiplier, calculateFinalDamage, applyDamage, healCharacter)
│   │   │   │   ├── flow.ts               (isCombatOngoing, determineCombatEnd, isValidCombatAction, generate*EnemyAction)
│   │   │   │   ├── modifiers.ts          (getActiveRollModifier, removeRandomBuff, extendRandomBuffDuration)
│   │   │   │   ├── reducer.ts            (initializeCombat, updateCombatPhase, setPlayerStance, setPlayerAction, end* reducers)
│   │   │   │   ├── resolve.ts            (resolveCombatRound — Phase 2c)
│   │   │   │   ├── alive.ts              (isAlive, isDefeated, getHealthPercentage)
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── items/
│   │   │   │   ├── types.ts
│   │   │   │   ├── guards.ts             (isEquipment, isConsumable, isMaterial, isQuestItem)
│   │   │   │   ├── reducer.ts            (addItemToInventory, removeItemFromInventory, useConsumable, stackItem)
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── skills/
│   │   │   │   ├── types.ts
│   │   │   │   └── index.ts              (types-only barrel until Phase 3)
│   │   │   │
│   │   │   ├── npcs/
│   │   │   │   ├── types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── world/
│   │   │   │   ├── types.ts
│   │   │   │   ├── factory.ts            (createStartingWorld + map registry)
│   │   │   │   ├── reducer.ts
│   │   │   │   ├── continents/
│   │   │   │   │   └── coastal-village/maps.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── game/
│   │   │   │   ├── types.ts              (GameState root type)
│   │   │   │   ├── constants.ts          (renamed from game-mechanics.constants.ts)
│   │   │   │   ├── actions.constants.ts
│   │   │   │   ├── reducer.ts            (createNewGameState, GAME_STATE_VERSION)
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── store/                    ← OPTIONAL Zustand binding (subpath)
│   │   │   │   ├── create-store.ts       (createGameStore, GameStore, GameActions)
│   │   │   │   ├── selectors.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── persistence/              ← platform adapters (subpaths)
│   │   │       ├── types.ts              (PersistenceAdapter)
│   │   │       ├── null.ts               (nullAdapter — pure JS, safe everywhere)
│   │   │       ├── memory.ts             (in-memory adapter for tests)
│   │   │       ├── node.ts               (createNodeAdapter — Node-only)
│   │   │       ├── async-storage.ts      (RN AsyncStorage — peer-dep)
│   │   │       ├── web-storage.ts        (localStorage / sessionStorage)
│   │   │       └── index.ts              (re-exports null + memory + types ONLY)
│   │   │
│   │   ├── content/                      ← static data, addressable as a subpath
│   │   │   ├── effects/
│   │   │   │   ├── buffs.json
│   │   │   │   ├── debuffs.json
│   │   │   │   └── library.ts            (lookupEffect, getEffectsByType, effectsLibrary)
│   │   │   ├── enemies/
│   │   │   │   └── library.ts
│   │   │   ├── items/
│   │   │   │   ├── consumables.json
│   │   │   │   ├── equipment.json
│   │   │   │   └── library.ts
│   │   │   ├── world/
│   │   │   │   ├── map.library.ts
│   │   │   │   └── quest.library.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── fixtures/                     ← published only as a *subpath* (`/fixtures`)
│   │   │   ├── characters.ts             (Player mock — was Character/characters.mock.ts)
│   │   │   ├── world.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── tests/                        ← *.test.ts mirrors src/, never published
│   │   │   ├── core/
│   │   │   ├── combat/
│   │   │   ├── effects/
│   │   │   ├── items/
│   │   │   └── world/
│   │   │
│   │   ├── package.json                  (the publishable manifest — see §4)
│   │   ├── tsconfig.json
│   │   ├── tsconfig.build.json           (extends, sets composite + declarationDir)
│   │   ├── tsup.config.ts                (or rollup.config.ts — produces ESM + CJS + .d.ts)
│   │   └── README.md                     (engine-specific quickstart)
│   │
│   ├── cli/                              ← *not published*; depends on engine
│   │   ├── src/
│   │   │   ├── combat/
│   │   │   │   ├── combat.cli.ts
│   │   │   │   └── display.ts
│   │   │   ├── character/
│   │   │   │   └── character.cli.ts
│   │   │   └── shared/
│   │   │       └── ansi.ts
│   │   ├── package.json                  (depends on `axiomancer-mechanics`, `inquirer`, `commander`)
│   │   └── tsconfig.json
│   │
│   └── automation/                       ← Python combat tester
│       ├── combat-test.py
│       └── README.md
│
├── docs/                                 ← unchanged; references both engine and CLI
├── examples/                             ← (new) tiny RN/web sample apps consuming engine
│   ├── react-native-minimal/
│   └── web-vite-minimal/
│
├── package.json                          (workspace root)
├── tsconfig.base.json                    (shared compilerOptions)
├── vitest.config.ts                      (shared)
├── eslint.config.mts
└── README.md                             (top-level overview, links to packages/*)
```

### What changes vs. today

| Area | Today | Proposed |
|---|---|---|
| Engine sources | `src/` (mixes engine + CLI) | `packages/engine/src/` (engine only) |
| CLI | `src/CLI/`, shipped in `dist/` | `packages/cli/`, never published |
| Automation | `automation/` at root | `packages/automation/` |
| Content data | `src/Effects/*.json`, `src/Items/*.json`, `src/Enemy/enemy.library.ts` interleaved with logic | `packages/engine/content/`, separately exported |
| Fixtures / mocks | `*.mock.ts` next to source | `packages/engine/fixtures/` exported via `/fixtures` subpath |
| Tests | `*.test.ts` next to source | `packages/engine/tests/` mirroring `src/` (excluded from publish) |
| Persistence | Node fs adapter on default surface | Subpath: `axiomancer-mechanics/persistence/node` (Node-only); default surface only ships `null` + `memory` + types |
| Store | `Game/store.ts` re-exported from root | Subpath: `axiomancer-mechanics/store` (peer-deps `zustand`) |
| Folder casing | PascalCase (`Character/`, `Combat/`) | kebab-case (`character/`, `combat/`) — npm-ecosystem standard, avoids cross-platform case-folding bugs |
| Type files | `types.d.ts` (authored) | `types.ts` (authored). `.d.ts` only as build output. |
| Path aliases | `Character/types`, `Effects/types`, … via `tsc-alias` | Relative paths (`../character/types`) or one alias `~/` for cross-cut imports. No runtime resolver needed. |
| Build | `tsc && tsc-alias` → CJS only | `tsup` (or rollup) → ESM + CJS + `.d.ts`, multiple entry points |
| Published surface | One root barrel | Root + `combat`, `effects`, `items`, `world`, `character`, `enemy`, `store`, `persistence/*`, `content/*`, `fixtures` |

---

## 3. Public API surface (subpath exports)

A UI app should be able to do:

```ts
// Just types & primitives — no Zustand, no fs
import type { Character, CombatState, Effect } from 'axiomancer-mechanics';
import { resolveCombatRound, applyDamage } from 'axiomancer-mechanics/combat';
import { applyEffect, tickAllEffects } from 'axiomancer-mechanics/effects';
import { effectsLibrary } from 'axiomancer-mechanics/content/effects';

// Optional: Zustand binding
import { createGameStore } from 'axiomancer-mechanics/store';

// Optional: Node-only persistence (will fail to bundle in RN — by design)
import { createNodeAdapter } from 'axiomancer-mechanics/persistence/node';

// Optional: RN AsyncStorage adapter (peer-dep on @react-native-async-storage/async-storage)
import { createAsyncStorageAdapter } from 'axiomancer-mechanics/persistence/async-storage';
```

### Proposed entry points

| Subpath | Exposes | Platform |
|---|---|---|
| `axiomancer-mechanics` | Curated re-exports: types, factories, key reducers, constants | universal |
| `…/character` | `createCharacter`, `getResistStatFromResistedBy`, `Character` types | universal |
| `…/enemy` | `createEnemy`, AI strategies, types | universal |
| `…/combat` | All combat math, reducers, `resolveCombatRound`, types | universal |
| `…/effects` | Effect engine (apply/tick/query); **not** the JSON library | universal |
| `…/items` | Item types + guards + inventory reducer | universal |
| `…/world` | World state factory + reducer + types | universal |
| `…/skills` | Types only (until Phase 3) | universal |
| `…/game` | `GameState`, `createNewGameState`, constants, action constants | universal |
| `…/store` | `createGameStore`, selectors, `GameStore`, `GameActions` | universal (peer-deps `zustand`) |
| `…/persistence` | Adapter `interface`, `nullAdapter`, `memoryAdapter` | universal |
| `…/persistence/node` | `createNodeAdapter` | Node only |
| `…/persistence/async-storage` | `createAsyncStorageAdapter` | RN only (peer) |
| `…/persistence/web-storage` | `createWebStorageAdapter` | browser only |
| `…/content` | Aggregate registry helpers | universal |
| `…/content/effects` | `effectsLibrary`, `lookupEffect`, … | universal |
| `…/content/items` | `itemsLibrary`, … | universal |
| `…/content/world` | Map registry, quest library | universal |
| `…/fixtures` | `Player` mock, `world` mock — for examples & tests | universal |

This lets the UI app pick exactly what it needs and lets the engine evolve internally without breaking consumers — only the curated barrels are stable.

---

## 4. `package.json` — proposed publishable manifest

```jsonc
{
  "name": "axiomancer-mechanics",
  "version": "2.0.0",
  "type": "module",
  "sideEffects": false,                    // enables aggressive tree-shaking
  "engines": { "node": ">=18" },

  "main":  "./dist/cjs/index.cjs",         // legacy fallback
  "module":"./dist/esm/index.js",
  "types": "./dist/esm/index.d.ts",

  "exports": {
    ".": {
      "import": { "types": "./dist/esm/index.d.ts",  "default": "./dist/esm/index.js"  },
      "require":{ "types": "./dist/cjs/index.d.cts", "default": "./dist/cjs/index.cjs" }
    },
    "./character": { "import": "./dist/esm/character/index.js", "require": "./dist/cjs/character/index.cjs", "types": "./dist/esm/character/index.d.ts" },
    "./enemy":     { "import": "./dist/esm/enemy/index.js",     "require": "./dist/cjs/enemy/index.cjs",     "types": "./dist/esm/enemy/index.d.ts" },
    "./combat":    { "import": "./dist/esm/combat/index.js",    "require": "./dist/cjs/combat/index.cjs",    "types": "./dist/esm/combat/index.d.ts" },
    "./effects":   { "import": "./dist/esm/effects/index.js",   "require": "./dist/cjs/effects/index.cjs",   "types": "./dist/esm/effects/index.d.ts" },
    "./items":     { "import": "./dist/esm/items/index.js",     "require": "./dist/cjs/items/index.cjs",     "types": "./dist/esm/items/index.d.ts" },
    "./skills":    { "import": "./dist/esm/skills/index.js",    "require": "./dist/cjs/skills/index.cjs",    "types": "./dist/esm/skills/index.d.ts" },
    "./world":     { "import": "./dist/esm/world/index.js",     "require": "./dist/cjs/world/index.cjs",     "types": "./dist/esm/world/index.d.ts" },
    "./game":      { "import": "./dist/esm/game/index.js",      "require": "./dist/cjs/game/index.cjs",      "types": "./dist/esm/game/index.d.ts" },
    "./store":     { "import": "./dist/esm/store/index.js",     "require": "./dist/cjs/store/index.cjs",     "types": "./dist/esm/store/index.d.ts" },
    "./persistence":              { "import": "./dist/esm/persistence/index.js",          "require": "./dist/cjs/persistence/index.cjs",          "types": "./dist/esm/persistence/index.d.ts" },
    "./persistence/node":         { "import": "./dist/esm/persistence/node.js",           "require": "./dist/cjs/persistence/node.cjs",           "types": "./dist/esm/persistence/node.d.ts" },
    "./persistence/async-storage":{ "import": "./dist/esm/persistence/async-storage.js",  "require": "./dist/cjs/persistence/async-storage.cjs",  "types": "./dist/esm/persistence/async-storage.d.ts" },
    "./persistence/web-storage":  { "import": "./dist/esm/persistence/web-storage.js",    "require": "./dist/cjs/persistence/web-storage.cjs",    "types": "./dist/esm/persistence/web-storage.d.ts" },
    "./content":                  { "import": "./dist/esm/content/index.js",              "require": "./dist/cjs/content/index.cjs",              "types": "./dist/esm/content/index.d.ts" },
    "./content/effects":          { "import": "./dist/esm/content/effects/index.js",      "require": "./dist/cjs/content/effects/index.cjs",      "types": "./dist/esm/content/effects/index.d.ts" },
    "./content/items":            { "import": "./dist/esm/content/items/index.js",        "require": "./dist/cjs/content/items/index.cjs",        "types": "./dist/esm/content/items/index.d.ts" },
    "./content/world":            { "import": "./dist/esm/content/world/index.js",        "require": "./dist/cjs/content/world/index.cjs",        "types": "./dist/esm/content/world/index.d.ts" },
    "./fixtures":                 { "import": "./dist/esm/fixtures/index.js",             "require": "./dist/cjs/fixtures/index.cjs",             "types": "./dist/esm/fixtures/index.d.ts" },
    "./package.json": "./package.json"
  },

  "files": ["dist", "README.md", "LICENSE"],

  "peerDependencies": {
    "zustand": "^5",
    "@react-native-async-storage/async-storage": "*"
  },
  "peerDependenciesMeta": {
    "zustand":                                       { "optional": true },
    "@react-native-async-storage/async-storage":     { "optional": true }
  },

  "dependencies": {},

  "devDependencies": {
    "tsup": "^8",
    "typescript": "^5.7",
    "vitest": "^4",
    "@types/node": "^22"
  },

  "scripts": {
    "build":      "tsup",
    "type-check": "tsc -p tsconfig.build.json --noEmit",
    "test":       "vitest run",
    "lint":       "eslint \"src/**/*.ts\""
  }
}
```

Key invariants:
- **Zero runtime `dependencies`.** The engine is pure TypeScript. `zustand` and `@react-native-async-storage/async-storage` move to optional peer-deps, declared only when the consumer opts into the `/store` or `/persistence/async-storage` subpath.
- **`inquirer`, `commander`, ANSI helpers** are only present in `packages/cli/package.json` and never reach the published artifact.
- **`sideEffects: false`** enables tree-shaking for any UI bundler.
- **Dual ESM + CJS** per entry point so both Metro (RN), Vite, Webpack, Next.js, and Node ESM/CJS importers work out of the box.

---

## 5. Build & tooling

| Concern | Today | Proposed |
|---|---|---|
| Bundler | `tsc` + `tsc-alias` (CJS only) | `tsup` driving `esbuild` for ESM+CJS, `tsc` for `.d.ts` emit. Multiple entry points = one config block. |
| Path aliases | `Character/types`, etc. resolved via `tsc-alias` & `tsconfig-paths` at runtime | Removed. All imports are relative inside the package. (Optional `~/` alias kept for cross-cut imports, transformed at build time only.) |
| Authoring extension | `types.d.ts` | `types.ts` (`.d.ts` only as emitted output) |
| `.test.ts` exclusion | `tsconfig` `exclude` | Tests live in a separate folder (`tests/`) outside `src/` so they cannot accidentally end up in `dist/`. |
| ESLint | Flat config has a broken `.d.ts` block | Drop the broken block (already a known caveat). After the rename to `.ts`, the block is no longer needed. |
| `dist/` in git | Yes | No — `.gitignore`d. CI publishes via `npm publish` from a clean build. |
| `game-state.json` | Engine path default | Belongs to the CLI package. Engine ships only `nullAdapter` + `memoryAdapter`; consumers wire their own path. |

---

## 6. Platform / persistence strategy

Today `Game/persistence/node.adapter.ts` is exported from `src/index.ts`. That single line is what makes the package un-bundleable in RN.

Proposal:

1. **Engine root barrel exposes only platform-neutral things**:
   - `PersistenceAdapter` interface
   - `nullAdapter` (no-op)
   - `memoryAdapter` (Map-backed; new — useful for tests and hot reload)
2. **Each platform adapter is its own subpath** (`/persistence/node`, `/persistence/async-storage`, `/persistence/web-storage`) and is the *only* place where platform-specific imports happen (`fs`, `AsyncStorage`, `localStorage`).
3. The store is **always** constructed with an injected adapter:
   ```ts
   const store = createGameStore(memoryAdapter);
   const store = createGameStore(createNodeAdapter('./save.json'));
   const store = createGameStore(createAsyncStorageAdapter('axiomancer:save'));
   ```
4. The Zustand binding itself moves to the `/store` subpath, with `zustand` declared as an **optional peer-dependency**. UI apps that already use Redux/Jotai/MobX can ignore `/store` entirely and call the pure reducers directly (`createNewGameState`, `initializeCombat`, `resolveCombatRound`, …).

---

## 7. Internal module boundaries

The current cross-imports are mostly fine, but a few should change to make subpath bundling clean (and to remove latent cycles):

| From → To | Today | Proposed |
|---|---|---|
| `combat/index.ts` → `Character/index.ts` (`getResistStatFromResistedBy`) | runtime cross-import | Move `getResistStatFromResistedBy` to `effects/resistance.ts` (it’s an effect-resistance helper, not character logic) — already noted in `AUDIT.md` §2 |
| `Effects/index.ts` → `Game/game-mechanics.constants.ts` | runtime cross-import | Constants move under `core/constants.ts` (game-engine constants are a primitive) — `game/` keeps only state-shape constants (`GAME_STATE_VERSION`) |
| `Character/index.ts` → `Items/types`, `Effects/types` | mixed alias/relative | Type-only relative imports across packages; never alias |
| `World/index.ts` → `World/Continents/...` | hardcoded continent registry inside `createStartingWorld` | Move continent maps into `content/world/` and have `createStartingWorld` accept (or look up by name from) the registry — fixes the contradictory state noted in `AUDIT.md` §7.5 |
| Anything → `*.mock.ts` | mocks live next to sources | Mocks move to `fixtures/`, exported only via `/fixtures` subpath |

Rule of thumb: **no module imports from a sibling subpath’s internals** — only from its `index.ts`. This is what makes subpath exports stable.

---

## 8. Migration plan

Phased so the engine never breaks for the in-repo CLI while moving.

### Phase A — Workspaces & folder skeleton (mechanical)
1. Add npm workspaces at the root.
2. Create `packages/engine/`, `packages/cli/`, `packages/automation/` directories.
3. `git mv` `src/CLI/*` → `packages/cli/src/`. Move `inquirer`, `commander`, CLI-only types out of root `package.json` into `packages/cli/package.json`.
4. `git mv` `automation/*` → `packages/automation/`.
5. `git mv` everything else under `src/` → `packages/engine/src/`. `src/index.ts` → `packages/engine/src/index.ts`.
6. Update root `tsconfig.json` to reference per-package configs.
7. Get `npm test` and `npm run combat` working from the workspace root.

### Phase B — Engine internals (file-name and import hygiene)
8. Lower-case all engine folders (`Character/` → `character/`, etc.) — one PR per domain to minimize churn. Use `git mv -f` to preserve history.
9. Rename `*.types.d.ts` → `types.ts` and remove the `.d.ts` block from `eslint.config.mts`.
10. Replace path aliases with relative imports inside the engine. Remove `tsc-alias` / `tsconfig-paths` runtime deps.
11. Move mocks to `packages/engine/fixtures/` and `*.test.ts` to `packages/engine/tests/`. Update `vitest.config.ts`.
12. Move `game-mechanics.constants.ts` → `core/constants.ts`; resolve the `Effects → Game` direction.

### Phase C — Subpath split (logic moves)
13. Split `combat/index.ts` into the files listed in §2 (advantage / stat-lookup / damage / flow / modifiers / alive). Keep one barrel that re-exports them.
14. Move `getResistStatFromResistedBy` from `character/` to `effects/resistance.ts`.
15. Move JSON content into `packages/engine/content/`. Update `effects.library.ts` accordingly. Add `enemies/library.ts`, `items/library.ts` for symmetry.
16. Carve out `store/` and `persistence/*` as separate subpath barrels.

### Phase D — Build & publish wiring
17. Add `tsup.config.ts` with one entry per subpath. Verify dual ESM+CJS build.
18. Add the `exports` map to `packages/engine/package.json`. Set `sideEffects: false`. Move `zustand` and `@react-native-async-storage/async-storage` to `peerDependencies` with `peerDependenciesMeta.optional = true`.
19. Add `examples/web-vite-minimal` and `examples/react-native-minimal` and prove the engine bundles cleanly in both.
20. Bump major version (`2.0.0`) and update `README.md` with the new import surface.

### Phase E — Cleanup
21. Remove `dist/` from git. `.gitignore` already covers it.
22. Delete `tsc-alias`, `tsconfig-paths`, `eslint-plugin-typescript`, `@types/commander` from the engine.
23. Update `AGENTS.md` and `GAME-ROADMAP.md` references from `src/Combat/index.ts` → `packages/engine/src/combat/*`, etc.

Each phase is independently mergeable. Phases A–B are pure renames/moves with zero behavior change. C is the one with mechanical risk and should ride on the existing 71-test suite plus a new round of `npm run combat:auto` smoke runs.

---

## 9. Decision points / open questions

These are choices the proposal **doesn’t** make for you — flag your preference before we start cutting:

1. **Single package vs. multi-package publish.** This proposal recommends one published package (`axiomancer-mechanics`) with subpath exports. The alternative is publishing `@axiomancer/engine`, `@axiomancer/store`, `@axiomancer/persistence-node`, etc. as separate packages. Subpaths are simpler to version and easier on consumers; multiple packages give finer-grained semver isolation.
2. **Zustand: keep or remove?** `Game/store.ts` is convenient but every UI framework has its own state-management opinion. Options: (a) keep as optional `/store` subpath (this proposal), (b) drop entirely and ship pure reducers + a small `createGameRuntime()` event emitter, (c) provide both reducers and an *adapter* to let consumers plug Zustand/Redux/Jotai externally.
3. **RNG seeding.** `AUDIT.md` §7.6 already flags this. Proposal §2 introduces `core/rng.ts`. Worth doing in the reorg or hold for a separate pass?
4. **`teir` typo.** Same — flagged in `AUDIT.md` §7.1. Reorg is the cheapest moment to fix it (the rename touches almost every file we’re moving anyway).
5. **kebab-case rename.** Aesthetic but breaks history-based tooling slightly (case-only renames). The proposal recommends biting the bullet now while we’re moving things; if not, keep PascalCase indefinitely.
6. **CLI: keep in repo or split out?** Proposal keeps it as a workspace. If the CLI is purely an internal dev/QA tool, that’s the right call. If it’s a shipped product, it should probably be its own repo eventually.
7. **Bundler choice.** `tsup` is recommended for low config; `rollup` (with `@rollup/plugin-typescript`) gives finer control. Either works.
8. **Where do `docs/` live?** Proposal keeps them at the repo root since they describe game design as much as engine internals. Could also live under `packages/engine/docs/` — your call.

---

## 10. Summary

| Outcome | How |
|---|---|
| UI app can `import` the engine cleanly | Subpath exports + dual ESM/CJS + `sideEffects: false` |
| Bundlers don’t see Node-only code | `fs`-using adapters move under `/persistence/node`; default surface is platform-neutral |
| No forced runtime deps | `inquirer`/`commander` move to CLI workspace; `zustand`/`AsyncStorage` become optional peer-deps |
| Internals can change without breaking consumers | Only curated barrels are exported; cross-module imports go through barrels |
| Tests, mocks, content cleanly separated from engine code | Dedicated `tests/`, `fixtures/`, `content/` directories |
| CLI remains useful | Promoted to its own workspace package, depends on the engine like any other consumer |

Net result: a ~2,200-line engine that publishes as a tight, embeddable library a UI app can drop in without touching any of our internals.
