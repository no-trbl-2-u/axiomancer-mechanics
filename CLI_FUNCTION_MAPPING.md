# CLI Function Mapping Guide

This document maps the function stubs to potential CLI tool usage patterns for the turn-based RPG simulation.

## CLI Tool Structure

The functions have been designed to support a series of modular CLI tools that can simulate RPG mechanics independently or as part of a larger game flow.

## Character CLI (`character.cli.ts`)

### Potential Commands

```bash
# Create a new character
npm run character create --name "Protagonist" --body 5 --mind 4 --heart 6 --level 1

# View character stats
npm run character view

# Level up character
npm run character level-up

# Modify stats
npm run character set-stat --stat body --value 6
```

### Key Functions Used
- `createCharacter()` - Initialize new character
- `deriveStats()` - Calculate derived stats from base stats
- `calculateMaxHealth()` - Determine max HP
- `calculateMaxMana()` - Determine max MP
- `levelUpCharacter()` - Increase level
- `updateSingleBaseStat()` - Modify individual stats
- `getHealthPercentage()` - Display health status
- `getManaPercentage()` - Display mana status
- `serializeCharacter()` / `deserializeCharacter()` - Save/load character

## Combat CLI (`combat.cli.ts`)

### Potential Commands

```bash
# Start combat encounter
npm run combat start --player-id player1 --enemy-id goblin-01

# Combat turn flow (interactive)
# 1. Choose attack type (body/mind/heart)
# 2. Choose action (attack/defend/skill/item)
# 3. Resolve round
# 4. View results
```

### Key Functions Used
- `initializeCombat()` - Start combat
- `setPlayerAttackType()` - Player chooses type
- `setPlayerAction()` - Player chooses action
- `generateEnemyAttackType()` - AI determines enemy type
- `generateEnemyAction()` - AI determines enemy action
- `determineAdvantage()` - Calculate type advantage
- `rollD20()` - Dice rolling
- `calculateAttackDamage()` - Compute damage
- `applyDamage()` - Update health
- `resolveCombatRound()` - Process complete round
- `createBattleLogEntry()` - Log combat events
- `formatBattleLog()` - Display combat history
- `determineCombatEnd()` - Check for win/loss/friendship
- `generateCombatStatistics()` - Show final stats

## Skills CLI (future `skills.cli.ts`)

### Potential Commands

```bash
# View available skills
npm run skills list

# Learn a skill
npm run skills learn --id ad-hominem --character player1

# View skill details
npm run skills info --id straw-man

# Check learnable skills for character
npm run skills learnable --character player1
```

### Key Functions Used
- `getAllFallacies()` / `getAllParadoxes()` - List skills
- `canLearnSkill()` - Check requirements
- `getSkillRequirementDescription()` - Display requirements
- `filterSkillsByCategory()` - Filter by type
- `filterSkillsByAspect()` - Filter by stat alignment
- `getLearnableSkills()` - Find available skills
- `formatSkillInfo()` - Display skill details

## World/Map CLI (future `world.cli.ts`)

### Potential Commands

```bash
# List all maps
npm run world maps

# View map details
npm run world map --name northern-forest

# View quests
npm run world quests

# Start map exploration
npm run world explore --map northern-forest
```

### Key Functions Used
- `getAllMapNames()` - List maps
- `getMapByName()` - Get specific map
- `getMapEnemies()` - Show enemies on map
- `getMapEvents()` - Show available events
- `getRandomMapEvent()` - Trigger random event
- `getIncompleteQuestCount()` - Track quest progress
- `getQuestsForMap()` - Show map-specific quests
- `getMapProgress()` - Track exploration completion

## Enemy CLI (future `enemy.cli.ts`)

### Potential Commands

```bash
# List enemies
npm run enemy list --map northern-forest

# View enemy details
npm run enemy info --id goblin-01

# Compare enemies
npm run enemy compare --id1 goblin-01 --id2 troll-boss

# Get random encounter
npm run enemy random --map northern-forest
```

### Key Functions Used
- `getEnemiesForMap()` - List map enemies
- `getRandomEnemyFromMap()` - Random encounter
- `isBoss()` / `isElite()` - Check tier
- `calculateEnemyCombatPower()` - Power rating
- `getDifficultyRating()` - Challenge level for player
- `getEnemyHealthPercentage()` - Display status

## Items/Inventory CLI (future `inventory.cli.ts`)

### Potential Commands

```bash
# View inventory
npm run inventory list

# Use item
npm run inventory use --id health-potion

# Equip item
npm run inventory equip --id iron-sword

# View item details
npm run inventory info --id iron-sword
```

### Key Functions Used
- `addToInventory()` - Add item
- `removeFromInventory()` - Remove item
- `hasItemInInventory()` - Check possession
- `useConsumable()` - Use consumable items
- `getEquipmentItems()` - List equipment
- `getConsumableItems()` - List usables
- `calculateTotalEquipmentStats()` - Show stat bonuses
- `formatItemInfo()` - Display item details

## NPC CLI (future `npc.cli.ts`)

### Potential Commands

```bash
# List NPCs on map
npm run npc list --map fishing-village

# Talk to NPC
npm run npc talk --name "Village Elder" --topic greeting

# View available topics
npm run npc topics --name "Village Elder"
```

### Key Functions Used
- `getMapNPCs()` - List NPCs on map
- `talkToNPC()` - Get dialogue
- `getRandomDialogueLine()` - Random response
- `getAvailableTopics()` - List conversation options
- `formatDialogue()` - Display conversation
- `getGreeting()` / `getFarewell()` - Standard interactions

## Integration: Full Game Loop

### Example Game Flow

1. **Character Creation**
   - Use Character functions to create and customize player

2. **World Exploration**
   - Use World functions to navigate maps
   - Use Map functions to trigger events

3. **Combat Encounters**
   - Use Enemy functions to get opponents
   - Use Combat functions for battle resolution
   - Use Skill functions if player has skills
   - Use Item functions for consumables

4. **NPC Interactions**
   - Use NPC functions for dialogue
   - Use Quest functions to track objectives

5. **Progression**
   - Use Character functions to level up
   - Use Skill functions to learn new abilities
   - Use Item functions to manage equipment

## Pure Function Benefits for CLI

The pure function design provides several advantages for CLI tools:

1. **Predictability**: Same input always produces same output
2. **Testability**: Easy to unit test without mocking
3. **Composability**: Chain functions for complex operations
4. **Reusability**: Functions work in any context (CLI, web, API)
5. **Debuggability**: Easy to trace data flow

## CLI State Management

While functions are pure, CLI tools will need state management:

```typescript
// Example: Combat CLI State Flow
let gameState = loadGameState();
let combatState = initializeCombat(gameState.player, selectedEnemy);

// Each turn:
combatState = setPlayerAttackType(combatState, playerChoice.type);
combatState = setPlayerAction(combatState, playerChoice.action);
combatState = resolveCombatRound(combatState);

// Update game state
gameState.player = combatState.player;
gameState = updateWorldState(gameState, combatResult);
saveGameState(gameState);
```

## Testing Strategy

Each function can be tested independently:

```typescript
describe('Character System', () => {
  test('createCharacter creates valid character', () => {
    const char = createCharacter({
      name: 'Test',
      level: 1,
      baseStats: { body: 5, mind: 5, heart: 5 }
    });
    // Once implemented, this will work
  });
  
  test('deriveStats correctly calculates luck', () => {
    const stats = deriveStats({ body: 3, mind: 4, heart: 5 });
    expect(stats.luck).toBe(4); // Average of 3, 4, 5
  });
});
```

## CLI Implementation Order

Suggested order for implementing CLI tools:

1. **Character CLI** (foundation for all other tools)
2. **Combat CLI** (core game mechanic)
3. **Enemy CLI** (needed for combat testing)
4. **World CLI** (map navigation and exploration)
5. **Skills CLI** (extend combat options)
6. **Items CLI** (inventory and equipment)
7. **NPC CLI** (dialogue and quests)

Each CLI tool can be developed and tested independently while building toward a complete game experience.
