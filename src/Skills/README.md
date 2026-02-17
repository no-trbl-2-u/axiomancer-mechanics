# Skills Module

The Skills module manages the ability system where skills are themed around logical fallacies and philosophical paradoxes. Skills have mana costs, level requirements, and scale with base stats.

## Core Concepts

- **Fallacies**: One category of skills based on logical fallacies
- **Paradoxes**: Another category based on philosophical paradoxes
- **Philosophical Aspect**: Each skill aligns with body, mind, or heart and scales with that stat
- **Mana Cost**: Skills require mana to use

## Files

| File | Purpose |
|------|---------|
| `index.ts` | Skill creation, usage validation, and damage calculation |
| `types.d.ts` | Type definitions for `Skill`, `SkillCategory`, `SkillsStatType` |
| `skill.library.ts` | Static skill data definitions (TODO) |
| `skills.test.ts` | Unit tests for skill functions |

## Key Functions

- **`createSkill(id, name, description, level, manaCost, type, philosophicalAspect?)`** - Creates a new Skill instance
- **`canUseSkill(character, skill)`** - Checks if character has enough mana
- **`calculateSkillDamage(skill, character)`** - Computes damage as `floor(level * baseStat * 1.5)`

## Skill Properties

| Property | Description |
|----------|-------------|
| `id` | Unique identifier |
| `name` | Display name |
| `category` | `'fallacy'` or `'paradox'` |
| `philosophicalAspect` | `'body'`, `'mind'`, or `'heart'` |
| `level` | Power tier (affects damage) |
| `manaCost` | Mana required to use |
| `learningRequirement` | Optional prerequisites |

## Usage

```typescript
import { createSkill, canUseSkill, calculateSkillDamage } from './Skills';

const skill = createSkill('sk-01', 'Straw Man', 'Attack with a straw man', 2, 10, 'fallacy', 'mind');

if (canUseSkill(character, skill)) {
    const damage = calculateSkillDamage(skill, character);
}
```
