# CLI Module

The CLI module provides command-line interfaces for interacting with the game systems. It includes a main game CLI, a combat simulator, and a library editor.

## Files

| File | Purpose |
|------|---------|
| `index.ts` | CLI module exports |
| `display.ts` | Shared display utilities for terminal output |
| `game.cli.ts` | Main game CLI entry point |
| `combat-sim.cli.ts` | Standalone combat simulation CLI |
| `library-editor.cli.ts` | Tool for editing game data libraries |

## Running the CLIs

```bash
# Main game
npm run game

# Combat simulator
npm run combat:sim

# Library editor
npm run library:editor

# Legacy combat CLI
npm run combat:legacy
```

## Dependencies

- **inquirer** - Interactive command-line prompts
- **commander** - CLI argument parsing
