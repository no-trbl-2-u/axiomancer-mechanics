/**
 * Health scoring — collapses a matrix of per-cell playtest reports into a
 * single "how balanced is the game right now" objective, and compares two such
 * scores for the A/B experiment.
 *
 * The objective has TWO terms, not one:
 *   1. Band deviation — distance from each cell's difficulty-specific success
 *      band (easy/normal/hard target different rates; see difficulty.bands).
 *   2. Engagement shortfall — distance BELOW the status-effect engagement floor.
 *      This is the doctrine made mathematical: per VISION, status effects are
 *      the main fun, so a change that holds win rates but collapses combat into
 *      basic-attack trades must score WORSE, not equal. Before this, the
 *      optimiser literally could not see engagement.
 *
 * The A/B comparison is a paired test across cells (each cell is one matched
 * sample under A and B), so "significant" means the improvement clears the
 * noise floor — not just that a single-sample delta beat a magic epsilon.
 */

import type {
    CellHealth, CellResult, Confidence, HealthComparison, HealthScore, WitnessMetric,
} from './types';
import { bandFor, bandDeviation, NORMAL_BAND } from './difficulty.bands';
import { cellEngagementShare, cellActivityShare } from './engagement.metrics';

/** Minimum status-effect engagement share before the objective is penalised. */
export const ENGAGEMENT_FLOOR = 0.35;
/** Relative weight of the engagement term vs. the band term in the objective. */
export const BAND_WEIGHT = 1;
export const ENGAGEMENT_WEIGHT = 1.5;
/** A variant is a regression if it worsens the worst-cell defeat rate by this. */
const DEFEAT_REGRESSION_DELTA = 0.1;
/** ...or if it drops mean status-effect engagement (leverage) share by this. */
const ENGAGEMENT_REGRESSION_DELTA = 0.08;
/**
 * ...or if it drops the witness edge (strategist resolution − aggressive
 * resolution) by this, i.e. basic-attack play gained on status play. The
 * doctrine's "basic attacks must not out-attract status play" as a guard.
 */
export const WITNESS_REGRESSION_DELTA = 0.08;
/** Fallback noise floor on the aggregate delta when n<2 (can't compute a CI). */
const SIGNIFICANCE_EPSILON = 0.005;

function engagementShortfall(share: number | undefined): number {
    if (typeof share !== 'number') return 0; // unknown ⇒ no penalty
    return share < ENGAGEMENT_FLOOR ? (ENGAGEMENT_FLOOR - share) ** 2 : 0;
}

export function scoreHealth(cells: CellResult[]): HealthScore {
    const perCell: CellHealth[] = cells.map(({ cell, report }) => {
        const band = bandFor(cell.difficulty);
        const rate = report.metrics.resolutionSuccessRate;
        const bandDev = bandDeviation(rate, band);
        const engagementShare = cellEngagementShare(report);
        const activityShare = cellActivityShare(report);
        const engagementDeviation = engagementShortfall(engagementShare);
        const deviation = BAND_WEIGHT * bandDev + ENGAGEMENT_WEIGHT * engagementDeviation;
        return {
            cellId: cell.cellId,
            level: cell.level,
            playstyle: cell.playstyle,
            difficulty: cell.difficulty,
            weight: cell.weight,
            resolutionSuccessRate: rate,
            defeatRate: report.metrics.defeatRate,
            band,
            bandDeviation: bandDev,
            engagementShare,
            activityShare,
            engagementDeviation,
            deviation,
        };
    });

    const totalWeight = cells.reduce((sum, c) => sum + c.cell.weight, 0) || 1;
    const weighted = (pick: (c: CellHealth) => number): number =>
        perCell.reduce((sum, c) => sum + pick(c) * c.weight, 0) / totalWeight;

    const aggregate = weighted(c => c.deviation);
    const aggregateBand = weighted(c => BAND_WEIGHT * c.bandDeviation);
    const aggregateEngagement = weighted(c => ENGAGEMENT_WEIGHT * c.engagementDeviation);

    // Mean leverage/activity over cells that actually measured them (default
    // 1 ⇒ no shortfall when nothing was measurable, so synthetic reports don't
    // lie). Weighted by cell weight, like the aggregate.
    const weightedShare = (pick: (c: CellHealth) => number | undefined): number => {
        const m = perCell.filter(c => typeof pick(c) === 'number');
        if (!m.length) return 1;
        const w = m.reduce((s, c) => s + c.weight, 0) || 1;
        return m.reduce((s, c) => s + (pick(c) ?? 0) * c.weight, 0) / w;
    };
    const measured = perCell.filter(c => typeof c.engagementShare === 'number');
    const meanEngagement = weightedShare(c => c.engagementShare);
    const meanActivity = weightedShare(c => c.activityShare);
    const witness = computeWitness(perCell);

    const maxDefeatRate = perCell.reduce((max, c) => Math.max(max, c.defeatRate), 0);
    const inBand = perCell.filter(c => c.bandDeviation === 0).length;
    const lowEng = measured.filter(c => (c.engagementShare ?? 1) < ENGAGEMENT_FLOOR).length;

    const witnessSummary = witness
        ? `; witness edge ${(witness.strategistEdge * 100).toFixed(0)}% `
            + `(strat ${(witness.strategistResolution * 100).toFixed(0)}% vs aggr ${(witness.aggressiveResolution * 100).toFixed(0)}%)`
        : '';

    return {
        perCell,
        aggregate,
        aggregateBand,
        aggregateEngagement,
        meanEngagement,
        meanActivity,
        witness,
        targetBand: NORMAL_BAND,
        engagementFloor: ENGAGEMENT_FLOOR,
        maxDefeatRate,
        summary:
            `${inBand}/${perCell.length} cells in band; aggregate ${aggregate.toFixed(4)} `
            + `(band ${aggregateBand.toFixed(4)} + engage ${aggregateEngagement.toFixed(4)}); `
            + `mean leverage ${(meanEngagement * 100).toFixed(0)}% / activity ${(meanActivity * 100).toFixed(0)}%`
            + (measured.length ? ` (${lowEng}/${measured.length} cells below floor)` : '')
            + witnessSummary
            + `; worst defeat ${(maxDefeatRate * 100).toFixed(0)}%`,
    };
}

/**
 * The witness comparison: across the matrix, does the status-first STRATEGIST
 * resolve fights at least as well as the basic-attack AGGRESSIVE? Returns
 * undefined unless BOTH playstyles ran (so it's inert for synthetic/partial
 * matrices). Resolution is weighted by cell weight, matching the aggregate.
 */
function computeWitness(perCell: CellHealth[]): WitnessMetric | undefined {
    const meanResolution = (playstyle: string): number | undefined => {
        const cells = perCell.filter(c => c.playstyle === playstyle);
        if (!cells.length) return undefined;
        const w = cells.reduce((s, c) => s + c.weight, 0) || 1;
        return cells.reduce((s, c) => s + c.resolutionSuccessRate * c.weight, 0) / w;
    };
    const strat = meanResolution('strategist');
    const aggr = meanResolution('aggressive');
    if (typeof strat !== 'number' || typeof aggr !== 'number') return undefined;
    const stratCells = perCell.filter(c => c.playstyle === 'strategist').length;
    const aggrCells = perCell.filter(c => c.playstyle === 'aggressive').length;
    return {
        strategistResolution: strat,
        aggressiveResolution: aggr,
        strategistEdge: strat - aggr,
        cells: stratCells + aggrCells,
    };
}

/** Two-sided 95% Student-t critical value for df degrees of freedom. */
function tCrit(df: number): number {
    const table: Record<number, number> = {
        1: 12.71, 2: 4.30, 3: 3.18, 4: 2.78, 5: 2.57, 6: 2.45, 7: 2.36,
        8: 2.31, 9: 2.26, 10: 2.23, 12: 2.18, 15: 2.13, 20: 2.09, 30: 2.04,
    };
    if (df <= 0) return Infinity;
    if (table[df]) return table[df]!;
    const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
    for (const k of keys) if (df < k) return table[k]!;
    return 1.96;
}

/** Paired per-cell improvement deltas (A.deviation − B.deviation), B-better>0. */
function pairedDeltas(a: HealthScore, b: HealthScore): number[] {
    const bById = new Map(b.perCell.map(c => [c.cellId, c]));
    const deltas: number[] = [];
    for (const ca of a.perCell) {
        const cb = bById.get(ca.cellId);
        if (cb) deltas.push(ca.deviation - cb.deviation);
    }
    return deltas;
}

function classify(meanDelta: number, ciMargin: number, n: number, significant: boolean): Confidence {
    if (!significant || n < 3) return 'low';
    if (n >= 8 && ciMargin <= 0.5 * Math.abs(meanDelta)) return 'high';
    return 'medium';
}

/**
 * Compare baseline (A) vs candidate (B). B wins only if it is healthier AND the
 * paired-cell improvement is statistically significant. A change that spikes
 * worst-cell defeat OR collapses status-effect engagement is rejected as a
 * regression even when its aggregate improved — don't buy a balanced number by
 * killing the fun.
 */
export function compareHealth(a: HealthScore, b: HealthScore): HealthComparison {
    const delta = a.aggregate - b.aggregate; // >0 ⇒ B healthier

    const deltas = pairedDeltas(a, b);
    const n = deltas.length;
    const meanDelta = n ? deltas.reduce((s, d) => s + d, 0) / n : delta;
    let stdErr = 0;
    let ciMargin = SIGNIFICANCE_EPSILON;
    let significant: boolean;
    if (n >= 2) {
        const variance = deltas.reduce((s, d) => s + (d - meanDelta) ** 2, 0) / (n - 1);
        stdErr = Math.sqrt(variance / n);
        ciMargin = tCrit(n - 1) * stdErr;
        significant = meanDelta - ciMargin > 0; // 95% CI for improvement excludes 0
    } else {
        // Single cell / no pairing: fall back to the aggregate noise floor.
        significant = Math.abs(delta) > SIGNIFICANCE_EPSILON;
    }
    const stats = { meanDelta, stdErr, n, ciMargin };

    const regression = b.maxDefeatRate > a.maxDefeatRate + DEFEAT_REGRESSION_DELTA;
    const engagementRegression =
        a.meanEngagement - b.meanEngagement > ENGAGEMENT_REGRESSION_DELTA;
    // Witness guard: only when BOTH scores measured the strategist-vs-aggressive
    // edge. A drop means basic-attack play gained on status play — reject it.
    const witnessRegression = !!a.witness && !!b.witness
        && a.witness.strategistEdge - b.witness.strategistEdge > WITNESS_REGRESSION_DELTA;
    const confidence = classify(meanDelta, ciMargin, n, significant);

    if (regression) {
        return {
            winner: 'A', delta, significant, confidence, regression: true,
            engagementRegression, witnessRegression, stats,
            note: `Candidate rejected: worst-cell defeat rose ${(a.maxDefeatRate * 100).toFixed(0)}% → ${(b.maxDefeatRate * 100).toFixed(0)}%.`,
        };
    }
    if (engagementRegression) {
        return {
            winner: 'A', delta, significant, confidence, regression: false,
            engagementRegression: true, witnessRegression, stats,
            note: `Candidate rejected: status-effect leverage fell ${(a.meanEngagement * 100).toFixed(0)}% → ${(b.meanEngagement * 100).toFixed(0)}% (basic-attack collapse).`,
        };
    }
    if (witnessRegression) {
        return {
            winner: 'A', delta, significant, confidence, regression: false,
            engagementRegression: false, witnessRegression: true, stats,
            note: `Candidate rejected: witness edge fell ${((a.witness!.strategistEdge) * 100).toFixed(0)}% → ${((b.witness!.strategistEdge) * 100).toFixed(0)}% (basic attacks gained on status play).`,
        };
    }
    if (delta > 0 && significant) {
        return {
            winner: 'B', delta, significant, confidence, regression: false,
            engagementRegression: false, witnessRegression: false, stats,
            note: `Candidate improves aggregate by ${delta.toFixed(4)} (${confidence} confidence, n=${n}).`,
        };
    }
    return {
        winner: 'A', delta, significant: false, confidence, regression: false,
        engagementRegression: false, witnessRegression: false, stats,
        note: n >= 2 && delta > 0
            ? `Improvement ${delta.toFixed(4)} not significant (CI margin ${ciMargin.toFixed(4)}, n=${n}); keeping baseline.`
            : delta > 0
                ? 'Improvement below the noise floor; keeping baseline.'
                : 'Baseline healthier; keeping baseline.',
    };
}
