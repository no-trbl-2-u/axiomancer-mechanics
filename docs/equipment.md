# Equipment & Items

> **Status:** Spec 05 + Spec 05b landed. Types, reducers, combat-side engine,
> store actions, CLI item prompt, hermetic e2e suites, and the full library
> content (50 equipment pieces + 12 consumables) are all in place. Outstanding
> work — loot drops (Spec 07), shop pricing (Spec 08), equipment as quest
> rewards (Spec 08), engine-side set-bonus checks (deferred follow-up).

## Item Categories

Defined in [`src/Items/types.ts`](../src/Items/types.ts).

| Category | Discriminator | Notes |
|----------|---------------|-------|
| Equipment | `category: 'equipment'` | Has `slot`, `tier`, optional `statModifiers`, `passiveEffects`, `onHitEffects`, `onDefendEffects`, `critStyle`, `resourceInteraction`. |
| Consumable | `category: 'consumable'` | Has `quantity` and any combination of `healAmount`, `effectId`, `inlineEffect`, `resourceGrant`, `intensityOverride`, `durationOverride`. |
| Material | `category: 'material'` | Has `quantity`. Crafting is pending. |
| Quest Item | `category: 'quest-item'` | Has `questId`. |

The `Item` type is a discriminated union; `isEquipment` / `isConsumable` /
`isMaterial` / `isQuestItem` are exported type guards.

## Equipment Slots

`'weapon' | 'armor' | 'accessory' | 'head' | 'body' | 'hands' | 'feet'`

All seven slots may be simultaneously equipped (Spec 05 Q1). A
`Character.equipment: Partial<Record<EquipmentSlot, Equipment>>` map carries
the wearer's current loadout.

## Equipment Type

```ts
interface Equipment extends BaseItem {
    category: 'equipment';
    slot: EquipmentSlot;
    tier: 1 | 2 | 3;
    statModifiers?:       StatModifier[];           // folded into derivedStats at equip-time
    passiveEffects?:      string[];                 // effect IDs applied as permanent ActiveEffects
    onHitEffects?:        EquipmentProcTrigger[];   // surfaced into the Spec 03 proc roll on attack
    onDefendEffects?:     EquipmentProcTrigger[];   // surfaced into the Spec 03 proc roll on defend
    critStyle?:           'double' | 'pierce';      // default crit style (per-skill override wins)
    resourceInteraction?: ResourceInteraction;      // optional combat-start tokens + generation bonuses
}
```

### `EquipmentProcTrigger`

```ts
interface EquipmentProcTrigger {
    effectId: string;
    target: 'self' | 'opponent';
    baseChance: number;        // 0–1, fed into the same final chance formula as JSON triggers
    tier: 1 | 2 | 3;           // respects the wearer's per-cell ProcUnlocks cap
    intensityOverride?: number;
    durationOverride?: number;
    fumbleEffectId?: string;
}
```

Per Spec 05 Q6 (option A), equipment triggers SHARE the Spec 03 proc roll
machinery instead of running a separate roll. `rollForCombatEffects` accepts
an `equipmentTriggers` parameter that is concatenated onto the cell's
eligible list (with the same tier-cap filtering).

### `ResourceInteraction`

```ts
interface ResourceInteraction {
    combatStartTokens?: Partial<CombatResources>;
    generationBonus?:   ResourceGenerationBonus[];
}

interface ResourceGenerationBonus {
    trigger:      'hit' | 'miss' | 'defend' | 'any';
    resourceType: keyof CombatResources; // heart / body / mind / fallacy / paradox
    bonus:        number;
}
```

`aggregateCombatStartTokens(equipment)` sums every equipped item's
`combatStartTokens` into a flat `CombatResources` snapshot. The combat
reducer's `initializeCombat` calls this once at battle start, so a Berserker
Band-style accessory can begin the fight with `combatResources.body = 3`.

`applyEquipmentGenerationBonus(resources, equipment, outcome)` folds the
applicable bonuses on top of the base generation table from
`generateBasicActionResources` (Spec 04). `'any'` matches every outcome;
specific triggers match only the matching outcome. Negative bonuses are
clamped at zero per counter.

## Consumable Type

```ts
interface Consumable extends BaseItem {
    category: 'consumable';
    quantity: number;
    effectId?:          string;                  // library lookup key
    inlineEffect?:      Effect;                  // bespoke one-off effect (Q8 option C)
    healAmount?:        number;                  // immediate flat HP heal (Q9 option C)
    resourceGrant?:     Partial<CombatResources>;// in-combat token delta (Spec 05b Q6)
    intensityOverride?: number;
    durationOverride?:  number;
}
```

`useConsumableEffect(player, consumable, round, lookupEffectFn)` applies the
payload onto a player snapshot:

1. If `healAmount` is set, restores that many HP (clamped via `heal`).
2. If `inlineEffect` is present, applies it via `applyEffect`.
3. If `effectId` resolves into the library, applies that effect via
   `applyEffect`.
4. The `resourceGrant` field (if any) is normalised into a full
   `CombatResources` delta and returned on `ConsumableUseResult.resourceGrant`.
   The combat resolver folds this into the live `combatResources` snapshot
   when the consumable is used inside a fight via `action: 'item'`.

Both inline and referenced effects may be present simultaneously. The caller
is responsible for decrementing the inventory stack via the existing
`useConsumable` inventory reducer.

Per Spec 05b Q3 (option B) philosophical tokens (`fallacy` / `paradox`) remain
skill-only. Library authors should restrict `resourceGrant` to `heart` /
`body` / `mind` keys even though the type permits the full union.

## Reducers

Pure functions in [`src/Character/equipment.reducer.ts`](../src/Character/equipment.reducer.ts):

| Function | Description |
|----------|-------------|
| `equipItem(character, item)` | Folds stat mods into `derivedStats`, pushes passive effects as permanent `ActiveEffect`s, replaces any prior slot occupant. |
| `unequipItem(character, slot)` | Removes the slot occupant, recomputes `derivedStats` from base stats + remaining equipment, prunes that item's passive effects (filtered by `sourceId`). |
| `getEquipmentModifiers(equipment)` | Aggregated `StatModifier` bundle keyed by stat name. Same shape as `getActiveEffectModifiers`. |

`equipItem` and `unequipItem` are pure — neither mutates the input character.

### Derived stat pipeline

Equipment modifiers and effects share the same `StatModifier` shape:

```
effectiveBase     = baseStat + Σ flatMod  ×  (1 + Σ (multMod - 1))
derived (initial) = deriveStats(effectiveBase)
derived (final)   = derived (initial) per-stat patches for flat + mult mods
```

Per Spec 05 Q3 option A, equipment modifiers are baked into `derivedStats`
at equip-time, so `character.derivedStats` is always "post-equipment". The
active-effects pipeline in `getEffectiveStats` re-derives further on top of
this post-equipment baseline.

## Inventory Reducer

Pure functions in [`src/Items/item.reducer.ts`](../src/Items/item.reducer.ts):

| Function | Description |
|----------|-------------|
| `addItem(inventory, item)` | Append. |
| `removeItem(inventory, itemId)` | Remove by ID. |
| `useConsumable(inventory, itemId)` | Decrement quantity; remove if 0. |
| `stackItem(inventory, itemId, amount)` | Merge stackables (consumables, materials). |

The Zustand store (`Game/store.ts`) wraps these alongside `equipItem` /
`unequipItem` / `useConsumable`, which additionally applies the
consumable's effect via `useConsumableEffect`.

## Combat resolver integration

- `initializeCombat` calls `aggregateCombatStartTokens(player.equipment)`
  instead of zero-seeding `combatResources`.
- `generateBasicActionResources(resources, stance, outcome, equipment?)`
  appends `applyEquipmentGenerationBonus(...)` onto the base-table token
  whenever an `equipment` map is passed (the combat resolver passes
  `player.equipment`).
- `runActionProcs` in `combat.resolver.ts` calls `getEquipmentProcTriggers`
  for the actor and forwards them as `equipmentTriggers` to
  `rollForCombatEffects`. Per Spec 05 Q6 these triggers participate in the
  same chance / crit / fumble math as the JSON-defined Stance × action
  table.
- A new `action: 'item'` branch in `resolveCombatRound` looks up
  `playerAction.itemId` in `player.inventory`, applies the consumable via
  `useConsumableEffect`, decrements the stack, and emits an
  `ItemPhaseEvent` (`used` or `blocked`) on the combat event stream. The
  enemy's basic action still resolves at passive defense.

## Library (Spec 05b)

Source: [`src/Items/equipment.library.ts`](../src/Items/equipment.library.ts)
and [`src/Items/consumable.library.ts`](../src/Items/consumable.library.ts).

### Notation

- `cs:` — `combatStartTokens` granted by `initializeCombat`. Format
  `cs: heart+N body+N mind+N` (omitted keys are 0). Per Q3 only the three
  stance keys are allowed.
- `gb:` — `generationBonus` entry, format
  `gb: <resourceType>/<trigger>/+<bonus>`. Trigger is one of
  `'hit' | 'miss' | 'defend' | 'any'` (Q10 option B — outcome-only, no stance
  filter).
- Stacking rule: all `combatStartTokens` from equipped items add together
  with no per-resource cap (Q2). Generation bonuses fire per applicable
  basic action and stack additively on top of the base table from Spec 04.

### Equipment (50 pieces)

#### Weapons (8)

| ID | Tier | Stat Modifiers | Resource Interaction |
|----|------|----------------|----------------------|
| `iron-blade` | 1 | +2 body | — |
| `mind-needle` | 1 | +1 mind, +1 mentalAttack | — |
| `heartstring-bow` | 1 | +2 heart | — |
| `berserker-axe` | 2 | +3 body | cs: body+2 |
| `philosopher-knife` | 2 | +2 mind, +1 mentalAttack | gb: mind/hit/+1 |
| `soulbond-rapier` | 2 | +3 heart | gb: heart/defend/+1 |
| `titan-cleaver` | 3 | +4 body, +2 physicalAttack | cs: body+3 |
| `paradox-shard` | 3 | +3 mind, +2 mentalAttack | cs: mind+2, gb: mind/hit/+1 |

#### Armor (7)

| ID | Tier | Stat Modifiers | Resource Interaction |
|----|------|----------------|----------------------|
| `leather-vest` | 1 | +1 physicalDefense, +1 body | — |
| `scholar-robe` | 1 | +1 mentalDefense, +1 mind | — |
| `heart-cuirass` | 1 | +2 emotionalDefense | — |
| `iron-platemail` | 2 | +3 physicalDefense, +1 body | cs: body+1 |
| `mystic-cloak` | 2 | +2 mentalDefense, +2 mind | gb: mind/defend/+1 |
| `guardian-mail` | 2 | +3 emotionalDefense, +1 heart | gb: heart/defend/+2 |
| `titan-aegis` | 3 | +5 physicalDefense, +2 body | cs: body+2 |

#### Accessories (8)

| ID | Tier | Stat Modifiers | Resource Interaction |
|----|------|----------------|----------------------|
| `iron-ring` | 1 | +1 body | — |
| `crystal-pendant` | 1 | +1 mind | — |
| `rose-talisman` | 1 | +1 heart | — |
| `berserker-band` | 2 | +2 body | cs: body+3 |
| `scholar-lens` | 2 | +2 mind | cs: mind+3 |
| `empathy-locket` | 2 | +2 heart | cs: heart+3 |
| `resonance-prism` | 3 | +1 body, +1 mind, +1 heart | cs: body+1, mind+1, heart+1 |
| `void-sigil` | 3 | +2 mind | cs: mind+2, gb: mind/hit/+1 |

#### Head (7)

| ID | Tier | Stat Modifiers | Resource Interaction |
|----|------|----------------|----------------------|
| `leather-cap` | 1 | +1 physicalDefense | — |
| `thinking-cap` | 1 | +2 mind | — |
| `circlet-of-valor` | 1 | +1 heart, +1 emotionalDefense | — |
| `iron-helm` | 2 | +2 physicalDefense, +1 body | cs: body+1 |
| `mind-crown` | 2 | +3 mind | gb: mind/defend/+2 |
| `vision-mask` | 3 | +2 mind, +2 mentalDefense | cs: mind+2 |
| `warlord-helm` | 3 | +2 body, +3 physicalDefense | cs: body+2, gb: body/hit/+1 |

#### Body / Chest (7)

| ID | Tier | Stat Modifiers | Resource Interaction |
|----|------|----------------|----------------------|
| `rough-tunic` | 1 | +1 physicalDefense | — |
| `warrior-garb` | 1 | +1 body, +1 physicalDefense | — |
| `mystic-vestment` | 2 | +2 mind, +1 mentalDefense | gb: mind/any/+1 |
| `heart-mantle` | 2 | +2 heart, +1 emotionalDefense | gb: heart/defend/+1 |
| `berserker-plate` | 2 | +2 body, +2 physicalDefense | cs: body+2 |
| `sage-vestment` | 3 | +4 mind, +2 mentalDefense | cs: mind+3 |
| `champion-plate` | 3 | +3 body, +3 physicalDefense | cs: body+3, gb: body/hit/+1 |

#### Hands (7)

| ID | Tier | Stat Modifiers | Resource Interaction |
|----|------|----------------|----------------------|
| `cloth-wraps` | 1 | +1 physicalAttack | — |
| `iron-gauntlets` | 1 | +1 body, +1 physicalAttack | — |
| `mind-gloves` | 2 | +2 mind | gb: mind/hit/+1 |
| `heart-bracers` | 2 | +1 heart, +1 emotionalAttack | gb: heart/any/+1 |
| `berserker-gauntlets` | 2 | +2 body, +1 physicalAttack | cs: body+2 |
| `philosopher-wraps` | 3 | +3 mind | cs: mind+2, gb: mind/hit/+1 |
| `titan-gauntlets` | 3 | +3 body, +2 physicalAttack | cs: body+3 |

#### Feet (6)

| ID | Tier | Stat Modifiers | Resource Interaction |
|----|------|----------------|----------------------|
| `soft-boots` | 1 | +1 physicalDefense | — |
| `iron-boots` | 1 | +1 body, +1 physicalDefense | — |
| `scholar-shoes` | 1 | +1 mind, +1 mentalDefense | — |
| `fleet-boots` | 2 | +2 mind | gb: mind/any/+1 |
| `heart-treads` | 2 | +2 heart | gb: heart/defend/+1 |
| `berserker-boots` | 2 | +2 body | cs: body+2 |

### Set IDs (data-only — engine bonus deferred)

Per Spec 05b Q7 selected items carry a `setId` field for future set-bonus
work. The engine does not yet grant a bonus when ≥2 set pieces are equipped;
the data is curated now so a follow-up spec can layer the math on top.

| `setId`       | Pieces |
|---------------|--------|
| `berserker`   | berserker-axe, berserker-band, berserker-plate, berserker-gauntlets, berserker-boots |
| `scholar`     | scholar-robe, crystal-pendant, scholar-lens, thinking-cap, mind-crown, sage-vestment, philosopher-wraps, scholar-shoes |
| `heart`       | heart-cuirass, rose-talisman, empathy-locket, guardian-mail, heart-mantle, heart-bracers, heart-treads |
| `titan`       | titan-cleaver, titan-aegis, champion-plate, titan-gauntlets |

### Consumables (12)

| ID | Effect | Resource Grant |
|----|--------|----------------|
| `healing-potion` | `healAmount: 20` | — |
| `minor-healing-potion` | `healAmount: 10` | — |
| `antidote` | `effectId: buff_cleanse` | — |
| `clarity-serum` | `effectId: buff_cleanse` | — |
| `focus-vial` | — | mind: 3 |
| `heart-draught` | — | heart: 3 |
| `body-elixir` | — | body: 3 |
| `berserker-brew` | `effectId: buff_haste` | body: 5 |
| `philosopher-tea` | `effectId: buff_critical_damage_up` | mind: 2 |
| `resonance-crystal` | — | body: 2, mind: 2, heart: 2 |
| `revive-crystal` | `effectId: buff_invincibility` (1 round) | — |
| `void-essence` | `effectId: buff_critical_damage_up` | heart: 2 |

Per Spec 05b Q3 the philosophical-token grants originally sketched for
`philosopher-tea` and `void-essence` were rewritten to stance tokens so the
Tier-1 → Tier-3 generation chain isn't short-circuited by an item.

`revive-crystal` substitutes `buff_invincibility` for the speculative
`prevent_ko` effect (which is not yet in the global effects library); revisit
when a dedicated "negate next lethal hit" effect lands.

## Out of scope / future work

- Engine-side set bonuses (data is encoded; math is a follow-up).
- Loot drops (Spec 07), shop pricing (Spec 08), equipment as quest rewards
  (Spec 08).
- A bespoke `prevent_ko` / "negates next lethal hit" effect.
