# Game loop

> **Status:** Spec 09 landed — `gameReducer` is the dispatch spine, the
> Zustand store delegates every mutation to it, and a `GameEvent` emitter
> broadcasts transitions to UI consumers. Save / load round-trips through a
> versioned `migrate()`. `game.cli.ts` demos the full loop end-to-end:
> Map → Combat → Journal → Skills → Inventory.

## State Shape

```ts
interface GameState {
  version: number;                   // GAME_STATE_VERSION (current: 4)
  player: Character;
  world: WorldState;
  combat: CombatState | null;        // null when out of combat
  currentEncounter?: Encounter;      // transient — excluded from saves
  quests: QuestLog;
  flags: string[];
  moralMeter: number;                // Spec 10 — clamped to [-100, +100]
  rngState: number;                  // Spec 11 — LCG seed snapshot
}
```

`currentEncounter` is the only field the persisted save omits — encounters
re-roll on load (see Spec 07 Q1). Every other field round-trips identically,
including `rngState`: the store calls `getRng().setState(saved.rngState)` on
load so the dice sequence resumes exactly where the save was taken (Spec 11).

## The dispatch spine

```ts
function gameReducer(state: GameState, action: GameAction): GameState
```

The reducer is **pure**: it returns a fresh `GameState` and never touches
disk or time. The single exception is `SAVE_GAME`, which reads the live
`getRng().getState()` so the persisted snapshot can resume the dice sequence
on load (Spec 11). Every top-level transition is expressed as a `GameAction`:

```ts
type GameAction =
  | { type: 'START_COMBAT';        payload: { target: Enemy | Encounter } }
  | { type: 'COMBAT_ROUND';        payload: { playerAction: Action; playerStance: Stance;
                                              skillId?: string; itemId?: string } }
  | { type: 'END_COMBAT';          payload?: { grantedLoot?: Item[]; grantedXp?: number } }
  | { type: 'MOVE_TO_NODE';        payload: { nodeId: string } }
  | { type: 'PROCESS_NODE'  }
  | { type: 'APPLY_DIALOGUE';      payload: { tree: DialogueTree; choice: DialogueChoice } }
  | { type: 'USE_ITEM';            payload: { itemId: string } }
  | { type: 'EQUIP_ITEM';          payload: { item: Equipment } }
  | { type: 'UNEQUIP_ITEM';        payload: { slot: EquipmentSlot } }
  | { type: 'LEVEL_UP'      }
  | { type: 'ALLOCATE_STAT_POINT'; payload: { stat: 'body' | 'mind' | 'heart' } }  // Phase 29
  | { type: 'LEARN_SKILL';         payload: { skillId: string } }                  // Phase 30
  | { type: 'SHIFT_MORAL_METER';   payload: { delta: number; gating?: { min?: number; max?: number } } }
  | { type: 'SAVE_GAME'     }   // reducer stamps `rngState`; store handles I/O
  | { type: 'LOAD_GAME'     };  // reducer no-op — store handles I/O
```

Each branch delegates to an existing module-level reducer
(`Combat/combat.reducer`, `World/world.reducer`,
`World/MapEvents/resolve-map-event` for `PROCESS_NODE` since Phase 25,
`World/dialogue.runtime`, `Items/item.reducer`, etc.). The reducer never
re-implements game math.

### END_COMBAT loot contract

`END_COMBAT` can be dispatched with a pre-rolled `{ grantedLoot, grantedXp }`
payload. The store does this so `endCombat()` can return a populated
`CombatEndReport` referring to the **exact** drops the reducer then applies —
rolling loot twice (once for the report, once inside the reducer) would
diverge. Direct dispatchers can omit the payload and let the reducer roll
internally.

## Store wrapper

`createGameStore(adapter, overrides?, emitter?)` builds a Zustand vanilla
store on top of the reducer. Every store action:

1. Computes the next state via `gameReducer(get(), action)`.
2. Publishes it through Zustand's `set`.
3. Emits a `GameEvent` if an emitter was supplied.
4. Calls `adapter.save(nextState)` to autosave (Spec 09 Q4).

The legacy method-style actions (`startCombat`, `endCombat`,
`equipItem`, …) are kept as sugar so existing call sites don't need to
rewrite — they all funnel through `dispatch` now.

### Autosave granularity

Autosave fires after **every** action (Q4 answer). A `TODO` in
`game.reducer.ts` flags this to revisit if playtest cadence proves brutal —
the alternatives are map-transition-only or explicit-save-only.

## Event surface

```ts
type GameEventType =
  | 'combat:started' | 'combat:round' | 'combat:ended'
  | 'world:moved'   | 'world:processed' | 'dialogue:applied'
  | 'character:levelup'
  | 'inventory:changed'
  | 'game:saved' | 'game:loaded';

// Phase 21 — every emitted event carries the same envelope shape:
interface EnginePayload {
  action: GameAction;       // the dispatched action that produced this event
  state: GameState;         // post-reducer snapshot
  report?: CombatEndReport; // only on 'combat:ended'
  unlockedSkills?: string[];// Phase 30 unit 2 — only on 'character:levelup'
                            // when the promotion crossed an eligibility gate
}

interface GameEvent { type: GameEventType; payload: EnginePayload }

interface GameEventEmitter {
  on(type, handler): () => void;     // type-scoped subscription
  onAny(handler):    () => void;     // every event
  emit(event):       void;
}
```

The emitter is passed into `createGameStore`. It lives **outside** `GameState`
because handlers and subscription Sets must not serialise to disk.

### Typed narrowing (Phase 21)

Consumers should subscribe through the typed aliases + guards rather
than casting `payload` by hand. The package exports one per topic:

```ts
import {
  TypedLevelUpEvent, TypedCombatRoundEvent, TypedCombatEndedEvent,
  // ... full set covers all 10 GameEventTypes
  isLevelUpEvent, isCombatRoundEvent, isCombatEndedEvent,
  // ... matching is*Event guards exported from events.utils
} from 'axiomancer-mechanics';

emitter.on('character:levelup', e => {
  if (!isLevelUpEvent(e)) return;
  const unlocked = e.payload.unlockedSkills ?? [];   // type-narrowed; no cast
  if (unlocked.length) showUnlockToast(unlocked);
});
```

The `is*Event` guards live in `src/Game/events.utils.ts` and narrow the
generic `GameEvent` down to the matching `TypedGameEvent<T>`. The
`unlockedSkills` field is populated by `enrichExtra` in
`src/Game/store.ts` whenever a `LEVEL_UP` dispatch actually promoted
the level — empty array / undefined otherwise.

## Persistence

```ts
interface PersistenceAdapter {
  load(): GameState | null;
  save(state: GameState): void;
}
```

Two adapters ship with the package:

- **`nullAdapter`** — silent no-op. Tests, combat sims, headless CLIs.
- **`createNodeAdapter()`** — JSON file on disk. Node-only.

The React Native consumer is responsible for an `AsyncStorage` adapter that
implements the same interface (Spec 09 Q5 — kept in the consumer to preserve
separation of responsibilities). The recommended shape lives in
[`docs/api.md`](./api.md) under "React Native Usage" (post-Phase 21).

### Save versioning + migration

```ts
export function migrate(
  raw: unknown,
  fromVersion: number,
  toVersion: number = GAME_STATE_VERSION,
): GameState
```

The save file carries `version`. On load, the adapter hands the raw payload
to `migrate()`, which:

- Returns it as-is when versions match.
- Refuses payloads newer than the runtime.
- Funnels older payloads through stepwise upgrades. The ladder today:
  `migrateV2toV3` (adds `moralMeter`, Spec 10) → `migrateV3toV4` (adds
  `rngState`, Spec 11).
- Validates the top-level shape before handing back a `GameState`.

When `GAME_STATE_VERSION` next bumps, add a `migrateV4toV5` step and call it
from `migrate()` for `fromVersion < 5`. Each step is a pure
`(prev) => next` function — no I/O, no defaults pulled at call time.

## game.cli.ts

`src/CLI/game.cli.ts` is the demonstrational driver. It is **wiring only** —
all math lives in the resolvers/reducers. Tabs:

| Tab        | What it does                                                     |
|------------|------------------------------------------------------------------|
| Map        | Lists reachable adjacents, dispatches `MOVE_TO_NODE`, then resolves the destination node's `MapEvent` via `resolveMapEvent` (Spec 23). Auto-pivots into Combat when the resolved event is an `encounter`. |
| Combat     | Resumes any active fight. Drives `resolveCombatRound` round by round; offers `attack` / `defend` / `skill` / `item` actions when affordable. |
| Journal    | Read-only: active / completed quests + flags + alignment stub.   |
| Skills     | Read-only: known + equipped skills.                              |
| Inventory  | Read-only listing of carried items.                              |
| Character  | Full stats + equipment + effects sheet (Phase 26 unit 3). When `availableStatPoints > 0`, prompts the player to spend points into heart / body / mind via `allocateStatPoint` (Phase 29). |
| Debug      | Spawns any enemy from `ENEMY_REGISTRY` directly into combat (Phase 19). |
| Save       | Writes the current state to the `--save-file` snapshot slot via a dedicated `PersistenceAdapter` (Phase 27 unit 2). Decoupled from dispatch-time autosave so Load is a real rollback. |
| Load       | Restores the snapshot via `setState`. Emits `game:loaded`. |
| Quit       | Emits `cli:exit` with reason `'quit'` and returns. |

Run via `npm run game` (which invokes `npx ts-node src/CLI/game.cli.ts`).
Flags: `--script <path>` for scripted answers (Phase 20), `--json-events`
for machine-clean stdout, `--state-log <path>` for the Phase 26 state
log, `--save-file <path>` for the Phase 27 Save / Load slot.
