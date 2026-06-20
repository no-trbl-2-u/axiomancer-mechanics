/**
 * Hermetic e2e — cross-combat resource carry.
 *
 * A won combat carries a capped fraction of UNSPENT philosophical resources
 * (fallacy / paradox — the skill fuel) into the next combat's seed; stance
 * tokens never carry, and a loss carries nothing. This rewards casting skills
 * (which apply status effects) and planning across encounters — the STRATEGIST
 * path the VISION.md doctrine optimises for.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { createGameStore } from '../store';
import { nullAdapter } from '../persistence/null.adapter';
import { RESOURCE_CARRY } from '../game-mechanics.constants';
import { carryPhilosophicalResources } from '../../Skills';
import type { CombatResources } from '../../Skills/types';
import { Player } from '../../Character/characters.mock';
import { TidepoolCrab } from '../../Enemy/enemy.library';

afterEach(() => vi.restoreAllMocks());

const pool = (over: Partial<CombatResources>): CombatResources => ({
    heart: 0, body: 0, mind: 0, fallacy: 0, paradox: 0, ...over,
});

describe('carryPhilosophicalResources (pure)', () => {
    it('carries floor(FRACTION × unspent) of fallacy/paradox; stance tokens never carry', () => {
        const carried = carryPhilosophicalResources(pool({ heart: 9, body: 9, mind: 9, fallacy: 4, paradox: 2 }));
        expect(carried.fallacy).toBe(Math.min(Math.floor(4 * RESOURCE_CARRY.FRACTION), RESOURCE_CARRY.CAP));
        expect(carried.paradox).toBe(Math.min(Math.floor(2 * RESOURCE_CARRY.FRACTION), RESOURCE_CARRY.CAP));
        expect(carried.heart).toBeUndefined();
        expect(carried.body).toBeUndefined();
        expect(carried.mind).toBeUndefined();
    });

    it('caps the carry per resource so it cannot snowball', () => {
        const carried = carryPhilosophicalResources(pool({ fallacy: 100, paradox: 100 }));
        expect(carried.fallacy).toBe(RESOURCE_CARRY.CAP);
        expect(carried.paradox).toBe(RESOURCE_CARRY.CAP);
    });

    it('omits zero/sub-unit entries (sparse result)', () => {
        // floor(0.5 × 1) = 0 → omitted; paradox 0 → omitted.
        expect(carryPhilosophicalResources(pool({ fallacy: 1, paradox: 0 }))).toEqual({});
    });
});

describe('resource carry lifecycle through the game store', () => {
    function forceWinWithResources(store: ReturnType<typeof createGameStore>, resources: CombatResources) {
        store.getState().startCombat(TidepoolCrab);
        const combat = store.getState().combat!;
        store.setState({
            combat: { ...combat, combatResources: resources, enemy: { ...combat.enemy, health: 0 } },
        });
        return store.getState().endCombat();
    }

    it('carries unspent fallacy/paradox from a won combat into the next combat seed, then clears it', () => {
        const store = createGameStore(nullAdapter, { player: Player });

        // Win with 4 fallacy / 2 paradox unspent → carry floor(0.5×) = 2 / 1.
        const report = forceWinWithResources(store, pool({ heart: 6, body: 6, fallacy: 4, paradox: 2 }));
        expect(report.outcome).toBe('victory');
        expect(store.getState().player.carriedResources).toEqual({ fallacy: 2, paradox: 1 });

        // Next combat seeds those carried resources, then the player's carry clears.
        store.getState().startCombat(TidepoolCrab);
        const seed = store.getState().combat!.combatResources;
        expect(seed.fallacy).toBeGreaterThanOrEqual(2);
        expect(seed.paradox).toBeGreaterThanOrEqual(1);
        // Stance tokens are not carried.
        expect(seed.heart).toBe(0);
        expect(seed.body).toBe(0);
        expect(seed.mind).toBe(0);
        expect(store.getState().player.carriedResources).toBeUndefined();
    });

    it('a loss carries nothing', () => {
        const store = createGameStore(nullAdapter, { player: Player });
        store.getState().startCombat(TidepoolCrab);
        const combat = store.getState().combat!;
        // Player KO'd, but resources unspent — a loss must not bank carry.
        store.setState({
            combat: {
                ...combat,
                combatResources: pool({ fallacy: 8, paradox: 8 }),
                player: { ...combat.player, health: 0 },
            },
        });
        const report = store.getState().endCombat();
        expect(report.outcome).toBe('defeat');
        expect(store.getState().player.carriedResources).toBeUndefined();
    });
});
