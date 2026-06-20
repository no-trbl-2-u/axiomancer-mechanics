/**
 * Hermetic E2E Tests — Status-effect combo amplification in live combat (Phase 156)
 *
 * Hermetic = self-contained + deterministic + isolated.
 *
 * Proves the Phase 142 interaction engine is now LIVE: an `amplify_damage`
 * combo (poison + bleed → Hemorrhage, acid + poison → Dissolution) actually
 * boosts damage-over-time during a real round driven through
 * `resolveCombatRound`, versus the same effect alone.
 *
 * Both combatants `defend` so no attack rolls fire — the only HP change comes
 * from `processRoundStartEffects` / `processRoundEndEffects`, making the DoT
 * delta directly observable and RNG-free.
 */

import { afterEach, describe, it, expect, vi } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { Disatree_01 } from '../../Enemy/enemy.library';
import { ActiveEffect } from '../../Effects/types';
import { INTERACTION_AMPLIFICATION } from '../resolution.constants';
import { initializeCombat } from '../combat.reducer';
import { resolveCombatRound, type RoundEvent } from '../combat.resolver';

afterEach(() => {
    vi.restoreAllMocks();
});

const ae = (effectId: string, intensity = 1, remainingDuration = 4, tier: 1 | 2 | 3 = 2): ActiveEffect =>
    ({ effectId, intensity, remainingDuration, appliedAt: 1, tier });

const runDefendRound = (enemyEffects: ActiveEffect[]) => {
    const base = initializeCombat(Player, Disatree_01);
    const state = { ...base, enemy: { ...base.enemy, effects: enemyEffects } };
    const { state: next, combatEvents } = resolveCombatRound(
        state,
        { stance: 'body', action: 'defend' },
        { stance: 'body', action: 'defend' },
    );
    return { state: next, events: combatEvents };
};

/** The enemy's start-phase DoT amount this round, or undefined if none fired. */
const enemyStartDot = (events: readonly RoundEvent[]): number | undefined => {
    for (const e of events) {
        if (e.phase === 'round-start' && e.kind === 'dot' && e.actor === 'enemy') {
            return e.amount;
        }
    }
    return undefined;
};

describe('Status combo amplification E2E (Phase 156)', () => {
    it('poison alone deals its base start-phase DoT', () => {
        // debuff_poison: 4/round, start phase, intensity 2 → 8 base.
        const { state } = runDefendRound([ae('debuff_poison', 2)]);
        expect(state.enemy.health).toBe(Disatree_01.maxHealth - 8);
    });

    it('poison + bleed (Hemorrhage) amplifies the LIVE poison DoT vs poison alone', () => {
        // Combined intensity 2 + 1 = 3 ≥ 3 → hemorrhage fires, ×1.5 on poison.
        // Poison start: floor(4 × 2 × 1.5) = 12 (start phase).
        // Bleed end: 3 × 1 = 3 (end phase). Total HP loss = 15.
        const { state, events } = runDefendRound([
            ae('debuff_poison', 2),
            ae('debuff_bleed', 1),
        ]);

        // Poison-alone-at-intensity-2 would be 8 at start; the combo lifts it to 12.
        expect(enemyStartDot(events)).toBe(12);

        // Whole round: 12 (amplified poison, start) + 3 (bleed, end) = 15.
        expect(state.enemy.health).toBe(Disatree_01.maxHealth - 15);
    });

    it('acid + poison (Dissolution) amplifies the LIVE acid DoT', () => {
        // acid: 3/round start. dissolution ×1.5 on acid → floor(3 × 1 × 1.5) = 4.
        // poison: 4/round start, intensity 1, not the dissolution target → 4.
        // Both start-phase: 4 + 4 = 8.
        const { events } = runDefendRound([
            ae('debuff_acid', 1),
            ae('debuff_poison', 1),
        ]);
        expect(enemyStartDot(events)).toBe(8);
    });

    it('acid alone (no combo) deals only its unamplified base DoT', () => {
        // acid: 3/round, intensity 1, no poison present → no dissolution → 3.
        const { events } = runDefendRound([ae('debuff_acid', 1)]);
        expect(enemyStartDot(events)).toBe(3);
    });

    it('amplification never exceeds the MAX_DAMAGE_MULTIPLIER bound', () => {
        // Hemorrhage value is 1.5, well under the 2.0 cap. This guards the bound
        // so a future registry bump can't silently multiply DoT past the cap.
        const poisonBase = 4 * 2; // damagePerRound × intensity
        const { events } = runDefendRound([ae('debuff_poison', 2), ae('debuff_bleed', 1)]);
        const cap = Math.floor(poisonBase * INTERACTION_AMPLIFICATION.MAX_DAMAGE_MULTIPLIER);
        expect(enemyStartDot(events)!).toBeLessThanOrEqual(cap);
    });
});
