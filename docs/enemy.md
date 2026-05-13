# Enemy

> **Status:** Spec 07 shipped. Type, factory, six AI strategies, a 15-enemy
> library, weighted loot tables, and a per-map encounter generator are wired
> in. Future work (multi-enemy combat, Spec 10 difficulty bias) is tracked in
> [`specs/07-enemy-content-and-ai.md`](../specs/07-enemy-content-and-ai.md).

## Type Shape

Defined in [`src/Enemy/types.d.ts`](../src/Enemy/types.d.ts).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | `string` | Unique save / tracking identifier. |
| `name`, `description` | `string` | Display + flavour. |
| `level`, `health`, `maxHealth` | `number` | Resources. |
| `baseStats` | `BaseStats` | Heart/Body/Mind. |
| `derivedStats` | `DerivedStats` | Computed combat stats (no `NonCombatStats`). |
| `mapName` | `MapName` | Map the enemy belongs to. |
| `logic` | `EnemyLogic` | AI strategy — see "AI strategies" below. |
| `difficulty?` | `EnemyDifficulty` | `simple` / `normal` / `elite` / `boss` / `unique`. |
| `tier1Overrides?` | `Tier1EffectOverrides` | Per-stance Tier 1 effect ID overrides. |
| `procUnlocks?` | `ProcUnlocks` | Spec 03 — per-cell tier cap (default 1). Elites bump to 2, bosses to 3. |
| `procOverrides?` | `ProcOverrides` | Spec 03 — per-cell custom proc tables. |
| `skills?` | `Skill[]` | Optional skill list (Phase 3). |
| `loot?` | `LootTableEntry[]` | Weighted drop table (Spec 07 Q7B). |
| `xpReward?` | `number` | Flat XP awarded on kill. Defaults to `level × DEFAULT_XP_BY_DIFFICULTY[difficulty]`. |
| `effects` | `ActiveEffect[]` | Live status effects. |

Enemies do not have `nonCombatStats`; `getSaveStat()` falls back to `getDefenseStat()`.

## Factory

`createEnemy(options): Enemy` — derives `derivedStats`, `maxHealth`, and the
default `xpReward` from `level` / `baseStats` / `difficulty`. Starts the enemy
at full HP.

`DEFAULT_XP_BY_DIFFICULTY` — `simple: 10, normal: 20, elite: 50, boss: 200, unique: 500`.
Multiplied by `level` for the final default.

## AI strategies

[`src/Enemy/enemy.logic.ts`](../src/Enemy/enemy.logic.ts):

| Strategy | Behaviour |
|----------|-----------|
| `randomLogic()` | Uniform stance + attack/defend. |
| `aggressiveLogic(state?)` | Attack 75% of the time; preferred stance counters the player's last declared stance. |
| `defensiveLogic(enemy, state?)` | Defend while HP > 50%; then attack the player's *weakest* stance. |
| `balancedLogic(enemy, state?)` | Attack above 50% HP, defend below. Stance counters the player's last stance. |
| `strategicLogic(enemy, state?)` | Attacks into `debuff_vulnerability_*` debuffs on the player; falls back to `aggressiveLogic` otherwise. |
| `bossLogic(enemy, state?)` | Deterministic 4-round phase script: Body defend → counter-attack → Mind attack → Heart defend → loop. |

Combat consumes the AI via `determineEnemyAction(enemy, state?)` in
[`Combat/index.ts`](../src/Combat/index.ts). Strategies that need to react to
the player (every non-random strategy) receive the live `CombatState`.

## Loot tables

`LootTableEntry { item: Item | null; weight: number }` — weighted entries
with explicit `null` buckets for "nothing drops". `rollLoot(table, rng?)`
normalises weights at call time and returns one item (or `null`).
`rollLootMany(table, n)` is a convenience for multi-roll tables.

Enemy `loot` is intentionally mutable — encounters can splice in extra
entries before combat starts (e.g. quest-driven guaranteed drops).

## Encounters

```ts
interface Encounter {
    enemies: Enemy[];        // 1v1 today; multi-enemy lands later
    rewards?: Reward[];      // optional encounter-level bonuses
    origin?: string;         // "<mapName>:<nodeId>" for attribution
}
```

`generateEncounter(mapNode, playerLevel, options?)` ([`World/encounter.ts`](../src/World/encounter.ts))
resolves the node's owning map (`fv-*` → fishing-village, `nf-*` → northern-forest),
filters the per-map pool by `options.difficulty` (if supplied), picks an
enemy uniformly, scales their level via the Q6 bands:

| Difficulty | Band relative to player |
|------------|-------------------------|
| `simple`   | `−1 … 0`                |
| `normal`   |  `0 … +1`               |
| `elite`    | `+1 … +2`               |
| `boss`     | `+2 … +3`               |
| `unique`   | authored level (fixed)  |

Floor clamps to level 1. The returned enemy is a deep clone — combat
mutations don't bleed back into the library.

## Store integration

`store.startCombat(target: Enemy | Encounter)` accepts either shape; the
encounter is retained so `endCombat()` can grant XP + loot on victory.

`store.endCombat(): CombatEndReport` — `{ outcome, xpGained, loot }`. On
victory, sums every enemy's `xpReward` into `player.experience` and
stack-merges rolled drops into `player.inventory`. Defeat / flee outcomes
grant nothing.

## Library

[`src/Enemy/enemy.library.ts`](../src/Enemy/enemy.library.ts) — 15 production
enemies on the Coastal Continent, distributed as Spec 07 Q8 specified:

**Simple (3)** — Tidepool Crab (body), Sea-Mist Wisp (mind), Lullaby Moth (heart).
**Normal (6)** — Disatree (legacy 1/1/1), Wet Hound (body), Mournful Gull (heart),
Forest Sprite (mind), Hollow-Eyed Beggar (heart), Argumentative Crow (mind).
**Elite (3)** — Tidefluke Reaver (body), Hush-Wraith (mind), Hollow Saint (heart).
**Boss (2)** — The Coastal Tyrant (body+heart), The Disagreement (mind+heart).
**Unique (1)** — Echo of Pyrrhonia (all three).

`EnemiesByMap` indexes them per map for `generateEncounter`. `ENEMY_REGISTRY`
keys them by CLI slug (`tidepool-crab`, `disatree`, `sandbag`, ...) for the
combat CLI's `COMBAT_ENEMY=<slug>` override.

The legacy `Sandbag_01` (level 10, 1/1/1) is preserved as a test fixture and
deliberately omitted from `EnemiesByMap` so the encounter generator never
picks it.

## CLI usage

```sh
npm run combat                           # disatree (default demo opponent)
COMBAT_ENEMY=hush-wraith npm run combat  # explicit enemy slug
COMBAT_ENCOUNTER=1 npm run combat        # generated encounter for fv-1
```

Victory grants are printed after `printCombatEnd`:

```
You gained 20 XP.
Loot:
  • Minor Healing Potion
```
