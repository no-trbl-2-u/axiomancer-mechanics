# Goal — save-load walkthrough

**Surface under test:** the Save / Load CLI tabs + the `--save-file <path>`
snapshot slot (Phase 27 unit 2), exercised as a proper
save → mutate-past-save → load → rollback cycle across map nodes.

Post-Phase-161 node kinds: `fv-2` is a **loot-cache** node and `fv-12` is
an **encounter** node (Salt-Gnaw Rat). The CLI bootstraps a blank level-1
character (no preset prompt). The script: move fv-1 → fv-2 (Reliquary
session, two `{"pick"}` answers), Save at fv-2, move fv-2 → fv-12
(encounter — auto-resolved by the Hazard-Pattern combat driver because
scripted mode forces auto-combat; consumes NO script answers), Load, quit.

This walkthrough requires `--save-file <path>`; the
`automation/agent-e2e.mjs` harness allocates a temp snapshot path on every
run.

**Pass conditions (the agent should verify against the state log +
event stream):**

1. Bootstrap records the blank character (level 1, 5/5/5, starting at
   `fv-1`).
2. A `moveToNode` record fires with `target: 'fv-2'`, followed by a
   `resolveMapEvent` with kind `'loot-cache'` (`deferred: true`) and a
   `minigame:end` event for node `fv-2`.
3. A `save` state-log record fires next; its
   `before.world.currentMap.currentNode` is `'fv-2'`. A `game:saved`
   event appears on the JSON event stream.
4. A second `moveToNode` fires with `target: 'fv-12'` followed by a
   `resolveMapEvent` with kind `'encounter'` (Salt-Gnaw Rat). The event
   stream shows `hazardCombat:start` → `hazardCombat:end` (any outcome —
   the run is unseeded here) and an `endCombat` state-log record (the
   fold-back path: `combat:started` / `combat:ended` events).
5. A `load` state-log record fires next. Its
   `before.world.currentMap.currentNode` is `'fv-12'` and its
   `after.world.currentMap.currentNode` is `'fv-2'` (the snapshot
   position). A `game:loaded` event appears on the stream.
6. The session exits cleanly via `quit` (`cli:exit` reason `'quit'`).

**Fail conditions:**

- The move to `fv-12` is rejected (`unlockAdjacent` regressed — the CLI
  logs "not reachable" / exits with `reason: 'error'`).
- No `save` or `load` record appears, or `save` carries
  `event.result === 'no-slot'` (run without `--save-file`).
- The `load` record's `after.world.currentMap.currentNode` is not
  `'fv-2'` (rollback broken, or autosave overwrote the snapshot slot).
- The CLI exited with `reason: 'error'`.

**Diagnostic notes for the agent:**

- The Save/Load tabs use a dedicated snapshot adapter pointed at
  `--save-file`; the store itself runs on `nullAdapter`, which is what
  makes Load a real rollback rather than a re-read of the latest
  dispatch.
- The fv-12 combat outcome is nondeterministic (no `--combat-seed`), so
  do not grade on victory/defeat/mercy — only that the encounter fired,
  folded back, and the Load rolled the position back cleanly.
