/**
 * Phase 99 / ADR-0002 — unlocked skill access e2e tests.
 *
 * Verifies that combat uses knownSkills filtered by canUseSkill affordability;
 * there is no equipped-skill loadout gate (the legacy `equippedSkills` field was
 * removed entirely in Phase 159). Save-side migration of legacy `equippedSkills`
 * into `knownSkills` is covered by `src/Game/e2e/phase99-migration.engine.test.ts`.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createCharacter } from '../../Character';
import { getCardById } from '../cards.library';
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
            effects: [],
        });
    });

    test('any known skill can be validated as affordable when resources permit', () => {
        const skillId = 'appeal-to-pity';
        const skill = getCardById(skillId);
        expect(skill).toBeDefined();

        // The whole known set is the combat catalogue — no equipped subset.
        expect(player.knownSkills).toContain(skillId);

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
            const skill = getCardById(skillId);
            expect(skill).toBeDefined();
            expect(canUseSkill(abundantResources, skill!)).toBe(true);
        }
    });

    test('skills not in known skills are not available', () => {
        const availableSkills = player.knownSkills.filter(id => {
            const skill = getCardById(id);
            return skill !== undefined;
        });

        // Should match exactly the known skills for the player
        expect(availableSkills).toEqual(player.knownSkills);

        // Test skill that player doesn't know
        const unknownSkillId = 'straw-giant'; // Tier 3 skill
        expect(player.knownSkills).not.toContain(unknownSkillId);
    });

    test('the combat catalogue is exactly the known set', () => {
        // Post-Phase-159 there is no equipped rotation: every known skill that
        // resolves in the library is part of the catalogue.
        for (const skillId of player.knownSkills) {
            const skill = getCardById(skillId);
            expect(skill).toBeDefined();
        }
    });
});
