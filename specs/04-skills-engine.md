# Spec 04 — Skills Engine

## Goal

Turn the existing `Skill` type into a usable system: a library of at least 18
skills (fallacies + paradoxes spread across body / mind / heart and Tier 1-3),
a runtime that lets a character learn, equip, and execute skills in combat, and
a mana economy that makes "use a skill" a meaningful choice vs. "basic attack".

**Success state:** From the combat CLI, choosing the `skill` action lets the
player pick from their equipped skills, pays the mana cost, runs the skill's
effect resolution, and logs the outcome. At least one paradox and one fallacy
in each stat alignment exist.

## Why now / dependencies

- **Unblocks:** Phase 5 (`learnSkill`), Phase 6 (enemy skill use), real combat
  variety.
- **Depends on:** Spec 02 (resolver) — skills slot into the action pipeline.
  Strongly benefits from Spec 01 (so skill-applied stat mods etc. actually
  fire) and Spec 03 (skills can reference the same proc machinery).

## Current state

- `Skill` type exists with `id`, `name`, `description`, `category`,
  `philosophicalAspect`, `level`, `manaCost`, optional `learningRequirement`,
  optional free-text `damageCalculation` and `effect` fields.
- `Character` has neither `knownSkills` nor `equippedSkills`.
- `Enemy.skills?` is typed but no engine consumes it.
- `Skills/skill.library.ts` was deleted in the audit; nothing replaces it.
- Mana exists on `Character` and `Enemy`, but no system spends it.

## Open questions

1. **Mana economy.** When does mana regenerate?
   - (A) Out of combat only (full restore on map node transition).
   - (B) `+N` per round in combat (where N is small, e.g. 1-2).
   - (C) Tied to defending (defending regens mana).
   - (D) No regen — once spent, skills require resting.
   > Your answer:

2. **Basic attack mana cost.** Are basic `attack` / `defend` always free, or do
   high-tier basic actions cost something?
   > Your answer:

3. **Skill damage formula.** For damaging skills:
   - (A) `basePower + scalingStat × multiplier`.
   - (B) `dN + scalingStat` — dice-driven.
   - (C) `damageCalculation` is a string; engine eval-s a tiny DSL.
   > Your answer:

4. **`scalingStat` source.** Always the `philosophicalAspect`'s base stat? Or
   per-skill (e.g. a Heart skill that scales off Mind)?
   > Your answer:

5. **`combatEffects` integration.** Do skill-applied effects use the Spec 03
   machinery (resist roll, tier rules) or guarantee application like Tier 1?
   - Default proposal: same machinery, with the skill choosing whether to
     apply automatically (Tier 1-style) or via the resist contest.
   > Your answer:

6. **Targeting.** Skills declare `targetType`. The combat model is 1v1; do you
   keep `'self' | 'enemy' | 'all_enemies' | 'all_allies'` for future
   multi-combatant support, or simplify to `'self' | 'enemy'`?
   > Your answer:

7. **Skill slots.** How many skills can be `equippedSkills` at once?
   - (A) Fixed (e.g. 4).
   - (B) Scales with character level.
   - (C) Slot count tied to equipment (a "spellbook" item).
   > Your answer:

8. **Mid-combat swap.** Can the player swap equipped skills during a fight,
   or only outside combat?
   > Your answer:

9. **Learning gate.** `SkillLearningRequirement` already supports level + stat
   + prerequisite skill. Add a *moral alignment* gate (Spec 10) for
   alignment-locked skills, or keep the gate combat-stat-only?
   > Your answer:

10. **Skill tier semantics.** `Skill.level` is currently free-form. Should it
    be replaced/aliased with `tier: 1 | 2 | 3` to mirror effects, or kept as a
    progression number (1-10) independent of effect tier?
    > Your answer:

11. **Library breadth.** Roadmap says ≥18 skills. Suggested distribution:
    3 stats × 2 categories × 3 tiers = 18 entries. Or are paradoxes Tier 2/3
    only and fallacies Tier 1?
    > Your answer:

## Proposed approach

1. **Refine the `Skill` type** per Q3, Q5, Q6, Q10, plus add `tier`,
   `targetType`, `basePower`, `scalingStat`, `combatEffects`.
2. **Add `Character.knownSkills` and `Character.equippedSkills`** + factory
   defaults; reflect in `createGameStore`.
3. **Skill library** (`src/Skills/skill.library.{ts,json}`) — start with one
   skill per cell of `(stat × category × tier)` — at least 18.
4. **`createSkill(data): Skill`**, `canUseSkill(character, skill)` (mana,
   action restrictions, prereqs), `calculateSkillDamage(character, skill,
   advantage)`, `executeSkill(combatState, skillId): CombatState`.
5. **`learnSkill(character, skillId): Character`** + `equipSkill` /
   `unequipSkill` reducers.
6. **Wire `'skill'` into the resolver** (Spec 02) — when the player chooses
   `action: 'skill'`, the CLI prompts for a skill from `equippedSkills`,
   sets `playerChoice.skill`, and the resolver routes through `executeSkill`.
7. **Mana spend / regen** — per Q1, Q2.
8. **Tests:** unit per skill function, integration with the resolver,
   manual CLI smoke test.

## Acceptance checklist

- [ ] All 11 questions answered.
- [ ] ≥18 skills in the library covering the agreed distribution.
- [ ] Combat CLI shows a "Skills" sub-prompt when `action: skill` is chosen.
- [ ] Spending mana below cost prevents skill use with a clear message.
- [ ] At least one of: damage skill, debuff skill, buff skill demonstrably
      working in the CLI (video in the PR).
- [ ] `docs/skills.md` filled in: API table, formulas, library overview.

## Out of scope

- Enemy skill use — Spec 07.
- Skill purchasing in shops / quest rewards — Spec 08.
- Level-up flow that grants skill points — Spec 06.
