/**
 * Hazard balance guard — Monte-Carlo over the real engine with a
 * greedy bot (see `src/World/Hazard/hazard.sim.ts`). The bands encode the
 * no-re-cast retune targets, hardened by the 2026-06-12 difficulty
 * pass (playtest: the crossings had grown too easy):
 *
 *   Safe route — still forgiving (almost always at least a partial
 *   clear), but a perfect run is now uncommon for the greedy bot
 *   (~30-40%, down from ~60-70%) — real headroom for a skilled player.
 *   Risk route — a sharper gamble: perfect ~10%, failure ~10%+.
 *
 * If content changes push a hazard outside its band, this suite fails
 * and the numbers need re-tuning (or the band needs a deliberate,
 * documented update). 300 seeded runs per cell keeps the suite fast
 * (< 2s) while holding rate noise to roughly ±5pp.
 */

import { describe, expect, it } from 'vitest';

import { HAZARD_LIBRARY } from '../hazard.content';
import { hazardStarterBag } from '../hazard.deck-flags';
import { simulateHazard } from '../hazard.sim';

const BAG = hazardStarterBag();
const RUNS = 300;

describe('hazard balance bands (greedy bot, no re-cast doctrine)', () => {
    for (const hazard of HAZARD_LIBRARY) {
        describe(hazard.title, () => {
            it('safe route stays forgiving but no longer easy (tuned: ~30-40% perfect, ~0-3% failure)', () => {
                const stats = simulateHazard(hazard.id, 'safe', BAG, RUNS);
                expect(stats.atLeastOneWinRate).toBeGreaterThanOrEqual(0.9);
                expect(stats.perfectRate).toBeGreaterThanOrEqual(0.18);
                expect(stats.perfectRate).toBeLessThanOrEqual(0.52);
                expect(stats.failureRate).toBeLessThanOrEqual(0.1);
            });

            it('risk route stays a sharp gamble (tuned: ~10% perfect, ~10% failure)', () => {
                const stats = simulateHazard(hazard.id, 'risk', BAG, RUNS);
                expect(stats.atLeastOneWinRate).toBeGreaterThanOrEqual(0.74);
                expect(stats.atLeastOneWinRate).toBeLessThanOrEqual(0.97);
                expect(stats.perfectRate).toBeGreaterThanOrEqual(0.03);
                expect(stats.perfectRate).toBeLessThanOrEqual(0.22);
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
