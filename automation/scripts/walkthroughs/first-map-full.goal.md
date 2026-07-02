# Goal — first-map-full walkthrough

**Surface under test:** the complete first-level playthrough via the
game CLI — every one of the fishing-village's 25 nodes visited in a
legal order, every node KIND fired (encounter / loot-cache / rest /
gathering / hazard / village / narration / interaction / quest board /
boss), Old Marrow's starting quest accepted at the fv-4 village and
completed by the fv-6 boss kill, boss map-progression unlocking the
northern forest, and continent-level travel out of a completed map.

## Invocation

The script covers ONLY tab/target/shop/dialogue prompts; combat and
minigames must be driven by flags. Run exactly:

```bash
npm run game -- \
  --script automation/scripts/walkthroughs/first-map-full.json \
  --auto-combat --combat-policy greedy --combat-seed 1 \
  --auto-minigames --seed 7 \
  --json-events
```

`--combat-policy greedy --combat-seed 1` is the pinned WINNING config
for the fv-6 Coastal Tyrant (deterministic victory); `--auto-minigames`
makes minigame nodes consume no script answers; `--seed 7` fixes the
per-node minigame streams. (The agent-e2e harness invocation
`node automation/agent-e2e.mjs <script> <goal>` does not pass these
flags — run this walkthrough directly as above.)

## Route

Two answers per hop (`{"tab":"map"}` + `{"target":...}`); the fv-4
village additionally answers
`{"action":"talk"}` / `{"npc":"Old Marrow"}` / `{"choice":0}` /
`{"choice":0}` / `{"action":"leave"}`.

```txt
fv-1 (start)
→ fv-2 loot → fv-3 rest → fv-4 VILLAGE (talk Old Marrow, accept quest)
→ fv-17 loot → fv-16 enc → fv-3* → fv-13 gather → fv-12 enc → fv-11 loot
→ fv-14 narration → fv-15 quest board → fv-14* → fv-11* → fv-1 enc
→ fv-2* → fv-3* → fv-16* → fv-17* → fv-19 interaction → fv-20 rest
→ fv-19* → fv-18 hazard → fv-5 gather → fv-6 BOSS (victory)
→ fv-7 enc → fv-21 enc → fv-24 enc → fv-25 rest → fv-24* → fv-23 hazard
→ fv-22 gather → fv-8 gather → fv-9 rest → fv-10 hazard
→ journal → travel:northern-forest → quit
```

(`*` = revisit; consumed nodes resolve to `none` and cost no extra
answers. All 25 nodes are visited and every node's authored event fires
exactly once. fv-1's encounter fires on the revisit — the starting node
is not consumed at bootstrap.)

## Pass conditions

1. **Bootstrap** — blank level-1 character (5/5/5) at fv-1.
2. **Quest accepted early** — during the fv-4 village `talk` flow, the
   human log shows `[quest started] starting-quest` BEFORE the fv-6
   boss fight; `quests.active` contains `starting-quest`.
3. **All 25 nodes visited** — 34 `moveToNode` records; the union of
   targets plus fv-1 covers fv-1..fv-25; no move rejected.
4. **Every kind fired** — `resolveMapEvent` records include kinds:
   `loot-cache` (fv-2, fv-17, fv-11), `rest` (fv-3, fv-20, fv-25,
   fv-9), `gathering` (fv-13, fv-5, fv-22, fv-8), `hazard` (fv-18,
   fv-23, fv-10), `village` (fv-4), `narration` (fv-14), `quest`
   (fv-15), `interaction` (fv-19), and `encounter` at fv-16, fv-12,
   fv-1, fv-6, fv-7, fv-21, fv-24. Each minigame-backed node emits
   `minigame:end` with a non-null tier (15 total).
5. **Boss victory** — at fv-6: `hazardCombat:start` with
   `enemy: 'The Coastal Tyrant'` and `hazardCombat:end` with
   `outcome: 'victory'` (greedy / seed 1 is deterministic), followed by
   the fold-back `Combat folded back: victory (+600 XP)` line.
6. **Quest completed by the kill** — the kill objective
   (`target: 'The Coastal Tyrant'`) progresses on the boss victory;
   the Journal tab afterwards shows
   `Completed quests: starting-quest` (and it is no longer active).
7. **Progression** — the event stream contains
   `{"type":"map:completed","payload":{"map":"fishing-village","unlocked":["northern-forest"]}}`
   and the human log the line
   `The Coastal Tyrant is dealt with. The road to the northern forest is open.`
8. **Travel** — the map tab offers `travel:northern-forest` once the
   map is completed; the `{"target":"travel:northern-forest"}` answer
   produces a `travelToMap` state-log record and the log line
   `You travel to northern-forest. You arrive at nf-1.`
9. **Clean exit** — `cli:exit` with `reason: 'quit'`; process exit 0.

## Fail conditions

- Any `moveToNode` rejected as unreachable (route order broke against
  the adjacency in `src/World/Continents/Coastal-Village/maps.ts`).
- The boss fight ends in anything but `victory` under the pinned flags.
- `starting-quest` still active (kill objective did not match the
  Tyrant) or never started (the dialogue choice indices drifted).
- No `map:completed` event, or `travel:northern-forest` missing from
  the map tab after completion.
- Any minigame `minigame:end` with `baselineFallback: true` under
  `--auto-minigames` (the policy session should always produce an
  outcome).
- `cli:exit` with `reason: 'error'` anywhere.

## Diagnostic notes

- Trash-encounter outcomes vary by node (greedy happily BEFRIENDS weak
  foes — `mercy` fold-backs are normal and still consume no answers);
  only the fv-6 outcome is pinned.
- The village shop loop fires only on the FIRST fv-4 visit (consumed
  nodes resolve to `none`), so the route revisits spine nodes freely
  but never re-enters the shop.
- fv-19's Weathered Fisher interaction carries no dialogue tree today,
  so it consumes no `{"choice"}` answers; if content later attaches a
  tree, the script needs answers there.
