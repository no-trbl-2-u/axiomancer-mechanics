# Spec 04b — Skills Library & E2E Test

## Goal

Build the early-game skill library (≥12 skills across all stat × category × tier
cells) using the resource cost system from Spec 04. Include a fully scripted
hermetic e2e test that walks through building resources via basic actions, firing
a Tier 1 skill, and verifying resource accounting and skill effects end-to-end.

**Success state:** After running Spec 04 then Spec 04b, a developer can open the
combat CLI, equip a skill, spend a round building Body resources via a body
attack, then fire "Ad Hominem Strike" and watch the resolver spend the resources,
strip an enemy buff, generate 1 Fallacy token, and emit the correct event stream.
The hermetic e2e test covers the same flow deterministically — no TTY, no disk,
no `Math.random`.

## Why now / dependencies

- **Depends on:** Spec 04 — all engine types and functions (`canUseSkill`,
  `spendResources`, `executeSkill`, `generateBasicActionResources`, etc.) must
  be complete and passing.
- **Unblocks:** Real combat variety for manual playtesting; Spec 07 (enemy skill
  use can import from the same library shape).

## Current state (after Spec 04)

- `Skill` type fully designed with `resourceCost`, `tier`, `basePower`, etc.
- Engine functions exist: `canUseSkill`, `spendResources`, `executeSkill`, etc.
- `CombatState.combatResources` exists and resets each combat.
- No skills exist in any library file.
- `Player` mock has `equippedSkills: []` — no skills equipped by default.

## Open questions

1. **Skill IDs.**
   > **Snake_case** strings (e.g. `ad_hominem_strike`), matching the existing
   effect library convention (`debuff_bleed`, `buff_haste`, etc.).
   Answer: Effects should be snake case, but skills should be kebab-case

2. **Damage multiplier constant.**
   > **0.5** (from `SKILL_STAT_MULTIPLIER` in `game-mechanics.constants.ts`).
   Keeps Tier 1 skill damage comparable to basic attacks. Revisit in
   playtesting.

3. **Philosophical resource generation per skill use.**
   > **Exactly 1 token**, regardless of skill tier. Simpler to reason about
   and easier to balance. Tier affects cost, not generation.

4. **Test fixture.**
   > **Dedicated `SkillTestPlayer` fixture** in `src/Skills/e2e/fixtures.ts`.
   Keeps the existing `Player` mock stable and gives the e2e test a character
   with `equippedSkills: ['ad_hominem_strike']` and base stats tuned for
   predictable damage calculations.

5. **Expand Test fixture.**
   > **Combat testing** needs a way to make sure that the various skills and effects can be tested and logged. The current issue is that combat is over very quickly (after a few basic actions). We will need a strategy to expand the current auto:combat testing to have more actions per run/simulation. We could maybe add an arg to the auto:combat to select the enemy and/or allow the combat simultation to select the enemy to simulate combate with. Furthermore, we should have an enemy with the lowest possible stats except for health (which would be high enough to allow for several rounds of combat). This is not locked-in, I'm open to any better strategy for this, I just want the skills/effects to be able to be tested through automation and tested manually via the CLI tool.
   >
   > **Answer (implemented):** Added a dedicated **`Sandbag_01`** enemy to
   > [`src/Enemy/enemy.library.ts`](../src/Enemy/enemy.library.ts): `level: 10`
   > with `baseStats: { body: 1, mind: 1, heart: 1 }`, which yields
   > `maxHealth = level × avg(body, heart) × 10 = 100` while keeping attack /
   > defence rolls at the floor. Combats with the Sandbag last long enough
   > to exercise Tier 1 → Tier 3 skill chains and multi-round effect ticks.
   >
   > To pick the opponent without code changes, the CLI and the auto-tester
   > both accept a slug from the new `ENEMY_REGISTRY` (`disatree`, `sandbag`):
   >
   > - **Combat CLI:** `COMBAT_ENEMY=sandbag npm run combat` (or
   >   `npm run combat -- --enemy=sandbag`).
   > - **`auto:combat`:** `python3 automation/combat-test.py <runs> [reaction] [action] [enemy]`
   >   — positional `[enemy]` accepts `disatree` / `sandbag`, and `-` skips
   >   any earlier positional slot (e.g.
   >   `python3 automation/combat-test.py 20 - - sandbag`).
   >
   > Spec 04b's e2e suite uses the same `Sandbag_01` fixture so the test
   > shares its conditions with the manual playtesting path.

## Early-game Skill Library

Minimum 12 skills. Two per cell of `(philosophicalAspect × category)` at Tier 1,
three Tier 2 resonance skills, and three Tier 3 philosophical-resource skills.

### Tier 1 — Single Stance Cost (6 skills)

Each Tier 1 skill costs 3 tokens of its `philosophicalAspect` color.
On use, generates 1 Fallacy token (fallacy category) or 1 Paradox token (paradox category).

| ID | Name | Aspect | Category | Cost | Target | basePower | scalingStat | Effect summary |
|---|---|---|---|---|---|---|---|---|
| `ad_hominem_strike` | Ad Hominem Strike | body | fallacy | `{ body: 3 }` | enemy | 8 | body | Deal damage + strip 1 random enemy buff |
| `false_dilemma` | False Dilemma | mind | fallacy | `{ mind: 3 }` | enemy | 4 | mind | Deal damage + apply 2-round confusion debuff |
| `appeal_to_pity` | Appeal to Pity | heart | fallacy | `{ heart: 3 }` | self | 0 | heart | Heal self for `heart × SKILL_STAT_MULTIPLIER × 4` |
| `achilles_gambit` | Achilles' Gambit | body | paradox | `{ body: 3 }` | enemy | 12 | body | Pure damage, no secondary effect |
| `liars_echo` | Liar's Echo | mind | paradox | `{ mind: 3 }` | enemy | 3 | mind | Deal damage + apply 2-round mind mark (+2 intensity) |
| `ship_of_theseus` | Ship of Theseus | heart | paradox | `{ heart: 3 }` | enemy | 0 | heart | Convert 1 random enemy buff into the same effect on the player |

### Tier 2 — Resonance Required (3 skills)

Each Tier 2 skill costs 2 tokens of two different colors; both must be held
(resonance condition is implicit in the multi-key `resourceCost`).
On use, generates 1 Fallacy or Paradox token per the skill's category.

| ID | Name | Category | Cost | Target | basePower | scalingStat | Effect summary |
|---|---|---|---|---|---|---|---|
| `mob_appeal` | Mob Appeal | fallacy | `{ body: 2, heart: 2 }` | enemy | 10 | body | Deal damage + heal self for `heart × SKILL_STAT_MULTIPLIER` |
| `undistributed_middle` | Undistributed Middle | paradox | `{ body: 2, mind: 2 }` | enemy | 8 | mind | Deal damage + apply 3-round mind mark debuff |
| `eternal_regress` | Eternal Regress | fallacy | `{ heart: 2, mind: 2 }` | enemy | 6 | heart | Apply two different Tier 2 debuffs simultaneously |

### Tier 3 — Philosophical Resource Required (3 skills)

Each Tier 3 skill requires both stance tokens and a Fallacy or Paradox token,
enforcing the chain: basic actions → Tier 1 skill → philosophical token → Tier 3 skill.
On use, generates 1 token of the opposing philosophical type (Fallacy → Paradox, Paradox → Fallacy),
enabling deep skill chains at late combat.

| ID | Name | Category | Cost | Target | basePower | scalingStat | Effect summary |
|---|---|---|---|---|---|---|---|
| `sorites_cascade` | Sorites' Cascade | paradox | `{ mind: 2, paradox: 1 }` | enemy | 5 | mind | Stacking bleed: 4 rounds, intensity 2 |
| `straw_giant` | Straw Giant | fallacy | `{ body: 3, fallacy: 1 }` | enemy | 18 | body | Damage that bypasses enemy defense entirely |
| `bootstrap_paradox` | Bootstrap Paradox | paradox | `{ heart: 2, paradox: 1 }` | self | 0 | heart | Restore HP equal to damage dealt this round |

## Proposed approach

1. **Create `src/Skills/skill.library.ts`** — exports `const skillLibrary: Skill[]`
   containing all 12 skills above, plus a `getSkillById(id: string): Skill | undefined`
   helper. No runtime logic, just data.

2. **Create `src/Skills/e2e/fixtures.ts`** — exports `SkillTestPlayer`: a
   `Character` with `equippedSkills: ['ad_hominem_strike']`,
   `knownSkills: ['ad_hominem_strike', 'achilles_gambit', 'sorites_cascade', 'straw_giant']`,
   and base stats high enough for predictable skill damage (`body: 10, mind: 8, heart: 6`).

3. **Wire `Ad Hominem Strike`'s buff-strip** in `executeSkill`: detect the
   `'strip_random_buff'` effect tag on the skill and call the existing
   `removeRandomBuff(enemy)` from `src/Combat/index.ts`. Pattern the other
   simple effects (`heal_self`, `apply_debuff`) the same way.

4. **Update `docs/skills.md`** — fill in the library overview table, document
   `ResourceCost` API, reference `skill.library.ts`, describe the 5-resource
   economy and resonance rules.

5. **Write hermetic e2e test** at `src/Skills/e2e/skill-resource-system.test.ts`
   (see scripted test below).

## Scripted E2E Test

File: `src/Skills/e2e/skill-resource-system.test.ts`

Follows the same hermetic conventions as `src/Combat/e2e/combat.resolver.test.ts`:
self-contained (no disk/network), deterministic (RNG mocked via `mockAlternatingRng`),
isolated (`vi.restoreAllMocks` in `afterEach`).

### Test scenarios

**Scenario 1 — Happy path: build resources then fire Tier 1 skill**

```
Setup:   initializeCombat(SkillTestPlayer, Disatree_01)
         mockAlternatingRng()  → player attack roll wins (high roll)

Round 1: playerAction = { stance: 'body', action: 'attack' }
         enemyAction  = { stance: 'heart', action: 'attack' }
         → player wins roll contest (body vs heart = body advantage)
         → generateBasicActionResources called with outcome: 'hit'
         → combatResources.body += 3

Assert:  state.combatResources === { heart:0, body:3, mind:0, fallacy:0, paradox:0 }
         combatEvents includes a resource-generation event for body:3

Round 2: playerAction = { stance: 'body', action: 'skill', skillId: 'ad_hominem_strike' }
         enemyAction  = { stance: 'heart', action: 'attack' }
         → canUseSkill passes (body >= 3)
         → skill damage applied to enemy HP
         → spendResources: body -= 3
         → generatePhilosophicalResource: fallacy += 1

Assert:  state.combatResources === { heart:0, body:0, mind:0, fallacy:1, paradox:0 }
         state.enemy.health < initial enemy health
         combatEvents includes a skill-execution event with skillId: 'ad_hominem_strike'
```

**Scenario 2 — Insufficient resources block skill use**

```
Setup:   initializeCombat(SkillTestPlayer, Disatree_01)
         No resource generation — combatResources all zero

Assert:  canUseSkill({ heart:0, body:0, mind:0, fallacy:0, paradox:0 }, adHominemStrike) === false
         resolveCombatRound with action:'skill' skillId:'ad_hominem_strike'
           → emits a 'skill-blocked' event (or equivalent)
           → combatResources unchanged
           → enemy HP unchanged
```

**Scenario 3 — Tier 3 gate enforced until philosophical resource exists**

```
Setup:   initializeCombat(SkillTestPlayer, Disatree_01)

Step A:  canUseSkill({ body:3, fallacy:0 ... }, strawGiant) === false
         (fallacy key missing)

Step B:  Fire a Tier 1 fallacy skill (ad_hominem_strike) — costs 3 body,
         generates 1 fallacy
         combatResources = { body:0, fallacy:1, ... }

Step C:  Build 3 body again (one hit round)
         combatResources = { body:3, fallacy:1, ... }

Assert:  canUseSkill({ body:3, fallacy:1, ... }, strawGiant) === true
```

### Event stream logging

Each scenario should assert on the `combatEvents` array returned by
`resolveCombatRound`, verifying that skill-related events are emitted with
the correct `phase` and actor data — following the same event-stream assertion
pattern in `combat.resolver.test.ts`. This confirms the CLI renderer will
receive the correct data even though the CLI itself (TTY / inquirer) is not
invoked hermetically.

## Acceptance checklist

- [x] All 5 open questions answered (done above).
- [x] `src/Skills/skill.library.ts` exports exactly 12 skills with no TypeScript errors.
- [x] All 12 skills have valid `resourceCost`, `tier`, `basePower`, `scalingStat`, `targetType`.
- [x] `src/Skills/e2e/fixtures.ts` exports `SkillTestPlayer` with `equippedSkills` populated.
- [x] `src/Skills/e2e/skill-resource-system.engine.test.ts` exists and all three scenarios pass.
      (Filename uses the workspace `.engine.test.ts` hermetic-suite suffix
      from `docs/testing.md`; content matches the spec's pseudocode.)
- [x] Scenario 1 (happy path), Scenario 2 (insufficient resources), and
      Scenario 3 (Tier 3 gate) are all covered.
- [x] `combatEvents` assertions verify skill events are emitted correctly
      (including the new `phase: 'skill', kind: 'blocked'` for Scenario 2 and
      `kind: 'buff-stripped'` for Scenario 1).
- [x] `npm test` and `npm run type-check` are clean (verified twice).
- [x] `docs/skills.md` updated with library overview table and resource economy summary.

## Implementation notes

- **Type extensions (`src/Skills/types.d.ts`):**
  - `SkillCombatEffects` gained optional `intensity` / `duration` overrides
    so skills like Liar's Echo (Tier 1 Mind Mark at intensity 2, 2 rounds)
    and Sorites' Cascade (intensity-2 Bleed) can lean on existing effect
    library entries without warping their definitions.
  - `Skill.scalingMultiplier` added (default 1) — multiplies the stat term
    of the damage / heal formula. Drives Appeal to Pity and Bootstrap Paradox.
  - `SkillSpecialMechanic` discriminated union added with `strip_random_buff`,
    `convert_enemy_buff_to_self`, `secondary_heal_self`, and a `bypass_defense`
    marker. Resolved in `executeSkill` after damage and after `combatEffects`.
- **Tier 3 token inversion:** `philosophicalCategoryFor(skill)` (in
  `skill.engine.ts`) returns the opposing category for Tier 3 skills so
  Fallacy → Paradox and Paradox → Fallacy late-combat chains keep flowing.
- **`skill-blocked` event:** the resolver now validates the skill before
  calling `executeSkill`. If the skill is unknown, not equipped, or
  unaffordable, the resolver emits a single
  `{ phase: 'skill', kind: 'blocked', skillId, reason }` event, skips the
  scenario phase, and returns with `combatResources` / HP untouched. UIs
  (CLI today, future React Native) render that as "you can't afford that yet".
- **CLI wiring (`src/CLI/combat.cli.ts`):** the live `skillLibrary` is now
  threaded through `lookupSkill`; the demo player gets the first four
  skills equipped on session start so the Skills sub-prompt is non-empty.
  Enemy selection follows `COMBAT_ENEMY=<slug>` / `--enemy=<slug>` and
  `ENEMY_REGISTRY` (per Q5).
- **`auto:combat` enemy selector:** `automation/combat-test.py` now accepts
  a fourth positional argument (`disatree` / `sandbag`), with `-` as a
  skip-this-slot sentinel so the existing `[reaction] [action]` arguments
  remain optional.

## Out of scope

- Skills beyond the early-game 12 — can grow in Spec 06 / 07.
- Tier 2+ enemy skills — Spec 07.
- Skill purchasing — Spec 08.
- Level-up skill grants — Spec 06.
- Moral alignment learning gates — Spec 10.
- Bootstrap Paradox's "restore HP equal to damage dealt" requires tracking
  round damage totals — shipped today as a flat heal via
  `scalingMultiplier: 4` (heart × 2). Re-visit once the resolver surfaces a
  per-round damage total (deferred alongside seedable RNG, Spec 11).
