# Items Module

The Items module defines the item system including equipment, consumables, materials, and quest items. It provides type guards for runtime type checking and reducer functions for inventory management.

## Core Concepts

- **Discriminated Unions**: Items use a `category` discriminator for type-safe handling
- **Type Guards**: Runtime functions to narrow item types
- **Immutable Reducers**: All inventory operations return new state objects

## Files

| File | Purpose |
|------|---------|
| `index.ts` | Re-exports types and type guards |
| `types.ts` | Type definitions and type guard functions for all item types |
| `item.reducer.ts` | Pure functions for inventory management (add, remove, use, stack) |
| `consumable.library.json` | Static consumable item data |
| `equipment.library.json` | Static equipment item data (TODO) |
| `items.test.ts` | Unit tests for type guards and reducer functions |

## Item Categories

| Category | Interface | Description |
|----------|-----------|-------------|
| `equipment` | `Equipment` | Equippable items with slot assignments |
| `consumable` | `Consumable` | Single-use items with quantity tracking |
| `material` | `Material` | Crafting materials with quantity tracking |
| `quest-item` | `QuestItem` | Quest-specific items tied to a quest ID |

## Type Guards

```typescript
import { isEquipment, isConsumable, isMaterial, isQuestItem } from './Items';

if (isEquipment(item)) {
    console.log(item.slot); // TypeScript knows this is Equipment
}
```

## Reducer Functions

- **`addItemToInventory(state, item)`** - Adds an item to player inventory
- **`removeItemFromInventory(state, itemId)`** - Removes an item by ID
- **`useConsumable(state, itemId)`** - Uses a consumable, reducing quantity or removing it
- **`stackItem(state, itemId, amount)`** - Increases quantity of stackable items
