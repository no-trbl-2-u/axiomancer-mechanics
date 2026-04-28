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
| Character  | `createCharacter`, `Character`, `BaseStats`, `DerivedStats`                                                  |
| Enemy      | `createEnemy`, `Enemy`, `EnemyLogic`, `Tier1EffectOverrides`, `randomLogic`, `decideEnemyAction`              |
| Combat     | `determineAdvantage`, `getAttackStat`/`getDefenseStat`/`getSaveStat`/`getResistStat`, `applyDamage`, `heal`, `tickAllEffects`, `applyRegen`, `getActiveRollModifier`, `getThornsReflect`, `resolveEffectApplication`, `Stance`, `Action`, `CombatState`, `Combatant` |
| Effects    | `applyEffect`, `applyTier1CombatEffect`, `clearTier1EffectsForStance`, `lookupEffect`, `Effect`, `ActiveEffect`, `EffectTier` |
| Items      | `addItem`, `removeItem`, `useConsumable`, `stackItem`, `Item` and its variants, type guards                  |
| Game       | `createGameStore`, `GameState`, persistence adapters, mechanic constants                                     |
| World      | `createStartingWorld`, world reducer (map/node/continent transitions), `WorldState`, `WorldMap`              |
| Utils      | `clamp`, `randomInt`, `deriveStats`, `calculateMaxHealth`, `createDieRoll`, `isCharacter`, `isEnemy`         |

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
  index.ts            # public barrel
  Character/          # createCharacter + Character types
  Combat/             # advantage, stats, dice, damage, health, effects, resist
  Effects/            # applyEffect, Tier 1 stance effects, library lookup
  Enemy/              # createEnemy + AI logic
  Game/               # store + persistence + constants
  Items/              # inventory reducers + item types
  Skills/             # types only (engine pending)
  World/              # world state and reducers
  NPCs/               # NPC types
  Utils/              # math, dice, stat derivation, type guards
  CLI/                # interactive CLIs (not exported by the package)
docs/                 # design notes per system
```

## Documentation

- [`GAME-ROADMAP.md`](./GAME-ROADMAP.md) — phased development plan with progress tracking
- [`AUDIT.md`](./AUDIT.md) — code audit and quality assessment
- [`docs/`](./docs) — per-system references (combat, effects, character)
- [`docs/references/`](./docs/references) — source material (fallacies, paradoxes, pantheon, story)

## Scripts

| Script                | What it does                       |
| --------------------- | ---------------------------------- |
| `npm run build`       | Type-check and compile to `dist/`  |
| `npm run type-check`  | Type-check only                    |
| `npm test`            | Run the vitest suite               |
| `npm run lint`        | Run ESLint                         |
| `npm run check`       | Lint + type-check                  |
