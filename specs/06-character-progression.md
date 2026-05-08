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
   > Your answer:

2. **XP rewards per enemy.** A function of:
   - Enemy `level`.
   - `difficulty` (`simple`/`normal`/`elite`/`boss`/`unique`).
   - Encounter outcome (combat win, friendship win, flee).
   What's the formula? Suggested default: `level × difficultyMultiplier`,
   where simple=10, normal=20, elite=50, boss=200, unique=500. Friendship
   wins grant 50% XP.
   > Your answer:

3. **Stat points per level.** How many? Cap per stat? Default proposal:
   - 3 stat points per level.
   - No cap until level cap (TBD per Q5).
   > Your answer:

4. **Resource refill.** On level up, restore HP/MP to new max?
   - (A) Yes, full refill.
   - (B) Add the delta only (so you don't get a "free heal" by leveling).
   - (C) No refill at all.
   > Your answer:

5. **Level cap.** Hard cap (e.g. 20)? Soft (XP curve becomes punishing)?
   None?
   > Your answer:

6. **Character `id`.** Knowledge-Gap 12: Enemies have `id` but Character
   doesn't. `ActiveEffect.sourceId` references the applier. With one PC,
   is `sourceId` even needed? Decision:
   - (A) Add `Character.id` (uniformity, future multi-char support).
   - (B) Use a constant `'player'` string for `sourceId` from the player.
   - (C) Drop `sourceId` for player-applied effects entirely.
   > Your answer:

7. **Skill learning gate.** Is "level up" the only way to learn a skill,
   or also via shops / quests / NPCs?
   > Your answer:

8. **Allocation timing.** When the player levels up:
   - (A) Stat points and skill picks must be made immediately (blocks the
     game until done).
   - (B) Earned points sit in `availableStatPoints` and can be spent at any
     time via the character CLI.
   > Your answer:

9. **Multi-level catch-up.** If a single XP grant pushes through multiple
   level thresholds, do you level up once or repeatedly until XP is below
   the next threshold?
   > Your answer:

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
