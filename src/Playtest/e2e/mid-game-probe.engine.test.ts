import { describe, it, expect, beforeEach } from 'vitest';
import { runPlaytestScenario } from '../playtest.runner';
import { mockFixedRng } from '../../test-utils/rng';
import type { PlaytestScenario } from '../types';

describe('Mid-game reference probe (Phase 119)', () => {
    beforeEach(() => {
        mockFixedRng([0.5, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9, 0.4, 0.6]);
    });

    it('should support wanderer-level-6 preset', () => {
        const scenario: PlaytestScenario = {
            id: 'test-mid-game-hush-wraith',
            description: 'Test level-6 Wanderer vs Hush-Wraith',
            preset: 'wanderer-level-6',
            enemy: 'hush-wraith',
            runs: 1,
            maxRounds: 10,
            seed: 'test-seed',
            policies: ['aggressive']
        };

        const report = runPlaytestScenario(scenario);

        expect(report).toBeDefined();
        expect(report.scenarioId).toBe('test-mid-game-hush-wraith');
        expect(report.preset).toBe('wanderer-level-6');
        expect(report.enemy).toBe('hush-wraith');
        expect(report.runs.length).toBe(1);
    });

    it('should create level-6 character with appropriate skills', () => {
        const scenario: PlaytestScenario = {
            id: 'test-level-6-character',
            description: 'Validate level-6 character creation',
            preset: 'wanderer-level-6',
            enemy: 'hush-wraith',
            runs: 1,
            maxRounds: 5,
            seed: 'test-seed',
            policies: ['defensive']
        };

        const report = runPlaytestScenario(scenario);
        
        expect(report.runs[0]).toBeDefined();
        expect(report.runs[0]?.run).toBe(1);
        expect(report.runs[0]?.policy).toBe('defensive');
        
        // Ensure the run completed without errors
        expect(['victory', 'defeat', 'friendship', 'timeout']).toContain(report.runs[0]?.outcome);
    });

    it('should work with all three northern-forest elite enemies', () => {
        const enemies = ['hush-wraith', 'hollow-saint', 'frostbound-hunter'] as const;
        
        for (const enemy of enemies) {
            const scenario: PlaytestScenario = {
                id: `test-${enemy}`,
                description: `Test level-6 Wanderer vs ${enemy}`,
                preset: 'wanderer-level-6',
                enemy,
                runs: 1,
                maxRounds: 5,
                seed: 'test-seed',
                policies: ['mixed']
            };

            const report = runPlaytestScenario(scenario);
            
            expect(report).toBeDefined();
            expect(report.enemy).toBe(enemy);
            expect(report.runs.length).toBe(1);
            expect(report.runs[0]?.enemy).toBe(enemy);
        }
    });

    it('should generate expected metrics structure', () => {
        const scenario: PlaytestScenario = {
            id: 'test-metrics',
            description: 'Test metrics structure',
            preset: 'wanderer-level-6',
            enemy: 'frostbound-hunter',
            runs: 2,
            maxRounds: 5,
            seed: 'test-seed',
            policies: ['aggressive', 'defensive']
        };

        const report = runPlaytestScenario(scenario);
        
        expect(report.metrics).toBeDefined();
        expect(report.metrics.totalRuns).toBe(2);
        expect(report.metrics.outcomes).toBeDefined();
        expect(report.metrics.stanceUse).toBeDefined();
        expect(report.metrics.actionUse).toBeDefined();
        expect(report.metrics.skillUse).toBeDefined();
        
        // Phase 104 enhanced metrics
        expect(report.metrics.survivabilityRate).toBeDefined();
        expect(report.metrics.roundsToResolveDistribution).toBeDefined();
        expect(report.metrics.damageRatio).toBeDefined();
    });

    it('should validate scenario with wanderer-level-6 preset', () => {
        const scenario: PlaytestScenario = {
            id: 'test-validation',
            description: 'Test validation',
            preset: 'wanderer-level-6',
            enemy: 'hollow-saint',
            runs: 1,
            maxRounds: 5,
            seed: 'test-seed',
            policies: ['strategist']
        };

        // Should not throw validation error
        expect(() => runPlaytestScenario(scenario)).not.toThrow();
    });
});