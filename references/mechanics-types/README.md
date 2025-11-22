# Axiomancer Game Mechanics Types

This directory contains the bare-minimum, core game mechanics types extracted from the Axiomancer implementation. These types represent **only the implemented game engine features** - no UI, no backend, no planned/unimplemented features.

## Purpose

This type library serves as the foundation for a standalone game mechanics engine. It includes only:
- ✅ Fully implemented game systems
- ✅ Core mechanics with working formulas
- ✅ Types actively used in combat and character progression
- ❌ UI-specific types (icons, images, portraits)
- ❌ Backend-specific types (persistence, auth)
- ❌ Planned/unimplemented features (marked with `@planned` in source)

## Type Categories

### [character/](./character/)
Core character system with three-attribute stat progression (Heart, Body, Mind).
- `BaseStats`: Primary attributes
- `DerivedStats`: Calculated combat stats
- `Character`: Complete character entity with progression

### [combat/](./combat/)
Rock-paper-scissors combat system (Heart > Body > Mind > Heart).
- `CombatType`, `CombatActionType`, `AdvantageType`: Combat choices
- `CombatDecision`: Player's round decision
- `BattleLogEntry`: Round result recording
- `CombatState`: Active battle state
- `CombatResolutionResult`: Round resolution data

### [skills/](./skills/)
Philosophical combat skills (fallacies, virtues, logic, rhetoric).
- `Skill`: Skill entity with costs, damage, effects
- `SkillLearningRequirement`: Prerequisites for learning
- `SkillCombatEffects`: Contextual skill effects

### [enemy/](./enemy/)
Enemy entities using the same stat system as characters.
- `Enemy`: Combat opponent
- `EnemyTier`: Difficulty classification

## Core Game Mechanics

### Stat System
- **Base Stats**: Heart (1-N), Body (1-N), Mind (1-N)
- **Derived Stats**: Calculated from base stats using fixed formulas
  - Attack stats: `base * 3` (physical, mind, ailment)
  - Defense stats: `base * 2` (physical, mind, ailment)
  - Saves: `base * 2` (constitution, reflex, will)
  - Evasion: `mind * 1 + heart * 3`
  - Accuracy: `(heart + body + mind) * 5`
  - Luck: `heart * 5 + (heart + body + mind)`

### Health & Mana
- **Max HP**: `50 + (body * 20) + (heart * 8)`
- **Max MP**: `30 + (mind * 15) + (heart * 8)`

### Combat System
- **Type Advantage**: Heart > Body > Mind > Heart (cyclic)
- **Dice Rolls**:
  - Advantage: 2d20 take higher
  - Normal: 1d20
  - Disadvantage: 2d20 take lower
- **Scenarios**:
  - Attack vs Attack: Both roll, winner rolls for damage
  - Attack vs Defend: Auto-hit, defender gets 1.5x defense
  - Defend vs Defend: No damage, friendship counter increments

### Character Creation
- Start with 1 in each stat (Heart, Body, Mind)
- Receive 5 additional points to allocate
- Minimum: 1 in each stat
- No maximum cap

### Progression
- Gain stat points every 2 levels (levels 2, 4, 6, etc.)
- Experience-based leveling
- Learn skills based on level and stat requirements

## Implementation Status

These types are based on the **active, implemented** systems in the codebase:
- ✅ Character stats and progression (`statCalculations.ts`)
- ✅ Combat mechanics (`newCombatMechanics.ts`)
- ✅ Skill database (`fallacySkills.ts`)
- ✅ Enemy database (`enemyHelper.ts`)

## Test Coverage

Each type category includes comprehensive test files with **skipped tests**. These tests outline the expected behavior and mechanics that need to be implemented in the standalone library.

Run tests with:
```bash
npm test
# or
vitest
```

## Usage

This is a **type-only library** meant to be used as a foundation. You'll need to implement:
1. Stat calculation functions
2. Combat resolution engine
3. Skill effect system
4. Enemy AI/decision making
5. Character progression logic

Each test file provides a roadmap for what needs to be implemented.

## Design Philosophy

**Tabletop RPG Mechanics**
- Dice-based resolution (d20 system)
- Advantage/disadvantage mechanics
- Stat-based derived attributes
- Turn-based combat

**Philosophical Theme**
- Skills based on logical fallacies
- Three aspects: Heart (emotion), Body (physical), Mind (intellect)
- Combat as philosophical debate
- Peaceful resolution option (friendship counter)

## Next Steps

To build the standalone game engine:
1. Implement stat calculation utilities (see test files)
2. Build combat resolution engine
3. Create skill effect system
4. Implement enemy AI
5. Add progression/leveling system
6. Consider extending with equipment, buffs, or other systems

## Contributing

When extending these types:
- Keep game mechanics separate from UI
- Test all formulas against TDD principles
- Document stat calculations and combat resolution
- Maintain philosophical theme consistency
