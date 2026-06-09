# CLI

> Command-line interface for interacting with the Axiomancer mechanics engine.

## Overview

The CLI module provides a complete command-line interface for playing and testing the game. It includes a full interactive game driver, development tools, and flexible I/O abstractions.

## Components

### `game.cli.ts` - Main Game Interface

The primary CLI driver that provides a tabbed inquirer interface for playing the game. Includes five main tabs:

- **Map** - Navigate between nodes and trigger map events
- **Combat** - Resolve combat rounds against active encounters  
- **Journal** - View active/completed quests and philosophical alignment
- **Skills** - View learned/unlocked skills; combat should show only currently affordable skills
- **Inventory** - View carried items and equipment

**Usage:**
```bash
npm run game
```

**Features:**
- Full game loop interaction through store actions
- Real-time combat resolution
- Save/load functionality
- Development cheats and debugging

### `hazard.cli.ts` - Hazard Mini-Game Driver

A standalone driver for the hazard mini-game, reachable as a **subcommand** of
the game CLI. It reuses the same `io.ts` layer (tty / `--script` / `--stdin`,
plus `--json-events` and `--state-log`) so a person, a replay file, or an agent
can all drive it the same way.

**Usage:**
```bash
npm run game -- hazard [flags]
npm run hazard -- [flags]            # convenience alias
```

**Flags:**

| Flag | Effect |
| --- | --- |
| `--hazard <id>` | Pick a hazard card (e.g. `H01`). Prompts from the library when omitted. |
| `--route top\|bottom` | Choose the route. Prompts when omitted. |
| `--auto` | A greedy heuristic plays each round (focus first, then matching progress cards, preferring affordable bottom actions). Otherwise the player picks cards by hand. |
| `--seed <n\|str>` | Seed the shared RNG so dice rolls and the deck shuffle are reproducible. |
| `--runs <n>` | Play N hazards back-to-back (default **5**). |
| `--script <path>` | Scripted answers (JSON array), as in `game.cli.ts`. |
| `--stdin` | Line-buffered stdin answers. |
| `--json-events` | Emit `hazard:complete` / `hazard:summary` events as JSON on stdout. |
| `--state-log <path>` | Append a per-decision JSONL trace (init, route, dice, each round, final score). |

**Encounter vs. player state.** Each run creates a fresh per-encounter *hazard
state* (the engine's `HazardMinigameState`); dice exhaustion / refresh and deck
state persist **within** that encounter and are discarded when it ends. A
cross-run *player ledger* (vitae / supply / items / threatened-X) persists
across `--runs` and is only reset when the process exits.

> Reward/penalty application is a CLI-layer policy (the engine's `resolveRound`
> does not yet apply them): each `X` round applies the route `failurePenalty`
> (plus `finalRoundFailurePenalty` on the last round), and the route `reward` is
> granted when the encounter nets positive.

**Illegal actions** (unaffordable bottom cost, unknown card, wrong phase) are
**warned and skipped** rather than aborting the run — and logged to the state
log as an `illegalHazardAction` record carrying the attempted action and a full
hazard-state snapshot, so automated tuning can learn from them.

**Examples:**
```bash
# Reproducible auto run of one hazard, machine-readable trace
npm run hazard -- --auto --seed 42 --runs 1 --hazard H01 --route top \
  --json-events --state-log /tmp/hazard.jsonl

# Interactive manual play, prompted for hazard + route
npm run hazard -- --runs 1
```

### `dev-tools.ts` - Development Utilities

Development utilities for testing and debugging the game engine.

**Key Functions:**
- `devSetLevel()` - Set character level
- `devSetStats()` - Modify character base stats
- `devLearnSkills()` / legacy `devEquipSkills()` - Manage skill progression (Phase 99 removes separate skill equipment)
- `devGrantAllEquipment()` / `devGrantAllConsumables()` - Grant items
- `devSpawnEnemy()` - Spawn specific enemies for testing
- `devMaxOut()` - Max out character for endgame testing

### `io.ts` - I/O Abstraction

Flexible I/O abstraction supporting multiple input and output modes:

**Input Modes:**
- TTY - Interactive terminal input
- Scripted - Predefined answers from file  
- Stdin - Line-buffered stdin input

**Output Modes:**
- Human-readable - Formatted console output
- JSON - JSON-per-line output for agents/automation

**Key Functions:**
- `parseArgv()` - Parse command-line arguments
- `prompt()` - Universal prompt function
- `emit()` / `log()` - Output functions
- `setIoMode()` / `setOutputMode()` - Configure I/O behavior

## Command-Line Arguments

- `--script <path>` - Run with scripted input from file
- `--stdin` - Read input from stdin (line-buffered)
- `--json-events` - Output JSON events instead of human-readable text
- `--state-log <path>` - Log game state to JSONL file
- `--save <path>` - Use persistent save file

## Examples

### Interactive Play
```bash
npm run game
```

### Scripted Automation
```bash
npm run game -- --script automation/scenarios/test.json --json-events
```

### Agent Integration
```bash
npm run game -- --stdin --json-events --state-log debug.jsonl
```

## Integration

The CLI is built on top of the core game store and reducer system. It demonstrates how to:
- Create and configure a game store
- Handle game events through the event emitter
- Implement persistence with adapters
- Drive the complete game loop

## See Also

- [Game Loop](./gameloop.md) - Core game mechanics
- [Combat](./combat.md) - Combat system details
- [World](./world.md) - Map and event system