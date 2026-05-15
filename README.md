# Axiomancer — Mechanics Engine

Turn-based RPG engine with a Heart / Body / Mind combat system. Status effects, skills, and enemies are themed around logical fallacies and philosophical paradoxes.

This repository is the **non-UI engine** only. It is consumed as a library by clients (e.g. a React Native app). All logic is exposed through the package barrel at [`src/index.ts`](./src/index.ts).

---

## Install

The package is not yet published. To consume it locally:

```bash
npm install
npm run build       # compiles to ./dist
```

## Quick start

```ts
import {
  createCharacter, createEnemy,
  createGameStore, nullAdapter,
  determineEnemyAction, determineAdvantage,
  applyDamage, getAttackStat, getDefenseStat,
  applyTier1CombatEffect, lookupEffect,
  isCombatOngoing,
} from 'axiomancer-mechanics';

const player = createCharacter({
  name: 'Hero',
  level: 1,
  baseStats: { heart: 4, body: 3, mind: 2 },
});

const enemy = createEnemy({
  id: 'goblin-1',
  name: 'Goblin',
  description: '',
  level: 1,
  baseStats: { heart: 1, body: 2, mind: 1 },
  mapName: 'fishing-village',
  logic: 'random',
});

const store = createGameStore(nullAdapter, { player });
store.getState().startCombat(enemy);

while (isCombatOngoing(store.getState().combat!)) {
  // ...drive a round of combat using the helpers above...
}
```

## Public API

The barrel exports are organised by domain:

| Group           | Highlights                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| Character       | `createCharacter`, `equipItem`/`unequipItem`, `getEquipmentModifiers`, `Character`, `BaseStats`, `DerivedStats`, `NonCombatStats` |
| Enemy           | `createEnemy`, `decideEnemyAction`, AI presets (`aggressive`/`defensive`/`balanced`/`strategic`/`bossLogic`), `rollLoot`/`rollLootMany`, `EnemyLibrary`, `EnemiesByMap`, `ENEMY_REGISTRY`, `DEFAULT_XP_BY_DIFFICULTY` |
| Combat          | `determineAdvantage`, stat accessors (`getBaseStat`/`getAttackStat`/`getDefenseStat`/`getSaveStat`/`getResistStat`), `applyDamage`/`heal`/`healCharacter`, `tickAllEffects`/`applyRegen`, `getActiveRollModifier`/`getThornsReflect`, `resolveEffectApplication`, `determineCombatEnd`, `isCombatOngoing`, `Stance`/`Action`/`CombatState`/`Combatant` |
| Combat reducer  | `initializeCombat`, `setPhase`/`setPlayerStance`/`setPlayerAction`, `appendLog`/`addBattleLogEntry`, `incrementFriendship`, `endCombat`, `endCombatPlayerVictory`/`endCombatPlayerDefeat`/`endCombatWithFriendship` |
| Combat resolver | `resolveCombatRound` plus its typed event stream: `RoundResolution`, `RoundEvent` (`RoundStartEvent`, `ActionRestrictionEvent`, `AdvantageEvent`, `StanceEffectEvent`, `ScenarioEvent`, `ItemPhaseEvent`, `RoundEndEvent`) |
| Effects         | `applyEffect`, `applyTier1CombatEffect`, `clearTier1EffectsForStance`/`ForType`, `lookupEffect`/`getEffectByName`/`getEffectsByType`, `effectsLibrary`, `processWorldEffectTick`/`getActiveHazards`, types (`Effect`, `ActiveEffect`, `EffectTier`, `StatModifier`, `DamageOverTime`, `RegenerationConfig`, `ActiveHazard`) |
| Items           | `addItem`/`removeItem`/`stackItem`, `useConsumable`/`useConsumableEffect`, equipment helpers (`aggregateCombatStartTokens`, `applyEquipmentGenerationBonus`, `getEquipmentProcTriggers`), `equipmentTemplates`/`uniqueTemplates`, `consumableLibrary`, type guards, types (`Item`, `Equipment`, `Consumable`, `Material`, `QuestItem`, `EquipmentTemplate`, `UniqueItemTemplate`) |
| Skills          | `executeSkill`, `canUseSkill`/`spendResources`/`calculateSkillDamage`, `generateBasicActionResources`/`generatePhilosophicalResource`, types (`Skill`, `CombatResources`, `SkillTier`, `SkillResolution`, `SkillEvent`, `SkillLookup`) |
| Game            | `createGameStore`/`createNewGameState`, `gameReducer`/`migrate`, `createEventEmitter`, selectors (`selectPlayer`, `selectCombat`, `selectInventory`, `selectMoralMeter`, `selectVersion`), persistence adapters (`nullAdapter`, `createNodeAdapter`), mechanic constants (`FRIENDSHIP_COUNTER_MAX`, `MAX_EFFECT_DURATION`, `PASSIVE_DEFENSE_MULTIPLIER`, …), types (`GameState`, `GameStore`, `GameAction`, `GameEvent`/`GameEventEmitter`, `PersistenceAdapter`) |
| World           | `createStartingWorld`, world reducer (`changeMap`/`completeMap`/`unlockMap`/`completeNode`/`unlockNode`/`changeContinent`), map registry (`MAP_REGISTRY`, `getMapDefinition`, `createMapState`), node traversal (`moveToNode`, `completeCurrentNode`, `processNode`, `applyDialogueChoice`), quests (`emptyQuestLog`, `startQuest`/`progressQuest`/`completeQuest`/`discoverQuest`), encounters (`generateEncounter`, `scaleEnemyToLevel`, `DIFFICULTY_LEVEL_BANDS`), types (`WorldState`, `WorldMap`, `MapNode`, `Quest`, `Encounter`) |
| NPCs            | `getDialogueNode`, `visibleChoices`, `isLeafNode`, types (`NPC`, `DialogueMap`, `DialogueTree`, `DialogueNode`, `DialogueChoice`, `DialogueContext`) |
| Utils           | `clamp`/`inRange`/`average`/`sum`/`max`/`min`, `randomInt`, `deepClone`, `capitalize`/`formatPercent`, `createDie`/`createDieRoll`/`determineRollAdvantageModifier`, `deriveStats`/`deriveNonCombatStats`/`calculateMaxHealth`, type guards (`isCharacter`, `isEnemy`, `isCombatActive`) |
| Utils — RNG     | `getRng`/`setRng`/`setSeed`, `Rng` interface (seedable LCG; Phase 11 routed all gameplay rolls through this singleton so saves are reproducible) |

## CLIs

The repo also ships a hands-on demo CLI. It is NOT part of the published package surface (`src/CLI` is excluded from the build):

| Command          | What it does                                                                  |
| ---------------- | ----------------------------------------------------------------------------- |
| `npm run game`   | Interactive demo — tabbed map / combat / journal / skills / inventory loop.   |

### Agent-driven CLI mode

`npm run game` accepts three flags so the demo loop can be driven without a
human at the keyboard:

| Flag | What it does |
| ---- | ------------ |
| `--script <path>` | Loads a JSON array of answer objects and feeds them to subsequent prompts in order. Each object matches the shape `inquirer.prompt` returns (e.g. `{"presetId": "apprentice"}`, `{"tab": "debug"}`). Exhaustion throws. |
| `--stdin` | Reads one JSON object per line from stdin and uses each as the next answer. EOF before all prompts complete throws. |
| `--json-events` | Replaces the human event log with one `JSON.stringify(event)` line per emitted GameEvent on stdout. Human prose is routed to stderr so stdout stays machine-clean. A final `{"type":"cli:exit",...}` line marks the end. |

Examples:

```bash
npm run game -- --script replay.json --json-events
echo '{"presetId":"apprentice"}' | npm run game -- --stdin --json-events
```

`--script` and `--stdin` are mutually exclusive; if both are passed, `--script` wins.

## Project layout

```
src/
  index.ts                 # public barrel
  Character/               # createCharacter + Character types
  Combat/                  # advantage, stats, dice, damage, health, effects, resist, reducer
  Effects/                 # applyEffect, Tier 1 stance effects, library lookup
  Enemy/                   # createEnemy + AI logic + library
  Game/                    # store + persistence + constants + actions + reducer
  Items/                   # inventory reducers + item types
  Skills/                  # types only (engine pending)
  World/                   # world state, reducers, map and quest libraries
  NPCs/                    # NPC types
  Utils/                   # math, dice, stat derivation, type guards
  CLI/                     # interactive CLIs (not exported by the package)
docs/                      # design notes per system
docs/effects/              # one markdown per buff/debuff
docs/references/           # source material (fallacies, paradoxes, pantheon, Mörk Borg)
specs/                     # planning specs for upcoming work (Phase 2 onward)
automation/                # standalone walkthrough script + replay fixtures
```

## Documentation

- [`GAME-ROADMAP.md`](./GAME-ROADMAP.md) — phased development plan with progress tracking
- [`AUDIT.md`](./AUDIT.md) — code audit and quality assessment
- [`Knowledge-Gaps.md`](./Knowledge-Gaps.md) — open design and intent questions
- [`BRAINDUMP.md`](./BRAINDUMP.md) — unorganised idea backlog
- [`docs/testing.md`](./docs/testing.md) — **hermetic e2e testing standard (required for every implementation)**
- [`specs/`](./specs) — phased planning specs to drive the next round of work (start with `specs/README.md`)
- [`docs/`](./docs) — per-system references (combat, effects, character, world, etc.)
- [`docs/effects/`](./docs/effects) — per-effect deep-dives (one file per buff/debuff)
- [`docs/references/`](./docs/references) — source material (fallacies, paradoxes, pantheon, story)

## Scripts

| Script                | What it does                       |
| --------------------- | ---------------------------------- |
| `npm run build`       | Type-check and compile to `dist/`  |
| `npm run type-check`  | Type-check only                    |
| `npm test`            | Run the vitest suite               |
| `npm run test:watch`  | Vitest in watch mode               |
| `npm run lint`        | Run ESLint                         |
| `npm run check`       | Lint + type-check                  |
| `npm run game`        | Interactive demo CLI (tabbed loop) |
