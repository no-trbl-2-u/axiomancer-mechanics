/**
 * Resource Economy Tuning Recommendations
 * 
 * Analyzes resource flow patterns and proposes tuning adjustments for optimal
 * combat pacing. This is an analysis-only module that suggests changes but
 * does not automatically apply them - recommendations must be manually reviewed
 * and implemented.
 */

import type { ResourceEconomyMetrics, ResourcePattern } from './resource.metrics';
import type { ResourceCost } from '../Skills/types';

/** Proposed adjustment to resource generation constants */
export interface GenerationTuningProposal {
    /** Current RESOURCE_GENERATION constants */
    current: {
        ATTACK_HIT: number;
        ATTACK_MISS: number; 
        DEFEND: number;
    };
    /** Proposed new values */
    proposed: {
        ATTACK_HIT: number;
        ATTACK_MISS: number;
        DEFEND: number;
    };
    /** Justification for the change */
    rationale: string;
}

/** Proposed adjustment to specific skill costs */
export interface SkillCostTuningProposal {
    /** Skill ID to adjust */
    skillId: string;
    /** Current resource cost */
    currentCost: ResourceCost;
    /** Proposed new cost */
    proposedCost: ResourceCost;
    /** Reason for the adjustment */
    rationale: string;
}

/** Complete resource economy tuning recommendation */
export interface ResourceTuningProposal {
    /** Overall assessment of resource economy health */
    assessment: ResourcePattern;
    /** Severity of tuning need (0-1, where 1 is critical) */
    severity: number;
    /** Proposed generation rate adjustments */
    generationAdjustments?: GenerationTuningProposal;
    /** Proposed skill cost adjustments */
    skillCostAdjustments?: SkillCostTuningProposal[];
    /** Summary of recommended changes */
    summary: string;
    /** Supporting evidence from metrics */
    evidence: {
        starvationRate: number;
        floodingRate: number;
        avgResourcePool: number;
        efficiency: number;
        healthShare: number;
    };
}

/**
 * Analyze resource economy metrics and generate tuning recommendations.
 * Returns concrete proposals for generation rates and skill costs based on
 * identified starvation or flooding patterns.
 */
export function generateResourceTuningRecommendations(
    metrics: ResourceEconomyMetrics,
    pattern: ResourcePattern,
    skillCosts: Map<string, ResourceCost> = new Map(),
): ResourceTuningProposal {
    const starvationRate = metrics.totalRounds > 0 ? metrics.starvationRounds / metrics.totalRounds : 0;
    const floodingRate = metrics.totalRounds > 0 ? metrics.floodingRounds / metrics.totalRounds : 0;
    const efficiency = metrics.efficiency;
    const healthShare = metrics.totalRounds > 0 ? 
        (metrics.totalRounds - metrics.starvationRounds) / metrics.totalRounds : 1;

    const evidence = {
        starvationRate,
        floodingRate,
        avgResourcePool: metrics.averageResourcePool,
        efficiency,
        healthShare,
    };

    let severity = 0;
    let generationAdjustments: GenerationTuningProposal | undefined;
    let skillCostAdjustments: SkillCostTuningProposal[] = [];
    let summary = '';

    switch (pattern) {
        case 'starved':
            severity = calculateStarvationSeverity(starvationRate, metrics.maxStarvationStreak);
            
            if (efficiency > 0.8) {
                // High consumption relative to generation - increase generation rates
                generationAdjustments = {
                    current: { ATTACK_HIT: 3, ATTACK_MISS: 1, DEFEND: 5 },
                    proposed: {
                        ATTACK_HIT: starvationRate > 0.5 ? 4 : 3,
                        ATTACK_MISS: starvationRate > 0.5 ? 2 : 1, 
                        DEFEND: 6,
                    },
                    rationale: `High starvation rate (${(starvationRate * 100).toFixed(1)}%) with ` +
                              `efficiency ${(efficiency * 100).toFixed(1)}% suggests insufficient generation rates.`,
                };
            } else {
                // Low efficiency - skills may be too expensive
                skillCostAdjustments = generateCostReductionProposals(skillCosts);
            }

            summary = `Resource starvation detected (${(starvationRate * 100).toFixed(1)}% of rounds). ` +
                     `Max starvation streak: ${metrics.maxStarvationStreak} rounds. ` +
                     `Recommend ${generationAdjustments ? 'increasing generation rates' : 'reducing skill costs'}.`;
            break;

        case 'flooded':
            severity = Math.min(floodingRate, 0.8); // Cap severity for flooding
            
            if (efficiency < 0.3) {
                // Very low consumption - skills may be too expensive or not attractive
                skillCostAdjustments = generateCostReductionProposals(skillCosts);
                summary = `Resource flooding detected (${(floodingRate * 100).toFixed(1)}% of rounds). ` +
                         `Low efficiency (${(efficiency * 100).toFixed(1)}%) suggests skills are underused. ` +
                         `Recommend reducing skill costs to encourage more skill usage.`;
            } else {
                // Reasonable consumption but still flooding - reduce generation
                generationAdjustments = {
                    current: { ATTACK_HIT: 3, ATTACK_MISS: 1, DEFEND: 5 },
                    proposed: {
                        ATTACK_HIT: 2,
                        ATTACK_MISS: 1,
                        DEFEND: 4,
                    },
                    rationale: `Resource flooding (${(floodingRate * 100).toFixed(1)}% of rounds) ` +
                              `with moderate efficiency suggests excessive generation rates.`,
                };
                summary = `Resource flooding detected. Recommend reducing generation rates ` +
                         `to create more meaningful resource management decisions.`;
            }
            break;

        case 'unstable':
            severity = Math.max(starvationRate, floodingRate * 0.5); // Bias toward starvation issues
            
            summary = `Unstable resource patterns detected (${(starvationRate * 100).toFixed(1)}% starvation, ` +
                     `${(floodingRate * 100).toFixed(1)}% flooding). Review both generation rates and skill costs ` +
                     `for more consistent resource flow.`;
            
            // For unstable patterns, suggest moderate adjustments to both systems
            if (starvationRate > floodingRate) {
                generationAdjustments = {
                    current: { ATTACK_HIT: 3, ATTACK_MISS: 1, DEFEND: 5 },
                    proposed: { ATTACK_HIT: 3, ATTACK_MISS: 2, DEFEND: 5 },
                    rationale: 'Moderate generation increase to reduce starvation volatility.',
                };
            }
            break;

        case 'healthy':
            severity = 0;
            summary = `Resource economy appears healthy (${(healthShare * 100).toFixed(1)}% adequate rounds). ` +
                     `Current generation rates and skill costs are well-balanced.`;
            break;
    }

    return {
        assessment: pattern,
        severity,
        generationAdjustments,
        skillCostAdjustments,
        summary,
        evidence,
    };
}

/**
 * Calculate severity score for resource starvation patterns.
 * Higher values indicate more urgent tuning needs.
 */
function calculateStarvationSeverity(starvationRate: number, maxStreak: number): number {
    const rateSeverity = Math.min(starvationRate * 1.5, 1); // Scale starvation rate
    const streakSeverity = Math.min(maxStreak / 5, 0.5); // Extended streaks are very bad
    return Math.min(rateSeverity + streakSeverity, 1);
}

/**
 * Generate skill cost reduction proposals for common high-cost skills.
 * This is a simplified heuristic - real implementation would analyze
 * actual usage patterns and costs from the skill library.
 */
function generateCostReductionProposals(skillCosts: Map<string, ResourceCost>): SkillCostTuningProposal[] {
    const proposals: SkillCostTuningProposal[] = [];

    // Common skills that may be too expensive (simplified heuristic)
    const candidateSkills = ['intimidate', 'appeal-to-pity', 'sunk-cost-fallacy'];

    for (const skillId of candidateSkills) {
        const currentCost = skillCosts.get(skillId);
        if (!currentCost) continue;

        // Propose reducing costs by 1 for multi-resource skills
        const totalCost = (currentCost.heart || 0) + (currentCost.body || 0) + 
                         (currentCost.mind || 0) + (currentCost.fallacy || 0) + 
                         (currentCost.paradox || 0);

        if (totalCost >= 3) {
            const proposedCost: ResourceCost = { ...currentCost };
            
            // Reduce the highest cost component by 1
            const maxKey = (Object.entries(currentCost) as [keyof ResourceCost, number | undefined][])
                .reduce((max, [key, value]) => 
                    (value || 0) > (currentCost[max] || 0) ? key : max, 'heart' as keyof ResourceCost
                );
            
            if (proposedCost[maxKey] && proposedCost[maxKey]! > 1) {
                proposedCost[maxKey] = proposedCost[maxKey]! - 1;
                
                proposals.push({
                    skillId,
                    currentCost,
                    proposedCost,
                    rationale: `High-cost skill (${totalCost} total) may be contributing to resource starvation.`,
                });
            }
        }
    }

    return proposals;
}