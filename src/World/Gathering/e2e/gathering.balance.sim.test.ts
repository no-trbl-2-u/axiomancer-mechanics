/**
 * Gathering balance guard — Monte-Carlo over the real engine with
 * scripted bots (see `state/gathering/sim.ts`). The bands encode the
 * Forage doctrine: the game is about EXTRACTION vs RESTRAINT, so the
 * incentive gradient must hold —
 *
 *   blind greed  < timid restraint < skilled push-your-luck
 *
 *   timid    — never erupts, communes often, takes a modest satchel.
 *   balanced — reads the wrath costs, never despoils, takes the most.
 *   greedy   — strips and never stops: the site always answers, and the
 *              eruption + bites leave it with the LEAST.
 *
 * If content changes break a band, this suite fails and the numbers
 * need re-tuning (or the band needs a deliberate, documented update).
 * 400 seeded runs per policy keeps the suite fast while holding rate
 * noise to roughly ±5pp.
 */

import { describe, expect, it } from 'vitest';

import { GATHERING_SITES } from '../gathering.content';
import { runGatheringSim } from '../gathering.sim';

const RUNS = 400;
const PER_SITE_RUNS = 120;

describe('gathering balance bands', () => {
    const timid = runGatheringSim({ runs: RUNS, policy: 'timid' });
    const balanced = runGatheringSim({ runs: RUNS, policy: 'balanced' });
    const greedy = runGatheringSim({ runs: RUNS, policy: 'greedy' });

    it('timid restraint is safe: no eruptions, frequent communion, modest take', () => {
        expect(timid.eruptionRate).toBeLessThanOrEqual(0.01);
        expect(timid.tiers.despoiled).toBe(0);
        expect(timid.communionRate).toBeGreaterThanOrEqual(0.35);
        expect(timid.avgKeptRichness).toBeGreaterThanOrEqual(6);
        expect(timid.avgKeptRichness).toBeLessThanOrEqual(10);
        expect(timid.avgBitten).toBeLessThanOrEqual(1);
    });

    it('skilled push-your-luck takes the most without scarring', () => {
        expect(balanced.eruptionRate).toBeLessThanOrEqual(0.03);
        expect(balanced.tiers.despoiled / RUNS).toBeLessThanOrEqual(0.05);
        expect(balanced.communionRate).toBeGreaterThanOrEqual(0.12);
        expect(balanced.avgKeptRichness).toBeGreaterThanOrEqual(10.5);
        expect(balanced.avgKeptRichness).toBeLessThanOrEqual(15);
    });

    it('blind greed always wakes the site and pays for it', () => {
        expect(greedy.eruptionRate).toBeGreaterThanOrEqual(0.9);
        expect(greedy.avgBitten).toBeGreaterThanOrEqual(3);
    });

    it('the incentive gradient holds: greed < restraint < skill', () => {
        expect(greedy.avgKeptRichness).toBeLessThan(timid.avgKeptRichness);
        expect(timid.avgKeptRichness).toBeLessThan(balanced.avgKeptRichness);
    });

    for (const site of GATHERING_SITES) {
        it(`${site.title}: the wrath economy holds per-site`, () => {
            const t = runGatheringSim({ runs: PER_SITE_RUNS, policy: 'timid', siteId: site.id });
            const g = runGatheringSim({ runs: PER_SITE_RUNS, policy: 'greedy', siteId: site.id });
            expect(t.eruptionRate).toBeLessThanOrEqual(0.02);
            expect(g.eruptionRate).toBeGreaterThanOrEqual(0.8);
        });
    }
});
