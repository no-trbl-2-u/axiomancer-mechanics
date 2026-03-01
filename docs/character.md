# Character

## Base Stats

Three core stats. All derived stats and resources scale from these.

| Stat | Role |
|------|------|
| `body` | Physical strength. Governs HP, physical combat and skills, body-type advantage. |
| `mind` | Intelligence and reflexes. Governs mana (shared with heart), mental combat and skills, mind-type advantage. |
| `heart` | Willpower and emotion. Governs HP (shared with body), mana (shared with mind), emotional combat and skills, heart-type advantage. |

## Derived Stats

Each base stat produces five derived values. Multipliers are defined in `game-mechanics.constants.ts`.

| Derived Stat | Formula | Multiplier |
|--------------|---------|------------|
| `physicalAttack` | `body × 1` | Combat roll modifier for body-type attacks |
| `physicalSkill` | `body × 1` | Skill usage and philosophy bar (body) |
| `physicalDefense` | `body × 3` | Defense against body-type attacks |
| `physicalSave` | `body × 2` | Saving throw vs body-type effects |
| `physicalTest` | `body × 4` | General body ability tests |
| `mentalAttack` | `mind × 1` | Combat roll modifier for mind-type attacks |
| `mentalSkill` | `mind × 1` | Skill usage and philosophy bar (mind) |
| `mentalDefense` | `mind × 3` | Defense against mind-type attacks |
| `mentalSave` | `mind × 2` | Saving throw vs mind-type effects |
| `mentalTest` | `mind × 4` | General mind ability tests |
| `emotionalAttack` | `heart × 1` | Combat roll modifier for heart-type attacks |
| `emotionalSkill` | `heart × 1` | Skill usage and philosophy bar (heart) |
| `emotionalDefense` | `heart × 3` | Defense against heart-type attacks |
| `emotionalSave` | `heart × 2` | Saving throw vs heart-type effects |
| `emotionalTest` | `heart × 4` | General heart ability tests |
| `luck` | `average(body, heart, mind)` | Crits, random events |

## Resources

```
maxHealth = level × average(body, heart) × 10
maxMana   = level × average(mind, heart) × 10
```

Both start at max on character creation.

## Experience

```
experience            = (level - 1) × 1000
experienceToNextLevel = level × 1000
```

## Active Effects

`currentActiveEffects: ActiveEffect[]` — effects currently applied to this character. Managed by the effect engine (`Effects/index.ts`). Never mutate directly; use `applyEffect` / `removeEffect`.

## Resist Stat Lookup

When resisting an effect, the target's defensive derived stat is used:

| `resistedBy` | Stat used |
|-------------|-----------|
| `body` | `physicalDefense` |
| `mind` | `mentalDefense` |
| `heart` | `emotionalDefense` |

## Pending

- `availableStatPoints` — stat points earned per level
- `knownSkills` / `equippedSkills` — skill loadout (Phase 3)
- Equipment slots (Phase 4)
