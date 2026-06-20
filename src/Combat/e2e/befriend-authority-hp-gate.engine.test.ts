import { describe, expect, it } from 'vitest';
import {
    determineCombatEnd,
    isBefriendAttemptEligible,
    isCombatOngoing,
    isFriendshipEligible,
    resolveCombatRound,
} from '../index';
import { initializeCombat } from '../combat.reducer';
import type { CombatAction, CombatState } from '../types';
import { createEnemy } from '../../Enemy';
import type { Enemy } from '../../Enemy/types';
import { buildCharacterFromPreset, apprenticePreset } from '../../Character/presets';
import { getSkillById } from '../../Skills';
import { FRIENDSHIP_COUNTER_MAX } from '../../Game/game-mechanics.constants';

function player() {
    return {
        ...buildCharacterFromPreset(apprenticePreset),
        name: 'Tester',
        knownSkills: ['befriend'],
    };
}

function enemy(overrides: Partial<Enemy> = {}): Enemy {
    return {
        ...createEnemy({
            id: 'authority-test-enemy',
            name: 'Authority Test Enemy',
            description: 'Test enemy for befriend authority.',
            level: 3,
            baseStats: { body: 3, mind: 3, heart: 3 },
            mapName: 'fishing-village',
            logic: 'defensive',
            befriendabilityConfig: { hpGate: { belowPct: 0.4 } },
        }),
        ...overrides,
    };
}

function combat(overrides: Partial<CombatState> = {}): CombatState {
    return {
        ...initializeCombat(player(), enemy()),
        combatResources: { heart: 5, body: 0, mind: 0, fallacy: 0, paradox: 0 },
        ...overrides,
    };
}

describe('Phase 112 — Befriend authority and HP gate', () => {
    it('does not end combat from passive friendship counter alone', () => {
        const state = combat({ friendshipCounter: FRIENDSHIP_COUNTER_MAX });
        state.enemy.health = Math.floor(state.enemy.maxHealth * 0.2);

        expect(isFriendshipEligible(state)).toBe(false);
        expect(determineCombatEnd(state)).toBe('ongoing');
        expect(isCombatOngoing(state)).toBe(true);
    });

    it('blocks Befriend above configured HP gate even with enough heart resources', () => {
        const state = combat();
        state.enemy.health = Math.ceil(state.enemy.maxHealth * 0.8);

        expect(isBefriendAttemptEligible(state)).toBe(false);

        const action: CombatAction = { stance: 'heart', action: 'skill', skillId: 'befriend' };
        const enemyAction: CombatAction = { stance: 'body', action: 'defend' };
        const result = resolveCombatRound(state, action, enemyAction, getSkillById);

        expect(result.state.phase).not.toBe('mercy_choice');
        expect(result.combatEvents).toContainEqual(expect.objectContaining({
            phase: 'skill',
            kind: 'befriend-attempted',
            successful: false,
        }));
    });

    it('opens mercy choice when Befriend is cast at or below configured HP gate', () => {
        const state = combat();
        state.enemy.health = Math.floor(state.enemy.maxHealth * 0.2);

        expect(isBefriendAttemptEligible(state)).toBe(true);

        const action: CombatAction = { stance: 'heart', action: 'skill', skillId: 'befriend' };
        const enemyAction: CombatAction = { stance: 'body', action: 'defend' };
        const result = resolveCombatRound(state, action, enemyAction, getSkillById);

        expect(result.state.phase).toBe('mercy_choice');
        expect(result.state.mercyChoiceActive).toBe(true);
        expect(result.combatEvents).toContainEqual(expect.objectContaining({
            phase: 'skill',
            kind: 'befriend-attempted',
            successful: true,
        }));
    });

    it('allows friendship resolution only after explicit spare authorization', () => {
        const state = combat({
            friendshipResolutionAuthorized: true,
            friendshipCounter: FRIENDSHIP_COUNTER_MAX,
        });
        state.enemy.health = Math.floor(state.enemy.maxHealth * 0.2);

        expect(isFriendshipEligible(state)).toBe(true);
        expect(determineCombatEnd(state)).toBe('friendship');
    });
});
