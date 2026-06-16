/**
 * Hermetic E2E — Phase 150: enemy answers a player skill with a skill.
 *
 * Doctrine (CLAUDE.md / VISION.md): player skills are deterministic and
 * always land, so the cost of OFFENSIVE skill use is the enemy answering
 * power with power. When the player uses a hostile skill, a legal-acting enemy
 * may respond with a skill of its own instead of an ordinary basic exchange.
 *
 * The answer is gated three ways so it never punishes the friendship route or
 * becomes a guaranteed retaliation wall:
 *   - hostility: befriend / friendship-building / self-buff skills draw no
 *     answer (protects the STRATEGIST mercy route).
 *   - legality: a stunned / restricted enemy cannot answer.
 *   - cadence: the answer fires on a `ENEMY_SKILL_ANSWER_CHANCE` RNG roll.
 *
 * Coverage:
 *   1. Hostile player skill → enemy answers (RNG forced to fire).
 *   2. Same setup but RNG above the cadence → no answer.
 *   3. Non-hostile (befriend) player skill → no answer even when RNG fires.
 *   4. Enemy with NO rotation → no answer (fallback).
 *   5. Stunned enemy → no answer (restriction respected).
 *   6. Player skill still lands deterministically alongside the answer.
 *
 * Hermetic: no disk / network / TTY. RNG stubbed via `src/test-utils/rng.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { createCharacter } from '../../Character';
import { createEnemy } from '../../Enemy';
import { initializeCombat } from '../combat.reducer';
import { resolveCombatRound } from '../combat.resolver';
import { getSkillById } from '../../Skills/skill.library';
import { mockSequentialRng, restoreOriginalRng } from '../../test-utils/rng';
import { ENEMY_SKILL_ANSWER_CHANCE } from '../../Game/game-mechanics.constants';
import type { Enemy } from '../../Enemy/types';
import type { ActiveEffect } from '../../Effects/types';
import type { CombatResources } from '../../Skills/types';
import type { CombatAction } from '../types';

afterEach(() => {
    vi.restoreAllMocks();
    restoreOriginalRng();
});

// A library skill the player knows (enemy-targeting, costs body tokens).
const PLAYER_SKILL_ID = 'ad-hominem-strike';
// A non-hostile friendship gesture (targetType 'enemy' + befriend_attempt).
const BEFRIEND_SKILL_ID = 'befriend';
// A library skill the enemy carries in its rotation.
const ENEMY_SKILL_ID = 'false-dilemma';

// RNG values that bracket the cadence gate.
const RNG_ANSWERS = 0.0; // < ENEMY_SKILL_ANSWER_CHANCE → answer fires.
const RNG_DECLINES = Math.min(0.99, ENEMY_SKILL_ANSWER_CHANCE + 0.5);

const FUNDED: CombatResources = {
    heart: 99, body: 99, mind: 99, fallacy: 99, paradox: 99,
};

function makePlayer() {
    return createCharacter({
        name: 'Skill User',
        level: 5,
        baseStats: { heart: 6, body: 6, mind: 6 },
        knownSkills: [PLAYER_SKILL_ID, BEFRIEND_SKILL_ID],
    });
}

function makeEnemy(overrides: Partial<Parameters<typeof createEnemy>[0]> = {}): Enemy {
    return createEnemy({
        id: 'answerer',
        name: 'Answering Foe',
        description: 'A foe that answers power with power.',
        level: 5,
        baseStats: { heart: 5, body: 5, mind: 5 },
        mapName: 'fishing-village',
        logic: 'aggressive',
        skills: [getSkillById(ENEMY_SKILL_ID)!],
        ...overrides,
    });
}

const playerSkillAction: CombatAction = {
    stance: 'body', action: 'skill', skillId: PLAYER_SKILL_ID,
};
const befriendAction: CombatAction = {
    stance: 'heart', action: 'skill', skillId: BEFRIEND_SKILL_ID,
};
const enemyBasicAction: CombatAction = { stance: 'body', action: 'attack' };

function findResponse(events: ReturnType<typeof resolveCombatRound>['combatEvents']) {
    return events.find(
        e => e.phase === 'scenario' && e.kind === 'enemy-skill-response',
    );
}

describe('Phase 150 — enemy skill answer to player skill use', () => {
    it('enemy answers a hostile player skill with a skill when the cadence fires', () => {
        mockSequentialRng(RNG_ANSWERS);
        const state = { ...initializeCombat(makePlayer(), makeEnemy()), combatResources: FUNDED };

        const { combatEvents } = resolveCombatRound(
            state, playerSkillAction, enemyBasicAction, getSkillById,
        );

        const response = findResponse(combatEvents);
        expect(response).toBeDefined();
        expect(response && response.phase === 'scenario' && response.kind === 'enemy-skill-response'
            ? response.skillId : null).toBe(ENEMY_SKILL_ID);

        const enemySkillEvents = combatEvents.filter(
            e => e.phase === 'skill' && 'skillId' in e && e.skillId === ENEMY_SKILL_ID,
        );
        expect(enemySkillEvents.length).toBeGreaterThan(0);
    });

    it('does not answer when the cadence roll declines', () => {
        mockSequentialRng(RNG_DECLINES);
        const state = { ...initializeCombat(makePlayer(), makeEnemy()), combatResources: FUNDED };

        const { combatEvents } = resolveCombatRound(
            state, playerSkillAction, enemyBasicAction, getSkillById,
        );

        expect(findResponse(combatEvents)).toBeUndefined();
    });

    it('player skill still lands deterministically alongside the enemy answer', () => {
        mockSequentialRng(RNG_ANSWERS);
        const state = { ...initializeCombat(makePlayer(), makeEnemy()), combatResources: FUNDED };

        const { combatEvents } = resolveCombatRound(
            state, playerSkillAction, enemyBasicAction, getSkillById,
        );

        const playerDamage = combatEvents.find(
            e => e.phase === 'skill' && e.kind === 'damage'
              && e.skillId === PLAYER_SKILL_ID && e.target === 'enemy',
        );
        expect(playerDamage).toBeDefined();
        expect(playerDamage && playerDamage.phase === 'skill' && playerDamage.kind === 'damage'
            ? playerDamage.amount : 0).toBeGreaterThan(0);
    });

    it('does NOT answer a non-hostile befriend skill even when the cadence fires', () => {
        mockSequentialRng(RNG_ANSWERS);
        const state = { ...initializeCombat(makePlayer(), makeEnemy()), combatResources: FUNDED };

        const { combatEvents } = resolveCombatRound(
            state, befriendAction, enemyBasicAction, getSkillById,
        );

        expect(findResponse(combatEvents)).toBeUndefined();
    });

    it('enemy with no rotation does not answer with a skill (fallback)', () => {
        mockSequentialRng(RNG_ANSWERS);
        const enemy = makeEnemy({ skills: undefined });
        const state = { ...initializeCombat(makePlayer(), enemy), combatResources: FUNDED };

        const { combatEvents } = resolveCombatRound(
            state, playerSkillAction, enemyBasicAction, getSkillById,
        );

        expect(findResponse(combatEvents)).toBeUndefined();
    });

    it('a stunned enemy does not answer with a skill (restriction respected)', () => {
        mockSequentialRng(RNG_ANSWERS);
        const stun: ActiveEffect = {
            effectId: 'debuff_stun',
            intensity: 1,
            remainingDuration: 3,
            appliedAt: 1,
            tier: 2,
        };
        const enemy = makeEnemy({ effects: [stun] });
        const state = { ...initializeCombat(makePlayer(), enemy), combatResources: FUNDED };

        const { combatEvents } = resolveCombatRound(
            state, playerSkillAction, enemyBasicAction, getSkillById,
        );

        expect(findResponse(combatEvents)).toBeUndefined();

        const skipped = combatEvents.find(
            e => e.phase === 'action-restriction' && e.kind === 'turn-skipped' && e.actor === 'enemy',
        );
        expect(skipped).toBeDefined();
    });
});
