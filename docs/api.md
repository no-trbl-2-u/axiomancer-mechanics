# Public API Reference

## Stability Levels

- **Stable**: Committed to semver for breaking changes.
- **Beta**: May change in minor versions with deprecation notice.
- **Experimental**: May change without notice.

The library is `0.x.y` (pre-1.0); breaking changes can land in minor
bumps. Items marked Stable below carry the strongest intent to remain
unchanged, but the absolute semver guarantee starts at 1.0.

## Core Exports (from `'axiomancer-mechanics'`)

### Character

- `createCharacter()` — Stable.
- `Character`, `BaseStats`, `DerivedStats`, `NonCombatStats`,
  `CreateCharacterOptions`, `AggregatedEquipmentModifiers` types — Stable.
- Equipment functions (`equipItem`, `unequipItem`,
  `getEquipmentModifiers`) — Stable.
- **Character presets (Phase 18):** `characterPresets`,
  `getPresetById`, `buildCharacterFromPreset` — Stable.
  `CharacterPreset`, `CharacterPresetEquipmentEntry` types — Stable.

### Combat

- `resolveCombatRound()` — Stable. The orchestrator delegates to per-phase
  helpers under `src/Combat/phases/` (round-start / action-restriction /
  advantage / stance-effects / scenario / round-end). Public contract
  unchanged from Phase 02; internal split landed in Phase 15.
- `determineAdvantage()`, advantage and damage / healing functions — Stable.
- Combat state management (`initializeCombat`, `endCombat`, etc.) — Stable.
- Combat types (`CombatState`, `Action`, `Stance`, `RoundEvent`,
  `RoundResolution`, etc.) — Stable.

### Game Store and State

- `createGameStore()` — Stable.
- `gameReducer()` — Stable.
- `GameState`, `GameAction`, `GameActions` types — Stable.
- Event emitter (`createEventEmitter`) — Stable.
- Selectors (`selectPlayer`, `selectCombat`, `selectInventory`,
  `selectMoralMeter`, etc.) — Stable.
- `PersistenceAdapter` interface — Stable. (The concrete
  `createNodeAdapter` lives on the `./node` subpath only — see Node.js
  Exports below.)
- `nullAdapter` — Stable.

### Events (Beta)

The engine emits a single uniform envelope on every `GameEvent`:

```ts
interface EnginePayload {
    action: GameAction;       // what triggered the event
    state: GameState;         // the post-reducer state
    report?: CombatEndReport; // only on combat:ended
}
```

`TypedGameEvent<T>` narrows the event by topic; `payload` is always
the engine envelope above. Per-topic aliases ship for all 10
`GameEventType` values:

- `TypedCombatStartedEvent`, `TypedCombatRoundEvent`,
  `TypedCombatEndedEvent`
- `TypedWorldMovedEvent`, `TypedWorldProcessedEvent`
- `TypedLevelUpEvent`, `TypedInventoryChangedEvent`
- `TypedDialogueAppliedEvent`, `TypedGameSavedEvent`,
  `TypedGameLoadedEvent`

And 10 type guards for filter / find style narrowing:

- `isCombatStartedEvent`, `isCombatRoundEvent`, `isCombatEndedEvent`
- `isWorldMovedEvent`, `isWorldProcessedEvent`
- `isLevelUpEvent`, `isInventoryChangedEvent`
- `isDialogueAppliedEvent`, `isGameSavedEvent`, `isGameLoadedEvent`

Phase 21 removed the seven pre-existing `Typed*Payload` interfaces
(`CombatStartedPayload`, etc.) and `create*Event` factories — the
engine never produced the per-topic payloads, and consumer-side
fabrication had no use case. If you need rich per-topic payloads on
a future spec, the path is to rewrite the engine's emit sites; see
`specs/23-map-events.md` for the precedent that aligned types with
reality.

### Items, Equipment & Inventory

- Item creation and manipulation functions — Stable.
- Equipment templates and generation (`equipmentTemplates`,
  `getEquipmentTemplate`, `getTemplatesBySlot`, `uniqueTemplates`,
  `getUniqueTemplate`) — Stable.
- `dropItem`, `rollModifiers`, `resolveModifiers`,
  `rarityWeightTable` — Stable.
- Inventory management (`addItem`, `removeItem`, `useConsumable`,
  `stackItem`, `addItemToInventory`, `removeItemFromInventory`) — Stable.
- Item types (`Item`, `Equipment`, `Consumable`, `Material`,
  `QuestItem`, `ItemCategory`, `EquipmentSlot`, `ItemRarity`,
  `RolledModifier`, etc.) — Stable.
- `consumableLibrary`, `getConsumableById` — Stable.

### Skills

- Skill execution (`executeSkill`, `canUseSkill`,
  `generateBasicActionResources`, `generatePhilosophicalResource`,
  `calculateSkillDamage`, `spendResources`) — Stable.
- Skill types (`Skill`, `SkillCategory`, `SkillsStatType`,
  `SkillTier`, `SkillTarget`, `ResourceCost`, `CombatResources`,
  `SkillResolution`, etc.) — Stable.

### World & Quests

- World creation (`createStartingWorld`) — Stable.
- Map registry (`MAP_REGISTRY`, `getMapDefinition`, `createMapState`,
  `getCoastalMap`, `MapNotFoundError`) — Stable.
- Navigation (`moveToNode`, `completeCurrentNode`,
  `IllegalMoveError`) — Stable.
- World reducer (`changeMap`, `completeMap`, `unlockMap`,
  `completeNode`, `unlockNode`, `changeContinent`,
  `completeUniqueEvent`) — Stable.
- Quest system (`emptyQuestLog`, `isQuestComplete`,
  `findActiveQuest`, `findQuest`, `startQuest`, `progressQuest`,
  `completeQuest`, `discoverQuest`, `reachableObjectives`,
  `killObjectives`) — Stable.
- Encounter generation (`generateEncounter`, `scaleEnemyToLevel`,
  `scaledEncounterLevel`, `DIFFICULTY_LEVEL_BANDS`) — Stable.

### MapEvents (Phase 23 / 24) — Beta

The MapEvents engine resolves what happens when the player enters a
node. Eight event kinds (`encounter`, `interaction`, `gathering`,
`rest`, `village`, `cutscene`, `hazard`, `loot-cache`) plus a
fog-of-war discovery / one-shot consumption model.

- `resolveMapEvent(state, rng?)` — Beta. Single-entry dispatcher.
- Pool registration helpers — Beta:
  - `registerMapEventPool(pool)`
  - `setDefaultMapEventPool(continent, mapName, poolId)`
  - `setNodeEventPoolOverride(continent, mapName, nodeId, poolId)`
- Discovery / consumption reducers — Beta:
  - `revealAdjacent(state, nodeId)`
  - `markNodeConsumed(state, nodeId)`
- Types — Beta: `MapEventKind`, `MapEventPayload`, `MapEventPool`,
  `MapEventPoolEntry`, `ResolvedEvent`, `ResolveMapEventResult`,
  plus per-kind payload aliases (`EncounterPayload`, etc.).

See `specs/23-map-events.md` for the spec and
`src/World/MapEvents/e2e/map-events.engine.test.ts` for the
hermetic walkthrough.

### Effects

- Effect application (`applyEffect`, `applyTier1CombatEffect`,
  `clearTier1EffectsForStance`, `clearTier1EffectsForType`,
  `lookupEffect`, `getEffectByName`, `getEffectsByType`,
  `effectsLibrary`) — Stable.
- World-effect tick (`processWorldEffectTick`,
  `getActiveHazards`) — Stable.
- Effect types (`Effect`, `EffectType`, `EffectTier`,
  `EffectStacking`, `EffectCategory`, `EffectPayload`,
  `ActiveEffect`, `StatModifier`, `DamageOverTime`,
  `RegenerationConfig`, `ActionRestriction`, etc.) — Stable.

### NPCs & Dialogue

- NPC types (`NPC`, `DialogueMap`, `DialogueTree`, `DialogueNode`,
  `DialogueChoice`, `DialogueContext`) — Stable.
- Dialogue helpers (`getDialogueNode`, `visibleChoices`,
  `isLeafNode`) — Stable.

### Utilities

- Math + random (`clamp`, `randomInt`, `deepClone`, `average`,
  `sum`, `max`, `min`, `inRange`, `capitalize`, `formatPercent`,
  `createDie`, `createDieRoll`,
  `determineRollAdvantageModifier`) — Stable.
- Stat derivation (`deriveStats`, `deriveNonCombatStats`,
  `calculateMaxHealth`) — Stable.
- RNG (`setRng`, `getRng`, `setSeed`, `Rng`) — Stable.
- Type guards (`isCharacter`, `isEnemy`, `isCombatActive`) — Stable.

## Node.js Exports (from `'axiomancer-mechanics/node'`)

### Persistence

- `createNodeAdapter()` — Stable. The fs-backed save adapter.
- `PersistenceAdapter` interface — Stable (also re-exported from
  the core barrel for RN consumers).

The Node subpath exists so React Native bundlers don't tree-shake
`fs` into a mobile bundle. Server-side / CLI consumers can import
from either path.

## React Native Usage

The core package exports work in React Native without modification.
For persistence, implement the `PersistenceAdapter` interface with
AsyncStorage:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistenceAdapter, GameState } from 'axiomancer-mechanics';

const asyncStorageAdapter: PersistenceAdapter = {
  async load(): Promise<GameState | null> {
    const data = await AsyncStorage.getItem('game-state');
    return data ? JSON.parse(data) : null;
  },

  async save(state: GameState): Promise<void> {
    await AsyncStorage.setItem('game-state', JSON.stringify(state));
  },
};
```

### Event System

Subscribe to typed game events. The engine emits a uniform
`EnginePayload` envelope; consumers use the `is*Event` guards (or
the bare `event.type === '...'` check) to narrow:

```typescript
import {
  createGameStore,
  createEventEmitter,
  isCombatStartedEvent,
  isWorldMovedEvent,
} from 'axiomancer-mechanics';

const emitter = createEventEmitter();
const store = createGameStore(adapter, undefined, emitter);

emitter.on('combat:started', (event) => {
  if (isCombatStartedEvent(event)) {
    // event.payload is { action, state, report? }.
    const enemyName = event.payload.state.combat?.enemy.name;
    console.log(`Combat started against ${enemyName}.`);
  }
});

emitter.onAny((event) => {
  console.log('Game event:', event.type);
});
```

### Character Presets

Pick a curated progression tier at boot instead of hand-building a
character:

```typescript
import {
  characterPresets,
  buildCharacterFromPreset,
} from 'axiomancer-mechanics';

const apprentice = characterPresets.find(p => p.id === 'apprentice')!;
const player = buildCharacterFromPreset(apprentice);
const store = createGameStore(adapter, { player });
```

Three presets ship today: `apprentice` (level 1), `wanderer`
(level 8), `sage` (level 15).

### MapEvents

Pools register automatically when you import from the package
barrel. Use `resolveMapEvent` to advance a node:

```typescript
import { resolveMapEvent } from 'axiomancer-mechanics';

const result = resolveMapEvent(store.getState());
if (result.event.kind === 'encounter') {
  store.getState().startCombat(result.event.encounter);
}
```

## Versioning

This package follows semver post-1.0; pre-1.0 minor bumps may carry
breaking changes (typed event surface in 0.6.0, for example). The
Stability Levels above indicate intent rather than enforcement.

- **Major (post-1.0)**: Breaking changes to stable APIs.
- **Minor**: New features; pre-1.0, may also break Beta APIs.
- **Patch**: Bug fixes and internal improvements.

Beta APIs are marked above and may change in minor releases with
migration guides in `plan/phases/`.

## Package Architecture

- **Core package**: React Native compatible, excludes Node.js
  dependencies.
- **Node subpath**: Server-side utilities requiring Node.js APIs
  (`createNodeAdapter`).
- **Barrel exports**: All public APIs available from the main entry
  point.
- **Type safety**: Full TypeScript support with strict typing.

For questions about API stability or usage, refer to the individual
module documentation in the `docs/` directory.
