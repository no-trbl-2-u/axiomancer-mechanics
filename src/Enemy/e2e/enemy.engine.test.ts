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
    pickEnemySkill,
} from '../enemy.logic';
import { Enemy } from '../types';
import { CombatState } from '../../Combat/types';
import { createEnemy } from '../index';
import { ENEMY_REGISTRY, ArgumentativeCrow, CoastalTyrant } from '../enemy.library';
import { mockSequentialRng } from '../../test-utils/rng';
import { getSkillById } from '../../Skills/skill.library';

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

describe('ENEMY_REGISTRY', () => {
    it('contains every published enemy with a stable shape', () => {
        const entries = Object.entries(ENEMY_REGISTRY);
        expect(entries.length).toBeGreaterThan(0);
        for (const [slug, enemy] of entries) {
            expect(enemy.id).toBeTruthy();
            expect(enemy.name).toBeTruthy();
            expect(enemy.maxHealth).toBeGreaterThan(0);
            expect(enemy.health).toBe(enemy.maxHealth);
            expect(enemy.baseStats).toBeDefined();
            // Slug stability: the slug must round-trip back to the same fixture.
            expect(ENEMY_REGISTRY[slug as keyof typeof ENEMY_REGISTRY]).toBe(enemy);
        }
    });
});

describe('pickEnemySkill — Phase 49', () => {
    it('returns null when enemy.skills is unset', () => {
        const enemy = makeEnemy();
        // High rng so the gate would fire if there were skills.
        mockSequentialRng(0.99);
        expect(pickEnemySkill(enemy)).toBeNull();
    });

    it('returns null when the probabilistic gate misses (low rng)', () => {
        const skill = getSkillById('false-dilemma')!;
        const enemy = makeEnemy({ skills: [skill] });
        // 0.36 → 0.99: first roll 0.36 is ≥ ENEMY_SKILL_PICK_CHANCE (0.35) → null.
        mockSequentialRng(0.36, 0.99);
        expect(pickEnemySkill(enemy)).toBeNull();
    });

    it('returns the first skill in the rotation when the gate fires (high rng)', () => {
        const skill = getSkillById('achilles-gambit')!;
        const enemy = makeEnemy({ skills: [skill] });
        // 0.10 < 0.35 → gate fires.
        mockSequentialRng(0.10);
        const action = pickEnemySkill(enemy);
        expect(action).not.toBeNull();
        expect(action).toMatchObject({
            action: 'skill',
            skillId: 'achilles-gambit',
            stance: 'body', // philosophicalAspect on achilles-gambit
        });
    });

    it('returns null for an undefined enemy (legacy logic-only overload safety)', () => {
        mockSequentialRng(0.01);
        expect(pickEnemySkill(undefined)).toBeNull();
    });
});

describe('decideEnemyAction — Phase 49 skill dispatch', () => {
    it("returns the skill action when an enemy with a rotation passes the gate", () => {
        const enemy = ArgumentativeCrow;
        // First roll consumed by pickEnemySkill — 0.10 fires the gate.
        mockSequentialRng(0.10);
        const decision = decideEnemyAction(enemy, makeState({ enemy }));
        expect(decision).toMatchObject({
            action: 'skill',
            skillId: 'false-dilemma',
        });
    });

    it("falls through to the strategy's basic action when the gate misses", () => {
        const enemy = CoastalTyrant;
        // First roll 0.99 ≥ 0.35 → gate doesn't fire.
        mockSequentialRng(0.99);
        const decision = decideEnemyAction(enemy, makeState({ enemy }));
        expect(decision.action).not.toBe('skill');
        // CoastalTyrant logic='boss' — round 1, phase 1 → body defend.
        expect(decision).toMatchObject({ stance: 'body', action: 'defend' });
    });

    it("respects the legacy logic-only overload (no skill path)", () => {
        // decideEnemyAction(logic) — enemy is undefined → pickEnemySkill bails.
        mockSequentialRng(0.10);
        const decision = decideEnemyAction('aggressive');
        expect(decision.action).not.toBe('skill');
    });
});

describe('ArgumentativeCrow + CoastalTyrant — Phase 49 rotations', () => {
    it('Argumentative Crow carries the false-dilemma rotation', () => {
        expect(ArgumentativeCrow.skills).toBeDefined();
        expect(ArgumentativeCrow.skills?.length).toBe(1);
        expect(ArgumentativeCrow.skills?.[0].id).toBe('false-dilemma');
    });

    it('Coastal Tyrant carries the achilles-gambit rotation', () => {
        expect(CoastalTyrant.skills).toBeDefined();
        expect(CoastalTyrant.skills?.length).toBe(1);
        expect(CoastalTyrant.skills?.[0].id).toBe('achilles-gambit');
    });
});
