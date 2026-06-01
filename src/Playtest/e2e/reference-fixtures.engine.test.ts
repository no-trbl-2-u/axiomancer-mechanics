/**
 * Reference fixtures hermetic test — Phase 104 Unit 2
 * 
 * Verifies that the early-game and endgame reference fixtures resolve
 * correctly and produce the expected enhanced metrics.
 */

import { describe, it, expect } from 'vitest';
import { runPlaytestScenario } from '../playtest.runner';
import { earlyGameFixture, endgameFixture } from '../fixtures';
import { renderPlaytestMarkdown } from '../report';

describe('Reference Fixtures (Phase 104)', () => {
    describe('Early-game fixture', () => {
        it('should resolve without errors and produce a report', () => {
            const report = runPlaytestScenario({
                ...earlyGameFixture,
                runs: 3,  // Reduce for test performance
                maxRounds: 10,
            });

            expect(report).toBeDefined();
            expect(report.scenarioId).toBe('early-game-reference');
            expect(report.preset).toBe('apprentice');
            expect(report.enemy).toBe('tidepool-crab');
            expect(report.runs).toHaveLength(3);
            expect(report.metrics.totalRuns).toBe(3);
        });

        it('should produce enhanced metrics with correct structure', () => {
            const report = runPlaytestScenario({
                ...earlyGameFixture,
                runs: 5,
                maxRounds: 10,
            });

            const metrics = report.metrics;
            
            // Enhanced metrics structure
            expect(metrics.survivabilityRate).toBeTypeOf('number');
            expect(metrics.survivabilityRate).toBeGreaterThanOrEqual(0);
            expect(metrics.survivabilityRate).toBeLessThanOrEqual(1);

            expect(metrics.roundsToResolveDistribution).toBeDefined();
            expect(metrics.roundsToResolveDistribution.min).toBeTypeOf('number');
            expect(metrics.roundsToResolveDistribution.max).toBeTypeOf('number');
            expect(metrics.roundsToResolveDistribution.q25).toBeTypeOf('number');
            expect(metrics.roundsToResolveDistribution.q75).toBeTypeOf('number');
            expect(metrics.roundsToResolveDistribution.stdDev).toBeGreaterThanOrEqual(0);

            expect(metrics.damageRatio).toBeDefined();
            expect(metrics.damageRatio.playerToEnemy).toBeTypeOf('number');
            expect(metrics.damageRatio.playerEfficiency).toBeTypeOf('number');
            expect(metrics.damageRatio.enemyEfficiency).toBeTypeOf('number');
        });

        it('should have different balance signature than endgame fixture', () => {
            const earlyReport = runPlaytestScenario({
                ...earlyGameFixture,
                runs: 3,
                maxRounds: 10,
            });
            
            const endgameReport = runPlaytestScenario({
                ...endgameFixture,
                runs: 3,
                maxRounds: 25,
            });

            // Early game should be faster to resolve
            expect(earlyReport.metrics.averageRounds).toBeLessThan(endgameReport.metrics.averageRounds);
            
            // Balance signatures should be different
            expect(earlyReport.metrics.survivabilityRate).not.toBe(endgameReport.metrics.survivabilityRate);
            expect(earlyReport.metrics.damageRatio.playerEfficiency).not.toBe(endgameReport.metrics.damageRatio.playerEfficiency);
        });
    });

    describe('Endgame fixture', () => {
        it('should resolve without errors using max-out preset', () => {
            const report = runPlaytestScenario({
                ...endgameFixture,
                runs: 3,
                maxRounds: 25,
            });

            expect(report).toBeDefined();
            expect(report.scenarioId).toBe('endgame-coastal-tyrant');
            expect(report.preset).toBe('max-out');
            expect(report.enemy).toBe('coastal-tyrant');
            expect(report.runs).toHaveLength(3);
            expect(report.metrics.totalRuns).toBe(3);
        });

        it('should produce enhanced metrics for endgame balance', () => {
            const report = runPlaytestScenario({
                ...endgameFixture,
                runs: 5,
                maxRounds: 30,
            });

            const metrics = report.metrics;
            
            // Endgame should have some survivability
            expect(metrics.survivabilityRate).toBeGreaterThanOrEqual(0);
            
            // Distribution metrics should be present
            expect(metrics.roundsToResolveDistribution.min).toBeGreaterThan(0);
            expect(metrics.roundsToResolveDistribution.max).toBeGreaterThanOrEqual(metrics.roundsToResolveDistribution.min);
            
            // Damage ratios should be non-negative
            expect(metrics.damageRatio.playerEfficiency).toBeGreaterThanOrEqual(0);
            expect(metrics.damageRatio.enemyEfficiency).toBeGreaterThanOrEqual(0);
        });

        it('should test boss friendship mechanics', () => {
            const report = runPlaytestScenario({
                ...endgameFixture,
                runs: 6,
                maxRounds: 30,
                policies: ['friendship'],  // Focus on mercy route
            });

            // Should at least attempt friendship policy
            expect(report.policies).toContain('friendship');
            const friendshipSummary = report.metrics.policySummaries.find(s => s.policy === 'friendship');
            expect(friendshipSummary).toBeDefined();
            expect(friendshipSummary!.runs).toBe(6);
        });

        it('should test mercy policy with HP gate traces (Phase 101)', () => {
            const report = runPlaytestScenario({
                ...endgameFixture,
                runs: 5,
                maxRounds: 30,
                policies: ['mercy'],  // Test the new mercy policy
                seed: 'test-mercy-policy',
            });

            // Should execute mercy policy
            expect(report.policies).toContain('mercy');
            const mercySummary = report.metrics.policySummaries.find(s => s.policy === 'mercy');
            expect(mercySummary).toBeDefined();
            expect(mercySummary!.runs).toBe(5);

            // Should have HP gate traces for mercy runs
            const mercyRuns = report.runs.filter(run => run.policy === 'mercy');
            expect(mercyRuns).toHaveLength(5);
            
            // All mercy runs should have HP gate traces
            mercyRuns.forEach(run => {
                expect(run.hpGateTrace).toBeDefined();
                expect(run.hpGateTrace!.hpThreshold).toBe(0.4); // Coastal Tyrant's HP gate
                expect(run.hpGateTrace!.finalEnemyHpPct).toBeGreaterThanOrEqual(0);
                expect(run.hpGateTrace!.finalEnemyHpPct).toBeLessThanOrEqual(1);
            });

            // Should produce a report with HP gate analysis
            const reportMarkdown = renderPlaytestMarkdown(report);
            expect(reportMarkdown).toContain('HP Gate Analysis (Mercy Policy)');
        });
    });

    describe('Statistical metrics', () => {
        it('should handle edge case with minimal runs', () => {
            // This tests the calculateDistribution function with minimal input
            const report = runPlaytestScenario({
                ...earlyGameFixture,
                runs: 1,
                maxRounds: 5,
            });

            expect(report.metrics.totalRuns).toBe(1);
            expect(report.metrics.roundsToResolveDistribution.min).toBeGreaterThanOrEqual(0);
            expect(report.metrics.roundsToResolveDistribution.max).toBeGreaterThanOrEqual(report.metrics.roundsToResolveDistribution.min);
            expect(report.metrics.roundsToResolveDistribution.stdDev).toBeGreaterThanOrEqual(0);
        });

        it('should calculate percentiles correctly for small sample', () => {
            const report = runPlaytestScenario({
                ...earlyGameFixture,
                runs: 4,
                maxRounds: 10,
                seed: 'test-percentiles',
            });

            const dist = report.metrics.roundsToResolveDistribution;
            expect(dist.q25).toBeGreaterThanOrEqual(dist.min);
            expect(dist.q75).toBeLessThanOrEqual(dist.max);
            expect(dist.q75).toBeGreaterThanOrEqual(dist.q25);
        });
    });
});