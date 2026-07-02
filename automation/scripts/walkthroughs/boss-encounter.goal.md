# Goal — boss-encounter walkthrough

**Surface under test:** the organic boss route — map traversal to the
`fv-6` gauntlet boss (`fv-6.encounter-boss` pool: Coastal Tyrant pinned
to level 3) and the Hazard-Pattern combat driver firing from
`resolveMapEvent`, with the fold-back path (`startCombat` / `endCombat`)
granting XP/loot and, on victory or mercy, boss map-progression.

The legacy `debugSpawn` + stance/attack loop this walkthrough used to
drive was removed with the legacy combat shell; the DEV tab's
Spawn-enemy action now only STAGES an encounter. The current script
walks the spine instead: fv-1 → fv-2 (loot-cache, `{"pick":"seal"}`) →
fv-3 (rest; `{"posture":"deep"}`, `{"ack":"continue"}`,
`{"pick":"option:hold"}`, `{"pick":"option:feed"}`) → fv-4 (Wharfside
Market; `{"action":"leave"}`) → fv-5 (gathering; `{"id":"mire-mint"}`,
`{"approach":"glean"}`, `{"pick":"withdraw"}`) → **fv-6 (boss)** → quit.
Scripted mode forces auto-combat, so the boss fight itself consumes NO
script answers.

**Pass conditions (the agent should verify against the state log +
event stream):**

1. Bootstrap records the blank level-1 character (5/5/5).
2. Five `moveToNode` records in order: fv-2, fv-3, fv-4, fv-5, fv-6.
3. `resolveMapEvent` kinds along the way: `loot-cache`, `rest`,
   `village` (Wharfside Market), `gathering` — each minigame-backed kind
   `deferred: true` with a matching `minigame:end` event.
4. At fv-6: `resolveMapEvent` kind `'encounter'` with `isBoss: true`;
   the event stream shows `hazardCombat:start` with
   `enemy: 'The Coastal Tyrant'` and later `hazardCombat:end` with ANY
   outcome (the harness run is unseeded; the loop closing is the graded
   surface, not the win).
5. An `endCombat` state-log record follows (fold-back fired:
   `combat:started` + `combat:ended` events, XP/loot on victory).
6. If the outcome was `victory` or `mercy`: a `map:completed` event with
   `{ map: 'fishing-village', unlocked: ['northern-forest'] }` and the
   human log line "The Coastal Tyrant is dealt with." — a bonus check,
   NOT required for a pass on defeat/retreat.
7. The session exits cleanly via `quit` (`cli:exit` reason `'quit'`).

**Fail conditions:**

- fv-6 resolves to anything but a boss encounter.
- No `hazardCombat:start` fires (the encounter was merely described or
  staged — the inline driver regressed).
- Any route move is rejected as unreachable.
- The CLI exited with `reason: 'error'`.

**Diagnostic notes for the agent:**

- For a DETERMINISTIC boss kill, run manually with
  `--auto-combat --combat-policy greedy --combat-seed 1` (the
  `first-map-full` walkthrough pins that path). The harness passes no
  combat flags, so this walkthrough tolerates any outcome.
- fv-6 is only enterable from fv-5, and fv-5 only from fv-4 or fv-18 —
  the rest/gathering answers above are unavoidable on the shortest
  route.
