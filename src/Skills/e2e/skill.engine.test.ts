import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCharacter } from '../../Character';
import { createEnemy } from '../../Enemy';
import { initializeCombat } from '../../Combat/combat.reducer';
import { resolveCombatRound } from '../../Combat/combat.resolver';
import { mockSequentialRng } from '../../test-utils';
import {
    canUseSkill,
    spendResources,
    calculateSkillDamage,
    executeSkill,
    generateBasicActionResources,
    generatePhilosophicalResource,
} from '../skill.engine';
import { CombatResources, Skill } from '../types';
import { CombatState } from '../../Combat/types';

afterEach(() => vi.restoreAllMocks());

const zero: CombatResources = { heart: 0, body: 0, mind: 0, fallacy: 0, paradox: 0 };

const damagingSkill: Skill = {
    id: 'sk_strike',
    name: 'Sophist Strike',
    category: 'fallacy',
    philosophicalAspect: 'body',
    description: 'A direct refutation.',
    tier: 1,
    resourceCost: { body: 3 },
    targetType: 'enemy',
    basePower: 5,
    scalingStat: 'body',
};

const buffSkill: Skill = {
    id: 'sk_resolve',
    name: 'Self-Resolve',
    category: 'paradox',
    philosophicalAspect: 'heart',
    description: 'A heartening certainty.',
    tier: 1,
    resourceCost: { heart: 3 },
    targetType: 'self',
    basePower: 4,
    scalingStat: 'heart',
};

const debuffSkill: Skill = {
    id: 'sk_doubt',
    name: 'Sow Doubt',
    category: 'fallacy',
    philosophicalAspect: 'mind',
    description: 'Plants a seed of doubt.',
    tier: 1,
    resourceCost: { mind: 2, fallacy: 1 },
    targetType: 'enemy',
    basePower: 0,
    scalingStat: 'mind',
    combatEffects: [
        { effectId: 'debuff_poison', appliedTo: 'opponent' },
    ],
};

const fixturePlayer = () => createCharacter({
    name: 'P', level: 1,
    baseStats: { heart: 4, body: 6, mind: 4 },
    knownSkills: [damagingSkill.id, buffSkill.id, debuffSkill.id],
    equippedSkills: [damagingSkill.id, buffSkill.id, debuffSkill.id],
});

const fixtureEnemy = () => createEnemy({
    id: 'e1', name: 'E', description: 'd', level: 1,
    baseStats: { heart: 3, body: 3, mind: 3 },
    mapName: 'northern-city', logic: 'random',
});

const fixtureState = (resources: Partial<CombatResources> = {}): CombatState => {
    const state = initializeCombat(fixturePlayer(), fixtureEnemy());
    return { ...state, combatResources: { ...zero, ...resources } };
};

const lookup = (id: string): Skill | undefined =>
    [damagingSkill, buffSkill, debuffSkill].find(s => s.id === id);

describe('generateBasicActionResources', () => {
    it('attack hit on body stance grants +3 body', () => {
        expect(generateBasicActionResources(zero, 'body', 'hit'))
            .toEqual({ ...zero, body: 3 });
    });

    it('attack miss on heart stance grants +1 heart', () => {
        expect(generateBasicActionResources(zero, 'heart', 'miss'))
            .toEqual({ ...zero, heart: 1 });
    });

    it('defend on mind stance grants +5 mind', () => {
        expect(generateBasicActionResources(zero, 'mind', 'defend'))
            .toEqual({ ...zero, mind: 5 });
    });

    it('does not mutate the input snapshot', () => {
        const r = { ...zero };
        generateBasicActionResources(r, 'body', 'hit');
        expect(r).toEqual(zero);
    });
});

describe('generatePhilosophicalResource', () => {
    it('fallacy category adds +1 fallacy', () => {
        expect(generatePhilosophicalResource(zero, 'fallacy'))
            .toEqual({ ...zero, fallacy: 1 });
    });

    it('paradox category adds +1 paradox', () => {
        expect(generatePhilosophicalResource(zero, 'paradox'))
            .toEqual({ ...zero, paradox: 1 });
    });
});

describe('canUseSkill', () => {
    it('returns true when every cost key is funded', () => {
        const r = { ...zero, body: 3 };
        expect(canUseSkill(r, damagingSkill)).toBe(true);
    });

    it('returns false when any cost key is short', () => {
        const r = { ...zero, body: 2 };
        expect(canUseSkill(r, damagingSkill)).toBe(false);
    });

    it('multi-key cost requires resonance — both pools at once', () => {
        expect(canUseSkill({ ...zero, mind: 5 }, debuffSkill)).toBe(false);
        expect(canUseSkill({ ...zero, mind: 2, fallacy: 1 }, debuffSkill)).toBe(true);
    });
});

describe('spendResources', () => {
    it('subtracts each cost key', () => {
        const r = { ...zero, body: 5 };
        expect(spendResources(r, { body: 3 })).toEqual({ ...zero, body: 2 });
    });

    it('throws when insufficient', () => {
        expect(() => spendResources({ ...zero, body: 1 }, { body: 3 })).toThrow();
    });

    it('does not mutate the input', () => {
        const r = { ...zero, body: 5 };
        spendResources(r, { body: 3 });
        expect(r.body).toBe(5);
    });
});

describe('calculateSkillDamage', () => {
    it('basePower + baseStats[scalingStat] × 0.5, rounded', () => {
        const player = fixturePlayer();          // body 6
        // 5 + 6 × 0.5 = 8
        expect(calculateSkillDamage(player, damagingSkill)).toBe(8);
    });

    it('clamps at 0 for negative results', () => {
        const player = createCharacter({
            name: 'P', level: 1, baseStats: { heart: 0, body: 0, mind: 0 },
        });
        const skill: Skill = { ...damagingSkill, basePower: -10 };
        expect(calculateSkillDamage(player, skill)).toBe(0);
    });
});

describe('executeSkill — damaging', () => {
    it('spends cost, applies damage, and grants 1 fallacy token', () => {
        const state = fixtureState({ body: 3 });
        const enemyHpBefore = state.enemy.health;
        const { state: next, events } = executeSkill(state, damagingSkill.id, lookup);

        expect(next.enemy.health).toBe(enemyHpBefore - 8);
        expect(next.combatResources).toEqual({ ...zero, fallacy: 1 });
        expect(events.find(e => e.kind === 'damage')).toMatchObject({
            target: 'enemy', amount: 8, hpBefore: enemyHpBefore, hpAfter: next.enemy.health,
        });
        expect(events.find(e => e.kind === 'philosophical-generated')).toMatchObject({
            category: 'fallacy',
        });
    });
});

describe('executeSkill — buff (self-target)', () => {
    it('heals the player and grants 1 paradox token', () => {
        const player = fixturePlayer();
        const state = {
            ...initializeCombat({ ...player, health: player.maxHealth - 10 }, fixtureEnemy()),
            combatResources: { ...zero, heart: 3 },
        };
        const hpBefore = state.player.health;
        const { state: next } = executeSkill(state, buffSkill.id, lookup);

        // 4 + 4 × 0.5 = 6
        expect(next.player.health).toBe(hpBefore + 6);
        expect(next.combatResources).toEqual({ ...zero, paradox: 1 });
    });
});

describe('executeSkill — debuff (effect application)', () => {
    it('routes the effect through the resist pipeline and lands it on the enemy', () => {
        // Tier 2 debuff resist roll → land guaranteed by stubbing nat-2 (low resist roll).
        mockSequentialRng(0.05);
        const state = fixtureState({ mind: 2, fallacy: 1 });
        const { state: next, events } = executeSkill(state, debuffSkill.id, lookup);

        expect(next.enemy.effects.some(e => e.effectId === 'debuff_poison')).toBe(true);
        expect(next.combatResources).toEqual({ ...zero, fallacy: 1 });
        expect(events.find(e => e.kind === 'effect-applied')).toBeDefined();
    });
});

describe('executeSkill — guards', () => {
    it('throws when skill is not equipped', () => {
        const state = fixtureState({ body: 3 });
        const player = { ...state.player, equippedSkills: [] };
        expect(() => executeSkill({ ...state, player }, damagingSkill.id, lookup))
            .toThrow(/not equipped/);
    });

    it('throws when skill id is unknown', () => {
        const state = fixtureState({ body: 3 });
        const player = { ...state.player, equippedSkills: ['sk_unknown'] };
        expect(() => executeSkill({ ...state, player }, 'sk_unknown', () => undefined))
            .toThrow(/not found/);
    });

    it('throws when resources are insufficient', () => {
        const state = fixtureState({ body: 1 });
        expect(() => executeSkill(state, damagingSkill.id, lookup))
            .toThrow(/Insufficient/);
    });
});

describe('executeSkill — Phase 49 casterSide=enemy', () => {
    it("routes a damaging skill from the enemy's rotation against the player", () => {
        const enemy = { ...fixtureEnemy(), skills: [damagingSkill] };
        const state: CombatState = {
            ...initializeCombat(fixturePlayer(), enemy),
            // D2 sentinel — enemy bypasses resource costs.
            combatResources: { heart: 999, body: 999, mind: 999, fallacy: 999, paradox: 999 },
        };
        const playerHpBefore = state.player.health;

        const { state: next, events } = executeSkill(state, damagingSkill.id, lookup, 'enemy');

        // Damage formula: basePower 5 + body 3 × 0.5 = 6.5 → 7. Player is the target.
        expect(next.player.health).toBe(playerHpBefore - 7);
        // Caster (enemy) is unchanged on HP.
        expect(next.enemy.health).toBe(state.enemy.health);
        // Damage event target=='enemy' is relative-to-caster — D3.
        expect(events.find(e => e.kind === 'damage')).toMatchObject({
            target: 'enemy', amount: 7, hpBefore: playerHpBefore, hpAfter: next.player.health,
        });
    });

    it("routes a self-target heal onto the enemy when casterSide='enemy'", () => {
        const enemyAtLowHp = { ...fixtureEnemy(), skills: [buffSkill] };
        enemyAtLowHp.health = Math.max(1, enemyAtLowHp.health - 10);
        const state: CombatState = {
            ...initializeCombat(fixturePlayer(), enemyAtLowHp),
            combatResources: { heart: 999, body: 999, mind: 999, fallacy: 999, paradox: 999 },
        };
        const enemyHpBefore = state.enemy.health;
        const playerHpBefore = state.player.health;

        const { state: next, events } = executeSkill(state, buffSkill.id, lookup, 'enemy');

        // Heal lands on the caster (enemy). 4 + heart 3 × 0.5 = 5.5 → 6.
        expect(next.enemy.health).toBe(enemyHpBefore + 6);
        // Player (target) is untouched.
        expect(next.player.health).toBe(playerHpBefore);
        expect(events.find(e => e.kind === 'heal')).toMatchObject({
            target: 'self', amount: 6,
        });
    });

    it("throws when skill is not in the enemy's rotation", () => {
        const enemy = { ...fixtureEnemy(), skills: [] as Skill[] };
        const state: CombatState = {
            ...initializeCombat(fixturePlayer(), enemy),
            combatResources: { heart: 999, body: 999, mind: 999, fallacy: 999, paradox: 999 },
        };
        expect(() => executeSkill(state, damagingSkill.id, lookup, 'enemy'))
            .toThrow(/not in the enemy's rotation/);
    });

    it("player-side default behaviour is unchanged when casterSide is omitted", () => {
        // Regression — pre-Phase-49 call sites omit the 4th arg and must
        // still get the player-cast pathway.
        const state = fixtureState({ body: 3 });
        const enemyHpBefore = state.enemy.health;
        const { state: next } = executeSkill(state, damagingSkill.id, lookup);

        expect(next.enemy.health).toBe(enemyHpBefore - 8);
        // Player's resource pool spent + token granted (the canonical pre-49 contract).
        expect(next.combatResources).toEqual({ ...zero, fallacy: 1 });
    });
});

describe('resolveCombatRound — skill action integration', () => {
    it('routes player skill through executeSkill, deducts cost, generates token', () => {
        const state = fixtureState({ body: 3 });
        const enemyHpBefore = state.enemy.health;
        // Stub RNG so the enemy's basic action damage is deterministic; we only
        // care that the skill effects landed and resources updated.
        mockSequentialRng(0.5);

        const { state: next, combatEvents } = resolveCombatRound(
            state,
            { stance: 'body', action: 'skill', skillId: damagingSkill.id },
            { stance: 'mind', action: 'defend' },
            lookup,
        );

        // Player skill damage applied to enemy (8 from formula).
        expect(next.enemy.health).toBeLessThanOrEqual(enemyHpBefore - 8);
        // Spent body, gained 1 fallacy.
        expect(next.combatResources.body).toBe(0);
        expect(next.combatResources.fallacy).toBe(1);

        // Events include the skill phase.
        const skillEvents = combatEvents.filter(e => e.phase === 'skill');
        expect(skillEvents.find(e => e.kind === 'damage')).toBeDefined();
        expect(skillEvents.find(e => e.kind === 'resources-spent')).toBeDefined();
        expect(skillEvents.find(e => e.kind === 'philosophical-generated')).toBeDefined();
    });

    it('basic actions generate stance tokens on combatResources', () => {
        const state = fixtureState();
        // Force a deterministic outcome: low rolls so the contest is decided
        // by stat values. Player body=6 vs enemy mind=3, so player wins.
        mockSequentialRng(0.5);

        const { state: next, combatEvents } = resolveCombatRound(
            state,
            { stance: 'body', action: 'attack' },
            { stance: 'mind', action: 'attack' },
            lookup,
        );

        // Player won → +3 body tokens.
        expect(next.combatResources.body).toBe(3);
        const resEvent = combatEvents.find(e => e.phase === 'resources');
        expect(resEvent).toMatchObject({
            kind: 'generated', stance: 'body', outcome: 'hit',
        });
    });

    it('player defend grants +5 of stance colour', () => {
        const state = fixtureState();
        mockSequentialRng(0.5);

        const { state: next } = resolveCombatRound(
            state,
            { stance: 'heart', action: 'defend' },
            { stance: 'body',  action: 'defend' },
            lookup,
        );

        expect(next.combatResources.heart).toBe(5);
    });
});

describe('initializeCombat — resource initialization', () => {
    it('initializes combatResources to zero', () => {
        const state = initializeCombat(fixturePlayer(), fixtureEnemy());
        expect(state.combatResources).toEqual(zero);
    });
});
