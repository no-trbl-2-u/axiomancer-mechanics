# Axiomancer — Game Roadmap

> Status-effect-heavy TTRPG engine. Heart/Body/Mind combat themed around logical fallacies and philosophical paradoxes.

Each phase builds on the one before it. `[x]` = done; `[ ]` = pending.

---

## Phase 1 — Effects Engine

- [x] Define `Effect`, `ActiveEffect`, `EffectPayload`, `EffectApplicationResult` types
- [x] Create `buffs.library.json` with `teir`, `resistedBy`, `resistDR`
- [x] Create `debuffs.library.json` with `teir`, `resistedBy`, `resistDR`
- [x] `effects.library.ts` — unified registry, `lookupEffect`, `getEffectById`, `getEffectByName`, `getEffectType`, `getEffectTeir`
- [x] `applyEffect(activeEffects, effect, round, options?)` — `none` / `intensity` / `duration` stacking, capped at constants
- [x] `tickAllEffects(target)` — decrements all non-permanent durations; expired effects returned separately; permanent (−1) never ticks (`Combat/index.ts`)
- [x] `updateEffectDuration(target, effectId)` — tick a single effect by ID
- [x] `applyRegen(target)` — sums `payload.regeneration.healthPerRound × intensity` across all active effects; called at round start
- [x] Tier 1 effect map (`TIER1_EFFECT_MAP`) and `applyTier1CombatEffect` / `applyTier1CombatEffectWithResult`
- [x] `clearTier1EffectsForType` — removes stale Tier 1 self-buffs on action-type switch
- [x] `getTargetsResistStatValue` — looks up target's resist stat for Tier 2/3 rolls
- [ ] `removeEffect(activeEffects, effectId)` — filter by ID (cleanses, dispels)
- [ ] `getActiveEffectModifiers(activeEffects)` — aggregate stat mods, roll mods, defense mods, advantage grants into one object
- [ ] `canAct(activeEffects)` — read `skipTurn`, `blockedActionTypes`, `forcedActionType`; return combined restrictions
- [ ] `processDamageOverTime(activeEffects)` — sum DoT, return total damage + messages
- [ ] `processRoundStartEffects(state)` — orchestrate: DoT → regen → tick → expire; return updated `CombatState` (regen and ticking are wired individually in the CLI; this unifies them into one reducer call)
- [ ] Unit tests for all functions above

---

## Phase 2 — Core Combat System

### 2a — Combat Math (`Combat/index.ts`)

- [x] `determineAdvantage(attackerType, defenderType): Advantage`
- [x] `getAdvantageModifier(advantage): number` — +2 / 0 / −2
- [x] `hasAdvantage(attackerType, defenderType): boolean`
- [x] `isCombatOngoing(state): boolean`
- [x] `determineCombatEnd(state): 'player' | 'ko' | 'friendship' | 'ongoing'`
- [x] `determineEnemyAction(enemyLogic): CombatAction`
- [x] `generateEnemyAttackType(state, enemy): ActionType`
- [x] `generateEnemyAction(state, enemy): Action`
- [x] `isValidCombatAction(action): action is CombatAction`
- [x] `getBaseStatForType(character, type): number`
- [x] `getAttackStatForType(character, type): number`
- [x] `getDefenseStatForType(character, type): number`
- [x] `getSaveStatForType(character, type): number`
- [x] `rollSkillCheck(baseStat, advantage)` — d20 + stat modifier
- [x] `isCriticalHit(roll): boolean` — natural 20
- [x] `isCriticalMiss(roll): boolean` — natural 1
- [x] `applyCriticalMultiplier(baseDamage): number` — ×2
- [x] `calculateFinalDamage(baseDamage, damageReduction, isCritical, damageBonus?)` — crits before subtraction, minimum 0
- [x] `applyDamage(target, damage): Character | Enemy` — clamp to 0
- [x] `healCharacter(target, amount): Character | Enemy` — clamp to maxHealth
- [x] `isAlive(target): boolean`
- [x] `isDefeated(target): boolean`
- [x] `getHealthPercentage(target): number`
- [x] `isEffectApplied(target, activeEffect, effectType, attackerHeartBonus, equipmentBonus): EffectApplicationResult` — full Tier 1/2/3 resist logic (see `docs/combat.md`)
- [x] `getStudyMarkIntensity(target): number` — intensity of `tier1_mind_mark` on target; added to Mind/Attack damage rolls
- [x] `getThornsReflect(bearer): number` — sums `reflectDamage × intensity` across all thorns effects; reflected after any hit
- [x] `removeRandomBuff(target)` — strips one random buff; used by Heart/Attack on hit
- [x] `extendRandomBuffDuration(target, amount)` — extends one random buff's duration; used by Heart/Attack on hit
- [ ] `performAttackRoll(attacker, attackType, advantage)` — stub
- [ ] `performDefenseRoll(defender, attackType, isDefending)` — stub
- [ ] `calculateBaseDamage(attacker, attackType, advantage)` — stub
- [ ] `calculateDamageReduction(defender, attackType, isDefending)` — stub
- [ ] `calculateAttackDamage(attacker, defender, attackType, advantage, isDefending)` — stub (full roll sequence)

### 2b — Status Effects in Combat Actions

- [ ] Define `CombatEffectTrigger` type
- [ ] `combat-effects.library.ts` — map `ActionType × action` pairs to Tier 2/3 trigger chances:
  - Heart + Attack: emotional debuff (fear, charm)
  - Heart + Defend: emotional buff (regen, resilience)
  - Body + Attack: physical debuff (bleed, wound, knockdown)
  - Body + Defend: physical buff (damage reduction, counter)
  - Mind + Attack: mental debuff (daze, silence, confusion)
  - Mind + Defend: mental buff (evasion, accuracy boost)
- [ ] `rollForCombatEffects(attacker, action, advantage): Effect[]`
- [ ] `applyCombatEffects(combat, effects): CombatState`
- [ ] Crit → guarantees strongest proc; fumble → may apply debuff to self
- [ ] Document full matrix in `docs/combat.md`

### 2c — Combat Reducer (`combat.reducer.ts`)

- [x] `initializeCombat(player, enemy): CombatState`
- [ ] `resetCombat(): CombatState`
- [ ] `updateCombatPhase(state, phase): CombatState`
- [ ] `setPlayerAttackType(state, type): CombatState`
- [ ] `setPlayerAction(state, action): CombatState`
- [ ] `resolveCombatRound(state): CombatState` — full round via the reducer (attack/defense rolls, effect procs, DoT/regen tick, log entry)
- [ ] `addBattleLogEntry(state, entry): CombatState`
- [ ] `incrementFriendship(state): CombatState`
- [ ] `endCombatPlayerVictory(state): CombatState`
- [ ] `endCombatPlayerDefeat(state): CombatState`
- [ ] `endCombatWithFriendship(state): CombatState`
- [ ] `processPlayerTurn(state)` — stub
- [ ] `processEnemyTurn(state)` — stub
- [ ] `determineTurnOrder(player, enemy)` — stub
- [ ] `rollInitiative(character)` — stub
- [ ] `createBattleLogEntry(state, roundResults)` — stub
- [ ] `formatAllBattleLogs(state)` — stub
- [ ] `generateCombatResultMessage(state)` — stub
- [ ] Unit tests for `resolveCombatRound`

### 2d — Combat CLI (`combat.cli.ts`)

- [x] Regen applied at round start (`applyRegen`)
- [x] Stale Tier 1 buffs cleared on type switch (`clearTier1EffectsForType`)
- [x] Tier 1 stance effects applied for both player and enemy (`applyTier1CombatEffectWithResult`)
- [x] Effects ticked at round end (`tickAllEffects`); expired effects displayed
- [x] Thorns reflect after any hit (`getThornsReflect`)
- [x] Heart/Attack specials on hit: strip enemy buff, extend player buff (`removeRandomBuff`, `extendRandomBuffDuration`)
- [x] Mind/Attack study mark bonus applied to damage roll (`getStudyMarkIntensity`)
- [ ] Replace inline scenario logic with `resolveCombatRound` reducer (Phase 2c)
- [ ] Show active buffs/debuffs each round
- [ ] Add Tier 2/3 effect proc messages
- [ ] Add skill selection (Phase 3)
- [ ] Add item usage (Phase 4)

---

## Phase 3 — Skills System

### 3a — Skill Type Refinement

- [x] Base `Skill` type with `philosophicalAspect`, `category`, `manaCost`
- [ ] `combatEffects: CombatEffectTrigger[]`
- [ ] `targetType: 'self' | 'enemy' | 'all_enemies' | 'all_allies'`
- [ ] `basePower` — base damage/healing before stat scaling
- [ ] `scalingStat` — which derived stat multiplies base power
- [ ] `advantageInteraction`
- [ ] `teir` field

### 3b — Skill Library

- [ ] At least 18 skills (3 per stat × 2 categories: fallacies and paradoxes)
- [ ] Each skill references effects from the library or introduces skill-specific effects
- [ ] Flavor text matches the theme
- [ ] Spread from Teir 1 to Teir 3

### 3c — Skill Engine

- [ ] `createSkill(data): Skill`
- [ ] `canUseSkill(character, skill)`
- [ ] `calculateSkillDamage(character, skill, advantage)`
- [ ] `executeSkill(state, skillId): CombatState`
- [ ] `learnSkill(character, skillId): Character`
- [ ] Unit tests

---

## Phase 4 — Equipment & Items

### 4a — Equipment Type Refinement

- [x] Base `Equipment`, `Consumable`, `Material`, `QuestItem` types
- [ ] `statModifiers: StatModifier[]` on `Equipment`
- [ ] `passiveEffects: string[]` on `Equipment`
- [ ] `onHitEffects: CombatEffectTrigger[]` on `Equipment`
- [ ] `onDefendEffects: CombatEffectTrigger[]` on `Equipment`
- [ ] `teir` field on `Equipment`
- [ ] `effectId: string` on `Consumable`
- [ ] `duration` and `power` overrides on `Consumable`

### 4b — Equipment Library

- [ ] At least 18 items: 6 weapons, 6 armor, 6 accessories (2 per stat alignment each)

### 4c — Consumable Library

- [x] Initial `consumable.library.json` (Healing Potion)
- [ ] Expand to at least 12: healing (3), mana (3), buff potions (3), offensive (3)

### 4d — Equipment & Item Engine

- [x] `store.addItemToInventory(item)`
- [x] `store.removeItemFromInventory(itemId)`
- [x] `store.stackItem(itemId, amount)`
- [x] `store.useConsumable(itemId)` — quantity management (effect application pending Phase 1 `removeEffect`)
- [ ] `equipItem(character, item): Character`
- [ ] `unequipItem(character, slot): Character`
- [ ] `getEquipmentModifiers(character): AggregatedModifiers`
- [ ] Unit tests

---

## Phase 5 — Character Progression

### 5a — Level Up

- [ ] `calculateExperienceToNextLevel(level): number`
- [ ] `grantExperience(character, amount): Character`
- [ ] `levelUp(character): Character`
- [ ] `statPoints` field on `Character`
- [ ] `allocateStatPoint(character, stat): Character`

### 5b — Skill Learning

- [ ] `getAvailableSkills(character): Skill[]`
- [ ] `learnSkill(character, skillId): Character`
- [ ] `knownSkills: string[]` and `equippedSkills: string[]` on `Character`
- [ ] `equipSkill` / `unequipSkill`

### 5c — Character CLI

- [ ] Level-up flow, stat allocation, skill learning, equipment management

---

## Phase 6 — Enemy System

### 6a — Enemy Library

- [ ] At least 15 enemies across 3 tiers, stat-aligned, thematically named
- [ ] Enemy skills and loot tables

### 6b — Enemy AI

- [x] `randomLogic(enemy): CombatAction`
- [ ] `aggressiveLogic`, `defensiveLogic`, `strategicLogic`, `bossLogic`

### 6c — Encounter Design

- [ ] `Encounter` type, encounter library by area, `generateEncounter(mapNode, playerLevel)`

---

## Phase 7 — World & Exploration

### 7a — World Reducer

- [x] `createStartingWorld(): WorldState`
- [ ] `changeMap`, `completeMap`, `unlockMap`, `completeNode`, `unlockNode`, `moveToNode`, `changeContinent`, `completeUniqueEvent`
- [ ] Unit tests

### 7b–7f — Content & Systems

- [ ] Map content, quest system, NPC/dialogue, shop, rest & recovery (see roadmap sections)

---

## Phase 8 — Game Loop

### 8a — State Orchestration

- [x] `createNewGameState(): GameState`
- [x] `store.save()` — persist via `PersistenceAdapter`
- [x] `adapter.load()` — load from adapter
- [x] `store.startCombat(enemy)` — snapshot player into `CombatState`
- [x] `store.endCombat()` — merge combat player back, clear `combatState`
- [ ] `gameReducer(state, action): GameState`
- [ ] `actions.constants.ts`
- [ ] `processNode(state, node): GameState`

### 8b — Main Game CLI

- [ ] `game.cli.ts`, main menu, exploration flow, sub-flows, inventory screen, save/load

### 8c — Difficulty System

- [ ] Moral-choice difficulty meter (see `BRAINDUMP.md`), enemy scaling, gated endings

---

## Phase 9 — Base Game Content

- [ ] Finalize pantheon, story, world map
- [ ] First continent: maps, encounters, events, NPCs, shops, quests, bosses
- [ ] Second continent: higher-tier content
- [ ] Final boss, multiple endings, ending narratives

---

## Phase 10 — Testing & Polish

### 10a — Test Suite

- [ ] Test runner (vitest or jest)
- [ ] Unit tests: Utils, Effects, Combat math, Combat reducer, Skill engine, Equipment, World reducer
- [ ] Integration tests: full combat encounters, game loop

### 10b — Balance Pass

- [ ] Audit effect tiers, playtest combat, verify XP curve, tune enemy AI

### 10c — Documentation

- [x] `docs/effects.md`
- [x] `docs/combat.md`
- [x] `docs/character.md`
- [ ] Complete `docs/combat.md` — full advantage matrix with effect proc matrix (Phase 2b)
- [ ] `docs/skills.md`, `docs/items.md`, `docs/world.md`
- [ ] Update `ARCHITECTURE.md` if modules change
