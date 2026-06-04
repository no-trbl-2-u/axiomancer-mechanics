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
        expect(report.metrics.resolutionSuccessRate).toBe(
            (report.metrics.outcomes.victory + report.metrics.outcomes.friendship) / report.metrics.totalRuns,
        );
        expect(report.metrics.policySummaries.map(summary => summary.policy).sort()).toEqual(['aggressive', 'defensive', 'mixed', 'strategist']);
        expect(report.runs[0]).toMatchObject({
            run: 1,
            seed: 'playtest-harness-e2e:1',
            preset: 'sage',
            enemy: 'coastal-tyrant',
        });
        expect(report.findings.length).toBeGreaterThan(0);
    });

    it('drives the mercy policy through Befriend attempts and spare choices', () => {
        const scenario: PlaytestScenario = {
            id: 'test-mercy-loop-tidefluke-reaver',
            description: 'Mercy-loop witness for Befriend and spare choice.',
            preset: 'sage',
            enemy: 'tidefluke-reaver',
            runs: 2,
            maxRounds: 22,
            seed: 'playtest-mercy-e2e',
            policies: ['mercy'],
        };

        const report = runPlaytestScenario(scenario);

        expect(report.metrics.befriendAttempts).toBeGreaterThan(0);
        expect(report.metrics.befriendSuccesses).toBeGreaterThan(0);
        expect(report.metrics.spareChoices).toBeGreaterThan(0);
        expect(report.metrics.exploitChoices).toBe(0);
        expect(report.runs.some(run => run.outcome === 'friendship')).toBe(true);
    });

    it('can witness exploit choices from an opened mercy state', () => {
        const scenario: PlaytestScenario = {
            id: 'test-mercy-exploit-loop-tidefluke-reaver',
            description: 'Mercy-loop witness for exploit choice.',
            preset: 'sage',
            enemy: 'tidefluke-reaver',
            runs: 2,
            maxRounds: 22,
            seed: 'playtest-mercy-exploit-e2e',
            policies: ['mercy-exploit'],
        };

        const report = runPlaytestScenario(scenario);

        expect(report.metrics.befriendAttempts).toBeGreaterThan(0);
        expect(report.metrics.befriendSuccesses).toBeGreaterThan(0);
        expect(report.metrics.exploitChoices).toBeGreaterThan(0);
    });
});
