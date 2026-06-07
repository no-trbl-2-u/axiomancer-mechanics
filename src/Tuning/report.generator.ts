/**
 * Report generator — emits the TWO distinct artifacts the delivery model needs:
 *   1. Data report (facts only, no recommendations) → pushed to `main`.
 *   2. Suggestions writeup (recommended changes + why + references) → PR branch.
 */

import type { CellResult, ExperimentResult, TuningTickResult } from './types';

function pct(n: number): string {
    return `${Math.round(n * 100)}%`;
}

function round(n: number, dp = 2): string {
    return Number.isFinite(n) ? n.toFixed(dp) : 'n/a';
}

/** Aggregate cells by a key extractor into mean resolution / defeat / rounds. */
function aggregateBy(
    cells: CellResult[],
    keyOf: (c: CellResult) => string,
): { key: string; cells: number; resolution: number; defeat: number; rounds: number }[] {
    const groups = new Map<string, CellResult[]>();
    for (const c of cells) {
        const k = keyOf(c);
        (groups.get(k) ?? groups.set(k, []).get(k)!).push(c);
    }
    return [...groups.entries()].map(([key, group]) => ({
        key,
        cells: group.length,
        resolution: avg(group.map(g => g.report.metrics.resolutionSuccessRate)),
        defeat: avg(group.map(g => g.report.metrics.defeatRate)),
        rounds: avg(group.map(g => g.report.metrics.averageRounds)),
    })).sort((a, b) => a.key.localeCompare(b.key));
}

function avg(xs: number[]): number {
    return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

function table(
    header: string,
    rows: { key: string; cells: number; resolution: number; defeat: number; rounds: number }[],
): string {
    const lines = [
        `### ${header}`,
        '',
        '| Group | Cells | Resolution | Defeat | Avg rounds |',
        '| --- | --- | --- | --- | --- |',
        ...rows.map(r => `| ${r.key} | ${r.cells} | ${pct(r.resolution)} | ${pct(r.defeat)} | ${round(r.rounds, 1)} |`),
    ];
    return lines.join('\n');
}

function focusLine(tick: TuningTickResult): string {
    const f = tick.focus;
    if (!f.raw) return '_none (full matrix)_';
    const parts: string[] = [`"${f.raw}"`];
    if (f.categories?.length) parts.push(`categories=${f.categories.join(',')}`);
    if (f.levelBands?.length) parts.push(`bands=${f.levelBands.join(',')}`);
    if (f.addedAfter) parts.push(`since=${f.addedAfter}`);
    return parts.join(' · ');
}

/** Data report — aggregate facts only. No recommendations. Pushed to `main`. */
export function renderDataReport(tick: TuningTickResult): string {
    const cells = tick.baselineCells;
    const lines: string[] = [
        `# Tuning data report — ${tick.timestamp}`,
        '',
        `**Focus:** ${focusLine(tick)}`,
        `**Cells:** ${cells.length} · **Total runs:** ${cells.reduce((s, c) => s + c.cell.runs, 0)}`,
        `**Baseline health:** ${tick.baseline.summary}`,
        '',
        '## Aggregate summaries',
        '',
        table('By character level', aggregateBy(cells, c => `L${c.cell.level}`)),
        '',
        table('By playstyle', aggregateBy(cells, c => c.cell.playstyle)),
        '',
        table('By enemy', aggregateBy(cells, c => c.cell.enemySlug)),
        '',
        table('By difficulty', aggregateBy(cells, c => c.cell.difficulty)),
        '',
    ];

    if (tick.experiments.length) {
        lines.push('## A/B experiments (facts)', '');
        lines.push('| Param | Old → New | Winner | ΔHealth | Kept | Verify |');
        lines.push('| --- | --- | --- | --- | --- | --- |');
        for (const e of tick.experiments) {
            lines.push(
                `| ${e.paramId} | ${round(e.oldValue)} → ${round(e.newValue)} | ${e.comparison.winner} | ${round(e.comparison.delta, 4)} | ${e.kept ? 'yes' : 'no'} | ${e.verifyPassed ? 'pass' : '—'} |`,
            );
        }
        lines.push('');
    }
    return lines.join('\n') + '\n';
}

export function renderDataReportJson(tick: TuningTickResult): string {
    const cells = tick.baselineCells.map(c => ({
        cellId: c.cell.cellId,
        level: c.cell.level,
        playstyle: c.cell.playstyle,
        difficulty: c.cell.difficulty,
        enemySlug: c.cell.enemySlug,
        runs: c.cell.runs,
        resolutionSuccessRate: c.report.metrics.resolutionSuccessRate,
        winRate: c.report.metrics.winRate,
        defeatRate: c.report.metrics.defeatRate,
        friendshipRate: c.report.metrics.friendshipRate,
        timeoutRate: c.report.metrics.timeoutRate,
        averageRounds: c.report.metrics.averageRounds,
        damageRatio: c.report.metrics.damageRatio,
    }));
    const experiments = tick.experiments.map(e => ({
        paramId: e.paramId,
        oldValue: e.oldValue,
        newValue: e.newValue,
        winner: e.comparison.winner,
        deltaHealth: e.comparison.delta,
        kept: e.kept,
        verifyPassed: e.verifyPassed,
    }));
    return JSON.stringify({
        timestamp: tick.timestamp,
        focus: tick.focus,
        baselineHealth: tick.baseline,
        cells,
        experiments,
    }, null, 2) + '\n';
}

function experimentSummary(e: ExperimentResult): string {
    return `- **${e.paramId}**: ${round(e.oldValue)} → ${round(e.newValue)} — ${e.candidate.rationale} (ΔHealth ${round(e.comparison.delta, 4)}; ${e.comparison.note})`;
}

/**
 * Suggestions writeup — recommended changes with a brief why and references
 * back to the data report. Rides the PR branch alongside the auto-applied
 * winners. `dataReportRef` is the committed data report filename to cite.
 */
export function renderSuggestions(tick: TuningTickResult, dataReportRef: string): string {
    const kept = tick.experiments.filter(e => e.kept);
    const rejected = tick.experiments.filter(e => !e.kept && e.candidate.source !== 'heuristic' || (!e.kept && Number.isFinite(e.oldValue)));
    const lines: string[] = [
        `# Tuning suggestions — ${tick.timestamp}`,
        '',
        `Derived from the data report: \`${dataReportRef}\`.`,
        `**Focus:** ${focusLine(tick)}`,
        '',
        '## Auto-applied changes (in this PR)',
        '',
    ];
    if (kept.length === 0) {
        lines.push('_No numeric change improved aggregate health beyond the significance threshold; none applied._', '');
    } else {
        for (const e of kept) {
            lines.push(experimentSummary(e));
            lines.push(`  - Evidence: baseline ${tick.baseline.summary}; see \`${dataReportRef}\` A/B table.`);
        }
        lines.push('');
    }

    lines.push('## Considered but not applied', '');
    if (rejected.length === 0) {
        lines.push('_None._', '');
    } else {
        for (const e of rejected) {
            lines.push(`- **${e.paramId}** → ${round(e.newValue)}: ${e.notes.join(' ')}`);
        }
        lines.push('');
    }

    lines.push('## Propose-only (needs human judgement)', '');
    if (tick.proposeOnly.length === 0) {
        lines.push('_None._', '');
    } else {
        for (const p of tick.proposeOnly) {
            lines.push(`- ${p.summary}${p.paramId ? ` (\`${p.paramId}\`)` : ''} — ${p.rationale}`);
        }
        lines.push('');
    }
    return lines.join('\n') + '\n';
}
