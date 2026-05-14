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
  | { type: 'START_COMBAT';   payload: { target: Enemy | Encounter } }
  | { type: 'COMBAT_ROUND';   payload: { playerAction: Action; playerStance: Stance;
                                         skillId?: string; itemId?: string } }
  | { type: 'END_COMBAT';     payload?: { grantedLoot?: Item[]; grantedXp?: number } }
  | { type: 'MOVE_TO_NODE';   payload: { nodeId: string } }
  | { type: 'PROCESS_NODE'  }
  | { type: 'APPLY_DIALOGUE'; payload: { tree: DialogueTree; choice: DialogueChoice } }
  | { type: 'USE_ITEM';       payload: { itemId: string } }
  | { type: 'EQUIP_ITEM';     payload: { item: Equipment } }
  | { type: 'UNEQUIP_ITEM';   payload: { slot: EquipmentSlot } }
  | { type: 'LEVEL_UP'      }
  | { type: 'SHIFT_MORAL_METER'; payload: { delta: number; gating?: { min?: number; max?: number } } }
  | { type: 'SAVE_GAME'     }   // reducer stamps `rngState`; store handles I/O
  | { type: 'LOAD_GAME'     };  // reducer no-op — store handles I/O
```

Each branch delegates to an existing module-level reducer
(`Combat/combat.reducer`, `World/world.reducer`, `World/process-node`,
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

interface GameEvent { type: GameEventType; payload: unknown }

interface GameEventEmitter {
  on(type, handler): () => void;     // type-scoped subscription
  onAny(handler):    () => void;     // every event
  emit(event):       void;
}
```

The emitter is passed into `createGameStore`. It lives **outside** `GameState`
because handlers and subscription Sets must not serialise to disk.

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
separation of responsibilities). Spec 12 will document a recommended shape.

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
| Map        | Lists adjacent open nodes, dispatches `MOVE_TO_NODE` + `PROCESS_NODE`. Auto-pivots into Combat when the node spawns an encounter. |
| Combat     | Resumes any active fight. Drives `resolveCombatRound` round by round. |
| Journal    | Read-only: active / completed quests + flags + alignment stub.   |
| Skills     | Read-only: known + equipped skills.                              |
| Inventory  | Read-only listing of carried items.                              |

Run via `npx tsx src/CLI/game.cli.ts` (or wire `npm run game` to it).
