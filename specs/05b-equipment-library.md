# Spec 05b — Equipment Library & Resource Interaction

## Goal

Populate the equipment and consumable libraries with 50 equipment pieces and
12 consumables. A meaningful subset of Tier 2 and Tier 3 items carries a
`ResourceInteraction` payload — granting combat-start tokens or bonus generation
per basic action — so that item choice has tangible implications for the
resource economy from Spec 04.

**Success state:** The equipment library contains exactly 50 entries spanning
all 7 slots and all 3 tiers. At least 15 pieces carry a `resourceInteraction`
payload (with `combatStartTokens` and/or `generationBonus`). The consumable
library has exactly 12 entries; at least 3 grant in-combat tokens on use.
A developer equipping a `berserker-band` (accessory, tier 2) starts combat
with `combatResources.body = 3`; swapping to `scholar-lens` (accessory, tier 2)
starts with `combatResources.mind = 3` instead. A hermetic e2e test confirms
the resource-seeding path end-to-end.

## Why now / dependencies

- **Depends on:** Spec 05 — the `ResourceInteraction` type, `equipItem`
  reducer, combat-start seeding in `initializeCombat`, and generation bonus
  wiring in `generateBasicActionResources` must all be complete.
- **Unblocks:** Manual playtesting with real equipment variety; Spec 07
  (enemy loot drops reference this library); Spec 08 (shop stock drawn from
  here).

## Current state (after Spec 05)

- `Equipment` type has `resourceInteraction?: ResourceInteraction` with
  `combatStartTokens?: Partial<CombatResources>` and
  `generationBonus?: GenerationBonusEntry[]` (exact shape per Q10 of Spec 05).
- `initializeCombat` seeds `combatResources` from equipped items'
  `combatStartTokens`.
- `generateBasicActionResources` applies `generationBonus` entries from
  equipped items on top of the base table.
- No equipment library content exists yet.
- Consumable library has a `healing-potion` placeholder only.

## Open questions

1. **Combat-start timing.** `combatStartTokens` is applied once inside
   `initializeCombat`. Mid-combat equipping is out of scope until Spec 08+,
   so no retroactive seeding is needed. Should the spec explicitly lock this
   as "tokens granted only at the moment `initializeCombat` is called, never
   recalculated during a fight"?
   > Your answer:

2. **Stacking rules.** If the player equips both a weapon (`cs: body+2`) and
   an accessory (`cs: body+3`), do they stack additively (total body+5 at
   combat start), or does a per-resource cap apply? Suggested default: additive
   stacking with no cap (matching the Spec 04 decision to leave resource counts
   unbounded).
   > Your answer:

3. **Philosophical token grants at combat start.** Can `combatStartTokens`
   include `fallacy` or `paradox` tokens (e.g., `void-sigil` granting
   `{ fallacy: 1, paradox: 1 }`)? The Spec 04 design intent is that
   philosophical tokens flow only from skill use, enforcing the Tier 1 →
   Tier 3 chain. Granting them via equipment could let a player skip
   directly to Tier 3 skills in round 1.
   - (A) Allow it — treats the item as a "philosophical head start" that
     thematic accessories can provide; balance via high tier requirement.
   - (B) Disallow it — `combatStartTokens` may only include `heart`, `body`,
     and `mind` keys. Philosophical tokens remain skill-only.
   > Your answer:

4. **Tier gating for resource interactions.** Should the library enforce
   that Tier 1 items never carry `resourceInteraction`, Tier 2 items carry
   moderate interactions (`+1` to `+3` tokens), and Tier 3 items carry the
   strongest (`+3` to `+5` tokens)? Or are tier and resource interactions
   orthogonal, with the designer free to place small interactions on Tier 1
   items?
   > Your answer:

5. **Flavor alignment.** Must a body-stance weapon's `combatStartTokens` only
   include `body` tokens? Or can accessories span types (e.g.,
   `resonance-prism` granting `{ body: 1, mind: 1, heart: 1 }`)?
   - (A) Strict alignment — a weapon/armor/hands/feet/head item's tokens must
     match its primary stance; accessories may span types.
   - (B) Loose alignment — any item may grant any combination, but the
     library will use thematic alignment as a design guideline.
   > Your answer:

6. **Consumable resource grants.** Should consumables carry a
   `resourceGrant?: Partial<CombatResources>` field that immediately adds
   tokens when the item is used in combat (via the `item` action)?
   - (A) Yes — grants apply in-combat; this is a strategic option, not an
     exploit, because using the `item` action spends your turn.
   - (B) No — consumables interact with HP and status effects only; resource
     economy remains equipment-driven at battle start and action-driven
     during the fight.
   > Your answer:

7. **Named equipment sets.** Should some items form thematic sets (e.g., a
   "Berserker Set": `berserker-axe` + `berserker-plate` + `berserker-band`)
   with an optional set bonus when two or more pieces are equipped?
   - (A) Yes — define a `setId?: string` field on `Equipment`; engine checks
     in `getEquipmentModifiers` grant a bonus if ≥2 matching IDs are present.
   - (B) No — items are independent; set flavour lives in naming and lore
     only. Revisit after playtesting.
   > Your answer:

8. **Library slot distribution.** The table below proposes 50 pieces spread
   across 7 slots. Is this distribution acceptable?

   | Slot | Count | Rationale |
   |------|-------|-----------|
   | weapon | 8 | Three stances × 2–3 tiers |
   | armor | 7 | Primary defensive slot |
   | accessory | 8 | Utility / resource focus |
   | head | 7 | Mind-heavy flavor |
   | body/chest | 7 | Body/heart heavy |
   | hands | 7 | Body/attack focus |
   | feet | 6 | Utility / minor bonuses |
   | **Total** | **50** | |

   > Your answer:

9. **Enemy drop sourcing.** Should this spec define a `dropSource?: string[]`
   field on `Equipment` (listing enemy IDs that can yield this item as loot),
   or defer the drop table entirely to Spec 07?
   > Your answer:

10. **Generation bonus trigger granularity.** `GenerationBonusEntry.trigger`
    currently covers `'hit' | 'miss' | 'defend' | 'any'`. Should the trigger
    also be filterable by the player's current stance (e.g., "only when
    attacking as body stance"), or is stance-filtering unnecessary complexity
    at this stage?
    - (A) Add stance filter — `trigger` extends to also accept a
      `Stance` value; a bonus can be scoped to `{ trigger: 'hit', stance: 'body' }`.
    - (B) Outcome-only — stance filtering is out of scope; the library will
      naturally align resource types to stance via thematic design (a body
      weapon grants body tokens, not mind tokens).
    > Your answer:

## Equipment Library (50 pieces)

Notation: stat modifiers use `+N stat` shorthand (flat `StatModifier`, `isMultiplier: false`).
Resource interaction: `cs:` = `combatStartTokens`, `gb:` = `generationBonus` entry in the form
`gb: <resourceType>/<trigger>/<+amount>` (e.g., `gb: mind/hit/+1` means on a hit action grant
+1 mind token). Stance-filter notation in `gb` (option A from Q10) would become
`gb: mind/hit:body/+1`; exact format depends on Q10 answer.

Items marked `(Q3 pending)` include philosophical tokens; their `cs` payload
is conditional on the Q3 answer.

### Weapons (8)

| ID | Name | Tier | Stance | Stat Modifiers | Resource Interaction |
|----|------|------|--------|----------------|----------------------|
| `iron-blade` | Iron Blade | 1 | body | +2 body | — |
| `mind-needle` | Mind Needle | 1 | mind | +1 mind, +1 attack | — |
| `heartstring-bow` | Heartstring Bow | 1 | heart | +2 heart | — |
| `berserker-axe` | Berserker Axe | 2 | body | +3 body | cs: body+2 |
| `philosopher-knife` | Philosopher's Knife | 2 | mind | +2 mind, +1 attack | gb: mind/hit/+1 |
| `soulbond-rapier` | Soulbond Rapier | 2 | heart | +3 heart | gb: heart/defend/+1 |
| `titan-cleaver` | Titan Cleaver | 3 | body | +4 body, +2 attack | cs: body+3 |
| `paradox-shard` | Paradox Shard | 3 | mind | +3 mind, +2 attack | cs: mind+2, gb: mind/hit/+1 |

### Armor (7)

| ID | Name | Tier | Focus | Stat Modifiers | Resource Interaction |
|----|------|------|-------|----------------|----------------------|
| `leather-vest` | Leather Vest | 1 | body | +1 defense, +1 body | — |
| `scholar-robe` | Scholar's Robe | 1 | mind | +1 defense, +1 mind | — |
| `heart-cuirass` | Heart Cuirass | 1 | heart | +2 defense | — |
| `iron-platemail` | Iron Platemail | 2 | body | +3 defense, +1 body | cs: body+1 |
| `mystic-cloak` | Mystic Cloak | 2 | mind | +2 defense, +2 mind | gb: mind/defend/+1 |
| `guardian-mail` | Guardian Mail | 2 | heart | +3 defense, +1 heart | gb: heart/defend/+2 |
| `titan-aegis` | Titan Aegis | 3 | body | +5 defense, +2 body | cs: body+2 |

### Accessories (8)

| ID | Name | Tier | Focus | Stat Modifiers | Resource Interaction |
|----|------|------|-------|----------------|----------------------|
| `iron-ring` | Iron Ring | 1 | body | +1 body | — |
| `crystal-pendant` | Crystal Pendant | 1 | mind | +1 mind | — |
| `rose-talisman` | Rose Talisman | 1 | heart | +1 heart | — |
| `berserker-band` | Berserker Band | 2 | body | +2 body | cs: body+3 |
| `scholar-lens` | Scholar's Lens | 2 | mind | +2 mind | cs: mind+3 |
| `empathy-locket` | Empathy Locket | 2 | heart | +2 heart | cs: heart+3 |
| `resonance-prism` | Resonance Prism | 3 | multi | +1 body, +1 mind, +1 heart | cs: body+1, mind+1, heart+1 |
| `void-sigil` | Void Sigil | 3 | philosophical | +2 mind | cs: fallacy+1, paradox+1 (Q3 pending) |

### Head (7)

| ID | Name | Tier | Focus | Stat Modifiers | Resource Interaction |
|----|------|------|-------|----------------|----------------------|
| `leather-cap` | Leather Cap | 1 | neutral | +1 defense | — |
| `thinking-cap` | Thinking Cap | 1 | mind | +2 mind | — |
| `circlet-of-valor` | Circlet of Valor | 1 | heart | +1 heart, +1 defense | — |
| `iron-helm` | Iron Helm | 2 | body | +2 defense, +1 body | cs: body+1 |
| `mind-crown` | Mind Crown | 2 | mind | +3 mind | gb: mind/defend/+2 |
| `vision-mask` | Vision Mask | 3 | mind | +2 mind, +2 defense | cs: mind+2 |
| `warlord-helm` | Warlord Helm | 3 | body | +2 body, +3 defense | cs: body+2, gb: body/hit/+1 |

### Body / Chest (7)

| ID | Name | Tier | Focus | Stat Modifiers | Resource Interaction |
|----|------|------|-------|----------------|----------------------|
| `rough-tunic` | Rough Tunic | 1 | neutral | +1 defense | — |
| `warrior-garb` | Warrior's Garb | 1 | body | +1 body, +1 defense | — |
| `mystic-vestment` | Mystic Vestment | 2 | mind | +2 mind, +1 defense | gb: mind/any/+1 |
| `heart-mantle` | Heart's Mantle | 2 | heart | +2 heart, +1 defense | gb: heart/defend/+1 |
| `berserker-plate` | Berserker Plate | 2 | body | +2 body, +2 defense | cs: body+2 |
| `sage-vestment` | Sage's Vestment | 3 | mind | +4 mind, +2 defense | cs: mind+3 |
| `champion-plate` | Champion Plate | 3 | body | +3 body, +3 defense | cs: body+3, gb: body/hit/+1 |

### Hands / Gloves (7)

| ID | Name | Tier | Focus | Stat Modifiers | Resource Interaction |
|----|------|------|-------|----------------|----------------------|
| `cloth-wraps` | Cloth Wraps | 1 | neutral | +1 attack | — |
| `iron-gauntlets` | Iron Gauntlets | 1 | body | +1 body, +1 attack | — |
| `mind-gloves` | Mind Gloves | 2 | mind | +2 mind | gb: mind/hit/+1 |
| `heart-bracers` | Heart Bracers | 2 | heart | +1 heart, +1 attack | gb: heart/any/+1 |
| `berserker-gauntlets` | Berserker's Gauntlets | 2 | body | +2 body, +1 attack | cs: body+2 |
| `philosopher-wraps` | Philosopher's Wraps | 3 | mind | +3 mind | cs: mind+2, gb: mind/hit/+1 |
| `titan-gauntlets` | Titan Gauntlets | 3 | body | +3 body, +2 attack | cs: body+3 |

### Feet / Boots (6)

| ID | Name | Tier | Focus | Stat Modifiers | Resource Interaction |
|----|------|------|-------|----------------|----------------------|
| `soft-boots` | Soft Boots | 1 | neutral | +1 defense | — |
| `iron-boots` | Iron Boots | 1 | body | +1 body, +1 defense | — |
| `scholar-shoes` | Scholar's Shoes | 1 | mind | +1 mind, +1 defense | — |
| `fleet-boots` | Fleet Boots | 2 | mind | +2 mind | gb: mind/any/+1 |
| `heart-treads` | Heart Treads | 2 | heart | +2 heart | gb: heart/defend/+1 |
| `berserker-boots` | Berserker Boots | 2 | body | +2 body | cs: body+2 |

### Resource interaction summary

Items with `cs:` (combat-start tokens): 21 pieces across tiers 2–3.
Items with `gb:` (generation bonus): 13 pieces across tiers 2–3.
Tier 1 items (16 total): no `resourceInteraction` — clean baseline for new players.

## Consumable Library (12 items)

`resourceGrant` column is conditional on the Q6 answer. Mark as TBD if Q6
resolves to option (B) (no in-combat grants from consumables).

| ID | Name | Effect | Resource Grant |
|----|------|--------|----------------|
| `healing-potion` | Healing Potion | `effectId: heal_medium` — restores moderate HP | — |
| `minor-healing-potion` | Minor Healing Potion | `effectId: heal_minor` — restores small HP | — |
| `antidote` | Antidote | `effectId: cure_poison` — removes bleed/poison | — |
| `clarity-serum` | Clarity Serum | `effectId: cleanse_debuff` — removes 1 random debuff | — |
| `focus-vial` | Focus Vial | — | `resourceGrant: { mind: 3 }` |
| `heart-draught` | Heart's Draught | — | `resourceGrant: { heart: 3 }` |
| `body-elixir` | Body Elixir | — | `resourceGrant: { body: 3 }` |
| `berserker-brew` | Berserker Brew | `effectId: buff_haste` (1 round) | `resourceGrant: { body: 5 }` |
| `philosopher-tea` | Philosopher's Tea | — | `resourceGrant: { fallacy: 1, paradox: 1 }` (Q3 + Q6 pending) |
| `resonance-crystal` | Resonance Crystal | — | `resourceGrant: { body: 2, mind: 2, heart: 2 }` |
| `revive-crystal` | Revive Crystal | `effectId: prevent_ko` — negates next lethal hit | — |
| `void-essence` | Void Essence | `effectId: debuff_weaken` applied on next attack | `resourceGrant: { fallacy: 2 }` (Q3 + Q6 pending) |

## Proposed approach

1. **Create `src/Items/equipment.library.ts`** — exports `const equipmentLibrary: Equipment[]`
   with all 50 items, populated using the `ResourceInteraction` type from
   Spec 05. Export a `getEquipmentById(id: string): Equipment | undefined`
   helper.
2. **Update `src/Items/consumable.library.ts`** (or `.json`) — replace the
   placeholder with all 12 consumables; add `resourceGrant?` field to
   `Consumable` type per Q6 resolution; wire `useConsumable` reducer to apply
   `resourceGrant` when used in combat.
3. **Hermetic e2e test** at `src/Items/e2e/equipment-resource.engine.test.ts`:
   - Scenario 1 (combat-start seeding): equip `berserker-band`, call
     `initializeCombat`, assert `state.combatResources.body === 3` and
     all other counters are 0.
   - Scenario 2 (generation bonus): equip `paradox-shard` (weapon), resolve
     one attack hit round, assert `state.combatResources.mind` equals the
     base hit generation (3) plus the equipment bonus (+1) = 4.
   - Scenario 3 (multi-item stacking): equip `berserker-axe` (cs: body+2)
     and `berserker-band` (cs: body+3), call `initializeCombat`, assert
     `state.combatResources.body === 5` per the Q2 answer.
   - Scenario 4 (consumable resource grant, if Q6 allows): use `body-elixir`
     mid-combat, assert `state.combatResources.body` increases by 3.
4. **Update `docs/equipment.md`** — fill in the full library table for both
   equipment and consumables, document `ResourceInteraction` notation,
   stacking rules, and (if Q6 yes) consumable grant behavior.

## Acceptance checklist

- [ ] All 10 questions answered.
- [ ] `src/Items/equipment.library.ts` exports exactly 50 items with no
      TypeScript errors.
- [ ] At least 15 items carry a populated `resourceInteraction` payload.
- [ ] `src/Items/consumable.library.ts` exports exactly 12 consumables.
- [ ] At least 3 consumables carry `resourceGrant` (pending Q6).
- [ ] `src/Items/e2e/equipment-resource.engine.test.ts` exists; all
      scenarios pass.
- [ ] Combat-start seeding test (Scenario 1) is green.
- [ ] Generation bonus test (Scenario 2) is green.
- [ ] Multi-item stacking test (Scenario 3) is green per the Q2 answer.
- [ ] `npm test` green twice and `npm run type-check` clean.
- [ ] `docs/equipment.md` updated with full library and resource interaction docs.

## Out of scope

- Crafting from `Material` items.
- Shop economy — Spec 08.
- Enemy drop tables for specific items — Spec 07 (add `dropSource` to items
  then if Q9 defers).
- Named set bonuses — deferred pending Q7 answer; add to Spec 06 or a
  content-only follow-up if approved.
- Equipment as quest rewards — Spec 08.
