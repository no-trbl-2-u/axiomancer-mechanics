/**
 * `npm run tune` — headless entry point for the tuning workflow.
 *
 * Pure-Node responsibilities: parse focus, build the matrix, run the baseline
 * (in-process) under a FROZEN strategist snapshot, get candidates (file / API /
 * heuristic), run A/B experiments (each variant in a fresh child process so
 * edited constants reload from disk — and under the SAME frozen strategist, so
 * A and B are measured by the same ruler), apply winners that pass the verify
 * gate AND the significance test, record the ledger, and write the artifacts.
 *
 * Git / PR orchestration lives in the `combat-tuning` skill, not here.
 *
 * Modes:
 *   --internal-run-matrix   score one variant against current on-disk source.
 *   --emit-request=<path>    baseline only; write a compact analyst request +
 *                            artifacts so the balance-analyst subagent can emit
 *                            structured candidates (closing the analyst→actuator
 *                            loop). No A/B is run.
 *   --candidates=<path>      A/B-test the subagent/API candidates in this file
 *                            instead of the offline heuristic.
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
import { requestRecommendations, validateCandidates } from './analyst.bridge';
import { runVerify } from './verify.gate';
import { loadKnowledge, saveKnowledge, cloneKnowledge, updateFromRun, DEFAULT_KNOWLEDGE_PATH } from './strategist.knowledge';
import { loadLedger, saveLedger, recordExperiments, cooldownDirections } from './ledger';
import { renderDataReport, renderDataReportJson, renderSuggestions } from './report.generator';
import type {
    Candidate, Difficulty, ExperimentResult, HealthScore, MatrixPlan, TuningTickResult,
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

function internalRunMatrix(planPath: string, outPath: string, knowledgePath?: string): void {
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')) as MatrixPlan;
    // Frozen ruler: A/B variants are measured under the SAME strategist the
    // baseline used (read-only, no learning), so the keep/reject decision isn't
    // made against a different policy than the one that generated the baseline.
    const strategist = knowledgePath && fs.existsSync(knowledgePath)
        ? loadKnowledge(knowledgePath) : undefined;
    const cells = runMatrix(plan, strategist ? { strategist, learn: false } : {});
    const health = scoreHealth(cells);
    fs.writeFileSync(outPath, JSON.stringify(health), 'utf8');
}

/** Run one matrix variant in a fresh child process (reloads edited source). */
function childVariantHealth(plan: MatrixPlan, knowledgePath: string): HealthScore {
    const planPath = path.join(os.tmpdir(), `tuning-plan-${process.pid}-${Date.now()}.json`);
    const outPath = path.join(os.tmpdir(), `tuning-health-${process.pid}-${Date.now()}.json`);
    fs.writeFileSync(planPath, JSON.stringify(plan), 'utf8');
    const entry = __filename;
    const isTs = entry.endsWith('.ts');
    const cmd = isTs ? 'npx' : process.execPath;
    const base = ['--internal-run-matrix', `--plan=${planPath}`, `--out=${outPath}`, `--knowledge=${knowledgePath}`];
    const cmdArgs = isTs ? ['ts-node', entry, ...base] : [entry, ...base];
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
        internalRunMatrix(
            String(args.plan), String(args.out),
            typeof args.knowledge === 'string' ? args.knowledge : undefined,
        );
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
    const emitRequest = typeof args['emit-request'] === 'string' ? args['emit-request'] : undefined;
    const candidatesPath = typeof args.candidates === 'string' ? args.candidates : undefined;
    const outDir = typeof args['out-dir'] === 'string'
        ? path.resolve(REPO_ROOT, args['out-dir'])
        : path.join(REPO_ROOT, 'automation', 'playtest', 'reports');

    const plan = buildMatrix({ levels, playstyles, difficulties, baseRuns, focus, seed });
    process.stdout.write(`[tune] matrix: ${plan.cells.length} cells, focus=${focus.raw ?? 'none'}\n`);

    // Freeze the ruler: snapshot the strategist BEFORE the tick and measure the
    // baseline + every A/B variant against that frozen copy. Cross-tick learning
    // is folded into a separate clone afterward (no extra matrix run), so the
    // measurement instrument never drifts mid-tick.
    const frozen = loadKnowledge();
    const frozenPath = path.join(os.tmpdir(), `tuning-frozen-${process.pid}-${Date.now()}.json`);
    saveKnowledge(frozen, frozenPath);

    const baselineCells = runMatrix(plan, { strategist: frozen, learn: false });
    const baseline = scoreHealth(baselineCells);
    process.stdout.write(`[tune] baseline: ${baseline.summary}\n`);

    if (!dryRun) {
        // Cross-tick learning, isolated from this tick's measurement.
        const learned = cloneKnowledge(frozen);
        for (const c of baselineCells) {
            for (const run of c.report.runs) updateFromRun(learned, c.cell.enemySlug, run);
        }
        saveKnowledge(learned, DEFAULT_KNOWLEDGE_PATH);
    }

    const tunables = filterTunablesByFocus(focus);
    const currentValues: Record<string, number> = {};
    for (const t of tunables) {
        try { currentValues[t.id] = readTunableValue(t); } catch { /* skip unresolved */ }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // ── Emit-request mode: baseline + analyst request, no A/B ────────────────
    if (emitRequest) {
        const cooldown = cooldownDirections(loadLedger());
        const request = {
            timestamp,
            focus,
            engagementFloor: baseline.engagementFloor,
            baselineSummary: baseline.summary,
            cooldown: [...cooldown],
            legalTunables: tunables.map(t => ({
                id: t.id, current: currentValues[t.id], min: t.min, max: t.max,
                step: t.step, effect: t.effect, rationale: t.rationale,
            })),
            cells: baseline.perCell.map(c => ({
                cellId: c.cellId, difficulty: c.difficulty, band: c.band,
                resolutionSuccessRate: c.resolutionSuccessRate, defeatRate: c.defeatRate,
                engagementShare: c.engagementShare,
            })),
            candidatesContract: '[{ "paramId": <legal id>, "proposedValue": <number>, "rationale": "..." }]',
        };
        fs.mkdirSync(path.dirname(path.resolve(REPO_ROOT, emitRequest)), { recursive: true });
        fs.writeFileSync(path.resolve(REPO_ROOT, emitRequest), JSON.stringify(request, null, 2) + '\n', 'utf8');
        writeArtifacts(outDir, timestamp, {
            timestamp, focus, plan, baseline, baselineCells, experiments: [], proposeOnly: [],
        });
        fs.rmSync(frozenPath, { force: true });
        process.stdout.write(`[tune] RESULT ${JSON.stringify({
            dryRun, mode: 'emit-request',
            request: path.relative(REPO_ROOT, path.resolve(REPO_ROOT, emitRequest)),
            dataReport: path.relative(REPO_ROOT, path.join(outDir, `tuning-${timestamp}.md`)),
            keptChanges: [],
        })}\n`);
        return;
    }

    const appliedBackups: SourceBackup[] = [];
    const deps: ExperimentDeps = {
        runVariant: p => childVariantHealth(p, frozenPath),
        read: id => readTunableValue(getTunable(id)!),
        apply: (id, val) => {
            const r = applyTunableValue(getTunable(id)!, val);
            if (r.ok && r.backup) appliedBackups.push(r.backup);
            return r;
        },
        restore: restoreBackup,
        verify: () => (dryRun ? true : runVerify().passed),
    };

    const ledger = loadLedger();
    const cooldown = cooldownDirections(ledger);

    // Candidate source: file (subagent/API) > heuristic/API bridge.
    const candidateSource: Promise<{ candidates: Candidate[]; proposeOnly: TuningTickResult['proposeOnly']; mode: string }> =
        candidatesPath
            ? Promise.resolve({
                candidates: validateCandidates(
                    JSON.parse(fs.readFileSync(path.resolve(REPO_ROOT, candidatesPath), 'utf8')),
                    tunables,
                ),
                proposeOnly: [],
                mode: 'file',
            })
            : requestRecommendations(
                { baseline, cells: baselineCells, focus, tunables, currentValues, cooldown },
                { useApi },
            );

    void candidateSource.then(analyst => {
        process.stdout.write(`[tune] candidates (${analyst.mode}): ${analyst.candidates.length}\n`);

        const experiments: ExperimentResult[] = [];
        let runningBaseline = baseline;
        for (const candidate of analyst.candidates.slice(0, maxIterations)) {
            process.stdout.write(`[tune] A/B ${candidate.paramId} → ${candidate.proposedValue}\n`);
            const result = runExperiment(plan, candidate, runningBaseline, deps);
            experiments.push(result);
            if (result.kept) runningBaseline = result.variantB;
        }

        if (dryRun) {
            for (const b of appliedBackups.reverse()) restoreBackup(b);
        }

        const tick: TuningTickResult = {
            timestamp, focus, plan, baseline, baselineCells, experiments,
            proposeOnly: analyst.proposeOnly,
        };
        writeArtifacts(outDir, timestamp, tick);

        if (!dryRun) {
            recordExperiments(ledger, experiments, { timestamp, focus: focus.raw });
            saveLedger(ledger);
        }
        fs.rmSync(frozenPath, { force: true });

        const kept = experiments.filter(e => e.kept);
        process.stdout.write(`[tune] RESULT ${JSON.stringify({
            dryRun,
            dataReport: path.relative(REPO_ROOT, path.join(outDir, `tuning-${timestamp}.md`)),
            dataReportJson: path.relative(REPO_ROOT, path.join(outDir, `tuning-${timestamp}.json`)),
            suggestions: path.relative(REPO_ROOT, path.join(outDir, `suggestions-${timestamp}.md`)),
            keptChanges: kept.map(k => ({
                paramId: k.paramId, oldValue: k.oldValue, newValue: k.newValue,
                confidence: k.comparison.confidence,
            })),
        })}\n`);
    }).catch(err => {
        fs.rmSync(frozenPath, { force: true });
        process.stderr.write(`[tune] error: ${err instanceof Error ? err.stack : String(err)}\n`);
        process.exitCode = 1;
    });
}

function writeArtifacts(outDir: string, timestamp: string, tick: TuningTickResult): void {
    fs.mkdirSync(outDir, { recursive: true });
    const dataMd = path.join(outDir, `tuning-${timestamp}.md`);
    fs.writeFileSync(dataMd, renderDataReport(tick), 'utf8');
    fs.writeFileSync(path.join(outDir, `tuning-${timestamp}.json`), renderDataReportJson(tick), 'utf8');
    fs.writeFileSync(
        path.join(outDir, `suggestions-${timestamp}.md`),
        renderSuggestions(tick, path.basename(dataMd)), 'utf8',
    );
}

main();
