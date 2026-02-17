# Character Module

The Character module defines player characters and their stat systems. It handles character creation, stat derivation, and resource (health/mana) calculation.

## Core Concepts

- **Base Stats**: Heart, Body, and Mind are the three fundamental attributes
- **Derived Stats**: Calculated from base stats using multipliers (Skill, Defense, Save, Test)
- **Resources**: Health (from Body + Heart) and Mana (from Mind + Heart) scale with level

## Files

| File | Purpose |
|------|---------|
| `index.ts` | Character creation and stat calculation functions |
| `types.d.ts` | Type definitions for `Character`, `BaseStats`, and `DerivedStats` |
| `characters.mock.ts` | Mock character data for development and testing |
| `character.cli.ts` | CLI interface for character creation |
| `character.test.ts` | Unit tests for character creation and stat derivation |

## Key Functions

- **`createCharacter(options)`** - Creates a new character with derived stats, health, mana, and experience
- **`deriveStats(baseStats)`** - Internal function that calculates all 13 derived stats from base stats
- **`calculateMaxHealth(level, healthStats)`** - Computes max HP from level, body, and heart
- **`calculateMaxMana(level, manaStats)`** - Computes max MP from level, mind, and heart

## Stat Multipliers

| Multiplier | Value | Derived Stats |
|------------|-------|---------------|
| SKILL | 1x | physicalSkill, mentalSkill, emotionalSkill |
| DEFENSE | 3x | physicalDefense, mentalDefense, emotionalDefense |
| SAVE | 2x | physicalSave, mentalSave, emotionalSave |
| TEST | 4x | physicalTest, mentalTest, emotionalTest |

## Usage

```typescript
import { createCharacter } from './Character';

const hero = createCharacter({
    name: 'Axiomancer',
    level: 1,
    baseStats: { heart: 4, body: 3, mind: 2 },
});
```
