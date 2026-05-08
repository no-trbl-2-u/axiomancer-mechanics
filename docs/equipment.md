# Equipment & Items

> **Status:** Item types and inventory reducer exist; equipping/unequipping and stat
> modifiers are pending Phase 4. The active design conversation lives in
> [`specs/05-equipment-engine.md`](../specs/05-equipment-engine.md).

## Item Categories

Defined in [`src/Items/types.ts`](../src/Items/types.ts).

| Category | Discriminator | Notes |
|----------|---------------|-------|
| Equipment | `category: 'equipment'` | Has `slot: EquipmentSlot`. |
| Consumable | `category: 'consumable'` | Has `effect: string` and `quantity: number`. |
| Material | `category: 'material'` | Has `quantity: number`. Crafting is pending. |
| Quest Item | `category: 'quest-item'` | Has `questId: string`. |

The `Item` type is a discriminated union; `isEquipment` / `isConsumable` / `isMaterial`
/ `isQuestItem` are exported type guards.

## Equipment Slots

`'weapon' | 'armor' | 'accessory' | 'head' | 'body' | 'hands' | 'feet'`

The roadmap targets simultaneously equipping at least one of each. The current type
shape does not yet differentiate "primary" slots (weapon/armor/accessory) from
"sub-slots" (head/body/hands/feet) — that's a Phase 4 decision.

## Inventory Reducer

Pure functions in [`src/Items/item.reducer.ts`](../src/Items/item.reducer.ts):

| Function | Description |
|----------|-------------|
| `addItem(inventory, item)` | Append (or stack). |
| `removeItem(inventory, itemId)` | Remove by ID; decrements quantity if stackable. |
| `useConsumable(inventory, itemId)` | Decrement quantity; remove if 0. |
| `stackItem(inventory, item)` | Merge stackables (consumables, materials). |

The Zustand store (`Game/store.ts`) currently inlines the same logic for `addItemToInventory`,
`removeItemFromInventory`, `stackItem`, `useConsumable` — the reducer is kept as a
pure-function alternative for testing and React Native consumers.

## Pending (Phase 4)

- `Equipment.statModifiers: StatModifier[]` — hook into derived-stat aggregation.
- `Equipment.passiveEffects: string[]` — effect IDs always active while equipped.
- `Equipment.onHitEffects` / `onDefendEffects` — Tier 2/3 procs triggered in combat.
- `Equipment.tier` — gating + display.
- `Consumable.effectId: string` — reference into the effects library (replaces `effect: string`).
- `Consumable.duration` / `power` overrides — per-instance tuning of the referenced effect.
- Engine: `equipItem`, `unequipItem`, `getEquipmentModifiers`.
- Library: at least 18 equipment + 12 consumable definitions. See `specs/05`.
