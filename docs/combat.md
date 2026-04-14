# Combat

## Overview

Turn-based combat with rock-paper-scissors mechanics. All combat functions are pure and live in `Combat/index.ts` (mechanics) and `Combat/combat.reducer.ts` (state management).

## Type System

Each round both combatants choose a `Stance`: `heart`, `body`, or `mind`.
Advantage is determined by rock-paper-scissors:

```
Heart > Body > Mind > Heart
```

| Matchup | Result |
|---------|--------|
| Heart vs Body | Heart has **advantage** |
| Body vs Mind | Body has **advantage** |
| Mind vs Heart | Mind has **advantage** |
| Same type | **Neutral** |
| Reverse of above | **Disadvantage** |

Advantage modifier (flat roll bonus/penalty from `getAdvantageModifier()`):
- Advantage: +2
- Neutral: 0
- Disadvantage: −2

## Actions

| Action | Description |
|--------|-------------|
| `attack` | Offensive — deals damage |
| `defend` | Defensive — reduces incoming damage |
| `skill` | Use an equipped skill (Phase 3) |
| `item` | Use an inventory item (Phase 4) |
| `flee` | Attempt to escape |

## Combat Phases

`choosing_type` → `choosing_action` → `choosing_skill` → `resolving` → `ended`

## Defense Multipliers

Applied to the defender's base defense stat when the `defend` action is chosen.
The multiplier depends on the defender's type-advantage over the attacker.

| Defender's Advantage | Multiplier |
|---------------------|------------|
| Advantage (picked the right counter-type) | 3× |
| Neutral (same type) | 2× |
| Disadvantage (wrong type) | 1.5× |
| Not defending (took damage after losing attack contest) | 1× (passive) |

## Round Flow (Current Implementation)

```
Round Start
├── applyRegen(player) — summed healthPerRound × intensity from all regen effects
├── applyRegen(enemy)
└── printStatus()

Player Chooses
├── promptPlayerChoice() — Stance + attack/defend
└── determineEnemyAction()

Pre-Combat
├── clearTier1EffectsForType(player, type) — strip stale Tier 1 self-buffs
├── clearTier1EffectsForType(enemy, type)
├── applyTier1CombatEffectWithResult(player→enemy, playerAction)
└── applyTier1CombatEffectWithResult(enemy→player, enemyAction)

Combat Resolution
├── attack vs attack  → roll contest; winner deals damage (with specials below)
├── attack vs defend  → attacker rolls; defender uses boosted defense (DEFENSE_MULTIPLIERS)
├── defend vs attack  → same, reversed
└── both defend       → friendshipCounter++

Round End
├── tickAllEffects(player) — decrements durations; expired returned separately
├── tickAllEffects(enemy)
└── log expired effects
```

## Tier 1 Auto-Effects

Every `attack` or `defend` action automatically applies a Tier 1 effect — no resist roll.
Switching action types removes the previous type's self-buff immediately via `clearTier1EffectsForType()`.

| Action | Effect | Applied To |
|--------|--------|------------|
| Body + Attack | `tier1_body_attack` — Ad Baculum (physical attack stance) | self |
| Body + Defend | `tier1_body_defend` — Briar Stance (thorns reflect) | self |
| Mind + Attack | `tier1_mind_mark` — Exposed Reasoning (+1 intensity / +1 duration) | opponent |
| Mind + Defend | `tier1_mind_mark` — Exposed Reasoning (+3 intensity / +3 duration) | opponent |
| Heart + Attack | `tier1_heart_attack` — Fleeting Kindness (emotional pressure) | self |
| Heart + Defend | `tier1_heart_defend` — Vital Empathy (regen) | self |

## Effect-Based Combat Specials (Active)

These are live in `combat.cli.ts`:

| Mechanic | When | What |
|----------|------|------|
| **Study Mark** (Mind/Attack) | Before damage roll | `getStudyMarkIntensity(enemy)` → added to damage roll as bonus |
| **Thorns Reflect** (Body/Defend) | After any hit on the bearer | `getThornsReflect(bearer)` → sums `reflectDamage × intensity`; dealt back to attacker |
| **Heart/Attack — strip buff** | On hit | `removeRandomBuff(enemy)` → one random enemy buff removed |
| **Heart/Attack — extend buff** | On hit | `extendRandomBuffDuration(player, 1)` → one random player buff gets +1 duration |
| **Heart/Attack — roll penalty** | Roll phase | −5 to the player's attack modifier |

## Effect Resistance Rules (`isEffectApplied`)

| Tier | Rule |
|------|------|
| **Teir 1** | Auto-applies. No roll made. |
| **Teir 2 Buff** | Only natural 1 (fumble) stops it. Natural 20 = crit focus → 2× intensity. |
| **Teir 2 Debuff** | Target rolls `d20 + resistStat` vs `DR = resistDR + attackerHeartBonus + equipBonus`. Natural 20 = rebound (effect bounces to attacker at 2× intensity). Natural 1 = overwhelmed (lands at 2× duration). Total ≥ DR = resisted. |
| **Teir 3** | Only natural 20 repels it. Everything else lands. |

DR formula: `effect.resistDR + attacker.baseStats.heart + equipmentBonus`
Resist stat: `target.derivedStats[physicalDefense | mentalDefense | emotionalDefense]` (based on `resistedBy`)

## Friendship Path

Both combatants defending on the same round increments `friendshipCounter`.
Reaching `FRIENDSHIP_COUNTER_MAX` (3) ends combat with the `friendship` outcome.

## Combat End Conditions

`determineCombatEnd(state)` returns:

| Return | Condition |
|--------|-----------|
| `'player'` | Enemy HP ≤ 0 |
| `'ko'` | Player HP ≤ 0 |
| `'friendship'` | `friendshipCounter >= FRIENDSHIP_COUNTER_MAX` |
| `'ongoing'` | None of the above |

## Battle Log

Each resolved round can append a `BattleLogEntry` via `addBattleLogEntry()`:

```typescript
{
  round, playerAction, enemyAction, advantage,
  playerRoll, playerRollDetails,
  enemyRoll, enemyRollDetails,
  damageToPlayer, damageToEnemy,
  playerHPAfter, enemyHPAfter,
  result
}
```

## Combat Reducer API

| Function | Description |
|----------|-------------|
| `initializeCombat(player, enemy)` | Creates fresh CombatState with deep-cloned combatants |
| `updateCombatPhase(state, phase)` | Transitions to a new combat phase |
| `setPlayerStance(state, stance)` | Sets the player's stance choice |
| `setPlayerAction(state, action)` | Sets the player's action choice |
| `addBattleLogEntry(state, entry)` | Appends a battle log entry |
| `incrementFriendship(state)` | Increments the friendship counter |
| `endCombatPlayerVictory(state)` | Ends combat with player win |
| `endCombatPlayerDefeat(state)` | Ends combat with player loss |
| `endCombatWithFriendship(state)` | Ends combat with friendship outcome |
| `resolveCombatRound(state)` | **TODO (Phase 2c):** Full round resolution via reducer |

## Combat Mechanics API

| Function | Description |
|----------|-------------|
| `determineAdvantage(attacker, defender)` | Returns advantage relationship |
| `getAdvantageModifier(advantage)` | Returns +2 / 0 / −2 |
| `hasAdvantage(attacker, defender)` | Boolean shorthand |
| `determineEnemyAction(logic)` | AI-driven enemy action selection |
| `isCombatOngoing(state)` | True if combat should continue |
| `determineCombatEnd(state)` | Returns outcome or 'ongoing' |
| `getBaseStatForType(entity, stance)` | Raw base stat for a stance |
| `getAttackStatForType(entity, stance)` | Attack derived stat for a stance |
| `getDefenseStatForType(entity, stance)` | Defense derived stat for a stance |
| `getSaveStatForType(entity, stance)` | Save stat for a stance (enemies fall back to defense) |
| `rollSkillCheck(baseStat, advantage)` | d20 + modifier with advantage/disadvantage |
| `calculateFinalDamage(base, reduction, crit, bonus)` | Damage after reductions |
| `applyDamage(entity, damage)` | Reduces HP (clamps to 0) |
| `healCharacter(entity, amount)` | Restores HP (clamps to max) |
| `isEffectApplied(target, effect, type, heart, equip)` | Full tier-based resist logic |
| `tickAllEffects(target)` | Decrements all effect durations |
| `getStudyMarkIntensity(target)` | Mind mark bonus for damage |
| `getThornsReflect(bearer)` | Thorns reflect damage total |
| `removeRandomBuff(target)` | Strips one random buff |
| `extendRandomBuffDuration(target, amount)` | Extends one random buff |
| `applyRegen(target)` | Sums and applies all regen effects |

## Pending (Phase 2)

- `performAttackRoll` / `performDefenseRoll` — full roll formulas with effect modifiers
- `calculateBaseDamage` / `calculateDamageReduction` / `calculateAttackDamage` — stat-based damage
- `processPlayerTurn` / `processEnemyTurn` — turn processing for the reducer
- `determineTurnOrder` / `rollInitiative` — initiative system
- `createBattleLogEntry` / `formatAllBattleLogs` / `generateCombatResultMessage` — log utilities
- `resolveCombatRound` — full round resolution replacing inline CLI logic
- Tier 2/3 effect proc matrix (`Stance × action` → trigger chances)
- `canAct` / `getActiveEffectModifiers` wired into turn resolution
