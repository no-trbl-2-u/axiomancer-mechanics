# Phase 97 — Token accumulation restoration for skill casting

> User-priority promotion from the 2026-05-29 manual playthrough. Tokens used to cast skills are not accumulating, making skill-casting evidence invalid and compounding the learned-skill availability problem.

## Outcome

Combat token resources accumulate according to the intended combat/skills rules, are visible to consumers, and can be spent by learned usable skills. A player who takes token-generating actions or advances through the intended round flow should be able to cast a skill once costs are met.

## Source

- `plan/CRITIQUE.md` Pending row: `[HIGH] Token resources do not accumulate for skill casting`.
- Manual T playthrough, 2026-05-29.
- Related but separate row: `[MED] Learned skills are blocked by equipped-skill state`.

## Implementation units

### Unit 1 — Pin token generation contract

Find the canonical token-generation rules in code/docs/specs before editing behavior. Then add or extend hermetic coverage proving:

1. a base action or round transition that should generate tokens actually increments the expected token pool(s),
2. repeated legal token-generation steps accumulate rather than reset or disappear,
3. token state survives the same reducer/store path mobile consumes,
4. accumulated tokens make at least one appropriate learned skill castable.

### Unit 2 — Fix accumulation

Repair the smallest responsible path:

- combat round resolver token awards
- reducer/store merge logic
- character/combat resource projection
- skill-cost affordability checks
- any reset/initialization path that overwrites resource state after award

Do not solve the learned-vs-equipped skill model in this phase unless it is inseparable from proving castability. If touched, keep it minimal and file/leave the dedicated learned-skill row for the broader semantics.

### Unit 3 — Skill-cast proof

Add at least one end-to-end or integration-level proof:

- character knows a skill,
- combat actions accumulate enough tokens,
- `executeSkill` or the canonical combat skill path consumes those tokens,
- token balance decreases by the skill cost,
- the skill effect/damage/event path fires.

### Unit 4 — Docs and plan drain

- Update `docs/quickstart-skills.md`, `docs/combat.md`, or equivalent if current docs misstate token generation.
- Add a `CHANGELOG.md [unreleased]` entry for behavior fix.
- Drain/annotate the CRITIQUE row.
- Flip this phase row in `plan/steps/01_build_plan.md` when shipped.

## Decisions made upfront — DO NOT ASK

- **D1 — Token accumulation is a blocker.** Skill balance cannot be judged while the resource economy does not fill.
- **D2 — Keep scope narrower than skill-loadout redesign.** Learned-skill availability is adjacent but remains a separate critique row unless the existing code path makes a tiny compatibility fix unavoidable.
- **D3 — Prove both accumulation and spend.** A test that only checks token increment is insufficient; the phase must show tokens enable skill casting.
- **D4 — Preserve cost semantics.** Do not make skills free to hide the accumulation bug.

## Verify gate

Run:

```bash
npm run verify
npm run playtest
```

If `npm run playtest` is unavailable or too broad in this checkout, run the narrow skill/token e2e command and document the substitute in the commit body.

## Commit body template

```text
fix(skills): Phase 97 shipped — token accumulation restored

- pin token generation across combat actions/rounds
- fix resource accumulation path used by skill affordability
- add skill-cast proof that accumulated tokens are consumed by a learned skill
- drain CRITIQUE row `[HIGH] Token resources do not accumulate for skill casting`

Verification:
- npm run verify
- npm run playtest
```

## Definition of Done

- [ ] Token-generation rules located and pinned.
- [ ] Accumulation survives repeated legal generation steps.
- [ ] Mobile-consumed reducer/store path preserves tokens.
- [ ] Learned usable skill becomes castable once token costs are met.
- [ ] Skill cast consumes tokens and emits expected effect/damage/event evidence.
- [ ] CRITIQUE row drained/annotated.
- [ ] `npm run verify` passes.
- [ ] Playtest or deterministic skill/token harness passes.
