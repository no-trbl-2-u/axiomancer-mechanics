import { afterEach, describe, expect, it } from 'vitest';

import { runPlaytestScenario } from '../playtest.runner';
import type { PlaytestScenario } from '../types';
import { setRng, type Rng } from '../../Utils/rng';

const mathBackedRng: Rng = {
    random: () => Math.random(),
    getState: () => 0,
    setState: () => {},
};

afterEach(() => {
    setRng(mathBackedRng);
});

describe('Automated playtest harness', () => {
    it('runs a scenario multiple times and returns aggregate metrics plus replayable run summaries', () => {
        const scenario: PlaytestScenario = {
            id: 'test-late-game-coastal-tyrant',
            description: 'Hermetic smoke scenario for the playtest harness.',
            preset: 'sage',
            enemy: 'coastal-tyrant',
            runs: 4,
            maxRounds: 8,
            seed: 'playtest-harness-e2e',
            policies: ['aggressive', 'defensive', 'mixed', 'strategist'],
        };

        const report = runPlaytestScenario(scenario);

        expect(report.scenarioId).toBe(scenario.id);
        expect(report.runs).toHaveLength(4);
        expect(report.metrics.totalRuns).toBe(4);
        expect(report.metrics.outcomes.victory + report.metrics.outcomes.defeat + report.metrics.outcomes.friendship + report.metrics.outcomes.timeout).toBe(4);
        expect(report.metrics.averageRounds).toBeGreaterThan(0);
        expect(report.metrics.policySummaries.map(summary => summary.policy).sort()).toEqual(['aggressive', 'defensive', 'mixed', 'strategist']);
        expect(report.runs[0]).toMatchObject({
            run: 1,
            seed: 'playtest-harness-e2e:1',
            preset: 'sage',
            enemy: 'coastal-tyrant',
        });
        expect(report.findings.length).toBeGreaterThan(0);
    });
});
