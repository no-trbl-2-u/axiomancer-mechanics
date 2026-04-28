# Effects

Developer reference for every status effect in Axiomancer Mechanics. For an individual
effect deep-dive (data fields, combat interaction, test cases) see the per-effect
documents in [`docs/effects/`](./effects/).

---

## Table of Contents

1. [Overview](#overview)
2. [Tier Scale & Resistance Rules](#tier-scale--resistance-rules)
3. [Stacking Modes](#stacking-modes)
4. [Payload Field Reference](#payload-field-reference)
5. [ActiveEffect Runtime Fields](#activeeffect-runtime-fields)
6. [Combat Consumption Map](#combat-consumption-map)
7. [Round Order](#round-order)
8. [Tier 1 Auto-Effects](#tier-1-auto-effects)
9. [Complete Effects Table — Buffs (39)](#complete-effects-table--buffs-39)
10. [Complete Effects Table — Debuffs (46)](#complete-effects-table--debuffs-46)
11. [Effect Engine API](#effect-engine-api)
12. [Implementation Status](#implementation-status)
13. [Pending](#pending)

---

## Overview

Effects are temporary modifiers applied to combatants during battle. Every effect is stored
as an `ActiveEffect` instance on `character.currentActiveEffects` or
`enemy.currentActiveEffects`. Effect data is loaded at runtime from
`packages/engine/src/effects/buffs.library.json` and `packages/engine/src/effects/debuffs.library.json` and keyed into an
in-memory `Map` by `effect.id` via `packages/engine/src/effects/effects.library.ts`.

All effect application logic lives in `packages/engine/src/effects/index.ts`. All combat-time helpers
(resist resolution, tick, regen, roll modifiers, thorns, mark, Heart specials) live in
`packages/engine/src/combat/index.ts`. The interactive CLI wires these together in `packages/cli/src/combat.cli.ts`.

---

## Tier Scale & Resistance Rules

| Tier   | Resist DR   | Rule                                                              |
|--------|-------------|-------------------------------------------------------------------|
| Teir 1 | —           | Auto-applies. No resist roll. Always lands.                       |
| Teir 2 | 12 – 14     | Resist roll required (buff: fumble only; debuff: roll vs DR).     |
| Teir 3 | 17 – 18     | Only a natural 20 on the resist roll repels it.                   |

Each effect carries two resist fields (copied onto the `ActiveEffect` for fast lookup):

- `resistedBy: Stance` — which stat the **target** uses to resist (`heart`, `body`, `mind`)
- `resistDR: number` — base difficulty of the resist roll

**RPS Rule:** Body effects are resisted by Mind. Mind effects by Heart. Heart effects by Body.

### Teir 2 — Buff (caster rolls)

| Result    | Outcome                                         |
|-----------|-------------------------------------------------|
| Natural 1 | Fumble — concentration shattered, buff fizzles. |
| Natural 20 | Crit focus — buff applies at **2× intensity**. |
| Any other | Auto-succeeds.                                  |

### Teir 2 — Debuff (target rolls to resist)

```
DR   = effect.resistDR + attacker.baseStats.heart + equipmentBonus
Roll = d20 + target.derivedStats[resistedBy defense]
```

| Result         | Outcome                                                              |
|----------------|----------------------------------------------------------------------|
| Natural 20     | Rebound — debuff bounces to the **attacker** at **2× intensity**.   |
| Natural 1      | Overwhelmed — effect lands at **2× duration**.                       |
| Roll ≥ DR      | Resisted — no effect.                                                |
| Roll < DR      | Lands normally.                                                      |

### Teir 3

| Result     | Outcome                   |
|------------|---------------------------|
| Natural 20 | Repelled (miracle).       |
| Any other  | Inescapable — always lands. |

---

## Stacking Modes

| Mode        | Behaviour                                                                                                  |
|-------------|-------------------------------------------------------------------------------------------------------------|
| `none`      | Strongest instance wins. Equal or weaker re-application is ignored. Duration is **not** refreshed.          |
| `intensity` | `currentIntensity` increments by `intensityDelta` each application (capped at `MAX_EFFECT_INTENSITY = 10`). Duration resets or extends additively per `ApplyEffectOptions`. |
| `duration`  | `remainingDuration` extends by `effect.duration` on reapply (capped at `MAX_EFFECT_DURATION = 10`).         |

`ApplyEffectOptions` (used by Tier 1 system):

| Field            | Default           | Purpose                                                        |
|------------------|-------------------|----------------------------------------------------------------|
| `intensityDelta` | `1`               | How much intensity increases (also the initial intensity).     |
| `durationMode`   | `'reset'`         | `'reset'` resets to `effect.duration`; `'additive'` adds delta.|
| `durationDelta`  | `intensityDelta`  | How much duration increases in additive mode.                  |

---

## Payload Field Reference

Every effect's mechanical modifications live in its `payload` object.

```jsonc
{
  "payload": {
    // Modifies base or derived stats. Applied conceptually each round.
    // NOT yet auto-applied in the combat engine — display only until Phase 2.
    "statModifiers": [
      { "stat": "body", "value": 2, "isMultiplier": false },
      { "stat": "physicalAttack", "value": 1.5, "isMultiplier": true }
    ],

    // Flat bonus/penalty added to EVERY attack/damage dice roll.
    // LIVE: summed by getActiveRollModifier() in packages/engine/src/combat/index.ts.
    "rollModifier": 2,

    // Per-stack roll bonus/penalty. Total = rollModifierPerIntensity × currentIntensity.
    // LIVE: included in getActiveRollModifier() sum.
    "rollModifierPerIntensity": 1,

    // Flat bonus/penalty added to defence values.
    // NOT yet wired into calculateFinalDamage / defense path — display only until Phase 2.
    "defenseModifier": 3,

    // Damage-over-time dealt at the START of each round.
    // NOT yet consumed in the combat engine — display only until Phase 2.
    "damageOverTime": {
      "damagePerRound": 3,
      "damageType": "body"    // which stat type the damage is classified as
    },

    // Per-round healing applied at the START of each round.
    // LIVE: consumed by applyRegen() in packages/engine/src/combat/index.ts.
    // Negative values (disease, hp_decay) are defined in data but applyRegen() skips
    // values ≤ 0 — the drain mechanic is pending Phase 2 implementation.
    "regeneration": {
      "healthPerRound": 3,    // LIVE
      "manaPerRound": 0       // typed but not yet consumed
    },

    // Damage per intensity reflected to attacker when bearer is hit.
    // LIVE: consumed by getThornsReflect() in packages/engine/src/combat/index.ts.
    "reflectDamage": 1,

    // Action restrictions. NOT yet enforced — display only until Phase 2.
    "actionRestriction": {
      "skipTurn": false,            // target loses their action
      "blockedStances": ["heart"],  // stances the target cannot choose
      "forcedStance": null          // target must use this stance
    },

    // Advantage/disadvantage grants. NOT yet wired into roll resolution — display only.
    "advantageModifier": {
      "grantAdvantage":    ["body"],
      "grantDisadvantage": ["body", "mind", "heart"]
    }
  }
}
```

### Payload field implementation status

| Field                     | Status       | Where consumed                              |
|---------------------------|--------------|---------------------------------------------|
| `rollModifier`            | **LIVE**     | `getActiveRollModifier()` — `packages/engine/src/combat/index.ts` |
| `rollModifierPerIntensity` | **LIVE**    | `getActiveRollModifier()` — scaled by `currentIntensity` |
| `reflectDamage`           | **LIVE**     | `getThornsReflect()` — `packages/engine/src/combat/index.ts` |
| `regeneration.healthPerRound` | **LIVE** | `applyRegen()` — `packages/engine/src/combat/index.ts` (positive values only) |
| `statModifiers`           | **PENDING**  | Defined in data; not auto-applied to `derivedStats` yet |
| `defenseModifier`         | **PENDING**  | Defined in data; not applied in damage path yet |
| `damageOverTime`          | **PENDING**  | Defined in data; no DoT loop in combat engine yet |
| `advantageModifier`       | **PENDING**  | Defined in data; not wired into roll advantage logic yet |
| `actionRestriction`       | **PENDING**  | Defined in data; skipTurn/blockedStances/forcedStance not enforced yet |
| `regeneration.manaPerRound` | **PENDING** | Typed but not consumed anywhere            |

---

## ActiveEffect Runtime Fields

When an effect is applied, an `ActiveEffect` instance is created and stored on the
combatant:

```typescript
{
  effectId:          string;            // references Effect.id in the library
  remainingDuration: number;            // rounds until expiry; -1 = permanent
  currentIntensity:  number;            // stack level for intensity-stacking effects
  appliedAtRound:    number;            // which combat round the effect was first applied
  teir:              'Teir 1' | 'Teir 2' | 'Teir 3';
  resistedBy?:       Stance;            // copied from Effect for fast resist lookup
  resistDR?:         number;            // copied from Effect for fast resist lookup
  sourceId?:         string;            // ID of who applied it (optional attribution)
}
```

`remainingDuration` special values:

| Value | Meaning                          |
|-------|----------------------------------|
| `-1`  | Permanent (never ticks down).    |
| `0`   | Duration effect expires at end of round (instant effects: `duration: 0` in data). |
| `> 0` | Normal timed effect.             |

---

## Combat Consumption Map

This section details **exactly which combat code path reads each payload field** and the
specific function in which it happens.

### `rollModifier` and `rollModifierPerIntensity`

**Function:** `getActiveRollModifier(target)` — `packages/engine/src/combat/index.ts`

```
total = Σ (def.payload.rollModifier + def.payload.rollModifierPerIntensity × ae.currentIntensity)
        for each ae in target.currentActiveEffects
```

Called in `combat.cli.ts` to adjust attack and damage rolls before they are applied.
Both fields are summed across **all** active effects simultaneously.

### `reflectDamage`

**Function:** `getThornsReflect(bearer)` — `packages/engine/src/combat/index.ts`

```
total = Σ (def.payload.reflectDamage × ae.currentIntensity)
        for each ae in bearer.currentActiveEffects
```

Called in `combat.cli.ts` after a successful hit on the bearer. The total is dealt as
reflect damage back to the attacker. Scales with `currentIntensity` — higher stacks deal
more thorns.

### `regeneration.healthPerRound`

**Function:** `applyRegen(target)` — `packages/engine/src/combat/index.ts`

```
healed = Σ (def.payload.regeneration.healthPerRound × ae.currentIntensity)
         for each ae where healthPerRound > 0
```

Called at the **start of each round** before the player makes a choice. Scales with
`currentIntensity` — stacking regen effects heal more per round. Negative
`healthPerRound` values in the data (e.g. `debuff_disease`, `debuff_hp_decay`) are
**skipped** by the current implementation (`perRound <= 0` check). The drain mechanic
will be enabled in Phase 2.

### `tier1_mind_mark` intensity (Exposed Reasoning)

**Function:** `getStudyMarkIntensity(target)` — `packages/engine/src/combat/index.ts`

```
intensity = target.currentActiveEffects
              .find(e => e.effectId === 'tier1_mind_mark')
              ?.currentIntensity ?? 0
```

Called in `combat.cli.ts` during Mind/Attack resolution. The mark's intensity is
added as a flat damage bonus to the attack roll.

### Buff stripping and extension (Heart/Attack special)

**Functions:** `removeRandomBuff(target)` and `extendRandomBuffDuration(target, amount)`
— `packages/engine/src/combat/index.ts`

- `removeRandomBuff`: picks a random `buff`-typed active effect from the **enemy** and
  removes it entirely.
- `extendRandomBuffDuration`: picks a random `buff`-typed active effect from the
  **player** and adds rounds (capped at `MAX_EFFECT_DURATION`).

Both are called in `combat.cli.ts` when the player's Heart/Attack hits.

### Duration ticking

**Function:** `tickAllEffects(target)` — `packages/engine/src/combat/index.ts`

Called at the **end of each round** for both player and enemy. Each non-permanent effect
has `remainingDuration` decremented by 1. Effects reaching `0` are removed and returned
as `expired[]` so the CLI can display expiry messages.

### Tier 1 application

**Functions:** `applyTier1CombatEffectWithResult` / `applyTier1CombatEffect`
— `packages/engine/src/effects/index.ts`

Called once per combatant per round, right after clearing stale Tier 1 buffs. The Tier 1
map (`TIER1_EFFECT_MAP`) keys on `(stance, action)` and returns an `effectId`, `target`
(`'self'` or `'opponent'`), and optional `ApplyEffectOptions`. Mind actions target the
opponent; all other stances target self.

### Stance-switch buff clearing

**Function:** `clearTier1EffectsForType(activeEffects, currentType)`
— `packages/engine/src/effects/index.ts`

Removes any active Tier 1 buff whose effect ID contains a **different** stance prefix
than the current action. Debuffs applied to the actor by an opponent are never cleared
here. Called once per combatant per round, before Tier 1 application.

### Resist resolution (Tier 2 / Tier 3)

**Function:** `isEffectApplied(target, activeEffect, effectType, attackerHeartBonus, equipmentBonus)`
— `packages/engine/src/combat/index.ts`

Uses `getResistStatFromResistedBy(target, activeEffect.resistedBy)` (from
`packages/engine/src/character/index.ts`) to read the target's **derived defence stat** for the
appropriate stance, then applies the Tier 2/3 resolution rules described above.

---

## Round Order

The combat CLI processes effects in this order each round:

```
1. applyRegen          — Start-of-round heal (player then enemy)
2. clearTier1EffectsForType — Remove stale Tier 1 stance buffs (player then enemy)
3. applyTier1CombatEffectWithResult — Apply new Tier 1 stance effect (player then enemy)
4. Resolve attacks:
     a. getActiveRollModifier   — Modifier to attack/damage rolls
     b. getStudyMarkIntensity   — Mind mark damage bonus
     c. getThornsReflect        — Post-hit reflect damage
     d. removeRandomBuff        — Heart/Attack: strip enemy buff
     e. extendRandomBuffDuration — Heart/Attack: extend player buff
5. tickAllEffects      — End-of-round duration decrement + expiry (player then enemy)
```

---

## Tier 1 Auto-Effects

Every basic `attack` or `defend` action automatically applies a Tier 1 stance effect with
no resist roll. Switching stances removes the previous stance's self-buff immediately.

| Action         | Effect ID               | Effect Name         | Target   | Stack delta | payload summary                                      |
|----------------|-------------------------|---------------------|----------|-------------|------------------------------------------------------|
| Body + Attack  | `tier1_body_attack`     | Ad Baculum          | self     | +1 int / reset dur | `+physicalAttack 1`, `rollModifierPerIntensity 1` |
| Body + Defend  | `tier1_body_defend`     | Briar Stance        | self     | +1 int / reset dur | `reflectDamage 1` per intensity                   |
| Mind + Attack  | `tier1_mind_mark`       | Exposed Reasoning   | opponent | +1 int / +1 dur    | `{}` — intensity used as Mind damage bonus        |
| Mind + Defend  | `tier1_mind_mark`       | Exposed Reasoning   | opponent | +3 int / +3 dur    | `{}` — intensity used as Mind damage bonus        |
| Heart + Attack | `tier1_heart_attack`    | Fleeting Kindness   | self     | +1 int / reset dur | `rollModifier -5`; strip enemy buff + extend player buff on hit |
| Heart + Defend | `tier1_heart_defend`    | Vital Empathy       | self     | +1 int / reset dur | `regeneration.healthPerRound 1` per intensity     |

---

## Complete Effects Table — Buffs (39)

Full per-effect documentation: [`docs/effects/buffs/`](./effects/buffs/)

| ID | Name | Tier | Category | Dur | Stack | resistedBy | resistDR | Payload Summary |
|----|------|------|----------|-----|-------|-----------|---------|-----------------|
| `tier1_body_attack` | Ad Baculum | Teir 1 | stat | 2 | intensity | — | — | `+physicalAttack 1`, `rollModifierPerIntensity 1` |
| `tier1_body_defend` | Briar Stance | Teir 1 | defense | 3 | intensity | — | — | `reflectDamage 1` per intensity |
| `tier1_heart_defend` | Vital Empathy | Teir 1 | regeneration | 3 | intensity | — | — | `healthPerRound 1` per intensity |
| `tier1_heart_attack` | Fleeting Kindness | Teir 1 | stat | 2 | intensity | — | — | `rollModifier -5` |
| `buff_body_attack_up` | Achilles' Momentum | Teir 2 | stat | 3 | intensity | mind | 13 | `+body 2`, `+physicalSkill 3`, `rollModifier +2` |
| `buff_mind_attack_up` | Schrödinger's Focus | Teir 2 | stat | 3 | intensity | heart | 13 | `+mind 2`, `+mentalSkill 3`, `rollModifier +2` |
| `buff_heart_attack_up` | Bootstrap Passion | Teir 2 | stat | 3 | intensity | body | 13 | `+heart 2`, `+emotionalSkill 3`, `rollModifier +2` |
| `buff_body_defense_up` | Theseus' Constitution | Teir 2 | defense | 4 | duration | mind | 12 | `+body 2`, `+physicalDefense 3`, `defenseModifier +2` |
| `buff_mind_defense_up` | Epistemic Shield | Teir 2 | defense | 4 | duration | heart | 12 | `+mind 2`, `+mentalDefense 3`, `defenseModifier +2` |
| `buff_heart_defense_up` | Paradox of Tolerance | Teir 2 | defense | 4 | duration | body | 12 | `+heart 2`, `+emotionalDefense 3`, `defenseModifier +2` |
| `buff_defend_up` | Hilbert's Shelter | Teir 2 | defense | 3 | none | heart | 14 | `defenseModifier +4`, `+body/mind/heart 1`, `+physDef/menDef/emoDef 2` |
| `buff_accuracy_up` | Bertrand's Precision | Teir 2 | advantage | 3 | intensity | heart | 13 | `rollModifier +3`, `+physSkill/menSkill/emoSkill 2` |
| `buff_evasion_up` | Arrow's Impossibility | Teir 2 | defense | 3 | duration | mind | 13 | `defenseModifier +3`, `+allDefense 2`, `grantDisadvantage [body,mind,heart]` |
| `buff_critical_rate_up` | Observer's Collapse | Teir 2 | advantage | 4 | intensity | heart | 12 | `rollModifier +2`, `+luck 2` |
| `buff_critical_damage_up` | Banach-Tarski Strike | Teir 2 | damage | 3 | none | mind | 14 | `×body 1.5`, `×mind 1.5`, `×heart 1.5` (multipliers) |
| `buff_haste` | Twin's Dilation | Teir 3 | advantage | 2 | none | mind | 17 | `rollModifier +4`, `grantAdvantage [body,mind,heart]` |
| `buff_regeneration` | Tristram's Recovery | Teir 2 | regeneration | 5 | intensity | mind | 12 | `healthPerRound 3` per intensity |
| `buff_max_hp_up` | Galileo's Infinity | Teir 2 | stat | 5 | none | mind | 13 | `×body 1.25` (multiplier) |
| `buff_barrier` | Gabriel's Horn | Teir 2 | defense | 3 | none | heart | 13 | `defenseModifier +5` |
| `buff_damage_reduction` | Dichotomy Shield | Teir 2 | defense | 3 | none | heart | 13 | `defenseModifier +5` |
| `buff_invincibility` | EPR Entanglement | Teir 3 | defense | 1 | none | heart | 18 | `defenseModifier +99` |
| `buff_taunt` | Crocodile's Promise | Teir 2 | control | 3 | none | body | 12 | `defenseModifier +2`, `+body 1` |
| `buff_stealth` | Fermi's Absence | Teir 2 | advantage | 2 | none | mind | 14 | `defenseModifier +6`, `grantAdvantage [body,mind,heart]` |
| `buff_all_stats_up` | Sorites Ascension | Teir 2 | stat | 3 | none | heart | 14 | `+body/mind/heart 2`, `+allSkill 1`, `+luck 1`, `rollModifier +1` |
| `buff_reflect` | Russell's Mirror | Teir 2 | defense | 2 | none | heart | 13 | `defenseModifier +2` |
| `buff_counter` | Newcomb's Retribution | Teir 2 | advantage | 3 | none | mind | 13 | `rollModifier +2`, `grantAdvantage [body]` |
| `buff_resistance_body` | Pole in Barn | Teir 2 | defense | 4 | duration | mind | 13 | `+body 3`, `+physicalDefense 4`, `+physicalSave 3` |
| `buff_resistance_mind` | Liar's Shield | Teir 2 | defense | 4 | duration | heart | 13 | `+mind 3`, `+mentalDefense 4`, `+mentalSave 3` |
| `buff_resistance_heart` | Fiction's Wall | Teir 2 | defense | 4 | duration | body | 13 | `+heart 3`, `+emotionalDefense 4`, `+emotionalSave 3` |
| `buff_cleanse` | Barber's Paradox | Teir 2 | stat | 0 | none | heart | 12 | `{}` (instant — removes debuffs; mechanic pending) |
| `buff_buff_duration_up` | Unexpected Extension | Teir 2 | advantage | 3 | none | heart | 12 | `rollModifier +1` |
| `buff_status_chance_up` | Monty's Advantage | Teir 2 | advantage | 4 | none | heart | 13 | `rollModifier +3` |
| `buff_life_steal` | Maxwell's Siphon | Teir 2 | regeneration | 4 | intensity | mind | 12 | `healthPerRound 2` per intensity, `rollModifier +1` |
| `buff_advantage_body` | Predestination Strength | Teir 2 | advantage | 3 | none | mind | 13 | `grantAdvantage [body]`, `+body 1`, `+physicalSkill 2` |
| `buff_advantage_mind` | Knowability Insight | Teir 2 | advantage | 3 | none | heart | 13 | `grantAdvantage [mind]`, `+mind 1`, `+mentalSkill 2` |
| `buff_advantage_heart` | Hedonist's Loop | Teir 2 | advantage | 3 | none | body | 13 | `grantAdvantage [heart]`, `+heart 1`, `+emotionalSkill 2` |
| `buff_petitio_pulse` | Petitio Principii Pulse | Teir 1 | stat | 2 | none | body | 10 | `+heart 1` |
| `buff_gettiters_flicker` | Gettier's Flicker | Teir 1 | advantage | 2 | none | heart | 10 | `+luck 1` |
| `buff_ad_hoc_patch` | Ad Hoc Patch | Teir 1 | stat | 2 | none | mind | 10 | `+physicalSkill 1` |

---

## Complete Effects Table — Debuffs (46)

Full per-effect documentation: [`docs/effects/debuffs/`](./effects/debuffs/)

| ID | Name | Tier | Category | Dur | Stack | resistedBy | resistDR | Payload Summary |
|----|------|------|----------|-----|-------|-----------|---------|-----------------|
| `tier1_mind_mark` | Exposed Reasoning | Teir 1 | stat | 1 | intensity | — | — | `{}` — intensity = Mind attack damage bonus |
| `debuff_all_stats_down` | Heap's Collapse | Teir 2 | stat | 3 | intensity | heart | 13 | `-body/mind/heart 2`, `-allSkill 1`, `rollModifier -1` |
| `debuff_poison` | Curry's Corruption | Teir 2 | damage | 4 | intensity | mind | 13 | `DoT 3/rd (body)` |
| `debuff_strong_poison` | Yablo's Venom | Teir 2 | damage | 3 | intensity | mind | 14 | `DoT 5/rd (body)`, `-body 1` |
| `debuff_bleed` | Theseus' Dissolution | Teir 2 | damage | 4 | intensity | mind | 12 | `DoT 2/rd (body)` |
| `debuff_burn` | Olbers' Fire | Teir 2 | damage | 3 | intensity | body | 13 | `DoT 4/rd (heart)`, `-heart 1` |
| `debuff_frostbite` | Boltzmann's Chill | Teir 2 | damage | 3 | duration | mind | 12 | `DoT 2/rd (body)`, `rollModifier -2` |
| `debuff_shock` | Hardy's Discharge | Teir 2 | damage | 2 | intensity | heart | 13 | `DoT 3/rd (mind)`, `rollModifier -1` |
| `debuff_curse` | Grelling's Malediction | Teir 2 | stat | 5 | none | body | 14 | `-body 1`, `-mind 1`, `-heart 2`, `rollModifier -2` |
| `debuff_disease` | Inspection Sickness | Teir 2 | damage | 4 | duration | mind | 12 | `DoT 2/rd (body)`, `healthPerRound -1` (pending) |
| `debuff_wound` | Berry's Injury | Teir 2 | stat | 4 | intensity | mind | 13 | `-body 2`, `defenseModifier -2` |
| `debuff_stun` | Buridan's Paralysis | Teir 2 | control | 1 | duration | heart | 14 | `skipTurn true` (pending) |
| `debuff_sleep` | Sleeping Beauty's Rest | Teir 2 | control | 2 | none | heart | 13 | `skipTurn true`, `defenseModifier -3` (pending) |
| `debuff_daze` | Simpson's Confusion | Teir 2 | control | 2 | duration | heart | 12 | `rollModifier -3`, `-mind 2`, `-mentalSkill 2`, `-mentalDefense 1` |
| `debuff_petrify` | Zeno's Stillness | Teir 3 | control | 2 | none | heart | 17 | `skipTurn true`, `defenseModifier -4` (pending) |
| `debuff_fear` | Grandfather's Terror | Teir 2 | control | 2 | duration | body | 13 | `rollModifier -3`, `-heart 3`, `-emotionalSkill 2`, `-emotionalDefense 2` |
| `debuff_charm` | Wigner's Friendship | Teir 2 | control | 2 | none | body | 14 | `forcedStance heart`, `-heart 2`, `-emotionalDefense 2` (pending) |
| `debuff_confusion` | Two Envelope Delirium | Teir 2 | control | 3 | duration | heart | 13 | `rollModifier -4`, `grantDisadvantage [body,mind,heart]` |
| `debuff_blind` | Quantum Erasure | Teir 2 | control | 2 | duration | heart | 13 | `rollModifier -5`, `grantDisadvantage [body,mind]` |
| `debuff_silence` | Moore's Muteness | Teir 2 | control | 3 | none | body | 13 | `blockedStances [heart]`, `-heart 2`, `-emotionalSkill 3` (pending) |
| `debuff_berserk` | Problem of Evil | Teir 2 | stat | 3 | none | heart | 13 | `+body 3`, `-mind 4`, `-heart 2`, `+physSkill 2`, `-menSkill 3`, `-menDef 2`, `defenseModifier -3` |
| `debuff_fatigue` | Preface Exhaustion | Teir 2 | stat | 4 | intensity | heart | 12 | `-body/mind 1`, `-physSkill/menSkill 1`, `rollModifier -1` |
| `debuff_exhaustion` | Lottery Despair | Teir 2 | stat | 3 | intensity | heart | 13 | `-body/mind/heart 2`, `-allSkill 1`, `rollModifier -2` |
| `debuff_slow` | Achilles' Burden | Teir 2 | control | 3 | duration | mind | 12 | `rollModifier -2`, `-physicalSkill 2`, `grantDisadvantage [body]` |
| `debuff_root` | Braess Binding | Teir 2 | control | 2 | duration | mind | 13 | `defenseModifier -2`, `rollModifier -2` |
| `debuff_knockdown` | Ross-Littlewood Fall | Teir 2 | control | 1 | none | mind | 12 | `defenseModifier -4`, `rollModifier -3` |
| `debuff_vulnerability_body` | Richard's Exposure | Teir 2 | defense | 3 | duration | mind | 13 | `-body 3`, `-physicalDefense 4`, `-physicalSave 3` |
| `debuff_vulnerability_mind` | Cantor's Gap | Teir 2 | defense | 3 | duration | heart | 13 | `-mind 3`, `-mentalDefense 4`, `-mentalSave 3` |
| `debuff_vulnerability_heart` | Burali-Forti Wound | Teir 2 | defense | 3 | duration | body | 13 | `-heart 3`, `-emotionalDefense 4`, `-emotionalSave 3` |
| `debuff_mark` | Raven's Target | Teir 2 | advantage | 3 | none | heart | 13 | `defenseModifier -3`, `grantDisadvantage [body,mind,heart]` |
| `debuff_body_attack_down` | Omnipotence Failure | Teir 2 | stat | 3 | intensity | mind | 13 | `-body 2`, `-physicalSkill 3`, `rollModifier -1` |
| `debuff_mind_attack_down` | GHZ Collapse | Teir 2 | stat | 3 | intensity | heart | 13 | `-mind 2`, `-mentalSkill 3`, `rollModifier -1` |
| `debuff_heart_attack_down` | Toxin Hesitation | Teir 2 | stat | 3 | intensity | body | 13 | `-heart 2`, `-emotionalSkill 3`, `rollModifier -1` |
| `debuff_evasion_down` | Dartboard Certainty | Teir 2 | defense | 3 | duration | heart | 13 | `defenseModifier -3`, `-allDefense 2` |
| `debuff_accuracy_down` | Ellsberg's Doubt | Teir 2 | advantage | 3 | duration | heart | 12 | `rollModifier -3`, `-allSkill 2` |
| `debuff_defense_down` | Prisoner's Betrayal | Teir 2 | defense | 3 | intensity | heart | 13 | `defenseModifier -3`, `-body 1`, `-physicalDefense 2` |
| `debuff_dispel` | Skolem's Reduction | Teir 2 | stat | 0 | none | heart | 12 | `{}` (instant — removes buffs; mechanic pending) |
| `debuff_hex` | Allais' Curse | Teir 2 | damage | 3 | none | body | 13 | `DoT 2/rd (heart)` |
| `debuff_hp_decay` | Centipede's End | Teir 2 | damage | 4 | none | mind | 13 | `DoT 3/rd (body)`, `healthPerRound -2` (pending) |
| `debuff_moral_learning` | Moral Blindness | Teir 2 | control | 3 | none | body | 12 | `-heart 2`, `-mind 1`, `-emotionalSkill 2`, `-mentalSkill 1`, `rollModifier -1` |
| `debuff_transformative` | Transformative Terror | Teir 2 | control | 2 | none | heart | 13 | `rollModifier -2`, `-mind 2`, `-heart 1`, `-mentalSkill 2`, `-emotionalDefense 1` |
| `debuff_rational_disagreement` | Peer Doubt | Teir 2 | stat | 2 | duration | heart | 12 | `-mind 3`, `-mentalSkill 2`, `-mentalDefense 1`, `rollModifier -2` |
| `debuff_straw_man_echo` | Straw Man's Echo | Teir 1 | advantage | 2 | none | body | 10 | `rollModifier -1` |
| `debuff_post_hoc_tremor` | Post Hoc Tremor | Teir 1 | stat | 2 | none | mind | 10 | `-body 1` |
| `debuff_affirming_consequent` | Affirming the Consequent | Teir 1 | stat | 2 | none | mind | 10 | `-physicalSkill 1` |
| `debuff_causal_emergence` | Emergence Failure | Teir 2 | control | 2 | none | heart | 13 | `rollModifier -2`, `-mind 2`, `-mentalSkill 2`, `-physicalSkill 1`, `grantDisadvantage [mind]` |

---

## Effect Engine API

| Function | File | Description |
|----------|------|-------------|
| `lookupEffect(effectId)` | `packages/engine/src/effects/effects.library.ts` | O(1) lookup by effect ID from the registry |
| `getEffectByName(name)` | `packages/engine/src/effects/effects.library.ts` | Find effect by display name (slower linear scan) |
| `getEffectsByType(type)` | `packages/engine/src/effects/effects.library.ts` | Get all buffs or all debuffs |
| `applyEffect(effects, effect, round, options?)` | `packages/engine/src/effects/index.ts` | Core stacking engine — applies an effect respecting all stacking modes |
| `applyTier1CombatEffectWithResult(actorEffects, opponentEffects, action, round, customMap?)` | `packages/engine/src/effects/index.ts` | Applies Tier 1 stance effect; returns updated arrays + UI feedback |
| `applyTier1CombatEffect(...)` | `packages/engine/src/effects/index.ts` | Simplified wrapper — returns only updated effect arrays |
| `clearTier1EffectsForType(effects, currentType)` | `packages/engine/src/effects/index.ts` | Removes stale Tier 1 self-buffs on stance switch |
| `getTargetsResistStatValue(target, activeEffect)` | `packages/engine/src/effects/index.ts` | Returns target's **base** stat for resist roll (note: `isEffectApplied` uses derived stats) |
| `isEffectApplied(target, activeEffect, effectType, heartBonus, equipBonus)` | `packages/engine/src/combat/index.ts` | Full Tier 2/3 resist resolution with roll details |
| `tickAllEffects(target)` | `packages/engine/src/combat/index.ts` | End-of-round duration decrement; returns expired list |
| `updateEffectDuration(target, effectId)` | `packages/engine/src/combat/index.ts` | Tick one specific effect by ID |
| `getActiveRollModifier(target)` | `packages/engine/src/combat/index.ts` | Sum of all `rollModifier` + `rollModifierPerIntensity × intensity` across active effects |
| `getStudyMarkIntensity(target)` | `packages/engine/src/combat/index.ts` | Intensity of `tier1_mind_mark` (Mind attack damage bonus) |
| `getThornsReflect(bearer)` | `packages/engine/src/combat/index.ts` | Total reflect damage from all thorns effects |
| `removeRandomBuff(target)` | `packages/engine/src/combat/index.ts` | Strips one random buff (Heart/Attack special) |
| `extendRandomBuffDuration(target, amount)` | `packages/engine/src/combat/index.ts` | Extends one random buff's duration (Heart/Attack special) |
| `applyRegen(target)` | `packages/engine/src/combat/index.ts` | Applies per-round health regeneration from all regen effects |

---

## Implementation Status

### Fully live in combat

| Mechanic | Driving effect(s) |
|----------|-------------------|
| Roll modifier (flat) | `tier1_heart_attack`, `buff_body_attack_up`, `buff_accuracy_up`, `buff_status_chance_up`, all debuffs with `rollModifier` |
| Roll modifier (per-intensity) | `tier1_body_attack` (Ad Baculum) |
| Health regeneration | `tier1_heart_defend`, `buff_regeneration`, `buff_life_steal` |
| Thorns reflect | `tier1_body_defend` (Briar Stance) |
| Mind mark damage bonus | `tier1_mind_mark` (Exposed Reasoning) |
| Buff strip on hit | `tier1_heart_attack` (Fleeting Kindness) |
| Buff extend on hit | `tier1_heart_attack` (Fleeting Kindness) |
| Duration ticking / expiry | all effects |
| Tier 2/3 resist resolution | all Tier 2 / Tier 3 effects |

### Pending (Phase 2)

| Mechanic | Affected effects |
|----------|-----------------|
| Stat modifier application | All effects with `statModifiers` |
| Defense modifier application | `buff_body_defense_up`, `buff_invincibility`, `debuff_wound`, `debuff_sleep`, `debuff_petrify`, and ~20 others |
| Damage-over-time loop | `debuff_poison`, `debuff_strong_poison`, `debuff_bleed`, `debuff_burn`, `debuff_frostbite`, `debuff_shock`, `debuff_disease`, `debuff_hex`, `debuff_hp_decay` |
| Negative regeneration (drain) | `debuff_disease` (`healthPerRound -1`), `debuff_hp_decay` (`healthPerRound -2`) |
| `skipTurn` enforcement | `debuff_stun`, `debuff_sleep`, `debuff_petrify` |
| `blockedStances` enforcement | `debuff_silence` |
| `forcedStance` enforcement | `debuff_charm` |
| `advantageModifier` wiring | `buff_evasion_up`, `buff_haste`, `buff_stealth`, `buff_counter`, `buff_advantage_*`, `debuff_confusion`, `debuff_blind`, `debuff_slow`, `debuff_mark`, `debuff_causal_emergence` |
| `manaPerRound` consumption | (all regen effects — mana system not yet implemented) |
| Cleanse mechanic | `buff_cleanse` (Barber's Paradox) |
| Dispel mechanic | `debuff_dispel` (Skolem's Reduction) |
| `buff_critical_damage_up` multiplier | Banach-Tarski Strike (stat multiplier path) |
| `buff_max_hp_up` multiplier | Galileo's Infinity (maxHealth path) |

---

## Pending

Engine stubs scheduled for Phase 2:

- `removeEffect(activeEffects, effectId)` — filter by ID for cleanses/dispels
- `getActiveEffectModifiers(activeEffects)` — aggregate all stat/roll/defense/advantage mods
- `canAct(activeEffects)` — read `skipTurn`, `blockedStances`, `forcedStance`
- `processDamageOverTime(activeEffects)` — sum DoT damage per round
- `processRoundStartEffects(state)` — orchestrate DoT → regen → tick → expire
- `processWorldEffectTick(player)` — DoT/regen/expiry outside combat (per map node)
- Wiring `defenseModifier` into `calculateFinalDamage`
- Wiring `advantageModifier` into `createDieRoll` / advantage resolution
