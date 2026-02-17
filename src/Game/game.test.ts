/**
 * Game Module Tests
 * Tests for game state creation, combat state management, and game reducer
 */

import {
    createNewGameState,
    setCombatState,
    startCombat,
    endCombat,
    gameReducer,
} from './game.reducer';
import { GameState } from './types';
import { CombatState } from '../Combat/types';
import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { createCharacter } from '../Character/index';
import { initializeCombat } from '../Combat/combat.reducer';

// ============================================================================
// Test Fixtures
// ============================================================================

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

// ============================================================================
// createNewGameState
// ============================================================================

describe('createNewGameState', () => {
    it('should create a game state with a player', () => {
        const state: GameState = createNewGameState();
        expect(state.player).toBeDefined();
        expect(state.player.name).toBe('Player');
    });

    it('should create a game state with a world', () => {
        const state: GameState = createNewGameState();
        expect(state.world).toBeDefined();
        expect(state.world.currentContinent).toBeDefined();
        expect(state.world.currentMap).toBeDefined();
    });

    it('should start with null combat state', () => {
        const state: GameState = createNewGameState();
        expect(state.combatState).toBeNull();
    });

    it('should create a level 1 player', () => {
        const state: GameState = createNewGameState();
        expect(state.player.level).toBe(1);
    });

    it('should start on the coastal continent', () => {
        const state: GameState = createNewGameState();
        expect(state.world.currentContinent.name).toBe('coastal-continent');
    });

    it('should start on the fishing village map', () => {
        const state: GameState = createNewGameState();
        expect(state.world.currentMap.name).toBe('fishing-village');
    });

    it('should have equal base stats of 1', () => {
        const state: GameState = createNewGameState();
        expect(state.player.baseStats.heart).toBe(1);
        expect(state.player.baseStats.body).toBe(1);
        expect(state.player.baseStats.mind).toBe(1);
    });
});

// ============================================================================
// setCombatState
// ============================================================================

describe('setCombatState', () => {
    it('should set the combat state', () => {
        const gameState: GameState = createNewGameState();
        const player: Character = gameState.player;
        const enemy: Enemy = createTestEnemy();
        const combatState: CombatState = initializeCombat(player, enemy);

        const updated: GameState = setCombatState(gameState, combatState);
        expect(updated.combatState).not.toBeNull();
        expect(updated.combatState?.active).toBe(true);
    });

    it('should clear the combat state when set to null', () => {
        const gameState: GameState = createNewGameState();
        const player: Character = gameState.player;
        const enemy: Enemy = createTestEnemy();
        const combatState: CombatState = initializeCombat(player, enemy);

        let updated: GameState = setCombatState(gameState, combatState);
        updated = setCombatState(updated, null);
        expect(updated.combatState).toBeNull();
    });

    it('should not mutate the original state', () => {
        const gameState: GameState = createNewGameState();
        const combatState: CombatState = initializeCombat(gameState.player, createTestEnemy());
        setCombatState(gameState, combatState);
        expect(gameState.combatState).toBeNull();
    });

    it('should preserve other game state properties', () => {
        const gameState: GameState = createNewGameState();
        const combatState: CombatState = initializeCombat(gameState.player, createTestEnemy());
        const updated: GameState = setCombatState(gameState, combatState);
        expect(updated.player).toEqual(gameState.player);
        expect(updated.world).toEqual(gameState.world);
    });
});

// ============================================================================
// startCombat
// ============================================================================

describe('startCombat', () => {
    it('should set the combat state', () => {
        const gameState: GameState = createNewGameState();
        const combatState: CombatState = initializeCombat(gameState.player, createTestEnemy());
        const updated: GameState = startCombat(gameState, combatState);
        expect(updated.combatState).not.toBeNull();
    });

    it('should set active combat', () => {
        const gameState: GameState = createNewGameState();
        const combatState: CombatState = initializeCombat(gameState.player, createTestEnemy());
        const updated: GameState = startCombat(gameState, combatState);
        expect(updated.combatState?.active).toBe(true);
    });
});

// ============================================================================
// endCombat
// ============================================================================

describe('endCombat', () => {
    it('should clear the combat state', () => {
        const gameState: GameState = createNewGameState();
        const combatState: CombatState = initializeCombat(gameState.player, createTestEnemy());
        let updated: GameState = startCombat(gameState, combatState);
        updated = endCombat(updated);
        expect(updated.combatState).toBeNull();
    });

    it('should preserve player and world state', () => {
        const gameState: GameState = createNewGameState();
        const combatState: CombatState = initializeCombat(gameState.player, createTestEnemy());
        let updated: GameState = startCombat(gameState, combatState);
        updated = endCombat(updated);
        expect(updated.player.name).toBe(gameState.player.name);
        expect(updated.world.currentMap.name).toBe(gameState.world.currentMap.name);
    });
});

// ============================================================================
// gameReducer
// ============================================================================

describe('gameReducer', () => {
    it('should return the same state for unknown actions', () => {
        const gameState: GameState = createNewGameState();
        const result: GameState = gameReducer(gameState, { type: 'UNKNOWN_ACTION' });
        expect(result).toBe(gameState);
    });

    it('should accept an action with a payload', () => {
        const gameState: GameState = createNewGameState();
        const result: GameState = gameReducer(gameState, {
            type: 'TEST_ACTION',
            payload: { data: 'test' },
        });
        expect(result).toBe(gameState);
    });
});
