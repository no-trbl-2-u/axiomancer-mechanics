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

    it('tests enhanced STRATEGIST witness reading enemy state and resources', () => {
        const scenario: PlaytestScenario = {
            id: 'test-strategist-enhanced-coastal-tyrant',
            description: 'Enhanced STRATEGIST witness for Phase 113 - reading enemy state and resources',
            preset: 'sage',
            enemy: 'coastal-tyrant',
            runs: 3,
            maxRounds: 20,
            seed: 'strategist-enhanced-e2e',
            policies: ['strategist'],
        };

        const report = runPlaytestScenario(scenario);

        // STRATEGIST should show tactical decision-making
        expect(report.metrics.totalRuns).toBe(3);
        expect(report.metrics.policySummaries).toHaveLength(1);
        
        const strategistSummary = report.metrics.policySummaries.find(summary => summary.policy === 'strategist');
        expect(strategistSummary).toBeDefined();
        expect(strategistSummary!.resolutionSuccessRate).toBeGreaterThanOrEqual(0);
        
        // Verify the enhanced finding reports include STRATEGIST witness
        const strategistFinding = report.findings.find(finding => 
            finding.includes('STRATEGIST witness'));
        expect(strategistFinding).toBeDefined();
    });

    it('includes enhanced mercy loop reporting in findings per Phase 113', () => {
        const scenario: PlaytestScenario = {
            id: 'test-enhanced-reporting-mercy',
            description: 'Enhanced mercy loop reporting for Phase 113',
            preset: 'sage',
            enemy: 'tidefluke-reaver',
            runs: 2,
            maxRounds: 22,
            seed: 'enhanced-reporting-e2e',
            policies: ['mercy', 'mercy-exploit'],
        };

        const report = runPlaytestScenario(scenario);

        // Should have detailed outcome breakdown
        const outcomeFinding = report.findings.find(finding => 
            finding.includes('Outcome breakdown:'));
        expect(outcomeFinding).toBeDefined();
        expect(outcomeFinding).toContain('victory');
        expect(outcomeFinding).toContain('friendship');
        expect(outcomeFinding).toContain('defeat');
        expect(outcomeFinding).toContain('timeout');

        // Should have Befriend skill metrics if any attempts occurred
        if (report.metrics.befriendAttempts > 0) {
            const befriendFinding = report.findings.find(finding => 
                finding.includes('Befriend skill metrics:'));
            expect(befriendFinding).toBeDefined();
        }

        // Should have mercy choice breakdown if any choices occurred
        if (report.metrics.spareChoices > 0 || report.metrics.exploitChoices > 0) {
            const mercyFinding = report.findings.find(finding => 
                finding.includes('Mercy choices:'));
            expect(mercyFinding).toBeDefined();
        }
    });

    it('validates 65-75% resolution success rate target in findings', () => {
        const scenario: PlaytestScenario = {
            id: 'test-resolution-success-rate-reporting',
            description: 'Resolution success rate reporting for Phase 113',
            preset: 'apprentice',
            enemy: 'tidepool-crab',
            runs: 4,
            maxRounds: 15,
            seed: 'resolution-success-e2e',
            policies: ['aggressive', 'defensive'],
        };

        const report = runPlaytestScenario(scenario);

        // Should report resolution success rate with target band
        const resolutionFinding = report.findings.find(finding => 
            finding.includes('target band is 65–75%'));
        
        // This finding should exist if rate is outside target band
        if (report.metrics.resolutionSuccessRate < 0.65 || report.metrics.resolutionSuccessRate > 0.75) {
            expect(resolutionFinding).toBeDefined();
        }
    });

    // Phase 121 — Three-anchor balance scaffold validation
    it('validates Phase 121 balance anchors against stat law and target bands', () => {
        const canonicalPolicies: PlaytestScenario['policies'] = ['aggressive', 'defensive', 'mixed', 'strategist'];
        const easyScenario: PlaytestScenario = {
            id: 'test-phase-121-easy-anchor',
            description: 'Phase 121 Easy anchor validation',
            preset: 'sage',
            enemy: 'coastal-tyrant',
            runs: 25,
            maxRounds: 50,
            seed: 'phase-121-easy-v1',
            policies: canonicalPolicies,
        };

        const normalScenario: PlaytestScenario = {
            id: 'test-phase-121-normal-anchor',
            description: 'Phase 121 Normal anchor validation',
            preset: 'sage',
            enemy: 'audit-sentinel',
            runs: 25,
            maxRounds: 50,
            seed: 'phase-121-normal-v1',
            policies: canonicalPolicies,
        };

        const difficultScenario: PlaytestScenario = {
            id: 'test-phase-121-difficult-anchor',
            description: 'Phase 121 Difficult anchor validation',
            preset: 'sage',
            enemy: 'balance-judge',
            runs: 25,
            maxRounds: 75,
            seed: 'phase-121-difficult-v1',
            policies: canonicalPolicies,
        };

        // All scenarios should run without error
        const easyReport = runPlaytestScenario(easyScenario);
        const normalReport = runPlaytestScenario(normalScenario);
        const difficultReport = runPlaytestScenario(difficultScenario);

        // Validate canonical run structure
        expect(easyReport.metrics.totalRuns).toBe(25);
        expect(normalReport.metrics.totalRuns).toBe(25);
        expect(difficultReport.metrics.totalRuns).toBe(25);
        expect(easyReport.metrics.policySummaries).toHaveLength(canonicalPolicies.length);
        expect(normalReport.metrics.policySummaries).toHaveLength(canonicalPolicies.length);
        expect(difficultReport.metrics.policySummaries).toHaveLength(canonicalPolicies.length);

        // Validate authored target bands from the Phase 121 anchor scenarios.
        expect(easyReport.metrics.winRate).toBe(1);
        expect(normalReport.metrics.winRate).toBeGreaterThanOrEqual(0.75);
        expect(normalReport.metrics.winRate).toBeLessThanOrEqual(1);
        expect(difficultReport.metrics.winRate).toBeGreaterThanOrEqual(0.25);
        expect(difficultReport.metrics.winRate).toBeLessThanOrEqual(0.5);

        // Easy anchor should have higher win rate than normal, and normal higher than difficult.
        expect(easyReport.metrics.winRate).toBeGreaterThanOrEqual(normalReport.metrics.winRate);
        expect(normalReport.metrics.winRate).toBeGreaterThanOrEqual(difficultReport.metrics.winRate);

        // All should have some outcome breakdown findings
        expect(easyReport.findings.length).toBeGreaterThan(0);
        expect(normalReport.findings.length).toBeGreaterThan(0);
        expect(difficultReport.findings.length).toBeGreaterThan(0);
    });
});
