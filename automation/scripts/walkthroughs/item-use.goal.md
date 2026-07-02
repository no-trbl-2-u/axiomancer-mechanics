# Goal — item-use walkthrough

**Surface under test:** the consumable inventory surface through the
CLI — `devGrantAllConsumables` stacking every library consumable into
`player.inventory` and the Inventory tab rendering quantities.

The old form of this walkthrough (Wanderer firing a `healing-potion`
mid-fight via the in-combat `item` action) drove the removed legacy
combat loop; in-combat item consumption now lives in the Hazard-Pattern
combat engine and its hermetic e2e coverage. The scripted game CLI has
no interactive combat prompts any more (encounters auto-resolve in
script mode), so this walkthrough pins the remaining player-facing item
surface: acquisition + stacked rendering.

Script: `{"tab":"dev"}` → `{"action":"grant-consumables"}` →
`{"tab":"inventory"}` → `{"tab":"quit"}`.

**Pass conditions (the agent should verify against the state log +
event stream):**

1. Bootstrap records the blank level-1 character with an empty
   inventory.
2. The DEV grant fires `inventory:changed` events (one per consumable
   template) and the resulting state shows the full consumable library
   in `player.inventory`, each with `quantity: 5` — including
   `healing-potion` and `minor-healing-potion`.
3. The Inventory tab renders each item with a `×5` quantity suffix and
   its description (human log `— Inventory —` block).
4. The session exits cleanly via `quit` (`cli:exit` reason `'quit'`).

**Fail conditions:**

- The grant leaves the inventory empty or un-stacked (quantities
  missing).
- The CLI exited with `reason: 'error'`.

**Diagnostic notes for the agent:**

- To watch a consumable actually being USED in combat, drive the
  combat CLI directly (`npm run combat -- --enemy <slug> ...`) or see
  `src/CLI/e2e/combat.cli.engine.test.ts`; the shop walkthrough covers
  the buy/sell half of the item economy.
