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
| `skills?` | `Skill[]` | Optional skill list (Spec 04 / 04b — currently unused on shipped enemies; reserved for elite/boss skill rotations). |
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

## Alignment-driven AI tuning (Phase 45)

`Enemy.philosophicalAlignment?: PhilosophicalAlignment` (optional) pins an
enemy to a cell on the [Phase 42 27-cell cube](./philosophy.md). When set,
`decideEnemyAction` runs the per-strategy decision and then post-passes the
result through `applyOutlookBias`:

- **Pessimistic enemies** (outlook bucket `'low'`, value `<= -34`): with
  probability `0.25` per round, an `attack` decision flips to `defend`.
  Stance is preserved.
- **Optimistic enemies** (outlook bucket `'high'`, value `>= 34`): with
  probability `0.25` per round, a `defend` decision flips to `attack`.
- **Neutral enemies** (outlook bucket `'mid'`): bias is a no-op.
- **Non-basic actions** (`skill` / `item` / `flee`): bias is a no-op.

The bias spends one `getRng().random()` call per dispatch — deterministic
under the `src/test-utils/rng.ts` stubs. Enemies without an alignment pin
(legacy fixtures, the single-arg `decideEnemyAction(logic)` path) are
unaffected.

### Cell pins on authored enemies

The 16 enemies in `ENEMY_REGISTRY` carry first-pass cell pins:

| Enemy | Cell | Archetype |
|---|---|---|
| TidepoolCrab, EchoOfPyrrhonia | `mid-mid-individual` | Montaigne / Ishmael |
| SeaMistWisp | `mid-mid-transcendent` | Lao Tzu / Siddhartha |
| LullabyMoth | `faith-optimistic-individual` | Kierkegaard / Alyosha |
| Disatree_01 | `mid-pessimistic-relational` | Zapffe / Ahab |
| WetHound | `logic-pessimistic-individual` | Schopenhauer / Underground Man |
| MournfulGull | `mid-pessimistic-individual` | Cioran / Hamlet |
| ForestSprite | `mid-optimistic-individual` | Rorty / Huck Finn |
| HollowEyedBeggar | `faith-pessimistic-relational` | Mainländer / Ferreira |
| ArgumentativeCrow | `logic-optimistic-individual` | Nietzsche / Prometheus |
| TideflukeReaver | `logic-pessimistic-relational` | Ligotti / Rust Cohle |
| HushWraith | `mid-pessimistic-transcendent` | Lovecraft / Burroughs |
| HollowSaint | `faith-mid-transcendent` | St. John of the Cross / Rodrigues |
| CoastalTyrant | `faith-pessimistic-transcendent` | Marcion / Grand Inquisitor |
| TheDisagreement | `logic-mid-individual` | Camus / Meursault |
| Sandbag_01 | `mid-mid-relational` | Buber / Carraway |

13 distinct cells used out of 27; the remaining 14 are headroom for future
enemies. Cell ids are stable across versions (see
[docs/philosophy.md](./philosophy.md) for the full registry).

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
npm run game   # tabbed demo loop; pick the Combat tab to engage
               # an active encounter generated from the current map node
```

Victory grants are surfaced inside the Combat tab after each encounter
resolves; the hermetic e2e suite (`src/**/e2e/*.engine.test.ts`) is the
durable way to exercise specific enemy fixtures.

## Skill use (Phase 49)

Enemies with a non-empty `Enemy.skills?: Skill[]` field can fire skills
during combat. `decideEnemyAction` consults a new helper
`pickEnemySkill(enemy)` BEFORE the per-strategy dispatch — when the
rotation is non-empty AND `getRng().random() < ENEMY_SKILL_PICK_CHANCE`
(0.35), it returns `{ action: 'skill', skillId, stance }`. Otherwise
the strategy resolves normally. The stance is sourced from
`skill.philosophicalAspect` so a body-aspected skill arrives with
`stance: 'body'`.

Nine enemies carry rotations — 2 from Phase 49, 7 from Phase 57.
Picks come exclusively from the existing `skillLibrary` (no new skill
content); each is single-skill per the current `pickEnemySkill`
contract (first-pick semantics).

| Enemy | Difficulty | Skill | Skill aspect | Phase |
|---|---|---|---|---|
| Mournful Gull | normal | `appeal-to-pity` | heart | 57 |
| Hollow-Eyed Beggar | normal | `pascals-wager` | heart | 57 |
| Argumentative Crow | normal | `false-dilemma` | mind | 49 |
| Tidefluke Reaver | elite | `straw-giant` | body | 57 |
| Hush-Wraith | elite | `sorites-cascade` | mind | 57 |
| Hollow Saint | elite | `pascals-wager` | heart | 57 |
| The Coastal Tyrant | boss | `achilles-gambit` | body | 49 |
| The Disagreement | boss | `liars-echo` | mind | 57 |
| Echo of Pyrrhonia | unique | `eternal-regress` | heart | 57 |

The 3 simplest normals (Tidepool Crab, Sea-Mist Wisp, Lullaby Moth)
stay skill-less per Phase 57 D2 — early-game pacing benefits from
straight basic-action encounters before the player has the reactive
budget for enemy skill rotations.

The actual skill execution runs through `executeSkill` with
`casterSide: 'enemy'` — see `docs/skills.md` "Enemy caster path
(Phase 49)" for the engine-side semantics, including D2 (enemies
bypass the player's `combatResources` pool) and D3 (`skill.targetType`
is relative to the caster).

Calibration: the 0.35 fire rate is colocated with the Phase 45
`ALIGNMENT_FLIP_CHANCE` in `src/Enemy/enemy.logic.ts`. Tune both
together if a future playtest pass shows elite/boss encounters
feel too spammy or too quiet.

## Befriendable enemies (Phase 60)

Per-enemy `Enemy.friendshipReward?: FriendshipReward` lets authors
attach bonus content to the Phase 36 friendship-victory path. The
field is optional; enemies without an authored reward resolve via
the Phase 36 base only (half-XP + weighted-loot roll + +1
moralMeter).

```typescript
interface FriendshipReward {
    /** Guaranteed items appended to the weighted-loot roll. */
    items?: Item[];
    /** Extra XP on top of the half-XP base. Additive, not multiplicative. */
    xpBonus?: number;
    /** Optional flavour text for the CLI / UI to render after combat-end. */
    narrative?: string;
    /** Phase 62 — optional world flag appended to state.flags on
     *  friendship. Convention: `befriended-<enemy-id-stem>`. */
    flagSet?: string;
    /** Phase 69 — optional shift applied to the player's
     *  philosophical alignment cube on the friendship outcome.
     *  Routed through applyAlignmentDelta (Phase 42 clamp helper).
     *  Authoring band: ±1..±5 per axis (matches Phase 43 dialogue
     *  / map-event delta convention). Closes Spec 14 Q4. */
    alignmentDelta?: Partial<PhilosophicalAlignment>;
}
```

Engine wiring lives in `src/Game/store.ts#endCombat`: in the
`outcome === 'friendship'` branch, the reward's `items` append to
`report.loot`, `xpBonus` adds to `report.xpGained`, `narrative`
surfaces on `CombatEndReport.friendshipReward.narrative`, and
(Phase 69) `alignmentDelta` is folded into `state.philosophicalAlignment`
via `applyAlignmentDelta` — the post-clamp value also surfaces on
`CombatEndReport.friendshipReward.alignmentShift?: PhilosophicalAlignment`
for the consumer to render. None of
the FriendshipReward fields REPLACE the Phase 36 grants; they
augment them.

Three enemies ship authored predicates / rewards today:

| Enemy | Difficulty | World placement (Phase 65) | Items | xpBonus | alignmentDelta (Phase 69) | BefriendabilityConfig (Phase 68) | Narrative tone |
|---|---|---|---|---|---|---|---|
| **MournfulGull** | normal | `fv-15` gull crag (Harbor District dead-end via `fv-11` → `fv-14`) | 1 × heart-draught | +10 | `{ outlook: +3 }` — wistful-empathy nudge toward optimistic | default Phase 36 mechanic (no config) | Heart-attuned remembrance gift; the gull stops circling. Sets flag `befriended-mournful-gull` (Phase 62) — Coastal Beggar's dialogue surfaces a new branch acknowledging the gull's silence. |
| **HollowEyedBeggar** | normal | `fv-18` back alley (Inland Streets, on the way to the abandoned-shack loop via `fv-5` → `fv-18` or `fv-3` → `fv-16` → `fv-17` → `fv-18`) | 1 × healing-potion + 1 × antidote | +15 | `{ scope: -3 }` — re-grounds toward the relational individual | default Phase 36 mechanic (no config) | Reversal of the begging dynamic; they offer what they carry. |
| **CoastalTyrant** | boss | `coastal-continent` fishing-village boss tile | (deferred — boss-tier follow-up) | (deferred) | (deferred — boss-tier follow-up) | `{ hpGate: { belowPct: 0.4 }, requiredStances: ['heart'], roundsThreshold: 5 }` | Magistrate-fallen-priest; friendship opens only after he's been brought low, the player has shown empathy at least once, and 5 both-defend rounds have passed. Reward content lands in the boss-tier follow-up phase. |

The 2 normal-tier enemies are picked from the fishing-village
(level 2-3), where the player's first deliberate befriending
attempts are likeliest to land. CoastalTyrant is the first boss-tier
authored predicate (Phase 68) — its `friendshipReward` content
(multi-paragraph narrative + items + possibly `alignmentDelta`) is
deferred to the boss-tier befriendable-enemy follow-up phase. The
quest-branch wire-in on `outcome === 'friendship'` (vs `'victory'`)
shipped in Phase 62 (`FriendshipReward.flagSet` → `state.flags`); the
predicate-override mechanism shipped in Phase 68
(`Enemy.befriendabilityConfig`); the boss-tier reward authoring is
the only remaining piece.

Hermetic e2e coverage at
[`src/Game/e2e/befriend.engine.test.ts`](../src/Game/e2e/befriend.engine.test.ts)
drives one friendship run per authored enemy + a no-friendshipReward
regression case (TidepoolCrab) + a victory-outcome regression case
(no friendshipReward thread on non-friendship outcomes).

See `docs/combat.md` § "Friendship Path" for the engine-side
semantics + `docs/morality.md` § "Combat: Friendship Victories" for
the moralMeter shift that fires alongside.
