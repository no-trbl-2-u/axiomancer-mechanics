# CLAUDE.md

Canonical agent guidance lives in **`agents.md`** (read it top to bottom before
touching files) and **`VISION.md`** (game doctrine). This file exists so the
load-bearing doctrine is always in context.

## Load-bearing doctrine (set 2026-06)

**Status effects are the MAIN fun and the most engaging aspect of combat encounters.**

Every balance decision, tuning run, content addition, and skill/effect design is
judged first by: *does this make applying and exploiting status effects more
central and more satisfying?* If a change makes basic-attack trading more
attractive than status-effect play, it works against the vision. Treat low
status-effect engagement as a balance failure even when win/loss rates look
healthy.

**Hazard-Pattern Combat (the ONLY combat system)** keeps status central: the
enemy's SOLE bar is HP, and status is the EFFICIENT way to drop it to 0 — DoT
erodes HP far faster than the deliberately weak basic strike, and control hinders
the enemy (it loses its telegraphed turn). **Updated 2026-06-22:** the old
two-Pressure-Track win model (DoT Erosion + Control Saturation as the only win
conditions) was REMOVED; HP is the sole win condition now (`isDefeated(enemy)`),
basic-attack trading is the weak baseline rather than absent. **Removed in
0.37.0:** the legacy turn-based `resolveCombatRound` system (and its dev-only
combat tab) is gone entirely — Hazard-Pattern is the only combat path. Tuned by
**`/combat-tuning`** (`skills/combat-tuning.md`, witness:
`simulateHazardPatternCombat`). It is LIVE in mobile map encounters and runs via
`npm run combat` (`src/CLI/combat.cli.ts`).

Canonical: `VISION.md` → Combat vision. Echoed in `plan/bearings.md`, `agents.md`
(standing rule 10), `AGENTS.md`, and the `combat-tuning` skill.

## Pointers

- Standing rules / loop wiring: `agents.md`
- Game vision & doctrine: `VISION.md`
- Standing context per tick: `plan/bearings.md`
- Commands: `package.json` (`npm run verify` is the gate)
- Skills: `skills/*.md` (+ `.claude/commands/*.md` wrappers) · Subagents:
  `.claude/agents/*.md`
