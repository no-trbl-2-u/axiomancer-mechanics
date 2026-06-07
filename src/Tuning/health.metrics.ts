/**
 * Health scoring — collapses a matrix of per-cell playtest reports into a
 * single "how balanced is the game right now" number, and compares two such
 * scores for the A/B experiment.
 *
 * The target band (65–75% resolution success) matches the existing harness's
 * `deriveFindings` notion of balanced, so the tuner optimises toward the same
 * goal the human-facing findings already flag.
 */

import type { CellResult, CellHealth, HealthScore, HealthComparison } from './types';

const TARGET_LOW = 0.65;
const TARGET_HIGH = 0.75;
/** A variant is a regression if it worsens the worst-cell defeat rate by this. */
const DEFEAT_REGRESSION_DELTA = 0.1;
/** Aggregate delta below which the A/B result is treated as noise. */
const SIGNIFICANCE_EPSILON = 0.005;

function bandDeviation(rate: number): number {
    if (rate < TARGET_LOW) return (TARGET_LOW - rate) ** 2;
    if (rate > TARGET_HIGH) return (rate - TARGET_HIGH) ** 2;
    return 0;
}

export function scoreHealth(cells: CellResult[]): HealthScore {
    const perCell: CellHealth[] = cells.map(({ cell, report }) => ({
        cellId: cell.cellId,
        resolutionSuccessRate: report.metrics.resolutionSuccessRate,
        defeatRate: report.metrics.defeatRate,
        deviation: bandDeviation(report.metrics.resolutionSuccessRate),
    }));

    const totalWeight = cells.reduce((sum, c) => sum + c.cell.weight, 0) || 1;
    const aggregate = cells.reduce(
        (sum, c, i) => sum + perCell[i]!.deviation * c.cell.weight,
        0,
    ) / totalWeight;

    const maxDefeatRate = perCell.reduce((max, c) => Math.max(max, c.defeatRate), 0);
    const inBand = perCell.filter(c => c.deviation === 0).length;

    return {
        perCell,
        aggregate,
        targetBand: { low: TARGET_LOW, high: TARGET_HIGH },
        maxDefeatRate,
        summary: `${inBand}/${perCell.length} cells in band; aggregate deviation ${aggregate.toFixed(4)}, worst defeat ${(maxDefeatRate * 100).toFixed(0)}%`,
    };
}

/**
 * Compare baseline (A) vs candidate (B). Lower aggregate wins. A candidate that
 * meaningfully spikes the worst-cell defeat rate is rejected as a regression
 * even if its aggregate improved (don't fix one cell by breaking another).
 */
export function compareHealth(a: HealthScore, b: HealthScore): HealthComparison {
    const delta = a.aggregate - b.aggregate; // >0 ⇒ B healthier
    const regression = b.maxDefeatRate > a.maxDefeatRate + DEFEAT_REGRESSION_DELTA;
    const significant = Math.abs(delta) > SIGNIFICANCE_EPSILON;

    if (regression) {
        return {
            winner: 'A', delta, significant, regression: true,
            note: `Candidate rejected: worst-cell defeat rose ${(a.maxDefeatRate * 100).toFixed(0)}% → ${(b.maxDefeatRate * 100).toFixed(0)}%.`,
        };
    }
    if (delta > SIGNIFICANCE_EPSILON) {
        return {
            winner: 'B', delta, significant, regression: false,
            note: `Candidate improves aggregate deviation by ${delta.toFixed(4)}.`,
        };
    }
    return {
        winner: 'A', delta, significant, regression: false,
        note: significant
            ? `Baseline healthier by ${(-delta).toFixed(4)}.`
            : 'No significant difference; keeping baseline.',
    };
}
