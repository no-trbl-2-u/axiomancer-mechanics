# Spec 05 — Equipment & Consumables Engine

## Goal

Make equipping and using items meaningful. Equipment must contribute to derived
stats; consumables must reference real effects from the library; both must show
up in combat math.

**Success state:** A player can equip a `weapon` that adds `+2 body` and
`+1 physicalAttack`; the bonus shows in `derivedStats` and on attack rolls.
A `Healing Potion` consumable applies the right effect from the library and
restores HP. The CLI item action works.

## Why now / dependencies

- **Unblocks:** Phase 5 (level-up flow gives equipment-shaped rewards),
  shop NPCs (Spec 08), enemy loot drops (Spec 07).
- **Depends on:** Spec 01 for stat-modifier aggregation (so equipment can
  share the same machinery as effects); Spec 02 for the action pipeline so
  the `item` action runs through the resolver.

## Current state

- Item type union exists (`Equipment`, `Consumable`, `Material`, `QuestItem`).
- `Items/item.reducer.ts` covers `addItem`, `removeItem`, `useConsumable`,
  `stackItem`. The Zustand store inlines the same logic.
- `Equipment` has only `slot: EquipmentSlot` — no stat modifiers, passive
  effects, or tiers yet.
- `Consumable.effect: string` is a free-text field; nothing reads it.
- `Character` has no equipment slot field — currently equipment is just
  inventory.
- Sample consumable: Healing Potion in `consumable.library.json`.

## Open questions

1. **Slot model.** The type allows `weapon | armor | accessory | head | body
   | hands | feet`. Are all 7 slots simultaneously equippable, or do
   `weapon/armor/accessory` and `head/body/hands/feet` represent two
   different layouts (e.g. early vs late game)?
   > Your answer:

2. **Stat modifier shape.** Reuse `StatModifier` from `Effects/types`
   (`stat`, `value`, `isMultiplier`)? That gives flat + multiplier support
   for free.
   > Your answer:

3. **Aggregation site.** Equipment modifiers are persistent. Should they:
   - (A) Be folded into `derivedStats` at equip-time (so the character's
     `derivedStats` is "post-equipment"), or
   - (B) Be aggregated on-demand per roll (`getEffectiveStats(character)`),
     mirroring the temporary effects in Spec 01.
   > Your answer:

4. **Stance alignment.** Should equipment carry a `stance?: Stance`
   so e.g. a "Body weapon" gives the wearer a tier-1-style passive when
   attacking with body? If yes, what's the bonus shape?
   > Your answer:

5. **Passive effects.** `passiveEffects: string[]` references effect IDs.
   When does a passive tick down — never (effectively permanent), or per
   round like normal? And does removing the equipment remove the effect?
   > Your answer:

6. **`onHitEffects` vs Spec 03 procs.** Equipment-based on-hit effects could
   either share the Spec 03 proc machinery or run separately:
   - (A) Share — equipment adds entries to the proc roll.
   - (B) Separate — equipment procs roll on every hit independently.
   > Your answer:

7. **CritStyle mapping.** The `CritStyle` type (`'double' | 'pierce'`)
   exists. Tie it to:
   - (A) The equipped weapon (`Equipment.critStyle?: CritStyle`).
   - (B) The chosen stance (heart/body/mind each prefer one).
   - (C) Per-skill (Spec 04 extends `Skill` with `critStyle`).
   > Your answer:

8. **Consumable → effect link.** Replace `Consumable.effect: string` with:
   - (A) `effectId: string` referencing the effects library.
   - (B) Option (A) plus `durationOverride?` and `intensityOverride?` for
     per-instance tuning.
   - (C) Option (B) plus an inline `Effect` if the consumable wants a
     bespoke one-off effect not in the library.
   > Your answer:

9. **Healing potion shape.** Healing Potion currently restores HP. Should
   the engine model healing as:
   - (A) An immediate `heal(amount)` action (no effect entry).
   - (B) A `regeneration` effect that applies for 1 round (uses the same
     machinery as `Vital Empathy`).
   - (C) Both, depending on the consumable.
   > Your answer:

10. **Library breadth.** Roadmap says 18 equipment + 12 consumables. Is the
    initial PR's scope:
    - (A) Hit those numbers in this spec.
    - (B) Land 6 + 6 here, defer the rest to a follow-up content spec.
    > Your answer:

## Proposed approach

1. **Type updates** — `Equipment.statModifiers`, `passiveEffects`,
   `onHitEffects`, `onDefendEffects`, `tier`, optionally `stance`, optionally
   `critStyle` per Q4/Q7.
2. **`Character.equipment: Partial<Record<EquipmentSlot, Equipment>>`** plus
   `equipItem(character, item)` / `unequipItem(character, slot)` reducers.
3. **`getEquipmentModifiers(character): AggregatedModifiers`** — same shape
   Spec 01 produces for active effects; gets merged into the same site so
   `getAttackStat`/`getDefenseStat` etc. transparently pick up equipment.
4. **Consumables: rename `effect` → `effectId`** (keep a back-compat type
   alias for one release). Wire `useConsumable` to call `applyEffect`
   against the player and tick the inventory.
5. **Store integration** — `store.equipItem`, `store.unequipItem`,
   `store.useConsumable` calls the new reducer functions.
6. **CLI** — `'item'` action lists usable consumables, applies the chosen
   one, decrements the stack.
7. **Library** — at least the count agreed in Q10. Naming follows the
   philosophical theme.
8. **Tests:** equip/unequip math, consumable application, CLI smoke test.

## Acceptance checklist

- [ ] All 10 questions answered.
- [ ] Equipping a stat-mod weapon visibly changes the player's
      `derivedStats` in the CLI display.
- [ ] Using a Healing Potion in the CLI restores HP and decrements the stack.
- [ ] An equipment with `onHitEffects` lands the effect at the right time.
- [ ] `docs/equipment.md` filled in with the final type, formulas, library.

## Out of scope

- Crafting from `Material` items.
- Shop economy / pricing — Spec 08.
- Equipment as quest rewards — Spec 08.
