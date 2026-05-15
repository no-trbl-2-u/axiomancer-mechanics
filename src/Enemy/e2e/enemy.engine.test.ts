/**
 * Spec 07 — AI strategy unit tests.
 *
 * Each strategy is checked for two properties:
 *   - **Distribution.** Over N runs, the chosen actions / stances reflect
 *     the heuristic (e.g. aggressive enemies attack the majority of the
 *     time). We use `Math.random` directly so the tests are *statistical*,
 *     not exact — failure rates are budgeted via wide tolerances so the
 *     suite isn't flaky.
 *   - **Reactivity.** When state is supplied, strategies counter the
 *     player's last stance / exploit a vulnerability / follow the boss
 *     phase script. These are deterministic.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
    decideEnemyAction, aggressiveLogic, defensiveLogic, balancedLogic,
    strategicLogic, bossLogic, counterStanceOf, weakestStanceOf,
} from '../enemy.logic';
import { Enemy } from '../types';
import { CombatState } from '../../Combat/types';
import { createEnemy } from '../index';

function makeEnemy(overrides: Partial<Enemy> = {}): Enemy {
    return {
        ...createEnemy({
            id: 'test-enemy',
            name: 'Test',
            description: 'test',
            level: 5,
            baseStats: { body: 3, mind: 3, heart: 3 },
            mapName: 'northern-forest',
            logic: 'aggressive',
        }),
        ...overrides,
    };
}

function makeState(overrides: Partial<CombatState> = {}): CombatState {
    return {
        active: true,
        phase: 'choosing_stance',
        round: 1,
        friendshipCounter: 0,
        log: [],
        playerChoice: {},
        enemyChoice: {},
        combatResources: { heart: 0, body: 0, mind: 0, fallacy: 0, paradox: 0 },
        player: {
            name: 'Player',
            level: 5,
            experience: 0,
            experienceToNextLevel: 5000,
            health: 50,
            maxHealth: 50,
            baseStats: { heart: 3, body: 5, mind: 2 },
            derivedStats: {
                physicalAttack: 0, physicalSkill: 0, physicalDefense: 0,
                mentalAttack: 0, mentalSkill: 0, mentalDefense: 0,
                emotionalAttack: 0, emotionalSkill: 0, emotionalDefense: 0,
                luck: 0,
            },
            nonCombatStats: {
                physicalSave: 0, physicalTest: 0,
                mentalSave: 0, mentalTest: 0,
                emotionalSave: 0, emotionalTest: 0,
            },
            inventory: [], equipment: {}, effects: [],
            knownSkills: [], equippedSkills: [],
        },
        enemy: makeEnemy(),
        ...overrides,
    };
}

afterEach(() => vi.restoreAllMocks());

describe('counterStanceOf', () => {
    it('returns the stance that beats the input', () => {
        expect(counterStanceOf('body')).toBe('heart');
        expect(counterStanceOf('mind')).toBe('body');
        expect(counterStanceOf('heart')).toBe('mind');
    });
});

describe('weakestStanceOf', () => {
    it('returns the stance with the lowest base stat', () => {
        expect(weakestStanceOf({ baseStats: { heart: 5, body: 1, mind: 3 } })).toBe('body');
        expect(weakestStanceOf({ baseStats: { heart: 1, body: 4, mind: 4 } })).toBe('heart');
    });
});

describe('decideEnemyAction — never falls through to random', () => {
    it('aggressive logic actually attacks more than 50% of the time', () => {
        const enemy = makeEnemy({ logic: 'aggressive' });
        const state = makeState();
        let attacks = 0;
        const N = 200;
        for (let i = 0; i < N; i++) {
            const choice = decideEnemyAction(enemy, state);
            if (choice.action === 'attack') attacks++;
        }
        expect(attacks).toBeGreaterThan(N * 0.6);
    });

    it('defensive logic defends while above 50% HP', () => {
        const enemy = makeEnemy({ logic: 'defensive', health: 50, maxHealth: 50 });
        const state = makeState({ enemy });
        let defends = 0;
        const N = 200;
        for (let i = 0; i < N; i++) {
            const choice = decideEnemyAction(enemy, state);
            if (choice.action === 'defend') defends++;
        }
        expect(defends).toBe(N);
    });

    it('defensive logic switches to attack with the player\'s weakest stance below 50% HP', () => {
        // Player has lowest baseStats.mind (= 2 in makeState).
        const enemy = makeEnemy({ logic: 'defensive', health: 10, maxHealth: 50 });
        const state = makeState({ enemy });
        for (let i = 0; i < 10; i++) {
            const choice = decideEnemyAction(enemy, state);
            expect(choice.action).toBe('attack');
            expect(choice.stance).toBe('mind');
        }
    });

    it('balanced logic flips action on the 50% HP threshold', () => {
        const high = makeEnemy({ logic: 'balanced', health: 50, maxHealth: 50 });
        const low  = makeEnemy({ logic: 'balanced', health: 10, maxHealth: 50 });
        let attacks = 0, defends = 0;
        for (let i = 0; i < 100; i++) {
            if (decideEnemyAction(high, makeState({ enemy: high })).action === 'attack') attacks++;
            if (decideEnemyAction(low,  makeState({ enemy: low })).action  === 'defend')  defends++;
        }
        expect(attacks).toBe(100);
        expect(defends).toBe(100);
    });

    it('strategic logic exploits debuff_vulnerability_body when on the player', () => {
        const enemy = makeEnemy({ logic: 'strategic' });
        const state = makeState({
            enemy,
            player: {
                ...makeState().player,
                effects: [{
                    effectId: 'debuff_vulnerability_body',
                    intensity: 1,
                    remaining: 3,
                    appliedOnRound: 0,
                }],
            },
        });
        // Strategic always attacks Body when the body vulnerability is up.
        for (let i = 0; i < 20; i++) {
            const choice = decideEnemyAction(enemy, state);
            expect(choice.stance).toBe('body');
            expect(choice.action).toBe('attack');
        }
    });

    it('boss logic follows a 4-round deterministic pattern', () => {
        const enemy = makeEnemy({ logic: 'boss' });
        const r1 = decideEnemyAction(enemy, makeState({ enemy, round: 1 }));
        expect(r1).toEqual({ stance: 'body', action: 'defend' });

        const r2 = decideEnemyAction(enemy, makeState({ enemy, round: 2 }));
        expect(r2.action).toBe('attack');

        const r3 = decideEnemyAction(enemy, makeState({ enemy, round: 3 }));
        expect(r3).toEqual({ stance: 'mind', action: 'attack' });

        const r4 = decideEnemyAction(enemy, makeState({ enemy, round: 4 }));
        expect(r4).toEqual({ stance: 'heart', action: 'defend' });

        // Loops.
        const r5 = decideEnemyAction(enemy, makeState({ enemy, round: 5 }));
        expect(r5).toEqual({ stance: 'body', action: 'defend' });
    });

    it('every logic tag produces visibly different choices across 200 runs', () => {
        // The spec's success criterion: decideEnemyAction does not always
        // fall through to random. We approximate "visibly different" by
        // checking that aggressive/defensive/balanced/boss never produce
        // the same action distribution as a uniform 50/50 RNG.
        const enemy = makeEnemy({ health: 100, maxHealth: 100 });
        const state = makeState({ enemy });
        const N = 200;

        const tally = (logic: Enemy['logic']) => {
            let attacks = 0;
            for (let i = 0; i < N; i++) {
                const c = decideEnemyAction({ ...enemy, logic }, state);
                if (c.action === 'attack') attacks++;
            }
            return attacks;
        };

        const aggressive = tally('aggressive');
        const defensive  = tally('defensive');
        const balanced   = tally('balanced');

        // Aggressive should clearly favour attack; defensive (at full HP)
        // should be all-defend; balanced (at full HP) should be all-attack.
        expect(aggressive).toBeGreaterThan(N * 0.6);
        expect(defensive).toBe(0);
        expect(balanced).toBe(N);
    });
});

describe('aggressiveLogic — counters the player\'s last stance', () => {
    it('picks the counter to the player\'s declared stance when one exists', () => {
        const state = makeState({
            log: [{
                round: 1,
                playerAction: { stance: 'body', action: 'attack' },
                enemyAction:  { stance: 'mind', action: 'attack' },
                advantage: 'neutral',
                playerRoll: 10, playerRollDetails: 'x',
                enemyRoll: 10, enemyRollDetails: 'y',
                damageToPlayer: 0, damageToEnemy: 0,
                playerHPAfter: 50, enemyHPAfter: 50,
                result: 'no damage',
            }],
        });
        // The player declared body; the counter is heart. Aggressive must
        // pick heart deterministically — only the action coin flip is
        // random, the stance is not.
        for (let i = 0; i < 20; i++) {
            expect(aggressiveLogic(state).stance).toBe('heart');
        }
    });
});

describe('defensiveLogic / balancedLogic — read enemy HP', () => {
    it('balanced switches to defend when HP drops to or below 50%', () => {
        const enemy = makeEnemy({ health: 25, maxHealth: 50 });
        expect(balancedLogic(enemy).action).toBe('defend');
    });
    it('defensive does not crash without state', () => {
        const enemy = makeEnemy({ health: 5, maxHealth: 50 });
        const choice = defensiveLogic(enemy);
        expect(choice.action).toBe('defend');
    });
});

describe('strategicLogic — fallback to aggressive when no exploit', () => {
    it('falls back to aggressiveLogic when no vulnerability is on the player', () => {
        const enemy = makeEnemy({ logic: 'strategic' });
        const state = makeState();
        let attacks = 0;
        const N = 100;
        for (let i = 0; i < N; i++) {
            if (strategicLogic(enemy, state).action === 'attack') attacks++;
        }
        // Same threshold as aggressive (75% attack rate).
        expect(attacks).toBeGreaterThan(N * 0.6);
    });
});

describe('bossLogic — robust to missing state', () => {
    it('returns the round-1 phase entry when no state is supplied', () => {
        const enemy = makeEnemy({ logic: 'boss' });
        const choice = bossLogic(enemy);
        expect(choice).toEqual({ stance: 'body', action: 'defend' });
    });
});
