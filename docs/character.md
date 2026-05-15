# Character

## Overview

Characters are player-controlled entities with base stats, derived stats, resources, and progression. Created via `createCharacter()` in `Character/index.ts`.

## Base Stats

Three core stats. All derived stats and resources scale from these.

| Stat | Role |
|------|------|
| `body` | Physical strength. Governs HP, physical combat and skills, body-type advantage. |
| `mind` | Intelligence and reflexes. Governs mental combat and skills, mind-type advantage. |
| `heart` | Willpower and emotion. Governs HP (shared with body), emotional combat and skills, heart-type advantage. |

## Derived Stats (`DerivedStats` — shared with Enemies)

Each base stat produces three combat-derived values plus a global `luck`. Multipliers
are defined in `Game/game-mechanics.constants.ts`.

| Derived Stat | Formula | Purpose |
|--------------|---------|---------|
| `physicalAttack` | `body × ATTACK (1)` | Combat roll modifier for body-type attacks |
| `physicalSkill` | `body × SKILL (1)` | Skill usage and philosophy bar (body) |
| `physicalDefense` | `body × DEFENSE (3)` | Defense against body-type attacks |
| `mentalAttack` | `mind × ATTACK (1)` | Combat roll modifier for mind-type attacks |
| `mentalSkill` | `mind × SKILL (1)` | Skill usage and philosophy bar (mind) |
| `mentalDefense` | `mind × DEFENSE (3)` | Defense against mind-type attacks |
| `emotionalAttack` | `heart × ATTACK (1)` | Combat roll modifier for heart-type attacks |
| `emotionalSkill` | `heart × SKILL (1)` | Skill usage and philosophy bar (heart) |
| `emotionalDefense` | `heart × DEFENSE (3)` | Defense against heart-type attacks |
| `luck` | `average(body, heart, mind)` | Crits, random events |

## Non-Combat Stats (`NonCombatStats` — Character only)

Saving throws and ability tests live on `character.nonCombatStats`. Enemies do not have
these fields and fall back to their defense stats when a save is requested via
`getSaveStat()`.

| Non-Combat Stat | Formula | Purpose |
|-----------------|---------|---------|
| `physicalSave` | `body × SAVE (2)` | Saving throw vs body-type effects |
| `physicalTest` | `body × TEST (4)` | General body ability tests |
| `mentalSave` | `mind × SAVE (2)` | Saving throw vs mind-type effects |
| `mentalTest` | `mind × TEST (4)` | General mind ability tests |
| `emotionalSave` | `heart × SAVE (2)` | Saving throw vs heart-type effects |
| `emotionalTest` | `heart × TEST (4)` | General heart ability tests |

## Resources

```
maxHealth = level × average(body, heart) × HEALTH_PER_STAT (10)
```

Health starts at max on character creation. Skills run on the per-combat
five-resource economy described in [`docs/skills.md`](./skills.md), tracked
on `CombatState.combatResources` rather than the character itself.

## Skills

Characters track learned and equipped skills as ID arrays:

```ts
knownSkills: string[]      // every skill ever learned
equippedSkills: string[]   // available in combat (cap 4 today)
```

Equipping is out-of-combat only; mid-fight swaps are intentionally forbidden.

## Experience

```
experience            = (level - 1) × EXPERIENCE_PER_LEVEL (1000)
experienceToNextLevel = level × EXPERIENCE_PER_LEVEL       (1000)
```

## Active Effects

`effects: ActiveEffect[]` — effects currently applied to this character. Managed by the effect engine (`Effects/index.ts`). Never mutate directly; use `applyEffect`.

## Resist Stat Lookup

When resisting an effect, the target's **base stat** for the resisting stance is used
via `getResistStat()` in `Combat/stats.ts`:

| `resistedBy` | Stat used |
|-------------|-----------|
| `body` | `baseStats.body` |
| `mind` | `baseStats.mind` |
| `heart` | `baseStats.heart` |

## API

| Function | Description |
|----------|-------------|
| `createCharacter(options)` | Factory — creates a fully derived Character from name, level, and base stats |
| `getResistStat(target, resistedBy)` | Base stat value for the resisting stance (lives in `Combat/stats.ts`) |
| `characterPresets` / `getPresetById` / `buildCharacterFromPreset` | Curated progression-tier roster (apprentice / wanderer / sage). The builder lifts a declarative `CharacterPreset` into a `Character` via the canonical `createCharacter` + `dropItem` paths. `npm run game` prompts the player to pick one at boot. |

## Character presets

`src/Character/presets.ts` ships three curated progression tiers:

| Preset       | Level | Base Stats | Equipment                            | Skills                |
|--------------|-------|------------|--------------------------------------|-----------------------|
| `apprentice` | 1     | 3 / 2 / 2  | —                                    | 6 Tier-1 known        |
| `wanderer`   | 8     | 5 / 4 / 4  | iron-blade, hide-vest, leather-cap   | 6 T1 + 3 T2 known     |
| `sage`       | 15    | 7 / 6 / 6  | steel-blade, chain-mail, chain-coif  | all 12 skills known   |

All preset equipment is rolled at `'common'` rarity so the build is
deterministic (Common returns an empty rolled-modifier list). Add more
presets by exporting further `CharacterPreset` records and registering
them in `characterPresets`.

## Pending

- `availableStatPoints` — stat points earned per level (Phase 5)
- `knownSkills` / `equippedSkills` — skill loadout (Phase 3)
- Equipment slots and stat modifiers (Phase 4)
- `id` field for multiplayer/effect attribution
