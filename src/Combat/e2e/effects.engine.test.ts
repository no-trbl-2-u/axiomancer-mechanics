/**
 * Hermetic E2E Tests — Effects Engine (Spec 01)
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 *
 * What IS covered here (all driving through `resolveCombatRound`):
 *   • Start-phase DoT (poison) reduces HP before actions resolve.
 *   • End-phase DoT (bleed) reduces HP after actions resolve.
 *   • Lethal start-phase DoT kills combatant and short-circuits the turn.
 *   • Stun (`skipTurn`) prevents Tier 1 effect application on the stunned combatant.
 *   • HP invariant — never drops below 0 even when DoT exceeds remaining health.
 *   • `createGameStore(nullAdapter, …)` lifecycle — no disk access during an
 *     effects-heavy turn.
 *
 * RNG convention (where needed):
 *   `mockAlternatingRng` alternates 0.9 / 0.1, giving randomInt(1,20) = 19 / 3.
 *   Neutral advantage = 1d20.  Sequence: player roll (19), enemy roll (3), player
 *   damage roll (19).
 */

import { afterEach, describe, it, expect, vi } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { Disatree_01 } from '../../Enemy/enemy.library';
import { ActiveEffect } from '../../Effects/types';
import { createGameStore } from '../../Game/store';
import { nullAdapter } from '../../Game/persistence/null.adapter';
import { mockAlternatingRng } from '../../test-utils/rng';
import { determineCombatEnd } from '../index';
import { initializeCombat } from '../combat.reducer';
import { resolveCombatRound } from '../combat.resolver';

afterEach(() => {
    vi.restoreAllMocks();
});

// Minimal ActiveEffect fixture — mirrors what the combat engine stores.
const ae = (effectId: string, intensity = 1, remainingDuration = 3, tier: 1 | 2 | 3 = 2): ActiveEffect =>
    ({ effectId, intensity, remainingDuration, appliedAt: 1, tier });

// ─── Start-phase DoT ──────────────────────────────────────────────────────────
//
// Poison (`debuff_poison`) has no tickPhase → defaults to 'start'.
// With both combatants defending (no attack rolls → no RNG needed), the only
// HP change comes from `processRoundStartEffects` at the top of the turn.
// ─────────────────────────────────────────────────────────────────────────────

describe('Effects E2E: start-phase DoT via processRoundStartEffects', () => {
    it('poison reduces enemy HP by DoT amount before actions resolve', () => {
        // debuff_poison: damagePerRound 3, default tickPhase 'start', intensity 1 → 3 dmg
        const base = initializeCombat(Player, Disatree_01);
        const state = {
            ...base,
            enemy: { ...base.enemy, effects: [ae('debuff_poison')] },
        };

        const { state: next } = resolveCombatRound(
            state,
            { stance: 'body', action: 'defend' },
            { stance: 'body', action: 'defend' },
        );

        // Poison fired at round start: 3 × intensity(1) = 3 damage
        expect(next.enemy.health).toBe(Disatree_01.maxHealth - 3);
        // Duration ticked once at round end: 3 → 2
        const poisonAfter = next.enemy.effects.find(e => e.effectId === 'debuff_poison');
        expect(poisonAfter?.remainingDuration).toBe(2);
        // Both defended — friendship counter increments
        expect(next.friendshipCounter).toBe(1);
    });

    it('intensity scaling: poison at intensity 2 deals double start-phase damage', () => {
        const base = initializeCombat(Player, Disatree_01);
        const state = {
            ...base,
            enemy: { ...base.enemy, effects: [ae('debuff_poison', 2)] },
        };

        const { state: next } = resolveCombatRound(
            state,
            { stance: 'body', action: 'defend' },
            { stance: 'body', action: 'defend' },
        );

        // 3 × intensity(2) = 6 damage
        expect(next.enemy.health).toBe(Disatree_01.maxHealth - 6);
    });
});

// ─── End-phase DoT ───────────────────────────────────────────────────────────
//
// Bleed (`debuff_bleed`) declares `tickPhase: 'end'` in the data.
// With both defending, its damage appears only in `processRoundEndEffects`.
// ─────────────────────────────────────────────────────────────────────────────

describe('Effects E2E: end-phase DoT via processRoundEndEffects', () => {
    it('bleed reduces enemy HP at round end — not during round start', () => {
        // debuff_bleed: damagePerRound 2, tickPhase 'end', intensity 1 → 2 dmg
        const base = initializeCombat(Player, Disatree_01);
        const state = {
            ...base,
            enemy: { ...base.enemy, effects: [ae('debuff_bleed')] },
        };

        const { state: next } = resolveCombatRound(
            state,
            { stance: 'body', action: 'defend' },
            { stance: 'body', action: 'defend' },
        );

        // Bleed fired at round end: 2 × intensity(1) = 2 damage
        expect(next.enemy.health).toBe(Disatree_01.maxHealth - 2);
        const bleedAfter = next.enemy.effects.find(e => e.effectId === 'debuff_bleed');
        expect(bleedAfter?.remainingDuration).toBe(2);
    });
});

// ─── Terminal condition: DoT kills before actions ────────────────────────────
//
// When start-phase DoT drops a combatant to 0 HP, `resolveCombatRound` skips
// the attack-resolution step and returns immediately after incrementing round.
// ─────────────────────────────────────────────────────────────────────────────

describe('Effects E2E: lethal start-phase DoT — terminal condition', () => {
    it('heavy poison kills enemy before actions; combat ends as player victory', () => {
        // intensity 4 → DoT = 3 × 4 = 12/round; Disatree_01.maxHealth = 10
        const base = initializeCombat(Player, Disatree_01);
        const state = {
            ...base,
            enemy: { ...base.enemy, effects: [ae('debuff_poison', 4)] },
        };

        // Attack actions supplied — they must NOT fire (enemy dead before actions)
        const { state: next } = resolveCombatRound(
            state,
            { stance: 'body', action: 'attack' },
            { stance: 'body', action: 'attack' },
        );

        expect(next.enemy.health).toBe(0);
        expect(determineCombatEnd(next)).toBe('player');
        // Round counter still increments on early exit
        expect(next.round).toBe(2);
    });
});

// ─── HP invariant ────────────────────────────────────────────────────────────

describe('Effects E2E: HP invariant — never below 0', () => {
    it('HP clamps to 0 even when DoT exceeds remaining health', () => {
        const base = initializeCombat(Player, Disatree_01);
        const state = {
            ...base,
            // Enemy has 1 HP and will take 9 DoT damage — net would be -8
            enemy: { ...base.enemy, health: 1, effects: [ae('debuff_poison', 3)] },
        };

        const { state: next } = resolveCombatRound(
            state,
            { stance: 'body', action: 'defend' },
            { stance: 'body', action: 'defend' },
        );

        expect(next.enemy.health).toBeGreaterThanOrEqual(0);
        expect(next.enemy.health).toBe(0);
    });
});

// ─── Stun (skipTurn) enforced via canAct ─────────────────────────────────────
//
// A stunned combatant's action is resolved as 'skip'. Crucially, Tier 1 effects
// are NOT applied for skipped combatants (the `if (enemyCan.canAct && …)` guard
// in `resolveCombatRound`). The stun also expires after its 1-round duration.
//
// RNG sequence (mockAlternatingRng, neutral advantage on both sides → 1d20 each):
//   call 1 → 0.9 → 19  (player contest roll)
//   call 2 → 0.1 → 3   (enemy contest roll — enemy was stunned but still appears in resolveAttackVsAttack)
//   call 3 → 0.9 → 19  (player damage roll)
// ─────────────────────────────────────────────────────────────────────────────

describe('Effects E2E: stun (skipTurn) prevents Tier 1 effect application', () => {
    it('stunned enemy does not receive Tier 1 body/attack buff', () => {
        mockAlternatingRng();

        const base = initializeCombat(Player, Disatree_01);
        const state = {
            ...base,
            enemy: {
                ...base.enemy,
                // debuff_stun: skipTurn true, duration 1
                effects: [ae('debuff_stun', 1, 1)],
            },
        };

        const { state: next } = resolveCombatRound(
            state,
            { stance: 'body', action: 'attack' },
            { stance: 'body', action: 'attack' }, // enemy was going to attack — stun overrides
        );

        // Enemy was stunned — their Tier 1 body/attack buff (Ad Baculum) was never applied
        expect(next.enemy.effects.some(e => e.effectId === 'tier1_body_attack')).toBe(false);

        // Stun expired: remainingDuration 1 → ticked to 0 at round end → removed
        expect(next.enemy.effects.some(e => e.effectId === 'debuff_stun')).toBe(false);

        // Player DID get their Tier 1 body/attack buff (asymmetric — only player was active)
        expect(next.player.effects.some(e => e.effectId === 'tier1_body_attack')).toBe(true);
    });
});

// ─── Game store lifecycle — nullAdapter (zero disk access) ───────────────────

describe('Effects E2E: Game store lifecycle with active effects — nullAdapter', () => {
    it('no disk access during a turn that processes start-phase DoT', () => {
        const saveSpy = vi.spyOn(nullAdapter, 'save');

        const store = createGameStore(nullAdapter, { player: Player });
        store.getState().startCombat(Disatree_01);

        // Inject an active DoT effect onto the enemy inside the combat snapshot
        const combat = store.getState().combat!;
        const combatWithEffects = {
            ...combat,
            enemy: { ...combat.enemy, effects: [ae('debuff_poison')] },
        };

        const { state: next } = resolveCombatRound(
            combatWithEffects,
            { stance: 'body', action: 'defend' },
            { stance: 'body', action: 'defend' },
        );

        store.getState().updateCombat(next);
        store.getState().endCombat();

        // No file I/O should have occurred
        expect(saveSpy).not.toHaveBeenCalled();

        // Poison actually fired — HP reduced
        expect(next.enemy.health).toBe(Disatree_01.maxHealth - 3);
    });
});
