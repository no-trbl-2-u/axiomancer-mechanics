# Code Review - Axiomancer Mechanics

## Executive Summary

This review covers the entire codebase with a focus on:
1. **Type Safety & Cleaner Types** - Improving TypeScript types for better safety
2. **Readability** - Making code easier to understand and maintain
3. **Implementation Patterns** - Better ways to structure and organize code

---

## 1. Type Safety Issues & Improvements

### 1.1 Redundant Array Types

**Location:** `src/Character/types.d.ts:43`

```typescript
// ❌ Current
inventory: Item[] | [];

// ✅ Better
inventory: Item[];
```

**Issue:** `Item[] | []` is redundant. An empty array `[]` is already covered by `Item[]`.

**Similar issues found in:**
- `src/World/types.d.ts:119` - `completedNodes: NodeId[] | []`
- `src/World/types.d.ts:120` - `availableNodes: NodeId[] | []`
- `src/World/types.d.ts:121` - `lockedNodes: NodeId[] | []`
- `src/World/types.d.ts:125` - `uniqueEvents: UniqueEvent[] | []`
- `src/World/types.d.ts:147` - `lockedMaps: MapName[] | []`
- `src/World/types.d.ts:148` - `completedMaps: MapName[] | []`

---

### 1.2 Use `undefined` Instead of `null` for Optional Properties

**Location:** `src/Character/types.d.ts:44-45`

```typescript
// ❌ Current
equipped?: null
skills?: null

// ✅ Better - Remove these lines entirely or use proper types
// Optional properties are already undefined if not set
equipped?: Equipment;  // When Equipment type is defined
skills?: Skill[];      // When Skills are defined
```

**Rationale:** In TypeScript, optional properties (`?`) are already `undefined` by default. Using `?: null` is confusing and non-idiomatic. If these are truly not yet implemented, either omit them entirely or use TODO types.

---

### 1.3 Invalid Type Definition

**Location:** `src/World/types.d.ts:73-80`

```typescript
// ❌ Current
interface UniqueEvent {
    // name: MapEvents;
    // description: string;
    // nodeLocation: [number, number];
    // completed: boolean;
    // TODO: Implement more properties
    undefined
}

// ✅ Better - Use a proper placeholder or omit
// Option 1: Empty interface with TODO
interface UniqueEvent {
    // TODO: Implement UniqueEvent properties
}

// Option 2: Use a basic structure
interface UniqueEvent {
    id: string;
    // TODO: Add more properties as needed
}

// Option 3: Type alias to indicate incomplete
type UniqueEvent = Record<string, never>; // Empty object type
```

**Issue:** `undefined` is not a valid type property. This will cause TypeScript errors.

---

### 1.4 Weak Item Type Definition

**Location:** `src/Items/types.d.ts:7`

```typescript
// ❌ Current
export type Item = 'equipment' | 'consumable' | 'material' | 'quest-item';

// ✅ Better - Create proper item interfaces with discriminated unions
export type ItemCategory = 'equipment' | 'consumable' | 'material' | 'quest-item';

export interface BaseItem {
    id: string;
    name: string;
    description: string;
    category: ItemCategory;
}

export interface Equipment extends BaseItem {
    category: 'equipment';
    slot: 'weapon' | 'armor' | 'accessory';
    // ... equipment-specific properties
}

export interface Consumable extends BaseItem {
    category: 'consumable';
    effect: string;
    quantity: number;
}

export interface Material extends BaseItem {
    category: 'material';
    quantity: number;
}

export interface QuestItem extends BaseItem {
    category: 'quest-item';
    questId: string;
}

export type Item = Equipment | Consumable | Material | QuestItem;

// Type guard example
export function isEquipment(item: Item): item is Equipment {
    return item.category === 'equipment';
}
```

**Benefit:** This provides proper type discrimination and allows for different properties per item type.

---

### 1.5 Branded Types for IDs

**Location:** Multiple files using string IDs

```typescript
// ❌ Current
type NodeId = string;
id: string; // in Enemy, Skill, etc.

// ✅ Better - Use branded types
export type NodeId = string & { readonly __brand: 'NodeId' };
export type EnemyId = string & { readonly __brand: 'EnemyId' };
export type SkillId = string & { readonly __brand: 'SkillId' };
export type QuestId = string & { readonly __brand: 'QuestId' };

// Helper functions to create branded types
export function createNodeId(id: string): NodeId {
    return id as NodeId;
}

export function createEnemyId(id: string): EnemyId {
    return id as EnemyId;
}
```

**Benefit:** Prevents accidentally mixing up different types of IDs (e.g., using an EnemyId where a NodeId is expected).

---

### 1.6 More Type-Safe DialogueMap

**Location:** `src/NPCs/types.d.ts:20-22`

```typescript
// ❌ Current
export interface DialogueMap {
    [key: string]: string | string[];
}

// ✅ Better - More specific dialogue structure
export type DialogueEntry = string | string[];

export interface DialogueMap {
    greeting?: DialogueEntry;
    farewell?: DialogueEntry;
    quest?: DialogueEntry;
    trade?: DialogueEntry;
    [key: string]: DialogueEntry | undefined; // Allow custom keys
}

// Or even better with literal types for known dialogue types
export type DialogueType = 'greeting' | 'farewell' | 'quest' | 'trade' | 'gossip';

export type DialogueMap = {
    [K in DialogueType]?: DialogueEntry;
} & {
    [key: string]: DialogueEntry | undefined;
};
```

---

### 1.7 Improve Skill Combat Effects Type

**Location:** `src/Skills/types.d.ts:41-47`

```typescript
// ❌ Current
export interface SkillCombatEffects {
    description: string;
    effect?: string;
}

// ✅ Better - Use discriminated union for different effect types
export type EffectType = 'damage' | 'heal' | 'buff' | 'debuff' | 'status';

export interface DamageEffect {
    type: 'damage';
    damageFormula: string;
    damageType: ActionType;
}

export interface HealEffect {
    type: 'heal';
    healAmount: number | string; // number or formula
}

export interface BuffEffect {
    type: 'buff';
    statModifier: Partial<DerivedStats>;
    duration: number;
}

export interface DebuffEffect {
    type: 'debuff';
    statModifier: Partial<DerivedStats>;
    duration: number;
}

export interface StatusEffect {
    type: 'status';
    statusName: string;
    duration: number;
}

export type SkillEffect = DamageEffect | HealEffect | BuffEffect | DebuffEffect | StatusEffect;

export interface SkillCombatEffects {
    description: string;
    effects: SkillEffect[];
}
```

---

### 1.8 Make Readonly Where Appropriate

```typescript
// For configuration/library objects that shouldn't be modified
export const fishingVillage: Readonly<Map> = {
    // ...
} as const;

// Or for properties that shouldn't change
export interface Character {
    readonly name: string;  // Name shouldn't change after creation
    level: number;
    // ...
}

// For arrays that shouldn't be modified
export interface Continent {
    readonly name: ContinentName;
    availableMaps: readonly MapName[];
    // ...
}
```

---

## 2. Readability Improvements

### 2.1 Extract Magic Numbers to Named Constants

**Location:** `src/Character/index.ts:15-36`

```typescript
// ❌ Current
const deriveStats = ({ body, heart, mind }: BaseStats): DerivedStats => ({
    physicalSkill: body,
    physicalDefense: body * 3,
    physicalSave: body * 2,
    physicalTest: body * 4,
    // ...
})

// ✅ Better
const STAT_MULTIPLIERS = {
    DEFENSE: 3,
    SAVE: 2,
    TEST: 4,
} as const;

const deriveStats = ({ body, heart, mind }: BaseStats): DerivedStats => ({
    physicalSkill: body,
    physicalDefense: body * STAT_MULTIPLIERS.DEFENSE,
    physicalSave: body * STAT_MULTIPLIERS.SAVE,
    physicalTest: body * STAT_MULTIPLIERS.TEST,
    
    mentalSkill: mind,
    mentalDefense: mind * STAT_MULTIPLIERS.DEFENSE,
    mentalSave: mind * STAT_MULTIPLIERS.SAVE,
    mentalTest: mind * STAT_MULTIPLIERS.TEST,
    
    emotionalSkill: heart,
    emotionalDefense: heart * STAT_MULTIPLIERS.DEFENSE,
    emotionalSave: heart * STAT_MULTIPLIERS.SAVE,
    emotionalTest: heart * STAT_MULTIPLIERS.TEST,
    
    luck: (body + heart + mind) / 3,
})
```

**Similar for experience calculation:**

```typescript
// ❌ Current
const experience = (level - 1) * 1000;
const experienceToNextLevel = level * 1000;

// ✅ Better
const EXPERIENCE_PER_LEVEL = 1000;

const experience = (level - 1) * EXPERIENCE_PER_LEVEL;
const experienceToNextLevel = level * EXPERIENCE_PER_LEVEL;
```

---

### 2.2 Simplify Unnecessary Currying

**Location:** `src/Character/index.ts:46-61`

```typescript
// ❌ Current - Unnecessarily complex currying
const detMaxHealthByLevel = (level: number) => (healthStats: Omit<BaseStats, 'mind'>) => {
    const averageOfHealthStats = (healthStats.body + healthStats.heart) / 2;
    return level * (averageOfHealthStats * 10);
}

const maxHealth = detMaxHealthByLevel(level)(baseStats);

// ✅ Better - Simple function
const HEALTH_PER_STAT_MULTIPLIER = 10;

function calculateMaxHealth(level: number, healthStats: Pick<BaseStats, 'body' | 'heart'>): number {
    const averageHealthStats = (healthStats.body + healthStats.heart) / 2;
    return level * averageHealthStats * HEALTH_PER_STAT_MULTIPLIER;
}

const maxHealth = calculateMaxHealth(level, baseStats);

// Same for mana
const MANA_PER_STAT_MULTIPLIER = 10;

function calculateMaxMana(level: number, manaStats: Pick<BaseStats, 'mind' | 'heart'>): number {
    const averageManaStats = (manaStats.mind + manaStats.heart) / 2;
    return level * averageManaStats * MANA_PER_STAT_MULTIPLIER;
}
```

**Rationale:** The currying doesn't provide any benefit here and makes the code harder to read. Use currying when you need partial application or function composition.

---

### 2.3 Consistent Naming Conventions

**Issues found:**
- `detMaxHealthByLevel` - Inconsistent abbreviation
- `ActionToString` - Should be `actionToString` (camelCase for functions)

```typescript
// ❌ Current
const detMaxHealthByLevel = ...
export function ActionToString(action: Action): string

// ✅ Better
const calculateMaxHealthByLevel = ...  // or calculateMaxHealth
export function actionToString(action: Action): string
```

---

### 2.4 Remove "(Guess)" Comments

**Location:** Multiple type definition files

```typescript
// ❌ Current
/**
 * @property physicalSkill - (Guess) Modifier for physical skill checks
 */

// ✅ Better - Either confirm and remove, or be more explicit
/**
 * @property physicalSkill - Modifier for physical skill checks and attack rolls
 * @todo Verify exact calculation and usage
 */

// Or if truly unknown:
/**
 * @property physicalSkill - Modifier for physical-type actions
 * @remarks Implementation pending game design finalization
 */
```

---

### 2.5 Better Constant Organization

**Location:** `src/Game/reducers/actions.constants.ts`

```typescript
// ❌ Current
export const COMBAT_ACTION = {
    ATTACK: "attack",
    DEFEND: "defend",
    SKILL: "skill",
    ITEM: "item",
    FLEE: "flee",
    BACK: "back",
}

// ✅ Better - Use const assertion for type inference
export const COMBAT_ACTION = {
    ATTACK: "attack",
    DEFEND: "defend",
    SKILL: "skill",
    ITEM: "item",
    FLEE: "flee",
    BACK: "back",
} as const;

export type CombatActionType = typeof COMBAT_ACTION[keyof typeof COMBAT_ACTION];

// Or even better - use an enum if these are truly constants
export enum CombatAction {
    ATTACK = "attack",
    DEFEND = "defend",
    SKILL = "skill",
    ITEM = "item",
    FLEE = "flee",
    BACK = "back",
}
```

---

### 2.6 Input Validation in CLI

**Location:** `src/Character/character.cli.ts`

```typescript
// ❌ Current - No validation
const answer = await inquirer.prompt<{
    name: string;
    level: number;
    heart: number;
    body: number;
    mind: number;
}>([
    {
        type: 'input',
        name: 'level',
        message: 'Enter the level of your character...',
    },
    // ...
]);

// ✅ Better - Add validation
const answer = await inquirer.prompt<{
    name: string;
    level: number;
    heart: number;
    body: number;
    mind: number;
}>([
    {
        type: 'input',
        name: 'name',
        message: 'Enter the name of your character...',
        validate: (input: string) => {
            if (input.trim().length === 0) {
                return 'Name cannot be empty';
            }
            if (input.length > 50) {
                return 'Name must be 50 characters or less';
            }
            return true;
        }
    },
    {
        type: 'number', // Use 'number' type instead of 'input'
        name: 'level',
        message: 'Enter the level of your character...',
        default: 1,
        validate: (input: number) => {
            if (!Number.isInteger(input) || input < 1 || input > 100) {
                return 'Level must be between 1 and 100';
            }
            return true;
        }
    },
    {
        type: 'number',
        name: 'heart',
        message: 'Enter the heart stat of your character...',
        default: 1,
        validate: (input: number) => {
            if (!Number.isInteger(input) || input < 1 || input > 20) {
                return 'Heart must be between 1 and 20';
            }
            return true;
        }
    },
    // Same for body and mind...
]);
```

---

## 3. Better Implementation Patterns

### 3.1 Use Type Guards for Type Narrowing

```typescript
// Add to appropriate files
export function isCharacter(entity: Character | Enemy): entity is Character {
    return 'baseStats' in entity;
}

export function isEnemy(entity: Character | Enemy): entity is Enemy {
    return 'enemyStats' in entity;
}

export function isCombatActive(state: GameState): state is GameState & { combatState: CombatState } {
    return state.combatState !== null;
}
```

---

### 3.2 Create a Utility Module for Common Functions

**Create:** `src/Utils/index.ts`

```typescript
/**
 * Clamps a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Generates a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Deep clones an object using JSON serialization
 * Warning: Does not preserve functions, symbols, or undefined values
 */
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Calculates the average of an array of numbers
 */
export function average(...numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

/**
 * Rolls a die with the specified number of sides
 */
export function rollDie(sides: number): number {
    return randomInt(1, sides);
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
```

Then use these in `Character/index.ts`:

```typescript
import { average } from '../Utils';

const deriveStats = ({ body, heart, mind }: BaseStats): DerivedStats => ({
    // ...
    luck: average(body, heart, mind),
})
```

---

### 3.3 Better Error Handling

**Location:** `src/World/index.ts:10-18`

```typescript
// ❌ Current
function getCoastalMap(mapName: MapName): Map {
  switch (mapName) {
    case 'fishing-village':
      return fishingVillage;
    case 'northern-forest':
      return northernForest;
    default:
      throw new Error('Invalid map name');
  }
}

// ✅ Better
class MapNotFoundError extends Error {
    constructor(mapName: string) {
        super(`Map "${mapName}" not found in Coastal Continent`);
        this.name = 'MapNotFoundError';
    }
}

function getCoastalMap(mapName: MapName): Map {
  switch (mapName) {
    case 'fishing-village':
      return fishingVillage;
    case 'northern-forest':
      return northernForest;
    default:
      // This should never happen due to MapName type, but TypeScript requires it
      const exhaustiveCheck: never = mapName;
      throw new MapNotFoundError(exhaustiveCheck);
  }
}
```

---

### 3.4 Use Discriminated Unions for MapEvents

**Location:** `src/World/types.d.ts:58-63`

```typescript
// ❌ Current
export interface MapEvent {
    name: MapEvents;
    description: string;
    enemy?: Enemy;
    reward?: Reward;
}

// ✅ Better - Discriminated unions
export interface EncounterEvent {
    type: 'encounter';
    description: string;
    enemy: Enemy;
    reward?: Reward;
}

export interface BossEncounterEvent {
    type: 'boss-encounter';
    description: string;
    enemy: Enemy;
    reward: Reward;  // Boss always drops reward
}

export interface TreasureEvent {
    type: 'treasure';
    description: string;
    reward: Reward;
}

export interface NPCEvent {
    type: 'npc';
    description: string;
    npc: NPC;
}

export interface StoryEvent {
    type: 'event';
    description: string;
    choices?: EventChoice[];
}

export interface ShopEvent {
    type: 'shop';
    description: string;
    shopInventory: Item[];
}

export type MapEvent = 
    | EncounterEvent 
    | BossEncounterEvent 
    | TreasureEvent 
    | NPCEvent 
    | StoryEvent 
    | ShopEvent;

// Now you can use type narrowing
function handleMapEvent(event: MapEvent) {
    switch (event.type) {
        case 'encounter':
            // TypeScript knows event.enemy exists here
            return initiateCombat(event.enemy);
        case 'treasure':
            // TypeScript knows event.reward exists here
            return giveReward(event.reward);
        // ...
    }
}
```

---

### 3.5 Improve Stat Calculation with Helper Functions

```typescript
// Create a more maintainable stat derivation system
type StatType = 'physical' | 'mental' | 'emotional';

interface StatMultipliers {
    skill: number;
    defense: number;
    save: number;
    test: number;
}

const DERIVED_STAT_MULTIPLIERS: StatMultipliers = {
    skill: 1,
    defense: 3,
    save: 2,
    test: 4,
} as const;

function deriveSingleStatGroup(
    baseStat: number, 
    multipliers: StatMultipliers
): {
    skill: number;
    defense: number;
    save: number;
    test: number;
} {
    return {
        skill: baseStat * multipliers.skill,
        defense: baseStat * multipliers.defense,
        save: baseStat * multipliers.save,
        test: baseStat * multipliers.test,
    };
}

const deriveStats = ({ body, heart, mind }: BaseStats): DerivedStats => {
    const physicalStats = deriveSingleStatGroup(body, DERIVED_STAT_MULTIPLIERS);
    const mentalStats = deriveSingleStatGroup(mind, DERIVED_STAT_MULTIPLIERS);
    const emotionalStats = deriveSingleStatGroup(heart, DERIVED_STAT_MULTIPLIERS);

    return {
        physicalSkill: physicalStats.skill,
        physicalDefense: physicalStats.defense,
        physicalSave: physicalStats.save,
        physicalTest: physicalStats.test,
        
        mentalSkill: mentalStats.skill,
        mentalDefense: mentalStats.defense,
        mentalSave: mentalStats.save,
        mentalTest: mentalStats.test,
        
        emotionalSkill: emotionalStats.skill,
        emotionalDefense: emotionalStats.defense,
        emotionalSave: emotionalStats.save,
        emotionalTest: emotionalStats.test,
        
        luck: average(body, heart, mind),
    };
};
```

---

### 3.6 Better Module Organization

**Current structure has some inconsistencies:**

```
src/
├── Character/
│   ├── index.ts          ✓ Implementation
│   ├── types.d.ts        ✓ Types
│   ├── character.cli.ts  ✓ CLI
│   └── characters.mock.ts ✓ Test data
├── Enemy/
│   ├── index.ts          ✗ Empty
│   ├── types.d.ts        ✓ Types
│   └── enemy.library.ts  ✓ Data
```

**Suggested improvements:**

1. **Consistent naming:**
   - Use `*.types.ts` instead of `types.d.ts` for better clarity that these are TypeScript source files
   - Or keep `types.d.ts` but be consistent about what goes in them

2. **Create barrel exports:**
```typescript
// src/Character/index.ts - Re-export everything
export * from './types';
export * from './character';
export * from './character.utils';

// src/Enemy/index.ts
export * from './types';
export * from './enemy.library';
```

3. **Separate implementation from types:**
```
src/
├── Character/
│   ├── index.ts              // Barrel export
│   ├── character.types.ts    // Type definitions
│   ├── character.ts          // Core logic
│   ├── character.utils.ts    // Helper functions
│   ├── character.cli.ts      // CLI tool
│   └── character.mock.ts     // Test data
```

---

## 4. Technical Debt to Address

### 4.1 Remove All "Implement me" Stubs

The `Combat/index.ts` file has 60+ functions that all return `"Implement me" as any`. This is significant technical debt.

**Recommendations:**
1. Either implement the functions or remove them until needed
2. If keeping as stubs, use proper TypeScript:

```typescript
// ❌ Current
export function rollDie(sides: number): number {
    return "Implement me" as any;
}

// ✅ Better
export function rollDie(sides: number): number {
    throw new Error('Not yet implemented: rollDie');
    // Or for now, a basic implementation:
    // return Math.floor(Math.random() * sides) + 1;
}
```

---

### 4.2 Implement Missing Reducer Logic

All three reducers (`character.reducer.ts`, `combat.reducer.ts`, `world.reducer.ts`) are essentially empty.

**Recommendation:** Implement proper action-based state updates:

```typescript
// Example structure
type CharacterAction =
    | { type: 'LEVEL_UP' }
    | { type: 'TAKE_DAMAGE'; payload: { amount: number } }
    | { type: 'HEAL'; payload: { amount: number } }
    | { type: 'GAIN_EXPERIENCE'; payload: { amount: number } }
    | { type: 'ADD_ITEM'; payload: { item: Item } };

export function characterReducer(
    state: Character, 
    action: CharacterAction
): Character {
    switch (action.type) {
        case 'LEVEL_UP':
            return {
                ...state,
                level: state.level + 1,
                // ... recalculate stats
            };
        case 'TAKE_DAMAGE':
            return {
                ...state,
                health: Math.max(0, state.health - action.payload.amount),
            };
        // ... other cases
        default:
            return state;
    }
}
```

---

## 5. Documentation Improvements

### 5.1 Add README Sections

The current `README.md` is minimal. Add:
- Installation instructions
- Development setup
- How to run CLI tools
- Project structure explanation
- Contributing guidelines

### 5.2 Add JSDoc Examples

```typescript
/**
 * Creates a new character with calculated stats
 * 
 * @param options - Character creation parameters
 * @returns A fully initialized character
 * 
 * @example
 * ```typescript
 * const hero = createCharacter({
 *   name: "Aria",
 *   level: 1,
 *   baseStats: { heart: 5, body: 3, mind: 4 }
 * });
 * console.log(hero.maxHealth); // 40
 * ```
 */
export function createCharacter(options: CreateCharacterOptions): Character {
    // ...
}
```

---

## 6. Testing Recommendations

Currently, there are no test files. Consider adding:

1. **Unit tests for core functions:**
```typescript
// src/Character/character.test.ts
import { createCharacter, deriveStats } from './index';

describe('Character Creation', () => {
    it('should create a character with correct max health', () => {
        const char = createCharacter({
            name: 'Test',
            level: 1,
            baseStats: { heart: 5, body: 5, mind: 5 }
        });
        
        expect(char.maxHealth).toBe(50); // (5+5)/2 * 10 * 1
    });

    it('should derive stats correctly', () => {
        const stats = deriveStats({ heart: 3, body: 4, mind: 5 });
        expect(stats.physicalDefense).toBe(12); // 4 * 3
        expect(stats.luck).toBe(4); // (3+4+5)/3
    });
});
```

2. **Integration tests for CLI tools**
3. **Type tests to ensure type safety**

---

## 7. Priority Recommendations

### High Priority (Do These First)
1. ✅ Fix the `UniqueEvent` undefined issue
2. ✅ Remove redundant `| []` from array types
3. ✅ Replace `equipped?: null` with proper optional types
4. ✅ Add input validation to CLI tools
5. ✅ Extract magic numbers to named constants

### Medium Priority
6. Create proper Item type with discriminated unions
7. Add utility functions module
8. Implement at least basic combat functions (remove "Implement me")
9. Add type guards for common type checks
10. Use branded types for IDs

### Low Priority (Nice to Have)
11. Reorganize module structure for consistency
12. Add comprehensive JSDoc with examples
13. Set up testing infrastructure
14. Create better error classes
15. Add readonly modifiers where appropriate

---

## Conclusion

The codebase has a solid foundation with:
- ✅ Good type coverage
- ✅ Clear separation of concerns
- ✅ Thoughtful documentation comments
- ✅ Well-organized domain models

Main areas for improvement:
- 🔨 Type safety (remove `any`, fix invalid types)
- 🔨 Remove redundant type annotations
- 🔨 Extract magic numbers
- 🔨 Implement stubbed functions
- 🔨 Add validation and error handling
- 🔨 Improve consistency

By addressing these issues, the codebase will be more maintainable, type-safe, and easier to extend.
