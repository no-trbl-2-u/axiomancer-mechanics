/**
 * Phase 91 — Friendship increment skill mechanics e2e test
 * 
 * Hermetic coverage of the `incrementsFriendship?: number` field on skills
 * and its integration with the executeSkill function. Tests that skills with
 * this field correctly increment the friendship counter without requiring
 * defend stance.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter } from '../../Character';
import { createEnemy } from '../../Enemy';
import { initializeCombat } from '../../Combat/combat.reducer';
import { executeSkill } from '../skill.engine';
import { getSkillById } from '../skill.library';
import { CombatState } from '../../Combat/types';

describe('Friendship increment skills', () => {
    const player = createCharacter({
        name: 'Test Player',
        level: 1,
        baseStats: { body: 6, mind: 4, heart: 4 },
        knownSkills: ['soothing-words', 'peaceful-gesture', 'empathetic-understanding', 'ad-hominem-strike'],
    });
    const enemy = createEnemy({
        id: 'test-enemy',
        name: 'Test Enemy',
        description: 'Test enemy for friendship tests',
        level: 1,
        baseStats: { heart: 3, body: 3, mind: 3 },
        mapName: 'northern-city',
        logic: 'random',
    });
    let state: CombatState;

    beforeEach(() => {
        state = initializeCombat(player, enemy);
        // Give player enough resources for any skill
        state.combatResources = {
            heart: 10,
            body: 10,
            mind: 10,
            fallacy: 10,
            paradox: 10,
        };
    });

    describe('Soothing Words', () => {
        it('increments friendship counter by 1', () => {
            const skill = getSkillById('soothing-words')!;
            expect(skill).toBeDefined();
            expect(skill.incrementsFriendship).toBe(1);

            const initialFriendship = state.friendshipCounter;
            const result = executeSkill(state, 'soothing-words', getSkillById);

            expect(result.state.friendshipCounter).toBe(initialFriendship + 1);
            expect(result.events).toContainEqual(
                expect.objectContaining({
                    kind: 'friendship-incremented',
                    skillId: 'soothing-words',
                    amount: 1,
                }),
            );
        });

        it('costs 2 heart resources', () => {
            const result = executeSkill(state, 'soothing-words', getSkillById);

            expect(result.state.combatResources.heart).toBe(
                state.combatResources.heart - 2,
            );
            expect(result.events).toContainEqual(
                expect.objectContaining({
                    kind: 'resources-spent',
                    skillId: 'soothing-words',
                    cost: { heart: 2 },
                }),
            );
        });
    });

    describe('Peaceful Gesture', () => {
        it('increments friendship counter by 1', () => {
            const skill = getSkillById('peaceful-gesture')!;
            expect(skill).toBeDefined();
            expect(skill.incrementsFriendship).toBe(1);

            const initialFriendship = state.friendshipCounter;
            const result = executeSkill(state, 'peaceful-gesture', getSkillById);

            expect(result.state.friendshipCounter).toBe(initialFriendship + 1);
            expect(result.events).toContainEqual(
                expect.objectContaining({
                    kind: 'friendship-incremented',
                    skillId: 'peaceful-gesture',
                    amount: 1,
                }),
            );
        });

        it('costs 2 body resources', () => {
            const result = executeSkill(state, 'peaceful-gesture', getSkillById);

            expect(result.state.combatResources.body).toBe(
                state.combatResources.body - 2,
            );
        });
    });

    describe('Empathetic Understanding', () => {
        it('increments friendship counter by 2', () => {
            const skill = getSkillById('empathetic-understanding')!;
            expect(skill).toBeDefined();
            expect(skill.incrementsFriendship).toBe(2);

            const initialFriendship = state.friendshipCounter;
            const result = executeSkill(state, 'empathetic-understanding', getSkillById);

            expect(result.state.friendshipCounter).toBe(initialFriendship + 2);
            expect(result.events).toContainEqual(
                expect.objectContaining({
                    kind: 'friendship-incremented',
                    skillId: 'empathetic-understanding',
                    amount: 2,
                }),
            );
        });

        it('costs 3 mind + 1 heart resources', () => {
            const result = executeSkill(state, 'empathetic-understanding', getSkillById);

            expect(result.state.combatResources.mind).toBe(
                state.combatResources.mind - 3,
            );
            expect(result.state.combatResources.heart).toBe(
                state.combatResources.heart - 1,
            );
            expect(result.events).toContainEqual(
                expect.objectContaining({
                    kind: 'resources-spent',
                    skillId: 'empathetic-understanding',
                    cost: { mind: 3, heart: 1 },
                }),
            );
        });
    });

    describe('Skills without incrementsFriendship', () => {
        it('do not emit friendship-incremented events', () => {
            const result = executeSkill(state, 'ad-hominem-strike', getSkillById);

            expect(result.events).not.toContainEqual(
                expect.objectContaining({
                    kind: 'friendship-incremented',
                }),
            );
            expect(result.state.friendshipCounter).toBe(state.friendshipCounter);
        });
    });

    describe('Friendship processing order', () => {
        it('processes friendship after effects but before resource costs', () => {
            // Start with a state that has some friendship already
            const stateWithFriendship = { ...state, friendshipCounter: 5 };
            
            const result = executeSkill(stateWithFriendship, 'soothing-words', getSkillById);
            
            // Check that friendship was incremented
            expect(result.state.friendshipCounter).toBe(6);
            
            // Check that resource costs were still applied
            expect(result.state.combatResources.heart).toBe(
                stateWithFriendship.combatResources.heart - 2,
            );
            
            // Check event order: friendship-incremented should come before resources-spent
            const friendshipEvent = result.events.find(e => e.kind === 'friendship-incremented');
            const resourcesEvent = result.events.find(e => e.kind === 'resources-spent');
            const friendshipIndex = result.events.indexOf(friendshipEvent!);
            const resourcesIndex = result.events.indexOf(resourcesEvent!);
            
            expect(friendshipIndex).toBeLessThan(resourcesIndex);
        });
    });
});