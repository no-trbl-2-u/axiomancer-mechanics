# 01 — Build plan

> Style guardrails for every phase below. Always ship unit tests
> alongside code — never "add tests later". Every implementation
> lands with at least one hermetic e2e test (`*.engine.test.ts`).
> One commit per logical unit of work; only when
> `npm run type-check` and `npm test` are green for that increment.
> CLI files contain UI only — logic goes in resolver/reducer modules.

## Status (at-a-glance)

`/march`, `/ship-a-phase`, and (transitively) `/loop` read this
block to find the next phase. Format: `[ ]` pending → `[x]`
shipped (with commit hash).

**Already shipped (pre-loop, prior history):**
- [x] Spec 01 — Effects engine: DoTs, stat mods, action restrictions (pre-loop)
- [x] Spec 02 — Combat round resolver (`resolveCombatRound`) (pre-loop)
- [x] Spec 03 — Tier 2/3 effect procs (Stance × action tables) (pre-loop)
- [x] Spec 04 — Skills engine (types + engine, no content) (pre-loop)
- [x] Spec 04b — Skills library: 12 early-game skills + hermetic e2e (pre-loop)
- [x] Spec 05 — Equipment engine (types + engine, no content) (pre-loop)
- [x] Spec 05b — Equipment library: 50 pieces + 12 consumables (pre-loop)
- [x] Spec 05c — Item rarity (pre-loop)
- [x] Spec 05d — Modifier catalogue (pre-loop)
- [x] Spec 05e — Set items (pre-loop)
- [x] Spec 06 — Character progression (XP, levelling, skill learning) (pre-loop)
- [x] Spec 07 — Enemy content and AI (pre-loop)
- [x] Spec 08 — World content and hazards (pre-loop)

**Next up (autonomous loop's queue):**
- [x] Phase 09 — Game loop orchestration (`gameReducer`, full store wiring, `game.cli.ts`) (e6ce034)
- [x] Phase 10 — Moral/difficulty meter (choice tracking, alignment, difficulty scaling) (a6085c4)
- [x] Phase 11 — RNG seeding and test harness (seeded RNG, deterministic replays, full test harness) (a6b33f0)
- [x] Phase 12 — Package architecture and events (event surface, React Native adapter docs, clean barrel) (251dda9)
- [x] Phase 13 — ESLint fix (repair `eslint.config.mts`, add `@typescript-eslint` plugin correctly) (4f58f66)
- [x] Phase 14 — Story content foundation (NPC types + first named NPC with moral dialogue) (846f968)
- [ ] Phase 15 — Split `combat.resolver.ts` into per-phase helpers (round-start, action-restriction, advantage, stance-effects, scenario, round-end)
- [ ] Phase 16 — Migrate sibling tests into `src/<Module>/e2e/` for layout consistency
- [ ] Phase 17 — Unify CLI surface (drop `combat` + `character` + `auto:combat` scripts; single `npm run game` entry)
- [ ] Phase 18 — Preset character roster (curated progression tiers selectable at boot)
- [ ] Phase 19 — Enemy spawn picker (debug tab to spawn arbitrary enemies into combat)
- [ ] Phase 20 — Scripted / agent-driven CLI mode (`--script`, `--json-events`, stdin agent control)

> **After phase 20:** the loop transitions to `/iterate` —
> spec gap filling, test coverage improvements, doc updates,
> and ongoing audits. `/march` makes that transition automatic.

> **Deploy gate note:** `npm run deploy:check` runs `npm pack --dry-run`.
> This requires `dist/` (from `npm run build`). Always run `verify` first.

---

## Per-phase scope

### Phase 09 — Game loop orchestration

Implement `gameReducer(state, action): GameState` as the single top-level
dispatch; switch `store.ts` to use it as primary. Ship `game.cli.ts` that
demonstrates the full loop (character creation → explore → combat → level
up → save → load). Full hermetic e2e transcript test. See
`specs/09-game-loop-orchestration.md` and `plan/phases/phase_09_game_loop_orchestration.md`.

### Phase 10 — Moral/difficulty meter

Track player choices across `GameAction` dispatches. A
`MoralDifficulty` score (or alignment tuple) floats based on merciful/
aggressive choices, dialogue picks, and quest resolutions. Ties into
`processNode` events and enemy AI aggression scaling. See
`specs/10-moral-difficulty-meter.md`.

### Phase 11 — RNG seeding and test harness

Seeded, resettable RNG singleton (`src/rng/`); expose in `src/index.ts`.
Deterministic replay harness that captures a game transcript and verifies
it replays identically from seed. Retrofit existing `test-utils/rng.ts`
stubs to use the seeded singleton. See `specs/11-rng-seeding-and-test-harness.md`.

### Phase 12 — Package architecture and events

Define the event surface (`GameEvent[]` or observable) for UI consumers.
Document the `PersistenceAdapter` interface for React Native `AsyncStorage`.
Audit and tighten `src/index.ts` barrel — remove leaky internals. Add
package.json `exports` map. See `specs/12-package-architecture-and-events.md`.

### Phase 13 — ESLint fix

Fix `eslint.config.mts` to correctly register `@typescript-eslint` plugin.
Make `npm run lint` green. Add `lint` back into the verify gate. Tracked as
a known broken item since project start.

### Phase 14 — Story content foundation

First named NPC with a moral dialogue tree. Implement `NPC` entity with
branching dialogue that affects the moral/difficulty meter. Tie into
`processNode` dialogue flow. See `specs/story/` for content direction.

### Phase 15 — Split combat.resolver.ts

Extract per-phase helpers (`resolveRoundStart`, `resolveActionRestriction`,
`resolveAdvantage`, `resolveStanceEffects`, `resolveScenario`,
`resolveRoundEnd`) into colocated files. `resolveCombatRound` becomes the
orchestrator that wires them and produces the `combatEvents` stream. Public
contract unchanged; existing e2e suite bracketing the change. Drains the
matching critique-pass-1 finding.

### Phase 16 — e2e layout migration

Migrate sibling `*.test.ts` files in `src/Effects/`, `src/Enemy/`,
`src/Utils/`, `src/World/`, `src/Character/`, and `src/NPCs/` into
`src/<Module>/e2e/<feature>.engine.test.ts` per `plan/bearings.md`. Update
imports; no logic changes. Drains the matching critique-pass-1 finding.

### Phase 17 — Unify CLI surface

Drop `npm run combat`, `npm run character`, and `npm run auto:combat`
scripts (and delete `automation/combat-test.py`,
`src/CLI/combat.cli.ts`, `src/CLI/character.cli.ts`). Single entry:
`npm run game`. Combat reachable through Map encounters and the new
"Spawn Encounter" debug tab landing in Phase 19. Character creation
flow folded into `game.cli.ts` boot.

### Phase 18 — Preset character roster

New module `src/Character/preset-roster.ts` exporting ≥4 curated
progression tiers (e.g. `fresh-L1`, `mid-L5`, `late-L10`, `endgame-L15`)
with calibrated level, XP, learned/equipped skills, and equipment loadout
that all resolve against the live libraries. CLI presents a roster picker
at boot. Hermetic e2e validates each preset is internally consistent
(referenced skill IDs and item IDs exist; XP matches level).

### Phase 19 — Enemy spawn picker

Add a "Spawn Encounter" debug tab to `game.cli.ts`: list enemies from
`enemy.library` grouped by difficulty tier, pick one, drop into combat
against the current preset character. Useful for targeting a specific
Stance × proc, scenario, or effect interaction during manual testing.
Hermetic e2e covers a spawn → round-resolve happy path.

### Phase 20 — Scripted / agent-driven CLI mode

`--script <path>` flag accepts a JSON plan `{ seed, preset, enemy,
actions[] }` for deterministic replay (leverages the Phase 11 seeded RNG).
`--json-events` flag streams structured `GameEvent` objects on stdout so
an external LLM agent can parse the transcript and react. stdin-mode:
accepts one-action-per-line JSON commands for live agent control.
Hermetic e2e covers a full agent-style scripted run end-to-end.

---

## Carry-overs / known gaps

- ESLint is broken (Phase 13 addresses this).
- `store.ts` has no `moveToNode` / `processNode` actions yet (Phase 09).
- No `gameReducer` dispatch exists yet (Phase 09).

## Phase log (commit hashes)

(Pre-loop history — see `git log --oneline` for full commit trail.)
