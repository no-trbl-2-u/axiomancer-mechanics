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
- **Skills** - View known and equipped skills
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

### `dev-tools.ts` - Development Utilities

Development utilities for testing and debugging the game engine.

**Key Functions:**
- `devSetLevel()` - Set character level
- `devSetStats()` - Modify character base stats
- `devLearnSkills()` / `devEquipSkills()` - Manage skill progression
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