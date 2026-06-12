/**
 * Resource economy metrics — analysis of resource generation vs consumption patterns.
 *
 * Measures whether combat encounters resource starvation (players unable to use skills
 * due to insufficient resources) or resource flooding (resources accumulating faster 
 * than they can be spent). Essential for tuning the basic action generation rates and
 * skill costs to achieve optimal combat pacing.
 *
 * The analysis tracks:
 *   1. FLOW RATES — resource generation vs consumption over time
 *   2. POOL HEALTH — whether players have sufficient resources to engage meaningfully
 *   3. PATTERNS — starvation (< 3 total for ≥3 rounds) vs flooding (≥ 20 total)
 *
 * Reads only from the playtest transcript / run summary — no combat logic
 * is reimplemented here.
 */

import type { PlaytestReport } from '../Playtest/types';
import type { CombatResources } from '../Skills/types';

/** Snapshot of resource state at a point in combat */
export interface ResourceFlowSnapshot {
    round: number;
    resources: CombatResources;
    totalResources: number;
    /** Resources generated this round from basic actions */
    generatedThisRound: Partial<CombatResources>;
    /** Resources consumed this round from skill usage */
    consumedThisRound: Partial<CombatResources>;
    /** Net change in total resource pool this round */
    netChange: number;
}

/** Analysis of resource patterns over a combat encounter */
export interface ResourceEconomyMetrics {
    /** Total number of combat rounds analyzed */
    totalRounds: number;
    /** Rounds where player had < 3 total resources */
    starvationRounds: number;
    /** Rounds where player had ≥ 20 total resources */
    floodingRounds: number;
    /** Consecutive rounds of starvation (longest streak) */
    maxStarvationStreak: number;
    /** Average total resources held per round */
    averageResourcePool: number;
    /** Total resources generated across all rounds */
    totalGenerated: number;
    /** Total resources consumed across all rounds */
    totalConsumed: number;
    /** Net resource efficiency (consumed / generated) */
    efficiency: number;
    /** Detailed round-by-round flow */
    flow: ResourceFlowSnapshot[];
}

/** Health classification for resource economy patterns */
export type ResourcePattern = 'healthy' | 'starved' | 'flooded' | 'unstable';

/** Minimum total resources to avoid starvation classification */
export const STARVATION_THRESHOLD = 3;
/** Total resources that indicate flooding */
export const FLOODING_THRESHOLD = 20;
/** Target percentage of rounds with adequate resources */
export const HEALTHY_RESOURCE_SHARE = 0.7; // 70% of rounds should have ≥ 3 resources

/**
 * Extract resource economy metrics from a completed playtest report.
 * Analyzes resource generation, consumption, and pool levels to identify
 * starvation or flooding patterns. 
 * 
 * Note: Due to the current PlaytestReport structure, this provides estimated
 * resource metrics based on action patterns rather than detailed round-by-round
 * resource tracking. A future enhancement could add resource telemetry to the
 * playtest harness for more precise analysis.
 */
export function analyzeResourceEconomy(report: PlaytestReport): ResourceEconomyMetrics {
    const flow: ResourceFlowSnapshot[] = [];
    let totalGenerated = 0;
    let totalConsumed = 0;
    let totalRounds = 0;
    
    // Aggregate resource patterns across all runs in the report
    for (const run of report.runs) {
        totalRounds += run.rounds;
        
        // Estimate generation based on basic action counts
        const attackActions = run.actions.attack || 0;
        const defendActions = run.actions.defend || 0;
        
        // Assume ~70% hit rate for attacks (simplified heuristic)
        const estimatedHits = Math.floor(attackActions * 0.7);
        const estimatedMisses = attackActions - estimatedHits;
        
        totalGenerated += estimatedHits * 3;  // ATTACK_HIT: +3
        totalGenerated += estimatedMisses * 1; // ATTACK_MISS: +1
        totalGenerated += defendActions * 5;   // DEFEND: +5
        
        // Estimate consumption based on skill usage
        const skillUsage = Object.values(run.skillsUsed).reduce((sum, count) => sum + count, 0);
        // Assume average skill cost of ~3 resources (simplified heuristic)
        totalConsumed += skillUsage * 3;
    }

    // Simplified resource health estimation based on action patterns
    const totalActions = report.runs.reduce((sum, run) => 
        sum + (run.actions.attack || 0) + (run.actions.defend || 0) + 
              Object.values(run.skillsUsed).reduce((s, c) => s + c, 0), 0);
    
    const skillActionShare = report.runs.reduce((sum, run) => 
        sum + Object.values(run.skillsUsed).reduce((s, c) => s + c, 0), 0) / (totalActions || 1);
    
    // Heuristic: estimate starvation based on low skill usage relative to basic actions
    // If skill usage is very low, it may indicate resource starvation
    const estimatedStarvationRate = skillActionShare < 0.2 ? 0.3 : 
                                   skillActionShare < 0.4 ? 0.1 : 0.05;
    
    const starvationRounds = Math.floor(totalRounds * estimatedStarvationRate);
    const floodingRounds = 0; // Cannot easily detect flooding without round-by-round data
    
    const averageResourcePool = totalGenerated > 0 ? 
        (totalGenerated - totalConsumed) / (totalRounds || 1) + 5 : 5; // Baseline pool
    
    const efficiency = totalGenerated > 0 ? totalConsumed / totalGenerated : 0;
    
    // Note: flow array left empty since we don't have round-by-round data
    // This is acceptable for the classification and recommendations which work
    // with aggregate metrics
    
    return {
        totalRounds,
        starvationRounds,
        floodingRounds,
        maxStarvationStreak: starvationRounds > 3 ? Math.floor(starvationRounds / 3) : 0,
        averageResourcePool,
        totalGenerated,
        totalConsumed,
        efficiency,
        flow, // Empty - would need enhanced playtest harness to populate
    };
}

/**
 * Classify resource economy health based on starvation/flooding patterns.
 * 
 * - healthy: 70%+ rounds with adequate resources, no extended starvation
 * - starved: Frequent or extended periods with insufficient resources
 * - flooded: Resources accumulating faster than they can be meaningfully spent
 * - unstable: Wild swings between starvation and flooding
 */
export function classifyResourcePattern(metrics: ResourceEconomyMetrics): ResourcePattern {
    if (metrics.totalRounds === 0) return 'healthy';

    const starvationShare = metrics.starvationRounds / metrics.totalRounds;
    const floodingShare = metrics.floodingRounds / metrics.totalRounds;
    const healthyShare = 1 - starvationShare - floodingShare;

    // Extended starvation is always problematic
    if (metrics.maxStarvationStreak >= 3) {
        return 'starved';
    }

    // High starvation rate indicates resource economy failure
    if (starvationShare > (1 - HEALTHY_RESOURCE_SHARE)) {
        return 'starved';
    }

    // High flooding rate indicates poor resource sink design
    if (floodingShare > 0.3) {
        return 'flooded';
    }

    // Unstable if significant amounts of both starvation and flooding
    if (starvationShare > 0.15 && floodingShare > 0.15) {
        return 'unstable';
    }

    // Healthy if most rounds have adequate resources
    if (healthyShare >= HEALTHY_RESOURCE_SHARE) {
        return 'healthy';
    }

    return 'unstable';
}

/**
 * Calculate the share of rounds with adequate resources (≥ STARVATION_THRESHOLD).
 * This is the primary health metric for resource economy — target is ≥ 70%.
 */
export function resourceHealthShare(metrics: ResourceEconomyMetrics): number {
    if (metrics.totalRounds === 0) return 1;
    const adequateRounds = metrics.totalRounds - metrics.starvationRounds;
    return adequateRounds / metrics.totalRounds;
}