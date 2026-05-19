# Spec 09 — Game Loop Orchestration

## Goal

A single `gameReducer(state, action): GameState` that handles every top-level
state transition: starting combat, resolving combat rounds, processing nodes,
saving / loading, and applying inter-system events. Plus a `game.cli.ts`
that demonstrates the full loop end-to-end.

**Success state:** From character creation → exploring nodes → combat →
return to map → level up → quest progress → save / load → all driven by
`gameReducer` and re-renderable from the saved state.

## Why now / dependencies

- **Unblocks:** the React Native consumer (Spec 12), Phase 9 content work.
- **Depends on:** Specs 02, 06, 07, 08. Sketchable earlier; only fully
  implementable after those.

## Current state

- **Spec 08 landed** — pure `moveToNode`, `processNode`,
  `applyDialogueChoice`, quest log, map registry, etc. (see
  `docs/world.md`). Consumers can import and compose these
  **outside** the package store today.
- `Game/store.ts` is still a Zustand vanilla store scoped to
  combat, inventory, equipment, and `save()` — **no** world-move
  or `processNode` actions on `GameStore` yet.
- `Game/game.reducer.ts` is intentionally minimal — only `createNewGameState`
  and `GAME_STATE_VERSION`.
- `actions.constants.ts` exports `COMBAT_ACTION` constants (attack, defend,
  skill, item, flee, back).
- No `gameReducer`, no top-level dispatch.
- `combat.cli.ts` has its own bespoke main loop calling
  `store.getState().updateCombat(...)` after each round.
- `character.cli.ts` is a one-shot character builder.

## Open questions

1. **Reducer vs. store.** Two coexisting models today:
   - Pure reducers (`combat.reducer.ts`, `world.reducer.ts`, `item.reducer.ts`).
   - Zustand store with inlined logic.
   Decide:
   - (A) `gameReducer` is the single source of truth; the store calls into
     it, and is mostly a Zustand wrapper for subscribers.
   - (B) The store keeps its inlined actions; `gameReducer` is only used by
     non-Zustand consumers.
   - (C) Drop Zustand from this package entirely (Spec 12).
   > Your answer: B, except let's fully switch to zustand instead of it bring a wrapper.

2. **Action shape.** Tagged union (`{ type: 'START_COMBAT', payload }`) vs
   sub-action records (`{ kind: 'combat'; combat: CombatAction }`).
   > Your answer: First one

3. **Save format versioning.** `GAME_STATE_VERSION` exists. When the schema
   changes, do you:
   - (A) Refuse to load older versions.
   - (B) Migrate via `migrate(state, fromVersion, toVersion)`.
   > Your answer: B

4. **Save granularity.** Save on every action (autosave), only on map
   transitions, only when the player explicitly saves?
   > Your answer: Autosave but leave a comment near the main logic that we'll revisit this  if the game seems too brutal
   > **DONE at Phase 51 (`<this-commit>`).** Path B picked: autosave is restricted to a curated `DURABLE_ACTIONS` allowlist (`COMBAT_ROUND`, `LEVEL_UP`, `END_COMBAT`, `MOVE_TO_NODE`, `APPLY_DIALOGUE`, `SAVE_GAME`). UI-tier actions never write through. Implementation in `src/Game/store.ts:60-77` (DURABLE_ACTIONS) + `:220-245` (gated dispatch save). Hermetic coverage in `src/Game/e2e/autosave-throttling.engine.test.ts`. The two `TODO(spec-09)` markers in `store.ts` + `game.reducer.ts` are drained.

5. **Persistence transport.** `nullAdapter` and `node.adapter.ts` exist.
   The React Native app needs an `AsyncStorage` adapter. Should this
   package ship one, or document the interface and let the consumer
   provide it?
   > Your answer: I don't know. Whatever one keeps both parts' responsibilities separate.

6. **Event surface for UI.** When the engine performs combat / level-up /
   quest progress, how do consumers learn about it?
   - (A) Read `state.log` or computed selectors.
   - (B) `gameReducer` returns `{ state, events: GameEvent[] }`.
   - (C) Event emitter / observable.
   See Spec 12 for the broader question.
   > Your answer: C

7. **`game.cli.ts` shape.** The main CLI wires:
   - Title / load-or-new.
   - Map view (list nodes, choose to move).
   - Combat (delegates to existing `combat.cli` flow but driven by
     `gameReducer`).
   - Inventory / character screens.
   Anything missing?
   > Your answer: There'll be a "Journal" tab as well that keeps track of main and side quests, as well as, current "philosophy/alignment". There'll also be "Skills" to keep track of unlocked skills. The CLI is only a way to test changes so will eventually need this stuff.

## Proposed approach

1. **Action types** — define `GameAction` union per Q2.
2. **`gameReducer(state, action)`** — switch over action type, delegating
   to the existing `combat.reducer` / `world.reducer` / `item.reducer`.
3. **Refactor `store.ts`** per Q1.
4. **Migrations** per Q3.
5. **Autosave hook** per Q4.
6. **Event surface** per Q6.
7. **`game.cli.ts`** end-to-end demo.
8. **Tests** — full transcript: new game → fight → win → level up → save
   → reload → state matches.

## Acceptance checklist

- [x] All 7 questions answered.
- [x] `gameReducer` exported and used by the CLI.
- [x] Save/load round-trip preserves combat, world, character, inventory.
- [x] `game.cli.ts` demonstrates the full loop.
- [x] `docs/` gets a new `gameloop.md` (or appendix in `docs/character.md`).

## Out of scope

- React Native UI consumer — that's a separate repo. Spec 12 covers the
  contract.
- Multiple save slots.
- Cloud sync.
