# Goal — character-sheet walkthrough

**Surface under test:** the "Character" tab (Phase 26 unit 3) full-sheet
render.

The CLI no longer prompts for a preset — it bootstraps a blank level-1
character (5/5/5, empty inventory, 0 currency, no known skills). Because
a blank character is eligible to learn the tier-1 card pool, the
Character tab's Learn prompt DOES fire; the script answers it with
`{"skillId":"skip"}` ("leave them unlearned") and quits.

**Pass conditions (the agent should verify against the state log + event stream):**

1. The session opens and the bootstrap record shows the blank character:
   - `level: 1`
   - `baseStats: { heart: 5, body: 5, mind: 5 }`
   - `knownSkills: []`, `inventory: []`, `currency: 0`
2. The Character tab renders (human log contains the
   `— Character Sheet —` header plus the alignment block, derived
   stats, equipment slots, and inventory summary).
3. No state mutation between `bootstrap` and exit: the stat-allocation
   prompt is skipped (`availableStatPoints === 0`) and the Learn prompt
   is answered with `skip`, so the state log has no
   `allocateStatPoint` / `learnSkill` records.
4. The session exits cleanly via `quit` (`cli:exit` reason `'quit'`).

**Fail conditions:**

- A `learnSkill` state-log record appears (the `skip` answer desynced).
- The CLI exited with `reason: 'error'` (usually means the Learn prompt
  consumed the `{"tab":"quit"}` answer — the script must carry the
  `{"skillId":"skip"}` answer between the Character tab and the quit).
