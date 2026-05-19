/**
 * Hermetic e2e — public barrel surface (Phase 50).
 *
 * Pins the top-level `axiomancer-mechanics` exports that consumers
 * (notably `axiomancer-mobile`) rely on. The Skills library + lookup
 * were the original Phase 50 motivator (mobile-side stop-gap at
 * `state/mocks/combat.skills.fixture.ts`); the broader purpose is a
 * compact contract test that catches accidental removal of any
 * locked public name without forcing every consumer to set up an
 * out-of-repo smoke.
 *
 * Test imports the same module path that consumers do — from this
 * test file's perspective that's `'../../index'`, which is the
 * compiled-from `src/index.ts` barrel.
 */

import { describe, it, expect } from 'vitest';

import {
    skillLibrary,
    getSkillById,
} from '../../index';

describe('Phase 50 — public barrel exposes skillLibrary + getSkillById', () => {
    it('skillLibrary is a non-empty array of Skill entries', () => {
        expect(skillLibrary).toBeDefined();
        expect(Array.isArray(skillLibrary)).toBe(true);
        expect(skillLibrary.length).toBeGreaterThan(0);
    });

    it('every entry in skillLibrary carries a non-empty id', () => {
        for (const skill of skillLibrary) {
            expect(skill.id).toBeDefined();
            expect(typeof skill.id).toBe('string');
            expect(skill.id.length).toBeGreaterThan(0);
        }
    });

    it('getSkillById is a function that returns a defined Skill for a real id', () => {
        expect(getSkillById).toBeDefined();
        expect(typeof getSkillById).toBe('function');

        const firstId = skillLibrary[0].id;
        const skill = getSkillById(firstId);

        expect(skill).toBeDefined();
        expect(skill?.id).toBe(firstId);
    });

    it('getSkillById returns undefined for an unknown id', () => {
        const result = getSkillById('this-skill-id-does-not-exist-anywhere');
        expect(result).toBeUndefined();
    });
});
