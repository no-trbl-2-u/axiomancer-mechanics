# Phase 96 — Combat recurrence victory-path fix

> User-priority promotion from the 2026-05-29 manual playthrough. Combat recurrence is poisoned after victory outcomes: losing and restarting permits a later fight, but regular victory and friendship victory suppress future combat encounters.

## Outcome

Future combat-capable nodes can trigger combat after a prior encounter ends by regular victory or friendship victory. Victory resolution may mark the resolved encounter/path complete, but must not globally exhaust combat, leave active encounter/combat state poisoned, or block unrelated combat-capable map nodes.

## Source

- `plan/CRITIQUE.md` Pending row: `[HIGH] Combat recurrence suppressed after victory outcomes`.
- Manual T playthrough, 2026-05-29.
- Evidence summary: loss + restart allows another fight; regular victory and friendship victory prevent later combat encounters.

## Implementation units

### Unit 1 — Reproduction coverage

Add deterministic coverage that exercises all three terminal paths:

1. **Defeat/restart control:** lose or force-defeat the first combat, restart/reset according to the existing run-loop semantics, then verify another combat-capable node can trigger combat.
2. **Regular victory:** resolve first combat with enemy defeat, travel to a distinct combat-capable node, verify combat can trigger again.
3. **Friendship victory:** resolve first combat by friendship, travel to a distinct combat-capable node, verify combat can trigger again.

Prefer existing game-loop / world / combat e2e harnesses over ad hoc unit tests. If no helper exists, add a narrow harness helper under the nearest existing e2e test file rather than broad new framework.

### Unit 2 — Root cause and fix

Inspect and fix the smallest responsible surface:

- encounter-completion flags
- active combat/prelude/event state
- victory aftermath reducer path
- `isCombatOngoing` / `determineCombatEnd` consumers
- map-event resolution state
- run-loop reset semantics

Do not weaken valid completion rules. The fix must distinguish “this encounter is done” from “combat can never happen again.”

### Unit 3 — Docs and plan drain

- Move the CRITIQUE row to Done or annotate it resolved according to repo convention.
- Add a `CHANGELOG.md [unreleased]` entry if behavior changes.
- Flip this phase row in `plan/steps/01_build_plan.md` when shipped.

## Decisions made upfront — DO NOT ASK

- **D1 — Victory paths are the target.** The bug is not merely “combat recurrence” in the abstract. Defeat/restart is the control path; regular victory and friendship victory are the poisoned paths.
- **D2 — Fix engine truth before mobile presentation.** Mobile may surface the failure, but the recurrence contract belongs in mechanics unless inspection proves otherwise.
- **D3 — Keep combat finite per encounter.** Do not allow re-triggering the exact same resolved encounter merely to satisfy recurrence. The required behavior is future distinct combat-capable encounters.
- **D4 — Regression evidence is mandatory.** This phase is not complete with a code tweak alone.

## Verify gate

Run:

```bash
npm run verify
npm run playtest
```

If `npm run playtest` is unavailable or too broad in this checkout, run the narrow deterministic playtest/e2e command that covers recurrence and document the substitute in the commit body.

## Commit body template

```text
fix(combat): Phase 96 shipped — victory paths no longer suppress future combat

- add deterministic recurrence coverage for defeat/restart, regular victory, and friendship victory paths
- fix victory-path state so resolved encounters do not globally suppress future combat-capable nodes
- drain CRITIQUE row `[HIGH] Combat recurrence suppressed after victory outcomes`

Verification:
- npm run verify
- npm run playtest
```

## Definition of Done

- [ ] Defeat/restart control path pinned.
- [ ] Regular victory recurrence pinned.
- [ ] Friendship victory recurrence pinned.
- [ ] Root cause fixed without allowing the same resolved encounter to loop endlessly.
- [ ] CRITIQUE row drained/annotated.
- [ ] `npm run verify` passes.
- [ ] Playtest or deterministic recurrence harness passes.
