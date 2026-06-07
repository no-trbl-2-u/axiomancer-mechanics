/**
 * Report generator — emits the two artifacts the delivery model needs. Both now
 * ride the SAME PR branch (nothing auto-lands on `main`):
 *   1. Data report (facts only, no recommendations).
 *   2. Suggestions writeup (recommended changes + why + an inline snapshot of
 *      the relevant game state — player, enemy, combat — that supports each).
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

/**
 * Status-effect engagement view (Axiomancer north-star: status effects are the
 * main engagement). Skill-use-per-run is the current proxy until effects-
 * applied-per-run lands. Lower numbers warn that combat is devolving into
 * basic-attack trades.
 */
function engagementTable(cells: CellResult[]): string {
    const groups = new Map<string, CellResult[]>();
    for (const c of cells) {
        const k = c.cell.playstyle;
        (groups.get(k) ?? groups.set(k, []).get(k)!).push(c);
    }
    const rows = [...groups.entries()].map(([key, group]) => {
        const skillPerRun = avg(group.map(g => g.snapshot?.combat.skillUsePerRun ?? 0));
        const skillShare = avg(group.map(g => g.snapshot?.combat.skillActionShare ?? 0));
        return { key, skillPerRun, skillShare };
    }).sort((a, b) => a.key.localeCompare(b.key));
    return [
        '### Status-effect engagement (by playstyle)',
        '',
        '| Playstyle | Skill uses / run | Skill action share |',
        '| --- | --- | --- |',
        ...rows.map(r => `| ${r.key} | ${round(r.skillPerRun, 1)} | ${pct(r.skillShare)} |`),
    ].join('\n');
}

/** Data report — aggregate facts only. No recommendations. Rides the PR. */
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
        engagementTable(cells),
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

function statLine(s: { heart: number; body: number; mind: number }): string {
    return `H${s.heart}/B${s.body}/M${s.mind}`;
}

/** Inline snapshot of one cell's player, enemy, and combat state. */
function renderSnapshot(c: CellResult): string {
    const snap = c.snapshot;
    const m = c.report.metrics;
    const head = `**\`${c.cell.cellId}\`** — L${c.cell.level} ${c.cell.playstyle} vs \`${c.cell.enemySlug}\` (${c.cell.difficulty})`;
    if (!snap) {
        return [head, `  - resolution ${pct(m.resolutionSuccessRate)} · defeat ${pct(m.defeatRate)} · timeout ${pct(m.timeoutRate)} · avg ${round(m.averageRounds, 1)} rounds`].join('\n');
    }
    const p = snap.player;
    const e = snap.enemy;
    return [
        head,
        `  - **Player:** L${p.level} ${statLine(p.baseStats)} · HP ${p.maxHealth} · atk(P/M/E) ${p.derived.physicalAttack}/${p.derived.mentalAttack}/${p.derived.emotionalAttack} · def ${p.derived.physicalDefense}/${p.derived.mentalDefense}/${p.derived.emotionalDefense} · ${p.knownSkills} skills · gear [${p.equipment.join(', ') || 'none'}]`,
        `  - **Enemy:** ${e.name} L${e.level} (${e.logic}/${e.difficulty ?? 'n/a'}) ${statLine(e.baseStats)} · HP ${e.maxHealth} · atk ${e.derived.physicalAttack}/${e.derived.mentalAttack}/${e.derived.emotionalAttack} · def ${e.derived.physicalDefense}/${e.derived.mentalDefense}/${e.derived.emotionalDefense}`,
        `  - **Combat:** resolution ${pct(snap.combat.resolutionSuccessRate)} · defeat ${pct(snap.combat.defeatRate)} · timeout ${pct(snap.combat.timeoutRate)} · avg ${round(snap.combat.averageRounds, 1)} rounds · dmg ratio ${round(snap.combat.damageRatioPlayerToEnemy)} · stances ${snap.combat.topStances || 'n/a'}`,
        `  - **Status-effect engagement:** ${round(snap.combat.skillUsePerRun, 1)} skill uses/run (${pct(snap.combat.skillActionShare)} of actions) · top skills: ${snap.combat.topSkills.join(', ') || 'none'}`,
    ].join('\n');
}

function cellById(tick: TuningTickResult, cellId: string): CellResult | undefined {
    return tick.baselineCells.find(c => c.cell.cellId === cellId);
}

/** The most off-band cells (worst deviation first), with snapshots available. */
function worstOffBandCells(tick: TuningTickResult, n: number): CellResult[] {
    const ranked = [...tick.baseline.perCell]
        .filter(c => c.deviation > 0)
        .sort((a, b) => b.deviation - a.deviation)
        .slice(0, n);
    return ranked
        .map(r => cellById(tick, r.cellId))
        .filter((c): c is CellResult => !!c);
}

const CELL_ID_RE = /\b(l\d+-[a-z]+-[a-z]+)\b/;

/**
 * Assumptions & methodology — the premises behind every recommendation, so a
 * reviewer can judge the suggestions on the same footing the loop used. Mixes
 * the run's concrete parameters (band, sample size, focus) with the fixed
 * methodology contract (objective, guardrails, proxy limitations).
 */
function renderAssumptions(tick: TuningTickResult): string {
    const band = tick.baseline.targetBand;
    const runs = tick.plan.cells.map(c => c.runs);
    const minRuns = runs.length ? Math.min(...runs) : 0;
    const maxRuns = runs.length ? Math.max(...runs) : 0;
    const runsLabel = minRuns === maxRuns ? `${minRuns}` : `${minRuns}–${maxRuns}`;
    return [
        '## Assumptions & methodology',
        '',
        `- **Objective:** matrix "health" = weighted squared deviation of each cell's resolution-success rate from the target band **${pct(band.low)}–${pct(band.high)}** (victory + mercy/friendship). Lower is healthier; the loop minimises it.`,
        `- **Sample:** ${runsLabel} runs/cell, ${tick.plan.cells.length} cells, deterministic seeds derived from \`${tick.plan.baseSeed}\` + cell id (variant A and B share seeds). Timeouts (combat unresolved by the round cap) count as non-resolution.`,
        '- **A change is kept only if** it improves aggregate health beyond a fixed significance epsilon (0.005), is **not a regression** (worst-cell defeat rate must not rise > 10 points), **and** passes `npm run verify`. Otherwise the edit is reverted.',
        '- **Auto-apply scope:** numeric values in the tunable registry only, each clamped to its min/max and a per-run magnitude cap (±25% for fundamentals). Structural / schema / logic ideas are propose-only — the applier cannot touch them.',
        '- **Enemy scaling:** `enemyStatBudget(level) = level × ENEMY_STAT_PER_LEVEL`, then per-difficulty ×0.8 / ×1.0 / ×1.25 (easy/normal/hard) with small level deltas.',
        '- **Loadouts:** players receive every level-eligible skill plus best-fit gear per slot (an upper bound on kit, not a constrained real-player loadout).',
        '- **Known limitation (status-effect doctrine):** engagement is currently the *proxy* skill-uses/run + skill-action-share, NOT effects-applied/exploited. Repeated low-value skill spam can inflate it, and a "skill" is not necessarily a status effect. Read the engagement lines with that caveat; a transcript-derived effects metric is the planned upgrade.',
        '- **Statistical caveat:** significance is a fixed epsilon on aggregate deviation, not a confidence interval — small ΔHealth values may be within run-to-run noise.',
        '',
    ].join('\n');
}

/**
 * Suggestions writeup — recommended changes with a brief why, an inline
 * snapshot of the relevant game state (player / enemy / combat) that supports
 * them, and a reference to the data report. Rides the SAME PR branch as the
 * data report and the auto-applied winners. `dataReportRef` is the data report
 * filename to cite.
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
        renderAssumptions(tick),
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
            // If the item names a specific cell, embed its snapshot inline.
            const cellId = p.summary.match(CELL_ID_RE)?.[1];
            const cell = cellId ? cellById(tick, cellId) : undefined;
            if (cell) {
                for (const l of renderSnapshot(cell).split('\n')) lines.push(`  ${l}`);
            }
        }
        lines.push('');
    }

    // Supporting evidence: the most off-band matchups, with full game-state
    // snapshots, so the reviewer can judge a numeric change against the
    // concrete player/enemy/combat state that motivated it.
    const evidence = worstOffBandCells(tick, 5);
    lines.push('## Supporting evidence — relevant game state', '');
    if (evidence.length === 0) {
        lines.push('_Matrix is in band; no off-band cells to snapshot._', '');
    } else {
        lines.push(
            'Most off-band matchups (worst deviation first). Per the Axiomancer',
            'north-star, watch the status-effect engagement line: low skill use'
            + ' means combat is collapsing into basic-attack trades.',
            '',
        );
        for (const c of evidence) {
            lines.push(renderSnapshot(c), '');
        }
    }
    return lines.join('\n') + '\n';
}
