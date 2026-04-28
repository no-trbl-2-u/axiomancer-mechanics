# Equipment & Items

> Wearable gear and consumable items, both modelled as a single discriminated `Item` union with type guards.

## Item Categories

```ts
type ItemCategory = 'equipment' | 'consumable' | 'material' | 'quest-item';
type Item = Equipment | Consumable | Material | QuestItem;
```

Type guards in `src/Items/types.ts`:

| Guard | Returns true when… |
|---|---|
| `isEquipment(i)` | `i.category === 'equipment'` |
| `isConsumable(i)` | `i.category === 'consumable'` |
| `isMaterial(i)` | `i.category === 'material'` |
| `isQuestItem(i)` | `i.category === 'quest-item'` |

## Equipment

Wearable gear that goes into a slot.

```ts
interface Equipment extends BaseItem {
    category: 'equipment';
    slot: EquipmentSlot;             // weapon / armor / accessory / head / body / hands / feet
    statModifiers?: StatModifier[];  // Static stat changes while equipped
    passiveEffects?: string[];       // Effect IDs applied on equip / removed on unequip
    onHitEffects?: CombatEffectTrigger[];
    onDefendEffects?: CombatEffectTrigger[];
    teir?: 'Teir 1' | 'Teir 2' | 'Teir 3';
}
```

Equipment is stored in `src/Items/equipment.library.ts` (18 items: 6 weapons, 6 armor, 6 accessories — two per stat alignment). Look-up: `lookupEquipment(id)`, `getAllEquipment()`, `getEquipmentBySlot(slot)`.

### Engine

```ts
equipItem(character, item)                  // → Character & { equipment: { [slot]: item } }
unequipItem(character, slot)                // Remove the item in `slot`
getEquipmentModifiers(character)            // → { statModifiers, statMultipliers, passiveEffects, onHitEffects, onDefendEffects }
```

`Character & { equipment }` is a structural augment — we do not mutate the existing `Character` type. The `equipItem` / `unequipItem` helpers are reference-stable on no-op paths (idempotent equips, empty-slot unequips).

## Consumables

```ts
interface Consumable extends BaseItem {
    category: 'consumable';
    effect: string;        // Legacy field — human-readable description
    quantity: number;
    effectId?: string;     // Effect from buffs/debuffs library to apply
    heal?: number;         // Flat HP restored
    restoreMana?: number;  // Flat MP restored
    duration?: number;     // Optional override for the effect's duration
    power?: number;        // Optional intensity override (default 1)
}
```

`src/Items/consumable.library.json` ships 12 consumables: 3 healing potions, 3 mana draughts, 3 stat-boost potions, 3 offensive throwables (Curry's Vial, Witchfire Phial, Buridan's Hourglass).

### `useConsumable(state, itemId)` pipeline

1. Find the item; abort if not consumable.
2. If `heal` is set → `healCharacter(player, heal)`.
3. If `restoreMana` is set → clamp `player.mana += restoreMana` to `maxMana`.
4. If `effectId` is set → `applyEffect(player.currentActiveEffects, effectDef, round, { intensityDelta: power, ...durationOverrides })`.
5. Decrement `quantity`; remove the stack at 0.

## Materials & Quest Items

Plain stackable / quest-flagged items used by the inventory but unaffected by combat. Both are stored on the discriminated union for future quest / crafting logic.

## Inventory API

```ts
addItemToInventory(state, item)
removeItemFromInventory(state, itemId)
useConsumable(state, itemId)
stackItem(state, itemId, amount)
```

The Zustand store in `Game/store.ts` provides equivalent methods that wrap these reducers for the CLI flow.

## See also

- `docs/skills.md` — `combatEffects` shape (shared with skills).
- `docs/effects.md` — effect IDs available for `passiveEffects` / `onHitEffects` / `onDefendEffects`.
