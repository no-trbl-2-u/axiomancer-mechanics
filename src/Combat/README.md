# Combat Module

The Combat module implements a turn-based combat system with rock-paper-scissors type advantages. It handles everything from dice rolling to damage calculation, health management, and battle logging.

## Core Mechanics

- **Type Advantage**: Heart > Body > Mind > Heart (cyclic)
- **Advantage Modifiers**: Advantage = 1.5x, Neutral = 1.0x, Disadvantage = 0.75x
- **Critical Hits**: Natural 20 = 2x damage
- **Critical Miss**: Natural 1 = automatic miss
- **Friendship**: Reaching 3 friendship counter ends combat peacefully

## Files

| File | Purpose |
|------|---------|
| `index.ts` | Combat utility functions (advantage, dice, damage, health, rounds) |
| `combat.reducer.ts` | Pure state management functions for CombatState |
| `types.d.ts` | Type definitions for combat actions, phases, and state |
| `combat.cli.ts` | CLI interface for combat simulation |
| `combat.test.ts` | Tests for combat utility functions |
| `combat.reducer.test.ts` | Tests for combat reducer functions |

## Architecture

### index.ts (Utility Functions)
- **Type Advantage**: `determineAdvantage`, `getAdvantageModifier`, `hasAdvantage`
- **Dice Rolling**: `rollDie`, `rollDice`, `rollD20`, `rollWithAdvantage`, `rollWithDisadvantage`, `rollSkillCheck`
- **Stat Lookups**: `getSkillStatForType`, `getDefenseStatForType`, `getSaveStatForType`, `getBaseStatForType`
- **Attack/Defense Rolls**: `performAttackRoll`, `performDefenseRoll`, `isAttackSuccessful`, `isCriticalHit`, `isCriticalMiss`
- **Damage Calculation**: `calculateBaseDamage`, `calculateDamageReduction`, `calculateFinalDamage`, `calculateAttackDamage`
- **Health Management**: `applyDamage`, `healCharacter`, `isAlive`, `isDefeated`, `getHealthPercentage`
- **Round Processing**: `processPlayerTurn`, `processEnemyTurn`, `determineTurnOrder`, `rollInitiative`
- **Battle Logging**: `createBattleLogEntry`, `formatAllBattleLogs`, `generateCombatResultMessage`

### combat.reducer.ts (State Management)
- **Initialization**: `initializeCombat`, `resetCombat`
- **Phase Management**: `updateCombatPhase`
- **Action Selection**: `setPlayerAttackType`, `setPlayerAction`
- **Round Resolution**: `resolveCombatRound`
- **Friendship**: `incrementFriendship`, `endCombatWithFriendship`
- **End States**: `endCombatPlayerVictory`, `endCombatPlayerDefeat`

## Combat Flow

1. **Initialize** combat state with player and enemy
2. **Choose Type** (heart/body/mind)
3. **Choose Action** (attack/defend/skill/item/flee)
4. **Resolve Round** - calculate advantage, rolls, damage
5. **Log Results** and check for combat end conditions
6. Repeat until one side is defeated or friendship is achieved
