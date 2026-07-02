# Goal — codex-unlock walkthrough

**Surface under test:** the Phase 82 Codex tab render path (empty state)
plus the Harbor District traversal it rides on.

The Phase 60 "guaranteed MournfulGull at fv-15" wiring is gone: since
Phase 161, `fv-15` hosts the Build-the-Boat **quest board** and the
mournful-gull encounter moved to `fv-24` (cliff path, past the boss
gate). The old heart-defend stance answers belonged to the removed
legacy combat loop, and the auto-combat policies do not reliably reach
the mercy/befriend ending, so a scripted codex UNLOCK is no longer
reachable in this walkthrough. What remains gradable is the codex READ
path: the tab must render, and with no befriended foes it must render
the canonical empty-state copy.

Script: fv-1 → fv-11 (loot-cache; `{"pick":"delve"}`, `{"pick":"seal"}`)
→ fv-14 (narration — plays through with NO answers) → Codex tab → quit.

**Pass conditions (the agent should verify against the state log +
event stream):**

1. Bootstrap records the blank level-1 character (5/5/5).
2. `moveToNode fv-11` → `resolveMapEvent` kind `'loot-cache'`
   (`deferred: true`) + `minigame:end` for fv-11.
3. `moveToNode fv-14` → `resolveMapEvent` kind `'narration'`; the human
   log shows the three strand-recollection lines ("The tide has gone
   out…") with no prompt consumed.
4. The Codex tab renders the empty state: "Your codex is empty —
   befriend a foe with a journal entry to start filling it." and
   `state.codex.unlockedEntries` is `[]` throughout.
5. The session exits cleanly via `quit` (`cli:exit` reason `'quit'`).

**Fail conditions:**

- The Codex tab renders any entry while `codex.unlockedEntries` is
  empty (stale/cached read path).
- fv-14 consumes a script answer (narration should be promptless —
  would desync the whole tail).
- The CLI exited with `reason: 'error'`.

**Diagnostic notes for the agent:**

- The codex WRITE path (friendship → `codex.unlockedEntries` append →
  tab renders title + body) is hermetically covered by
  `src/Game/e2e/codex.engine.test.ts`; auto-combat CAN produce mercy
  outcomes against befriendable trash foes (the `status` policy plays
  the Befriend card), but not deterministically enough to grade a
  scripted unlock here.
- If a future combat policy reliably befriends the fv-24 mournful-gull,
  extend this walkthrough through the boss gate and restore the unlock
  assertions.
