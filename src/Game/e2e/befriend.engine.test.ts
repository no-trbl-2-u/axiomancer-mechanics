/**
 * Hermetic e2e — Phase 60 befriendable-enemy content arc.
 *
 * Drives a friendship outcome for MournfulGull + HollowEyedBeggar end-to-end
 * through `createGameStore`, asserts the per-enemy `friendshipReward`
 * threads through `store.endCombat()` per Phase 60 D5 / D6 / D7:
 *
 *   - items append to `report.loot` (D6)
 *   - xpBonus adds to `report.xpGained` on top of Phase 36 half-XP (D5)
 *   - narrative surfaces on `report.friendshipReward.narrative` (D7)
 *
 * Phase 36 mechanics (half-XP base, +1 moralMeter) are preserved.
 */

import { describe, it, expect } from 'vitest';
import { MournfulGull, HollowEyedBeggar, TidepoolCrab } from '../../Enemy/enemy.library';
import { createGameStore, selectMoralMeter } from '../store';
import { nullAdapter } from '../persistence/null.adapter';
import { FRIENDSHIP_COUNTER_MAX } from '../game-mechanics.constants';

function driveToFriendship(store: ReturnType<typeof createGameStore>) {
    const combat = store.getState().combat!;
    store.getState().updateCombat({
        ...combat,
        friendshipCounter: FRIENDSHIP_COUNTER_MAX,
    });
}

describe('Phase 60 — befriendable-enemy content arc', () => {
    it('MournfulGull friendship report carries the per-enemy items + xpBonus + narrative', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(MournfulGull);
        driveToFriendship(store);

        const initialMeter = selectMoralMeter(store.getState());
        const report = store.getState().endCombat();

        expect(report.outcome).toBe('friendship');
        // Items — the friendship grant guarantees a heart-draught regardless
        // of the weighted-roll outcome.
        expect(report.loot.some(item => item.id === 'heart-draught')).toBe(true);
        // xpBonus — base half-XP for MournfulGull (level 2, normal:
        // 2 * 20 / 2 = 20) plus the authored +10 bonus.
        expect(report.xpGained).toBe(30);
        // Narrative — pulls from the authored string in enemy.library.ts.
        expect(report.friendshipReward?.narrative).toMatch(/circling/);
        // Phase 36 base still fires: +1 moralMeter shift.
        expect(selectMoralMeter(store.getState())).toBe(initialMeter + 1);
    });

    it('HollowEyedBeggar friendship grants 2 phials + xpBonus 15 + reversal narrative', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(HollowEyedBeggar);
        driveToFriendship(store);

        const report = store.getState().endCombat();

        expect(report.outcome).toBe('friendship');
        // Two guaranteed phials (healing-potion + antidote) on top of any
        // weighted-roll loot.
        expect(report.loot.some(item => item.id === 'healing-potion')).toBe(true);
        expect(report.loot.some(item => item.id === 'antidote')).toBe(true);
        // Base half-XP for HollowEyedBeggar (level 3, normal: 3 * 20 / 2 = 30)
        // plus authored +15 bonus.
        expect(report.xpGained).toBe(45);
        expect(report.friendshipReward?.narrative).toMatch(/phials/);
    });

    it('TidepoolCrab friendship omits report.friendshipReward — enemy has no authored reward', () => {
        // Regression guard for Phase 60 D12: existing consumers that
        // destructure { outcome, xpGained, loot } continue to work; the
        // friendshipReward field is undefined for enemies without authoring.
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(TidepoolCrab);
        driveToFriendship(store);

        const report = store.getState().endCombat();

        expect(report.outcome).toBe('friendship');
        expect(report.friendshipReward).toBeUndefined();
        // Phase 36 base still computes: half-XP only; no xpBonus applied.
        // Base half-XP for TidepoolCrab (level 1, simple: 1 * 10 / 2 = 5).
        expect(report.xpGained).toBe(5);
    });

    it('victory outcome does NOT thread friendshipReward content even when authored', () => {
        // Phase 60 D7 — friendshipReward field surfaces ONLY on
        // outcome === 'friendship'. Defeat / victory / flee paths skip it.
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(MournfulGull);
        // Drive to victory: zero the enemy's HP directly.
        const combat = store.getState().combat!;
        store.getState().updateCombat({
            ...combat,
            enemy: { ...combat.enemy, health: 0 },
        });
        const report = store.getState().endCombat();

        expect(report.outcome).toBe('victory');
        expect(report.friendshipReward).toBeUndefined();
    });
});
