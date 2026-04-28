import { describe, it, expect } from 'vitest';
import {
    initializeCombat, setPlayerStance, setPlayerAction, appendLog,
    incrementFriendship, endCombat,
} from './combat.reducer';
import { createCharacter } from '../Character';
import { createEnemy } from '../Enemy';
import { BattleLogEntry } from './types';

const player = createCharacter({ name: 'Hero', level: 1, baseStats: { heart: 3, body: 3, mind: 3 } });
const enemy = createEnemy({
    id: 'e1', name: 'Foe', description: '', level: 1,
    baseStats: { heart: 1, body: 1, mind: 1 },
    mapName: 'fishing-village', logic: 'random',
});

describe('initializeCombat', () => {
    it('creates fresh combat state', () => {
        const state = initializeCombat(player, enemy);
        expect(state.active).toBe(true);
        expect(state.round).toBe(1);
        expect(state.friendshipCounter).toBe(0);
        expect(state.player.name).toBe('Hero');
        expect(state.enemy.name).toBe('Foe');
        expect(state.log).toHaveLength(0);
    });

    it('deep clones combatants', () => {
        const state = initializeCombat(player, enemy);
        expect(state.player).not.toBe(player);
        expect(state.enemy).not.toBe(enemy);
    });
});

describe('setPlayerStance / setPlayerAction', () => {
    it('sets stance', () => {
        const state = initializeCombat(player, enemy);
        expect(setPlayerStance(state, 'heart').playerChoice.stance).toBe('heart');
    });
    it('sets action', () => {
        const state = initializeCombat(player, enemy);
        expect(setPlayerAction(state, 'defend').playerChoice.action).toBe('defend');
    });
});

describe('appendLog', () => {
    it('appends entry', () => {
        const state = initializeCombat(player, enemy);
        const entry = { round: 1 } as BattleLogEntry;
        const updated = appendLog(state, entry);
        expect(updated.log).toHaveLength(1);
    });
});

describe('incrementFriendship', () => {
    it('increments counter', () => {
        const state = initializeCombat(player, enemy);
        expect(incrementFriendship(state).friendshipCounter).toBe(1);
    });
});

describe('endCombat', () => {
    it('sets inactive and ended', () => {
        const state = initializeCombat(player, enemy);
        const ended = endCombat(state);
        expect(ended.active).toBe(false);
        expect(ended.phase).toBe('ended');
    });
});
