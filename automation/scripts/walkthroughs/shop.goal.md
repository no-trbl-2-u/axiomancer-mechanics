# Goal — shop walkthrough

**Surface under test:** the Phase 37 shop economy — `buyItem` /
`sellItem` reducers in `src/Items/shop.reducer.ts`, the
`defaultSellPrice(ware)` strictly-less-than-buy invariant, and the CLI
`shopLoop` that opens automatically when a `village` MapEvent resolves
with a `shop` payload.

Post-Phase-161 map truth: the village is **fv-4 "Wharfside Market"**
(`fv-4.village` pool; wares `minor-healing-potion` 10 / `antidote` 12 /
`healing-potion` 30). The CLI bootstraps a blank level-1 character with
**0 currency**, so the script first grants 100 via the DEV tab, then
walks the spine fv-1 → fv-2 (loot-cache, `{"pick":"seal"}`) → fv-3
(rest — The Night Watch, answers
`{"posture":"deep"}` / `{"ack":"continue"}` / `{"pick":"option:hold"}` /
`{"pick":"option:feed"}` for the seed-0 night) → fv-4 (village), buys the
`minor-healing-potion`, sells it straight back, leaves, checks Inventory,
quits.

The ledger to pin: 100 → buy 10 → 90 → sell 5 → 95. Net 5 burned by the
round-trip, consistent with `defaultSellPrice` = floor(price/2) always
strictly below the buy price.

**Pass conditions (the agent should verify against the state log +
event stream):**

1. Bootstrap records the blank character; a dev `grant-currency` step
   raises `player.currency` to 100.
2. `moveToNode fv-2` → `resolveMapEvent` kind `'loot-cache'`
   (`deferred: true`) + a `minigame:end` event for fv-2.
3. `moveToNode fv-3` → `resolveMapEvent` kind `'rest'`
   (`deferred: true`) + a `minigame:end` event for fv-3 (the Night Watch
   really ran — `summary.tier` non-null).
4. `moveToNode fv-4` → `resolveMapEvent` kind `'village'` with
   `event.villageName === 'Wharfside Market'` and 3 wares.
5. A `buyItem` state-log record with `event.itemId ===
   'minor-healing-potion'` and `event.price === 10`; after it
   `player.currency === 90` and the potion is in inventory.
6. A `sellItem` state-log record with `event.itemId ===
   'minor-healing-potion'` and `event.price === 5`; after it
   `player.currency === 95` and the potion is gone. Sell price is
   strictly less than buy price.
7. The shop closes via `leave`; the session exits via `quit`
   (`cli:exit` reason `'quit'`).

**Negative conditions (the agent should NOT see):**

- Any `buyItem` / `sellItem` record with `event.price <= 0`.
- The player ending with more currency than the granted 100 (the
  round-trip exploit closed at iterate `3ba5319`).
- `hazardCombat:start` — this route (fv-2, fv-3, fv-4) has no encounter
  node.

**Diagnostic notes for the agent:**

- Every path from fv-1 to the fv-4 village passes a loot-cache and
  either the fv-3 rest or the fv-13 gathering node, so the script
  answers those interactive minigame prompts inline (deterministic for
  the default `--seed` 0).
- The rest keepsake does not map to an inventory item, so the potion
  sits at inventory index 0 when it is sold (`sellChoice: "0:5"`).
