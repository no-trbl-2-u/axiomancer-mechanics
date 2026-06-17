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
(56 entries — 3 **base** templates + 5 curated **affixed variants** per slot,
across 7 slots) and
[`src/Items/unique.templates.ts`](../src/Items/unique.templates.ts) (2 entries).
A template is the authored data — `dropItem` turns it into a runtime
`Equipment` instance with rolled modifiers. The base templates span three
progression tiers by `requiredLevel` (1 / 10 / 20); the affixed variants are
authored prefixed/suffixed items (see **[Affixed variants](#affixed-variants-phase-152)**).

### `dropItem` factory

```ts
function dropItem(
    templateId: string,
    playerLevel: number,
    rarity?: ItemRarity,         // omit to draw from the weighted table
    rng?: () => number,          // defaults to Math.random
    affix?: AffixControl,        // omit for classic affix-free drops
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
5. If the `affix` control is enabled (or the template is a curated affixed
   variant), layer prefix/suffix affixes on top per the rarity defaults
   (see below), folding each affix's `modIds` into the rolled-mod set.
6. Call `resolveModifiers(template, rolledMods)` to merge base stats and
   rolled-mod payloads into the final `statModifiers`.
7. Return the fully-formed `Equipment` instance, stamped with affix
   provenance (`prefixId` / `suffixId` / `prefixName` / `suffixName`) and a
   composed `name` when affixes were applied.

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

Spec 05d replaces the Spec 05c stub catalogue with a slot-keyed catalogue of
72 procedural mods + 6 unique-only signature mods (Phase 151 expansion — was
22 + 3 at the initial Spec 05d ship). See **[Modifiers](#modifiers-spec-05d)**
below for the full catalogue, the substitution contract, and the
hidden-rarity weight table.

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

### Unique templates (Spec 05c §7 / Spec 05d §8)

| ID             | Slot      | requiredLevel | fixedModIds (canonical Spec 05d catalogue IDs) |
|----------------|-----------|---------------|--------------------------------------------------------|
| `axioms-edge`  | weapon    | 5             | `wm-flat-damage`, `wm-body-gen`, `um-paradox-edge`     |
| `paradox-loop` | accessory | 15            | `am-stance-res`, `am-proc-boost`, `um-resonance-prime` |

### Affixed variants (Phase 152)

Each slot ships **5 curated affixed variants** alongside its 3 base templates.
An affixed variant is an `EquipmentTemplate` that names a source affix from
[`src/Items/affix.library.ts`](../src/Items/affix.library.ts) via `prefixId`
and/or `suffixId`. At drop time the factory always applies these pinned
affixes — folding the affix's `modIds` into the rolled-mod set and composing
the player-visible name via `composeItemName` (e.g. the `keen-iron-blade`
variant drops as **"Keen Iron Blade"**, `venomous-mithril-blade-of-frost` as
**"Venomous Mithril Blade of Frost"**). The dropped instance records the
affix provenance in `prefixId` / `suffixId` / `prefixName` / `suffixName`.

#### Procedural affixes via the `AffixControl`

`dropItem`'s optional `affix?: AffixControl` parameter (and the convenience
`dropItemWithAffixes` wrapper) layer **procedural** affixes on a base template.
When enabled, the number of affixes follows the rarity defaults:

| Rarity   | Procedural affixes                                      |
|----------|--------------------------------------------------------|
| common   | none                                                   |
| uncommon | exactly one — prefix **or** suffix (rng coin flip)     |
| rare     | both — one prefix **and** one suffix                   |
| unique   | none (a unique's identity is its three fixed mods)     |

`AffixControl` also exposes `maxPrefixes` / `maxSuffixes` caps (which bypass
the uncommon coin flip) and `pinPrefixId` / `pinSuffixId` to force a specific
affix. Omitting the `affix` parameter entirely keeps the classic affix-free
`dropItem` behaviour. Curated affixed variants always apply their pinned
affixes regardless of the `affix` argument.

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

## Modifiers (Spec 05d)

Modifiers are the data layer behind `rollModifiers` / `resolveModifiers`. A
`Modifier` carries an ID, a hidden rarity, eligible slots, level-banded value
tiers, and a `payload` template that the factory substitutes at resolve time
into the wearer's `Equipment` shape (`statModifiers`, `passiveEffects`,
`onHitEffects`, `onDefendEffects`, `resourceInteraction`).

```ts
type HiddenModRarity = 'common_mod' | 'uncommon_mod' | 'rare_mod';

interface ModValueTier {
    levelReq: number;
    range: [number, number]; // inclusive uniform integer roll
}

type ModifierPayload = Partial<Pick<Equipment,
    | 'statModifiers'
    | 'passiveEffects'
    | 'onHitEffects'
    | 'onDefendEffects'
    | 'resourceInteraction'
>>;

interface Modifier {
    id: string;
    name: string;
    hiddenRarity: HiddenModRarity;
    validSlots: EquipmentSlot[];
    levelTiers: ModValueTier[]; // ascending by levelReq; pickValueTier picks the highest <= playerLevel
    payload: ModifierPayload;
}
```

### Hidden rarity weights

`rollModifiers` weighted-samples without replacement using these per-mod
weights:

| HiddenModRarity | Weight |
|-----------------|--------|
| `common_mod`    | 10     |
| `uncommon_mod`  | 3      |
| `rare_mod`      | 1      |

### Substitution contract

`resolveModifiers` walks each `RolledModifier`, looks up the catalogue entry,
and merges the `payload` into the resulting Equipment instance:

| Payload field                              | Substitution rule                                                                              |
|--------------------------------------------|------------------------------------------------------------------------------------------------|
| `statModifiers[].value`                    | `value: 0` sentinel → rolled value. Non-zero values are kept as authored.                       |
| `resourceInteraction.generationBonus[].bonus` | `bonus: 0` sentinel → rolled value.                                                          |
| `resourceInteraction.combatStartTokens[k]` | A `0` value → rolled value. Same key across mods is summed (additive — Spec 05b Q2).            |
| `passiveEffects: string[]`                 | Concatenated as-is. Rolled value is a presence marker (no substitution).                        |
| `onHitEffects` / `onDefendEffects`         | Concatenated as-is. Proc triggers ride the existing Spec 03 proc-roll machinery.                |

### Procedural pools

Each pool ships at least 3 mods (one per hidden rarity) so an Uncommon roll
always has at least one `uncommon_mod` candidate and a Rare roll always has
at least one `rare_mod` candidate when level requirements allow. Phase 151
expanded the original 25-mod catalogue to 78 entries (72 procedural + 6
unique-only) and extended the top-end value tiers to levelReq 30/40/50 on the
flat-stat mods so endgame drops keep scaling. `modifier.catalogue.ts` is
canonical; the tables below mirror it.

#### `weaponModPool` (17)
| ID | Name | hiddenRarity | Level tiers (levelReq → range) |
|----|------|--------------|--------------------------------|
| `wm-flat-damage` | Keen Edge | `common_mod` | 1 → [1,3], 10 → [4,8], 20 → [9,15], 30 → [16,24], 40 → [25,35], 50 → [36,50] |
| `wm-lifesteal` | Vampiric Strike | `uncommon_mod` | 1 → [1,2], 10 → [2,3], 20 → [3,5] |
| `wm-body-gen` | Body Resonance | `uncommon_mod` | 1 → [1,1], 10 → [1,2], 20 → [2,3] |
| `wm-exploit` | Exploit Weakness | `rare_mod` | 10 → [2,4], 20 → [5,8] |
| `wm-skill-edge` | Honed Technique | `common_mod` | 1 → [1,2], 10 → [3,5], 20 → [6,10], 30 → [11,16], 40 → [17,24], 50 → [25,34] |
| `wm-crit-rate` | Cruel Point | `uncommon_mod` | 10 → [1,1], 30 → [1,1] |
| `wm-crit-damage` | Savage Bite | `rare_mod` | 20 → [1,1], 40 → [1,1] |
| `wm-mind-rend` | Mind Render | `rare_mod` | 20 → [3,6], 30 → [7,11], 40 → [12,18], 50 → [19,27] |
| `wm-heart-rend` | Heart Cleaver | `rare_mod` | 15 → [2,5], 30 → [6,10], 40 → [11,16], 50 → [17,24] |
| `wm-bleeding-edge` | Bleeding Edge | `uncommon_mod` | 10 → [1,1], 30 → [1,1], 50 → [1,1] |
| `wm-accuracy` | True Aim | `common_mod` | 1 → [1,1], 20 → [1,1], 40 → [1,1] |
| `wm-venom-coat` | Venomous Coating | `uncommon_mod` | 1 → [1,1], 20 → [1,1], 40 → [1,1] |
| `wm-frost-brand` | Frostbrand | `uncommon_mod` | 10 → [1,1], 30 → [1,1] |
| `wm-storm-edge` | Storm Edge | `rare_mod` | 15 → [1,1], 35 → [1,1] |
| `wm-dazing-pommel` | Dazing Pommel | `uncommon_mod` | 5 → [1,1], 25 → [1,1] |
| `wm-mind-gen` | Insightful Hilt | `common_mod` | 1 → [1,1], 10 → [1,2], 20 → [2,3] |
| `wm-status-amp` | Catalytic Edge | `rare_mod` | 10 → [1,1], 30 → [1,1] |

#### `headModPool` (9)
| ID | Name | hiddenRarity | Level tiers |
|----|------|--------------|-------------|
| `hm-max-hp` | Resilient Mind | `common_mod` | 1 → [5,15], 10 → [16,35], 20 → [36,60], 30 → [61,90], 40 → [91,130], 50 → [131,180] |
| `hm-mind-gen` | Clear Thought | `uncommon_mod` | 1 → [1,1], 10 → [1,2], 20 → [2,3] |
| `hm-effect-dur` | Focused Channel | `rare_mod` | 10 → [1,1] |
| `hm-mental-defense` | Warded Crown | `common_mod` | 1 → [2,5], 10 → [6,12], 20 → [13,22], 30 → [23,34], 40 → [35,48], 50 → [49,64] |
| `hm-insight` | Insightful | `uncommon_mod` | 5 → [1,2], 20 → [3,5], 35 → [6,9], 50 → [10,14] |
| `hm-foresight` | Oracle Sight | `rare_mod` | 20 → [1,1], 40 → [1,1] |
| `hm-effect-duration` | Lingering Sigil | `rare_mod` | 5 → [1,1], 25 → [1,1] |
| `hm-mind-resist` | Stoic Mind | `common_mod` | 1 → [1,1], 20 → [1,1] |
| `hm-heart-focus` | Empathic Crown | `uncommon_mod` | 1 → [1,2], 15 → [3,5], 30 → [6,9], 45 → [10,14] |

#### `bodyModPool` (9)
| ID | Name | hiddenRarity | Level tiers |
|----|------|--------------|-------------|
| `bm-armor` | Fortified | `common_mod` | 1 → [2,5], 10 → [6,12], 20 → [13,22], 30 → [23,34], 40 → [35,48], 50 → [49,64] |
| `bm-heart-gen` | Steady Heart | `uncommon_mod` | 1 → [1,1], 10 → [1,2], 20 → [2,3] |
| `bm-reflect` | Thorned | `rare_mod` | 10 → [1,3], 20 → [4,7] |
| `bm-vitality` | Stalwart | `common_mod` | 1 → [1,2], 10 → [3,5], 20 → [6,9], 30 → [10,14], 40 → [15,20], 50 → [21,28] |
| `bm-damage-reduction` | Bulwark | `rare_mod` | 15 → [1,1], 35 → [1,1] |
| `bm-thorns-proc` | Brazen Thorns | `uncommon_mod` | 10 → [1,1], 30 → [1,1], 50 → [1,1] |
| `bm-taunt-proc` | Provoking Plate | `uncommon_mod` | 5 → [1,1], 25 → [1,1] |
| `bm-barrier-proc` | Wardweave | `rare_mod` | 10 → [1,1], 30 → [1,1] |
| `bm-heart-start` | Resolute Bearing | `uncommon_mod` | 1 → [1,2], 20 → [2,4] |

#### `handsModPool` (9)
| ID | Name | hiddenRarity | Level tiers |
|----|------|--------------|-------------|
| `hndm-body-gen` | Iron Grip | `common_mod` | 1 → [1,1], 10 → [1,2], 20 → [2,2] |
| `hndm-crit` | Precise Hands | `uncommon_mod` | 1 → [1,2], 10 → [3,5], 20 → [6,9] |
| `hndm-block` | Shield Training | `rare_mod` | 5 → [1,1] |
| `hndm-strength` | Crushing Grasp | `common_mod` | 1 → [1,3], 10 → [4,7], 20 → [8,13], 30 → [14,20], 40 → [21,29], 50 → [30,40] |
| `hndm-crit-rate` | Deft Fingers | `uncommon_mod` | 10 → [1,1], 30 → [1,1], 50 → [1,1] |
| `hndm-counter` | Riposte Form | `rare_mod` | 20 → [1,1], 40 → [1,1] |
| `hndm-disarm` | Disarming Grip | `rare_mod` | 10 → [1,1], 30 → [1,1] |
| `hndm-blinding` | Blinding Flurry | `uncommon_mod` | 5 → [1,1], 25 → [1,1] |
| `hndm-mind-gen` | Calculating Hands | `common_mod` | 1 → [1,1], 10 → [1,2], 20 → [2,3] |

#### `feetModPool` (9)
| ID | Name | hiddenRarity | Level tiers |
|----|------|--------------|-------------|
| `fm-evasion` | Swift Feet | `common_mod` | 1 → [1,3], 10 → [4,7], 20 → [8,12], 30 → [13,18], 40 → [19,26], 50 → [27,36] |
| `fm-cs-tokens` | Ready Stride | `uncommon_mod` | 1 → [1,1], 10 → [1,2], 20 → [2,3] |
| `fm-initiative` | First Step | `rare_mod` | 5 → [1,3], 20 → [4,7] |
| `fm-evasion-proc` | Phantom Step | `uncommon_mod` | 10 → [1,1], 30 → [1,1], 50 → [1,1] |
| `fm-physical-save` | Sure Footing | `common_mod` | 1 → [2,4], 15 → [5,9], 30 → [10,16], 45 → [17,25], 50 → [26,34] |
| `fm-haste` | Fleetfoot | `rare_mod` | 20 → [1,1], 40 → [1,1] |
| `fm-stealth` | Shadowstep | `rare_mod` | 10 → [1,1], 30 → [1,1] |
| `fm-initiative-tokens` | Vanguard Stride | `uncommon_mod` | 1 → [1,1], 20 → [1,2] |
| `fm-luck` | Fortune's Tread | `uncommon_mod` | 1 → [1,2], 20 → [3,5], 40 → [6,9] |

#### `accessoryModPool` (10)
| ID | Name | hiddenRarity | Level tiers |
|----|------|--------------|-------------|
| `am-cross-stat` | Balanced Focus | `common_mod` | 1 → [1,2], 10 → [2,4], 20 → [4,7], 30 → [8,11], 40 → [12,16], 50 → [17,22] |
| `am-stance-res` | Resonant Stone | `uncommon_mod` | 1 → [1,2], 10 → [2,3], 20 → [3,4] |
| `am-proc-boost` | Catalyst Charm | `rare_mod` | 10 → [5,10], 20 → [11,20] |
| `am-heart-focus` | Heartstone | `common_mod` | 1 → [1,2], 15 → [3,5], 30 → [6,9], 45 → [10,14], 50 → [15,20] |
| `am-regen` | Mending Charm | `uncommon_mod` | 10 → [1,1], 30 → [1,1], 50 → [1,1] |
| `am-all-attunement` | Triune Sigil | `rare_mod` | 25 → [2,4], 40 → [5,8], 50 → [9,13] |
| `am-status-amp` | Hex Focus | `rare_mod` | 10 → [1,1], 30 → [1,1] |
| `am-cleanse` | Purifying Charm | `uncommon_mod` | 5 → [1,1], 25 → [1,1] |
| `am-luck` | Lucky Trinket | `common_mod` | 1 → [1,2], 15 → [3,5], 30 → [6,9], 45 → [10,14] |
| `am-fortitude` | Bulwark Bauble | `uncommon_mod` | 5 → [1,1], 25 → [1,1] |

#### `armorModPool` (9)
| ID | Name | hiddenRarity | Level tiers |
|----|------|--------------|-------------|
| `armm-defense` | Hardened | `common_mod` | 1 → [3,7], 10 → [8,16], 20 → [17,28], 30 → [29,42], 40 → [43,58], 50 → [59,78] |
| `armm-heart-start` | Brave Bearing | `uncommon_mod` | 1 → [1,2], 10 → [2,3], 20 → [3,5], 30 → [5,7], 40 → [7,9], 50 → [9,12] |
| `armm-regen` | Enduring | `rare_mod` | 5 → [1,1], 30 → [1,1], 50 → [1,1] |
| `armm-vitality` | Ironhide | `common_mod` | 1 → [1,2], 10 → [3,5], 20 → [6,10], 30 → [11,16], 40 → [17,23], 50 → [24,32] |
| `armm-aegis` | Aegis Weave | `rare_mod` | 15 → [1,1], 35 → [1,1] |
| `armm-stoic` | Stoic Plating | `uncommon_mod` | 10 → [1,1], 30 → [1,1], 50 → [1,1] |
| `armm-body-resist` | Adamant Weave | `common_mod` | 1 → [1,1], 20 → [1,1] |
| `armm-heart-resist` | Sanguine Lining | `common_mod` | 1 → [1,1], 20 → [1,1] |
| `armm-mhp` | Reinforced Hide | `uncommon_mod` | 5 → [1,1], 25 → [1,1] |

### `uniqueModPool` (6 — Unique-only)

Per Spec 05d Q4 these mods are **never** drawn by the procedural roll path.
They only resolve when a `UniqueItemTemplate.fixedModIds` entry references
them.

| ID | Name | hiddenRarity | Level tiers |
|----|------|--------------|-------------|
| `um-stance-echo` | Stance Echo | `rare_mod` | 5 → [1,1], 15 → [1,2] |
| `um-paradox-edge` | Paradox Edge | `rare_mod` | 10 → [1,1] |
| `um-resonance-prime` | Resonance Prime | `rare_mod` | 15 → [1,2], 20 → [2,3] |
| `um-phoenix-heart` | Phoenix Heart | `rare_mod` | 25 → [1,1], 45 → [1,1] |
| `um-gorgon-stare` | Gorgon Stare | `rare_mod` | 30 → [4,8], 50 → [9,16] |
| `um-promethean-spark` | Promethean Spark | `rare_mod` | 20 → [1,1], 40 → [1,1] |

### Where the catalogue compromises with existing primitives

A few spec-suggested payloads have no direct primitive in the engine yet.
The catalogue maps to the closest existing effect and documents the trade
in a per-mod comment in [`modifier.catalogue.ts`](../src/Items/modifier.catalogue.ts):

- `hm-max-hp` — `EffectStatTarget` has no `maxHp`; the mod surfaces the
  `buff_max_hp_up` passive instead. Rolled value is a presence marker until
  the engine supports per-mod intensity overrides.
- `bm-reflect` — no `reflectDamage` stat; the mod attaches the `buff_reflect`
  passive.
- `am-proc-boost` — Spec 05d's "increase baseChance of existing onHitEffects
  by N%" is a meta-mod that isn't expressible as a data-only payload (Q1).
  The catalogue boosts `luck` (the proc-adjacent stat) by the rolled value
  until a meta-mod resolver lands.

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

See the [Base template list](#base-template-list-spec-05c-§6),
[Affixed variants](#affixed-variants-phase-152), and
[Unique templates](#unique-templates-spec-05c-§7) above for the active
56 + 2 template set (3 base + 5 affixed variants per slot, plus 2 uniques).
Templates carry only base identity and a `baseStatModifiers`
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

## Set Items (Spec 05e / Phase 54)

Equipment can belong to named **sets**. Equipping multiple members of a
set grants threshold-keyed `SetBonus` payloads on top of the per-item
`statModifiers` / `resourceInteraction` / `passiveEffects`. Sets are
computed on-demand at every `initializeCombat` and
`generateBasicActionResources` call — there is no cached per-character
"active sets" state, which keeps equip/unequip side-effect-free.

### Type shape

```ts
interface SetBonus {
    resourceInteraction?: Partial<ResourceInteraction>;
    passiveEffects?: string[];        // effect-library IDs
    statModifiers?: StatModifier[];
}

interface ItemSet {
    id: string;
    name: string;
    description: string;
    memberTemplateIds: string[];      // EquipmentTemplate.id matches
    bonuses: Partial<Record<2 | 3 | 4, SetBonus>>;
}
```

Bonuses are sparse — a 2-piece set defines only `{ 2 }`, a 3-piece set
defines `{ 2, 3 }`. `getActiveSetBonuses` returns every threshold whose
piece count is met (so a 3-of-3 wearer gets BOTH the 2-piece and 3-piece
bonuses).

### Runtime application

- **Combat start tokens.** `initializeCombat` sums per-item
  `combatStartTokens` (existing `aggregateCombatStartTokens`) AND per-set
  `combatStartTokens` (new `aggregateSetStartTokens`) additively. Spec
  05e Q2 — no cap.
- **Basic action generation.**  `generateBasicActionResources` chains
  per-set `applySetGenerationBonus` after the per-item
  `applyEquipmentGenerationBonus`. Same `trigger: 'hit' | 'miss' |
  'defend' | 'any'` semantics; counters clamped to ≥ 0.
- **Passive effects.** Set `passiveEffects` are applied as combat-scoped
  `ActiveEffect`s on `combatState.player.effects` at the combat-start
  step, sourced as `'set-bonus'`. They live through the normal
  combat-end cleanup — they are NOT persisted on `character.effects`
  between combats (Spec 05e Q4).
- **Stat modifiers.** Set `statModifiers` fold through the same
  pipeline as equipment `statModifiers` (`getEquipmentModifiers` +
  derived-stat aggregation).

### Set library

The initial library (`src/Items/set.library.ts`) ships 3 sets:

- **Wanderer's Road** (2-piece): `sandals` + `leather-cap`. 2-piece
  bonus: `combatStartTokens: { heart: 2 }`.
- **Iron Discipline** (3-piece): `leather-cap` + `cloth-wrap` +
  `cloth-gloves`. 2-piece bonus: `statModifiers: [{ stat:
  'physicalDefense', value: 3 }]`. 3-piece bonus: `generationBonus: [{
  trigger: 'any', resourceType: 'body', bonus: 1 }]`.
- **Scholar's Circle** (2-piece): `copper-ring` + `leather-cap`.
  2-piece bonus: `combatStartTokens: { mind: 2 }` + `passiveEffects:
  ['buff_critical_rate_up']`.

Sets intentionally overlap on `leather-cap`. A player wearing
`sandals` + `leather-cap` + `copper-ring` activates BOTH the
Wanderer's Road 2-piece and the Scholar's Circle 2-piece bonuses
simultaneously.

### Public API

Engine helpers re-exported through the package barrel:

```ts
import {
    getActiveSetBonuses,           // (equipment) → SetBonus[]
    getActiveSetBonusesForCharacter,
    aggregateSetStartTokens,       // (equipment) → CombatResources
    applySetGenerationBonus,       // (resources, equipment, outcome) → CombatResources
    getActiveSetPassiveEffectIds,  // (equipment) → string[]
    getEquippedItemSets,           // (equipment) → Array<{ set, equipped }>
    itemSetLibrary,
    getItemSetById,
} from 'axiomancer-mechanics';

import type { SetBonus, ItemSet } from 'axiomancer-mechanics';
```

### Adding a new set

1. Append the `ItemSet` literal to `itemSetLibrary` in
   `src/Items/set.library.ts`.
2. Add a hermetic case to `src/Items/e2e/sets.engine.test.ts` if the
   bonus shape introduces a new pattern (e.g. a 4-piece set, or a
   `passiveEffects` ID not yet covered).
3. Update the **Set library** subsection above with the new entry.

More sets is iterate-tier content authoring, not a phase. Unique-item
membership (`UniqueItemTemplate.setMembership`) is reserved for a
future phase per Spec 05e Q1.

## Rarity Distribution & Progression

The equipment rarity system balances meaningful loot discovery against steady progression. Current distribution weights from `RARITY_WEIGHTS` in `src/Items/item.factory.ts`:

| Rarity | Weight | Percentage | Modifier Count | Description |
|--------|--------|------------|----------------|-------------|
| Common | 50 | 50% | 0 | Baseline progression items with template stats only |
| Uncommon | 35 | 35% | 1 | Single procedural modifier for specialization |
| Rare | 14 | 14% | 2 | Two distinct procedural modifiers for build-enabling combinations |
| Unique | 1 | 1% | 3 | Three fixed modifiers with authored identity and power |

### Progression Philosophy

**Early Game (Levels 1-15)**: Common items provide steady stat progression while uncommon/rare drops offer build experimentation. Rarity feels meaningful because base power levels are low.

**Mid Game (Levels 16-35)**: Rare items become more significant for build optimization. Set items (Phase 54) start competing with procedural rarity for equipment slots. Unique items are extremely special finds.

**Late Game (Levels 36-50)**: High-level modifier tiers make rare items substantially more powerful. Set bonus completion becomes a primary progression driver alongside rarity. Unique items represent pinnacle equipment choices.

### Set Item Integration

Since Phase 54, set items use the same rarity system but add set bonus considerations:
- Set items can roll at any rarity, with bonus completion providing additional power scaling
- Players balance individual item rarity vs. set completion for optimal builds  
- Set item rarity affects the procedural modifiers while set membership provides the themed bonuses

This creates a progression matrix where both rarity and set membership matter for equipment decisions.

## Out of scope / future work

- Modifier catalogue content (Spec 05d) — the in-factory mod catalogue
  shipped with Spec 05c is intentionally minimal.
- Unique-item set membership (`UniqueItemTemplate.setMembership`) —
  field is wired but not honored in initial Phase 54 implementation.
- Loot drops (Spec 07), shop pricing (Spec 08), equipment as quest rewards
  (Spec 08).
- A bespoke `prevent_ko` / "negates next lethal hit" effect.
