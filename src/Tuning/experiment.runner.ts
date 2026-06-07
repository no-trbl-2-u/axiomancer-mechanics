/**
 * A/B experiment runner.
 *
 * Given a candidate numeric change, measures matrix health BEFORE the change
 * (variant A), applies the change to disk, measures health AFTER (variant B),
 * and keeps the change only if B is healthier, is not a regression, and passes
 * the verify gate. Otherwise the file is restored byte-for-byte.
 *
 * Dependencies are injected so the runner is hermetically unit-testable: tests
 * supply in-memory matrix/apply/verify stubs; the CLI wires real ones (matrix
 * runs in child processes so an edited constant is reloaded from disk).
 */

import { getTunable, clampCandidate } from './tunable.registry';
import { compareHealth } from './health.metrics';
import type {
    Candidate,
    ExperimentResult,
    HealthComparison,
    HealthScore,
    MatrixPlan,
} from './types';
import type { ApplyResult, SourceBackup } from './tunable.applier';

/** A non-decision comparison (no-op / propose-only / apply-failed paths). */
function inertComparison(note: string): HealthComparison {
    return {
        winner: 'A', delta: 0, significant: false, confidence: 'low',
        regression: false, engagementRegression: false,
        stats: { meanDelta: 0, stdErr: 0, n: 0, ciMargin: 0 }, note,
    };
}

export interface ExperimentDeps {
    /** Score matrix health against the CURRENT on-disk source (post-edit). */
    runVariant: (plan: MatrixPlan) => HealthScore;
    /** Read the tunable's current value. */
    read: (paramId: string) => number;
    /** Apply (clamped) a value, writing the file; returns a backup. */
    apply: (paramId: string, value: number) => ApplyResult;
    /** Restore a file from backup. */
    restore: (backup: SourceBackup) => void;
    /** Run the verify gate; returns whether it passed. */
    verify: () => boolean;
}

/**
 * Run one A/B experiment for a candidate. `variantA` is the current-disk health
 * (the caller's running baseline), so only the post-edit variant B is measured.
 * `kept` is true only when variant B won, was not a regression, and verify
 * passed (the edit then remains on disk for the caller to commit).
 */
export function runExperiment(
    plan: MatrixPlan,
    candidate: Candidate,
    variantA: HealthScore,
    deps: ExperimentDeps,
): ExperimentResult {
    const notes: string[] = [];
    const param = getTunable(candidate.paramId);

    // Not in the registry ⇒ propose-only; the runner cannot touch it.
    if (!param) {
        notes.push('Candidate is not a registered tunable; propose-only.');
        return {
            candidate, paramId: candidate.paramId, oldValue: NaN, newValue: NaN,
            variantA, variantB: variantA,
            comparison: inertComparison('propose-only'),
            kept: false, verifyPassed: false, notes,
        };
    }

    const oldValue = deps.read(candidate.paramId);
    const clamped = clampCandidate(param, candidate.proposedValue, oldValue);
    if (clamped === oldValue) {
        notes.push(`Clamped value equals current (${oldValue}); no-op.`);
        return {
            candidate, paramId: candidate.paramId, oldValue, newValue: oldValue,
            variantA, variantB: variantA,
            comparison: inertComparison('no-op after clamp'),
            kept: false, verifyPassed: false, notes,
        };
    }

    // Apply to disk, then measure variant B.
    const applied = deps.apply(candidate.paramId, candidate.proposedValue);
    if (!applied.ok || !applied.backup) {
        notes.push(`Apply rejected: ${applied.reason ?? 'unknown'}.`);
        return {
            candidate, paramId: candidate.paramId, oldValue, newValue: oldValue,
            variantA, variantB: variantA,
            comparison: inertComparison('apply failed'),
            kept: false, verifyPassed: false, notes,
        };
    }

    const variantB = deps.runVariant(plan);
    const comparison = compareHealth(variantA, variantB);

    const base = {
        candidate,
        paramId: candidate.paramId,
        oldValue: applied.oldValue,
        newValue: applied.newValue,
        variantA, variantB, comparison,
        diff: applied.diff,
    };

    if (comparison.winner !== 'B') {
        deps.restore(applied.backup);
        notes.push(comparison.note, 'Reverted to baseline.');
        return { ...base, kept: false, verifyPassed: false, notes };
    }

    // B won — gate on verify before keeping.
    const verifyPassed = deps.verify();
    if (!verifyPassed) {
        deps.restore(applied.backup);
        notes.push('Variant B won but verify failed; reverted.');
        return { ...base, kept: false, verifyPassed: false, notes };
    }

    notes.push(comparison.note, 'Verify passed; change kept.');
    return { ...base, kept: true, verifyPassed: true, notes };
}
