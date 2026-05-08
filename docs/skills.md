# Skills

> **Status:** Types only. The runtime engine, library, and learning flow are pending
> Phase 3 (`GAME-ROADMAP.md`). The active design conversation lives in
> [`specs/04-skills-engine.md`](../specs/04-skills-engine.md). Open design questions
> are tracked there with placeholders for the developer to answer.

## Overview

Skills are learnable abilities aligned with one of the three philosophical aspects
(`body` / `mind` / `heart`). Each is categorised as a **fallacy** (logical) or a
**paradox** (metaphysical). Skills are not yet wired into combat — only the type
shape exists.

## Type Shape

Defined in [`src/Skills/types.d.ts`](../src/Skills/types.d.ts).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | `string` | Unique skill identifier. |
| `name` | `string` | Display name. |
| `description` | `string` | Flavour text. |
| `category` | `'fallacy' \| 'paradox'` | Thematic grouping. |
| `philosophicalAspect` | `'body' \| 'mind' \| 'heart'` | Stat alignment + combat type. |
| `level` | `number` | Power tier (interpretation pending — see `specs/04`). |
| `manaCost` | `number` | Mana consumed on use. |
| `learningRequirement?` | `SkillLearningRequirement` | Level / stat / prerequisite gating. |
| `damageCalculation?` | `string` | Free-text formula (interpretation pending). |
| `effect?` | `string` | Free-text effect (interpretation pending). |

## Public API (current)

```ts
import type {
  Skill, SkillCategory, SkillsStatType, SkillLearningRequirement,
} from 'axiomancer-mechanics';
```

No runtime functions are exported yet. The barrel re-exports types only.

## Pending (Phase 3)

- `Skill` extensions: `combatEffects`, `targetType`, `basePower`, `scalingStat`, `tier`,
  `advantageInteraction`.
- `skill.library.ts` — at least 18 skills spread across stats, categories, and tiers.
- Engine: `createSkill`, `canUseSkill`, `calculateSkillDamage`, `executeSkill`, `learnSkill`.
- Mana economy decisions (regen rate, basic-attack-vs-skill split). See `specs/04`.

## Source Material

- [`docs/references/all-fallacies-reference.md`](./references/all-fallacies-reference.md)
- [`docs/references/all-paradoxes-reference.md`](./references/all-paradoxes-reference.md)
