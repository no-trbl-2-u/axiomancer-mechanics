# Spec — axiomancer-mechanics

## Product

`axiomancer-mechanics` is a TypeScript game-engine library for a turn-based
RPG with philosophical and logical-fallacy themes. It is consumed as an npm
package by clients (React Native app, test CLIs, future web UI). All public
logic is exposed through a single barrel at `src/index.ts`.

The engine covers: character creation and stat derivation, turn-based combat
with a Heart/Body/Mind system, stance-and-action-driven effect procs (Tiers
1–3), skills, equipment (weapons/armour/accessories with modifiers), items
and consumables, enemy AI, world map navigation and quest management, and an
event-observable game loop.

## Audience

- **Primary consumer:** the Axiomancer React Native app (separate repo,
  separate team — currently the same developer).
- **Secondary consumer:** the in-repo CLIs (`combat.cli.ts`,
  `character.cli.ts`, `game.cli.ts`) used for hands-on testing during
  development.
- **Tertiary:** future potential open-sourcing as an indie-RPG engine library.

## V1 scope (in-scope)

The shipped library will expose a complete, self-contained game engine that
a React Native UI can wrap without pulling in any additional game-logic:

1. Character creation, stat derivation, non-combat stats.
2. Turn-based combat: advantage, attack/defense stats, damage, healing,
   effect ticks, stance-action mechanics.
3. Tier 1–3 status effects: DoTs, stat mods, action restrictions, procs.
4. Skills library (12 early-game skills, typed, integrated with combat).
5. Equipment engine: stat-mod aggregation, set bonuses, rarity.
6. Character progression: XP, levelling, skill learning, stat gains.
7. Enemy library and AI (random, scripted, conditional logic).
8. World map: nodes, continents, hazards, dialogue, quests.
9. Full game loop (`gameReducer` / Zustand store) with save/load migration.
10. Moral/difficulty meter tied to player choices.
11. RNG seeding for deterministic tests.
12. Package architecture: clean `src/index.ts` barrel, event surface for UI
    consumers, documented React Native adapter interface.

## 6-month horizon (queued but not blocking v1)

- Story content: named NPCs with moral dialogue trees.
- Second+ enemy class families.
- Additional skill tiers (Tier 2+).
- Additional world content (biomes, continent 2+).
- Published npm release.

## Stack

TypeScript strict, Vitest, tsc + tsc-alias, ESLint, npm.
No database, no server, no web UI.

## Contracts (public API)

The barrel at `src/index.ts` is the contract surface. Groups:

| Group | Key exports |
|---|---|
| Character | `createCharacter`, `Character`, `BaseStats`, `DerivedStats` |
| Enemy | `createEnemy`, `Enemy`, `EnemyLogic`, `decideEnemyAction` |
| Combat | `determineAdvantage`, `getAttackStat`, `applyDamage`, `heal`, `Stance`, `Action`, `CombatState` |
| Effects | `applyEffect`, `applyTier1CombatEffect`, `lookupEffect`, `Effect`, `ActiveEffect` |
| Items | `addItem`, `removeItem`, `useConsumable`, `Item` |
| Game | `createGameStore`, `GameState`, persistence adapters |
| World | `createStartingWorld`, world reducer, `WorldState` |
| Utils | `clamp`, `randomInt`, `deepClone`, `deriveStats` |

Breaking changes to these exports require a semver major. The CLIs
(`src/CLI/`) are **not** part of the public API and are excluded from the
build.

## Non-goals (explicit)

- Web or React Native UI components — not in this repo.
- Database or server — none.
- Network play or cloud sync.
- Multiple save slots (deferred).
- Published npm release before v1 implementation is complete.
