# Spec 06 — Character Progression

## Goal

Earn XP from combat, level up, allocate stat points, and learn skills. The
existing `experience` / `experienceToNextLevel` fields plus `EXPERIENCE_PER_LEVEL`
constant are wired to character creation but no XP is ever granted at
runtime.

**Success state:** Defeating an enemy in the CLI grants XP. Hitting the
threshold prompts a level-up flow that increments `level`, restores HP/MP to
new max values, grants stat points to allocate, and offers eligible skills
to learn.

## Why now / dependencies

- **Unblocks:** longer-term progression in the CLI, Spec 08 (quest XP rewards).
- **Depends on:** Spec 04 for skill learning to be meaningful. Can land
  before Spec 04 by stubbing the skill-learning step.

## Current state

- `createCharacter` initialises `experience` and `experienceToNextLevel`.
- No `levelUp`, `grantExperience`, `allocateStatPoint` functions exist.
- `Character` has no `availableStatPoints`, `knownSkills`, or
  `equippedSkills`.
- The combat CLI never references the player's XP after combat ends.
- Character CLI exists but is a builder, not a progression UI.

## Open questions

1. **XP curve.** Linear `level × 1000` (current default) is forgiving;
   exponential is grindy. Pick:
   - (A) Linear — `level × EXPERIENCE_PER_LEVEL`.
   - (B) Quadratic — `level² × C`.
   - (C) Polynomial — `C × level^1.5`.
   - (D) Hand-tuned table.
   > Your answer: (A) Linear. `src/Game/game-mechanics.constants.ts` ships
   > `EXPERIENCE_PER_LEVEL = 1000`, and both `createCharacter` in
   > `src/Character/index.ts` and `applyLevelUps` in
   > `src/Game/game.reducer.ts` set `experienceToNextLevel = level *
   > EXPERIENCE_PER_LEVEL`. No exponent, no table. Re-tune to (B) or (C)
   > later by adjusting the threshold formula in one place
   > (`game.reducer.ts:91`).

2. **XP rewards per enemy.** A function of:
   - Enemy `level`.
   - `difficulty` (`simple`/`normal`/`elite`/`boss`/`unique`).
   - Encounter outcome (combat win, friendship win, flee).
   What's the formula? Suggested default: `level × difficultyMultiplier`,
   where simple=10, normal=20, elite=50, boss=200, unique=500. Friendship
   wins grant 50% XP.
   > Your answer: Adopted verbatim for the kill-win case.
   > `DEFAULT_XP_BY_DIFFICULTY` in `src/Enemy/index.ts` is exactly
   > `{ simple: 10, normal: 20, elite: 50, boss: 200, unique: 500 }`, and
   > `createEnemy` falls back to `level × DEFAULT_XP_BY_DIFFICULTY[difficulty]`
   > when an enemy author doesn't override `xpReward`. The friendship-win
   > 50% bonus was NOT implemented: `endCombat` in `src/Game/store.ts`
   > only grants XP when `outcome === 'victory'`, and a friendship-counter
   > exit currently reports as `'flee'` (so 0 XP). Re-route that path
   > through a `friendship` outcome with a 0.5× multiplier when it
   > matters; until then friendship is its own reward.

3. **Stat points per level.** How many? Cap per stat? Default proposal:
   - 3 stat points per level.
   - No cap until level cap (TBD per Q5).
   > Your answer: Deferred — not yet implemented. The `Character`
   > interface in `src/Character/types.d.ts` carries no
   > `availableStatPoints` field, and `applyLevelUps` in
   > `src/Game/game.reducer.ts` only touches `level`, `maxHealth`,
   > `health`, and `experienceToNextLevel`. Stat allocation is a
   > deliberate Spec 06 follow-up that has not shipped. When it does, the
   > 3-points-per-level proposal is the right starting point because
   > derived stats use multipliers up to 4× (TEST) — a 1-pt/level cadence
   > would be too slow to feel.

4. **Resource refill.** On level up, restore HP/MP to new max?
   - (A) Yes, full refill.
   - (B) Add the delta only (so you don't get a "free heal" by leveling).
   - (C) No refill at all.
   > Your answer: (A) Yes, full refill — for HP. `applyLevelUps` in
   > `src/Game/game.reducer.ts:90` sets `health: maxHealth` after
   > recomputing `maxHealth` from the new level. MP is N/A per Spec 01 Q9
   > (mana abstraction was dropped; combat resources don't survive
   > between fights). The free-heal-by-leveling concern is real but the
   > XP curve makes it self-limiting at high level (the next-level
   > threshold scales linearly).

5. **Level cap.** Hard cap (e.g. 20)? Soft (XP curve becomes punishing)?
   None?
   > Your answer: None today. `applyLevelUps` is an uncapped `while`
   > loop (`game.reducer.ts:83`) that keeps incrementing level as long
   > as `experience >= experienceToNextLevel`. The linear curve gives a
   > soft pressure (1000 XP for L2, 15000 cumulative for L15) but there
   > is no hard cap. The Sage preset already ships at level 15 and the
   > existing enemy library tops out at level 8 (Disagreement) — so the
   > effective ceiling under normal play is around L15-L20, set by
   > content rather than code. Add an explicit `MAX_LEVEL` constant when
   > content scales past that band.

6. **Character `id`.** Knowledge-Gap 12: Enemies have `id` but Character
   doesn't. `ActiveEffect.sourceId` references the applier. With one PC,
   is `sourceId` even needed? Decision:
   - (A) Add `Character.id` (uniformity, future multi-char support).
   - (B) Use a constant `'player'` string for `sourceId` from the player.
   - (C) Drop `sourceId` for player-applied effects entirely.
   > Your answer: Deferred — the `Character` interface in
   > `src/Character/types.d.ts` still ships no `id` field, and the
   > project's `plan/PHASE_CANDIDATES.md` still lists "Character.id field
   > for stable identity" as a Pending candidate. Effectively the engine
   > behaves as if (B) is in force without it being a constant —
   > `state.player` is the singleton character and consumers reference
   > it directly. Spec 23's MapEvents + Phase 21's typed events both
   > assume the singleton. Promote (A) when multi-character (party /
   > reincarnation arcs) shows up in scope.

7. **Skill learning gate.** Is "level up" the only way to learn a skill,
   or also via shops / quests / NPCs?
   > Your answer: Neither today. There is no `learnSkill` function in
   > `src/Character/` or `src/Skills/`; `knownSkills` is populated only
   > at character-creation time via the preset (see
   > `src/Character/presets.ts` — apprentice gets T1, wanderer gets
   > T1+T2, sage gets T1+T2+T3). The skill library does carry
   > `learningRequirement` typing
   > (`src/Skills/types.d.ts:172`), so the gating shape is there; the
   > runtime path is the missing piece. When it ships, levelling should
   > only unlock skills the player has met the requirement for (read
   > from the library), with shops / quests / NPCs as alternate routes.

8. **Allocation timing.** When the player levels up:
   - (A) Stat points and skill picks must be made immediately (blocks the
     game until done).
   - (B) Earned points sit in `availableStatPoints` and can be spent at any
     time via the character CLI.
   > Your answer: Moot today (no allocation flow exists per Q3 + Q7),
   > but when it ships, (B) is the right shape. The game-loop CLI in
   > `src/CLI/game.cli.ts` is a tab-based loop with no modal-blocking
   > flows, and adding a forced level-up screen would break the
   > scripted-walkthrough harness (Phase 26) by inserting a prompt
   > whose answer can't be pre-known. Deferred allocation via the
   > Character tab keeps the loop scriptable and lets the player
   > re-spec across multiple level-ups.

9. **Multi-level catch-up.** If a single XP grant pushes through multiple
   level thresholds, do you level up once or repeatedly until XP is below
   the next threshold?
   > Your answer: Cascade — keep levelling until XP is below the next
   > threshold. `applyLevelUps` in `src/Game/game.reducer.ts:81-95` is a
   > `while (next.experience >= next.experienceToNextLevel)` loop that
   > bumps `level`, recomputes `maxHealth`, raises the threshold, and
   > refills HP each iteration. A single boss-kill that grants 500 XP at
   > L1 happily promotes the player from L1 to L2 with one report event,
   > though the CLI only emits one `character:levelup` event per call —
   > something to revisit when stat allocation lands (Q3/Q8).

## Proposed approach

1. **`grantExperience(character, amount): Character`** — adds XP, does not
   auto-level (returns the same character with bumped XP). Per Q9, expose
   `levelsGained(character)` to detect threshold crossings.
2. **`levelUp(character): Character`** — bumps level, re-derives stats per
   Q4, grants stat points per Q3.
3. **`allocateStatPoint(character, stat: 'body'|'mind'|'heart'): Character`**
   — decrements `availableStatPoints`, increments `baseStats`, re-derives
   `derivedStats`.
4. **`Character.availableStatPoints`, `knownSkills`, `equippedSkills`,
   optional `id`** added per Q6.
5. **`getAvailableSkills(character): Skill[]`** — filters the skill library
   by `learningRequirement`.
6. **`learnSkill(character, skillId): Character`** + reducer integration.
7. **Combat reward hook** — after `endCombat`, if the player won, call
   `grantExperience(player, xpReward(enemy, outcome))` and surface the
   result to the CLI.
8. **Character CLI** extended with a "Level up" tab when
   `availableStatPoints > 0` or new skills are unlockable.
9. **Tests** — XP curve, multi-level-up, stat allocation respect caps,
   skill learning gate.

## Acceptance checklist

- [ ] All 9 questions answered.
- [ ] Defeating Disatree in the CLI grants XP visible after combat.
- [ ] Hitting the XP threshold triggers a level-up flow per Q8.
- [ ] Allocating a stat point updates `derivedStats` (verified in CLI display).
- [ ] `docs/character.md` "Pending" section drained; replaced with the new
      progression API.

## Out of scope

- Multiplayer / multiple PCs.
- Prestige / NG+ — not yet on the roadmap.
- Equipment as level-up reward — handled by Spec 08 (loot drops, shops).
