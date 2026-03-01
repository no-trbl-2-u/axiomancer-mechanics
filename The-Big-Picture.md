# The Big Picture — Effects System

Current implementation status and what remains before effects are fully wired into combat.

---

## What Is Implemented

### Types (`Effects/types.d.ts`)
- `Effect` — full definition (id, name, teir, resistedBy, resistDR, payload, stacking, duration, etc.)
- `ActiveEffect` — runtime instance (effectId, remainingDuration, currentIntensity, teir, resistedBy, resistDR, appliedAtRound)
- `EffectPayload` — stat modifiers, DoT, regen, action restrictions, advantage modifiers, roll/defense modifiers, `reflectDamage` (thorns)
- `EffectApplicationResult` — result of an apply attempt; includes `success`, `message`, `stackedWith`, `rebounded`, and a full `roll` breakdown
- `EffectApplicationRoll` — inputs for a resist roll (DR formula, heart bonus, equipment bonus)

### Libraries (`Effects/effects.library.ts`)
- `effectsLibrary` — combined registry (Map) keyed by id
- `lookupEffect(effectId)` — O(1) id lookup
- `getEffectById`, `getEffectByName`, `getEffectType`, `getEffectTeir`

### Effect Engine (`Effects/index.ts`)
- `applyEffect(activeEffects, effect, round, options?)` — all three stacking modes (`none`, `intensity`, `duration`); capped at `MAX_EFFECT_INTENSITY` / `MAX_EFFECT_DURATION`
- `TIER1_EFFECT_MAP` + `applyTier1CombatEffect` / `applyTier1CombatEffectWithResult`
- `clearTier1EffectsForType` — removes stale Tier 1 self-buffs on action-type switch
- `getTargetsResistStatValue` — looks up `baseStats[resistedBy]` for Tier 2/3 rolls

### Resistance Logic (`Combat/index.ts` — `isEffectApplied`)

Full Tier 1/2/3 resist system is implemented:

| Tier | Rule |
|------|------|
| **Teir 1** | Auto-applies. No roll. |
| **Teir 2 Buff** | Only a natural 1 (fumble) stops it. Natural 20 doubles intensity (crit focus). |
| **Teir 2 Debuff** | Target rolls `d20 + resistStat` vs `DR = resistDR + attackerHeartBonus + equipBonus`. Natural 20 = rebound (effect bounces to attacker at 2× intensity). Natural 1 = overwhelmed (effect lands at 2× duration). Total ≥ DR = resisted. |
| **Teir 3** | Only a natural 20 repels it. Everything else lands. |

### Effect Helpers (`Combat/index.ts`)

- `tickAllEffects(target)` — decrements all non-permanent durations; returns `{ target, expired[] }` (permanent = −1, never ticks)
- `updateEffectDuration(target, effectId)` — tick a single effect by ID
- `getStudyMarkIntensity(target)` — current intensity of `tier1_mind_mark` on a combatant; Mind/Attack adds this to its damage roll
- `getThornsReflect(bearer)` — sums `reflectDamage × intensity` across all thorns effects; reflected after any hit on the bearer
- `removeRandomBuff(target)` — strips one random buff; Heart/Attack calls this on hit
- `extendRandomBuffDuration(target, amount)` — extends one random buff's duration; Heart/Attack calls this on hit
- `applyRegen(target)` — sums `healthPerRound × intensity` across all regen effects; called at round start

### Combat CLI (`combat.cli.ts`) — Current Round Flow

The `runCombatTurn` function already runs:

```
Round Start
├── applyRegen(player) → heal, log
├── applyRegen(enemy)  → heal, log
└── printStatus()

Player Chooses
├── promptPlayerChoice() — type + action
└── determineEnemyAction()

Pre-Combat
├── clearTier1EffectsForType(player, playerType) — remove stale buffs
├── clearTier1EffectsForType(enemy, enemyType)
├── applyTier1CombatEffectWithResult(player→enemy, playerAction) — stance effect
└── applyTier1CombatEffectWithResult(enemy→player, enemyAction)  — stance effect

Combat Resolution (one of four scenarios)
├── attack vs attack  → contest roll; winner deals damage; Mind bonus; Heart on-hit specials; Thorns reflect
├── attack vs defend  → attacker rolls vs defender's boosted defense (DEFENSE_MULTIPLIERS); same specials
├── defend vs attack  → same, reversed
└── both defend       → friendshipCounter++

Round End
├── tickAllEffects(player) → expired[]
├── tickAllEffects(enemy)  → expired[]
└── printEffectExpiry() for anything that faded
```

### Data
- 35 buffs and 45 debuffs, each with `teir`, `resistedBy`, `resistDR`, and full `payload`

---

## What Still Needs Building

### Effect Lifecycle Gaps
- `removeEffect(activeEffects, effectId)` — filter by ID (for cleanses, dispels)
- `getActiveEffectModifiers(activeEffects)` — aggregate all stat/roll/defense mods into one object
- `canAct(activeEffects)` — read `skipTurn`, `blockedActionTypes`, `forcedActionType`
- `processDamageOverTime(activeEffects)` — sum DoT per round + messages
- `processRoundStartEffects(state)` — single orchestrator call (DoT → regen → tick → expire); currently each step is called individually in `runCombatTurn`

### Combat Math Stubs (Phase 2a)
- `performAttackRoll` / `performDefenseRoll` — full roll with effect modifiers
- `calculateBaseDamage` / `calculateDamageReduction` / `calculateAttackDamage`

### Combat Reducer Stubs (Phase 2c)
- `resolveCombatRound` — moves the inline scenario logic in `combat.cli.ts` into a pure reducer
- Battle log helpers: `createBattleLogEntry`, `formatAllBattleLogs`, `generateCombatResultMessage`
- Initiative: `determineTurnOrder`, `rollInitiative`

### Wiring Remaining Modifiers
Once `getActiveEffectModifiers` exists, hook into:
1. Every dice roll: `+ rollModifier`
2. Every defense value: `+ defenseModifier`
3. `determineAdvantage` result: apply `advantageModifier` overrides
4. Action selection: `canAct` gates before prompting player or resolving enemy AI

---

## Key Design Rule

Effects are numbers inserted into existing calculations — not a rewrite of combat.

- `+ rollModifier` added to every roll
- `+ defenseModifier` added to every defense value
- `processRoundStartEffects()` called once per round before actions
- The resist system (`isEffectApplied`) gates whether a Tier 2/3 effect lands at all
