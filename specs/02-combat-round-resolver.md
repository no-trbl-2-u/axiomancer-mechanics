# Spec 02 — Combat Round Resolver

## Goal

Move the round resolution logic out of `src/CLI/combat.cli.ts` and into a pure
`resolveCombatRound(state): CombatState` function on the combat reducer, so any
client (current CLI, future React Native UI, automated tester) can run a round
without owning the math.

**Success state:** `combat.cli.ts` contains UI / IO concerns only, and one call
to `resolveCombatRound` advances state by one round. The function is
independently unit-tested with deterministic dice (a seeded RNG is in scope here
but tracked in Spec 11 for cross-cutting work).

## Why now / dependencies

- **Unblocks:** Spec 03 (T2/T3 procs need a single resolution site to plug into),
  Spec 04 (skills replace `attack` in the action pipeline), Spec 11 (assertion
  layer needs a deterministic round function), Spec 12 (UI consumers can drive
  state transitions without re-implementing the math).
- **Depends on:** Spec 01 ideally lands first so the resolver can use
  `processRoundStartEffects`, `canAct`, and `getActiveEffectModifiers`. If Spec 01
  isn't ready, the resolver can call the existing helpers (`applyRegen`,
  `clearTier1EffectsForStance`, `tickAllEffects`) and have a `// TODO Spec 01`
  marker for the new ones.

## Current state

- `combat.cli.ts` orchestrates the full round inline — input prompt, regen,
  Tier 1 application, attack roll, damage roll, thorns, buff strip/extend,
  tick, log.
- `combat.reducer.ts` exposes only state-shape mutations (`setPhase`,
  `setPlayerStance`, `setPlayerAction`, `appendLog`, `incrementFriendship`,
  `endCombat`).
- The roadmap explicitly tags `resolveCombatRound` as Phase 2c.

## Open questions

1. **Roll model.** Today the CLI uses a single roll contest (attacker roll vs
   attacker roll), with the higher roll winning, and the winner makes a separate
   damage roll. Should the resolver:
   - (A) Keep the single-contest model.
   - (B) Switch to attack roll vs. defense roll (D&D-style — defender always
     rolls, regardless of action).
   - (C) Hybrid: attack-vs-attack on simultaneous attack, attack-vs-defense
     when one defends.
   > Your answer:

2. **Damage formula.** Today `damageRoll` re-uses the attacker's attack stat as
   modifier and subtracts `defender.baseStat[defenderStance] × PASSIVE_DEFENSE_MULTIPLIER`.
   Options:
   - (A) Keep as-is.
   - (B) Introduce a separate "weapon damage" die (rolled once per action),
     stat scales as a flat add.
   - (C) `damage = attackRoll − defenseRoll`, no second roll.
   > Your answer:

3. **Defense base asymmetry.** When the player defends, defense uses
   `getBaseStat`; when the enemy defends, it uses `getDefenseStat` (derived).
   Bug or intentional?
   > Your answer:

4. **Initiative.** Today both combatants act simultaneously. Options:
   - (A) Keep simultaneous.
   - (B) Add `rollInitiative(combatant)` and resolve sequentially. Use luck or
     mind as tiebreaker.
   - (C) Simultaneous attacks resolve simultaneously, but skill / item actions
     happen before basic attacks.
   > Your answer:

5. **Lethality.** With the friendship mechanic and regen effects, the current
   tone leans forgiving; the Mörk Borg inspiration suggests swingy lethality.
   Picking a target average rounds-to-resolution helps with balance:
   - 3-5 rounds (Mörk-Borg-y, swingy)
   - 6-10 rounds (mid-weight)
   - 10+ rounds (drawn-out, attrition)
   > Your answer:

6. **What `resolveCombatRound` returns.** Should it return only the new
   `CombatState`, or `{ state, events: RoundEvent[] }` where `events` is a
   typed event stream the UI can consume?
   - The UI integration question (Spec 12) leans toward a typed event stream.
   - The simpler answer is "state only" with a single `BattleLogEntry` appended.
   > Your answer:

7. **`canAct` failure path.** If the player is stunned, what happens?
   - (A) Round still advances; player's action is silently no-op.
   - (B) Round still advances; CLI displays a "stunned" message instead of the
     player choice prompt.
   - (C) Player still chooses; the chosen action is replaced with a no-op
     once resolution starts.
   > Your answer:

## Proposed approach

1. **Lock down the round contract** — write a TypeScript signature for
   `resolveCombatRound(state, { playerOverride? }) → newState` and (per Q6)
   either a `RoundEvent` union or a single `BattleLogEntry`. Land this as a
   types-only commit so the rest of the work has somewhere to attach.
2. **Extract pure helpers from `combat.cli.ts`** — `performAttackRoll`,
   `performDefenseRoll`, `calculateBaseDamage`, `calculateDamageReduction`,
   `calculateAttackDamage`. Each gets unit tests.
3. **Implement `resolveCombatRound`** using the new helpers + Spec 01 hooks.
   Order matches `docs/combat.md` Round Flow: regen → clear T1 → apply T1 →
   resolve actions → tick. Return shape per Q6.
4. **Replace inline CLI logic** — `combat.cli.ts` becomes a thin loop:
   `prompt → state = resolveCombatRound(state) → render(state)`.
5. **Initiative** — only if Q4 picks (B) or (C); add `rollInitiative` and
   `determineTurnOrder` and route through the resolver.
6. **Battle-log helpers** — `createBattleLogEntry`, `formatAllBattleLogs`,
   `generateCombatResultMessage` so the CLI doesn't string-build manually.
7. **Tests:**
   - Unit tests for each helper with seeded RNG (use `vi.spyOn(Math, 'random')`
     until Spec 11 lands a real seed).
   - Integration test: 10 rounds with fixed inputs produces a stable transcript.

## Acceptance checklist

- [ ] All 7 questions answered.
- [ ] `resolveCombatRound` exported from `Combat/combat.reducer.ts` and re-exported
      from `src/index.ts`.
- [ ] `combat.cli.ts` calls `resolveCombatRound`; no inline math remains.
- [ ] Vitest covers happy paths plus stun, friendship win, KO, and player victory.
- [ ] `npm run combat:auto -- 20` produces stable logs without crashes.
- [ ] `docs/combat.md` "Pending (Phase 2)" section is shorter; new helpers are
      documented in the API table.

## Out of scope

- Tier 2/3 effect procs on action — Spec 03.
- Skill/item actions — Specs 04/05.
- Seeded RNG library — Spec 11.
