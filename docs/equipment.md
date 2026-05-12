# Equipment & Items

> **Status:** Spec 05 + Spec 05c landed. Equipment is now an *instance* shape
> with per-instance `rarity` + `requiredLevel` (PoE2-style); the legacy
> `Equipment.tier` field is removed. The Spec 05b 50-item library is archived
> at `src/Items/_archive/` and replaced by 21 `EquipmentTemplate`s and 2
> `UniqueItemTemplate`s, dropped at runtime through the new `dropItem` factory.
> Outstanding work — modifier catalogue content (Spec 05d), set bonuses
> (Spec 05e), loot drops (Spec 07), shop pricing (Spec 08).

## Item Categories

Defined in [`src/Items/types.ts`](../src/Items/types.ts).

| Category | Discriminator | Notes |
|----------|---------------|-------|
| Equipment | `category: 'equipment'` | Has `slot`, `rarity`, `requiredLevel`, optional `rolledMods`, `statModifiers`, `passiveEffects`, `onHitEffects`, `onDefendEffects`, `critStyle`, `resourceInteraction`. |
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

## Equipment Type (instance shape — Spec 05c)

```ts
interface Equipment extends BaseItem {
    category: 'equipment';
    slot: EquipmentSlot;
    rarity: ItemRarity;                             // 'common' | 'uncommon' | 'rare' | 'unique'
    requiredLevel: number;                          // gates drop / equip; scales mod ranges
    rolledMods?:          RolledModifier[];         // present on Uncommon / Rare / Unique drops
    statModifiers?:       StatModifier[];           // folded into derivedStats at equip-time
    passiveEffects?:      string[];                 // effect IDs applied as permanent ActiveEffects
    onHitEffects?:        EquipmentProcTrigger[];   // surfaced into the Spec 03 proc roll on attack
    onDefendEffects?:     EquipmentProcTrigger[];   // surfaced into the Spec 03 proc roll on defend
    critStyle?:           'double' | 'pierce';      // default crit style (per-skill override wins)
    resourceInteraction?: ResourceInteraction;      // optional combat-start tokens + generation bonuses
}

type ItemRarity = 'common' | 'uncommon' | 'rare' | 'unique';

interface RolledModifier {
    modId: string;   // catalogue entry id (Spec 05d)
    value: number;   // rolled at drop time, within the catalogue's level-banded range
}
```

Per Spec 05c the legacy `Equipment.tier: 1 | 2 | 3` field is **removed**.
Rarity is the instance-level grade (every drop carries one); `requiredLevel`
controls when a template can drop and scales rolled-modifier value bands.
Manually-constructed Equipment (test fixtures, hand-curated starting gear)
may omit `rolledMods`; procedural drops always carry it on Uncommon+.

### `EquipmentTemplate` / `UniqueItemTemplate` (definition shape)

```ts
interface EquipmentTemplate {
    id: string;
    name: string;
    description: string;
    slot: EquipmentSlot;
    requiredLevel: number;
    baseStatModifiers?: StatModifier[];   // stats on a 0-mod (Common) instance
}

interface UniqueItemTemplate extends EquipmentTemplate {
    fixedModIds: [string, string, string];  // exactly 3 catalogue IDs
    setMembership?: string;                  // reserved for Spec 05e
}
```

Templates live in [`src/Items/equipment.templates.ts`](../src/Items/equipment.templates.ts)
(21 entries, 7 slots × 3 progression tiers by `requiredLevel`) and
[`src/Items/unique.templates.ts`](../src/Items/unique.templates.ts) (2 entries).
A template is the authored data — `dropItem` turns it into a runtime
`Equipment` instance with rolled modifiers.

### `dropItem` factory

```ts
function dropItem(
    templateId: string,
    playerLevel: number,
    rarity?: ItemRarity,         // omit to draw from the weighted table
    rng?: () => number,          // defaults to Math.random
): Equipment;
```

Pipeline (per [`src/Items/item.factory.ts`](../src/Items/item.factory.ts)):

1. Look up the template (regular first, then Unique).
2. Resolve rarity. Unique templates always drop at `'unique'` rarity. A
   regular template's rarity is the caller-supplied value, otherwise drawn
   from the weighted table below. Passing `rarity: 'unique'` for a regular
   template throws — `unique` is reserved for `UniqueItemTemplate`.
3. Assert `playerLevel >= template.requiredLevel`.
4. Call `rollModifiers(template, rarity, playerLevel, rng)` to produce the
   `RolledModifier[]` payload.
5. Call `resolveModifiers(template, rolledMods)` to merge base stats and
   rolled-mod payloads into the final `statModifiers`.
6. Return the fully-formed `Equipment` instance.

**Determinism:** every random draw inside the factory consumes from the
caller-supplied `rng`. Two calls with the same seeded `rng` return identical
Equipment.

#### Rarity weight table (Spec 05c §9)

| Rarity   | Weight | Notes                                                  |
|----------|--------|--------------------------------------------------------|
| common   | 60     | Majority of drops; no rolled mods.                     |
| uncommon | 30     | One rolled procedural mod.                             |
| rare     |  9     | Two distinct rolled procedural mods.                   |
| unique   |  1     | UniqueItemTemplate only — exactly 3 `fixedModIds`.     |

For regular templates the unique row is excluded from the random draw —
the spec's "unique: 1" is the table-level weight, but uniqueness is
template-gated (specific templates only).

#### Mod count by rarity

| Rarity   | Mod count | Source                                       |
|----------|-----------|----------------------------------------------|
| common   | 0         | —                                            |
| uncommon | 1         | Procedural pool, slot-scoped                 |
| rare     | 2         | Procedural pool, slot-scoped, non-duplicate  |
| unique   | 3         | `UniqueItemTemplate.fixedModIds` (ordered)   |

Spec 05c ships a minimal procedural mod catalogue inline with the factory;
Spec 05d replaces it with a richer catalogue (proc triggers, multipliers,
themed pools). Until Spec 05d lands, every rolled mod adds a single flat
`StatModifier`.

### Base template list (Spec 05c §6)

| Slot      | lvl 1 ID         | lvl 10 ID         | lvl 20 ID          |
|-----------|------------------|-------------------|--------------------|
| weapon    | `iron-blade`     | `steel-blade`     | `mithril-blade`    |
| armor     | `hide-vest`      | `chain-mail`      | `plate-mail`       |
| head      | `leather-cap`    | `chain-coif`      | `full-helm`        |
| body      | `cloth-wrap`     | `leather-coat`    | `scaled-coat`      |
| hands     | `cloth-gloves`   | `chain-gauntlets` | `plate-gauntlets`  |
| feet      | `sandals`        | `leather-boots`   | `iron-greaves`     |
| accessory | `copper-ring`    | `silver-ring`     | `gold-ring`        |

### Unique templates (Spec 05c §7)

| ID             | Slot      | requiredLevel | fixedModIds (placeholders — Spec 05d fills final IDs) |
|----------------|-----------|---------------|--------------------------------------------------------|
| `axioms-edge`  | weapon    | 5             | `weapon_body_flat`, `weapon_physical_attack`, `unique_axioms_edge_crit` |
| `paradox-loop` | accessory | 15            | `accessory_mind_flat`, `accessory_mental_defense`, `unique_paradox_loop_echo` |

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

## Library

Sources: [`src/Items/equipment.templates.ts`](../src/Items/equipment.templates.ts),
[`src/Items/unique.templates.ts`](../src/Items/unique.templates.ts), and
[`src/Items/consumable.library.ts`](../src/Items/consumable.library.ts).

> The previous 50-item Spec 05b library lives at
> [`src/Items/_archive/equipment.library.ts`](../src/Items/_archive/equipment.library.ts)
> for reference and migration auditing. It is no longer wired into the engine.

### Notation (consumables)

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

### Equipment templates (Spec 05c)

See the [Base template list](#base-template-list-spec-05c-§6) and
[Unique templates](#unique-templates-spec-05c-§7) above for the active 21+2
template set. Templates carry only base identity and a `baseStatModifiers`
floor; rarity, rolled mods, and the rest of the instance shape are decided
by `dropItem` at drop time. Spec 05d will layer themed mod pools and proc
triggers onto the rolled-mod catalogue.

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

- Modifier catalogue content (Spec 05d) — the in-factory mod catalogue
  shipped with Spec 05c is intentionally minimal.
- Set items and engine-side set bonuses (Spec 05e).
- Loot drops (Spec 07), shop pricing (Spec 08), equipment as quest rewards
  (Spec 08).
- A bespoke `prevent_ko` / "negates next lethal hit" effect.
