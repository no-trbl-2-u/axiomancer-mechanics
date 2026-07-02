# Goal — skill-learning walkthrough

**Surface under test:** the Phase 30 unit 3 Character-tab Learn prompt —
`getAvailableSkills(player, alignment)` gating the prompt, each pick
dispatching `LEARN_SKILL` through `learnSkill` (append to `knownSkills`,
no-op on ineligible ids).

The CLI bootstraps a blank level-1 character (no preset prompt) with
`knownSkills: []`, which makes the whole tier-1 card pool eligible — so
unlike the old Wanderer form of this walkthrough (which verified the
prompt was SKIPPED when nothing was learnable), the current script
verifies the live learn path: open the Character tab, learn
`ad-hominem-strike` from the prompt, then answer `{"skillId":"skip"}` to
leave the remaining pool unlearned, and quit.

**Pass conditions (the agent should verify against the state log +
event stream):**

1. Bootstrap records the blank character (`knownSkills: []`).
2. Exactly one `learnSkill` state-log record appears with
   `event.skillId === 'ad-hominem-strike'`;
   `after.player.knownSkills` contains it and
   `before.player.knownSkills` does not.
3. The human log shows `Learned ad-hominem-strike.`.
4. No second `learnSkill` record (the `skip` answer exited the loop).
5. The session exits cleanly via `quit` (`cli:exit` reason `'quit'`).

**Fail conditions:**

- No `learnSkill` record (the prompt never fired, or the answer
  desynced — a symptom is `Learned undefined.` in the human log).
- More than one `learnSkill` record.
- The CLI exited with `reason: 'error'`.

**Diagnostic notes for the agent:**

- The Learn loop re-prompts after every learn while eligible skills
  remain; the script MUST carry the trailing `{"skillId":"skip"}` or
  the next prompt will eat the `{"tab":"quit"}` answer.
