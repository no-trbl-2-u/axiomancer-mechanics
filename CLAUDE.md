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

**Spec 25 — Hazard-Pattern Combat (the primary combat system, 2026-06-21)** makes
this STRUCTURAL: `resolveCombatPhase` is a card-and-dice driver where every verb
is a skill card and two Pressure Tracks (DoT Erosion + Control Saturation) are the
only practical win conditions — basic-attack trading no longer exists. Tuned by
**`/combat-tuning`** (`skills/combat-tuning.md`, witness:
`simulateHazardPatternCombat`). The legacy turn-based `resolveCombatRound` still
backs live encounters and is tuned by **`/legacy-combat-tuning`** — there the
STRATEGIST playstyle is the witness.

Canonical: `VISION.md` → Combat vision. Echoed in `plan/bearings.md`, `agents.md`
(standing rule 10), `AGENTS.md`, the `combat-tuning` + `legacy-combat-tuning`
skills, and the `balance-analyst` agent (legacy loop).

## Pointers

- Standing rules / loop wiring: `agents.md`
- Game vision & doctrine: `VISION.md`
- Standing context per tick: `plan/bearings.md`
- Commands: `package.json` (`npm run verify` is the gate; `npm run tune` runs the
  balance loop)
- Skills: `skills/*.md` (+ `.claude/commands/*.md` wrappers) · Subagents:
  `.claude/agents/*.md`
