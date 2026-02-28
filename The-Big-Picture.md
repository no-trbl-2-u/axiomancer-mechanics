# The Big Picture

## Overview

Your `Effect` and `ActiveEffect` types are well-designed, but nothing connects them to combat yet. Currently:
- `CombatState` has no concept of "who has what effects"
- `Character` and `Enemy` have no `activeEffects` array  
- Effects exist as data definitions but lack the wiring to function

**Analogy:** A TTRPG with beautiful spell cards but no rules for playing them.

## Roadmap

Each task is small and self-contained. Do them **in order** — each builds on the last.
## Phase 1: Give Combatants a Place to Hold Effects

### 1. Add `activeEffects` to Character
- **File:** `Character/types.d.ts`
- **Change:** Add `activeEffects: ActiveEffect[]` property
- **Also:** Initialize to `[]` in `createCharacter()`
- **Summary:** One new interface property + one `[]` in the factory function

### 2. Add `activeEffects` to Enemy
- **File:** `Enemy/types.d.ts`
- **Change:** Add `activeEffects: ActiveEffect[]` property
- **Also:** Update all enemies in the library (including `Disatree_01`) with `activeEffects: []`
- **Summary:** One interface property + update each enemy with `[]`

### 3. Add effect arrays to CombatState
- **File:** `Combat/types.d.ts`
- **Change:** Add `playerEffects: ActiveEffect[]` and `enemyEffects: ActiveEffect[]`
- **Why:** Combat-local copies to avoid mutating character data mid-fight
- **Summary:** Two new arrays on `CombatState`, initialized when combat starts
## Phase 2: Build the Effect Engine (Pure Functions)

### 4. Create `Effects/effects.resolver.ts` — `lookupEffect(effectId): Effect`
- **Purpose:** Look up full Effect definitions from JSON libraries
- **Action:** Load buffs + debuffs into a single map at module init
- **Summary:** Build a dictionary to go from effect ID → full Effect definition

### 5. Write `applyEffect(activeEffects, effect, round): EffectApplicationResult`
- **Type:** Pure function
- **Input:** Target's `ActiveEffect[]`, Effect to apply, current round
- **Output:** New array + result message
- **Handle:** All three stacking modes (none/replace, intensity, duration)
- **Summary:** Push new or merge existing based on `effect.stacking`, return new array

### 6. Write `removeEffect(activeEffects, effectId): ActiveEffect[]`
- **Type:** Pure function  
- **Action:** Filter out effect by ID
- **Summary:** One-liner. Needed for cleanses and dispels

### 7. Write `tickEffectDurations(activeEffects): ActiveEffect[]`
- **Type:** Pure function
- **Action:** Decrement `remainingDuration` by 1 on all effects; remove those at 0
- **Special:** Skip permanents (duration = -1)
- **Summary:** Map, subtract 1, filter out expired ones

### 8. Write `getExpiredEffects(activeEffects): ActiveEffect[]`
- **Type:** Pure function
- **Returns:** Only effects where `remainingDuration === 0`
- **Use:** Call **before** `tickEffectDurations` to know what's expiring
- **Summary:** Filter where `remainingDuration === 0` for "Poison wore off!" messages
## Phase 3: Make Effects Actually Change Numbers

### 9. Write `calculateStatModifiers(activeEffects): Record<EffectStatTarget, number>`
- **Purpose:** Convert active effects into stat bonuses
- **Action:** Sum all `payload.statModifiers` from effects
- **Method:** Additive modifiers first, then multiplicative  
- **Summary:** Aggregate into a totals object

### 10. Write `calculateRollModifier(activeEffects): number`
- **Purpose:** Modify all die rolls
- **Action:** Sum all `payload.rollModifier` values
- **Summary:** Reduce effects to single number, added to every die roll

### 11. Write `calculateDefenseModifier(activeEffects): number`
- **Purpose:** Modify defense values
- **Action:** Sum all `payload.defenseModifier` values
- **Summary:** Reduce to single number, added to defense values

### 12. Write `getActionRestrictions(activeEffects): ActionRestriction`
- **Purpose:** Determine what actions a combatant can/must take
- **Rules:**
  - If ANY effect has `skipTurn: true` → skip the turn
  - Collect all `blockedActionTypes` → filter from choices
  - Last `forcedActionType` wins if multiple are set
- **Summary:** Merge all restrictions with "most restrictive wins"

### 13. Write `getAdvantageModifiers(activeEffects): AdvantageModifier`
- **Purpose:** Grant/deny advantage based on active effects
- **Action:** Merge `payload.advantageModifier` values
- **Summary:** Union all `grantAdvantage` and `grantDisadvantage` arrays
## Phase 4: Process Effects Each Round (The Tick)

### 14. Write `processDamageOverTime(activeEffects): { totalDamage: number, messages: string[] }`
- **Purpose:** Apply damage from ongoing effects
- **Action:** Sum all `payload.damageOverTime` values
- **Output:** Total damage + narrative messages (e.g., "Curry's Corruption deals 3 body damage")
- **Summary:** Loop effects, sum damage, build strings

### 15. Write `processRegeneration(activeEffects): { healthGain: number, manaGain: number, messages: string[] }`
- **Purpose:** Apply healing from ongoing effects
- **Action:** Sum all `payload.regeneration` values
- **Output:** Total health/mana gain + narrative messages
- **Summary:** Loop effects, sum regen, build strings

### 16. Write `processRoundStartEffects(state): CombatState`
- **Purpose:** Orchestrate all round-start effect processing
- **Execution order:**
  1. Apply DoT damage
  2. Apply regen  
  3. Tick durations down
  4. Remove expired effects
- **Timing:** Called once per round, **before** either combatant acts
- **Summary:** Calls 14, 15, 7, 8 in sequence. Updates HP/MP, effect arrays, logs messages
## Phase 5: Wire Effects Into the Combat Loop

### 17. Hook `getActionRestrictions` into player's turn
- **When:** Before showing action choices
- **Check:** `getActionRestrictions(playerEffects)`
- **Actions:**
  - `skipTurn: true` → skip the prompt entirely
  - `blockedActionTypes` → filter from choices
  - `forcedActionType` → auto-select it
- **Summary:** Read restrictions, modify or skip inquirer prompt

### 18. Hook `getActionRestrictions` into enemy's turn
- **When:** After `determineEnemyAction()`
- **Actions:**
  - Stunned (skipTurn) → skip action
  - Forced → override AI choice
- **Summary:** Check restrictions, override if needed

### 19. Hook `calculateRollModifier` into attack rolls
- **When:** After rolling dice
- **Formula:** `total = dieRoll + statModifier + effectRollModifier`
- **Summary:** Add effect roll modifiers to all die rolls

### 20. Hook `calculateDefenseModifier` into defense calculation
- **When:** When calculating defense values
- **Formula:** `defense = baseDef + effectDefenseModifier` (+ x1.5 if defending)
- **Summary:** Add effect defense modifiers to all defense values

### 21. Hook `getAdvantageModifiers` into advantage determination
- **When:** After `determineAdvantage()` runs
- **Action:** Let effects override the result
  - Effect grants advantage → upgrade neutral to advantage
  - Effect grants disadvantage → downgrade
- **Summary:** Let base logic run, then apply effect overrides

### 22. Hook `processRoundStartEffects` into round resolution
- **When:** At the very top of `resolveCombatRound()` (before actions)
- **Action:** Call `processRoundStartEffects(state)`
- **Output:** Log DoT damage, regen, and expired effects
- **Summary:** One function call at round start, display messages
## Phase 6: Actually Apply and Trigger Effects

### 23. Give skills a way to apply effects
- **File:** Skill type definition
- **Change:** Add `appliesEffect?: string` (effect ID field)
- **When:** Skill is used successfully
- **Action:** Look up effect and call `applyEffect` on target
- **Summary:** One optional field on `Skill`, checked after skill damage

### 24. Give enemies innate effects they can apply
- **File:** Enemy type definition
- **Change:** Add `appliesEffectOnHit?: string` field
- **When:** Enemy successfully hits
- **Action:** Apply effect to player (chance or guaranteed)
- **Summary:** One optional field on `Enemy`, checked after enemy attack roll

### 25. Write `addEffectToCombatant(state, target, effectId): CombatState`
- **Type:** Reducer-style function
- **Input:** Combat state, target (`'player' | 'enemy'`), effect ID
- **Action:** Lookup + apply + update state
- **Returns:** Updated state with new effect on correct array
- **Summary:** The "public API" for combat loop to apply effects
## Phase 7: Let the Player See What's Happening

### 26. Write `formatActiveEffects(activeEffects): string[]`
- **Purpose:** Display helper for combat status screen
- **Output:** Each effect listed with name, remaining duration, intensity
- **Styling:** Green for buffs, red for debuffs
- **Format:** "Achilles' Momentum (2 rounds)" style strings
- **Summary:** Map effects, look up names, format strings

### 27. Add effect display to combat status screen
- **Where:** Below each combatant's HP/MP bar
- **How:** Call formatter from task 26
- **Summary:** Print active effects next to health/mana

### 28. Log effect events in BattleLogEntry
- **File:** BattleLogEntry type
- **Change:** Add `effectEvents?: string[]` field
- **Populate with:** DoT ticks, regen, applications, expirations messages
- **Summary:** One optional field, filled during round resolution
## Phase 8: Test the Loop End-to-End

### 29. Create an easy-to-verify test effect
- **Test:** Hardcode a "Debug Burn" effect (2 damage/round for 3 rounds)
- **Apply:** Manually at combat start
- **Verify:**
  - Enemy takes 2, 2, 2 damage over 3 rounds
  - Effect expires correctly
- **Type:** Integration test
- **Summary:** Full pipeline test: apply → DoT tick → duration tick → expire

### 30. Create a test for stacking
- **Test 1:** Apply same effect twice with intensity stacking
  - Verify damage doubles
- **Test 2:** Apply with duration stacking
  - Verify timer resets
- **Type:** Unit tests
- **Summary:** Test `applyEffect` with each stacking mode

### 31. Create a test for action restrictions
- **Test 1:** Apply "stun" effect (`skipTurn: true`)
  - Verify combatant's turn is skipped
- **Test 2:** Apply "silence" effect (`blockedActionTypes: ['heart']`)
  - Verify heart is removed from choices
- **Type:** Unit tests
- **Summary:** Confirm restrictions modify turn flow correctly
## The Round Lifecycle (Your Mental Model)

Once complete, a single combat round flows like this:

### 1. Round Start
```
├─ processRoundStartEffects()
│  ├─ Apply DoT damage to both sides
│  ├─ Apply regen to both sides
│  ├─ Log what expired
│  └─ Tick all durations down by 1
└─ Check if anyone died from DoT
```

### 2. Player Turn
```
├─ Check action restrictions (skip? forced? blocked?)
├─ Player chooses type + action
├─ Calculate advantage (base + effect overrides)
├─ Roll dice (+ effect roll modifiers)
├─ Calculate damage (- effect defense modifiers)
└─ If skill used and has appliesEffect → apply effect to target
```

### 3. Enemy Turn
```
├─ Same as Player Turn
└─ If enemy hits and has appliesEffectOnHit → apply to player
```

### 4. Round End
```
├─ Log the round
├─ Display updated HP + active effects
└─ Check win/loss/friendship
```

---

## Key Design Insight

**Effects are just numbers that modify existing calculations.**

You're not rewriting combat. You're:
1. Inserting `+ effectBonus` into the math that already exists
2. Adding a `processRoundStartEffects()` call at the top of each round

That's it.

---

## Summary by Phase

| Phase | Tasks | What |
|-------|-------|------|
| **1** | 1-3 | Give combatants a place to hold effects on types/state |
| **2** | 4-8 | Build the pure-function effect engine (apply, remove, tick, expire) |
| **3** | 9-13 | Turn effects into actual numbers (stat mods, roll mods, restrictions) |
| **4** | 14-16 | Process DoT/regen each round (the "tick" orchestrator) |
| **5** | 17-22 | Wire effects into your existing combat calculations |
| **6** | 23-25 | Give skills and enemies the ability to trigger effects |
| **7** | 26-28 | Display effects to the player in the CLI |
| **8** | 29-31 | Test the full pipeline end-to-end |

**Total:** 31 tasks  
**Recommended start:** Phase 1 is straightforward type changes that shouldn't break anything