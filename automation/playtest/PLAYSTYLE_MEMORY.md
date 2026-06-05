# Playstyle Memory — Axiomancer Playtest Policies

> This file is the standing doctrine for automated playstyles. When mechanics, skills, enemies, resources, statuses, mercy, or action economy change, update these memories before tuning pass/fail numbers. The policy code in `src/Playtest/policies.ts` is the executable witness; this file is the strategic memory those witnesses should preserve.

## Purpose

The playtest policies are not mechanics. They are automated player witnesses.

They should maximize their own style under the current rule set so balance evidence says something true about the game:

- If AGGRESSIVE fails, direct pressure is weak or unclear.
- If DEFENSIVE fails, survival tools are weak or clocks are too cruel.
- If MIXED fails, ordinary varied play is under-supported.
- If STRATEGIST fails, the intended skill/status mastery path is not viable enough.

Do not weaken a playstyle to make numbers prettier. If a policy is exploiting a real degenerate mechanic, record that as design evidence. If the policy is simply playing stupidly, improve the policy memory/code before judging the mechanics.

## Shared laws

All playstyles should:

1. Use only legal player actions available from combat state.
2. Prefer victory when their style is victory-oriented.
3. Keep friendship/mercy/capture outcomes separate unless the policy is explicitly a mercy policy.
4. Exploit opened mercy states into victory unless the policy is `friendship` or `mercy`.
5. Re-read current skill/resource/status affordances after major mechanics changes.
6. Avoid hardcoding one enemy unless the branch is explicitly keyed to authored enemy mechanics such as `befriendabilityConfig`.
7. Treat timeouts as failure unless the specific test is about stalling.

## Current target gates

For the canonical Axiomancer tuning loop:

- Aggregate ACTUAL win rate: 65–75%.
- STRATEGIST actual win rate: at least 80%.
- AGGRESSIVE / DEFENSIVE / MIXED actual win rate: at least 65% each.
- Mercy/friendship/capture evidence is tracked separately and does not satisfy actual-win gates.

The canonical late-game Coastal Tyrant probe gives each playstyle 25 runs. Count gates are therefore: aggregate 65–75 wins out of 100, STRATEGIST at least 20/25, and AGGRESSIVE / DEFENSIVE / MIXED at least 17/25 each.

## AGGRESSIVE memory

Role: prove that direct offensive pressure can win without being the best or most expressive route.

Current strategy:

- Prefer damage and tempo.
- Use affordable offensive skills immediately when available.
- Default to body attack when no useful skill is available.
- Exploit mercy openings into victory rather than sparing.
- Do not turtle, stall, or spend turns on setup unless the setup directly increases damage soon.

Healthy evidence:

- Clears the 65% floor, but should generally trail STRATEGIST.
- Uses mostly attack/skill actions.
- Wins by damage and pressure.

Warnings:

- If AGGRESSIVE times out with enemy HP near zero, check maxRounds and offensive action priority before weakening the enemy.
- If AGGRESSIVE dominates STRATEGIST, status/skill mastery may not matter enough.

## DEFENSIVE memory

Role: prove that survival play can endure and eventually win without becoming an immortal bunker.

Current strategy:

- Use healing items when HP is meaningfully threatened.
- Defend at low HP.
- Defend when meaningfully pressured and about every fourth round even when safe to represent cautious play.
- Attack or use available pressure only enough to eventually resolve combat; DEFENSIVE must not close faster than AGGRESSIVE in the same boss probe.
- Exploit mercy openings into victory unless explicitly running a mercy policy.

Healthy evidence:

- Clears the 65% floor.
- Has longer average rounds than AGGRESSIVE and STRATEGIST.
- Does not sit at 100% win rate across boss probes unless the encounter is intentionally safe.

Warnings:

- 100% DEFENSIVE win rate can mean bunker degeneracy.
- High timeout with low incoming damage means the policy is too passive or the encounter lacks anti-stall pressure.

## MIXED memory

Role: prove that ordinary varied play can win: some pressure, some caution, some strategy.

Current strategy:

- Rotate through AGGRESSIVE, DEFENSIVE, and STRATEGIST witnesses.
- Inherit mercy-opening behavior from the selected substyle.
- Preserve variety rather than optimizing into a single dominant loop.

Healthy evidence:

- Clears the 65% floor.
- Usually lands between AGGRESSIVE/DEFENSIVE and STRATEGIST.
- Shows action and stance variety without becoming random noise.

Warnings:

- If MIXED fails while specialists pass, the game may demand overly narrow play.
- If MIXED dominates all specialists, its rotation may be accidentally exploiting a timing artifact.

## STRATEGIST memory

Role: witness the intended mastery path: skills, status effects, resources, synergies, authored openings, and consequence-aware resolution.

Current strategy:

- Prioritize useful skills over basic attacks when their strategic value is high.
- Prefer skills with combat effects, synergies, special mechanics, or satisfied predicates.
- Consider enemy HP, player HP, buffs, debuffs, and resources.
- Do not cast Befriend before the authored HP gate exists.
- Near a mercy HP gate, bank Heart if Befriend is known but not affordable.
- Once Befriend opens mercy, use it as evidence; non-mercy canonical tuning then exploits the opening into actual victory.
- Use items only when critically threatened.
- Build resources when low instead of blindly attacking.

Healthy evidence:

- Clears the 80% floor.
- Beats or equals brute-force lines in reliability.
- Shows skill, resource, status, and authored-opening evidence.

Warnings:

- If STRATEGIST is low, inspect whether it sees unlocked skills, affordable resources, status states, and mercy gates correctly before changing mechanics.
- If STRATEGIST wins only by body attacks, it is not proving mastery.
- If STRATEGIST never uses mind/heart/status tools when they exist, update policy memory/code before claiming the mechanics failed.

## MERCY / FRIENDSHIP memory

Role: prove nonlethal authored routes separately from actual-win tuning.

Current strategy:

- `friendship`: heart stance and defend to maximize friendship counter.
- `mercy`: damage until the authored HP gate, then build Heart and cast Befriend, then spare.
- `mercy-exploit`: same opening path, but exploit instead of spare to prove the consequence fork.

Healthy evidence:

- Befriend attempts occur only when gates are real.
- Successful Befriend creates explicit spare/exploit choice evidence.
- Spare outcomes and exploit outcomes are separately visible in reports.

Warnings:

- Passive maxed counters should not automatically become nonlethal wins.
- Lowering an HP gate is not a complete fix if the route lacks resource commitment or meaningful choice.

## Update protocol

When mechanics change:

1. Read this file before interpreting playtest results.
2. Ask whether each policy is playing competently under the new rules.
3. If a policy is stale, update `src/Playtest/policies.ts` and this memory file together.
4. Then run the tuning loop and judge mechanics from evidence.
5. Record any durable policy-strategy change in `automation/playtest/BALANCE_LEDGER.md`.

The order matters. A stupid witness gives false testimony. The court should not hang the mechanics on it.
