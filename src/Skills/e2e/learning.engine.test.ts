/**
 * Hermetic e2e for Phase 30 unit 1 — skill learning (Spec 06 Q7).
 *
 * Drives `getAvailableSkills`, `meetsLearningRequirement`, and
 * `learnSkill` through the public Skills barrel. No I/O, no RNG —
 * the eligibility filter is a pure derivation from
 * `character.level / baseStats / knownSkills`.
 */

import { describe, it, expect } from 'vitest';

import { createCharacter } from '../../Character';
import {
    getAvailableSkills,
    learnSkill,
    meetsLearningRequirement,
} from '../skill.engine';
import { skillLibrary } from '../skill.library';

const buildPlayer = (level: number, overrides: Partial<{
    baseStats: { heart: number; body: number; mind: number };
    knownSkills: string[];
}> = {}) => createCharacter({
    name: 'Learner',
    level,
    baseStats: overrides.baseStats ?? { heart: 5, body: 5, mind: 5 },
    knownSkills: overrides.knownSkills ?? [],
});

describe('meetsLearningRequirement — tier-derived defaults', () => {
    it('admits a level-1 character to every Tier 1 skill', () => {
        const ch = buildPlayer(1);
        for (const s of skillLibrary.filter(x => x.tier === 1)) {
            expect(meetsLearningRequirement(ch, s)).toBe(true);
        }
    });

    it('rejects Tier 2 skills below level 5', () => {
        const ch = buildPlayer(4);
        for (const s of skillLibrary.filter(x => x.tier === 2)) {
            expect(meetsLearningRequirement(ch, s)).toBe(false);
        }
    });

    it('rejects Tier 3 skills below level 10', () => {
        const ch = buildPlayer(9);
        for (const s of skillLibrary.filter(x => x.tier === 3)) {
            expect(meetsLearningRequirement(ch, s)).toBe(false);
        }
    });

    it('admits a level-15 character to every Tier 3 skill', () => {
        const ch = buildPlayer(15);
        for (const s of skillLibrary.filter(x => x.tier === 3)) {
            expect(meetsLearningRequirement(ch, s)).toBe(true);
        }
    });
});

describe('getAvailableSkills', () => {
    it('returns every library skill the character does not already know AND qualifies for', () => {
        const ch = buildPlayer(15);
        const available = getAvailableSkills(ch);
        expect(available.length).toBe(skillLibrary.length);
    });

    it('omits already-known skills from the result', () => {
        const known = skillLibrary.filter(s => s.tier === 1).map(s => s.id);
        const ch = buildPlayer(1, { knownSkills: known });
        const available = getAvailableSkills(ch);
        // Only T2+T3 should be candidate, but level 1 disqualifies them.
        expect(available).toEqual([]);
    });

    it('preserves library order so the UI list is stable', () => {
        const ch = buildPlayer(15);
        const available = getAvailableSkills(ch);
        const libraryIds = skillLibrary.map(s => s.id);
        const availableIds = available.map(s => s.id);
        expect(availableIds).toEqual(libraryIds);
    });
});

describe('learnSkill', () => {
    it('appends the id to knownSkills when eligible', () => {
        const ch = buildPlayer(1);
        const t1 = skillLibrary.find(s => s.tier === 1)!;
        const after = learnSkill(ch, t1.id);
        expect(after.knownSkills).toContain(t1.id);
        expect(after.knownSkills.length).toBe(ch.knownSkills.length + 1);
    });

    it('is a no-op (same reference) when the skill is already known', () => {
        const t1 = skillLibrary.find(s => s.tier === 1)!;
        const ch = buildPlayer(1, { knownSkills: [t1.id] });
        const after = learnSkill(ch, t1.id);
        expect(after).toBe(ch);
    });

    it('is a no-op when the skill id is unknown to the library', () => {
        const ch = buildPlayer(15);
        const after = learnSkill(ch, 'no-such-skill');
        expect(after).toBe(ch);
    });

    it('is a no-op when the learning requirement is not met', () => {
        const t3 = skillLibrary.find(s => s.tier === 3)!;
        const ch = buildPlayer(5); // T3 needs level 10
        const after = learnSkill(ch, t3.id);
        expect(after).toBe(ch);
    });
});
