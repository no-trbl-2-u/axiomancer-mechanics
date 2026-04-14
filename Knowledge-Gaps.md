# Knowledge Gaps — Questions for the Developer

These are questions I have about the mechanics, design intent, and roadmap that would help me assist more effectively. Organized by system.

---

## Core Combat

1. **Attack vs Defense roll model**: The combat CLI currently uses a single roll contest (attacker roll vs attacker roll) where the higher roll wins, then the winner rolls separate damage. Is this the intended permanent model, or should it eventually be attack roll vs defense roll (like D&D's AC system)?

2. **Damage formula**: When both players attack, damage is `damageRoll - (baseDefense × PASSIVE_DEFENSE_MULTIPLIER)`. The damage roll re-uses the attack stat as a modifier. Is damage meant to always scale off the attack stat, or should there be a separate damage stat or weapon damage die?

3. **CritStyle** (`double` vs `pierce`): The type exists but auto-selection logic ("whichever deals more") is not implemented. Which is the preferred default? Should crit style be per-weapon, per-stance, or global?

4. **Defend action defense base**: When the player defends and the enemy attacks, the player's defense uses `getBaseStatForType` (raw base stat), but when both attack the loser's defense also uses base stat. When the enemy defends, it uses `getDefenseStatForType` (derived defense stat). Is this asymmetry intentional?

5. **Friendship mechanic**: Both defending increments the counter. What determines the rewards/narrative outcome of a friendship victory vs a combat victory? Are there enemies that *should* be befriended rather than defeated?

6. **Initiative / turn order**: The roadmap mentions `determineTurnOrder` and `rollInitiative`. In the current CLI, both players act simultaneously. Is the intent to move to sequential turns, or keep simultaneous action and just use initiative for edge cases (like who goes first on a tie)?

## Effects System

7. **`teir` spelling**: The typo `teir` (should be `tier`) is used everywhere — types, JSON data files, runtime checks. Was this intentional branding, or should it be corrected to `tier`?

8. **Stat modifiers from effects are not applied at runtime**: The effects JSON defines `statModifiers` (e.g., `+2 body`), but the combat math never aggregates these onto the character's stats. Are these meant to be applied as temporary stat buffs during combat, or are they documentation-only pending a future `getActiveEffectModifiers` function?

9. **Intensity scaling for stat modifiers**: `rollModifierPerIntensity` scales with intensity, but `statModifiers` in the payload do not. Should stat modifiers also scale with intensity (e.g., `+2 body × intensity 3 = +6 body`)?

10. **Regen with negative healthPerRound**: `debuff_disease` and `debuff_hp_decay` have `regeneration.healthPerRound: -1` / `-2`. The current `applyRegen` function only processes positive values. Should negative regen act as healing reduction, or as additional damage?

11. **Effect application outside combat**: The roadmap mentions `processWorldEffectTick` for poison/curses while exploring. How should duration work outside combat — per map node transition, per real time, or per "step"?

## Character & Progression

12. **Character has no `id` field** but `Enemy` does. `ActiveEffect.sourceId` references the applier. Should Character get an `id`? If the game only has one player character, is `sourceId` even needed for player-applied effects?

13. **Experience formula**: Currently `experienceToNextLevel = level × EXPERIENCE_PER_LEVEL` (linear). Is this the intended curve, or should it be exponential/polynomial? What should each enemy tier reward in XP?

14. **Stat allocation on level up**: The roadmap mentions `allocateStatPoint`. How many stat points per level? Is there a cap per individual stat?

## Skills

15. **Skill damage formula**: Skills have a `damageCalculation` string field and a vague `effect` string. What's the intended model? Should skills have `basePower × scalingStat` like a traditional RPG, or something more unique?

16. **Skill slots**: The roadmap mentions `equippedSkills` vs `knownSkills`. How many skill slots? Can skills be swapped mid-combat or only between fights?

17. **Mana economy**: Mana exists on both Character and Enemy but isn't consumed anywhere. How fast should mana regenerate? Is there a "basic attack doesn't cost mana, skills do" model?

## Items & Equipment

18. **Equipment stat modifiers**: Equipment types exist but have no `statModifiers` yet. Should equipment modify base stats, derived stats, or both? Should equipment have stance alignment (heart/body/mind)?

19. **Consumable effect system**: Consumables have an `effect: string` field. What's the mapping? Should they reference effect IDs from the effects library, or have their own effect definitions?

## World & Content

20. **Map node system**: `MapNode` has `id`, `location`, and `connectedNodes`, but there's no pathfinding or traversal logic. Is movement meant to be linear (node-to-node), or should there be branching paths with player choice?

21. **Starting world inconsistency**: `northern-forest` appears in both `availableMaps` and `lockedMaps`. Which is correct? Should the player start with only `fishing-village` available?

22. **Map vs MapState**: A TODO in the map data mentions "Differentiate between Map and MapState." Is the intent to have a static `Map` definition (template) and a runtime `MapState` (progress)? This would cleanly separate content from save data.

## Package Architecture

23. **React Native consumption**: The README says this will be consumed by a React Native app. Are there any React Native constraints I should know about (e.g., no `fs`, no Node-specific APIs in the core)?  The `node.adapter.ts` uses `fs` — should the core package avoid Node dependencies entirely?

24. **Zustand in the engine vs the consumer**: Should `Game/store.ts` be part of the engine package, or should the React Native app create its own Zustand store and only import the pure reducer functions? Having Zustand as a dependency of the mechanics package couples it to a specific state management solution.

25. **Event system for UI integration**: The combat loop currently uses `console.log`. When the React Native app consumes this, how should combat events be surfaced? An event emitter? A callback system? A stream of typed events?

## Game Design Philosophy

26. **How punishing should combat be?** The Mörk Borg inspiration suggests lethal, swingy combat. But the friendship mechanic and regen effects suggest a more forgiving tone. Where on the spectrum should this land?

27. **Moral choice system**: BRAINDUMP.md describes a difficulty meter driven by moral choices. How should this integrate with the combat engine? Should enemy stats scale with the difficulty meter? Should certain effects or skills only be available at certain moral alignments?

28. **Multiple endings**: The roadmap mentions gated endings based on moral choices. Does the engine need to track moral state, or is that a UI/narrative layer concern?
