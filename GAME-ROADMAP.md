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
- [x] `EffectPayload.rollModifierPerIntensity` — per-intensity roll modifier scaling (complements flat `rollModifier` which never scales)
- [x] `tickAllEffects(target)` — decrements all non-permanent durations; expired effects returned separately; permanent (−1) never ticks (`Combat/index.ts`)
- [x] `updateEffectDuration(target, effectId)` — tick a single effect by ID
- [x] `applyRegen(target)` — sums `payload.regeneration.healthPerRound × intensity` across all active effects; called at round start
- [x] Tier 1 effect map (`TIER1_EFFECT_MAP`) and `applyTier1CombatEffect` / `applyTier1CombatEffectWithResult`
- [x] `clearTier1EffectsForType` — removes stale Tier 1 self-buffs on action-type switch; debuffs applied by the opponent are exempt and expire naturally
- [x] `getTargetsResistStatValue` — looks up target's resist stat for Tier 2/3 rolls
- [ ] `removeEffect(activeEffects, effectId)` — filter by ID (cleanses, dispels, changing stance)
- [ ] `getActiveEffectModifiers(activeEffects)` — aggregate stat mods, roll mods, defense mods, advantage grants into one object
- [ ] `canAct(activeEffects)` — read `skipTurn`, `blockedStances`, `forcedStance`; return combined restrictions
- [ ] `processDamageOverTime(activeEffects)` — sum DoT, return total damage + messages
- [ ] `processRoundStartEffects(state)` — orchestrate: DoT → regen → tick → expire; return updated `CombatState` (regen and ticking are wired individually in the CLI; this unifies them into one reducer call)
- [ ] `processWorldEffectTick(player): { player: Character; events: string[] }` — DoT / regen / expiry outside combat; called on each map node transition (enables poison, curses, persistent regen while exploring)
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
- [x] `generateEnemyAttackType(state, enemy): Stance`
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
- [x] `getActiveRollModifier(target): number` — sums flat `rollModifier` and `rollModifierPerIntensity × intensity` across all active effects
- [x] `isAttackSuccessful(attackRoll, defenseRoll): boolean` — compares attack vs defence rolls
- [ ] `performAttackRoll(attacker, attackType, advantage)` — stub
- [ ] `performDefenseRoll(defender, attackType, isDefending)` — stub
- [ ] `calculateBaseDamage(attacker, attackType, advantage)` — stub
- [ ] `calculateDamageReduction(defender, attackType, isDefending)` — stub
- [ ] `calculateAttackDamage(attacker, defender, attackType, advantage, isDefending)` — stub (full roll sequence)

### 2b — Status Effects in Combat Actions

- [ ] Define `CombatEffectTrigger` type
- [ ] `combat-effects.library.ts` — map `Stance × action` pairs to Tier 2/3 trigger chances:
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
- [x] `updateCombatPhase(state, phase): CombatState`
- [x] `setPlayerStance(state, stance): CombatState` (was `setPlayerAttackType`)
- [x] `setPlayerAction(state, action): CombatState`
- [ ] `resolveCombatRound(state): CombatState` — full round via the reducer (attack/defense rolls, effect procs, DoT/regen tick, log entry)
- [ ] `addBattleLogEntry(state, entry): CombatState` — stub
- [ ] `incrementFriendship(state): CombatState` — stub
- [ ] `endCombatPlayerVictory(state): CombatState` — stub
- [ ] `endCombatPlayerDefeat(state): CombatState` — stub
- [ ] `endCombatWithFriendship(state): CombatState` — stub
- [ ] `processPlayerTurn(state)` — stub (lives in `Combat/index.ts`)
- [ ] `processEnemyTurn(state)` — stub (lives in `Combat/index.ts`)
- [ ] `determineTurnOrder(player, enemy)` — stub (lives in `Combat/index.ts`)
- [ ] `rollInitiative(character)` — stub (lives in `Combat/index.ts`)
- [ ] `createBattleLogEntry(state, roundResults)` — stub (lives in `Combat/index.ts`)
- [ ] `formatAllBattleLogs(state)` — stub (lives in `Combat/index.ts`)
- [ ] `generateCombatResultMessage(state)` — stub (lives in `Combat/index.ts`)
- [ ] Unit tests for `resolveCombatRound`

### 2d — Combat CLI (`combat.cli.ts`)

- [x] Regen applied at round start (`applyRegen`)
- [x] Stale Tier 1 buffs cleared on type switch (`clearTier1EffectsForType`)
- [x] Tier 1 stance effects applied for both player and enemy (`applyTier1CombatEffectWithResult`)
- [x] Effects ticked at round end (`tickAllEffects`); expired effects displayed
- [x] Thorns reflect after any hit (`getThornsReflect`)
- [x] Heart/Attack specials on hit: strip enemy buff, extend player buff (`removeRandomBuff`, `extendRandomBuffDuration`)
- [x] Mind/Attack study mark bonus applied to damage roll (`getStudyMarkIntensity`)
- [x] Signed-term formatting for roll lines — `+ N stat` / `− N stat` / `+ N roll` with colour-coding (red for negative roll modifiers, green for positive)
- [x] Damage roll logged separately from attack roll, with its own header and delay
- [x] Damage bonus (`+N mark`) shown inline in the damage formula
- [ ] Replace inline scenario logic with `resolveCombatRound` reducer (Phase 2c)
- [ ] Show active buffs/debuffs each round
- [ ] Add Tier 2/3 effect proc messages
- [ ] Add skill selection (Phase 3)
- [ ] Add item usage (Phase 4)

---

## Phase 3 — Skills System

### 3a — Skill Type Refinement

- [x] Base `Skill` type with `philosophicalAspect`, `category`, `manaCost`
- [x] `combatEffects: CombatEffectTrigger[]`
- [x] `targetType: 'self' | 'enemy' | 'all_enemies' | 'all_allies'`
- [x] `basePower` — base damage/healing before stat scaling
- [x] `scalingStat` — which derived stat multiplies base power
- [x] `advantageInteraction`
- [x] `teir` field

### 3b — Skill Library

- [x] At least 18 skills (3 per stat × 2 categories: fallacies and paradoxes)
- [x] Each skill references effects from the library or introduces skill-specific effects
- [x] Flavor text matches the theme
- [x] Spread from Teir 1 to Teir 3

### 3c — Skill Engine

- [x] `createSkill(data): Skill`
- [x] `canUseSkill(character, skill)`
- [x] `calculateSkillDamage(character, skill, advantage)`
- [x] `executeSkill(state, skillId, actor): { state, ... }`
- [x] `learnSkill(character, skillId): Character & { knownSkills }`
- [x] Unit tests

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
- [x] `changeMap(state, mapName): WorldState`
- [x] `completeMap(state, mapName): WorldState`
- [x] `unlockMap(state, mapName): WorldState`
- [x] `completeNode(state, nodeId): WorldState`
- [x] `unlockNode(state, nodeId): WorldState`
- [x] `moveToNode(state, nodeId): WorldState`
- [x] `changeContinent(state, continentName): WorldState`
- [x] `completeUniqueEvent(state, eventId): WorldState`
- [ ] Unit tests

### 7b–7f — Content & Systems

- [ ] Map content, quest system, NPC/dialogue, shop, rest & recovery (see roadmap sections)
- [ ] Persistent hazard effects tick on map node transitions — call `processWorldEffectTick` each step so poison, curses, and persistent regen apply while exploring
- [ ] Active hazard effects shown on the exploration HUD — effectId, remaining duration, DoT amount per step

---

## Phase 8 — Game Loop

### 8a — State Orchestration

- [x] `createNewGameState(): GameState`
- [x] `store.save()` — persist via `PersistenceAdapter`
- [x] `adapter.load()` — load from adapter
- [x] `store.startCombat(enemy)` — snapshot player into `CombatState`
- [x] `store.applyCombatTurn(updatedCombat)` — applies one resolved combat turn back into the store
- [x] `store.endCombat()` — merge combat player back, clear `combatState`
- [x] `actions.constants.ts` — `COMBAT_ACTION` constants (attack, defend, skill, item, flee, back)
- [ ] `gameReducer(state, action): GameState`
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

### 10c — Automated Combat Tester

- [x] Python CLI runner — spawns `npm run combat` n times with fixed or random player inputs, streams full output to `testing-logs/`
- [ ] RNG seed parameter — pass a seed so any specific run can be replayed deterministically
- [ ] Full active-effect state dump each round — effectId, intensity, remainingDuration, sourceId
- [ ] Scripted action sequences — pre-defined input files for regression-testing specific interactions (e.g. Mind × 3 → verify Exposed Reasoning stacks to 3)
- [ ] Assertion layer — flag runs where damage math, effect scaling, or HP deviates from expected spec

### 10d — Documentation

- [x] `docs/effects.md`
- [x] `docs/combat.md`
- [x] `docs/character.md`
- [ ] Complete `docs/combat.md` — full advantage matrix with effect proc matrix (Phase 2b)
- [ ] `docs/skills.md` — file exists, content pending
- [ ] `docs/equipment.md` — file exists, content pending
- [ ] `docs/enemy.md` — file exists, content pending
- [ ] `docs/npcs.md` — file exists, content pending
- [ ] `docs/world.md`
- [ ] Update `ARCHITECTURE.md` if modules change
