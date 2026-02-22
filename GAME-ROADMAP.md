# Axiomancer — Game Roadmap

> A status-effect-heavy TTRPG engine with Heart/Body/Mind combat,
> themed around logical fallacies and philosophical paradoxes.

Each phase builds on the one before it.
Items marked `[x]` are done; `[ ]` still need work.

---

## Phase 1 — Effects Engine

The effects library (buffs & debuffs) is populated, but there is no runtime
logic to apply, tick, remove, or stack them. Every later system depends on this.

- [x] Define `Effect`, `ActiveEffect`, `EffectPayload`, and `EffectApplicationResult` types
- [x] Create buff library (`buffs.library.json`) with ratings
- [x] Create debuff library (`debuffs.library.json`) with ratings
- [ ] Create `effects.library.ts` — load and index both JSON libraries by `id`
- [ ] Implement `applyEffect(target, effect): EffectApplicationResult` — handle first-time application, respecting stacking rules (`none` / `intensity` / `duration`)
- [ ] Implement `removeEffect(target, effectId): void` — cleanly undo all stat/modifier changes
- [ ] Implement `tickEffects(target): EffectTickResult[]` — decrement durations, apply DoT / regen per round, expire zero-duration effects
- [ ] Implement `getActiveEffectModifiers(target): AggregatedModifiers` — sum all active stat modifiers, roll modifiers, defense modifiers, advantage/disadvantage grants for the current state
- [ ] Implement `canAct(target): { canAct: boolean; reason?: string }` — check `skipTurn`, `forcedActionType`, `blockedActionTypes` from active control effects
- [ ] Implement `resolveStacking(existing, incoming): ActiveEffect` — merge intensity stacks or reset duration based on `stacking` field
- [ ] Write unit tests for every function above (edge cases: expired effects, max stacks, instant effects with duration 0, multiplier vs flat modifiers)

---

## Phase 2 — Core Combat System

The CLI demo (`combat.cli.ts`) has inline combat logic that works. The exported
functions in `Combat/index.ts` and `combat.reducer.ts` are mostly stubs. This
phase extracts, implements, and enriches them — with effects woven into every
combat interaction.

### 2a — Combat Math (pure functions in `Combat/index.ts`)

- [x] `determineAdvantage(playerType, enemyType): Advantage`
- [x] `isCombatOngoing(state): boolean`
- [x] `determineCombatEnd(state): 'player_victory' | 'player_defeat' | 'friendship' | null`
- [x] `determineEnemyAction(enemy): CombatAction`
- [ ] `getAdvantageModifier(advantage): number` — return flat roll modifier (+2 / 0 / −2 or whatever the balance calls for)
- [ ] `hasAdvantage(combatant, actionType): Advantage` — factor in active advantage/disadvantage effects (e.g., `grantAdvantage`, `grantDisadvantage` from buffs/debuffs)
- [ ] `calculateAttackRoll(attacker, attackType, advantage): { total: number; breakdown: string }` — base stat + derived skill + roll modifier from effects + advantage modifier + dice roll
- [ ] `calculateDefenseRoll(defender, defenseType, advantage): { total: number; breakdown: string }` — base stat + derived defense + defense modifier from effects + advantage modifier + dice roll
- [ ] `calculateDamage(attacker, defender, attackType, attackRoll, defenseRoll, advantage): { damage: number; breakdown: string }` — raw damage, type advantage multiplier, crit handling, damage reduction from effects
- [ ] `applyDamage(target, damage): { newHP: number; overkill: number }` — subtract from current HP, clamp to 0
- [ ] `applyCombatHealing(target, amount): { newHP: number }` — add HP, clamp to max
- [ ] `isCriticalHit(roll): boolean` — check for natural 20 (or equivalent threshold)
- [ ] `isFumble(roll): boolean` — check for natural 1 (or equivalent)

### 2b — Status Effects in Combat Actions

Each combination of `ActionType` (heart / body / mind) and `Action` (attack /
defend) should have a chance to apply or trigger status effects.

- [ ] Define `CombatEffectTrigger` type — describes what effect can proc, its chance, and conditions
- [ ] Create `combat-effects.library.ts` — map each (ActionType × Action) pair to possible effect triggers:
  - **Heart + Attack**: chance to apply an emotional debuff (e.g., fear, charm)
  - **Heart + Defend**: chance to gain an emotional buff (e.g., regen, resilience)
  - **Body + Attack**: chance to apply a physical debuff (e.g., bleed, wound, knockdown)
  - **Body + Defend**: chance to gain a physical buff (e.g., damage reduction, counter)
  - **Mind + Attack**: chance to apply a mental debuff (e.g., daze, silence, confusion)
  - **Mind + Defend**: chance to gain a mental buff (e.g., evasion, accuracy boost)
- [ ] Implement `rollForCombatEffects(attacker, action, advantage): Effect[]` — roll against each trigger's proc chance, modified by advantage and attacker stats
- [ ] Implement `applyCombatEffects(combat, effects): CombatState` — apply rolled effects to the correct target and log them
- [ ] Add crit/fumble effect interactions — crits guarantee the strongest available proc; fumbles can backfire and apply a debuff to self
- [ ] Document the full matrix in `docs/combat.md` (replace the TBD sections)

### 2c — Combat Reducer (state transitions in `combat.reducer.ts`)

- [x] `initializeCombat(player, enemy): CombatState`
- [ ] `resetCombat(): CombatState`
- [ ] `updateCombatPhase(state, phase): CombatState`
- [ ] `setPlayerAttackType(state, type): CombatState`
- [ ] `setPlayerAction(state, action): CombatState`
- [ ] `resolveCombatRound(state): CombatState` — orchestrate a full round:
  1. Check `canAct` for both sides (skip / forced action from effects)
  2. Determine advantage
  3. Calculate attack/defense rolls
  4. Calculate and apply damage
  5. Roll for combat effect procs and apply them
  6. Tick all active effects (DoT, regen, duration decrement)
  7. Check for combat end conditions
  8. Build and append `BattleLogEntry`
- [ ] `addBattleLogEntry(state, entry): CombatState`
- [ ] `incrementFriendship(state): CombatState`
- [ ] `endCombatPlayerVictory(state): CombatState`
- [ ] `endCombatPlayerDefeat(state): CombatState`
- [ ] `endCombatWithFriendship(state): CombatState`
- [ ] Add `activeEffects: ActiveEffect[]` to both player and enemy within `CombatState`
- [ ] Write unit tests for `resolveCombatRound` covering: advantage scenarios, effect procs, DoT ticks, crit/fumble, friendship path, death

### 2d — Combat CLI Refactor

- [ ] Replace inline combat logic in `combat.cli.ts` with calls to the implemented reducer and pure functions
- [ ] Add effect display to CLI — show active buffs/debuffs each round
- [ ] Add combat effect proc messages to CLI output
- [ ] Add skill selection flow to CLI (once Phase 3 is done)
- [ ] Add item usage flow to CLI (once Phase 4 is done)

---

## Phase 3 — Skills System

Skills are themed around logical fallacies and philosophical paradoxes. Each
skill scales with one of the three stats and can trigger status effects.

### 3a — Skill Type Refinement

- [x] Define base `Skill` type with `philosophicalAspect`, `category`, `manaCost`
- [ ] Add `combatEffects` field to `Skill` — array of `CombatEffectTrigger` that the skill can proc
- [ ] Add `targetType` field — `'self' | 'enemy' | 'all_enemies' | 'all_allies'`
- [ ] Add `basePower` field — base damage/healing value before stat scaling
- [ ] Add `scalingStat` field — which derived stat multiplies the base power
- [ ] Add `advantageInteraction` to `SkillCombatEffects` — how the skill behaves under advantage / neutral / disadvantage (stronger effect, extra proc chance, reduced mana cost, etc.)
- [ ] Add `rating` field for balancing (same 1–10 scale as effects)

### 3b — Skill Library

- [ ] Create skill library JSON/TS with at least 18 skills (3 per stat × 2 categories):
  - **Body Fallacies** (3): physical-themed attack skills using logical fallacy names
  - **Body Paradoxes** (3): physical-themed utility/buff skills using paradox names
  - **Mind Fallacies** (3): mental-themed attack skills using logical fallacy names
  - **Mind Paradoxes** (3): mental-themed utility/buff skills using paradox names
  - **Heart Fallacies** (3): emotional-themed attack skills using logical fallacy names
  - **Heart Paradoxes** (3): emotional-themed utility/buff skills using paradox names
- [ ] Each skill should reference specific effects from the buff/debuff libraries or introduce skill-specific effects
- [ ] Include skill-specific flavor text matching the paradox/fallacy theme
- [ ] Balance skills using the rating system — ensure a spread from rating 2 to 8

### 3c — Skill Engine

- [ ] Implement `createSkill(data): Skill` — validate and construct a Skill
- [ ] Implement `canUseSkill(character, skill): { usable: boolean; reason?: string }` — check mana, action restrictions from effects, learning requirements
- [ ] Implement `calculateSkillDamage(character, skill, advantage): { damage: number; breakdown: string }` — base power × stat scaling × advantage modifier
- [ ] Implement `executeSkill(state, skillId): CombatState` — deduct mana, calculate damage, roll for effect procs, apply everything
- [ ] Implement `learnSkill(character, skillId): Character` — add skill to character's known skills if requirements met
- [ ] Write unit tests for skill execution under all advantage states

---

## Phase 4 — Equipment & Items

Equipment should carry passive status effects and modify combat capabilities.
Consumables should apply effects from the effects library.

### 4a — Equipment Type Refinement

- [x] Define base `Equipment`, `Consumable`, `Material`, `QuestItem` types
- [ ] Add `statModifiers: StatModifier[]` to `Equipment` — reuse the same modifier type from Effects
- [ ] Add `passiveEffects: string[]` to `Equipment` — effect IDs that are always active while equipped
- [ ] Add `onHitEffects: CombatEffectTrigger[]` to `Equipment` — effect procs when attacking with this weapon
- [ ] Add `onDefendEffects: CombatEffectTrigger[]` to `Equipment` — effect procs when defending with this equipment
- [ ] Add `rating` field to `Equipment` for tier/rarity balancing
- [ ] Add `effectId: string` to `Consumable` — link to an effect from the library
- [ ] Add `duration` and `power` overrides to `Consumable` — allow potions to vary in strength

### 4b — Equipment Library

- [ ] Create `equipment.library.json` with at least 18 items:
  - **Weapons** (6): 2 per stat alignment (heart/body/mind), each with unique on-hit effect procs
  - **Armor** (6): 2 per stat alignment, each with unique on-defend effect procs and passive stat bonuses
  - **Accessories** (6): 2 per stat alignment, each with passive effects (regen, resistance, advantage grants)
- [ ] Name equipment using the paradox/fallacy theme
- [ ] Balance equipment using rating tiers (1–10)

### 4c — Consumable Library

- [x] Create initial `consumable.library.json` (Healing Potion exists)
- [ ] Expand with at least 12 consumables:
  - **Healing** (3): varying potency (minor/standard/greater)
  - **Mana** (3): varying potency
  - **Buff potions** (3): apply a temporary buff from the buffs library
  - **Offensive** (3): throwable items that apply debuffs (poison, burn, etc.)
- [ ] Link each consumable to an effect ID from the effects library

### 4d — Equipment & Item Engine

- [x] `addItemToInventory(character, item): Character`
- [x] `removeItemFromInventory(character, itemId): Character`
- [x] `stackItem(character, item): Character`
- [ ] Implement `equipItem(character, item): Character` — move from inventory to equipment slot, apply passive effects
- [ ] Implement `unequipItem(character, slot): Character` — move from equipment slot to inventory, remove passive effects
- [ ] Implement `useConsumable(character, itemId): { character: Character; effectResult: EffectApplicationResult }` — apply the linked effect
- [ ] Implement `getEquipmentModifiers(character): AggregatedModifiers` — sum all passive stat modifiers from equipped items
- [ ] Write unit tests for equip/unequip/use flows

---

## Phase 5 — Character Progression

Implements everything that happens between combats: levelling up, distributing
stat points, learning new skills, and managing a skill loadout. Depends on the
skill library from Phase 3 being in place first.

### 5a — Level Up System

- [ ] Implement `calculateExperienceToNextLevel(level): number` — define the XP curve
- [ ] Implement `grantExperience(character, amount): Character` — add XP, check for level up
- [ ] Implement `levelUp(character): Character` — increment level, recalculate derived stats, increase max HP/MP
- [ ] Add `statPoints` field to `Character` — points earned per level to allocate
- [ ] Implement `allocateStatPoint(character, stat): Character` — spend a point to increase a base stat

### 5b — Skill Learning & Progression

- [ ] Implement `getAvailableSkills(character): Skill[]` — filter skill library by learning requirements
- [ ] Implement `learnSkill(character, skillId): Character` — add to known skills
- [ ] Add `knownSkills: string[]` and `equippedSkills: string[]` to `Character` type (limit equipped skills to a loadout size)
- [ ] Implement `equipSkill(character, skillId): Character`
- [ ] Implement `unequipSkill(character, skillId): Character`

### 5c — Character CLI Updates

- [ ] Add level-up flow to `character.cli.ts`
- [ ] Add stat allocation UI
- [ ] Add skill learning and equipping UI
- [ ] Add equipment management UI

---

## Phase 6 — Enemy System

Fills the enemy library across three tiers, builds smarter AI strategies
(aggressive / defensive / strategic / boss phase-based), and adds the
encounter generation system that ties enemies to map nodes.

### 6a — Enemy Library

- [ ] Create `enemy.library.json` with at least 15 enemies:
  - **Tier 1** (5): weak enemies, rating 1–3 effects, simple attack patterns
  - **Tier 2** (5): moderate enemies, rating 3–5 effects, some debuff usage
  - **Tier 3** (5): strong enemies, rating 5–8 effects, strategic ability usage
- [ ] Each enemy should have a stat alignment (heart/body/mind primary) and thematic name
- [ ] Define enemy skills — a subset of skills from the skill library or unique enemy-only skills
- [ ] Define enemy loot tables — items/equipment that can drop on defeat

### 6b — Enemy AI

- [x] `randomLogic(enemy): CombatAction` — pure random selection
- [ ] Implement `aggressiveLogic(enemy, combatState): CombatAction` — always attack, favor type advantage
- [ ] Implement `defensiveLogic(enemy, combatState): CombatAction` — defend when low HP, attack otherwise
- [ ] Implement `strategicLogic(enemy, combatState): CombatAction` — use skills, apply debuffs, target weaknesses based on player's active effects
- [ ] Implement `bossLogic(enemy, combatState): CombatAction` — phase-based AI with scripted effect usage at HP thresholds
- [ ] Assign AI logic type to each enemy in the library

### 6c — Encounter Design

- [ ] Define `Encounter` type — enemy composition, formation, special rules
- [ ] Create encounter library organized by world map area and difficulty tier
- [ ] Implement `generateEncounter(mapNode, playerLevel): Encounter` — select appropriate enemies for the area and player level

---

## Phase 7 — World & Exploration

Implements all the stubbed world reducers and builds out the full exploration
layer: interconnected maps, node traversal, a quest system, NPC dialogue trees,
shops, and rest points. This is the structural skeleton the base game content
(Phase 9) will be poured into.

### 7a — World Reducer

- [x] `createStartingWorld(): WorldState`
- [ ] Implement `changeMap(state, mapId): WorldState`
- [ ] Implement `completeMap(state, mapId): WorldState`
- [ ] Implement `unlockMap(state, mapId): WorldState`
- [ ] Implement `completeNode(state, nodeId): WorldState`
- [ ] Implement `unlockNode(state, nodeId): WorldState`
- [ ] Implement `moveToNode(state, nodeId): WorldState`
- [ ] Implement `changeContinent(state, continentId): WorldState`
- [ ] Implement `completeUniqueEvent(state, eventId): WorldState`
- [ ] Write unit tests for all world state transitions

### 7b — Map & Continent Content

- [ ] Design at least 3 maps for the first continent with interconnected nodes
- [ ] Define node types: `combat`, `event`, `shop`, `rest`, `boss`, `story`
- [ ] Populate each map node with appropriate encounters, events, or NPC interactions
- [ ] Define map unlock conditions (beat boss, complete quest, find key item)

### 7c — Quest System

- [ ] Implement `startQuest(state, questId): WorldState`
- [ ] Implement `updateQuestProgress(state, questId, objectiveId): WorldState`
- [ ] Implement `completeQuest(state, questId): { world: WorldState; rewards: Reward[] }`
- [ ] Create quest library with at least 5 quests for the first continent
- [ ] Each quest should involve combat encounters with thematic effect usage

### 7d — NPC & Dialogue System

- [ ] Implement `getNPCDialogue(npc, context): DialogueNode` — select dialogue based on quest state, world state
- [ ] Create NPC library with at least 5 NPCs for the first continent
- [ ] Define `DialogueNode` type with choices that can trigger quests, give items, or reveal lore
- [ ] Implement dialogue CLI flow

### 7e — Shop System

- [ ] Define `Shop` type — inventory of purchasable items/equipment
- [ ] Implement `buyItem(character, shop, itemId): { character: Character; shop: Shop }`
- [ ] Implement `sellItem(character, shop, itemId): { character: Character; shop: Shop }`
- [ ] Create shop inventories per map area

### 7f — Rest & Recovery

- [ ] Define rest mechanics — heal HP/MP, cure certain debuffs, save game
- [ ] Implement `rest(character): Character` — apply rest effects, clear short-duration debuffs
- [ ] Add rest nodes to maps

---

## Phase 8 — Game Loop

Wires all previous phases together into a single playable loop. The central
`gameReducer` dispatches every game action; a main `game.cli.ts` entry point
connects exploration, combat, dialogue, and inventory into one coherent flow.
Also implements the moral-choice difficulty meter described in `BRAINDUMP.md`.

### 8a — Game State Orchestration

- [x] `createNewGameState(): GameState`
- [x] `loadGameState(path): GameState`
- [x] `saveGameState(state, path): void`
- [x] `startCombat(state, enemy): GameState`
- [x] `endCombat(state): GameState`
- [ ] Implement `gameReducer(state, action): GameState` — central dispatcher for all game actions
- [ ] Define all game action types in `actions.constants.ts` — combat, world, inventory, quest, dialogue, rest, save/load
- [ ] Implement `processNode(state, node): GameState` — execute the logic for the current map node (trigger combat, event, shop, etc.)

### 8b — Main Game CLI

- [ ] Create `game.cli.ts` — main entry point that ties all CLIs together
- [ ] Implement main menu: New Game / Continue / Quit
- [ ] Implement exploration flow: show current map, available nodes, move between nodes
- [ ] Integrate combat CLI as a sub-flow triggered by combat nodes
- [ ] Integrate dialogue CLI as a sub-flow triggered by NPC nodes
- [ ] Integrate shop CLI as a sub-flow triggered by shop nodes
- [ ] Add inventory management screen (equip, use items, view stats)
- [ ] Add character status screen (stats, active effects, skills)
- [ ] Implement save/load through the CLI

### 8c — Difficulty System

- [ ] Implement the moral-choice difficulty meter from BRAINDUMP.md
- [ ] Track moral/immoral choices through dialogue and quest decisions
- [ ] Scale enemy stats and effect ratings based on difficulty meter
- [ ] Implement consequences — certain endings locked/unlocked based on meter

---

## Phase 9 — Base Game Content

With the engine complete, this phase fills the world with actual story content:
a finalized pantheon and story outline, two fully populated continents, boss
encounters with phase-based mechanics, and multiple endings gated by the
moral-choice difficulty meter. The story itself is described in
`docs/references/story.md` — flesh that out first before populating nodes.

### 9a — World Building

- [ ] Finalize the pantheon (`docs/references/pantheon.md`)
- [ ] Write the full story outline (`docs/references/story.md`)
- [ ] Design the world map — continents, regions, connections
- [ ] Create lore documents for key locations

### 9b — First Continent — Complete Content

- [ ] Populate all maps with encounters, events, NPCs, shops
- [ ] Write all quest chains for the first continent (minimum 5 main quests, 5 side quests)
- [ ] Create all required enemies with balanced stats and themed effects
- [ ] Create boss encounters with unique mechanics and phase-based AI
- [ ] Write all NPC dialogue trees

### 9c — Second Continent — Complete Content

- [ ] Repeat 9b for the second continent with higher-tier content
- [ ] Introduce new enemy types with more complex effect combinations
- [ ] Add new equipment tiers available only in this region

### 9d — Endgame Content

- [ ] Design the final boss encounter with multi-phase mechanics
- [ ] Implement multiple endings based on the moral-choice difficulty meter
- [ ] Create endgame equipment and skills as rewards
- [ ] Write ending narratives for each path

---

## Phase 10 — Testing & Polish

The final phase before release. Sets up a proper test suite covering every
system, runs a full balance pass on effects / skills / enemies / XP curve, and
completes all documentation. Nothing in this phase adds new features — it only
hardens, balances, and documents what already exists.

### 10a — Test Suite

- [ ] Set up test runner (vitest or jest) in `package.json`
- [ ] Write unit tests for all Utils functions
- [ ] Write unit tests for Effects engine (Phase 1)
- [ ] Write unit tests for Combat math functions (Phase 2a)
- [ ] Write unit tests for Combat reducer (Phase 2c)
- [ ] Write unit tests for Skill engine (Phase 3c)
- [ ] Write unit tests for Equipment engine (Phase 4d)
- [ ] Write unit tests for World reducer (Phase 7a)
- [ ] Write integration tests for full combat encounters (round resolution with effects, skills, items)
- [ ] Write integration tests for game loop (node traversal, combat trigger, quest progression)

### 10b — Balance Pass

- [ ] Audit all effect ratings for consistency
- [ ] Playtest combat encounters across all tiers and tune numbers
- [ ] Verify XP curve feels rewarding
- [ ] Ensure no skill/equipment combination is game-breakingly dominant
- [ ] Tune enemy AI to provide appropriate challenge per tier

### 10c — Documentation

- [x] `docs/effects.md` — rating scale and field reference
- [ ] Complete `docs/combat.md` — full advantage matrix with effect interactions
- [ ] Write `docs/character.md` — stat derivation formulas, progression curve
- [ ] Write `docs/skills.md` — skill system overview, full skill reference
- [ ] Write `docs/items.md` — equipment system, consumable reference, crafting (if applicable)
- [ ] Write `docs/world.md` — map structure, quest design guidelines
- [ ] Update `ARCHITECTURE.md` with any new modules or changed relationships
