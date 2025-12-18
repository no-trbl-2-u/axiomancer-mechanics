import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import {
    doesSaveFileExist,
    createNewGameState,
    loadGameState,
    setCombatState,
    startCombat,
    endCombat,
    saveGameState,
    gameReducer,
} from './game.reducer';
import { GameState } from './types';
import { CombatState } from '../Combat/types';
import { createCharacter } from '../Character';

// ============================================================================
// TEST DATA
// ============================================================================

const mockPlayer = createCharacter({
    name: 'Test Hero',
    level: 1,
    baseStats: { heart: 5, body: 5, mind: 5 }
});

const mockCombatState: CombatState = {
    active: true,
    phase: 'choosing_type',
    round: 1,
    friendshipCounter: 0,
    player: mockPlayer,
    enemy: {
        id: 'test-enemy',
        name: 'Test Enemy',
        description: 'A test enemy',
        level: 1,
        health: 50,
        mana: 20,
        enemyStats: {
            maxHealth: 50,
            maxMana: 20,
            physicalAttack: 5,
            physicalSkill: 3,
            physicalDefense: 4,
            mentalAttack: 5,
            mentalSkill: 3,
            mentalDefense: 4,
            emotionalAttack: 5,
            emotionalSkill: 3,
            emotionalDefense: 4,
        },
        mapLocation: { name: 'fishing-village' },
        logic: 'random',
    },
    playerChoice: {},
    enemyChoice: {},
    logEntry: [],
};

// ============================================================================
// doesSaveFileExist
// ============================================================================

describe('doesSaveFileExist', () => {
    beforeEach(() => {
        vi.spyOn(fs, 'existsSync');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return true when save file exists', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        expect(doesSaveFileExist()).toBe(true);
    });

    it('should return false when save file does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        expect(doesSaveFileExist()).toBe(false);
    });
});

// ============================================================================
// createNewGameState
// ============================================================================

describe('createNewGameState', () => {
    it('should create a new game state with a player', () => {
        const state = createNewGameState();
        expect(state.player).toBeDefined();
        expect(state.player.name).toBe('Player');
    });

    it('should create a new game state with a world', () => {
        const state = createNewGameState();
        expect(state.world).toBeDefined();
        expect(state.world.currentMap).toBeDefined();
    });

    it('should create a new game state with null combat state', () => {
        const state = createNewGameState();
        expect(state.combatState).toBeNull();
    });

    it('should initialize player at level 1', () => {
        const state = createNewGameState();
        expect(state.player.level).toBe(1);
    });

    it('should initialize player with base stats of 1', () => {
        const state = createNewGameState();
        expect(state.player.baseStats.heart).toBe(1);
        expect(state.player.baseStats.body).toBe(1);
        expect(state.player.baseStats.mind).toBe(1);
    });
});

// ============================================================================
// loadGameState
// ============================================================================

describe('loadGameState', () => {
    beforeEach(() => {
        vi.spyOn(fs, 'existsSync');
        vi.spyOn(fs, 'readFileSync');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return a new game state when no save file exists', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const state = loadGameState();
        expect(state.player).toBeDefined();
        expect(state.player.name).toBe('Player');
    });

    it('should load and parse the save file when it exists', () => {
        const savedState = createNewGameState();
        savedState.player.name = 'Saved Hero';
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(savedState));
        
        const state = loadGameState();
        expect(state.player.name).toBe('Saved Hero');
    });
});

// ============================================================================
// setCombatState
// ============================================================================

describe('setCombatState', () => {
    it('should set the combat state on the game state', () => {
        const state = createNewGameState();
        const newState = setCombatState(state, mockCombatState);
        expect(newState.combatState).toBe(mockCombatState);
    });

    it('should clear combat state when passed null', () => {
        const state = { ...createNewGameState(), combatState: mockCombatState };
        const newState = setCombatState(state, null);
        expect(newState.combatState).toBeNull();
    });

    it('should return a new state object (immutable)', () => {
        const state = createNewGameState();
        const newState = setCombatState(state, mockCombatState);
        expect(newState).not.toBe(state);
    });

    it('should preserve other state properties', () => {
        const state = createNewGameState();
        const newState = setCombatState(state, mockCombatState);
        expect(newState.player).toBe(state.player);
        expect(newState.world).toBe(state.world);
    });
});

// ============================================================================
// startCombat
// ============================================================================

describe('startCombat', () => {
    it('should set the combat state to active combat', () => {
        const state = createNewGameState();
        const newState = startCombat(state, mockCombatState);
        expect(newState.combatState).toBe(mockCombatState);
        expect(newState.combatState?.active).toBe(true);
    });

    it('should replace any existing combat state', () => {
        const existingCombat = { ...mockCombatState, round: 5 };
        const state = { ...createNewGameState(), combatState: existingCombat };
        const newState = startCombat(state, mockCombatState);
        expect(newState.combatState?.round).toBe(1);
    });
});

// ============================================================================
// endCombat
// ============================================================================

describe('endCombat', () => {
    it('should clear the combat state', () => {
        const state = { ...createNewGameState(), combatState: mockCombatState };
        const newState = endCombat(state);
        expect(newState.combatState).toBeNull();
    });

    it('should work even when no combat is active', () => {
        const state = createNewGameState();
        const newState = endCombat(state);
        expect(newState.combatState).toBeNull();
    });
});

// ============================================================================
// saveGameState
// ============================================================================

describe('saveGameState', () => {
    beforeEach(() => {
        vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should write the game state to a file', () => {
        const state = createNewGameState();
        saveGameState(state);
        expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should serialize the state as JSON with formatting', () => {
        const state = createNewGameState();
        saveGameState(state);
        const [, content] = vi.mocked(fs.writeFileSync).mock.calls[0];
        expect(() => JSON.parse(content as string)).not.toThrow();
    });
});

// ============================================================================
// gameReducer
// ============================================================================

describe('gameReducer', () => {
    it('should return the current state for unknown action types', () => {
        const state = createNewGameState();
        const newState = gameReducer(state, { type: 'UNKNOWN_ACTION' });
        expect(newState).toBe(state);
    });

    // NOTE: The following tests are skipped because gameReducer is not fully implemented
    // They describe expected behavior for future implementation

    describe.skip('START_COMBAT action', () => {
        it('should start combat with the provided combat state', () => {
            const state = createNewGameState();
            const newState = gameReducer(state, { 
                type: 'START_COMBAT', 
                payload: mockCombatState 
            });
            expect(newState.combatState).toEqual(mockCombatState);
        });
    });

    describe.skip('END_COMBAT action', () => {
        it('should clear the combat state', () => {
            const state = { ...createNewGameState(), combatState: mockCombatState };
            const newState = gameReducer(state, { type: 'END_COMBAT' });
            expect(newState.combatState).toBeNull();
        });
    });

    describe.skip('UPDATE_PLAYER action', () => {
        it('should update player properties', () => {
            const state = createNewGameState();
            const newState = gameReducer(state, { 
                type: 'UPDATE_PLAYER', 
                payload: { health: 50 } 
            });
            expect(newState.player.health).toBe(50);
        });
    });

    describe.skip('LEVEL_UP action', () => {
        it('should increase player level', () => {
            const state = createNewGameState();
            const newState = gameReducer(state, { type: 'LEVEL_UP' });
            expect(newState.player.level).toBe(2);
        });
    });
});
