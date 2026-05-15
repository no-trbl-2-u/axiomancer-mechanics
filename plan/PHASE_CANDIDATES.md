# PHASE_CANDIDATES.md

> Proposed new phases from `/expand`. Reviewed and promoted by
> `/oversight`. Format: `## Pending` → `/oversight` moves to
> `## Promoted` or `## Rejected`.

<!-- Metadata (updated by /expand after each pass):
> Last pass: never (candidates below were seeded via /oversight 2026-05-14)
> Pass count: 0
-->

---

## Pending

(No expand passes run yet.)

---

## Promoted

### Phase 15 — Split combat.resolver.ts into per-phase helpers
- promoted: 2026-05-14 (oversight)
- source: critique pass-1 (Z-MED 2.1 in AUDIT.md)
- summary: Extract `resolveRoundStart`, `resolveActionRestriction`,
  `resolveAdvantage`, `resolveStanceEffects`, `resolveScenario`,
  `resolveRoundEnd` into colocated files; orchestrator stays as
  `resolveCombatRound`. Public contract unchanged.

### Phase 16 — Migrate sibling tests into `src/<Module>/e2e/`
- promoted: 2026-05-14 (oversight)
- source: critique pass-1 (Z-LOW 1.2 in AUDIT.md)
- summary: Move `*.test.ts` files in Effects/Enemy/Utils/World/Character/NPCs
  into `<Module>/e2e/<feature>.engine.test.ts`. Mechanical; no logic changes.
- decision: chose "migrate" over "broaden bearings".

### Phase 17 — Unify CLI surface
- promoted: 2026-05-14 (oversight, user request)
- source: oversight (CLI testing harness initiative)
- summary: Drop `combat`, `character`, `auto:combat` scripts; delete
  `combat.cli.ts`, `character.cli.ts`, `automation/combat-test.py`. Single
  entry: `npm run game`. Combat reached via Map encounters and the Spawn
  Encounter tab from Phase 19.

### Phase 18 — Preset character roster
- promoted: 2026-05-14 (oversight, user request)
- source: oversight (CLI testing harness initiative)
- summary: `src/Character/preset-roster.ts` with ≥4 progression tiers
  (`fresh-L1`, `mid-L5`, `late-L10`, `endgame-L15`). Roster picker at boot.
  Hermetic e2e validates each preset's internal consistency.

### Phase 19 — Enemy spawn picker
- promoted: 2026-05-14 (oversight, user request)
- source: oversight (CLI testing harness initiative)
- summary: Spawn Encounter debug tab — list enemies by tier, pick one,
  drop into combat against the active preset.

### Phase 20 — Scripted / agent-driven CLI mode
- promoted: 2026-05-14 (oversight, user request)
- source: oversight (CLI testing harness initiative)
- summary: `--script <path>` (JSON plan, deterministic replay via Phase 11
  RNG), `--json-events` (structured stdout for LLM agent parsing), stdin
  one-action-per-line mode for live agent control.

---

## Rejected

(Empty.)
