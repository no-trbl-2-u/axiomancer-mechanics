# Enemy

> **Status:** Type, factory, and basic AI exist. Library and richer AI strategies are
> pending Phase 6. The active design conversation lives in
> [`specs/07-enemy-content-and-ai.md`](../specs/07-enemy-content-and-ai.md).

## Type Shape

Defined in [`src/Enemy/types.d.ts`](../src/Enemy/types.d.ts).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | `string` | Unique save / tracking identifier. |
| `name`, `description` | `string` | Display + flavour. |
| `level`, `health`, `maxHealth`, `mana`, `maxMana` | `number` | Resources. |
| `baseStats` | `BaseStats` | Heart/Body/Mind. |
| `derivedStats` | `DerivedStats` | Computed combat stats (no `NonCombatStats`). |
| `mapName` | `MapName` | Map the enemy belongs to. |
| `logic` | `EnemyLogic` | AI strategy: `random`, `aggressive`, `defensive`, `balanced`. |
| `difficulty?` | `EnemyDifficulty` | `simple` / `normal` / `elite` / `boss` / `unique`. |
| `tier1Overrides?` | `Tier1EffectOverrides` | Per-stance Tier 1 effect ID overrides. |
| `skills?` | `Skill[]` | Optional skill list (Phase 3). |
| `loot?` | `Item[]` | Optional drops. |
| `effects` | `ActiveEffect[]` | Live status effects. |

Enemies do not have `nonCombatStats`; `getSaveStat()` falls back to `getDefenseStat()`.

## Factory

`createEnemy(options): Enemy` — automatically derives `derivedStats`, `maxHealth`, and
`maxMana` from `baseStats` + `level` and starts the enemy at full HP/MP.

## AI

`src/Enemy/enemy.logic.ts`:

| Function | Description |
|----------|-------------|
| `randomLogic()` | Uniform stance + attack/defend. |
| `decideEnemyAction(logic)` | Dispatch by logic. Currently all branches fall through to `randomLogic` until the other strategies are implemented. |

Combat consumes the AI via `determineEnemyAction(enemy)` in `Combat/index.ts`.

## Library

[`src/Enemy/enemy.library.ts`](../src/Enemy/enemy.library.ts) — only `Disatree_01`
(level 1, neutral stats, random logic) is currently defined. Used by the Combat CLI
as the sample fight.

## Pending (Phase 6)

- Library expansion (≥15 enemies across 3 difficulty tiers, all stat-aligned).
- AI strategies: `aggressiveLogic`, `defensiveLogic`, `strategicLogic`, `bossLogic`.
- Encounter type + per-area encounter library + `generateEncounter(mapNode, playerLevel)`.
- Loot tables.

See [`specs/07-enemy-content-and-ai.md`](../specs/07-enemy-content-and-ai.md) for the
open design questions.
