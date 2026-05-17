# Knowledge Gaps — Questions for the Developer

> Open design and intent questions about Axiomancer mechanics. Resolved questions
> are kept (struck through) for traceability. Most active design conversations have
> been migrated to the per-feature specs in [`specs/`](./specs/) — each spec
> includes the questions it depends on so you can answer them in context. This
> file is now the catch-all for cross-cutting questions.

> **Iterate sweep 2026-05-15:** several questions below were silently
> answered by phases 09–24 of the autonomous loop. Where a spec
> shipped, the relevant question is annotated RESOLVED inline. The
> following Qs are now closed even where their spec-cross-reference
> hasn't been re-edited: Q4 (defense asymmetry fixed by Phase 15
> scenario phase), Q5 (friendship rewards by Phase 10), Q6 (simultaneous
> action stayed), Q8 (stat modifiers via `getEffectiveStats` in
> `Combat/effect-modifiers.ts`), Q11 (`processWorldEffectTick`
> shipped), Q17 (mana replaced by Spec 04 combat resources), Q22
> (Map vs MapState split, Spec 08), Q23 + Q24 + Q25 (RN + zustand +
> events all answered by Phase 12 / 21), Q27 (moral choice by
> Phase 10).

---

## Core Combat

1. **Attack vs Defense roll model**: The combat CLI currently uses a single roll contest (attacker roll vs attacker roll) where the higher roll wins, then the winner rolls separate damage. Is this the intended permanent model, or should it eventually be attack roll vs defense roll (like D&D's AC system)? *(Tracked in `specs/02-combat-round-resolver.md`.)*

2. **Damage formula**: When both players attack, damage is `damageRoll - (baseDefense × PASSIVE_DEFENSE_MULTIPLIER)`. The damage roll re-uses the attack stat as a modifier. Is damage meant to always scale off the attack stat, or should there be a separate damage stat or weapon damage die? *(Tracked in `specs/02-combat-round-resolver.md`.)*

3. **CritStyle** (`double` vs `pierce`): The type exists but auto-selection logic ("whichever deals more") is not implemented. Which is the preferred default? Should crit style be per-weapon, per-stance, or global? *(Tracked in `specs/05-equipment-engine.md`.)* **Resolved at Phase 32 (`e456322`).** `selectCritDamage` picks the higher of the two paths (ties → `'double'`) at crit time in `src/Combat/phases/scenario.ts`; `damage-applied` events emit `isCritical` + `critStyle`. The choice is global per crit roll, not per-weapon or per-stance — author intent was "whichever deals more, automatically". Resolver-path integration test in `src/Combat/e2e/combat.resolver.test.ts` ("Crit wiring (Phase 32)"). `docs/combat.md` + `docs/effects/README.md` flag the mechanic as LIVE.

4. **Defend action defense base**: When the player defends and the enemy attacks, the player's defense uses `getBaseStat` (raw base stat), but when both attack the loser's defense also uses base stat. When the enemy defends, it uses `getDefenseStat` (derived defense stat). Is this asymmetry intentional? *(Tracked in `specs/02-combat-round-resolver.md`.)*

5. **Friendship mechanic**: Both defending increments the counter. What determines the rewards/narrative outcome of a friendship victory vs a combat victory? Are there enemies that *should* be befriended rather than defeated? *(Tracked in `specs/07-enemy-content-and-ai.md` and `specs/10-moral-difficulty-meter.md`.)* **Mechanics half resolved at Phase 36.** Friendship victories now report `outcome: 'friendship'` on the `combat:ended` event, grant `floor(enemy.xpReward * 0.5)` XP, roll the full loot table, and shift the moral meter +1 (the reducer side was already wired since Phase 10). The narrative-content question — which enemies *should* be befriendable, and what dialogue / quest beats land on friendship vs kill — remains open and is content-author work.

6. **Initiative / turn order**: The roadmap mentions `determineTurnOrder` and `rollInitiative`. In the current CLI, both players act simultaneously. Is the intent to move to sequential turns, or keep simultaneous action and just use initiative for edge cases (like who goes first on a tie)? *(Tracked in `specs/02-combat-round-resolver.md`.)*

## Effects System

7. ~~**`teir` spelling**: The typo `teir` should be corrected to `tier`.~~ **RESOLVED** — Renamed across types, JSON, and runtime. The field is now numeric (`1 | 2 | 3`) on `Effect` / `ActiveEffect`; display strings render as `Tier 1` / `Tier 2` / `Tier 3`.

8. **Stat modifiers from effects are not applied at runtime**: The effects JSON defines `statModifiers` (e.g., `+2 body`), but the combat math never aggregates these onto the character's stats. *(Tracked in `specs/01-effects-engine-completion.md`.)*

9. **Intensity scaling for stat modifiers**: `rollModifierPerIntensity` scales with intensity, but `statModifiers` in the payload do not. Should stat modifiers also scale with intensity? *(Tracked in `specs/01-effects-engine-completion.md`.)*

10. **Regen with negative healthPerRound**: `debuff_disease` and `debuff_hp_decay` have `regeneration.healthPerRound: -1` / `-2`. The current `applyRegen` function only processes positive values. *(Tracked in `specs/01-effects-engine-completion.md`.)* **Resolved at Spec 08 (pre-loop).** `src/Effects/world-tick.ts:50` applies `regeneration.healthPerRound × intensity` as both positive (HP gain) and negative (HP loss) — the brief is explicit: "1. Apply HP regen (positive `regeneration.healthPerRound`). 2. Apply HP drain (negative `regeneration.healthPerRound`)." The world-tick path is the canonical out-of-combat surface; in-combat regen rides the round-resolver's `applyRegen`.

11. **Effect application outside combat**: The roadmap mentions `processWorldEffectTick` for poison/curses while exploring. How should duration work outside combat — per map node transition, per real time, or per "step"? *(Tracked in `specs/08-world-content-and-hazards.md`.)* **Resolved at Spec 08 (pre-loop).** `processWorldEffectTick` (`src/Effects/world-tick.ts`) decrements `remainingDuration` and applies HP regen/drain + DoT per "step" — the step is a single MapEvent resolution (consumer drives the tick via the public barrel; the engine doesn't bind to real time). `getActiveHazards` exposes hazard effects with negative HP contribution to consumers.

## Character & Progression

12. **Character has no `id` field** but `Enemy` does. `ActiveEffect.sourceId` references the applier. Should Character get an `id`? If the game only has one player character, is `sourceId` even needed for player-applied effects? *(Tracked in `specs/06-character-progression.md`.)* **Fully resolved across Phase 35 + 38.** Phase 35 (`cb47a38`) added `Character.id` (auto-generated by `createCharacter`). Phase 38 (commits `f4abf98` + `0aa841e`) threaded `sourceId` through every `applyEffect` call on the combat / skill path: skill engine sites set `player.id`, proc-system sites set `actor.id` (Character | Enemy), equipment passives unchanged (`item.id`), environmental hazards intentionally leave the field undefined. Verified by `src/Effects/e2e/source-id.engine.test.ts`.

13. **Experience formula**: Currently `experienceToNextLevel = level × EXPERIENCE_PER_LEVEL` (linear). Is this the intended curve, or should it be exponential/polynomial? What should each enemy tier reward in XP? *(Tracked in `specs/06-character-progression.md`.)* **Resolved at Spec 06 (pre-loop) + Spec 07.** The curve is linear `level × EXPERIENCE_PER_LEVEL` (`src/Game/game-mechanics.constants.ts`) — author intent was the simplest curve that still feels progressive. Per-difficulty XP rewards via `DEFAULT_XP_BY_DIFFICULTY` (`src/Enemy/index.ts:37`): simple 10 / normal 20 / elite 50 / boss 200 / unique 500. Per-enemy `xpReward` override on `Enemy` (Spec 07).

14. **Stat allocation on level up**: The roadmap mentions `allocateStatPoint`. How many stat points per level? Is there a cap per individual stat? *(Tracked in `specs/06-character-progression.md`.)* **Resolved at Phase 29 (commits `9f2e3f6` + `121aea8` + `db7c26f`).** 3 points per level (`STAT_POINTS_PER_LEVEL = 3` in `src/Game/game-mechanics.constants.ts`), no cap per individual stat (Spec 06 Q5 — author intent: progression should never feel capped). Allocation is deferred: `applyLevelUps` grants the points to `Character.availableStatPoints`; the player commits them via the CLI Character tab + `ALLOCATE_STAT_POINT` action (`src/Game/actions.types.ts`); `allocateStatPoint` reducer (`src/Character/index.ts`) decrements the pool, bumps the base stat, and re-derives.

## Skills

15. **Skill damage formula**: Skills have a `damageCalculation` string field and a vague `effect` string. What's the intended model? Should skills have `basePower × scalingStat` like a traditional RPG, or something more unique? *(Tracked in `specs/04-skills-engine.md`.)* **Resolved at Spec 04 + 04b (pre-loop).** The shipped model is `basePower × scalingStat`; `damageCalculation`/`effect` strings replaced by `combatEffects: SkillCombatEffectPayload[]` + `calculateSkillDamage` (`src/Skills/skill.engine.ts:134`). Per-skill resource costs land via `ResourceCost`; Tier 2 / 3 procs ride the `resolveEffectApplication` resist pipeline.

16. **Skill slots**: The roadmap mentions `equippedSkills` vs `knownSkills`. How many skill slots? Can skills be swapped mid-combat or only between fights? *(Tracked in `specs/04-skills-engine.md`.)* **Resolved at Spec 04 + 04b (pre-loop).** `Character.equippedSkills: string[]` carries up to 4 slots (`src/Character/types.d.ts:76` "IDs of skills available in combat (max 4)"); `knownSkills` is the strictly larger superset. Swaps happen between fights via the Character tab (no mid-combat swap surface today — author intent: combat is a commitment to the loadout you brought). Runtime learning via `learnSkill` (Phase 30) appends to `knownSkills`; equipping a learned skill is a CLI affordance.

17. **Mana economy**: Mana exists on both Character and Enemy but isn't consumed anywhere. How fast should mana regenerate? Is there a "basic attack doesn't cost mana, skills do" model? *(Tracked in `specs/04-skills-engine.md`.)* **Resolved at Spec 04 (pre-loop).** Mana removed entirely; replaced with the `CombatResources` system (`{ heart, body, mind, fallacy, paradox }`). Basic actions GENERATE resources (miss=1, hit=3, defend=5 per Spec 04 Q on basic-action grants); skills SPEND them via `canUseSkill` + `spendResources` and generate exactly 1 philosophical token per cast. `Character.mana` / `Character.maxMana` / `Skill.manaCost` all removed from the type surface.

## Items & Equipment

18. **Equipment stat modifiers**: Equipment types exist but have no `statModifiers` yet. Should equipment modify base stats, derived stats, or both? Should equipment have stance alignment (heart/body/mind)? *(Tracked in `specs/05-equipment-engine.md`.)* **Resolved at Spec 05 (pre-loop).** `Equipment.statModifiers: StatModifier[]` ships per Spec 05 Q3 option A — modifiers fold into derived stats at equip time via `getEquipmentModifiers` + `recomputeDerivedStats` (`src/Character/equipment.reducer.ts`). Equipment does not carry stance alignment as a top-level field; stance affinity lives in `passiveEffects` / `onHitEffects` payloads instead. Spec 05 acceptance ticked at `5fb8b0a` era.

19. **Consumable effect system**: Consumables have an `effect: string` field. What's the mapping? Should they reference effect IDs from the effects library, or have their own effect definitions? *(Tracked in `specs/05-equipment-engine.md`.)* **Resolved at Spec 05 + 05b (pre-loop).** Consumables carry `effectId?: string` (lookup into the effects library) plus optional `healAmount` and `resourceGrant`; `useConsumableEffect` (`src/Items/equipment.engine.ts:135`) resolves them in-combat. The `consumableLibrary` (12 entries) is the canonical content surface; Phase 37 added shop economy on top.

## World & Content

20. **Map node system**: `MapNode` has `id`, `location`, and `connectedNodes`, but there's no pathfinding or traversal logic. Is movement meant to be linear (node-to-node), or should there be branching paths with player choice? *(Tracked in `specs/08-world-content-and-hazards.md`.)* **Resolved across Phases 23 / 24 / 25 / 31.** Branching is the model: nodes carry `connectedNodes: NodeId[]`; `moveToNode` enforces "must be in availableNodes"; the Phase 23 MapEvents engine fires a weighted-pool roll at unlock time per node; Phase 31 `unlockAdjacent` moves connected nodes from `lockedNodes` to `availableNodes` after a node resolves. The CLI Map tab walks the live `availableNodes` set; pathfinding is one-hop per dispatch (no shortest-path solver because every move is a deliberate player choice).

21. ~~**Starting world inconsistency**: `northern-forest` appears in both `availableMaps` and `lockedMaps`.~~ **RESOLVED** — `createStartingWorld` now puts `northern-forest` only in `lockedMaps`; verified by `world.reducer.test.ts`.

22. **Map vs MapState**: A TODO in the map data mentions "Differentiate between Map and MapState." Is the intent to have a static `Map` definition (template) and a runtime `MapState` (progress)? *(Tracked in `specs/08-world-content-and-hazards.md`.)* **Resolved at Phase 23 / 24 / 25.** Static `MapDefinition` (template — node graph, NPCs, quests; lives in the registry via `getMapDefinition`) vs runtime `MapState` (player progress — `currentNode`, `availableNodes`, `discoveredNodes`, `consumedNodes`, `lockedNodes`). The split was the author's original intent; the TODO is closed. `createMapState(definition)` is the canonical factory. See `docs/world.md` "State Shape" for the live shape; Phase 31 added `unlockAdjacent` to the reducer set.

## Package Architecture

23. **React Native consumption**: The README says this will be consumed by a React Native app. Are there any React Native constraints I should know about (e.g., no `fs`, no Node-specific APIs in the core)? The `node.adapter.ts` uses `fs` — should the core package avoid Node dependencies entirely? *(Tracked in `specs/12-package-architecture-and-events.md`.)* **Resolved at Phase 12 (`251dda9`) + Phase 21 (`a3f1693`).** The core barrel (`src/index.ts`) is RN-safe — zero `fs` / `crypto` / Node-specific imports. The Node fs adapter lives on the `'axiomancer-mechanics/node'` subpath (`src/Game/persistence/node.adapter.ts`); RN consumers import `createGameStore` + `PersistenceAdapter` from the core barrel and supply their own `AsyncStorage`-backed adapter. Phase 35's `Character.id` auto-gen deliberately uses `getRng()` rather than `crypto.randomUUID()` to keep the barrel RN-safe. `docs/api.md` "React Native Usage" documents the pattern.

24. **Zustand in the engine vs the consumer**: Should `Game/store.ts` be part of the engine package, or should the React Native app create its own Zustand store and only import the pure reducer functions? *(Tracked in `specs/12-package-architecture-and-events.md`.)* **Resolved at Phase 12 (`251dda9`) + Phase 09.** The store ships in the engine package as the consumer-facing entry point — `createGameStore(adapter, overrides?, emitter?)` returns a `StoreApi<GameStore>` (Zustand vanilla). RN consumers subscribe via `useStore` from `zustand`. The pure `gameReducer` remains exported for non-Zustand consumers / testing. Author intent: every state mutation flows through `gameReducer`, the store is a thin Zustand wrapper that adds autosave + event emission. See `plan/bearings.md` "Zustand vs reducers" standing decision.

25. **Event system for UI integration**: The combat loop currently uses `console.log`. When the React Native app consumes this, how should combat events be surfaced? An event emitter? A callback system? A stream of typed events? *(Tracked in `specs/12-package-architecture-and-events.md`.)* **Resolved at Phase 12 (`251dda9`) + Phase 21 (`a3f1693`).** Typed event emitter — `createEventEmitter()` returns a `GameEventEmitter`; consumers register handlers via `emitter.on(type, handler)`. 10 event types (`combat:started` / `combat:round` / `combat:ended` / `world:moved` / `world:processed` / `character:levelup` / `inventory:changed` / `dialogue:applied` / `game:saved` / `game:loaded`) all carry the typed `EnginePayload` envelope (`{ action, state, report?, unlockedSkills?, combatEvents? }`). Phase 21 added the 10 `TypedGameEvent<T>` aliases + 10 `is*Event` guards. No `console.log` from the engine — the CLI surfaces events through its own renderer.

## Game Design Philosophy

26. **How punishing should combat be?** The Mörk Borg inspiration suggests lethal, swingy combat. But the friendship mechanic and regen effects suggest a more forgiving tone. Where on the spectrum should this land? *(Tracked in `specs/02-combat-round-resolver.md`.)*

27. **Moral choice system**: BRAINDUMP.md describes a difficulty meter driven by moral choices. How should this integrate with the combat engine? Should enemy stats scale with the difficulty meter? Should certain effects or skills only be available at certain moral alignments? *(Tracked in `specs/10-moral-difficulty-meter.md`.)*

28. **Multiple endings**: The roadmap mentions gated endings based on moral choices. Does the engine need to track moral state, or is that a UI/narrative layer concern? *(Tracked in `specs/10-moral-difficulty-meter.md`.)*
