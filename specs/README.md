# Specs

> A focused planning surface so you (the developer) and an AI assistant can
> have a structured conversation about what to build next, in what order, and
> how. Each spec is scoped to one body of work, surfaces the open design
> decisions, and ends with a concrete acceptance checklist.

## Why this folder exists

`GAME-ROADMAP.md` lists *what* is left to do. `Knowledge-Gaps.md` lists *what
isn't decided*. Neither tells you *what to do next* or *how to start*. The
specs in this folder bridge that gap: each one is small enough to start work
from, structured around the decisions that block implementation, and tagged
with dependencies so you can pick the right one to pull next.

## Quick links

- **First time here?** Read [`00-how-to-use-specs.md`](./00-how-to-use-specs.md).
- **Back for another session?** Skip to the **Recommended order** table below.

## How to use a spec (the conversation loop)

Every spec follows the same shape:

1. **Goal & one-line summary** — what success looks like.
2. **Why now / dependencies** — what this unblocks; what blocks it.
3. **Current state** — what already exists in the code.
4. **Open questions to answer** — numbered, with `> Your answer:` placeholders.
   Answer in-place. The AI will read your answers as authoritative when it
   implements.
5. **Proposed approach** — the AI's recommended default if you don't
   override, broken into discrete commits.
6. **Acceptance checklist** — what "done" means.
7. **Out of scope** — explicitly deferred items.

### The conversation loop

```
1. Pick a spec from the recommended order below.
2. Read it end-to-end; skim sections (1)-(3).
3. Answer the questions in section (4) inline. Short answers are fine
   ("yes / no / option B"); add a note when you have a strong opinion.
4. Tell the AI: "Spec NN is ready, please implement."
5. The AI will:
   a. Re-read the spec.
   b. Confirm it has every answer it needs (asks if any are still TBD).
   c. Open a branch and work through the commits in section (5).
   d. Update section (6) as it goes; tick the boxes as commits land.
6. When the checklist is fully ticked, mark the spec [DONE] in this file
   and update the roadmap.
```

If a spec turns out to be too big once you start, say so — the AI will split
it into a follow-up spec rather than ploughing on.

## Recommended order

The order below is the AI's default suggestion. Items at the top unblock the
most other work. Feel free to override.

| # | Spec | Why this order |
|---|------|----------------|
| 1 | [`01-effects-engine-completion.md`](./01-effects-engine-completion.md) | Many roadmap items reference unwired effect mechanics (DoT, stat mods, action restrictions). Finish them first. |
| 2 | [`02-combat-round-resolver.md`](./02-combat-round-resolver.md) | Replaces the inline CLI loop with `resolveCombatRound`. Required before skills/items can plug in cleanly. |
| 3 | [`03-tier2-tier3-effect-procs.md`](./03-tier2-tier3-effect-procs.md) | Phase 2b: `Stance × action` proc tables. Builds on (1) + (2). |
| 4 | [`04-skills-engine.md`](./04-skills-engine.md) | Phase 3. Depends on (2) and (3) for combat integration. Ships types + engine only (no skill content). |
| 4b | [`04b-skills-library-and-e2e.md`](./04b-skills-library-and-e2e.md) | Companion to (4). Ships 12 early-game skills and the hermetic e2e scripted test. Depends on (4). |
| 5 | [`05-equipment-engine.md`](./05-equipment-engine.md) | Phase 4. Depends on (1) for stat-mod aggregation. |
| 6 | [`06-character-progression.md`](./06-character-progression.md) | Phase 5. Depends on (4) for skill learning. |
| 7 | [`07-enemy-content-and-ai.md`](./07-enemy-content-and-ai.md) | Phase 6. Depends on (3) for richer AI behaviour. |
| 8 | [`08-world-content-and-hazards.md`](./08-world-content-and-hazards.md) | Phase 7. Depends on (1) for hazard ticks while exploring. |
| 9 | [`09-game-loop-orchestration.md`](./09-game-loop-orchestration.md) | Phase 8. Top-level orchestration; depends on most of the above. |
| 10 | [`10-moral-difficulty-meter.md`](./10-moral-difficulty-meter.md) | Touches multiple systems; OK to spec early, implement after (8) and (9). |
| 11 | [`11-rng-seeding-and-test-harness.md`](./11-rng-seeding-and-test-harness.md) | Cross-cutting test infra. Doable any time; biggest payoff when (1) & (2) are landing. |
| 12 | [`12-package-architecture-and-events.md`](./12-package-architecture-and-events.md) | Defines the engine ↔ React Native UI boundary. Pull this in before the UI consumer starts. |

## Conventions

- A spec is a *living document*. As you answer questions, edit the spec
  in-place. Treat it as the canonical source-of-truth for that body of work.
- One spec, one branch, one PR — unless a spec explicitly chunks itself
  into commits that land separately.
- When a spec is fully implemented, append `> [DONE on YYYY-MM-DD — see PR #N]`
  at the top and link the PR.
- Don't be afraid to write `> Your answer: defer — implement default and
  revisit.` That's a valid answer too.
