/**
 * Hermetic E2E Tests — Skill Resource System (Spec 04b)
 *
 * Drives the resource → skill → philosophical-token chain end-to-end through
 * `resolveCombatRound` + `executeSkill` — the public entry points UI clients
 * use today. Follows the canonical shape from
 * `src/Combat/e2e/combat.resolver.test.ts`:
 *
 *   - Self-contained: no disk I/O (uses `nullAdapter` indirectly via fixtures
 *     and never touches the game store), no network, no TTY.
 *   - Deterministic: `Math.random` stubbed with `mockAlternatingRng` from
 *     `src/test-utils/rng.ts`.
 *   - Isolated: `vi.restoreAllMocks()` in `afterEach`.
 *
 * Scenario coverage (per Spec 04b § "Scripted E2E Test"):
 *
 *   1. Happy path — build Body tokens via a basic attack, then fire
 *      `ad-hominem-strike`. Verifies resource accounting, damage application,
 *      buff-strip mechanic, and the `phase: 'skill'` event stream.
 *   2. Insufficient resources — `canUseSkill` blocks; resolver emits a
 *      `skill-blocked` event; resources / enemy HP are untouched.
 *   3. Tier 3 gate — `straw-giant` requires a Fallacy token. Demonstrates the
 *      full chain: basic action → Tier 1 skill → philosophical token → Tier 3
 *      readiness.
 */

import { afterEach, describe, it, expect, vi } from 'vitest';

import { Sandbag_01 } from '../../Enemy/enemy.library';
import { lookupEffect } from '../../Effects/effects.library';
import { initializeCombat } from '../../Combat/combat.reducer';
import { resolveCombatRound } from '../../Combat/combat.resolver';
import { mockAlternatingRng } from '../../test-utils/rng';
import { canUseSkill } from '../skill.engine';
import { getSkillById, skillLibrary } from '../skill.library';
import { SkillTestPlayer } from './fixtures';
import type { CombatResources } from '../types';

afterEach(() => {
    vi.restoreAllMocks();
});

const zeroResources: CombatResources = {
    heart: 0, body: 0, mind: 0, fallacy: 0, paradox: 0,
};

// ─── Scenario 1 — Happy path: build Body, then fire Tier 1 fallacy ───────────

describe('Scenario 1 — Happy path: build Body resources then fire Ad Hominem Strike', () => {
    it('round 1 basic Body attack generates +3 Body tokens', () => {
        mockAlternatingRng();

        const state0 = initializeCombat(SkillTestPlayer, Sandbag_01);
        expect(state0.combatResources).toEqual(zeroResources);

        const { state: state1, combatEvents } = resolveCombatRound(
            state0,
            { stance: 'body', action: 'attack' },
            { stance: 'body', action: 'defend' },
            getSkillById,
        );

        expect(state1.combatResources).toEqual({
            heart: 0, body: 3, mind: 0, fallacy: 0, paradox: 0,
        });

        const resourceEvent = combatEvents.find(e => e.phase === 'resources');
        expect(resourceEvent).toMatchObject({
            phase: 'resources',
            kind: 'generated',
            stance: 'body',
            outcome: 'hit',
        });
    });

    it('round 2 firing Ad Hominem Strike spends Body, damages enemy, strips buff, mints Fallacy', () => {
        mockAlternatingRng();

        let state = initializeCombat(SkillTestPlayer, Sandbag_01);

        // Round 1: build the body resources for the skill.
        ({ state } = resolveCombatRound(
            state,
            { stance: 'body', action: 'attack' },
            { stance: 'body', action: 'defend' },
            getSkillById,
        ));
        expect(state.combatResources.body).toBe(3);
        const enemyHpAfterRound1 = state.enemy.health;

        // The enemy defended Body this round → it now carries at least one
        // buff (Briar Stance, plus any tier-1 proc self-buffs). Ad Hominem's
        // `strip_random_buff` should remove exactly one of them.
        const countBuffs = (effects: typeof state.enemy.effects) =>
            effects.filter(ae => lookupEffect(ae.effectId)?.type === 'buff').length;
        const enemyBuffsBefore = countBuffs(state.enemy.effects);
        expect(enemyBuffsBefore).toBeGreaterThanOrEqual(1);

        // Round 2: fire the skill.
        const { state: next, combatEvents } = resolveCombatRound(
            state,
            { stance: 'body', action: 'skill', skillId: 'ad-hominem-strike' },
            { stance: 'body', action: 'defend' },
            getSkillById,
        );

        // Body spent (3 → 0); fallacy minted (0 → 1); other pools untouched.
        expect(next.combatResources).toEqual({
            heart: 0, body: 0, mind: 0, fallacy: 1, paradox: 0,
        });

        // Skill damage = basePower 8 + body 10 × 0.5 = 13.
        expect(next.enemy.health).toBe(enemyHpAfterRound1 - 13);
        expect(next.enemy.health).toBeGreaterThan(0);

        // Exactly one buff was stripped from the enemy this round. The enemy
        // may also have re-applied Tier 1 self-buffs via its body/defend action
        // earlier in the round, so the net buff count can be ≥ the pre-skill
        // count; the invariant we care about is that `strip_random_buff` fired
        // against a real buff (not null).
        const skillEvents = combatEvents.filter(e => e.phase === 'skill');
        const stripEvent = skillEvents.find(e => e.kind === 'buff-stripped');
        expect(stripEvent).toBeDefined();
        if (stripEvent && stripEvent.kind === 'buff-stripped') {
            expect(stripEvent.effect).not.toBeNull();
            expect(stripEvent.target).toBe('enemy');
        }

        // Event stream must surface: damage, buff-stripped, resources-spent,
        // philosophical-generated (all with skillId 'ad-hominem-strike').
        expect(skillEvents.find(e => e.kind === 'damage')).toMatchObject({
            skillId: 'ad-hominem-strike', target: 'enemy', amount: 13,
        });
        expect(skillEvents.find(e => e.kind === 'resources-spent')).toMatchObject({
            skillId: 'ad-hominem-strike', cost: { body: 3 },
        });
        expect(skillEvents.find(e => e.kind === 'philosophical-generated')).toMatchObject({
            skillId: 'ad-hominem-strike', category: 'fallacy',
        });
    });
});

// ─── Scenario 2 — Insufficient resources block skill use ─────────────────────

describe('Scenario 2 — Insufficient resources block skill use', () => {
    it('canUseSkill returns false when the cost cannot be paid', () => {
        const skill = getSkillById('ad-hominem-strike')!;
        expect(canUseSkill(zeroResources, skill)).toBe(false);
    });

    it('resolveCombatRound emits a skill-blocked event and leaves state intact', () => {
        mockAlternatingRng();

        const state0 = initializeCombat(SkillTestPlayer, Sandbag_01);
        const enemyHpBefore = state0.enemy.health;
        const playerHpBefore = state0.player.health;

        const { state: next, combatEvents } = resolveCombatRound(
            state0,
            { stance: 'body', action: 'skill', skillId: 'ad-hominem-strike' },
            { stance: 'body', action: 'defend' },
            getSkillById,
        );

        const blocked = combatEvents.find(
            e => e.phase === 'skill' && e.kind === 'blocked',
        );
        expect(blocked).toMatchObject({
            phase: 'skill',
            kind: 'blocked',
            skillId: 'ad-hominem-strike',
            reason: 'insufficient-resources',
        });

        // No resource spent / minted, no HP changes from the skill, and no
        // basic-action damage either (the player whiffed their turn).
        expect(next.combatResources).toEqual(zeroResources);
        expect(next.enemy.health).toBe(enemyHpBefore);
        expect(next.player.health).toBe(playerHpBefore);

        // None of the standard skill events should appear — only `blocked`.
        const skillPhase = combatEvents.filter(e => e.phase === 'skill');
        expect(skillPhase.every(e => e.kind === 'blocked')).toBe(true);
    });
});

// ─── Scenario 3 — Tier 3 gate enforced until a philosophical token exists ────

describe('Scenario 3 — Tier 3 skills require their philosophical resource', () => {
    it('Straw Giant cannot fire on Body alone — Fallacy must be present too', () => {
        const strawGiant = getSkillById('straw-giant')!;
        const bodyOnly: CombatResources = { ...zeroResources, body: 3 };
        expect(canUseSkill(bodyOnly, strawGiant)).toBe(false);
    });

    it('chain: basic attack → Tier 1 fallacy skill → Tier 1 token → Tier 3 ready', () => {
        mockAlternatingRng();

        let state = initializeCombat(SkillTestPlayer, Sandbag_01);

        // Step A: confirm the Tier 3 gate fires before any tokens exist.
        const strawGiant = getSkillById('straw-giant')!;
        expect(canUseSkill(state.combatResources, strawGiant)).toBe(false);

        // Step B: build Body tokens with a basic attack.
        ({ state } = resolveCombatRound(
            state,
            { stance: 'body', action: 'attack' },
            { stance: 'body', action: 'defend' },
            getSkillById,
        ));
        expect(state.combatResources.body).toBe(3);

        // Step C: fire a Tier 1 fallacy skill → mints +1 Fallacy.
        ({ state } = resolveCombatRound(
            state,
            { stance: 'body', action: 'skill', skillId: 'ad-hominem-strike' },
            { stance: 'body', action: 'defend' },
            getSkillById,
        ));
        expect(state.combatResources.body).toBe(0);
        expect(state.combatResources.fallacy).toBe(1);

        // Step D: rebuild Body via another basic attack.
        ({ state } = resolveCombatRound(
            state,
            { stance: 'body', action: 'attack' },
            { stance: 'body', action: 'defend' },
            getSkillById,
        ));
        expect(state.combatResources.body).toBe(3);
        expect(state.combatResources.fallacy).toBe(1);

        // Step E: Tier 3 gate now opens.
        expect(canUseSkill(state.combatResources, strawGiant)).toBe(true);
    });
});

// ─── Library structural invariants ───────────────────────────────────────────

describe('Skill library structural invariants', () => {
    it('exports at least 12 early-game skills', () => {
        expect(skillLibrary.length).toBeGreaterThanOrEqual(12);
    });

    it('every skill has the Spec 04b required shape', () => {
        for (const skill of skillLibrary) {
            expect(typeof skill.id).toBe('string');
            expect(skill.id).toMatch(/^[a-z][a-z0-9-]*$/);  // kebab-case
            expect([1, 2, 3]).toContain(skill.tier);
            expect(['self', 'enemy']).toContain(skill.targetType);
            expect(['body', 'mind', 'heart']).toContain(skill.scalingStat);
            expect(['fallacy', 'paradox']).toContain(skill.category);
            expect(typeof skill.basePower).toBe('number');
            expect(skill.resourceCost).toBeDefined();
        }
    });

    it('all skill IDs are unique', () => {
        const ids = skillLibrary.map(s => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('Tier 3 skills always require at least one philosophical token in cost', () => {
        const t3 = skillLibrary.filter(s => s.tier === 3);
        expect(t3.length).toBeGreaterThanOrEqual(3);
        for (const skill of t3) {
            const needsPhilosophical =
                (skill.resourceCost.fallacy ?? 0) > 0
                || (skill.resourceCost.paradox ?? 0) > 0;
            expect(needsPhilosophical).toBe(true);
        }
    });
});

// ─── Fixture immutability — hermetic isolation guard ─────────────────────────

describe('Fixture immutability invariant', () => {
    it('initializeCombat deep-clones SkillTestPlayer; mutations stay scoped', () => {
        mockAlternatingRng();

        const stateBefore = initializeCombat(SkillTestPlayer, Sandbag_01);
        // Walk through round 1 → 2 to mutate the in-combat clone.
        let state = stateBefore;
        ({ state } = resolveCombatRound(
            state,
            { stance: 'body', action: 'attack' },
            { stance: 'body', action: 'defend' },
            getSkillById,
        ));
        ({ state } = resolveCombatRound(
            state,
            { stance: 'body', action: 'skill', skillId: 'ad-hominem-strike' },
            { stance: 'body', action: 'defend' },
            getSkillById,
        ));

        // The canonical fixture is unchanged.
        expect(SkillTestPlayer.health).toBe(SkillTestPlayer.maxHealth);
        expect(SkillTestPlayer.equippedSkills).toEqual([
            'ad-hominem-strike',
            'achilles-gambit',
            'sorites-cascade',
            'straw-giant',
        ]);
    });
});
