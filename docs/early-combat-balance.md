# Early combat balance doctrine

> Design guidance from Tobin's early-combat review. This is a tuning brief,
> not an implemented spec. Use it before changing combat formulas, starter
> enemies, first-region encounters, or tutorial-facing combat affordances.

## Verdict

**Revise readability before buffing the player.**

The current combat skeleton is sound enough to teach from:

- stance triangle: `Heart > Body > Mind > Heart`
- attack contest: d20 + stance attack + roll modifiers
- equal-stat neutral contest: about 47.5% win / 5% tie / 47.5% loss
- equal-stat correct counter matchup: about 81.6% win when the player has
  advantage and the enemy has disadvantage
- defend: high resource generation and strong damage mitigation when the
  player reads the stance matchup correctly

Do not start by raising all starter stats or rewriting damage. A broad buff
teaches the player nothing. First fights should make the player see the rule,
choose the answer, and watch the numbers obey.

## Standing design order

When early combat feels too harsh, flat, or random, tune in this order:

1. **Expose the enemy's readable stance identity.**
   - Simple enemies should teach one lesson each.
   - Keep asymmetric starter stat blocks; do not flatten them into blandness.
   - The first region should introduce Heart / Body / Mind counters in an
     order where the player can infer the triangle.

2. **Improve preview and feedback before changing formulas.**
   - The UI should preview whether a stance is advantage / neutral /
     disadvantage before commitment.
   - After the round, the event/log layer should say why the result happened:
     stance matchup, rolls, damage, resource gain, friendship progress.

3. **Use early skills as interpretation, not raw power.**
   - A first doctrine skill should reveal, protect, or teach.
   - Avoid a starter nuke that bypasses the stance lesson.

4. **Make defend visible.**
   - Defend is already mechanically meaningful: it can reduce damage, generate
     stance resources, and advance friendship.
   - If the client does not show these benefits, players will read defend as a
     wasted turn.

5. **Gate enemy complexity.**
   - The first fights should mostly use basic attack / defend behavior.
   - Enemy skills, Tier 2+ procs, fallacy effects, and deep AI should enter
     only after stance, contest, defend, resources, and friendship are legible.

6. **Prefer graceful first defeat over silent punishment.**
   - A first-region defeat can teach without becoming resentment.
   - Recommended future pattern: return wounded, unlock a codex or aftermath
     hint, and explicitly name the failed matchup.

## Starter enemy posture

Current simple enemies already form a good teaching set:

- `TidepoolCrab`: Body-forward; teaches that Heart answers Body.
- `SeaMistWisp`: Mind-forward; teaches that Body answers Mind.
- `LullabyMoth`: Heart-forward; teaches that Mind answers Heart.

Keep these identities stark. If first combat is overtuned, adjust encounter
ordering, enemy behavior frequency, or tutorial signaling before mutating the
triangle itself.

## Recommended engine-facing work

1. **Add deterministic early-combat balance evidence.**
   - Simulate starter player policies against simple enemies.
   - Include policies such as random stance, always strongest stat, always
     counter enemy, defend when low HP, and friendship-seeking.
   - Report win rate, average rounds, damage taken, zero-damage turns,
     friendship completions, and defeats-before-understanding.

2. **Keep the resolver event stream rich.**
   - `RoundEvent` already carries attack rolls, matchup labels, damage rolls,
     damage-applied data, resource generation, and friendship events.
   - Preserve these fields; mobile needs them to teach the system.

3. **Do not hide balance behind undocumented constants.**
   - If formulas change, update `docs/quickstart-combat.md`, `docs/combat.md`,
     and any affected specs.

## Proof before implementation

Before merging a real balance change, provide one of:

- a hermetic engine e2e that proves the new teaching path through the public
  resolver/store surface
- a deterministic simulation report showing the early-game effect of the
  change
- a mobile presenter test proving advantage, defend value, resource gain, or
  friendship progress is shown to the player

The doctrine is simple: **the first combats should feel like learning a hostile
rule, not being granted charity.**
