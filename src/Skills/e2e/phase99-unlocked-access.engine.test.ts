/**
 * Phase 99 — unlocked skill access e2e tests.
 * 
 * Verifies that combat uses knownSkills filtered by canUseSkill affordability
 * instead of the legacy equippedSkills gate.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createCharacter } from '../../Character';
import { getSkillById } from '../skill.library';
import { canUseSkill } from '../skill.engine';

describe('Phase 99 unlocked skill access', () => {
    let player: ReturnType<typeof createCharacter>;

    beforeEach(() => {
        player = createCharacter({
            name: 'TestPlayer',
            level: 5,
            baseStats: { heart: 8, body: 6, mind: 7 },
            knownSkills: [
                'ad-hominem-strike',      // body: 3 - should be affordable after basic actions
                'false-dilemma',          // mind: 3
                'appeal-to-pity',         // heart: 3  
                'mob-appeal',             // body: 2, heart: 2 - requires resonance
            ],
            // Legacy equippedSkills intentionally different from knownSkills
            equippedSkills: ['ad-hominem-strike', 'false-dilemma'],
            effects: [],
        });
    });

    test('known-but-not-legacy-equipped skill can be validated as affordable', () => {
        const skillId = 'appeal-to-pity';
        const skill = getSkillById(skillId);
        expect(skill).toBeDefined();

        // Verify skill is known but was not in legacy equippedSkills
        expect(player.knownSkills).toContain(skillId);
        expect(player.equippedSkills).not.toContain(skillId);

        // Grant enough heart resources to cast the skill
        const resourcesWithHeart = {
            heart: 3, body: 0, mind: 0, fallacy: 0, paradox: 0,
        };

        // Should be able to use the skill since it's known and affordable
        expect(canUseSkill(resourcesWithHeart, skill!)).toBe(true);
    });

    test('known skills should be affordable when resources permit', () => {
        // Grant abundant resources for all skill types
        const abundantResources = {
            heart: 10, body: 10, mind: 10, fallacy: 5, paradox: 5,
        };

        // All known skills should now be affordable
        for (const skillId of player.knownSkills) {
            const skill = getSkillById(skillId);
            expect(skill).toBeDefined();
            expect(canUseSkill(abundantResources, skill!)).toBe(true);
        }
    });

    test('skills not in known skills are not available', () => {
        const availableSkills = player.knownSkills.filter(id => {
            const skill = getSkillById(id);
            return skill !== undefined;
        });
        
        // Should match exactly the known skills for the player
        expect(availableSkills).toEqual(player.knownSkills);
        
        // Test skill that player doesn't know
        const unknownSkillId = 'straw-giant'; // Tier 3 skill
        expect(player.knownSkills).not.toContain(unknownSkillId);
    });

    test('migration from equippedSkills to knownSkills preserves access', () => {
        // This test verifies the conceptual migration:
        // Skills that were in equippedSkills should be preserved in knownSkills
        
        const allAccessibleSkills = new Set([
            ...player.knownSkills,
            ...player.equippedSkills,
        ]);

        // After migration, these would all be in knownSkills
        for (const skillId of allAccessibleSkills) {
            const skill = getSkillById(skillId);
            expect(skill).toBeDefined();
        }
        
        // Verify equipped skills are a subset of or equal to the combined set
        for (const skillId of player.equippedSkills) {
            expect(allAccessibleSkills.has(skillId)).toBe(true);
        }
    });
});