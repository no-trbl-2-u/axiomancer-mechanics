# Walkthroughs — scripted CLI traces for the agent-graded harness

Each walkthrough is a pair: `<name>.json` (scripted input replayed
through `npm run game --script`) plus `<name>.goal.md` (the test goal
the agent grader checks the resulting state log against). Together
they pin a single CLI surface under hermetic, replayable conditions.

Drive a walkthrough through the harness:

```
node automation/agent-e2e.mjs <name>
```

The harness loads the JSON script, optionally allocates a temp save
slot, invokes the CLI with the right flags, then hands the state log
and the goal file to the grader for pass/fail.

## Inventory

| Script | Surface under test | Preset | Enemy / scene | Required flags | Exit expectation |
|---|---|---|---|---|---|
| `boss-encounter` | Debug-tab `debugSpawn` driving a long combat loop against a boss-tier enemy | `sage` | `coastal-tyrant` (debug-spawned) | — | Combat ends (`scriptExhausted` after the final attack); player either victorious or scripted past the kill |
| `character-sheet` | Character tab — fields, derived stats, equipment, knownSkills (Phase 26 unit 3) | `apprentice` | — | — | `quit` reason; state log captures the Character tab render |
| `item-use` | In-combat `item` action consuming a `healing-potion` mid-fight (Spec 05b consumables) | `wanderer` | `sandbag` (debug-spawned) | — | Inventory decrements by one `healing-potion`; combat ends or script exhausts |
| `map-events` | Map tab + `resolveMapEvent` dispatcher firing on `fv-2` | `apprentice` | — | — | `quit` reason after the node resolves; state log shows the MapEvent payload |
| `save-load` | Save / Load CLI tabs + `--save-file` slot (Phase 27 unit 2 + Phase 31 fix at `711b49e` for fv-1 → fv-2 → fv-3 rollback) | `apprentice` | — | `--save-file <path>` (the harness allocates a temp path) | `quit` reason; map state rolls back to the save slot, not the autosave |
| `skill-learning` | Character-tab Learn prompt (Phase 30 unit 3 — `LEARN_SKILL` action wired to `learnSkill`) | `wanderer` | — | — | `quit` reason; state log shows newly-learned skills the preset didn't ship with |
| `skills-in-combat` | In-combat `skill` action (Phase 26 unit 1) — `ad-hominem-strike` mid-fight | `wanderer` | `wet-hound` (debug-spawned) | — | `quit` reason after combat; skill resource cost + damage applied |
| `stat-allocation` | Character-tab stat-allocation prompt loop (Phase 29 `db7c26f` — spend `availableStatPoints`) | `sage` | `coastal-tyrant` (long combat to generate XP / level-ups) | — | Combat ends; allocation prompt fires; `availableStatPoints` decrements |

## Conventions

- **Hermetic.** The harness seeds the RNG; replays are deterministic.
- **Pre-allocated saves.** Scripts that touch the Save / Load tabs
  must declare `--save-file <path>` in their goal file. The harness
  allocates the path and cleans up after the run.
- **No interactive prompts that aren't pre-answered.** Every prompt the
  CLI fires must have a matching line in the JSON script — otherwise
  the run exits with `reason: 'error'`.
- **`reason: 'scriptExhausted'`** is a valid exit only when the script
  intentionally drains every step; `reason: 'quit'` is the standard
  golden-path exit.

When adding a new walkthrough: drop in the `<name>.json` script + the
`<name>.goal.md` goal file, add a row to the table above, and run
`node automation/agent-e2e.mjs <name>` until the grader reports pass.
