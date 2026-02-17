# Utils Module

The Utils module provides shared utility functions used across the entire application. It includes mathematical helpers, dice rolling abstractions, string formatting, and runtime type guards.

## Files

| File | Purpose |
|------|---------|
| `index.ts` | General utility functions (math, dice, strings) |
| `typeGuards.ts` | Runtime type checking functions for game entities |
| `types.d.ts` | Shared type definitions (e.g., `Image`) |
| `utils.test.ts` | Tests for utility functions |
| `typeGuards.test.ts` | Tests for type guard functions |

## Utility Functions (`index.ts`)

### Math Utilities
- **`clamp(value, min, max)`** - Constrains a value within a range
- **`randomInt(min, max)`** - Generates a random integer (inclusive)
- **`average(...numbers)`** - Calculates the average of variadic numbers
- **`sum(arr)`** - Sums an array of numbers
- **`max(arr)`** - Returns the maximum from an array
- **`min(arr)`** - Returns the minimum from an array
- **`inRange(value, min, max)`** - Checks if a value is within a range

### Object Utilities
- **`deepClone(obj)`** - Creates a deep copy using JSON serialization

### Dice Rolling
- **`createDie(sides, timesRolled, func?)`** - Factory for creating die roll functions
- **`createDieRoll(advantage)`** - Creates a d20 roll function with advantage/disadvantage handling
- **`determineRollAdvantageModifier(advantage)`** - Returns the appropriate reducer (max/min/sum) for advantage state

### String Utilities
- **`capitalize(str)`** - Capitalizes the first letter
- **`formatPercent(value, decimals?)`** - Formats a number as a percentage string

## Type Guards (`typeGuards.ts`)

- **`isCharacter(entity)`** - Checks for `baseStats` property
- **`isEnemy(entity)`** - Checks for `enemyStats` property
- **`isCombatActive(state)`** - Checks if `combatState` is not null
- **`isValidNumber(value)`** - Validates finite, non-NaN numbers
- **`isNonEmptyString(value)`** - Validates non-empty, non-whitespace strings
