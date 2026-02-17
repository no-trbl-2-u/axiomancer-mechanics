# NPCs Module

The NPCs module defines non-player characters that can be interacted with in the game world. NPCs have dialogue systems and are encountered on maps.

## Core Concepts

- **NPC**: A non-player character with a name, dialogue, and optional description/image
- **DialogueMap**: Flexible key-value mapping for dialogue trees

## Files

| File | Purpose |
|------|---------|
| `index.ts` | Module exports (re-exports types) |
| `types.d.ts` | Type definitions for `NPC` and `DialogueMap` |

## Types

### NPC
```typescript
interface NPC {
    name: string;
    dialogue: DialogueMap;
    description?: string;
    image?: Image;
}
```

### DialogueMap
```typescript
interface DialogueMap {
    [key: string]: string | string[];
}
```

## Status

This module is in early development. Future work includes:
- NPC library with defined characters
- Dialogue system with branching conversations
- Quest-giving NPC interactions
- Shop NPC functionality
