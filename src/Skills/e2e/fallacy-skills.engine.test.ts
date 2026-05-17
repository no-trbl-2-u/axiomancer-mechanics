/**
 * Hermetic e2e for the Phase 44 fallacies-as-spells payloads.
 *
 * Asserts:
 *   - Each of the 4 new Tier 3 fallacy skills is resolvable via
 *     `getSkillById` and carries a `sourcedFromCell` that round-trips
 *     through `philosophicalAlignmentLibrary`.
 *   - `appeal-to-consequences` and `nirvana-fallacy` drive through
 *     `resolveCombatRound` and produce the expected per-side
 *     side-effects (self-buff / opponent-debuff).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCharacter } from '../../Character';
import { createEnemy } from '../../Enemy';
import { initializeCombat } from '../../Combat/combat.reducer';
import { resolveCombatRound } from '../../Combat/combat.resolver';
import { mockSequentialRng } from '../../test-utils';
import { getSkillById } from '../skill.library';
import { philosophicalAlignmentLibrary } from '../../Philosophy';

afterEach(() => vi.restoreAllMocks());

const NEW_FALLACY_SKILL_IDS = [
    'appeal-to-consequences',
    'nirvana-fallacy',
    'pascals-wager',
    'appeal-to-fear',
] as const;

describe('Phase 44 — fallacies-as-spells (skills)', () => {
    it('all 4 new skills resolve via getSkillById with the expected sourcedFromCell', () => {
        const expected: Record<string, string> = {
            'appeal-to-consequences': 'logic-optimistic-individual',
            'nirvana-fallacy':        'logic-pessimistic-individual',
            'pascals-wager':          'mid-optimistic-transcendent',
            'appeal-to-fear':         'mid-pessimistic-transcendent',
        };
        for (const id of NEW_FALLACY_SKILL_IDS) {
            const skill = getSkillById(id);
            expect(skill, `skill ${id} missing from library`).toBeDefined();
            expect(skill!.tier).toBe(3);
            expect(skill!.sourcedFromCell).toBe(expected[id]);
            expect(skill!.learningRequirement).toEqual({ level: 10 });
        }
    });

    it('every sourcedFromCell id round-trips through philosophicalAlignmentLibrary', () => {
        for (const id of NEW_FALLACY_SKILL_IDS) {
            const skill = getSkillById(id)!;
            const cell = philosophicalAlignmentLibrary.find(c => c.id === skill.sourcedFromCell);
            expect(cell, `cell ${skill.sourcedFromCell} missing from library for skill ${id}`).toBeDefined();
        }
    });

    it('appeal-to-consequences self-applies tier1_body_attack while damaging the enemy', () => {
        // Hit / damage path — fixed RNG keeps the resolver deterministic.
        mockSequentialRng(0.5);

        const skill = getSkillById('appeal-to-consequences')!;
        const player = createCharacter({
            name: 'Tester',
            level: 10,
            baseStats: { heart: 6, body: 12, mind: 6 },
            knownSkills: [skill.id],
            equippedSkills: [skill.id],
        });
        const enemy = createEnemy({
            name: 'Sandbag',
            level: 10,
            baseStats: { heart: 6, body: 6, mind: 6 },
            health: 200,
            maxHealth: 200,
        });
        const combat = initializeCombat(player, enemy);
        // Player carries enough body resource via combatResources initial seed; budget a few rounds.
        combat.combatResources.body = 5;
        combat.combatResources.fallacy = 2;

        const { state: next } = resolveCombatRound(
            combat,
            { stance: 'body', action: 'skill', skillId: skill.id },
            { stance: 'body', action: 'defend' },
            getSkillById,
        );

        expect(next.enemy.health).toBeLessThan(enemy.health);
        const selfBuff = next.player.effects.find(e => e.effectId === 'tier1_body_attack');
        expect(selfBuff, 'tier1_body_attack should be on the player after the skill resolves').toBeDefined();
    });

    it('nirvana-fallacy applies debuff_confusion to the enemy', () => {
        mockSequentialRng(0.5);

        const skill = getSkillById('nirvana-fallacy')!;
        const player = createCharacter({
            name: 'Tester',
            level: 10,
            baseStats: { heart: 6, body: 6, mind: 12 },
            knownSkills: [skill.id],
            equippedSkills: [skill.id],
        });
        const enemy = createEnemy({
            name: 'Sandbag',
            level: 10,
            baseStats: { heart: 6, body: 6, mind: 6 },
            health: 200,
            maxHealth: 200,
        });
        const combat = initializeCombat(player, enemy);
        combat.combatResources.mind = 4;
        combat.combatResources.fallacy = 2;

        const { state: next } = resolveCombatRound(
            combat,
            { stance: 'mind', action: 'skill', skillId: skill.id },
            { stance: 'body', action: 'defend' },
            getSkillById,
        );

        const debuff = next.enemy.effects.find(e => e.effectId === 'debuff_confusion');
        expect(debuff, 'debuff_confusion should be on the enemy after the skill resolves').toBeDefined();
    });
});
