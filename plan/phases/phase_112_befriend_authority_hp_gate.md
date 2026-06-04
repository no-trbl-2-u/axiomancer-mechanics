# Phase 112 — Befriend authority + HP-gate doctrine hardening

## Source

Glanton cleanup after SomberSoft doctrine alignment audit `~/Workspace/reports/audits/2026-06-04-sombersoft-doctrine-alignment.md`.

## Problem

Mechanics has shipped Befriend as a Heart skill and mercy-choice surface, but legacy passive friendship resolution can still end combat through counter eligibility. That can bypass:

- spending/holding 5 Heart for Befriend;
- the explicit mercy-choice state;
- the doctrinal HP gate.

## Doctrine

CDR-0005 and ADR-0007 are active law: Befriend is the authoritative mercy path. The old both-defend friendship counter may remain only if it is explicitly renamed/documented as a separate doctrine, but it must not silently bypass Befriend or the mercy choice.

## Scope

1. Audit `src/Combat/index.ts`, combat reducer/store end-combat paths, Befriend skill handling, and `isFriendshipEligible` usage.
2. Make Befriend skill / mercy choice the authoritative friendship-resolution path.
3. Enforce HP-gate semantics consistently, or encode any exceptions explicitly in ADR/docs with tests.
4. Preserve anti-exploit consequences from Phases 109–110.
5. Add hermetic e2e coverage proving:
   - passive counter alone cannot bypass Befriend where doctrine forbids it;
   - successful Befriend opens spare/exploit choice;
   - spare and exploit outcomes still route to the right reports/consequences;
   - configured HP gates block/allow as expected.
6. Update `docs/combat.md`, ADR-0007, and CHANGELOG if behavior changes.

## Verification

- `npm run verify`
- `npm run deploy:check`
- Targeted Befriend/friendship e2e tests named in final report.

## Out of scope

- Mobile consumption of the engine contract.
- Balance tuning beyond parameters required to keep existing tests deterministic.
