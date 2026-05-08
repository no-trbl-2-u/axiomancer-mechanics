# Spec 07 — Enemy Content & AI

## Goal

A library of at least 15 enemies stretched across difficulty tiers, plus AI
strategies more interesting than `randomLogic`, plus an encounter system that
selects appropriate enemies for the current map node and player level.

**Success state:** `decideEnemyAction` does not always fall through to random.
The library is rich enough that the first continent's content can be filled
without the same enemy appearing twice. `generateEncounter(mapNode, playerLevel)`
returns a sensible enemy.

## Why now / dependencies

- **Unblocks:** Phase 7 (real exploration content), variety in
  `npm run combat`.
- **Depends on:** Spec 03 (proc machinery so enemies can use the same proc
  table), ideally Spec 04 (enemy skill use) — but the library can land first.

## Current state

- One enemy: `Disatree_01`, `random` logic.
- `EnemyLogic` union has 4 members (`random`, `aggressive`, `defensive`,
  `balanced`), but `decideEnemyAction` falls through to random for all.
- `EnemyDifficulty` union (`simple`, `normal`, `elite`, `boss`, `unique`)
  exists; nothing reads it.
- `Enemy.skills?` and `Enemy.loot?` are typed but unused.
- No encounter type or generator.

## Open questions

1. **AI heuristic shape.** For each non-random logic:
   - `aggressive` — what's "aggressive"? Suggested: pick attack 75% of the
     time, prefer the stance that has advantage over the player's last
     stance.
   - `defensive` — defend until HP > 50%, then attack with the stance the
     player is weakest in.
   - `balanced` — switch on HP threshold (attack while >50%, defend below).
   - `bossLogic` — a deterministic phase script (e.g. round 1: stance, round
     2: attack pattern, round 3: signature ability).
   Pick or override.
   > Your answer:

2. **Knowledge of the player.** AI logic functions currently take only the
   `enemy` (and through it, the action only). Should they receive the full
   `CombatState` so they can react to player choices / HP / effects?
   > Your answer:

3. **Strategic logic depth.** "Strategic" implies looking at the player's
   active effects and exploiting weaknesses (e.g. cast Body if the player
   has `debuff_vulnerability_body`). Worth doing in this spec, or defer?
   > Your answer:

4. **Proc-table parity.** Should enemies use the same Spec 03 proc table by
   default, with optional per-enemy overrides? (Mirrors `tier1Overrides`.)
   > Your answer:

5. **Encounter design.** `generateEncounter(mapNode, playerLevel)` returns
   what?
   - (A) Single `Enemy`.
   - (B) `Encounter { enemies: Enemy[], reward: Reward }` to set up future
     multi-enemy fights even if the engine is 1v1 today.
   > Your answer:

6. **Difficulty scaling.** When the encounter generator picks an enemy:
   - (A) Use the enemy's stored `level` as-is — content authored at fixed
     level.
   - (B) Scale enemy level to ±1 of player level — adaptive.
   - (C) Use difficulty meter (Spec 10) to bias.
   > Your answer:

7. **Loot tables.** Each enemy has a fixed `loot?: Item[]`. Or weighted
   drops?
   > Your answer:

8. **Library composition.** ≥15 enemies. Suggested split:
   - 3 simple, 6 normal, 3 elite, 2 boss, 1 unique.
   Stat alignment evenly across heart/body/mind. Override?
   > Your answer:

## Proposed approach

1. **`Encounter` type** per Q5; library by area.
2. **AI strategy rewrites** in `enemy.logic.ts` per Q1, Q2 (extend the
   signature if needed).
3. **`strategicLogic`** per Q3 — only if you opt in.
4. **Enemy library expansion** per Q8. Use the Coastal Continent maps as
   the home for the first batch.
5. **Loot tables** per Q7 — either inline `loot: Item[]` or
   `loot: LootTableEntry[]` with weights.
6. **`generateEncounter(mapNode, playerLevel)`** — pulls from the
   per-area encounter library; respects Q6.
7. **Hook into combat** — `store.startCombat(encounter)` accepts an
   encounter or an enemy (back-compat). `endCombat` + Spec 06 grants XP +
   loot.
8. **Tests** — AI choice distribution checks, encounter generator returns
   appropriate enemies, no log-only fallthroughs.

## Acceptance checklist

- [ ] All 8 questions answered.
- [ ] ≥15 enemies in the library, distributed as agreed.
- [ ] `decideEnemyAction` produces visibly different choices for each logic
      tag (verified by automated combat run).
- [ ] `generateEncounter` exposed and used by the combat CLI to pick the
      starting fight (instead of hard-coding Disatree).
- [ ] `docs/enemy.md` filled in with API + library overview.

## Out of scope

- Multi-enemy combat resolution — engine still 1v1.
- Boss phase scripting beyond "deterministic stance pattern" — defer if Q1
  picks the simple boss logic.
- Procedural enemy generation (random stats) — content-author-driven only.
