# Quick Start Guide

This guide shows common usage patterns for the RPG mechanics functions.

## Basic Setup

```typescript
import { createCharacter } from '@Character/index';
import { createEnemy } from '@Enemy/index';
import { initializeCombat, resolveCombatRound } from '@Combat/index';
import { createSkill } from '@Skills/index';
```

## Creating a Character

```typescript
const player = createCharacter({
    name: "Protagonist",
    level: 1,
    baseStats: {
        body: 5,
        mind: 4,
        heart: 6
    }
});

// Character now has:
// - Derived stats calculated from base stats
// - Max health from level + body + heart
// - Max mana from level + mind + heart
// - Current health and mana at maximum
```

## Creating an Enemy

```typescript
// Method 1: Basic enemy with auto-calculated stats
const goblin = createBasicEnemy(
    "Goblin Scout",
    1,
    "northern-forest",
    "A small, scrappy creature"
);

// Method 2: Boss enemy with enhanced stats
const boss = createBossEnemy(
    "Ancient Guardian",
    5,
    "ancient-ruins",
    "A powerful construct from ages past"
);

// Method 3: Custom enemy with specific stats
const customEnemy = createEnemy(
    "unique-01",
    "Shadow Beast",
    3,
    {
        maxHealth: 50,
        maxMana: 30,
        physicalSkill: 4,
        physicalDefense: 3,
        mentalSkill: 6,
        mentalDefense: 5,
        emotionalSkill: 2,
        emotionalDefense: 4
    },
    "dark-forest",
    "A creature born from nightmares",
    "elite"
);
```

## Running Combat

```typescript
// Initialize combat
let combat = initializeCombat(player, goblin);

// Player's turn - choose type
combat = setPlayerAttackType(combat, 'body'); // Physical attack

// Player's turn - choose action
combat = setPlayerAction(combat, 'attack');

// Enemy AI makes choices
const enemyType = generateEnemyAttackType(combat, combat.enemy);
combat.enemyChoice.type = enemyType;

const enemyAction = generateEnemyAction(combat, combat.enemy);
combat.enemyChoice.action = enemyAction;

// Resolve the round
combat = resolveCombatRound(combat);

// Check combat status
const status = determineCombatEnd(combat);
if (status === 'player') {
    console.log('Victory!');
} else if (status === 'ko') {
    console.log('Defeat...');
} else if (status === 'friendship') {
    console.log('Resolved peacefully!');
} else {
    // Continue combat
}
```

## Managing Character Health and Mana

```typescript
// Heal character
const healedCharacter = healCharacter(player, 20);

// Damage character
const damagedCharacter = damageCharacter(player, 15);

// Restore mana
const restedCharacter = restoreMana(player, 10);

// Consume mana
const castedCharacter = consumeMana(player, 5);

// Check status
const healthPct = getHealthPercentage(player); // 0-100
const isAlive = isCharacterAlive(player);
const canAffordSkill = hasEnoughMana(player, 15);
```

## Leveling Up

```typescript
// Level up character
let character = levelUpCharacter(player);

// Character's max health and mana increase
// (actual implementation will handle stat increases)

// Set specific level
character = setCharacterLevel(character, 5);
```

## Working with Skills

```typescript
// Create a skill
const skill = createFallacySkill(
    "ad-hominem",
    "Ad Hominem",
    "Attack the person, not the argument",
    1,
    15, // mana cost
    "heart" // philosophical aspect
);

// Check if character can learn
const canLearn = canLearnSkill(player, skill);

// Check if character can use (has enough mana)
const canUse = canUseSkill(player, skill);

// Get skill modifier based on character stats
const modifier = getSkillModifier(player, skill);

// Calculate skill damage
const damage = calculateSkillDamage(skill, player);
```

## Managing Items

```typescript
// Create items
const sword = createEquipment("iron-sword", "Iron Sword", "A basic blade");
const potion = createConsumable("health-potion", "Health Potion", "Restores 50 HP");
const wood = createMaterial("oak-wood", "Oak Wood", "Strong timber");

// Add stats to equipment
const statSword = addEquipmentStats(sword, { 
    physicalSkill: 2, 
    physicalDefense: 1 
});

// Set consumable effects
const healingPotion = setConsumableHealAmount(potion, 50);

// Use consumable
const effects = useConsumable(healingPotion);
const healedPlayer = healCharacter(player, effects.heal);

// Inventory management
let inventory: BaseItem[] = [];
inventory = addToInventory(inventory, sword);
inventory = addToInventory(inventory, potion);

const hasSword = hasItemInInventory(inventory, "iron-sword");
const invSize = getInventorySize(inventory);

// Filter inventory
const equipment = getEquipmentItems(inventory);
const consumables = getConsumableItems(inventory);
```

## Working with NPCs

```typescript
// Create NPC with dialogue
const npc = createNPC(
    "Village Elder",
    {
        greeting: "Welcome, traveler!",
        quest: ["I have a task for you.", "Are you brave enough?"],
        farewell: "Safe travels!"
    },
    "An old wise person"
);

// Talk to NPC
const dialogue = talkToNPC(npc, "greeting");
console.log(dialogue); // "Welcome, traveler!"

// Random dialogue line (useful for variety)
const randomLine = getRandomDialogueLine(npc, "quest");
// Returns either "I have a task for you." or "Are you brave enough?"

// Get greeting
const greeting = getGreeting(npc); // Looks for 'greeting' or 'hello' key

// Add new dialogue
const updatedNPC = setDialogue(npc, "shop", "Would you like to see my wares?");
```

## Working with Maps and World

```typescript
// Create a map
const map = createMap(
    "northern-forest",
    "coastal-continent",
    "A dense forest filled with mystery",
    10, // number of nodes
    [goblin, wolf, treant] // enemies on this map
);

// Add event to map
const encounterEvent = createEncounterEvent(
    "A goblin blocks your path!",
    goblin,
    "experience"
);
const updatedMap = addEventToMap(map, encounterEvent);

// Get random event
const randomEvent = getRandomMapEvent(updatedMap);

// Get random enemy
const randomEnemy = getRandomEnemy(updatedMap);

// Create world state
let world = createWorldState();

// Add map to world
world = addMapToWorld(world, map);

// Get map by name
const forest = getMapByName(world, "northern-forest");
```

## Working with Effects

```typescript
// Create buff
const strengthBuff = createStatModifier(
    "strength-boost",
    "Strength Boost",
    "Increases physical skill",
    "buff",
    "physicalSkill",
    5, // +5 modifier
    false, // not percentage
    "temporary"
);

// Set duration
const timedBuff = setEffectDuration(strengthBuff, 3); // 3 turns

// Make stackable
const stackableBuff = makeEffectStackable(timedBuff, 3); // max 3 stacks

// Create damage over time
const poison = createDamageOverTime(
    "poison",
    "Poisoned",
    "Takes damage each turn",
    5, // 5 damage per turn
    "body",
    3 // 3 turns
);

// Manage effect collection
let effects: Effect[] = [];
effects = addEffect(effects, strengthBuff);
effects = addEffect(effects, poison);

// Update effects each turn
effects = updateEffectsForTurn(effects); // Decrements durations
effects = removeExpiredEffects(effects); // Removes finished effects

// Get specific types
const buffs = getActiveBuffs(effects);
const debuffs = getActiveDebuffs(effects);
```

## Complete Combat Example

```typescript
// Setup
const hero = createCharacter({
    name: "Hero",
    level: 3,
    baseStats: { body: 6, mind: 5, heart: 7 }
});

const dragon = createBossEnemy(
    "Fire Dragon",
    5,
    "volcanic-peak",
    "An ancient dragon of flame"
);

// Start combat
let combat = initializeCombat(hero, dragon);

// Combat loop
while (determineCombatEnd(combat) === 'ongoing') {
    // Player turn
    const playerType = prompt('Choose type (body/mind/heart): ');
    combat = setPlayerAttackType(combat, playerType as ActionType);
    
    const playerAction = prompt('Choose action (attack/defend): ');
    combat = setPlayerAction(combat, playerAction as Action);
    
    // Enemy AI
    const enemyType = generateEnemyAttackType(combat, combat.enemy);
    const enemyAction = generateEnemyAction(combat, combat.enemy);
    combat.enemyChoice = { type: enemyType, action: enemyAction };
    
    // Resolve
    combat = resolveCombatRound(combat);
    
    // Show log
    const log = formatBattleLog(combat);
    console.log(log[log.length - 1]);
}

// Show result
const result = determineCombatEnd(combat);
console.log(`Combat ended: ${result}`);

// Show statistics
const stats = generateCombatStatistics(combat);
console.log(`Total rounds: ${stats.totalRounds}`);
console.log(`Player damage: ${stats.totalPlayerDamage}`);
console.log(`Enemy damage: ${stats.totalEnemyDamage}`);
```

## Type Checking Examples

```typescript
// Enemy tier checks
if (isBoss(enemy)) {
    console.log("Prepare for a tough fight!");
}

// Skill type checks
if (isFallacy(skill) && isBodySkill(skill)) {
    console.log("Physical fallacy skill");
}

// Item type checks
if (isConsumable(item)) {
    const effects = useConsumable(item);
    // Use the item
} else if (isEquipment(item)) {
    // Equip the item
}

// Effect type checks
if (isBuff(effect)) {
    console.log("Positive effect!");
}

if (isStatModifier(effect)) {
    const modifiedStat = applyStatModifier(baseStat, effect);
}
```

## Utility Functions

```typescript
// Cloning (for immutable updates)
const characterCopy = cloneCharacter(player);
const enemyCopy = cloneEnemy(goblin);

// Serialization (for saving)
const savedCharacter = serializeCharacter(player);
localStorage.setItem('player', savedCharacter);

// Deserialization (for loading)
const loaded = localStorage.getItem('player');
const player = deserializeCharacter(loaded);

// Validation
try {
    validateCharacter(player);
    console.log("Character is valid!");
} catch (error) {
    console.error("Invalid character:", error);
}
```

## Next Steps

Once functions are implemented, you can:

1. Build CLI tools using these patterns
2. Create interactive combat simulations
3. Build character progression systems
4. Create quest and dialogue systems
5. Implement full game loops

See `CLI_FUNCTION_MAPPING.md` for CLI-specific usage patterns.
