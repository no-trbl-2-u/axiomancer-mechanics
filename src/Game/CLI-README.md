# Game State Management CLI

Interactive command-line interface for managing game state using Commander and Inquirer.

## Quick Start

```bash
# Interactive mode (recommended)
npm run game-state interactive

# Or use the alias
npm run game-state i
```

## Commands

### Interactive Mode
Launch the full interactive menu:
```bash
npm run game-state interactive
```

Features:
- 📊 View game state
- ⚔️ Character actions (damage, heal, mana, level up)
- 🗺️ World actions (quests)
- 💾 Save state
- 📦 Backup management
- 🔄 Reset game

### View State
```bash
npm run game-state view
# or
npm run game-state v
```

### Character Actions
```bash
# Deal damage
npm run game-state character --damage 10

# Heal
npm run game-state character --heal 15

# Restore mana
npm run game-state character --mana 20

# Level up
npm run game-state character --level-up

# Combine multiple actions
npm run game-state character --damage 20 --heal 10 --mana 5
```

### Backup Management
```bash
# Create backup
npm run game-state backup --create

# List backups
npm run game-state backup --list

# Restore from backup
npm run game-state backup --restore game-state-2025-11-25T05-49-51-056Z.json

# Delete backup
npm run game-state backup --delete game-state-2025-11-25T05-49-51-056Z.json
```

### Reset Game
```bash
npm run game-state reset
```
Creates a backup before resetting.

### Info
```bash
npm run game-state info
```
Shows save file status, player info, and backup count.

## Examples

```bash
# Start fresh and view state
npm run game-state reset
npm run game-state view

# Simulate combat damage and healing
npm run game-state character --damage 25
npm run game-state character --heal 10

# Create a backup before making changes
npm run game-state backup --create
npm run game-state character --level-up

# View current status
npm run game-state info
```

## Help

```bash
# General help
npm run game-state --help

# Command-specific help
npm run game-state character --help
npm run game-state backup --help
```
