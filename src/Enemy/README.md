# Enemy Module

The Enemy module defines adversary characters that players encounter in combat. It includes enemy stat definitions, AI logic for decision-making, and the enemy library containing all defined enemies.

## Core Concepts

- **Enemy Stats**: Separate from player stats, enemies have attack/skill/defense for each type (body, mind, heart)
- **Enemy Logic**: AI behavior patterns that determine how enemies choose actions in combat
- **Enemy Tiers**: simple, normal, elite, boss, unique

## Files

| File | Purpose |
|------|---------|
| `index.ts` | Enemy utility functions (stat lookups) |
| `types.d.ts` | Type definitions for `Enemy`, `EnemyStats`, `EnemyLogic` |
| `enemy.logic.ts` | AI logic implementations for enemy decision-making |
| `enemy.library.ts` | Static enemy data definitions |
| `Enemy.test.ts` | Unit tests for enemy functions and library data |

## Key Functions

- **`getEnemyRelatedStat(enemy, base, isDefending)`** - Returns the relevant attack or defense stat based on type
- **`randomLogic()`** - Generates a random combat action (type + action) for enemy AI

## Enemy Logic Types

| Logic | Behavior |
|-------|----------|
| `random` | Randomly picks attack type and action |
| `aggressive` | Favors attack actions (TODO) |
| `defensive` | Favors defend actions (TODO) |
| `balanced` | Mix of attack and defend (TODO) |

## Usage

```typescript
import { getEnemyRelatedStat } from './Enemy';
import { Disatree_01 } from './Enemy/enemy.library';

const attackStat = getEnemyRelatedStat(Disatree_01, 'body', false);
const defenseStat = getEnemyRelatedStat(Disatree_01, 'body', true);
```
