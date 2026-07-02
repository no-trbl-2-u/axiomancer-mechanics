# Goal — tier2-skill-chain walkthrough

**Surface under test:** Tier 2 skill acquisition through the DEV
learn-skills pick flow (`devLearnSkills(store, ['eternal-regress'])`)
and the Skills tab render.

The old form of this walkthrough cast `eternal-regress` mid-fight
through the removed legacy combat loop's `{"action":"skill"}` prompt.
In-combat Tier 2 casting (including the two-effect compound
application) is now exercised by the Hazard-Pattern combat CLI and its
hermetic e2e (`src/CLI/e2e/combat.cli.engine.test.ts`); the walkthrough
keeps the CLI-level chain honest at the acquisition tier: a blank
level-1 character cannot LEARN a Tier 2 skill through the Character-tab
prompt (learning requirements gate it), but the DEV pick path grants it
directly and the Skills tab must show it.

Script: `{"tab":"dev"}` → `{"action":"learn-skills"}` →
`{"mode":"pick"}` → `{"skills":["eternal-regress"]}` (checkbox answer =
array) → `{"tab":"skills"}` → `{"tab":"quit"}`.

**Pass conditions (the agent should verify against the state log +
event stream):**

1. Bootstrap records the blank character (`knownSkills: []`).
2. After the DEV step, `player.knownSkills` contains
   `eternal-regress`.
3. The Skills tab renders `Eternal Regress` in the known list.
4. The session exits cleanly via `quit` (`cli:exit` reason `'quit'`).

**Fail conditions:**

- `eternal-regress` missing from `knownSkills` / the Skills tab.
- The CLI exited with `reason: 'error'` (usually the checkbox answer
  shape desynced — it must be `{"skills": [...]}`).

**Diagnostic notes for the agent:**

- To watch `eternal-regress` actually cast and land its compound
  debuffs, drive `npm run game -- combat --enemy wet-hound --auto
  --policy status --seed <n>` — the status policy plays Tier 2 control
  cards when they are in the deck.
