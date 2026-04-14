# Character

## Overview

Characters are player-controlled entities with base stats, derived stats, resources, and progression. Created via `createCharacter()` in `Character/index.ts`.

## Base Stats

Three core stats. All derived stats and resources scale from these.

| Stat | Role |
|------|------|
| `body` | Physical strength. Governs HP, physical combat and skills, body-type advantage. |
| `mind` | Intelligence and reflexes. Governs mana (shared with heart), mental combat and skills, mind-type advantage. |
| `heart` | Willpower and emotion. Governs HP (shared with body), mana (shared with mind), emotional combat and skills, heart-type advantage. |

## Derived Stats

Each base stat produces five derived values. Multipliers are defined in `Game/game-mechanics.constants.ts`.

| Derived Stat | Formula | Purpose |
|--------------|---------|---------|
| `physicalAttack` | `body × ATTACK (1)` | Combat roll modifier for body-type attacks |
| `physicalSkill` | `body × SKILL (1)` | Skill usage and philosophy bar (body) |
| `physicalDefense` | `body × DEFENSE (3)` | Defense against body-type attacks |
| `physicalSave` | `body × SAVE (2)` | Saving throw vs body-type effects |
| `physicalTest` | `body × TEST (4)` | General body ability tests |
| `mentalAttack` | `mind × ATTACK (1)` | Combat roll modifier for mind-type attacks |
| `mentalSkill` | `mind × SKILL (1)` | Skill usage and philosophy bar (mind) |
| `mentalDefense` | `mind × DEFENSE (3)` | Defense against mind-type attacks |
| `mentalSave` | `mind × SAVE (2)` | Saving throw vs mind-type effects |
| `mentalTest` | `mind × TEST (4)` | General mind ability tests |
| `emotionalAttack` | `heart × ATTACK (1)` | Combat roll modifier for heart-type attacks |
| `emotionalSkill` | `heart × SKILL (1)` | Skill usage and philosophy bar (heart) |
| `emotionalDefense` | `heart × DEFENSE (3)` | Defense against heart-type attacks |
| `emotionalSave` | `heart × SAVE (2)` | Saving throw vs heart-type effects |
| `emotionalTest` | `heart × TEST (4)` | General heart ability tests |
| `luck` | `average(body, heart, mind)` | Crits, random events |

**Note:** `DerivedStats` are shared between Characters and Enemies. `NonCombatStats` (saves, tests) are Character-only — enemies fall back to their defense stats.

## Resources

```
maxHealth = level × average(body, heart) × HEALTH_PER_STAT (10)
maxMana   = level × average(mind, heart) × MANA_PER_STAT  (10)
```

Both start at max on character creation.

## Experience

```
experience            = (level - 1) × EXPERIENCE_PER_LEVEL (1000)
experienceToNextLevel = level × EXPERIENCE_PER_LEVEL       (1000)
```

## Active Effects

`currentActiveEffects: ActiveEffect[]` — effects currently applied to this character. Managed by the effect engine (`Effects/index.ts`). Never mutate directly; use `applyEffect`.

## Resist Stat Lookup

When resisting an effect, the target's defensive derived stat is used via `getResistStatFromResistedBy()`:

| `resistedBy` | Stat used |
|-------------|-----------|
| `body` | `physicalDefense` |
| `mind` | `mentalDefense` |
| `heart` | `emotionalDefense` |

## API

| Function | Description |
|----------|-------------|
| `createCharacter(options)` | Factory — creates a fully derived Character from name, level, and base stats |
| `getResistStatFromResistedBy(target, stance)` | Returns the defense stat value for resisting effects of a given stance |

## Pending

- `availableStatPoints` — stat points earned per level (Phase 5)
- `knownSkills` / `equippedSkills` — skill loadout (Phase 3)
- Equipment slots and stat modifiers (Phase 4)
- `id` field for multiplayer/effect attribution
