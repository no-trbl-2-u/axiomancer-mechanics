---
description: Hazard-Pattern Combat (Spec 25) balance loop — drive the Monte-Carlo sim across enemies/seeds, A/B numeric changes to the pressure economy, deliver report + suggestions/changes via PR. For the legacy turn-based combat use /legacy-combat-tuning.
---

You are invoked under the `combat-tuning` skill — run one tuning tick
end-to-end for the **Hazard-Pattern Combat** (`resolveCombatPhase`; the legacy
turn-based combat has its own tuner, `/legacy-combat-tuning`). Read
`skills/combat-tuning.md` in full before doing anything else; it describes the
sim-evidence matrix (`simulateHazardPatternCombat`), the design targets, the
verify gate, the tunable surface (the constants in `src/Combat/combat.{threat,
dice,engine,pressure}.ts` + authored threat sequences — numeric only; the
pressure formula / loop / RPS ladder are propose-only), and the one-PR delivery.

North star: status effects are the ONLY win path (DoT Erosion + Control
Saturation). Tune for assembled-solution play — not single-card spam, not
HP-only attrition, both tracks live.

Deliver everything on ONE new branch + PR, ready for review. Never push to
`main`. Never auto-merge.

When invoked under `/loop`, the user is not present. Return cleanly after the
tick completes.

Argument: $ARGUMENTS
