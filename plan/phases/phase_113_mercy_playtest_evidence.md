# Phase 113 — Mercy-loop playtest evidence + STRATEGIST witness

## Source

Glanton cleanup after SomberSoft doctrine alignment audit `~/Workspace/reports/audits/2026-06-04-sombersoft-doctrine-alignment.md`.

## Problem

Current playtest evidence does not reliably prove the new mercy loop. Policies can still over-measure defend/stall behavior and under-measure intentional Befriend casting, spare choice, exploit choice, and downstream consequences. STRATEGIST is too close to generic best-affordable-skill fallback.

## Scope

1. Add or update playtest policies/scenarios that explicitly exercise:
   - Befriend cast attempts;
   - spare/mercy choice;
   - exploit/free-critical choice;
   - downstream anti-exploit/faction consequences where available.
2. Strengthen STRATEGIST so it reads enemy state, status effects, combat resources, available skills, HP-gate proximity, and mercy opportunity rather than only picking best affordable skill.
3. Update playtest reports to separate:
   - victories;
   - defeats;
   - spare/friendship outcomes;
   - exploit outcomes;
   - timeouts;
   - Befriend attempts and failures.
4. Normalize docs/report wording to **65–75% resolution success**: victory plus friendship/mercy resolution, not raw win rate.
5. Add hermetic tests for new policy/report fields.

## Verification

- `npm run verify`
- `npm run playtest`
- Report before/after aggregate metrics in final commit message or phase closeout.

## Out of scope

- Core Befriend semantics changes. If Phase 112 has not shipped, this phase must either wait or explicitly note which legacy behavior remains.
