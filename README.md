# Axiomancer — Mechanics Engine

Turn-based RPG engine with a Heart / Body / Mind combat system. Status effects, skills, and enemies are themed around logical fallacies and philosophical paradoxes.

This repository is the **non-UI engine** only. It is consumed as a library by clients (e.g. a React Native app). All logic is exposed through the package barrel at [`src/index.ts`](./src/index.ts).

---

## Install

The package is not yet published. To consume it locally:

```bash
npm install
npm run build       # compiles to ./dist
```

## Quick start

```ts
import {
  createCharacter, createEnemy,
  createGameStore, nullAdapter,
  determineEnemyAction, determineAdvantage,
  applyDamage, getAttackStat, getDefenseStat,
  applyTier1CombatEffect, lookupEffect,
  isCombatOngoing,
} from 'axiomancer-mechanics';

const player = createCharacter({
  name: 'Hero',
  level: 1,
  baseStats: { heart: 4, body: 3, mind: 2 },
});

const enemy = createEnemy({
  id: 'goblin-1',
  name: 'Goblin',
  description: '',
  level: 1,
  baseStats: { heart: 1, body: 2, mind: 1 },
  mapName: 'fishing-village',
  logic: 'random',
});

const store = createGameStore(nullAdapter, { player });
store.getState().startCombat(enemy);

while (isCombatOngoing(store.getState().combat!)) {
  // ...drive a round of combat using the helpers above...
}
```

## Public API

The barrel exports are organised by domain:

| Group      | Highlights                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| Character  | `createCharacter`, `Character`, `BaseStats`, `DerivedStats`, `NonCombatStats`                                |
| Enemy      | `createEnemy`, `Enemy`, `EnemyLogic`, `Tier1EffectOverrides`, `randomLogic`, `decideEnemyAction`              |
| Combat     | `determineAdvantage`, `getBaseStat`/`getAttackStat`/`getDefenseStat`/`getSaveStat`/`getResistStat`, `applyDamage`, `heal`, `tickAllEffects`, `applyRegen`, `getActiveRollModifier`, `getThornsReflect`, `resolveEffectApplication`, `Stance`, `Action`, `CombatState`, `Combatant` |
| Combat reducer | `initializeCombat`, `setPhase`, `setPlayerStance`, `setPlayerAction`, `appendLog`, `incrementFriendship`, `endCombat` |
| Effects    | `applyEffect`, `applyTier1CombatEffect`, `clearTier1EffectsForStance`, `lookupEffect`, `Effect`, `ActiveEffect`, `EffectTier` |
| Items      | `addItem`, `removeItem`, `useConsumable`, `stackItem`, `Item` and its variants, type guards                  |
| Game       | `createGameStore`, `GameState`, persistence adapters, mechanic constants                                     |
| World      | `createStartingWorld`, world reducer (map/node/continent transitions), `WorldState`, `WorldMap`              |
| Utils      | `clamp`, `randomInt`, `deepClone`, `deriveStats`, `calculateMaxHealth`, `createDieRoll`, `isCharacter`, `isEnemy` |

## CLIs

The repo also ships two CLIs for hands-on testing. They are NOT part of the published package surface (`src/CLI` is excluded from the build):

| Command            | What it does                                            |
| ------------------ | ------------------------------------------------------- |
| `npm run combat`   | Interactive combat against the sample `Disatree` enemy. |
| `npm run character`| Interactive character builder.                          |
| `npm run combat:auto` | `pexpect`-driven smoke test of the combat CLI.       |

## Project layout

```
src/
  index.ts                 # public barrel
  Character/               # createCharacter + Character types
  Combat/                  # advantage, stats, dice, damage, health, effects, resist, reducer
  Effects/                 # applyEffect, Tier 1 stance effects, library lookup
  Enemy/                   # createEnemy + AI logic + library
  Game/                    # store + persistence + constants + actions + reducer
  Items/                   # inventory reducers + item types
  Skills/                  # types only (engine pending)
  World/                   # world state, reducers, map and quest libraries
  NPCs/                    # NPC types
  Utils/                   # math, dice, stat derivation, type guards
  CLI/                     # interactive CLIs (not exported by the package)
docs/                      # design notes per system
docs/effects/              # one markdown per buff/debuff
docs/references/           # source material (fallacies, paradoxes, pantheon, Mörk Borg)
specs/                     # planning specs for upcoming work (Phase 2 onward)
automation/                # python combat-CLI test harness
```

## Documentation

- [`GAME-ROADMAP.md`](./GAME-ROADMAP.md) — phased development plan with progress tracking
- [`AUDIT.md`](./AUDIT.md) — code audit and quality assessment
- [`Knowledge-Gaps.md`](./Knowledge-Gaps.md) — open design and intent questions
- [`BRAINDUMP.md`](./BRAINDUMP.md) — unorganised idea backlog
- [`docs/testing.md`](./docs/testing.md) — **hermetic e2e testing standard (required for every implementation)**
- [`specs/`](./specs) — phased planning specs to drive the next round of work (start with `specs/README.md`)
- [`docs/`](./docs) — per-system references (combat, effects, character, world, etc.)
- [`docs/effects/`](./docs/effects) — per-effect deep-dives (one file per buff/debuff)
- [`docs/references/`](./docs/references) — source material (fallacies, paradoxes, pantheon, story)

## Scripts

| Script                | What it does                       |
| --------------------- | ---------------------------------- |
| `npm run build`       | Type-check and compile to `dist/`  |
| `npm run type-check`  | Type-check only                    |
| `npm test`            | Run the vitest suite               |
| `npm run test:watch`  | Vitest in watch mode               |
| `npm run lint`        | Run ESLint (currently broken — see [`AUDIT.md`](./AUDIT.md) Concern 7) |
| `npm run check`       | Lint + type-check                  |
| `npm run combat:auto` | Python harness driving the combat CLI N times |
