# Goal — endgame-loadout walkthrough

**Surface under test:** an endgame-shaped character sheet assembled
through the DEV tab and rendered end-to-end — `devMaxOut` (level 20,
20/20/20 stats, every skill learned, all equipment at rare, all
consumables ×10, 999 currency) followed by the full Character-tab
render and the Inventory tab.

The old form of this walkthrough (Sage preset casting
`bootstrap-paradox` against a debug-spawned Coastal Tyrant) drove the
removed legacy combat loop. Tier-3 skill casting now lives in the
Hazard-Pattern combat CLI and its hermetic e2e
(`src/CLI/e2e/combat.cli.engine.test.ts`); what remains CLI-walkthrough
material is the loadout surface itself: grant everything, then prove the
sheet renders a fully-kitted character without desync.

Script: `{"tab":"dev"}` → `{"action":"max-out"}` → `{"tab":"character"}`
→ `{"tab":"inventory"}` → `{"tab":"quit"}`. Note the Character tab fires
NO Learn prompt here — max-out leaves nothing learnable — and no stat
prompt (`availableStatPoints` stays 0), so the tab consumes no extra
answers.

**Pass conditions (the agent should verify against the state log +
event stream):**

1. Bootstrap records the blank level-1 character.
2. After the DEV max-out, the state shows `player.level === 20`,
   `baseStats { 20/20/20 }`, `currency >= 999`, a fully-populated
   `knownSkills` (the whole card library), and equipment in the
   `weapon` / `armor` slots at `rare` rarity.
3. The Character tab renders the full sheet (human log:
   `— Character Sheet —`, derived stats, equipment slots showing
   `[rare]` items, skills line listing the library).
4. The Inventory tab lists the granted consumables with `×10`
   quantities.
5. The session exits cleanly via `quit` (`cli:exit` reason `'quit'`) —
   proving neither the stat-allocation nor the Learn prompt fired on a
   maxed character.

**Fail conditions:**

- The Character tab consumes an extra answer (a Learn/Allocate prompt
  fired on a maxed character — the tab's gating regressed).
- Equipment/consumable grants missing from the sheet or inventory.
- The CLI exited with `reason: 'error'`.
