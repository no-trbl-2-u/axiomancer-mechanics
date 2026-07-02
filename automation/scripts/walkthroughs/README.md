# Walkthroughs — scripted CLI traces for the agent-graded harness

Each walkthrough is a pair: `<name>.json` (scripted answers replayed
through the game CLI's `--script` mode) plus `<name>.goal.md` (the test
goal the agent grader checks the run's state log + event stream
against). Together they pin a single CLI surface under replayable
conditions.

Drive a walkthrough through the harness (both paths are required):

```
node automation/agent-e2e.mjs \
  automation/scripts/walkthroughs/<name>.json \
  automation/scripts/walkthroughs/<name>.goal.md
```

The harness invokes `ts-node src/CLI/game.cli.ts --script <json>
--json-events --state-log <tmp> --save-file <tmp>`, then hands the
state log, event stream, human log, and the goal file to a Claude
grader for pass/fail (needs `ANTHROPIC_API_KEY`). For a direct,
grader-free replay:

```
npm run game -- --script automation/scripts/walkthroughs/<name>.json \
  --json-events --save-file /tmp/wt.save.json [extra flags]
```

## The answer protocol (2026-07 CLI)

- The CLI bootstraps a **blank level-1 character** (5/5/5) — there is
  NO preset prompt. Scripts must not lead with `{"presetId": ...}`.
- Answers are **positional**: `src/CLI/io.ts` shifts exactly one JSON
  object per `prompt()` call, keyed by the prompt's `name`. Common
  shapes: `{"tab": ...}`, `{"target": "<nodeId>"}` (or
  `{"target": "travel:<map>"}` once the map is completed),
  `{"choice": <visible-index> | -1}` for dialogue, and the village
  shop loop's `{"action": "buy"|"sell"|"talk"|"leave"}` +
  `{"wareId"}` / `{"sellChoice"}` / `{"npc"}` follow-ups.
- **Encounters consume NO answers in scripted mode** — the
  Hazard-Pattern driver auto-runs them (`--combat-policy`, default
  `status`; `--combat-seed`, default unseeded/random).
- **Minigame nodes are interactive unless `--auto-minigames`** (or
  `--route`, which forces it): hazard / gathering / rest / loot-cache /
  quest-board sessions prompt through the shared io answers
  (`{"pick"}`, `{"posture"}`, `{"ack"}`, `{"id"}`, `{"approach"}` …),
  seeded deterministically from `hash("<--seed ?? 0>:<nodeId>")`.
- Narration nodes and choiceless dialogue leaves consume nothing.

## Inventory

| Script | Surface under test | Route / setup | Foe | Extra flags | Exit expectation |
|---|---|---|---|---|---|
| `first-map-full` | **The whole first level**: all 25 fv nodes, every node kind, Old Marrow quest accept → boss kill → quest complete, `map:completed` + travel to northern-forest | fv-1 → … → fv-10 (34 hops incl. revisits; village talk at fv-4) | The Coastal Tyrant at fv-6 (pinned victory) + 6 trash foes | **required:** `--auto-combat --combat-policy greedy --combat-seed 1 --auto-minigames --seed 7` | `quit`; `map:completed` observed; run directly, not via the flagless harness |
| `boss-encounter` | Organic boss route + Hazard-Pattern fold-back (XP/loot/progression) | fv-2 loot → fv-3 rest → fv-4 village → fv-5 gather → fv-6 | The Coastal Tyrant (any outcome — unseeded) | — | `quit` |
| `coastal-tyrant-befriend` | Mercy plumbing (`mercy → 'friendship'` fold-back; mercy also completes the map) | same route as `boss-encounter` | The Coastal Tyrant (mercy not policy-reachable; grades on plumbing) | — | `quit` |
| `character-sheet` | Character tab full render on the blank bootstrap | tabs only (+ `{"skillId":"skip"}` for the Learn prompt) | — | — | `quit`; no state mutation |
| `codex-unlock` | Codex tab empty-state render + Harbor traversal | fv-11 loot → fv-14 narration → codex tab | — | — | `quit`; codex empty |
| `endgame-loadout` | DEV `max-out` + fully-kitted sheet/inventory render | dev tab → character → inventory | — | — | `quit`; no Learn/Allocate prompt fires |
| `fishing-village-exploration` | Map traversal into live Hazard-Pattern combat | fv-2 loot → fv-12 | Salt-Gnaw Rat (auto) | — | `quit`; `hazardCombat:*` events present |
| `item-use` | Consumable grant + stacked Inventory render | dev grant-consumables → inventory | — | — | `quit` |
| `map-events` | `resolveMapEvent` + deferred minigame launch/fold-back at fv-2 | fv-2 (Reliquary: delve, seal) | — | — | `quit`; `minigame:end` non-fallback |
| `save-load` | Save/Load snapshot rollback across nodes | fv-2 loot → save → fv-12 encounter → load | Salt-Gnaw Rat (auto, any outcome) | `--save-file` (harness provides) | `quit`; position rolls back to fv-2 |
| `shop` | `buyItem`/`sellItem` + `defaultSellPrice` invariant at the fv-4 Wharfside Market | dev grant-currency 100 → fv-2 → fv-3 → fv-4 (buy/sell/leave) | — | — | `quit`; ledger 100 → 90 → 95 |
| `skill-learning` | Character-tab Learn prompt (live learn path) | character tab: learn `ad-hominem-strike`, skip | — | — | `quit`; exactly one `learnSkill` |
| `skills-in-combat` | Auto-combat plays cards (per-card attribution in summary) | fv-2 loot → fv-12 | Salt-Gnaw Rat (auto) | — | `quit` |
| `stat-allocation` | DEV set-stats + derived-stat re-render (Allocate prompt currently unreachable organically — see goal) | dev set-stats 8/9/7 → character | — | — | `quit` |
| `synergy-skills-chain` | Synergy pair acquisition (`eternal-regress` + `resonance-burst`) via DEV pick | dev learn-skills pick → skills tab | — | — | `quit` |
| `tier2-skill-chain` | Tier 2 acquisition (`eternal-regress`) via DEV pick | dev learn-skills pick → skills tab | — | — | `quit` |

In-combat card-by-card play is NOT walkthrough material any more: the
new combat CLI's coverage lives in hermetic e2e
(`src/CLI/e2e/combat.cli.engine.test.ts`) and the
`npm run game -- combat` subcommand, because scripted map encounters
always auto-run.

## Conventions

- **Deterministic where it matters.** Minigame sessions derive their
  seeds from `--seed` + node id (default seed 0), so interactive
  minigame answer sequences replay exactly. Combat is only
  deterministic when `--combat-seed` is passed — goals for flagless
  harness runs must tolerate any combat outcome.
- **Pre-allocated saves.** The harness always passes `--save-file`
  with a temp path; only `save-load` depends on it.
- **No unanswered prompts.** Every prompt the CLI fires must have a
  matching positional answer in the JSON script — a missing answer
  exits with `reason: 'error'` (`CLI script exhausted`), and a
  MIS-KEYED answer silently yields `undefined` for the destructured
  field (watch for symptoms like `Learned undefined.`).
- **`reason: 'quit'`** is the standard golden-path exit;
  `scriptExhausted` is acceptable only when a goal explicitly drains
  the script.

When adding a new walkthrough: drop in the `<name>.json` +
`<name>.goal.md` pair, add a row to the table above (plus the
`docs/quickstart.md` catalog), and run it directly with the flags in
its goal until it exits 0 before wiring it into the harness.
