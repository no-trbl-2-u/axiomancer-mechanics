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
- **Stat allocation (Phase 29):** `allocateStatPoint(character, stat)`
  — Stable. Spends one `availableStatPoints` to raise the chosen base
  stat by 1 and re-derive `derivedStats` / `nonCombatStats` /
  `maxHealth`. Pairs with `STAT_POINTS_PER_LEVEL = 3` (granted on
  level-up via the game reducer) and the `ALLOCATE_STAT_POINT` action.
  `Character.availableStatPoints: number` is on the public type. Closes
  Spec 06 Q3 + Q8.
- **Stable identity (Phase 35):** `Character.id: string` is now a
  required field on the public type. `createCharacter()` auto-generates
  a `char-<base36>` id from `getRng()` when the caller doesn't supply
  one (RN-bundler-safe — no Node `crypto` import). Pass
  `CreateCharacterOptions.id` explicitly to pin a deterministic id for
  fixtures or `ActiveEffect.sourceId` attribution. Closes
  Knowledge-Gaps Q12.

### Combat

- `resolveCombatRound()` — Stable. The orchestrator delegates to per-phase
  helpers under `src/Combat/phases/` (round-start / action-restriction /
  advantage / stance-effects / scenario / round-end). Public contract
  unchanged from Phase 02; internal split landed in Phase 15.
- `determineAdvantage()`, advantage and damage / healing functions — Stable.
- Combat state management (`initializeCombat`, `endCombat`, etc.) — Stable.
- Combat types (`CombatState`, `Action`, `Stance`, `RoundEvent`,
  `RoundResolution`, etc.) — Stable.
- **Effect aggregators (iterate `7ee0745`):** `getActiveEffectModifiers`,
  `getEffectiveStats`, `canAct`, `resolveEffectiveAdvantage` — Stable.
  The four Combat-tier aggregators `docs/effects.md` "API at a glance"
  names; previously reachable only via `src/Combat/index.ts`, now
  re-exported through the top-level barrel. Types
  `AggregatedEffectModifiers`, `EffectiveStats` ride alongside.
  Power-user RN consumers composing custom UI may want to read these
  directly rather than going through one stance/stat at a time via
  the wrapper accessors (`getAttackStat` / `getDefenseStat` / etc.).

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
    action: GameAction;                  // what triggered the event
    state: GameState;                    // the post-reducer state
    report?: CombatEndReport;            // only on combat:ended
    unlockedSkills?: string[];           // only on character:levelup (Phase 30)
    combatEvents?: readonly RoundEvent[]; // only on combat:round (iterate 5ac6caa)
}
```

`unlockedSkills` (Phase 30 unit 2) lists skill ids newly eligible to
learn after a level promotion crossed a tier-eligibility threshold. An
empty array means the levelup didn't unlock anything new; the field is
absent on every other topic.

`combatEvents` (iterate `5ac6caa`) carries the full `RoundEvent[]` stream
that `resolveCombatRound` produced (attack-roll, damage-applied,
effect-application, skill phases, item-used, friendship-counter ticks,
etc.). Populated only on `combat:round` when the CLI / driver threads
the array through `store.updateCombat(combat, combatEvents)`; absent
otherwise.

`CombatEndReport.outcome` is `'victory' | 'defeat' | 'friendship' |
'flee'`. Phase 36 added `'friendship'` for the friendship-counter exit
— half XP grant + full loot + `+1` moral meter.

Phase 60 added `CombatEndReport.friendshipReward?: { narrative?:
string }` — present only on `outcome === 'friendship'` when the
befriended enemy carries an authored `Enemy.friendshipReward?:
FriendshipReward`. Per-enemy `items` and `xpBonus` are already
applied to `report.loot` / `report.xpGained` by the time this
surfaces; `narrative` is the field consumers render for the
after-action UI.

Phase 62 extended `FriendshipReward` with `flagSet?: string` — when
present, the END_COMBAT reducer appends the flag to `state.flags`
on friendship outcome (de-duped). Reuses the existing
`DialogueChoice.requires.flag` / `visibleChoices` machinery; no new
gate primitive. Convention: `befriended-<enemy-id-stem>`. First
authored use: `MournfulGull.friendshipReward.flagSet:
'befriended-mournful-gull'` unlocks a flag-gated branch on the
Coastal Beggar's `greet` node.

See `docs/combat.md` § "Friendship Path" + § "Befriendable-enemy
content (Phase 60)" and `docs/enemy.md` § "Befriendable enemies
(Phase 60)".

**Per-enemy befriend predicate (Phase 68).** Optional
`Enemy.befriendabilityConfig?: BefriendabilityConfig` overrides the
Phase 36 friendship-eligibility check on a per-enemy basis. When
absent, the Phase 36 mechanic (`friendshipCounter >=
FRIENDSHIP_COUNTER_MAX`) is unchanged; when present, ALL named
predicates AND-compose:

- `roundsThreshold?: number` — per-enemy override of the global
  counter cap (default `FRIENDSHIP_COUNTER_MAX`).
- `hpGate?: { belowPct: number }` — enemy HP fraction must be at or
  below `belowPct` at the eligibility check (snapshot; healing back
  above the threshold un-qualifies).
- `requiredStances?: Stance[]` — player must have used at least one
  of the named stances during combat (existential; derived from
  `state.log[].playerAction.stance`).
- `requiredSkillUse?: string[]` — player must have cast at least one
  of the named skill IDs during combat (existential; derived from
  `state.log[].playerAction` entries with `action === 'skill'`).
- `defaultFallback?: 'both-defend-cap'` — explicit escape hatch that
  treats other fields as no-ops and uses the global counter cap.

Counter still increments freely on both-defend rounds (Phase 36
unchanged); friendship triggers only when all predicates pass
together — late-resolution semantics. The new internal helper
`isFriendshipEligible(state)` is the single decision point;
`determineCombatEnd` and `isCombatOngoing` both call it so the two
predicates stay in lockstep. Helper is **not** on the public barrel
per Phase 68 D11 — engine consumers read combat-end state through
`determineCombatEnd`. First boss-tier authored config:
`CoastalTyrant` ships `{ hpGate: { belowPct: 0.4 }, requiredStances:
['heart'], roundsThreshold: 5 }`. See `docs/combat.md` § "Per-enemy
predicate (Phase 68 — `BefriendabilityConfig`)" for the full schema
and authoring guidance.

**Reactive NPCs — alignment observers (Phase 63).** Tree-level
observer machinery — Beta:

- `DialogueTree.id?: string` — optional tree identifier opting the
  tree into the observer cache.
- `GameState.lastSeenAlignmentCells?: Record<string, string>` —
  additive optional cache keyed by `tree.id`, value is the alignment
  cell id at the last `applyDialogueChoice` against the tree.
  Defaults to `undefined` (cold-start); no `GAME_STATE_VERSION`
  bump.
- `DialogueChoice.requires.playerAlignmentCellChangedSince?: boolean`
  — reactive gate visible only when the player's CURRENT cell
  differs from the cached one.
- `DialogueContext.lastSeenAlignmentCellId?: string` — caller
  sources this from `state.lastSeenAlignmentCells?.[tree.id]` when
  invoking `visibleChoices`.

First authored use: Old Marrow's tree (`id: 'old-marrow'`) surfaces
a reactive `(Stand quietly. He looks up and sees who you have
become.)` branch on re-conversation after the player's alignment
cell has shifted. See `docs/npcs.md` § "Reactive NPCs — alignment
observers (Phase 63)" for the consumer-side API.

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
- **Shop economy (Phase 37 + iterate `3ba5319`):**
  `buyItem(character, item, price)`,
  `sellItem(character, itemId, price)`,
  `defaultSellPrice(ware: ShopWare): number` (engine-tier helper —
  halves and floors the ware's buy price; always strictly less than
  the buy price for any positive integer, so buy → sell round-trips
  are net-negative for the player). All three Stable. Pure
  `Character → Character` reducers; bad input (negative price,
  insufficient funds, missing item) returns the input unchanged.
  `ShopWare` and `ShopInventory` types ride on `VillagePayload.shop?`
  and the resolved village event's `shop?` field. See `docs/items.md`
  "Shop economy" for the schema and the authored shop tables.

- **Set Items (Phase 54 / Spec 05e):** Beta. Equipping multiple
  members of a named `ItemSet` grants threshold-keyed `SetBonus`
  payloads on top of per-item `statModifiers` /
  `resourceInteraction` / `passiveEffects`. Set bonuses are computed
  on-demand at `initializeCombat` + `generateBasicActionResources` —
  no cached per-character state. Engine helpers + library:
  - `getActiveSetBonuses(equipment): SetBonus[]` — primary lookup
    against an equipped-slots snapshot.
  - `getActiveSetBonusesForCharacter(character)` — convenience
    wrapper.
  - `aggregateSetStartTokens(equipment)` /
    `applySetGenerationBonus(resources, equipment, outcome)` /
    `getActiveSetPassiveEffectIds(equipment)` — siblings of the
    per-item aggregators, additive on top.
  - `getEquippedItemSets(equipment)` — `Array<{ set, equipped }>`
    including partial counts (1/3 of Iron Discipline), for UI
    summaries.
  - `itemSetLibrary` + `getItemSetById(id)` — frozen 3-entry roster
    (Wanderer's Road, Iron Discipline, Scholar's Circle); members
    overlap on `leather-cap`.
  - Types: `SetBonus`, `ItemSet`.
  See [`docs/equipment.md`](./equipment.md) "Set Items (Spec 05e /
  Phase 54)" for runtime application notes + the "Adding a new set"
  steps.

### Skills

- Skill execution (`executeSkill`, `canUseSkill`,
  `generateBasicActionResources`, `generatePhilosophicalResource`,
  `calculateSkillDamage`, `spendResources`) — Stable.
- Skill types (`Skill`, `SkillCategory`, `SkillsStatType`,
  `SkillTier`, `SkillTarget`, `ResourceCost`, `CombatResources`,
  `SkillResolution`, etc.) — Stable.
- **Top-level skill library (Phase 50):** `skillLibrary: Skill[]` +
  `getSkillById(id: string): Skill | undefined` re-exported on the
  top-level barrel (Phase 50 unit 1 — `19f2015`, engine-handoff fix
  for `axiomancer-mobile`). Consumers no longer need to import from a
  deep path; the canonical 21-skill library (6 Tier 1 + 8 Tier 2 +
  7 Tier 3 as of Phase 66 + Phase 44) is reachable directly from
  `import { skillLibrary, getSkillById } from 'axiomancer-mechanics'`.
- **Runtime learning (Phase 30):** `learnSkill(character, skillId)`,
  `getAvailableSkills(character)`, `meetsLearningRequirement(character,
  skill)` — Stable. The `LEARN_SKILL` action wires this through the
  game reducer; the Character tab in `npm run game` exposes it. Closes
  Spec 06 Q7.
- **Tier 2 synergy (Phase 66):** Beta. Optional
  `Skill.synergy?: SkillSynergy` clause + matching `SynergyPredicate`
  shape lets a skill condition bonus damage / effect consumption /
  type-swap / detonation on the presence of an `ActiveEffect` already
  on the field. `executeSkill` evaluates synergy after
  `calculateSkillDamage` but before `combatEffects` apply. A new
  `synergy-fired` `SkillEvent` (and matching `SkillPhaseEvent`
  variant) surfaces the bonus damage, consumed effect ids,
  consumed-token count, and clear/consume flags for UI / agent
  rendering. Five Tier 2 skills ship as the first authored batch:
  `resonance-bleed` (heart, cross-stance duration amp),
  `intensity-feedback` (mind, cross-stance intensity amp),
  `bat-swarm-thoughtform` (heart, buff type-swap consuming
  `tier1_body_defend`), `resonance-burst` (mind, consume opposing
  debuff for damage), `resonance-detonation` (heart, no predicate;
  apex burn — consume full combat-resource pool + clear all effects
  + damage proportional to consumed tokens). See `docs/skills.md` §
  "Tier 2 synergy (Phase 66)" for the schema + the per-skill table.

### World & Quests

- World creation (`createStartingWorld`) — Stable.
- Map registry (`MAP_REGISTRY`, `getMapDefinition`, `createMapState`,
  `MapNotFoundError`) — Stable.
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

### Philosophy (Phase 42, Phase 43, Phase 44, Phase 46) — Beta

3-axis alignment cube indexing a 27-cell content registry. See
[docs/philosophy.md](./philosophy.md) for the full table.

- Types (`PhilosophicalAlignment`, `AxisBucket`, `AlignmentFallacy`,
  `PhilosophicalAlignmentCell`) — Beta.
- Engine (`bucketAxis`, `getAlignmentCell`, `applyAlignmentDelta`,
  `defaultAlignment`) — Beta.
- Constants (`AXIS_HIGH_THRESHOLD`, `AXIS_LOW_THRESHOLD`) — Beta.
- Library (`philosophicalAlignmentLibrary`) — Beta. Frozen array
  of 27 cells; each carries philosopher, literary character + work,
  and 3 signature fallacies.
- State field `GameState.philosophicalAlignment` — Beta. Persists
  across save/load (`GAME_STATE_VERSION` is now `5`; v4 saves
  migrate cleanly via `migrateV4toV5`).
- Action `SHIFT_PHILOSOPHICAL_ALIGNMENT` + store action
  `shiftPhilosophicalAlignment(delta: Partial<PhilosophicalAlignment>)` — Beta.

Orthogonal to `moralMeter` — both fields persist independently. The
three fallacies per cell are content fuel for skill/effect/spell
authoring; the first batch is live as of Phase 44.

**Phase 43 — content authoring surfaces:**
- `DialogueChoice.effect.alignmentDelta?: Partial<PhilosophicalAlignment>` — Beta. Applied by `applyDialogueChoice` and surfaced on `effects.philosophicalShift`.
- `MapEventPoolEntry.alignmentDelta?: Partial<PhilosophicalAlignment>` — Beta. Applied by `resolveMapEvent` after the matching handler runs.

**Phase 44 — fallacies-as-spells / abilities:**
- `Skill.sourcedFromCell?: string` — Beta. Cross-link to the originating cell id for fallacy-themed skills.
- `Effect.sourcedFromCell?: string` — Beta. Same for fallacy-themed status effects.
- 4 new Tier 3 fallacy skills (`appeal-to-consequences`, `nirvana-fallacy`, `pascals-wager`, `appeal-to-fear`) in `skillLibrary`.
- 3 new fallacy status effects (`debuff_no_true_scotsman`, `buff_special_pleading`, `debuff_category_error`) in `effectsLibrary`.

**Phase 46 — alignment-gated content:**
- `AlignmentGate` type (`{ axis: 'epistemology' | 'outlook' | 'scope', op: 'gte' | 'lte', value: number }`) — Beta. Predicate shape for gating content on the player's current alignment cube position.
- `DialogueChoice.requires.requiresAlignment?: AlignmentGate` — Beta. Applied by `visibleChoices` (gated choices are hidden when the gate misses).
- `SkillLearningRequirement.requiresAlignment?: AlignmentGate` — Beta. Applied by `meetsLearningRequirement` / `getAvailableSkills` / `learnSkill` (each accepts an optional `alignment` argument; the `LEARN_SKILL` reducer reads `state.philosophicalAlignment` automatically).
- `DialogueContext.alignment?: PhilosophicalAlignment` — Beta. Optional context field threaded through `visibleChoices` so callers can preview gates without committing dispatch.
- 2 live gates authored on `nirvana-fallacy` (`outlook ≤ -34`) + `appeal-to-fear` (`scope ≥ 34`); 2 dialogue branches gated on Old Marrow + Coastal Beggar. See [docs/philosophy.md "Authoring gates (Phase 46)"](./philosophy.md) for operator semantics + authoring guidance.

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
Stability Levels above indicate intent — and since Phase 53 the
contract is **enforced** by a public-surface snapshot at
[`scripts/public-surface.expected.json`](../scripts/public-surface.expected.json):

- Every additive symbol on the top-level barrel must land with a
  matching fixture refresh (`node scripts/snapshot-public-surface.mjs
  --write`).
- `npm run deploy:check` compares the live `dist/index.d.ts` against
  the fixture and exits non-zero on drift; the deploy gate is wired
  into CI (`.github/workflows/verify.yml`).
- Per-tag deltas are emitted by `node scripts/diff-public-surface.mjs
  <ref-A> <ref-B>` (markdown-shaped Added / Removed / Changed lists);
  the CHANGELOG `[unreleased]` block carries the per-bump prose.

Semver tier definitions:

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
