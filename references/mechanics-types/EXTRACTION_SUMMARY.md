# Mechanics Types Extraction Summary

## Overview
Successfully extracted **bare-minimum game mechanics types** from Axiomancer 2.0 into a standalone type library at `/mechanics-types/`.

## What Was Included ✅

### Character System
- `BaseStats`: Heart, Body, Mind (3 core attributes)
- `DerivedStats`: 12 calculated stats from base stats
- `Character`: Core entity with level, experience, HP, MP, stat points

### Combat System (Rock-Paper-Scissors)
- `CombatType`: Heart, Body, Mind with cyclic advantage
- `CombatActionType`: Attack, Defend
- `CombatDecision`: Player's choice per round
- `BattleLogEntry`: Complete round recording
- `CombatState`: Active battle state
- `CombatResolutionResult`: Round resolution data

### Skills System
- `Skill`: Philosophical combat abilities
- `SkillType`: Fallacy, Virtue, Logic, Rhetoric, Meditation
- `FallacyType`: Formal, Informal, Cognitive Bias
- `SkillLearningRequirement`: Level and stat prerequisites
- `SkillCombatEffects`: Contextual effects

### Enemy System
- `Enemy`: Combat opponents using same stat system
- `EnemyTier`: Normal, Elite, Boss classification

## What Was Excluded ❌

### UI-Specific
- Character portraits (images, URLs)
- Skill icons
- Enemy images
- Screen types
- Map images
- Coordinates for rendering

### Backend-Specific
- Authentication (User, AuthState, Credentials)
- Database persistence types
- API response types

### Unimplemented Features
- Equipment/Inventory system (TODO in source)
- Buff/Debuff system (isolated, not integrated)
- Quest system (thin implementation)
- Location/Node navigation (mostly UI)
- GlobalMapNode (marked @planned)
- ExplorationNode (marked @planned)
- DialogueOption (marked @planned)
- NodeChoice (marked @planned)
- InventoryCategories (marked @planned)

### Deprecated Systems
- Old combat system (replaced by new mechanics)
- Legacy buff/debuff engine

## File Structure

```
mechanics-types/
├── README.md                    # Complete documentation
├── index.ts                     # Barrel exports
├── EXTRACTION_SUMMARY.md        # This file
│
├── character/
│   ├── types.d.ts              # 3 types: BaseStats, DerivedStats, Character
│   ├── README.md               # Category documentation
│   └── character.test.ts       # 30 skipped tests
│
├── combat/
│   ├── types.d.ts              # 8 types: CombatType, CombatDecision, etc.
│   ├── README.md               # Category documentation
│   └── combat.test.ts          # 68 skipped tests
│
├── skills/
│   ├── types.d.ts              # 7 types: Skill, SkillType, etc.
│   ├── README.md               # Category documentation
│   └── skills.test.ts          # 23 skipped tests
│
└── enemy/
    ├── types.d.ts              # 2 types: Enemy, EnemyTier
    ├── README.md               # Category documentation
    └── enemy.test.ts           # 9 skipped tests
```

## Statistics

- **Total Types**: 20 core types
- **Total Test Cases**: 130 skipped tests
- **Categories**: 4 (Character, Combat, Skills, Enemy)
- **Lines of Type Definitions**: ~200 LOC
- **Lines of Test Code**: ~700 LOC
- **Documentation Files**: 5 markdown files

## Implementation Criteria

Types were included ONLY if they met ALL criteria:
1. ✅ Actively used in implemented game mechanics
2. ✅ Have working implementations in source code
3. ✅ Not marked as TODO or @planned
4. ✅ Not UI-specific (no icons, images, renders)
5. ✅ Not backend-specific (no auth, persistence)
6. ✅ Not deprecated/legacy code

## Core Formulas Extracted

### Derived Stats
```typescript
physicalAttack = body * 3
physicalDefense = body * 2
constitutionSave = body * 2

mindAttack = mind * 3
mindDefense = mind * 2
reflexSave = mind * 2
perception = mind * 2

ailmentAttack = heart * 3
ailmentDefense = heart * 2
willSave = heart * 2

evasion = (mind * 1) + (heart * 3)
accuracy = (heart + body + mind) * 5
luck = (heart * 5) + (heart + body + mind)
```

### Health & Mana
```typescript
maxHP = 50 + (body * 20) + (heart * 8)
maxMP = 30 + (mind * 15) + (heart * 8)
```

### Combat Mechanics
- **Type Advantage**: Heart > Body > Mind > Heart
- **Advantage**: Roll 2d20, take higher
- **Normal**: Roll 1d20
- **Disadvantage**: Roll 2d20, take lower
- **Defend Bonus**: 1.5x defense multiplier
- **Friendship**: 3 mutual defends = peaceful resolution

## Test-Driven Development (TDD) Approach

All test files include comprehensive skipped tests that define:
- Expected behavior for each type
- Game mechanic formulas to implement
- Edge cases to handle
- Validation requirements

Tests organized by:
1. **Type validation** - Ensuring data integrity
2. **Calculation tests** - Formula verification
3. **Mechanic tests** - Game rule enforcement
4. **Integration tests** - Cross-system interaction

## Usage Instructions

### For Type Library Consumers
```typescript
import { Character, BaseStats, DerivedStats } from './mechanics-types';
import { CombatState, CombatDecision } from './mechanics-types';
import { Skill, Enemy } from './mechanics-types';
```

### For Implementation
1. Read test files to understand requirements
2. Implement functions matching test expectations
3. Unskip tests one-by-one as features complete
4. Verify all formulas match documented mechanics

### For Extension
- Add new types in appropriate category folders
- Include README.md documentation
- Create comprehensive test suite
- Update index.ts exports

## Design Decisions

### Why These Types?
- **Character**: Foundation of progression system
- **Combat**: Core gameplay loop (fully implemented)
- **Skills**: Differentiates combat choices
- **Enemy**: Required for combat encounters

### Why Not Others?
- **Equipment**: Marked as TODO in source
- **Buffs**: Not integrated into active combat
- **Quests**: Thin implementation, mostly UI
- **Locations**: Navigation/UI concern
- **NPCs/Dialogue**: Content layer, not mechanics

### Type Trimming Examples

**Character (Before)**:
```typescript
interface Character {
  // ... 20+ properties including:
  portrait?: CharacterPortrait;  // ❌ UI-specific
  persistentEffects?: {...};     // ❌ TODO/unimplemented
  availableSkills: Skill[];      // ❌ Removed (not used in combat)
  equippedSkills: {...};         // ❌ Removed (not used in combat)
  unassignedStatPoints: number;  // ❌ Removed (UI state)
}
```

**Character (After)**:
```typescript
interface Character {
  id: string;
  name: string;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  baseStats: BaseStats;
  derivedStats: DerivedStats;
  availableStatPoints: number;
}
```

## Validation

Each extracted type was validated against:
1. **Source code usage**: Grep'd for actual usage
2. **Implementation status**: Checked for working functions
3. **Test coverage**: Verified with existing tests
4. **Documentation**: Confirmed in combat mechanics docs

## Next Steps for Library Users

1. **Implement stat calculations** (character.test.ts)
2. **Build combat engine** (combat.test.ts)
3. **Create skill system** (skills.test.ts)
4. **Implement enemy AI** (enemy.test.ts)
5. **Add progression mechanics**
6. **Consider extensions** (equipment, buffs, etc.)

## Philosophy Maintained

✅ **TDD Expert**: 130 comprehensive test cases outline all behavior
✅ **TRPG Expert**: Dice mechanics, advantage, stats, progression
✅ **Bare Minimum**: Only implemented features
✅ **Game Mechanics Only**: No UI, no backend, pure engine
✅ **Useful & Relevant**: All types actively used

## Final Notes

This extraction represents the **core game engine** that could be ported to:
- Standalone Node.js library
- Different frontend framework
- Backend game server
- CLI-based game
- Mobile implementation

The types are **framework-agnostic** and focus purely on game state and mechanics, making them highly portable and reusable.
