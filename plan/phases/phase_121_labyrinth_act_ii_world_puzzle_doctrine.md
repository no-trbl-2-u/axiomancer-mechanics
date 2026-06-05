# Phase 121 — Labyrinth Act II world-puzzle doctrine

> Canonize the Labyrinth as Axiomancer's literal Act II: a Russia-sized maze-world where navigation, memory, symbols, relationship strain, and occult danger become the campaign's adult ordeal.

## Outcome

Axiomancer has a canonical Labyrinth Act II design doctrine in-repo: the story overview no longer treats the Labyrinth as merely a city wrapper, and future mechanics/content workers have a concrete source for maze-world traversal, puzzle grammar, encounter pressure, and tone.

## Source

Promoted on 2026-06-05 by T direct order after the Labyrinth design pass.

External brainstorm source:
- `/root/Workspace/axiomancer-both/Encounter Brainstorm/labyrinth-act-notes.md`

Core direction from T:
- The Labyrinth is literal: a maze the size of Russia.
- It is Act II, not merely a metaphor, not merely a dungeon, and not the whole campaign wrapper.
- Reference blend:
  - `Maze: Solve the World's Most Challenging Puzzle` — book-puzzle navigation, hidden symbolic grammar, interpretation over map-completion.
  - `Labyrinth` — the David Bowie film: impossible theatrical spaces, trickster rules, surreal inhabitants, fairy-tale menace, emotional coming-of-age pressure.
  - `Mörk Borg` — hostile occult atmosphere, decaying world texture, grotesque places/creatures, doom-laden presentation, swingy danger and bodily/spiritual cost.
- Existing in-repo anchors:
  - `docs/references/Mork-Borg.md`
  - `plan/phases/phase_22_story_authoring_infrastructure.md`
  - `specs/02-combat-round-resolver.md`
  - `content/story/story-overview.md`

## Implementation units

### Unit 1 — Canonical Act II story doctrine

**Files:**
- `content/story/story-overview.md`
- `content/story/labyrinth-act-ii.md` or nearest existing story-content location if the worker finds a stronger pattern

**Work:**
- Correct the three-act structure:
  - Act I — Child: boat-building, childhood friend, first love, pilgrimage begins.
  - Act II — Adult: the Labyrinth, a continental maze-world.
  - Act III — Endgame: the metropolis at the center, factions, debts, advisor/king outcomes.
- Replace any implication that the Labyrinth is only the city/castle wrapper with the corrected model: the metropolis is at the center of the Labyrinth; the Labyrinth itself is the long adult act.
- Author `labyrinth-act-ii.md` as the durable content bible for:
  - physical model
  - puzzle model
  - tone model
  - Act II function
  - differentiation from Act I and Act III
  - encounter implications

### Unit 2 — World-puzzle traversal doctrine

**Files:**
- `specs/world/labyrinth-act-ii.md` or `specs/16-labyrinth-act-ii-world-puzzle.md` if the repo prefers numbered specs for cross-system doctrine
- `specs/README.md` if a numbered spec is added

**Work:**
- Define the Labyrinth as a navigable but impossible world system:
  - continental corridors, walls, gates, towers, roads, settlements, false cities, shrines, markets, ruins, weather systems, cults, and failed pilgrim societies.
  - impossible adjacency: desert after chapel, orchard after bone gate, sea-stairs after swamp.
  - loops that return travelers to changed places.
  - sky visible in some regions and occluded in others.
- Specify puzzle grammar principles:
  - symbol grammar: repeated icons, colors, animals, virtues, sins, fallacies, paradoxes, directions, and rituals signal route logic.
  - page/room logic: places behave like book-puzzle pages; rooms are read as clues.
  - route vows: promises and earlier moral commitments determine later gates.
  - memory tests: what the player noticed twenty encounters ago can matter.
  - false exits: progress-looking paths can return changed.
  - living map: map state is useful but never absolute; meaning alters traversal.
  - companion interpretation: the Girl/Woman can read some maze rules differently from the Boy/Man.
- Do not implement the full traversal engine in this phase. This phase writes doctrine and leaves implementation hooks for later phase candidates.

### Unit 3 — Encounter and mechanics hooks

**Files:**
- `specs/23-map-events.md`
- `docs/gameloop.md` or the current world/map-event docs if names differ
- `plan/PHASE_CANDIDATES.md` only if the worker discovers a concrete next phase that should be filed

**Work:**
- Map Act II encounter pressure onto existing or future `MapEventKind`/encounter archetypes:
  - Revelation: murals, prophecies, false histories, symbolic chambers.
  - Dilemma: lesser-of-two-evils route choices and sacrifices.
  - Hazard: maze architecture, cursed weather, exhaustion, traps.
  - Forage: survival inside impossible biomes.
  - Sanctuary: rare rests that expose relationship strain.
  - Parley: failed pilgrims, tricksters, maze-born people, gatekeepers.
  - Gambit: wagers with goblin logic, dice, cards, tolls, bargains.
  - Combat: dangerous but not the only pressure.
- Record implementation hooks without overbuilding:
  - maze-region identifiers
  - route-symbol tags
  - memory-check flags
  - companion-interpretation affordance
  - time-passage/aging hook
  - false-exit/loop hook
  - moral-weather/difficulty interaction hook
- If these hooks require new engine primitives, file follow-up phase candidates rather than shipping a half-built traversal engine here.

### Unit 4 — Reference integration and verification

**Files:**
- `docs/references/Mork-Borg.md` only if a short cross-reference note is appropriate
- `docs/references/README.md` if present
- `CHANGELOG.md`

**Work:**
- Link the Labyrinth doctrine back to the Mörk Borg reference without copying large copyrighted text.
- Record the `Maze` reference URLs as source pointers, not as imported content:
  - `https://github.com/asweigart/mazewebsite`
  - `https://inventwithpython.com/mazewebsite/`
- Add a `CHANGELOG.md` `[unreleased]` docs/content entry.

## Decisions made upfront — DO NOT ASK

- **D1 — Literal scale.** The Labyrinth is a literal maze the size of Russia.
- **D2 — Act placement.** The Labyrinth is Act II / Adult. It is not Act I, not Act III, not merely a city wrapper, and not the whole campaign container.
- **D3 — Metropolis placement.** The metropolis is at the center of the Labyrinth and belongs to Act III/endgame politics.
- **D4 — Doctrine first.** This phase is a doctrine/content/spec phase. Do not build a full procedural labyrinth traversal engine here.
- **D5 — Puzzle over map completion.** Navigation must be interpretation-driven. A complete map alone should not solve the Labyrinth.
- **D6 — Relationship pressure is load-bearing.** The Labyrinth transforms childhood romance through time, exhaustion, dependency, resentment, wonder, and adult choice.
- **D7 — Tone blend.** Maze-like puzzle grammar + Bowie Labyrinth theatrical impossible spaces + Mörk Borg doom texture. None of the references is sufficient alone.
- **D8 — No generic fantasy maze.** The worker should preserve nation-scale villages/roads/cults/biomes while making every place still obey maze law.

## Verify gate

- `npm run type-check`
- `npm test -- --run`
- `npm run build`
- If only markdown/content files changed and the repo has a faster docs verifier, run that too; otherwise use the gates above.
- Inspect `git diff --check` before finalizing.

## Commit body template

```text
Phase 121: Labyrinth Act II world-puzzle doctrine

- canonize the Labyrinth as literal Act II: a Russia-sized maze-world
- add story/world doctrine for puzzle grammar, tone, physical model, and encounter pressure
- correct story overview language so the metropolis sits at the maze center rather than replacing the maze
- document implementation hooks for future traversal/content phases without building the full engine here

Verification:
- npm run type-check
- npm test -- --run
- npm run build
- git diff --check
```

## Definition of Done

- [ ] `content/story/story-overview.md` reflects the corrected three-act structure.
- [ ] A durable Labyrinth Act II doctrine file exists in `content/story/` and/or `specs/world/`.
- [ ] The doctrine states the reference blend and source anchors clearly.
- [ ] The doctrine defines physical model, puzzle model, tone model, Act II function, act differentiation, and encounter implications.
- [ ] Existing map-event/world docs are cross-linked where useful.
- [ ] Follow-up implementation hooks are listed without shipping premature engine machinery.
- [ ] Changelog/docs inventory updated if required by repo convention.
- [ ] Verify gate passes.

## Follow-ups out of scope

- Labyrinth traversal engine.
- Procedural/hand-authored maze-region data model.
- Companion interpretation mechanics.
- Ten-year time passage / aging mechanics.
- First playable Labyrinth region.
- Labyrinth-specific enemies, cults, gatekeepers, hazards, and settlement content.
