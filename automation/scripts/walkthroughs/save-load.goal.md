# Goal — save-load walkthrough

**Surface under test:** the Phase 27 unit 2 Save / Load CLI tabs +
the `--save-file <path>` flag, which together expose the engine's
persistence layer (`src/Game/persistence/node.adapter.ts`) as a
user-facing save-slot. The walkthrough boots the Apprentice preset,
writes a snapshot at the boot position (`fv-1`), advances one node
(to `fv-2`) to mutate state away from the snapshot, then loads to
roll the position back to `fv-1`.

This walkthrough requires the CLI to be invoked with `--save-file
<path>`. The `automation/agent-e2e.mjs` harness allocates a temp
snapshot path for every run and passes the flag through, so the test
works end-to-end with no extra setup.

**Pass conditions (the agent should verify against the state log +
event stream):**

1. Bootstrap records the Apprentice preset (level 1, base stats from
   `apprenticePreset`, starting at `fv-1`).
2. A `save` state-log record exists, captured BEFORE the move — its
   `before.world.currentMap.currentNode` is `'fv-1'`. A `game:saved`
   event also appears on the JSON event stream.
3. A `moveToNode` record fires next with
   `event.target === 'fv-2'`, followed by a `resolveMapEvent` whose
   event is an `interaction` (Old Marrow at fv-2). The
   `world.currentMap.currentNode` is `'fv-2'` after this step.
4. A `load` state-log record exists AFTER the move. Its
   `before.world.currentMap.currentNode` is `'fv-2'` (the post-move
   position), and its `after.world.currentMap.currentNode` is
   `'fv-1'` (the snapshot position). A `game:loaded` event also
   appears on the JSON event stream.
5. The session exits cleanly via `quit` (`cli:exit` reason `'quit'`).

**Fail conditions:**

- No `save` or `load` record appears (the new CLI tabs didn't fire).
- The `load` record's `after.world.currentMap.currentNode` does NOT
  match the saved snapshot's currentNode (load is broken, or the
  autosave path is overwriting the snapshot slot).
- A `save` record contains `event.result === 'no-slot'` (the
  walkthrough was run without `--save-file`).
- The CLI exited with `reason: 'error'` for any reason other than
  script exhaustion.

**Diagnostic notes for the agent:**

- The Save tab and Load tab use a dedicated snapshot adapter pointed
  at `--save-file`. The store itself uses `nullAdapter` so the
  dispatch-time autosave path does NOT overwrite the snapshot slot —
  this is what makes the Load tab a real rollback, not a re-read of
  the latest dispatch.
- The walkthrough deliberately stops at fv-2 because fv-2 is an
  interaction and avoids RNG. Trying to move from fv-2 to fv-3 would
  fail under the current `mapTab` filter, which uses
  `availableNodes` rather than `discoveredNodes` — a separate
  finding unrelated to this walkthrough.
