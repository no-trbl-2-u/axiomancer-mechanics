/**
 * `npm run tune` — headless entry point for the tuning workflow.
 *
 * Pure-Node responsibilities: parse focus, build the matrix, run the baseline
 * (in-process), get candidates from the analyst bridge, run A/B experiments
 * (each variant in a fresh child process so edited constants reload from disk),
 * apply winners that pass the verify gate, and write the two report artifacts.
 *
 * Git / PR orchestration lives in the `mechanics-tuning` skill, not here.
 *
 * Internal mode (`--internal-run-matrix`) is used by the parent to score one
 * matrix variant against the current on-disk source in an isolated process.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

import { parseFocus } from './focus.parser';
import { buildMatrix, DEFAULT_LEVELS, DEFAULT_PLAYSTYLES, DEFAULT_DIFFICULTIES, DEFAULT_BASE_RUNS } from './matrix.builder';
import { runMatrix } from './matrix.runner';
import { scoreHealth } from './health.metrics';
import { filterTunablesByFocus, getTunable } from './tunable.registry';
import { readTunableValue, applyTunableValue, restoreBackup, type SourceBackup } from './tunable.applier';
import { runExperiment, type ExperimentDeps } from './experiment.runner';
import { requestRecommendations } from './analyst.bridge';
import { runVerify } from './verify.gate';
import { loadKnowledge, saveKnowledge } from './strategist.knowledge';
import { renderDataReport, renderDataReportJson, renderSuggestions } from './report.generator';
import type {
    Difficulty, ExperimentResult, HealthScore, MatrixPlan, TuningTickResult,
} from './types';
import type { PlaytestPolicy } from '../Playtest/types';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

// ─── Arg parsing ──────────────────────────────────────────────────────────────

interface Args { [k: string]: string | boolean; }

function parseArgs(argv: string[]): Args {
    const args: Args = {};
    for (const tok of argv) {
        const m = tok.match(/^--([^=]+)(?:=(.*))?$/);
        if (!m) continue;
        args[m[1]!] = m[2] === undefined ? true : m[2];
    }
    return args;
}

function asList(v: string | boolean | undefined): string[] | undefined {
    return typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined;
}

// ─── Internal mode: score one matrix variant ────────────────────────────────────

function internalRunMatrix(planPath: string, outPath: string): void {
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')) as MatrixPlan;
    const cells = runMatrix(plan); // current on-disk source; no learning
    const health = scoreHealth(cells);
    fs.writeFileSync(outPath, JSON.stringify(health), 'utf8');
}

/** Run one matrix variant in a fresh child process (reloads edited source). */
function childVariantHealth(plan: MatrixPlan): HealthScore {
    const planPath = path.join(os.tmpdir(), `tuning-plan-${process.pid}-${Date.now()}.json`);
    const outPath = path.join(os.tmpdir(), `tuning-health-${process.pid}-${Date.now()}.json`);
    fs.writeFileSync(planPath, JSON.stringify(plan), 'utf8');
    const entry = __filename;
    const isTs = entry.endsWith('.ts');
    const cmd = isTs ? 'npx' : process.execPath;
    const cmdArgs = isTs
        ? ['ts-node', entry, '--internal-run-matrix', `--plan=${planPath}`, `--out=${outPath}`]
        : [entry, '--internal-run-matrix', `--plan=${planPath}`, `--out=${outPath}`];
    const res = spawnSync(cmd, cmdArgs, {
        cwd: REPO_ROOT, encoding: 'utf8', timeout: 20 * 60 * 1000, maxBuffer: 64 * 1024 * 1024,
    });
    if (res.status !== 0) {
        throw new Error(`child variant run failed: ${res.stderr || res.stdout}`);
    }
    const health = JSON.parse(fs.readFileSync(outPath, 'utf8')) as HealthScore;
    fs.rmSync(planPath, { force: true });
    fs.rmSync(outPath, { force: true });
    return health;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main(): void {
    const args = parseArgs(process.argv.slice(2));

    if (args['internal-run-matrix']) {
        internalRunMatrix(String(args.plan), String(args.out));
        return;
    }

    const dryRun = Boolean(args['dry-run']);
    const useApi = Boolean(args['use-api']);
    const focus = parseFocus(typeof args.focus === 'string' ? args.focus : undefined);
    const seed = typeof args.seed === 'string' ? args.seed : 'tune-v0';
    const baseRuns = args.runs ? Number(args.runs) : DEFAULT_BASE_RUNS;
    const levels = asList(args.levels)?.map(Number) ?? DEFAULT_LEVELS;
    const playstyles = (asList(args.playstyles) as PlaytestPolicy[] | undefined) ?? DEFAULT_PLAYSTYLES;
    const difficulties = (asList(args.difficulties) as Difficulty[] | undefined) ?? DEFAULT_DIFFICULTIES;
    const maxIterations = args['max-iterations'] ? Number(args['max-iterations']) : 3;
    const outDir = typeof args['out-dir'] === 'string'
        ? path.resolve(REPO_ROOT, args['out-dir'])
        : path.join(REPO_ROOT, 'automation', 'playtest', 'reports');

    const plan = buildMatrix({ levels, playstyles, difficulties, baseRuns, focus, seed });
    process.stdout.write(`[tune] matrix: ${plan.cells.length} cells, focus=${focus.raw ?? 'none'}\n`);

    // Baseline (in-process, full reports for the data report; strategist learns).
    const knowledge = loadKnowledge();
    const baselineCells = runMatrix(plan, { strategist: knowledge, learn: true });
    const baseline = scoreHealth(baselineCells);
    if (!dryRun) saveKnowledge(knowledge);
    process.stdout.write(`[tune] baseline: ${baseline.summary}\n`);

    // Candidates from the analyst bridge (offline heuristic / optional API).
    const tunables = filterTunablesByFocus(focus);
    const currentValues: Record<string, number> = {};
    for (const t of tunables) {
        try { currentValues[t.id] = readTunableValue(t); } catch { /* skip unresolved */ }
    }

    const appliedBackups: SourceBackup[] = [];
    const deps: ExperimentDeps = {
        runVariant: childVariantHealth,
        read: id => readTunableValue(getTunable(id)!),
        apply: (id, val) => {
            const r = applyTunableValue(getTunable(id)!, val);
            if (r.ok && r.backup) appliedBackups.push(r.backup);
            return r;
        },
        restore: restoreBackup,
        verify: () => (dryRun ? true : runVerify().passed),
    };

    void requestRecommendations(
        { baseline, cells: baselineCells, focus, tunables, currentValues },
        { useApi },
    ).then(analyst => {
        process.stdout.write(`[tune] analyst (${analyst.mode}): ${analyst.candidates.length} candidate(s)\n`);

        const experiments: ExperimentResult[] = [];
        let runningBaseline = baseline;
        for (const candidate of analyst.candidates.slice(0, maxIterations)) {
            process.stdout.write(`[tune] A/B ${candidate.paramId} → ${candidate.proposedValue}\n`);
            const result = runExperiment(plan, candidate, runningBaseline, deps);
            experiments.push(result);
            if (result.kept) runningBaseline = result.variantB;
        }

        // Dry-run leaves no trace: revert any winners left on disk.
        if (dryRun) {
            for (const b of appliedBackups.reverse()) restoreBackup(b);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const tick: TuningTickResult = {
            timestamp,
            focus,
            plan,
            baseline,
            baselineCells,
            experiments,
            proposeOnly: analyst.proposeOnly,
        };

        fs.mkdirSync(outDir, { recursive: true });
        const dataMd = path.join(outDir, `tuning-${timestamp}.md`);
        const dataJson = path.join(outDir, `tuning-${timestamp}.json`);
        const suggestionsMd = path.join(outDir, `suggestions-${timestamp}.md`);
        fs.writeFileSync(dataMd, renderDataReport(tick), 'utf8');
        fs.writeFileSync(dataJson, renderDataReportJson(tick), 'utf8');
        fs.writeFileSync(suggestionsMd, renderSuggestions(tick, path.basename(dataMd)), 'utf8');

        const kept = experiments.filter(e => e.kept);
        // Machine-readable summary for the skill to parse.
        process.stdout.write(`[tune] RESULT ${JSON.stringify({
            dryRun,
            dataReport: path.relative(REPO_ROOT, dataMd),
            dataReportJson: path.relative(REPO_ROOT, dataJson),
            suggestions: path.relative(REPO_ROOT, suggestionsMd),
            keptChanges: kept.map(k => ({ paramId: k.paramId, oldValue: k.oldValue, newValue: k.newValue })),
        })}\n`);
    }).catch(err => {
        process.stderr.write(`[tune] error: ${err instanceof Error ? err.stack : String(err)}\n`);
        process.exitCode = 1;
    });
}

main();
