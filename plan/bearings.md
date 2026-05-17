# Bearings — axiomancer-mechanics

> Standing context for every command invocation. Read this
> alongside the relevant skill file (`skills/<name>.md`) and
> the matching phase brief. If anything here changes, update in
> the same commit.

## What we're building

`spec.md` at the repo root is the product spec. TL;DR:

> A TypeScript turn-based RPG combat engine with philosophical themes,
> consumed as an npm library by a React Native app.

The engine covers characters, enemies, combat (Heart/Body/Mind stances),
status effects (Tiers 1–3), skills, equipment, world navigation, quests, and
a full game loop. The React Native UI is out of scope for this repo.

**Package name is lowercase, always: `axiomancer-mechanics`.**

**Live at:** not applicable — npm library, not hosted.

## Surface

**Surface:** `library`

No web UI; asset capability disabled. Critique skill runs a
code-quality audit, not a live-site observer pass.

## Auth

**Auth:** `none` — no web UI, no auth surface to walk.

## Stack (locked — do not re-litigate)

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript strict | Existing codebase, type safety for game state |
| Package manager | npm | Existing; do not switch to pnpm |
| Build | `tsc && tsc-alias` | Path-alias resolution for clean module imports |
| Type-check | `tsc --noEmit` | Reliable static analysis |
| Test runner | Vitest | Fast, ESM-compatible, hermetic e2e pattern established |
| Lint | ESLint flat config + `@typescript-eslint` plugin | Repaired in Phase 13 |
| Structured data | `none` | Pure library — no records, no DB |
| Hosting | none | Library; no deployment target yet |
| State management | Zustand vanilla store | Consumer-facing store for the React Native app |

## CLI / API contract (locked)

The barrel at `src/index.ts` is the public contract. These groups are
**locked** — do not remove or rename exports:

```
Character:  createCharacter, Character, BaseStats, DerivedStats, NonCombatStats
Enemy:      createEnemy, Enemy, EnemyLogic, decideEnemyAction, randomLogic
Combat:     determineAdvantage, getAttackStat, getDefenseStat, getSaveStat,
            getResistStat, applyDamage, heal, tickAllEffects, applyRegen,
            getActiveRollModifier, getThornsReflect, resolveEffectApplication,
            Stance, Action, CombatState, Combatant
Combat reducer: initializeCombat, setPhase, setPlayerStance, setPlayerAction,
                appendLog, incrementFriendship, endCombat
Effects:    applyEffect, applyTier1CombatEffect, clearTier1EffectsForStance,
            lookupEffect, Effect, ActiveEffect, EffectTier
Items:      addItem, removeItem, useConsumable, stackItem, Item (and variants)
Game:       createGameStore, GameState, nullAdapter, persistence adapters
World:      createStartingWorld, world reducer, WorldState, MapState, MapDefinition
Utils:      clamp, randomInt, deepClone, deriveStats, calculateMaxHealth,
            createDieRoll, isCharacter, isEnemy
Philosophy: bucketAxis, getAlignmentCell, applyAlignmentDelta, defaultAlignment,
            AXIS_HIGH_THRESHOLD, AXIS_LOW_THRESHOLD,
            philosophicalAlignmentLibrary,
            PhilosophicalAlignment, AxisBucket, AlignmentFallacy,
            PhilosophicalAlignmentCell
            (+ GameState.philosophicalAlignment field, SHIFT_PHILOSOPHICAL_ALIGNMENT
            action, alignmentDelta? on DialogueChoice.effect + MapEventPoolEntry,
            sourcedFromCell? on Skill + Effect, Enemy.philosophicalAlignment? —
            Phases 42-45)
```

Adding new exports is allowed. Renaming or removing existing ones requires
a semver major and is a deliberate phase, not an iterate finding.

`src/CLI/` is **not** part of the public API and is excluded from the build.

## Repository shape

```
axiomancer-mechanics/
├── spec.md
├── README.md
├── agents.md
├── AGENTS.md               # Cursor-specific rule book (keep; don't delete)
├── package.json
├── src/
│   ├── index.ts            # public barrel
│   ├── Character/          # createCharacter + types
│   ├── Combat/             # advantage, stats, dice, damage, effects, resolver
│   ├── Effects/            # applyEffect, Tier1 stance effects, library
│   ├── Enemy/              # createEnemy + AI logic + library
│   ├── Game/               # store + persistence + constants + actions + reducer
│   ├── Items/              # inventory reducers + item types
│   ├── Skills/             # types + engine
│   ├── World/              # world state, reducers, map and quest libraries
│   ├── NPCs/               # NPC types
│   └── Utils/              # math, dice, stat derivation, type guards
├── src/CLI/                # interactive CLIs (not exported)
├── src/test-utils/         # rng stubs, mock helpers
├── specs/                  # implementation specs (conversation-loop format)
│   ├── story/              # authored via `/story-spec` (S-NN-*.md)
│   ├── world/              # authored via `/world-spec` (W-NN-*.md)
│   └── characters/         # authored via `/character-spec` (C-NN-*.md)
├── content/                # author's notebook (not loaded by engine)
│   ├── characters/         # per-character bios + visuals + vo (when needed)
│   ├── locations/          # per-location atmosphere + mechanics + lore
│   └── story/              # high-level story-overview prose
├── docs/                   # per-system reference docs
├── braindump/              # unorganised idea backlog
├── plan/                   # build plan, phase briefs, audit findings
├── skills/                 # nexus skill files invoked by slash commands
├── .claude/
│   ├── commands/           # terse slash-command pointers
│   ├── agents/             # sub-agent definitions
│   └── skills/             # project-specific skills (brainstorm-mechanics, story-spec, world-spec, character-spec)
└── scripts/                # deploy-check.mjs + loop-issue.mjs (best-effort)
```

## Sub-agents

| Agent | When to spawn | Returns |
|---|---|---|
| `scout` | External research: TTRPG specs, game mechanics, design patterns | Structured findings with citations |
| `mechanics-expert` | Review or propose game-mechanic decisions; audit for balance, spec alignment | Structured analysis report |

## Visual & tonal defaults

Not applicable — library, no UI. The _game's_ tone: philosophical, dark,
literary. Enemies are embodiments of logical fallacies. Effect names reference
philosophical paradoxes (Zeno's paralysis, Buridan's indecision, etc.).
Maintain this vocabulary in code comments, effect descriptions, and docs.

## Plan expansion posture

**Mode: bold** — `/expand` fires at standard cadence and files candidates to
`plan/PHASE_CANDIDATES.md`. `/oversight` promotes them to the build plan.

## Decisions standing for the autonomous loop

- **Package manager:** npm. Never pnpm. All commands use `npm run`.
- **Verify gate:** `npm run type-check && npm run lint && npm test && npm run build`.
- **Deploy gate:** `npm run deploy:check` → `npm pack --dry-run`
  (confirms the package is publishable; no actual publish).
- **ESLint state:** flat-config (`eslint.config.mts`) with the
  `@typescript-eslint` plugin registered and a deliberately narrow rule set
  (`no-unused-vars` via the TS plugin, `no-redeclare` via the TS plugin to
  respect function overloads, `no-explicit-any` at `warn`). `src/CLI/`,
  `automation/`, and `scripts/` are ignored. Warnings are advisory; only
  errors fail the verify gate. Was broken until Phase 13.
- **Hermetic e2e tests:** located at `src/<Module>/e2e/<feature>.engine.test.ts`.
  They run as part of `npm test`. No Playwright; e2e is vitest-based.
  Every module with public engine logic ships one. Additional sibling
  `src/<Module>/*.test.ts` files are permitted for unit-level coverage
  of internal helpers — they run in the same vitest pass.
- **RNG stubs:** always use `mockAlternatingRng`, `mockFixedRng`,
  `mockSequentialRng` from `src/test-utils/rng.ts`. Never re-roll custom
  `vi.spyOn(Math, 'random')`.
- **Commit style:** `<type>(<scope>): <short description>`. Types: feat, fix,
  refactor, chore, docs, test. E.g. `feat(game): add gameReducer dispatch`.
- **Incremental commits:** one commit per logical unit of work; only when
  `npm test` and `npm run type-check` are green for that increment.
- **CLI files:** CLIs (`src/CLI/`) are excluded from the build. They are
  UI-only; all logic goes in resolver/reducer modules with colocated tests.
- **Phase issue mirroring:** best-effort via `scripts/loop-issue.mjs`. If
  script fails, the phase still ships; log stderr and continue.
- **Spec alignment:** each phase corresponds to a spec in `specs/`. Read
  the relevant spec file as the first input for any phase brief.
- **Zustand vs reducers:** The store (`Game/store.ts`) is the consumer-facing
  entry point. Pure reducers exist per module for non-Zustand consumers and
  testing. The game loop (Spec 09) switches to Zustand as the primary
  dispatch surface; `gameReducer` is the secondary.

## Hard rules

1. **Commit and push as a single atomic act.**
2. **No `Co-Authored-By:` trailers, no emojis.**
3. **No `--no-verify`, no force-push, no destructive resets.**
4. **The verify gate is non-negotiable:**
   `npm run type-check && npm run lint && npm test && npm run build`
5. **Tests alongside code — never "add tests later".**
   Every implementation lands with at least one hermetic e2e test
   driving the change through the module's highest-level public entry.
6. **Never skip lint by removing it from verify** — fix the underlying
   ESLint config issue instead.
7. **`src/index.ts` contract is locked** — no removals or renames without
   a semver major phase.
8. **CLI files (`src/CLI/`) contain UI only** — logic goes in resolver/
   reducer modules that are independently testable.
9. **State file (`game-state.json`) is gitignored and ephemeral.**

## Verify gate (hermetic, mandatory) + deploy gate

### Pre-commit: `npm run verify`

```
npm run type-check     # tsc --noEmit
npm run lint           # eslint "**/*.ts" (warnings advisory; errors fail)
npm test               # vitest run (includes hermetic e2e)
npm run build          # tsc && tsc-alias → dist/
```

All four are hard gates. Iterate up to 3 times on the same root cause
before stopping per skill failure modes. **Hermetic e2e is the unit tests
at `src/**/*.engine.test.ts`** — they exercise the full module through its
public entry point with stubbed RNG. A red `npm test` is a blocked push.

### Post-push: `npm run deploy:check`

```
npm pack --dry-run
```

After every push, confirms the package is correctly packable (exports, types,
package.json `files` field). Exit 0 = packable; exit 1 = not packable.
This is the "deploy gate" equivalent for a library — the package doesn't
go to a hosting provider, but it must be publishable.

**Note:** `dist/` must exist when `deploy:check` runs. The verify gate
(`npm run build`) creates it. Always run `verify` before `deploy:check`.

## Useful commands

```bash
npm run type-check         # tsc --noEmit
npm test                   # vitest run
npm run build              # tsc && tsc-alias → dist/
npm run verify             # full gate: type-check + test + build
npm run deploy:check       # npm pack --dry-run
npm run combat             # interactive combat CLI
npm run character          # interactive character builder
COMBAT_NO_DELAY=1 npm run combat   # combat without animation delays
npm run auto:combat        # python pexpect harness (requires pexpect)
```
