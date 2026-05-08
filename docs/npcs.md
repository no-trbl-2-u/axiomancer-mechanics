# NPCs

> **Status:** Types only. Dialogue runtime, shop logic, and quest dialogue are pending
> Phase 7. The active design conversation lives in
> [`specs/08-world-content-and-hazards.md`](../specs/08-world-content-and-hazards.md).

## Type Shape

Defined in [`src/NPCs/types.d.ts`](../src/NPCs/types.d.ts).

```ts
interface NPC {
  name: string;
  dialogue: DialogueMap;
  description?: string;
  image?: Image;
}

interface DialogueMap {
  [key: string]: string | string[];
}
```

`DialogueMap` is keyed by trigger / context (e.g. `"greeting"`, `"shop_open"`,
`"quest_<id>_offer"`). Either a single line or an array of lines is allowed; an array
is interpreted as a sequence to play in order. The richer "branching dialogue" tree
type is pending — see `specs/08`.

## Public API (current)

```ts
import type { NPC, DialogueMap } from 'axiomancer-mechanics';
```

No runtime functions are exported yet.

## Pending (Phase 7)

- NPC placement on `WorldMap.npcs` is typed but no runtime helpers exist for spawning,
  conversing with, or remembering interactions.
- Branching dialogue tree (decision nodes, gated by quest / moral state).
- Shop NPCs: inventory, prices, stock refresh.
- Quest-giver flow: hook into the quest engine (also pending — `quest.library.ts`
  currently contains only quest names).

See [`specs/08-world-content-and-hazards.md`](../specs/08-world-content-and-hazards.md).
