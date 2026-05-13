# NPCs

> **Status:** Branching dialogue runtime is live (Spec 08 Q9). NPCs carry a
> legacy flat `dialogue` map and/or a structured `dialogueTree`; the engine
> exports tree-traversal helpers and a `GameState`-side-effect applier.
> Shop NPCs are typed but shop reducers (inventory, prices, stock refresh)
> are still pending — see [`specs/08-world-content-and-hazards.md`](../specs/08-world-content-and-hazards.md).

## Type Shape

Defined in [`src/NPCs/types.d.ts`](../src/NPCs/types.d.ts).

```ts
interface NPC {
    name: string;
    dialogue?: DialogueMap;        // legacy flat map (Q9 back-compat)
    dialogueTree?: DialogueTree;   // preferred for new authoring
    description?: string;
    image?: Image;
    isShopkeeper?: boolean;        // marks the NPC as exposing a shop view
}

interface DialogueMap {
    [key: string]: string | string[];
}

interface DialogueTree {
    rootId: string;
    nodes: Record<string, DialogueNode>;
}

interface DialogueNode {
    id: string;
    text: string;
    choices?: DialogueChoice[];    // omit for leaf nodes (terminator)
}

interface DialogueChoice {
    text: string;
    nextNodeId?: string;           // omit to end the conversation
    requires?: {
        quest?: QuestName;          // satisfied when the quest is active OR completed
        flag?: string;              // satisfied when the named flag is set
        questCompleted?: QuestName; // satisfied only when completed
    };
    effect?: {
        startQuest?: QuestName;
        progressQuest?: { name: QuestName; objectiveId: string; amount?: number };
        completeQuest?: QuestName;
        teachSkill?: string;
        setFlag?: string;
        grantCurrency?: number;
    };
}
```

`DialogueMap` is the original flat shape keyed by trigger / context (e.g.
`"greeting"`, `"shop_open"`, `"quest_<id>_offer"`). Either a single line or an
array of lines is allowed; an array is interpreted as a sequence to play in
order. Retained for the existing NPC data — new content should author a
`DialogueTree` instead so the Spec 10 moral / quest gates have something to
grip.

## Public API (current)

```ts
import type {
    NPC, DialogueMap,
    DialogueTree, DialogueNode, DialogueChoice, DialogueContext,
} from 'axiomancer-mechanics';

import {
    getDialogueNode,    // (tree, nodeId) → DialogueNode; throws on unknown id
    visibleChoices,     // (node, ctx)    → DialogueChoice[] (filtered by `requires`)
    isLeafNode,         // (node)         → true when no choices / empty choices
} from 'axiomancer-mechanics';
```

### `DialogueContext`

The predicate context `visibleChoices` consumes when filtering by `requires`:

```ts
interface DialogueContext {
    activeQuests:    ReadonlySet<string>;
    completedQuests: ReadonlySet<string>;
    flags:           ReadonlySet<string>;
}
```

`requires.quest` is satisfied when the named quest is **active OR completed**;
`requires.questCompleted` is satisfied **only** when completed; `requires.flag`
is satisfied when the named flag is present in `ctx.flags`. All declared
`requires` must hold simultaneously for the choice to be visible.

### Side-effect orchestration (World module)

Applying a chosen `DialogueChoice` to `GameState` is the World module's
responsibility — see [`docs/world.md`](./world.md) and
[`src/World/dialogue.runtime.ts`](../src/World/dialogue.runtime.ts):

```ts
import { applyDialogueChoice } from 'axiomancer-mechanics';
// → ApplyDialogueChoiceResult: { gameState, nextNode, effects: { startedQuest, ... } }
```

`applyDialogueChoice` reads the current map's `MapDefinition.quests` to
resolve a quest by name, then routes the choice's `effect` payload through
the quest engine (start / progress / complete), the player's `knownSkills`
(teach), `gameState.flags` (set flag), and `player.currency` (grant currency).
It returns the next dialogue node (or `null` when the conversation ends)
alongside a flat side-effect summary the UI logs.

## Pending

- **Shop reducers** — `NPC.isShopkeeper` is typed but no `openShop` /
  `purchaseItem` reducers exist yet. Spec 08 Q8 added the `currency` counter;
  the shop transaction flow lands with the shops phase.
- **Moral gating** — Spec 10 will fold a moral-state read into
  `DialogueContext` so choices can hide based on the player's alignment.
- **Dialogue-driven combat triggers** — currently choices can start quests
  and teach skills but cannot directly seed an encounter; a `startEncounter`
  effect is being scoped for a later spec.

See [`specs/08-world-content-and-hazards.md`](../specs/08-world-content-and-hazards.md).
