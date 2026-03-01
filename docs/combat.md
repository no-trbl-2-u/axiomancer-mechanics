# Combat

## Type System

Each round both combatants choose an `ActionType`: `heart`, `body`, or `mind`.
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

Advantage modifier (flat roll bonus/penalty):
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
├── promptPlayerChoice() — ActionType + attack/defend
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
Switching action types removes the previous type's self-buff immediately.

| Action | Effect | Applied To |
|--------|--------|------------|
| Body + Attack | `tier1_body_attack` — physical attack stance | self |
| Body + Defend | `tier1_body_defend` — Briar Stance (thorns reflect) | self |
| Mind + Attack | `tier1_mind_mark` (+1 intensity / +1 duration) | opponent |
| Mind + Defend | `tier1_mind_mark` (+3 intensity / +3 duration) | opponent |
| Heart + Attack | `tier1_heart_attack` — emotional pressure | self |
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

Each resolved round appends a `BattleLogEntry`:

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

## Pending (Phase 2)

- Full attack/defense roll formula with effect modifier hook-ins (`performAttackRoll`, `performDefenseRoll`)
- `calculateBaseDamage` / `calculateDamageReduction` / `calculateAttackDamage` implementations
- Tier 2/3 effect proc matrix (`ActionType × action` → trigger chances)
- `resolveCombatRound` reducer replacing inline CLI scenario logic
- `canAct` / `getActiveEffectModifiers` wired into turn resolution
