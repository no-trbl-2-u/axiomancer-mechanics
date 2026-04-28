# NPCs

> Non-combat actors that populate maps with dialogue, services, and quests. NPCs do not enter combat — adversaries live in `Enemy` instead.

## NPC Type

Defined in `src/NPCs/types.d.ts`:

```ts
interface NPC {
    id: string;
    name: string;
    description: string;
    mapLocation: Pick<Map, 'name'>;
    dialogue: DialogueMap;
    services?: NPCService[];
    questGivers?: string[];     // Quest IDs offered by this NPC
}

type DialogueMap = Record<string, DialogueNode>;

interface DialogueNode {
    id: string;
    text: string;
    choices: DialogueChoice[];
}

interface DialogueChoice {
    label: string;
    nextNodeId?: string;        // Branching dialogue
    triggerEvent?: string;      // Game event ID
    requirement?: DialogueRequirement;
}
```

## Status

NPCs are **typed but not yet populated** — `src/NPCs/index.ts` only re-exports the types. Phase 7b will wire up the NPC library, dialogue trees, and shop services. This page captures the contract so future content authors and engine work converge.

## Planned Services

| Service kind | Notes |
|---|---|
| `shop` | Buy / sell consumables and equipment; uses item libraries from Phase 4 |
| `rest` | Restore HP / MP between encounters |
| `quest` | Issue and resolve quests with rewards (XP, items, map unlocks) |
| `lore` | Pure-flavour dialogue with no mechanical effect |

## Dialogue Branching

Dialogue forms a graph via `nextNodeId`. Choices may gate on a `requirement` (level, item, completed quest, completed event). Selecting a choice may fire a `triggerEvent` consumed by the game reducer (e.g. `QUEST_START`, `MAP_UNLOCK`, `ITEM_GIVE`).

## See also

- `docs/character.md` — character stats relevant to dialogue gating.
- `docs/world.md` — how NPCs hang off `Map.npcs` and contribute to map content.
