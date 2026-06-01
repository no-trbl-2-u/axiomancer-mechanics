# ADR-0002 — Skills are known, not equipped

Status: Accepted  
Date: 2026-06-01  
Scope: axiomancer-mechanics

## Decision

Skills are learned/unlocked through `knownSkills`; they are not player-equipped loadout slots. Combat surfaces should show only currently affordable unlocked skills.

## Context

T corrected the old model after manual playthrough evidence showed learned skills blocked by equipped-skill assumptions. The intended doctrine is learned access plus resource affordability.

## Consequences

- `knownSkills` is the learned catalogue.
- `equippedSkills` is legacy implementation debt and must not be treated as player-facing doctrine.
- Combat policies and UI consumers filter known skills by affordability through engine resource checks.
- Legacy saves may merge old equipped-skill values into known skills during normalization/migration.

## Links

- Phase 99 — Unlocked skill access, no equipped-skill gate
