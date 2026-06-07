# CLAUDE.md

Canonical agent guidance lives in **`agents.md`** (read it top to bottom before
touching files) and **`VISION.md`** (game doctrine). This file exists so the
load-bearing doctrine is always in context.

## Load-bearing doctrine (set 2026-06)

**Status effects are the MAIN fun and the most engaging aspect of combat.**

Every balance decision, tuning run, content addition, and skill/effect design is
judged first by: *does this make applying and exploiting status effects more
central and more satisfying?* If a change makes basic-attack trading more
attractive than status-effect play, it works against the vision. Treat low
status-effect engagement as a balance failure even when win/loss rates look
healthy. The STRATEGIST playstyle is the witness for this path.

Canonical: `VISION.md` → Combat vision. Echoed in `plan/bearings.md`, `agents.md`
(standing rule 10), `AGENTS.md`, and the `mechanics-tuning` skill +
`balance-analyst` agent.

## Pointers

- Standing rules / loop wiring: `agents.md`
- Game vision & doctrine: `VISION.md`
- Standing context per tick: `plan/bearings.md`
- Commands: `package.json` (`npm run verify` is the gate; `npm run tune` runs the
  balance loop)
- Skills: `skills/*.md` (+ `.claude/commands/*.md` wrappers) · Subagents:
  `.claude/agents/*.md`
