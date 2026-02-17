/**
 * Combat Reducer Module Tests
 * Tests for pure state management functions that create/modify CombatState
 */

import {
    initializeCombat,
    resetCombat,
    updateCombatPhase,
    setPlayerAttackType,
    setPlayerAction,
    resolveCombatRound,
    addBattleLogEntry,
    incrementFriendship,
    endCombatWithFriendship,
    endCombatPlayerVictory,
    endCombatPlayerDefeat,
} from './combat.reducer';
import {
    ActionType,
    Action,
    CombatPhase,
    CombatState,
    BattleLogEntry,
} from './types';
import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { createCharacter } from '../Character/index';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestCharacter(): Character {
    return createCharacter({
        name: 'Test Hero',
        level: 2,
        baseStats: { heart: 3, body: 4, mind: 2 },
    });
}

function createTestEnemy(): Enemy {
    return {
        id: 'test-enemy-01',
        name: 'Test Goblin',
        description: 'A test goblin',
        level: 1,
        health: 20,
        mana: 5,
        enemyStats: {
            maxHealth: 20,
            maxMana: 5,
            physicalAttack: 3,
            physicalSkill: 2,
            physicalDefense: 2,
            mentalAttack: 1,
            mentalSkill: 1,
            mentalDefense: 1,
            emotionalAttack: 2,
            emotionalSkill: 1,
            emotionalDefense: 1,
        },
        mapLocation: { name: 'northern-forest' },
        logic: 'random',
    };
}

function createMockBattleLogEntry(): BattleLogEntry {
    return {
        round: 1,
        playerAction: { type: 'body', action: 'attack' },
        enemyAction: { type: 'mind', action: 'defend' },
        advantage: 'advantage',
        playerRoll: 15,
        playerRollDetails: 'Player rolls 15 + 4 = 19',
        enemyRoll: 10,
        enemyRollDetails: 'Enemy rolls 10 + 1 = 11',
        damageToPlayer: 0,
        damageToEnemy: 5,
        playerHPAfter: 70,
        enemyHPAfter: 15,
        result: 'Round 1: Player attacks with body advantage!',
    };
}

// ============================================================================
// COMBAT STATE INITIALIZATION
// ============================================================================

describe('initializeCombat', () => {
    it('should create a combat state with active = true', () => {
        const player: Character = createTestCharacter();
        const enemy: Enemy = createTestEnemy();
        const state: CombatState = initializeCombat(player, enemy);
        expect(state.active).toBe(true);
    });

    it('should start in choosing_type phase', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        expect(state.phase).toBe('choosing_type');
    });

    it('should start at round 1', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        expect(state.round).toBe(1);
    });

    it('should start with friendshipCounter at 0', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        expect(state.friendshipCounter).toBe(0);
    });

    it('should set the player character', () => {
        const player: Character = createTestCharacter();
        const state: CombatState = initializeCombat(player, createTestEnemy());
        expect(state.player.name).toBe(player.name);
    });

    it('should set the enemy', () => {
        const enemy: Enemy = createTestEnemy();
        const state: CombatState = initializeCombat(createTestCharacter(), enemy);
        expect(state.enemy.name).toBe(enemy.name);
    });

    it('should start with empty player and enemy choices', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        expect(state.playerChoice).toEqual({});
        expect(state.enemyChoice).toEqual({});
    });

    it('should start with an empty log', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        expect(state.logEntry).toEqual([]);
    });
});

describe('resetCombat', () => {
    it('should reset the combat state to initial values', () => {
        const player: Character = createTestCharacter();
        const enemy: Enemy = createTestEnemy();
        const state: CombatState = {
            ...initializeCombat(player, enemy),
            round: 5,
            friendshipCounter: 2,
            phase: 'resolving',
            logEntry: [createMockBattleLogEntry()],
        };

        const resetState: CombatState = resetCombat(state);
        expect(resetState.round).toBe(1);
        expect(resetState.friendshipCounter).toBe(0);
        expect(resetState.phase).toBe('choosing_type');
        expect(resetState.logEntry).toEqual([]);
    });

    it('should preserve the same player and enemy', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const resetState: CombatState = resetCombat(state);
        expect(resetState.player.name).toBe(state.player.name);
        expect(resetState.enemy.name).toBe(state.enemy.name);
    });
});

// ============================================================================
// COMBAT PHASE MANAGEMENT
// ============================================================================

describe('updateCombatPhase', () => {
    it('should update the phase to choosing_action', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const updated: CombatState = updateCombatPhase(state, 'choosing_action');
        expect(updated.phase).toBe('choosing_action');
    });

    it('should update the phase to resolving', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const updated: CombatState = updateCombatPhase(state, 'resolving');
        expect(updated.phase).toBe('resolving');
    });

    it('should update the phase to ended', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const updated: CombatState = updateCombatPhase(state, 'ended');
        expect(updated.phase).toBe('ended');
    });

    it('should not mutate the original state', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        updateCombatPhase(state, 'resolving');
        expect(state.phase).toBe('choosing_type');
    });
});

// ============================================================================
// COMBAT ACTION SELECTION
// ============================================================================

describe('setPlayerAttackType', () => {
    it('should set the player attack type to body', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const updated: CombatState = setPlayerAttackType(state, 'body');
        expect(updated.playerChoice.type).toBe('body');
    });

    it('should set the player attack type to mind', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const updated: CombatState = setPlayerAttackType(state, 'mind');
        expect(updated.playerChoice.type).toBe('mind');
    });

    it('should set the player attack type to heart', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const updated: CombatState = setPlayerAttackType(state, 'heart');
        expect(updated.playerChoice.type).toBe('heart');
    });

    it('should not mutate the original state', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        setPlayerAttackType(state, 'body');
        expect(state.playerChoice.type).toBeUndefined();
    });
});

describe('setPlayerAction', () => {
    it('should set the player action to attack', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const updated: CombatState = setPlayerAction(state, 'attack');
        expect(updated.playerChoice.action).toBe('attack');
    });

    it('should set the player action to defend', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const updated: CombatState = setPlayerAction(state, 'defend');
        expect(updated.playerChoice.action).toBe('defend');
    });

    it('should preserve previously set type', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const withType: CombatState = setPlayerAttackType(state, 'heart');
        const withAction: CombatState = setPlayerAction(withType, 'attack');
        expect(withAction.playerChoice.type).toBe('heart');
        expect(withAction.playerChoice.action).toBe('attack');
    });

    it('should not mutate the original state', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        setPlayerAction(state, 'attack');
        expect(state.playerChoice.action).toBeUndefined();
    });
});

// ============================================================================
// COMBAT ROUND RESOLUTION
// ============================================================================

describe('resolveCombatRound', () => {
    it('should increment the round counter', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const resolved: CombatState = resolveCombatRound(state);
        expect(resolved.round).toBe(2);
    });

    it('should set the phase to resolving', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const resolved: CombatState = resolveCombatRound(state);
        expect(resolved.phase).toBe('resolving');
    });

    it('should clear player and enemy choices', () => {
        const state: CombatState = {
            ...initializeCombat(createTestCharacter(), createTestEnemy()),
            playerChoice: { type: 'body', action: 'attack' },
            enemyChoice: { type: 'mind', action: 'defend' },
        };
        const resolved: CombatState = resolveCombatRound(state);
        expect(resolved.playerChoice).toEqual({});
        expect(resolved.enemyChoice).toEqual({});
    });

    it('should not mutate the original state', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        resolveCombatRound(state);
        expect(state.round).toBe(1);
    });
});

// ============================================================================
// BATTLE LOG MANAGEMENT
// ============================================================================

describe('addBattleLogEntry', () => {
    it('should add an entry to the log', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const entry: BattleLogEntry = createMockBattleLogEntry();
        const updated: CombatState = addBattleLogEntry(state, entry);
        expect(updated.logEntry).toHaveLength(1);
    });

    it('should preserve existing log entries', () => {
        const entry1: BattleLogEntry = createMockBattleLogEntry();
        const entry2: BattleLogEntry = { ...createMockBattleLogEntry(), round: 2 };
        let state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());

        state = addBattleLogEntry(state, entry1);
        state = addBattleLogEntry(state, entry2);

        expect(state.logEntry).toHaveLength(2);
        expect(state.logEntry[0].round).toBe(1);
        expect(state.logEntry[1].round).toBe(2);
    });

    it('should not mutate the original state', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const entry: BattleLogEntry = createMockBattleLogEntry();
        addBattleLogEntry(state, entry);
        expect(state.logEntry).toHaveLength(0);
    });
});

// ============================================================================
// FRIENDSHIP COUNTER
// ============================================================================

describe('incrementFriendship', () => {
    it('should increment the friendship counter by 1', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const updated: CombatState = incrementFriendship(state);
        expect(updated.friendshipCounter).toBe(1);
    });

    it('should end combat when counter reaches 3', () => {
        let state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        state = { ...state, friendshipCounter: 2 };
        const updated: CombatState = incrementFriendship(state);
        expect(updated.friendshipCounter).toBe(3);
        expect(updated.active).toBe(false);
        expect(updated.phase).toBe('ended');
    });

    it('should not end combat when counter is below 3', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const updated: CombatState = incrementFriendship(state);
        expect(updated.active).toBe(true);
    });

    it('should not mutate the original state', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        incrementFriendship(state);
        expect(state.friendshipCounter).toBe(0);
    });
});

describe('endCombatWithFriendship', () => {
    it('should set active to false', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const ended: CombatState = endCombatWithFriendship(state);
        expect(ended.active).toBe(false);
    });

    it('should set phase to ended', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const ended: CombatState = endCombatWithFriendship(state);
        expect(ended.phase).toBe('ended');
    });

    it('should set friendshipCounter to 3', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const ended: CombatState = endCombatWithFriendship(state);
        expect(ended.friendshipCounter).toBe(3);
    });
});

// ============================================================================
// COMBAT END STATE
// ============================================================================

describe('endCombatPlayerVictory', () => {
    it('should set active to false', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const ended: CombatState = endCombatPlayerVictory(state);
        expect(ended.active).toBe(false);
    });

    it('should set phase to ended', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const ended: CombatState = endCombatPlayerVictory(state);
        expect(ended.phase).toBe('ended');
    });

    it('should not mutate the original state', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        endCombatPlayerVictory(state);
        expect(state.active).toBe(true);
    });
});

describe('endCombatPlayerDefeat', () => {
    it('should set active to false', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const ended: CombatState = endCombatPlayerDefeat(state);
        expect(ended.active).toBe(false);
    });

    it('should set phase to ended', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        const ended: CombatState = endCombatPlayerDefeat(state);
        expect(ended.phase).toBe('ended');
    });

    it('should not mutate the original state', () => {
        const state: CombatState = initializeCombat(createTestCharacter(), createTestEnemy());
        endCombatPlayerDefeat(state);
        expect(state.active).toBe(true);
    });
});
