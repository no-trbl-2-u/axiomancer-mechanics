# TypeScript Style Guide - Axiomancer

This style guide documents the patterns and conventions established for this project, based on the code review and improvements.

## Table of Contents
1. [Type Definitions](#type-definitions)
2. [Constants and Magic Numbers](#constants-and-magic-numbers)
3. [Function Patterns](#function-patterns)
4. [Error Handling](#error-handling)
5. [Validation](#validation)
6. [Documentation](#documentation)

---

## Type Definitions

### ✅ DO: Use Simple Array Types

```typescript
// ✅ Good
inventory: Item[];
enemies: Enemy[];

// ❌ Avoid
inventory: Item[] | [];  // Redundant
```

**Rationale:** `Item[]` already includes empty arrays. The `| []` is redundant and adds noise.

---

### ✅ DO: Use Optional Properties Correctly

```typescript
// ✅ Good - Truly optional
description?: string;

// ✅ Good - Required property
name: string;

// ❌ Avoid - Confusing null usage
equipped?: null;
```

**Rationale:** Optional properties (`?`) are already `undefined` when not set. Using `?: null` is non-idiomatic.

---

### ✅ DO: Use Discriminated Unions for Variant Types

```typescript
// ✅ Good - Type-safe with discriminant
export interface Equipment extends BaseItem {
    category: 'equipment';
    slot: EquipmentSlot;
}

export interface Consumable extends BaseItem {
    category: 'consumable';
    quantity: number;
}

export type Item = Equipment | Consumable | Material | QuestItem;

// Usage with type narrowing
function useItem(item: Item) {
    if (item.category === 'consumable') {
        // TypeScript knows item.quantity exists here
        console.log(item.quantity);
    }
}

// ❌ Avoid - No type discrimination
export type Item = 'equipment' | 'consumable' | 'material';
```

**Benefits:**
- Type-safe access to variant-specific properties
- IDE autocomplete for each variant
- Prevents accessing properties that don't exist

---

### ✅ DO: Use Const Assertions for Literal Types

```typescript
// ✅ Good - Literal types inferred
export const COMBAT_ACTION = {
    ATTACK: "attack",
    DEFEND: "defend",
} as const;

// Type: { readonly ATTACK: "attack"; readonly DEFEND: "defend" }

// ❌ Avoid - Generic string types
export const COMBAT_ACTION = {
    ATTACK: "attack",
    DEFEND: "defend",
};
// Type: { ATTACK: string; DEFEND: string }
```

---

### ✅ DO: Use Pick and Omit for Subset Types

```typescript
// ✅ Good - Explicit about what's needed
function calculateMaxHealth(
    level: number, 
    healthStats: Pick<BaseStats, 'body' | 'heart'>
): number {
    // ...
}

// ❌ Avoid - Less clear
function calculateMaxHealth(
    level: number, 
    healthStats: Omit<BaseStats, 'mind'>
): number {
    // ...
}
```

**Rationale:** `Pick` is more explicit about requirements. If BaseStats grows, Pick continues to work as expected.

---

## Constants and Magic Numbers

### ✅ DO: Extract Magic Numbers to Named Constants

```typescript
// ✅ Good
const STAT_MULTIPLIERS = {
    DEFENSE: 3,
    SAVE: 2,
    TEST: 4,
} as const;

const physicalDefense = body * STAT_MULTIPLIERS.DEFENSE;

// ❌ Avoid
const physicalDefense = body * 3;  // What does 3 mean?
```

**Benefits:**
- Self-documenting code
- Easy to adjust game balance
- Single source of truth

---

### ✅ DO: Group Related Constants

```typescript
// ✅ Good - Related constants grouped
const RESOURCE_MULTIPLIERS = {
    HEALTH_PER_STAT: 10,
    MANA_PER_STAT: 10,
} as const;

// ❌ Avoid - Scattered constants
const HEALTH_MULTIPLIER = 10;
const MANA_MULTIPLIER = 10;
```

---

### ✅ DO: Use SCREAMING_SNAKE_CASE for Constants

```typescript
// ✅ Good
const EXPERIENCE_PER_LEVEL = 1000;
const MAX_LEVEL = 100;

// ❌ Avoid
const experiencePerLevel = 1000;
const maxLevel = 100;
```

---

## Function Patterns

### ✅ DO: Use Function Declarations for Named Functions

```typescript
// ✅ Good - Clear, simple
function calculateMaxHealth(level: number, stats: BaseStats): number {
    return level * average(stats.body, stats.heart) * HEALTH_MULTIPLIER;
}

// ❌ Avoid - Unnecessary complexity (unless you need partial application)
const calculateMaxHealth = (level: number) => (stats: BaseStats) => {
    return level * average(stats.body, stats.heart) * 10;
}
```

**Use currying only when:**
- Building function composition pipelines
- Need genuine partial application
- Creating higher-order functions

---

### ✅ DO: Use Descriptive Function Names

```typescript
// ✅ Good
function calculateMaxHealth(...)
function deriveStats(...)
function createCharacter(...)

// ❌ Avoid - Abbreviations
function detMaxHealthByLevel(...)  // det = determine? detect?
function calcHP(...)
```

---

### ✅ DO: Use Utility Functions for Common Operations

```typescript
// ✅ Good - Reusable utility
import { average } from '../Utils';

const luck = average(body, heart, mind);

// ❌ Avoid - Repeated logic
const luck = (body + heart + mind) / 3;
const avgHealth = (body + heart) / 2;
const avgMana = (mind + heart) / 2;
```

---

## Error Handling

### ✅ DO: Create Custom Error Classes

```typescript
// ✅ Good
class MapNotFoundError extends Error {
    constructor(mapName: string) {
        super(`Map "${mapName}" not found`);
        this.name = 'MapNotFoundError';
    }
}

throw new MapNotFoundError(mapName);

// ❌ Avoid - Generic errors
throw new Error('Invalid map name');
```

**Benefits:**
- Specific error types for different scenarios
- Better error messages
- Easier to catch and handle specific errors

---

### ✅ DO: Use Exhaustiveness Checking in Switch Statements

```typescript
// ✅ Good - TypeScript will error if we miss a case
function getMap(mapName: MapName): Map {
    switch (mapName) {
        case 'fishing-village':
            return fishingVillage;
        case 'northern-forest':
            return northernForest;
        default:
            const exhaustiveCheck: never = mapName;
            throw new MapNotFoundError(exhaustiveCheck);
    }
}

// ❌ Avoid - No exhaustiveness check
function getMap(mapName: MapName): Map {
    switch (mapName) {
        case 'fishing-village':
            return fishingVillage;
        default:
            throw new Error('Invalid map');
    }
}
// If we add a new map type, TypeScript won't warn us!
```

---

## Validation

### ✅ DO: Add Input Validation to User-Facing Interfaces

```typescript
// ✅ Good - CLI with validation
{
    type: 'number',
    name: 'level',
    message: 'Enter level (1-100)...',
    validate: (input: number) => {
        if (!Number.isInteger(input) || input < 1 || input > 100) {
            return 'Level must be between 1 and 100';
        }
        return true;
    }
}

// ❌ Avoid - No validation
{
    type: 'input',  // String input for a number!
    name: 'level',
    message: 'Enter level...',
}
```

---

### ✅ DO: Create Type Guards for Runtime Checks

```typescript
// ✅ Good - Type-safe runtime check
function isCharacter(entity: Character | Enemy): entity is Character {
    return 'baseStats' in entity;
}

// Usage
if (isCharacter(entity)) {
    // TypeScript knows entity is Character here
    console.log(entity.baseStats);
}

// ❌ Avoid - No type safety
function isCharacter(entity: any): boolean {
    return entity.baseStats !== undefined;
}
```

---

## Documentation

### ✅ DO: Write Comprehensive JSDoc Comments

```typescript
/**
 * Calculates the maximum health of a character
 * 
 * @param level - The character's level
 * @param healthStats - The stats that determine max health (body and heart)
 * @returns The maximum health value
 * 
 * @remarks
 * Equation: level × average(body, heart) × HEALTH_PER_STAT
 * 
 * @example
 * ```typescript
 * const maxHP = calculateMaxHealth(5, { body: 10, heart: 8 });
 * console.log(maxHP); // 450
 * ```
 */
function calculateMaxHealth(
    level: number, 
    healthStats: Pick<BaseStats, 'body' | 'heart'>
): number {
    // ...
}
```

**Include:**
- Clear description
- All parameters with types and descriptions
- Return value description
- Remarks for important notes
- Examples for complex functions

---

### ✅ DO: Document Constants and Type Aliases

```typescript
/**
 * Constants for derived stat calculations
 * These multipliers are applied to base stats to calculate derived combat stats
 */
const STAT_MULTIPLIERS = {
    /** Multiplier for skill stats (1:1 ratio with base stat) */
    SKILL: 1,
    /** Multiplier for defense stats */
    DEFENSE: 3,
    /** Multiplier for save stats */
    SAVE: 2,
    /** Multiplier for test stats */
    TEST: 4,
} as const;

/**
 * Item categories available in the game
 * Used to discriminate between different item types
 */
export type ItemCategory = 'equipment' | 'consumable' | 'material' | 'quest-item';
```

---

### ✅ DO: Use TODO Comments Properly

```typescript
// ✅ Good - Specific and actionable
// TODO: Add stat modifiers when Equipment system is implemented
// TODO: Verify damage calculation with game design team

// ❌ Avoid - Vague
// TODO: Implement this
// TODO: Fix later
```

---

## Code Organization

### ✅ DO: Group Related Functionality

```typescript
// ✅ Good - Logical grouping
// Constants
const STAT_MULTIPLIERS = { ... };
const RESOURCE_MULTIPLIERS = { ... };

// Helper Functions
function calculateMaxHealth(...) { ... }
function calculateMaxMana(...) { ... }

// Main Export
export function createCharacter(...) { ... }
```

---

### ✅ DO: Keep Files Focused

```typescript
// ✅ Good file structure
src/
├── Character/
│   ├── index.ts          // Main implementation
│   ├── types.d.ts        // Type definitions
│   ├── character.cli.ts  // CLI tool
│   └── character.mock.ts // Test data

// ❌ Avoid - Everything in one file
src/
├── Character/
│   └── index.ts  // 2000+ lines with types, implementation, CLI, tests
```

---

## Quick Reference

### Type Safety Checklist
- [ ] No `| []` redundant array types
- [ ] No `?: null` confusing optional syntax
- [ ] Use discriminated unions for variants
- [ ] Add const assertions to object literals
- [ ] Create type guards for runtime checks

### Code Quality Checklist
- [ ] Magic numbers extracted to named constants
- [ ] Functions have descriptive names
- [ ] No unnecessary currying
- [ ] Custom error classes for specific errors
- [ ] Input validation on user-facing code

### Documentation Checklist
- [ ] JSDoc on all public functions
- [ ] Examples for complex functions
- [ ] Constants documented
- [ ] TODO comments are specific
- [ ] Type aliases explained

---

## Violations and How to Fix Them

### "This type is too generic"
```typescript
// ❌ Problem
function processData(data: any) { ... }

// ✅ Solution
function processData<T extends BaseData>(data: T) { ... }
```

### "Magic number in calculation"
```typescript
// ❌ Problem
const defense = body * 3;

// ✅ Solution
const DEFENSE_MULTIPLIER = 3;
const defense = body * DEFENSE_MULTIPLIER;
```

### "No input validation"
```typescript
// ❌ Problem
function setLevel(level: number) {
    character.level = level;
}

// ✅ Solution
function setLevel(level: number) {
    if (level < 1 || level > MAX_LEVEL) {
        throw new Error(`Level must be between 1 and ${MAX_LEVEL}`);
    }
    character.level = level;
}
```

---

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- Project documentation:
  - `CODE_REVIEW.md` - Comprehensive code review
  - `IMPROVEMENTS_IMPLEMENTED.md` - Applied improvements
  - This file - Style guide and patterns

---

**Last Updated:** 2025-12-04
**Applies to:** Axiomancer Mechanics v1.0.0
