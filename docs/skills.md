# Skills

> Status-effect-driven combat abilities themed around **logical fallacies** and **philosophical paradoxes**. Skills sit between automatic Tier 1 stance effects and the Tier 2/3 combat-effect proc matrix.

## Overview

Every skill is a discriminated, immutable record. Skills are stored in `src/Skills/skill.library.ts`, validated and applied through `src/Skills/index.ts`, and resolved in combat via `executeSkill(state, skillId, actor)`. The skill engine is **pure** — no global mutation; all functions return new `CombatState` / `Character` objects.

## Skill Type

```ts
interface Skill {
    id: string;
    name: string;
    description: string;                 // Flavour
    category: 'fallacy' | 'paradox';
    philosophicalAspect: 'body' | 'mind' | 'heart';
    level: number;                       // Skill level / power tier
    manaCost: number;
    targetType: SkillTargetType;         // 'self' | 'enemy' | 'all_enemies' | 'all_allies'
    basePower: number;                   // Damage / healing before stat scaling
    scalingStat: SkillScalingStat;       // Which derived stat multiplies basePower
    advantageInteraction: SkillAdvantageInteraction;
    teir: 'Teir 1' | 'Teir 2' | 'Teir 3';
    combatEffects: CombatEffectTrigger[];// Tier 2/3 procs the skill fires on resolve
    learningRequirement?: SkillLearningRequirement;
}
```

### `advantageInteraction`

| Value | Behaviour |
|---|---|
| `standard` | Standard +2 / 0 / −2 advantage modifier |
| `amplify`  | Doubled (+4 / 0 / −4) — for "spike" skills |
| `reverse`  | Inverted (advantage flips to disadvantage) — for paradox skills like Liar's Paradox |
| `ignore`   | Advantage is irrelevant; flat power |

### `scalingStat`

Any field name on `DerivedStats` (`physicalAttack`, `mentalSkill`, `emotionalDefense`, etc.). Fallacy skills tend to scale off `*Attack`, paradox skills off `*Skill`, defensive skills off `*Defense`.

### `learningRequirement`

```ts
interface SkillLearningRequirement {
    level: number;
    statRequirementType?: 'body' | 'mind' | 'heart';
    statRequirementValue?: number;
    prerequisiteSkill?: string;
}
```

## Library

18 skills, **3 per stat × 2 categories**:

|         | Fallacy | Paradox |
|---------|---------|---------|
| **Body** | Appeal to Force · Ad Baculum Strike · Strawman Smash | Ship of Theseus · Sorites Pile · Zeno's Arrow |
| **Mind** | Red Herring · Argument from Authority · Circular Reasoning | Liar's Paradox · Grandfather Paradox · Unexpected Hanging |
| **Heart**| Appeal to Emotion · Ad Hominem · Tu Quoque | Paradox of Tolerance · Buridan's Devotion · Omnipotence Paradox |

Power scales from Tier 1 (`basePower 1-3`, `manaCost 3-5`) to Tier 3 (`basePower 6-8`, `manaCost 10-14`). Every Tier 2/3 skill has a level + stat gate, and every `combatEffects` entry references an existing buff / debuff effect ID.

## Engine API

```ts
createSkill(opts)                                // Build a Skill with sensible defaults
canUseSkill(character, skill)                    // Mana, level, stat gates
calculateSkillDamage(character, skill, advantage)// basePower + scalingStat + advantage
executeSkill(state, skillId, actor)              // Full resolution → { state, damageDealt, healing, procs, message }
learnSkill(character, skill)                     // Adds skill to character.knownSkills (if eligible)
```

## Damage Formula

```
raw           = skill.basePower + character.derivedStats[skill.scalingStat]
advantageMod  = (per advantageInteraction)
final         = max(0, raw + advantageMod)
```

## Execution Pipeline (`executeSkill`)

1. `canUseSkill` gate (mana, level, stats).
2. Subtract `manaCost` from the actor.
3. Compute power via `calculateSkillDamage`.
4. Apply effect:
   - `self` / `all_allies` → `healCharacter(actor, power)`
   - `enemy` / `all_enemies` → `applyDamage(target, power)`
5. Roll each entry in `skill.combatEffects` and apply via the effects engine. `chance ≥ 1` always fires.
6. Return a structured `SkillExecutionResult` for the battle log.

## See also

- `docs/combat.md` — Tier 1 stance effects, Tier 2/3 proc matrix, combat round flow.
- `docs/effects.md` — Effect tier resist rules, `applyEffect` stacking modes.
- `docs/character.md` — Stat derivation, `knownSkills` / `equippedSkills`.
