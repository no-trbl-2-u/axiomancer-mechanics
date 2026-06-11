/**
 * Hazard balance guard — Monte-Carlo over the real engine with a greedy
 * bot (see `hazard.sim.ts`). The bands encode the no-re-cast retune
 * targets:
 *
 *   Safe route — forgiving: a competent player almost always salvages
 *   at least one round; perfect runs are common but not free.
 *   Risk route — the gamble: real failure odds, perfect is earned.
 *
 * If content changes push a hazard outside its band, this suite fails
 * and the numbers need re-tuning (or the band needs a deliberate,
 * documented update). 300 seeded runs per cell keeps the suite fast
 * while holding rate noise to roughly ±5pp.
 *
 * Ported from the mobile v2 source of truth
 * (`../axiomancer-mobile/state/hazard/__tests__/balance.sim.test.ts`).
 */

import { describe, it, expect } from 'vitest';

import { HAZARD_LIBRARY } from '../hazard.content';
import { hazardStarterBag } from '../hazard.deck-flags';
import { simulateHazard } from '../hazard.sim';

const BAG = hazardStarterBag();
const RUNS = 300;

describe('hazard balance bands (greedy bot, no re-cast doctrine)', () => {
    for (const hazard of HAZARD_LIBRARY) {
        describe(hazard.title, () => {
            it('safe route stays forgiving (tuned: ~55-60% perfect, ~0% failure)', () => {
                const stats = simulateHazard(hazard.id, 'safe', BAG, RUNS);
                expect(stats.atLeastOneWinRate).toBeGreaterThanOrEqual(0.9);
                expect(stats.perfectRate).toBeGreaterThanOrEqual(0.35);
                expect(stats.perfectRate).toBeLessThanOrEqual(0.78);
                expect(stats.failureRate).toBeLessThanOrEqual(0.08);
            });

            it('risk route stays a real gamble (tuned: ~17-20% perfect, ~10% failure)', () => {
                const stats = simulateHazard(hazard.id, 'risk', BAG, RUNS);
                expect(stats.atLeastOneWinRate).toBeGreaterThanOrEqual(0.75);
                expect(stats.atLeastOneWinRate).toBeLessThanOrEqual(0.98);
                expect(stats.perfectRate).toBeGreaterThanOrEqual(0.08);
                expect(stats.perfectRate).toBeLessThanOrEqual(0.35);
                expect(stats.failureRate).toBeGreaterThanOrEqual(0.03);
                expect(stats.failureRate).toBeLessThanOrEqual(0.25);
            });

            it('risk is strictly harder than safe', () => {
                const safe = simulateHazard(hazard.id, 'safe', BAG, RUNS);
                const risk = simulateHazard(hazard.id, 'risk', BAG, RUNS);
                expect(risk.avgWins).toBeLessThan(safe.avgWins);
            });
        });
    }
});
