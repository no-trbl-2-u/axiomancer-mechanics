# Combat

## Overview

Turn-based combat with rock-paper-scissors mechanics. All combat functions are pure and live in:

- `Combat/index.ts` — module barrel + small mechanics helpers (advantage, stats, dice, damage, health, effect queries).
- `Combat/combat.reducer.ts` — small `(state, …args) => newState` mutations on `CombatState`.
- `Combat/combat.resolver.ts` — `resolveCombatRound`, the single round-resolution entry point. Returns `{ state, combatEvents }` so any UI client (CLI, future React Native UI, automated tester) can drive combat without re-implementing the math. The orchestrator delegates to per-phase helpers in `Combat/phases/`:
  - `phases/round-start.ts` — regen / drain / start-phase DoT.
  - `phases/action-restriction.ts` — `forcedStance` / `blockedStance` / `skipTurn`.
  - `phases/advantage.ts` — type-advantage matchup + effect overrides.
  - `phases/stance-effects.ts` — clear stale Tier 1 buffs; apply this round's Tier 1.
  - `phases/scenario.ts` — skill / item / attack / defend resolution and stance-token generation (the largest phase).
  - `phases/round-end.ts` — end-phase DoT and effect expiry.

For first-region tuning, read [`early-combat-balance.md`](./early-combat-balance.md)
before changing player stats, starter enemies, stance math, damage formulas, or
tutorial-facing combat behavior.

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
| `skill` | Use an equipped skill (Spec 04 / 04b) |
| `item` | Use an inventory consumable (Spec 05 / 05b) |
| `flee` | Attempt to escape |

## Combat Phases

`choosing_stance` → `choosing_action` → `choosing_skill` → `resolving` → `ended`

The Combat CLI currently drives both selection phases inline rather than persisting them
on `state.phase`; the reducer still exposes `setPhase(state, phase)` for consumers that
want explicit phase tracking.

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

A single call to `resolveCombatRound(state, playerAction, enemyAction, lookupSkill?)`
runs every phase below and returns `{ state, combatEvents }`. The CLI prints the
event stream via `renderRoundEvents` in `combat.display.ts`; the resolver
itself never logs.

```
resolveCombatRound(state, playerAction, enemyAction, lookupSkill?)
├── 1. round-start          → processRoundStartEffects  → regen / drain / start-phase DoT
│                              (early exit if a combatant drops to 0 HP)
├── 2. action-restriction   → canAct                    → forced-stance / blocked-stance / skipTurn
├── 3. advantage            → resolveEffectiveAdvantage → matchup + per-side advantage label
├── 4. stance-effects       → clearTier1EffectsForStance + applyTier1CombatEffect
├── 5. scenario             → 'skill' routes through executeSkill (Spec 04);
│                              otherwise attack-vs-attack / attack-vs-defend / etc.
│                              Player basic actions also generate stance tokens
│                              into `combatResources` (hit +3 / miss +1 / defend +5).
└── 6. round-end            → end-phase DoT  → tickAllEffects  → log expired effects
                              + round counter increments
```

Events are emitted in the order above, grouped by `phase`:
`round-start` → `action-restriction` → `advantage` → `stance-effects` →
`skill` → `scenario` → `resources` → `round-end`. UI consumers render each
section from the typed `RoundEvent` union exported alongside the resolver.

## Tier 1 Auto-Effects

Every `attack` or `defend` action automatically applies a Tier 1 effect — no resist roll.
Switching action types removes the previous type's self-buff immediately via `clearTier1EffectsForStance()`.

| Action | Effect | Applied To |
|--------|--------|------------|
| Body + Attack | `tier1_body_attack` — Ad Baculum (physical attack stance) | self |
| Body + Defend | `tier1_body_defend` — Briar Stance (thorns reflect) | self |
| Mind + Attack | `tier1_mind_mark` — Exposed Reasoning (+1 intensity / +1 duration) | opponent |
| Mind + Defend | `tier1_mind_mark` — Exposed Reasoning (+3 intensity / +3 duration) | opponent |
| Heart + Attack | `tier1_heart_attack` — Fleeting Kindness (emotional pressure) | self |
| Heart + Defend | `tier1_heart_defend` — Vital Empathy (regen) | self |

## Effect-Based Combat Specials (Active)

These are live in `combat.resolver.ts` (no CLI inline math — the CLI just renders the events the resolver emits):

| Mechanic | When | What |
|----------|------|------|
| **Study Mark** (Mind/Attack) | Before damage roll | `getStudyMarkIntensity(enemy)` → added to damage roll as bonus |
| **Thorns Reflect** (Body/Defend) | After any hit on the bearer | `getThornsReflect(bearer)` → sums `reflectDamage × intensity`; dealt back to attacker |
| **Heart/Attack — strip buff** | On hit | `removeRandomBuff(enemy)` → one random enemy buff removed |
| **Heart/Attack — extend buff** | On hit | `extendRandomBuffDuration(player, 1)` → one random player buff gets +1 duration |
| **Heart/Attack — roll penalty** | Roll phase | −5 to the player's attack modifier |

## Spec 03 — Tier 2 / Tier 3 Effect Procs

Every basic `attack` or `defend` that lands a hit also rolls for effect procs from `combat-effects.library.json`. The proc table is organised as Stance × action × tier triples. Basic actors only roll the tier-1 entries; tier-2 and tier-3 procs are gated by per-cell unlocks on the actor (`procUnlocks` field on Character / Enemy).

**Trigger gate** — procs only fire on a successful hit (i.e. inside `resolveAttackHit`). The attacker rolls procs from their `attack` table; the defender, when they actively defended, additionally rolls procs from their `defend` table.

**Final proc chance** —

```
chance = baseChance
       + (stanceBaseStat       × 0.02)    // STAT_PROC_BONUS_PER_POINT
       + (statusChanceIntensity × 0.05)    // STATUS_CHANCE_BUFF_BONUS  (from buff_status_chance_up)
```

Clamped to [0, 1].

**Crit (nat 20 attack roll)** — every eligible proc in the table fires automatically with +1 intensity / +1 duration on top of the trigger's defaults.

**Fumble (nat 1 attack roll)** — applies the cell's `fumbleEffectId` to the actor as a self-debuff and skips other procs for that cell.

**Application path** — procs hand off to `applyEffect` (to materialise the ActiveEffect with the right intensity / duration) and then `resolveEffectApplication` (Tier 2 buff caster fumble/crit; Tier 2 debuff + Tier 3 always land post-Phase-80). Tier 1 procs auto-apply via `applyEffect` alone.

**Default proc matrix:**

| Stance / Action | Tier 1 (basic) | Tier 2 (unlock) | Tier 3 (unlock) | Fumble (self) |
|-----------------|----------------|------------------|------------------|----------------|
| Body / Attack | `debuff_post_hoc_tremor` (opponent, 10%) | `debuff_bleed` (opponent, 18%) | `debuff_petrify` (opponent, 6%) | `debuff_post_hoc_tremor` |
| Body / Defend | `buff_ad_hoc_patch` (self, 10%) | `buff_resistance_body` (self, 15%) | `buff_invincibility` (self, 5%) | `debuff_post_hoc_tremor` |
| Mind / Attack | `debuff_affirming_consequent` (opponent, 10%) | `debuff_daze` (opponent, 18%) | `debuff_petrify` (opponent, 6%) | `debuff_affirming_consequent` |
| Mind / Defend | `buff_gettiters_flicker` (self, 10%) | `buff_resistance_mind` (self, 15%) | `buff_haste` (self, 5%) | `debuff_affirming_consequent` |
| Heart / Attack | `debuff_straw_man_echo` (opponent, 10%) | `debuff_fear` (opponent, 18%) | `debuff_petrify` (opponent, 6%) | `debuff_straw_man_echo` |
| Heart / Defend | `buff_petitio_pulse` (self, 10%) | `buff_resistance_heart` (self, 15%) | `buff_invincibility` (self, 5%) | `debuff_straw_man_echo` |

**Enemy customisation (Q7)** — `Enemy.procOverrides` swaps the entire cell's table wholesale (used for bosses with signature procs and elite / basic enemies whose tables depend on the encounter map). `Enemy.procUnlocks` raises the per-cell tier cap independently.

**Switching (Q5)** — out of scope for this spec. The skill engine (Spec 04) will hook switching into a different effect pool; basic procs do not currently apply a switching multiplier.

## Effect Application Rules (`resolveEffectApplication`)

| Tier | Rule |
|------|------|
| **Tier 1** | Auto-applies. No roll made. |
| **Tier 2 Buff** | Caster d20: natural 1 = fumble (buff fails, `buff-fumbled` event). Natural 20 = crit focus → 2× intensity. Any other = auto-succeeds. |
| **Tier 2 Debuff** | **Always lands.** No target-resist roll. No rebound. No overwhelmed. (Phase 80 — direction (a) pure split.) |
| **Tier 3** | **Always lands.** Inescapable. (Phase 80 — Nat-20 escape removed.) |

See `docs/effects.md` for the full per-tier breakdown and stacking rules.

## Friendship Path

Both combatants defending on the same round increments `friendshipCounter`.
Reaching `FRIENDSHIP_COUNTER_MAX` (3) ends combat with the `friendship`
outcome — UNLESS the enemy carries a per-enemy `befriendabilityConfig`
override (Phase 68), in which case ALL of its named predicates must pass
simultaneously before friendship triggers. See § "Per-enemy predicate
(Phase 68 — `BefriendabilityConfig`)" below for the override semantics.

When the Game store's `endCombat()` resolves a friendship exit (Phase 36),
the returned `CombatEndReport` carries:

- `outcome: 'friendship'` (distinct from `'flee'`)
- `xpGained: floor(totalEncounterXp * 0.5) + friendshipReward?.xpBonus` —
  half the kill-win XP plus any per-enemy bonus (Phase 60)
- `loot: rollEncounterLoot(encounter) ++ friendshipReward?.items` —
  the full weighted-loot roll with any per-enemy guaranteed items
  appended (Phase 60)
- `friendshipReward?: { narrative?, alignmentShift?, codexEntryUnlocked? }`
  (Phase 60 + 69 + 73) — present only when the befriended enemy
  carries an authored `friendshipReward` with `narrative` /
  `alignmentDelta`, OR a `journalEntry` that wasn't already
  unlocked. Engine doesn't interpret `narrative`; CLI / UI renders.
  `alignmentShift` (Phase 69) carries the post-clamp
  `PhilosophicalAlignment` the reducer just wrote to
  `state.philosophicalAlignment` — surface parity for consumers
  that don't subscribe separately. `codexEntryUnlocked` (Phase 73)
  carries `{ id, title }` for the newly-unlocked codex entry;
  body is looked up against the source `Enemy.journalEntry`.
- **State side effect (Phase 62)** — when the befriended enemy carries
  `friendshipReward.flagSet?: string`, the END_COMBAT reducer appends
  the flag to `state.flags` (de-duped). Downstream dialogue choices /
  quest objectives can gate on the flag via the existing
  `DialogueChoice.requires.flag` machinery — no new engine surface
  for the consumer. Convention is `befriended-<enemy-id-stem>` (e.g.
  `befriended-mournful-gull`). The flag does NOT surface on the report.
- **State side effect (Phase 69)** — when the befriended enemy carries
  `friendshipReward.alignmentDelta?: Partial<PhilosophicalAlignment>`,
  the END_COMBAT reducer applies the delta to
  `state.philosophicalAlignment` via `applyAlignmentDelta` (Phase 42
  clamp helper; each axis clamps to `[-100, +100]`, missing axes pass
  through). Closes Spec 14 Q4. Authoring band: ±1..±5 per axis (matches
  the Phase 43 dialogue / map-event delta convention). The post-clamp
  cell surfaces on `CombatEndReport.friendshipReward.alignmentShift`.
- **State side effect (Phase 73 — closes GH#65 ask 3)** — when the
  befriended enemy carries `journalEntry?: CodexEntry`
  (`{ id, title, body }`), the END_COMBAT reducer appends the
  entry's id to `state.codex.unlockedEntries` (de-duped). The
  store layer surfaces `{ id, title }` on
  `CombatEndReport.friendshipReward.codexEntryUnlocked` only when
  the entry wasn't already unlocked — repeat befriends don't
  re-fire the report field. Body is recovered at consumer render
  time via lookup against the source `Enemy` (or a future
  `CodexLibrary` registry). Victory / defeat / flee outcomes do
  NOT unlock the entry; future content can grant entries outside
  combat via `store.unlockCodexEntry(entryId)`.

The reducer side (Phase 10) also shifts the moral meter `+1` (see
`docs/morality.md` § "Combat: Friendship Victories") and routes the player
through `applyLevelUps` if the (now possibly-bonused) XP crossed a threshold.

### Befriendable-enemy content (Phase 60)

Per-enemy `Enemy.friendshipReward?: FriendshipReward` lets authors
attach bonus content to the friendship resolution. Two enemies ship
authored rewards today:

| Enemy | Items | xpBonus | Narrative |
|---|---|---|---|
| **MournfulGull** (at `fv-15` gull crag, Phase 65) | 1 × heart-draught | +10 | "The gull stops circling. It settles on the rail beside you. For a long moment, neither of you speaks the slights you remember." |
| **HollowEyedBeggar** (at `fv-18` back alley, Phase 65) | 1 × healing-potion + 1 × antidote | +15 | "They pull a folded cloth from somewhere inside the rags. Two phials, both still cold. \"I was carrying these for someone,\" they say. \"But you stopped. So.\"" |

`FriendshipReward` is `{ items?: Item[]; xpBonus?: number; narrative?:
string }`. Items are appended to the weighted-loot roll, xpBonus is
additive on top of the half-XP base, and `narrative` surfaces on
`CombatEndReport.friendshipReward.narrative` for the consumer to
render. Enemies without an authored `friendshipReward` resolve via the
Phase 36 base only (the report's `friendshipReward` field is
`undefined`). See `docs/enemy.md` § "Befriendable enemies (Phase 60)"
for authoring guidance.

### Per-enemy predicate (Phase 68 — `BefriendabilityConfig`)

`Enemy.befriendabilityConfig?: BefriendabilityConfig` overrides the
Phase 36 friendship-eligibility predicate per enemy. When absent, the
Phase 36 mechanic stays unchanged. When present, ALL of its named
fields AND-compose; eligibility requires every named predicate to pass
simultaneously. Within a single list-valued predicate, the match is
existential (at least one element).

| Field | Semantics |
|---|---|
| `roundsThreshold?: number` | Per-enemy override of `FRIENDSHIP_COUNTER_MAX`. Defaults to the global value (3) when absent on a config that sets other fields. |
| `hpGate?: { belowPct: number }` | Enemy HP fraction must be ≤ `belowPct` at the eligibility check. Pure snapshot — healing back above the threshold un-qualifies. Range [0, 1]. |
| `requiredStances?: Stance[]` | Player must have used at least one of the named stances during combat (existential). Derived from `state.log[].playerAction.stance`. Empty array = no requirement. |
| `requiredSkillUse?: string[]` | Player must have cast at least one of the named skill IDs during combat (existential). Derived from `state.log[].playerAction` entries with `action === 'skill'`. Empty array = no requirement. |
| `defaultFallback?: 'both-defend-cap'` | Explicit "fall through to Phase 36". When set, other fields are ignored for THIS enemy; eligibility uses the global counter cap exactly. |

The engine helper that evaluates the predicate is
`isFriendshipEligible(state: CombatState): boolean` in
`src/Combat/index.ts`. It is **not** on the public barrel — engine
consumers read combat-end state through `determineCombatEnd` /
`isCombatOngoing`, both of which call it so the two predicates stay in
lockstep.

The counter still increments freely on both-defend rounds (Phase 36
unchanged); friendship triggers only when ALL config predicates pass
together. A player can "bank" defends past `roundsThreshold` and have
friendship trigger later (e.g. once `hpGate` clears via damage progress).

Coastal Tyrant is the first boss-tier authored config (Phase 68):

```typescript
// CoastalTyrant (boss; alignment faith-pessimistic-transcendent)
befriendabilityConfig: {
    hpGate: { belowPct: 0.4 },
    requiredStances: ['heart'],
    roundsThreshold: 5,
},
```

The fallen magistrate-priest opens his friendship arc only after he's
been brought low (HP ≤ 40%), the player has shown empathy at least
once (heart stance), and 5 both-defend rounds have passed. The
authored `friendshipReward` content (multi-paragraph narrative + items)
is deferred to the boss-tier befriendable-enemy follow-up phase.

## Combat End Conditions

`determineCombatEnd(state)` returns:

| Return | Condition |
|--------|-----------|
| `'player'` | Enemy HP ≤ 0 |
| `'ko'` | Player HP ≤ 0 |
| `'friendship'` | `isFriendshipEligible(state)` — Phase 36 cap by default, overridden by `enemy.befriendabilityConfig` per Phase 68 |
| `'ongoing'` | None of the above |

## Battle Log

`CombatState.log: BattleLogEntry[]` is an opt-in coarse summary slot from
the pre-Phase-9 combat design. `appendLog(state, entry)` is the reducer
that pushes one row:

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

The live per-round signal that consumers actually subscribe to is the
`RoundEvent[]` stream returned by `resolveCombatRound` — it carries every
phase / kind / sub-event (attack-roll, damage-applied, effect-application,
heal, resist, friendship-counter ticks, ...). The CLI threads that
stream onto the `combat:round` event payload and the agent-e2e state log
via `store.updateCombat(next, combatEvents)`. `appendLog` remains on the
public barrel for any consumer that wants the summary shape; the combat
resolver itself never populates it.

## Combat Reducer API

Defined in `src/Combat/combat.reducer.ts`. These are small, single-concept
state-shape mutations. The current names are on the left; legacy aliases are
listed where they exist for backwards compatibility.

| Function | Alias(es) | Description |
|----------|-----------|-------------|
| `initializeCombat(player, enemy)` | — | Creates fresh CombatState with deep-cloned combatants |
| `setPhase(state, phase)` | — | Transitions to a new combat phase |
| `setPlayerStance(state, stance)` | — | Sets the player's stance choice |
| `setPlayerAction(state, action)` | — | Sets the player's action choice |
| `appendLog(state, entry)` | — | Appends a battle log entry |
| `incrementFriendship(state)` | — | Increments the friendship counter |
| `endCombat(state)` | `endCombatPlayerVictory`, `endCombatPlayerDefeat`, `endCombatWithFriendship` | Marks combat as ended; the reason is encoded in `determineCombatEnd(state)` |

## Combat Resolver API

Defined in `src/Combat/combat.resolver.ts`. The resolver is the single
round-resolution entry point used by every UI client.

| Function / Type | Description |
|-----------------|-------------|
| `resolveCombatRound(state, playerAction, enemyAction): RoundResolution` | Runs all six phases of one round and returns `{ state, combatEvents }`. Pure; only RNG source is `Math.random` inside dice rolls and effect selectors (stub via `src/test-utils/rng.ts`). |
| `RoundResolution` | `{ state: CombatState; combatEvents: RoundEvent[] }` |
| `RoundEvent` | Discriminated union, organised by `phase` (`round-start`, `action-restriction`, `advantage`, `stance-effects`, `scenario`, `round-end`). UIs render each phase as a section. |
| `CombatActor` | `'player' \| 'enemy'` — used by every event to identify which side it belongs to. |

## Combat Mechanics API

| Function | Description |
|----------|-------------|
| `determineAdvantage(attacker, defender)` | Returns advantage relationship |
| `getAdvantageModifier(advantage)` | Returns +2 / 0 / −2 |
| `hasAdvantage(attacker, defender)` | Boolean shorthand |
| `determineEnemyAction(logic)` | AI-driven enemy action selection |
| `isCombatOngoing(state)` | True if combat should continue |
| `determineCombatEnd(state)` | Returns outcome or 'ongoing' |
| `getBaseStat(entity, stance)` | Raw base stat for a stance |
| `getAttackStat(entity, stance)` | Attack derived stat for a stance |
| `getDefenseStat(entity, stance)` | Defense derived stat for a stance |
| `getSaveStat(entity, stance)` | Save stat for a stance (enemies fall back to defense) |
| `getResistStat(entity, resistedBy)` | Base stat used when resisting an effect |
| `rollSkillCheck(baseStat, advantage)` | d20 + modifier with advantage/disadvantage |
| `calculateFinalDamage(base, reduction, crit, bonus)` | Damage after reductions. On crit, picks the higher of `double` (2× base − defence) vs `pierce` (base, defence ignored) — Phase 32 auto-selection. |
| `selectCritDamage(base, reduction, bonus)` | Phase 32 — returns `{ style, damage }` for the crit auto-selection in isolation, useful for tests / future damage previews. |
| `applyDamage(entity, damage)` | Reduces HP (clamps to 0) |
| `heal(entity, amount)` (alias `healCharacter`) | Restores HP (clamps to max) |
| `resolveEffectApplication(target, effect, type, heart, equip)` | Effect application (Tier 2 buff fumble/crit; Tier 2 debuff + Tier 3 always land) |
| `tickAllEffects(target)` | Decrements all effect durations |
| `getStudyMarkIntensity(target)` | Mind mark bonus for damage |
| `getThornsReflect(bearer)` | Thorns reflect damage total |
| `removeRandomBuff(target)` | Strips one random buff |
| `extendRandomBuffDuration(target, amount)` | Extends one random buff |
| `applyRegen(target)` | Sums and applies all regen effects |

## Pending

The Spec 02 / 03 / 04 / 05 work this section used to track has
shipped. Combat is exercised end-to-end via `resolveCombatRound`
through the six `Combat/phases/` files; skill and item actions live in
`phases/scenario.ts`; Tier 2/3 procs are in `Combat/combat-effects.ts`.
The CLI log utilities were dropped when Phase 17 unified the CLI
surface around `npm run game` — no log strings exist in the engine
today; consumers render directly from the typed `RoundEvent` stream.

### Landed in Spec 02

- `resolveCombatRound` (in `combat.resolver.ts`) replaces the CLI's inline
  attack / defend math; the CLI is now UI-only.
- Typed `RoundEvent` stream emitted alongside the new state for UI rendering.
- `canAct` / `getActiveEffectModifiers` are wired through the resolver.
- Symmetric defense (Q3): both player and enemy defenders now route through
  `getDefenseStat` instead of the asymmetric base-stat path the CLI used to
  use for the player.
