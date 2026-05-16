/**
 * automation/agent-vitest-reporter.mjs — Phase 39.
 *
 * Custom Vitest reporter that emits two artefacts at the end of a run:
 *
 *   1. JSON file at `automation/last-verify-report.json` — structured
 *      rollup + per-file + per-test entries with durations + failure
 *      messages. Stable schema for LLM-agent consumers.
 *   2. Delimited markdown block on stdout (between `## Verify summary`
 *      and `## End summary`) listing totals, failed tests with
 *      `file:line — message`, and the slowest five passing tests.
 *
 * Wire via `npm run verify:agent` (which passes
 * `--reporter=./automation/agent-vitest-reporter.mjs` to `vitest run`).
 *
 * The default `npm run verify` script is NOT modified — this is an
 * additive surface so the deploy gate's expectations stay stable.
 *
 * Schema details and design decisions live in
 * `plan/phases/phase_39_agent_verify_report.md`.
 */

import fs from 'fs';
import path from 'path';

const DEFAULT_JSON_PATH = 'automation/last-verify-report.json';
const MARKDOWN_START = '## Verify summary';
const MARKDOWN_END = '## End summary';
const SLOWEST_LIMIT = 5;

export default class AgentVitestReporter {
    constructor(opts = {}) {
        this.jsonOutputPath = opts.jsonOutputPath ?? DEFAULT_JSON_PATH;
        this.markdownStream = opts.markdownStream ?? process.stdout;
        this.rootDir = opts.rootDir ?? process.cwd();
    }

    onInit(ctx) {
        if (ctx?.config?.root) this.rootDir = ctx.config.root;
    }

    async onTestRunEnd(testModules, unhandledErrors, reason) {
        const report = this.buildReport(testModules ?? [], unhandledErrors ?? [], reason ?? 'passed');
        await this.writeJson(report);
        this.writeMarkdown(report);
    }

    buildReport(testModules, unhandledErrors, reason) {
        const files = [];
        const allTests = [];
        let total = 0, passed = 0, failed = 0, skipped = 0;

        for (const mod of testModules) {
            const tests = [];
            const cases = collectTestCases(mod);
            for (const testCase of cases) {
                const result = testCase.result();
                const diag = safeDiagnostic(testCase);
                const status = result?.state ?? 'pending';
                const entry = {
                    name: testCase.fullName,
                    status,
                    durationMs: diag?.duration ?? 0,
                };
                if (status === 'failed' && Array.isArray(result?.errors) && result.errors.length > 0) {
                    const err = result.errors[0];
                    entry.failure = {
                        message: err?.message ?? '(no message)',
                        diff: err?.diff,
                        actual: err?.actual,
                        expected: err?.expected,
                        location: locationFromError(err),
                    };
                }
                tests.push(entry);
                allTests.push({ ...entry, file: this.relativize(mod.moduleId) });
                total += 1;
                if (status === 'passed') passed += 1;
                else if (status === 'failed') failed += 1;
                else if (status === 'skipped') skipped += 1;
            }
            const modDiag = safeDiagnostic(mod);
            files.push({
                path: this.relativize(mod.moduleId),
                status: moduleStatus(mod),
                durationMs: modDiag?.duration ?? 0,
                tests,
            });
        }

        const slowest5 = [...allTests]
            .filter(t => t.status === 'passed')
            .sort((a, b) => b.durationMs - a.durationMs)
            .slice(0, SLOWEST_LIMIT)
            .map(t => ({ name: t.name, file: t.file, durationMs: t.durationMs }));

        return {
            rollup: {
                total,
                passed,
                failed,
                skipped,
                reason,
                unhandledErrors: unhandledErrors.length,
                slowest5,
            },
            files,
        };
    }

    relativize(absPath) {
        if (!absPath) return absPath;
        try {
            const rel = path.relative(this.rootDir, absPath);
            return rel === '' ? absPath : rel;
        } catch {
            return absPath;
        }
    }

    async writeJson(report) {
        const target = path.isAbsolute(this.jsonOutputPath)
            ? this.jsonOutputPath
            : path.join(this.rootDir, this.jsonOutputPath);
        await fs.promises.mkdir(path.dirname(target), { recursive: true });
        await fs.promises.writeFile(target, JSON.stringify(report, null, 2) + '\n');
    }

    writeMarkdown(report) {
        const r = report.rollup;
        const lines = [];
        lines.push('');
        lines.push(MARKDOWN_START);
        lines.push('');
        lines.push(`- total: ${r.total}`);
        lines.push(`- passed: ${r.passed}`);
        lines.push(`- failed: ${r.failed}`);
        lines.push(`- skipped: ${r.skipped}`);
        if (r.unhandledErrors > 0) lines.push(`- unhandled errors: ${r.unhandledErrors}`);
        lines.push(`- reason: ${r.reason}`);

        if (r.failed > 0) {
            lines.push('');
            lines.push('### Failed tests');
            for (const file of report.files) {
                for (const t of file.tests) {
                    if (t.status !== 'failed') continue;
                    const loc = t.failure?.location ?? file.path;
                    const msg = t.failure?.message ?? '(no message)';
                    lines.push(`- ${loc} — ${t.name}: ${msg}`);
                }
            }
        }

        if (r.slowest5.length > 0) {
            lines.push('');
            lines.push('### Slowest 5 (passed)');
            for (const slow of r.slowest5) {
                lines.push(`- ${slow.durationMs.toFixed(0)}ms — ${slow.file}: ${slow.name}`);
            }
        }

        lines.push('');
        lines.push(MARKDOWN_END);
        lines.push('');
        this.markdownStream.write(lines.join('\n'));
    }
}

function collectTestCases(testModule) {
    const out = [];
    const collection = testModule?.children;
    if (!collection || typeof collection.allTests !== 'function') return out;
    for (const tc of collection.allTests()) out.push(tc);
    return out;
}

function safeDiagnostic(target) {
    if (!target || typeof target.diagnostic !== 'function') return undefined;
    try { return target.diagnostic(); } catch { return undefined; }
}

function moduleStatus(mod) {
    if (typeof mod?.state === 'function') {
        try { return mod.state(); } catch { /* fall through */ }
    }
    return typeof mod?.ok === 'function' && mod.ok() ? 'passed' : 'failed';
}

function locationFromError(err) {
    const first = err?.stacks?.[0];
    if (!first) return undefined;
    return `${first.file}:${first.line}:${first.column}`;
}
