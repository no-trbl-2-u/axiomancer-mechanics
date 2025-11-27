# Type System Overview

This document provides an overview of the type system used throughout the Axiomancer RPG mechanics library.

## Core Stat System

### Base Stats (Character)
The foundation of the character system revolves around three base attributes:

- **Body**: Physical strength and constitution
- **Mind**: Intelligence, reflexes, and perception  
- **Heart**: Emotion, willpower, and charisma

```typescript
interface BaseStats {
    body: number;
    mind: number;
    heart: number;
}
```

### Derived Stats (Character)
Each base stat derives four combat-related statistics:

**From Body:**
- `physicalSkill`: Attack modifier for body-type attacks
- `physicalDefense`: Defense against body-type attacks
- `physicalSave`: Saving throw against physical effects
- `physicalTest`: Modifier for physical ability checks

**From Mind:**
- `mentalSkill`: Attack modifier for mind-type attacks
- `mentalDefense`: Defense against mind-type attacks
- `mentalSave`: Saving throw against mental effects
- `mentalTest`: Modifier for mental ability checks

**From Heart:**
- `emotionalSkill`: Attack modifier for heart-type attacks
- `emotionalDefense`: Defense against heart-type attacks
- `emotionalSave`: Saving throw against emotional effects
- `emotionalTest`: Modifier for emotional ability checks

**Shared:**
- `luck`: Average of all three base stats (affects criticals and random events)

### Character vs Enemy Stats

**Characters** have:
- Base stats (body, mind, heart)
- Derived stats (calculated from base stats)
- Level, health, mana

**Enemies** have:
- Only derived stats (no base stats)
- Level, health, mana
- Simplified stat structure for easier balancing

## Combat Type System

### Action Types
The three approaches to combat (rock-paper-scissors mechanics):

```typescript
type ActionType = 'heart' | 'body' | 'mind';
```

**Advantage Cycle:**
- Heart > Body (emotion overcomes brute force)
- Body > Mind (action overcomes thought)
- Mind > Heart (logic overcomes emotion)

### Actions
What you can do in combat:

```typescript
type Action = 'attack' | 'defend' | 'skill' | 'item' | 'flee' | 'back';
```

### Advantage States
```typescript
type Advantage = 'advantage' | 'neutral' | 'disadvantage';
```

## Skills System

### Skill Categories
```typescript
type SkillCategory = 'fallacy' | 'paradox';
```

- **Fallacies**: Logical fallacy-based skills
- **Paradoxes**: Philosophical paradox-based skills

### Skill Stat Alignment
```typescript
type SkillsStatType = 'body' | 'mind' | 'heart';
```

Each skill aligns with one base stat for scaling damage/effects.

## World System

### Map Events
```typescript
type MapEvents = 
    | 'encounter'       // Regular combat
    | 'boss-encounter'  // Boss battle
    | 'event'          // Story event
    | 'treasure'       // Item/loot discovery
    | 'gather'         // Resource gathering
    | 'quest'          // Quest event
    | 'shop'           // Merchant/shopping
    | 'npc'            // NPC interaction
    | 'other';         // Miscellaneous
```

### Rewards
```typescript
type Reward = 
    | 'experience'  // XP for leveling
    | Item          // Item reward (equipment, consumable, material, quest-item)
    | 'currency'    // Gold/currency
    | 'skill'       // Learn new skill
    | 'quest';      // Quest advancement
```

## Items System

### Item Types
```typescript
type Item = 
    | 'equipment'    // Wearable items that provide stat bonuses
    | 'consumable'   // Usable items (potions, scrolls)
    | 'material'     // Crafting materials
    | 'quest-item';  // Key items for quests
```

## Effects System

### Effect Categories
```typescript
type EffectCategory = 
    | 'buff'      // Positive status effect
    | 'debuff'    // Negative status effect
    | 'condition' // Special condition (stunned, etc.)
    | 'fallacy'   // Fallacy-based effect
    | 'paradox';  // Paradox-based effect
```

### Effect Duration
```typescript
type EffectDuration = 
    | 'instant'    // Applied immediately, no duration
    | 'temporary'  // Lasts for N turns
    | 'permanent'; // Lasts until combat ends
```

### Effect Target
```typescript
type EffectTarget = 
    | 'self'   // Affects the caster
    | 'enemy'  // Affects opponent
    | 'all';   // Affects all combatants
```

## Enemy System

### Enemy Tiers
```typescript
type EnemyTier = 
    | 'normal' // Standard enemy
    | 'elite'  // Stronger than normal
    | 'boss';  // Major encounter
```

Tiers affect stat multipliers and loot drops.

## Combat State System

### Combat Phases
```typescript
type CombatPhase = 
    | 'choosing_type'   // Selecting attack type
    | 'choosing_action' // Selecting action
    | 'choosing_skill'  // Selecting skill to use
    | 'resolving'       // Processing combat round
    | 'ended'           // Combat finished
    | null;             // Not in combat
```

## Type Guards and Type Safety

All modules include type guard functions:

```typescript
// Character
function isCharacterAlive(character: Character): boolean
function isCharacterDefeated(character: Character): boolean

// Enemy  
function isBoss(enemy: Enemy): boolean
function isElite(enemy: Enemy): boolean

// Skills
function isFallacy(skill: Skill): boolean
function isParadox(skill: Skill): boolean
function isBodySkill(skill: Skill): boolean
function isMindSkill(skill: Skill): boolean
function isHeartSkill(skill: Skill): boolean

// Items
function isEquipment(item: BaseItem): item is Equipment
function isConsumable(item: BaseItem): item is Consumable
function isMaterial(item: BaseItem): item is Material
function isQuestItem(item: BaseItem): item is QuestItem

// Effects
function isBuff(effect: Effect): boolean
function isDebuff(effect: Effect): boolean
function isStatModifier(effect: Effect): effect is StatModifier
function isDamageOverTime(effect: Effect): effect is DamageOverTime
function isHealOverTime(effect: Effect): effect is HealOverTime
```

## Type Relationships

### Character → Combat
```
Character
  ├─ BaseStats → DerivedStats
  ├─ Health/Mana
  └─ Level
         ↓
    CombatState
         ├─ Player: Character
         ├─ Enemy: Enemy
         ├─ Phase: CombatPhase
         └─ BattleLog: BattleLogEntry[]
```

### World → Map → Events/NPCs/Enemies
```
WorldState
  ├─ Maps: Map[]
  │    ├─ Enemies: Enemy[]
  │    ├─ Events: MapEvent[]
  │    └─ NPCs: NPC[]
  └─ IncompleteQuests: Quest[]
```

### Skills → Character
```
Skill
  ├─ LearningRequirement
  │    ├─ Level
  │    ├─ StatType
  │    └─ StatValue
  └─ PhilosophicalAspect
       └─ Maps to Character.BaseStats
```

## Type Safety Patterns

### Pure Functions
All functions return new objects rather than mutating:

```typescript
// ✅ Good - Returns new character
function levelUpCharacter(character: Character): Character

// ❌ Bad - Would mutate
function levelUpCharacter(character: Character): void
```

### Type Narrowing
Use type guards for safe operations:

```typescript
function useItem(item: BaseItem) {
    if (isConsumable(item)) {
        // TypeScript knows item is Consumable here
        const effects = useConsumable(item);
    } else if (isEquipment(item)) {
        // TypeScript knows item is Equipment here
        const bonus = getEquipmentStatBonus(item, 'body');
    }
}
```

### Optional Properties
Many types use optional properties for flexibility:

```typescript
interface Skill {
    id: string;                                  // Required
    name: string;                                // Required
    philosophicalAspect?: SkillsStatType;       // Optional
    learningRequirement?: SkillLearningRequirement; // Optional
}
```

## Serialization Support

All major types can be serialized/deserialized:

```typescript
// Every module has these functions
function serialize{Type}(obj: Type): string
function deserialize{Type}(json: string): Type

// Examples:
serializeCharacter(character: Character): string
deserializeCharacter(json: string): Character

serializeEnemy(enemy: Enemy): string
deserializeEnemy(json: string): Enemy

// etc.
```

This enables:
- Saving/loading game state
- Network transmission
- State persistence
- Debugging and logging

## Type Validation

All modules include validation functions:

```typescript
// Validate complete objects
function validateCharacter(character: Character): boolean
function validateEnemy(enemy: Enemy): boolean
function validateSkill(skill: Skill): boolean

// Validate sub-components
function validateBaseStats(baseStats: BaseStats): boolean
function validateEnemyStats(stats: EnemyStats): boolean
function validateDialogueMap(dialogue: DialogueMap): boolean
```

## Module Path Aliases

TypeScript path aliases are configured for clean imports:

```typescript
// Instead of:
import { Character } from '../../Character/types';

// Use:
import { Character } from '@Character/types';

// Available aliases:
// @Character, @Combat, @Effects, @Enemy
// @Items, @NPCs, @Skills, @World, @Game
```

## Extending Types

To add new types:

1. Define in appropriate `types.d.ts`
2. Export from module's `index.ts`
3. Create creation functions
4. Create type guards
5. Create validation functions
6. Add serialization support

Example pattern:
```typescript
// types.d.ts
export interface NewType {
    id: string;
    // ... properties
}

// index.ts
export function createNewType(...): NewType { }
export function isNewType(obj: any): obj is NewType { }
export function validateNewType(obj: NewType): boolean { }
export function serializeNewType(obj: NewType): string { }
export function deserializeNewType(json: string): NewType { }
```
