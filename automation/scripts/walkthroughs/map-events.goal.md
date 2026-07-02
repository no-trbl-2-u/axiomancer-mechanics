# Goal — map-events walkthrough

**Surface under test:** the Map tab + `resolveMapEvent` dispatcher with
the 2026-07 deferred-minigame wiring (`deferMinigames: true` + the CLI
launching the REAL minigame session and folding its outcome back through
the engine appliers in `src/World/MapEvents/minigame-outcomes.ts`).

The CLI bootstraps a blank level-1 character (5/5/5) — there is no preset
prompt any more. Since Phase 161's per-node kind assignment, `fv-2` is a
**loot-cache** node (The Reliquary), not an interaction. The script moves
fv-1 → fv-2, plays the interactive Reliquary session with two answers
(`{"pick":"delve"}` on the always-safe lid, then `{"pick":"seal"}`), and
quits.

**Pass conditions (the agent should verify against the state log +
event stream):**

1. Bootstrap records a blank character (state log `tick: 1`, action
   `bootstrap`, `boot: 'blank'`, level 1, 5/5/5).
2. A `moveToNode` record fires with `target: 'fv-2'`; a
   `resolveMapEvent` record follows whose `event.kind` is `'loot-cache'`
   with `event.deferred === true` (the handler did NOT flat-apply — the
   real minigame ran instead).
3. The Reliquary session leaves state-log records (`createLootCacheSession`,
   `delveLootCache`, `sealLootCache`, `claimLootCacheOutcome`) and the
   event stream carries `loot-cache:complete` followed by `minigame:end`
   with `payload.node === 'fv-2'` and a non-null `summary.tier`
   (`baselineFallback: false`).
4. The lid's currency (if any) lands on the store player — the
   `minigame` state-log record's `after.player.currency` >=
   `before.player.currency`.
5. `world.currentMap.consumedNodes` contains `'fv-2'` after resolution.
6. The session exits cleanly via `quit` (`cli:exit` reason `'quit'`).

**Fail conditions:**

- `resolveMapEvent` returns `{ kind: 'none' }` for the first fv-2 visit
  (pool registry didn't load) or a non-loot-cache kind (node assignment
  drifted — update this goal if content re-authors fv-2).
- `minigame:end` reports `baselineFallback: true` (the session died and
  the flat baseline was applied — the deferred path regressed).
- The CLI exited with `reason: 'error'`.

**Diagnostic notes for the agent:**

- Minigame sessions in scripted mode WITHOUT `--auto-minigames` are
  interactive: their prompts consume script answers positionally. The two
  `{"pick": ...}` answers belong to the Reliquary's `Action?` prompt.
- The session seed derives from `hash("<--seed ?? 0>:fv-2")`, so replays
  are deterministic for a fixed `--seed` (the harness passes none →
  seed 0).
