# Spec 02 — Combat Round Resolver

## Goal

Promote the pure round resolver in `src/Combat/e2e/combat.engine.ts`
(`resolveCombatTurn`) into a first-class part of the combat module so any
client (the CLI, the future React Native UI, the automated tester) drives a
round through one entry point. Today the resolver exists for tests but the CLI
still owns its own parallel inline copy of the same flow.

**Success state:** `combat.cli.ts` contains UI / IO concerns only, and one call
to the resolver advances state by one round. The resolver is exported from
`src/Combat/index.ts` (and `src/index.ts`), and its behaviour is locked down by
the existing hermetic e2e suite plus any new cases this spec adds. Seedable
RNG is *not* part of this spec — it lives in Spec 11.

## Why now / dependencies

- **Unblocks:** Spec 03 (T2/T3 procs need a single resolution site to plug into),
  Spec 04 (skills replace `attack` in the action pipeline), Spec 11 (assertion
  layer needs a deterministic round function), Spec 12 (UI consumers can drive
  state transitions without re-implementing the math).
- **Depends on:** Spec 01 — **landed**. `processRoundStartEffects`,
  `processRoundEndEffects`, `canAct`, `getActiveEffectModifiers`,
  `getEffectiveStats`, `resolveEffectiveAdvantage` and the cleanse / dispel /
  drain / mana-regen helpers are all in `src/Combat/` and consumed by the
  existing engine + CLI code.

## Current state

- A pure resolver already exists: `resolveCombatTurn(state, playerAction,
  enemyAction): CombatState` at `src/Combat/e2e/combat.engine.ts`. It is the
  authoritative source covered by the hermetic e2e suite
  (`src/Combat/e2e/combat.engine.test.ts`).
- The function is **not** exported from `src/Combat/index.ts` or
  `src/index.ts`; only the test file imports it.
- `combat.cli.ts` still owns a parallel async copy of the same flow
  (`runCombatTurn`) that interleaves `console.log` / `inquirer` / `delay`
  with the math. The two implementations have to be kept in sync by hand.
- `combat.reducer.ts` still exposes only state-shape mutations (`setPhase`,
  `setPlayerStance`, `setPlayerAction`, `appendLog`, `incrementFriendship`,
  `endCombat`). It does **not** host the resolver today.
- Naming inconsistency: the spec was originally written around
  `resolveCombatRound`, but the function in code is `resolveCombatTurn`.
  Picking one name (and aliasing the other) is part of this spec.

## Open questions

> Note: questions marked **(de-facto answer in code)** already have a working
> implementation in `combat.engine.ts` / `combat.cli.ts`. Confirm or override —
> a confirmation locks the choice in; an override re-opens the work.

1. **Roll model.** **(de-facto answer: C — hybrid.)** Today
   `resolveAttackVsAttack` uses attack-vs-attack with the higher total winning,
   while `resolvePlayerAttackEnemyDefend` / `resolvePlayerDefendEnemyAttack`
   route the defender's roll through `getDefenseStat × DEFENSE_MULTIPLIERS[adv]`
   instead of contesting attacks. Options:
   - (A) Single-contest model everywhere.
   - (B) D&D-style — defender always rolls, regardless of action.
   - (C) **(current)** Hybrid: attack-vs-attack when both attack;
     attack-vs-defense when one defends.
   > Your answer:

2. **Damage formula.** **(de-facto answer: A — keep as-is.)** Today
   `damageRoll = die(attackerAdv) + attackerStat + rollMod`, then
   `calculateFinalDamage(damageRoll, baseDefense × multiplier, ...)`. Options:
   - (A) **(current)** Keep as-is.
   - (B) Introduce a separate "weapon damage" die (rolled once per action),
     stat scales as a flat add.
   - (C) `damage = attackRoll − defenseRoll`, no second roll.
   > Your answer:

3. **Defense base asymmetry.** Still present in code: when the player defends,
   defense uses `getBaseStat(player, stance) + defenseDelta`; when the enemy
   defends, it uses `getDefenseStat(enemy, stance)` (derived). Bug or
   intentional? Resolving this is a prerequisite for symmetric balancing.
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

6. **What the resolver returns.** **(de-facto answer: state-only.)** Today
   `resolveCombatTurn` returns just `CombatState`; the CLI prints inline,
   nothing is logged. Options:
   - (A) **(current)** Return state only — UI / CLI compute their own
     rendering from the diff.
   - (B) Return `{ state, events: RoundEvent[] }` where `events` is a typed
     event stream the UI can consume (this is also Spec 12 Q5).
   > Your answer:

7. **`canAct` failure path.** **(de-facto answer: hybrid B/C — round
   advances; CLI surfaces the reason; the chosen action is mapped to
   `'skip'` during resolution.)** Today the CLI prompts for stance/action,
   then calls `canAct(effects, requestedStance)`; if the result is
   `canAct: false`, the action becomes `'skip'` and `printTurnSkipped` /
   `printForcedStance` renders the reason. Options:
   - (A) Round advances; player's action is silently no-op.
   - (B) Round advances; CLI displays the reason instead of the choice prompt.
   - (C) **(current)** Player still chooses; the chosen action is replaced
     with `'skip'` once resolution starts, and the reason is rendered.
   > Your answer:

8. **Resolver naming + location.** Pick the canonical name and home:
   - (A) Rename `resolveCombatTurn` → `resolveCombatRound`, move it to
     `src/Combat/combat.reducer.ts`, alias the old name for back-compat.
   - (B) Keep `resolveCombatTurn`, lift it from `src/Combat/e2e/` to
     `src/Combat/` (engine logic should not live under `e2e/`).
   - (C) Keep both files; export `resolveCombatTurn` from `src/Combat/index.ts`
     where it currently lives.
   > Your answer:

## Proposed approach

1. **Pick the resolver's canonical name + home (Q8)** and move the existing
   `resolveCombatTurn` accordingly. Export it from `src/Combat/index.ts` and
   re-export from `src/index.ts`. Leave the e2e test file pointed at the new
   path.
2. **Unify the CLI's `runCombatTurn` with the engine.** Replace the inline
   math in `combat.cli.ts` with calls to the resolver, keeping only the
   prompt / render / delay scaffolding. The display module
   (`combat.display.ts`) is the right place for any new "render this slice
   of the round" helpers; the resolver should not log.
3. **(Optional) Resolve Q3.** If the answer flips the player-defense path
   from base to derived, update `resolvePlayerDefendEnemyAttack` and the
   sibling helper in the engine; add a regression test asserting the
   symmetric outcome.
4. **(Optional) Initiative (Q4)** — only if (B) or (C). Add
   `rollInitiative(combatant)` and `determineTurnOrder` and route through
   the resolver.
5. **(Optional) Event stream (Q6 → B)** — only if Q6 flips. Define
   `RoundEvent` union, change the resolver to return `{ state, events }`,
   port the CLI rendering to consume events. Coordinate with Spec 12 Q5.
6. **Tests:**
   - Extend `combat.engine.test.ts` to cover any new branches introduced
     (initiative, stun-only round, forced-stance round, blocked-stance
     round). Use `mockAlternatingRng` / `mockFixedRng` from
     `src/test-utils/rng.ts`.
   - Add a regression assertion that the CLI loop and the engine produce
     the same final `CombatState` for a fixed action script (no engine /
     CLI drift).

## Acceptance checklist

- [ ] Q3, Q4, Q5, Q8 answered. Q1, Q2, Q6, Q7 either confirmed (lock the
      current behaviour) or overridden (open a sub-task).
- [ ] Resolver exported from `src/Combat/index.ts` and `src/index.ts` under
      the name picked in Q8.
- [ ] `combat.cli.ts` `runCombatTurn` delegates to the resolver — no inline
      attack / damage math remains.
- [ ] Hermetic e2e suite under `src/Combat/e2e/` covers the same win
      conditions plus any new branches added by this spec; `npm test` and
      `npm run type-check` clean.
- [ ] `npm run auto:combat -- 20` produces stable logs without crashes.
- [ ] `docs/combat.md` "Pending (Phase 2)" section reflects reality;
      resolver is in the API table.

## Out of scope

- Tier 2/3 effect procs on action — Spec 03.
- Skill/item actions — Specs 04/05.
- Seeded RNG library — Spec 11.
