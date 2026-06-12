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
import {
    ENEMY_REGISTRY, ArgumentativeCrow, CoastalTyrant,
    TideflukeReaver, HushWraith, HollowSaint, TheDisagreement, EchoOfPyrrhonia,
    MournfulGull, HollowEyedBeggar,
} from '../enemy.library';
import { mockSequentialRng } from '../../test-utils/rng';

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
            id: 'test-player',
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
            inventory: [], currency: 0, equipment: {}, effects: [],
            knownSkills: [], equippedSkills: [],
            availableStatPoints: 0,
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
                    remainingDuration: 3,
                    appliedAt: 0,
                    tier: 2 as const,
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

describe('decideEnemyAction — Phase 49 skill dispatch', () => {
    it("returns the skill action when an enemy with a rotation passes the gate", () => {
        const enemy = ArgumentativeCrow;
        // First roll consumed by the internal skill-pick gate — 0.10 fires it.
        mockSequentialRng(0.10);
        const decision = decideEnemyAction(enemy, makeState({ enemy }));
        expect(decision).toMatchObject({
            action: 'skill',
            skillId: 'false-dilemma',
        });
    });

    it("derives the skill stance from philosophicalAspect on the skill", () => {
        // CoastalTyrant carries `achilles-gambit` (philosophicalAspect: 'body').
        // The dispatch must surface stance: 'body' alongside the skill action,
        // not the strategy's would-be basic-action stance.
        const enemy = CoastalTyrant;
        mockSequentialRng(0.10); // gate fires
        const decision = decideEnemyAction(enemy, makeState({ enemy }));
        expect(decision).toMatchObject({
            action: 'skill',
            skillId: 'achilles-gambit',
            stance: 'body',
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

    it("never dispatches a skill action for an enemy with no skills rotation", () => {
        // makeEnemy() returns an Enemy with skills: undefined; the dispatch
        // must short-circuit the skill-pick gate even when rng is in the
        // fire-range (otherwise the strategy receives a fabricated skill
        // action with no payload).
        const enemy = makeEnemy();
        mockSequentialRng(0.01); // would fire the gate if skills were present
        const decision = decideEnemyAction(enemy, makeState({ enemy }));
        expect(decision.action).not.toBe('skill');
    });

    it("respects the legacy logic-only overload (no skill path)", () => {
        // decideEnemyAction(logic) — enemy is undefined → skill-pick bails.
        mockSequentialRng(0.10);
        const decision = decideEnemyAction('aggressive');
        expect(decision.action).not.toBe('skill');
    });
});

describe('Phase 49 + Phase 57 enemy rotations', () => {
    // Phase 49 (`27064d9`) authored the first 2 rotations; Phase 57
    // (this commit) extended the coverage to all 5 elites/boss/unique
    // + 2 of the 6 normals. The 3 simplest normals (Tidepool Crab,
    // Sea-Mist Wisp, Lullaby Moth) intentionally stay skill-less per
    // Phase 57 D2 (early-game pacing).

    it('Argumentative Crow carries the false-dilemma rotation (Phase 49)', () => {
        expect(ArgumentativeCrow.skills).toBeDefined();
        expect(ArgumentativeCrow.skills?.length).toBe(1);
        expect(ArgumentativeCrow.skills?.[0].id).toBe('false-dilemma');
    });

    it('Coastal Tyrant carries the achilles-gambit rotation (Phase 49)', () => {
        expect(CoastalTyrant.skills).toBeDefined();
        expect(CoastalTyrant.skills?.length).toBe(3); // Phase 121 — added skills for Easy anchor
        const skillIds = CoastalTyrant.skills?.map(s => s.id) || [];
        expect(skillIds).toContain('achilles-gambit');
    });

    it('Tidefluke Reaver carries the straw-giant rotation (Phase 57)', () => {
        expect(TideflukeReaver.skills?.[0].id).toBe('straw-giant');
    });

    it('Hush-Wraith carries the sorites-cascade rotation (Phase 57)', () => {
        expect(HushWraith.skills?.[0].id).toBe('sorites-cascade');
    });

    it('Hollow Saint carries the pascals-wager rotation (Phase 57)', () => {
        expect(HollowSaint.skills?.[0].id).toBe('pascals-wager');
    });

    it('The Disagreement carries the liars-echo rotation (Phase 57)', () => {
        expect(TheDisagreement.skills?.[0].id).toBe('liars-echo');
    });

    it('Echo of Pyrrhonia carries the eternal-regress rotation (Phase 57)', () => {
        expect(EchoOfPyrrhonia.skills?.[0].id).toBe('eternal-regress');
    });

    it('Mournful Gull carries the appeal-to-pity rotation (Phase 57)', () => {
        expect(MournfulGull.skills?.[0].id).toBe('appeal-to-pity');
    });

    it('Hollow-Eyed Beggar carries the pascals-wager rotation (Phase 57)', () => {
        expect(HollowEyedBeggar.skills?.[0].id).toBe('pascals-wager');
    });
});

describe('Phase 121 stat law compliance for playtest balance anchors', () => {
    it('Coastal Tyrant level 6 has exactly 30 total stats (5 × level)', () => {
        const { body, mind, heart } = CoastalTyrant.baseStats;
        const total = body + mind + heart;
        expect(total).toBe(30);
    });

    it('Coastal Tyrant has skills for Easy anchor testing', () => {
        expect(CoastalTyrant.skills).toBeDefined();
        expect(CoastalTyrant.skills?.length).toBeGreaterThanOrEqual(3);
        const skillIds = CoastalTyrant.skills?.map(s => s.id) || [];
        expect(skillIds).toContain('achilles-gambit');
    });

    it('Audit Sentinel level 15 has exactly 75 total stats (5 × level)', () => {
        const AuditSentinel = ENEMY_REGISTRY['audit-sentinel'];
        const { body, mind, heart } = AuditSentinel.baseStats;
        const total = body + mind + heart;
        expect(total).toBe(75);
    });

    it('Audit Sentinel has 1-2 low-tier skills for Normal anchor', () => {
        const AuditSentinel = ENEMY_REGISTRY['audit-sentinel'];
        expect(AuditSentinel.skills).toBeDefined();
        expect(AuditSentinel.skills?.length).toBeGreaterThanOrEqual(1);
        expect(AuditSentinel.skills?.length).toBeLessThanOrEqual(2);
    });

    it('Balance Judge level 18 has exactly 90 total stats (5 × level)', () => {
        const BalanceJudge = ENEMY_REGISTRY['balance-judge'];
        const { body, mind, heart } = BalanceJudge.baseStats;
        const total = body + mind + heart;
        expect(total).toBe(90);
    });

    it('Balance Judge has several devastating skills for Difficult anchor', () => {
        const BalanceJudge = ENEMY_REGISTRY['balance-judge'];
        expect(BalanceJudge.skills).toBeDefined();
        expect(BalanceJudge.skills?.length).toBeGreaterThanOrEqual(3);
        const skillIds = BalanceJudge.skills?.map(s => s.id) || [];
        expect(skillIds).toContain('bootstrap-paradox'); // devastating tier 3 skill
    });
});
