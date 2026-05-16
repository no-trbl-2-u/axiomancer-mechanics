/**
 * Hermetic e2e — agent Vitest reporter (Phase 39).
 *
 * Drives `automation/agent-vitest-reporter.mjs` with structurally
 * minimal stand-ins for Vitest's TestModule / TestCase objects. The
 * reporter only touches a small slice of the public API
 * (`children.allTests()`, `moduleId`, `ok()`, `state()`,
 * `diagnostic()` on the module; `fullName`, `result()`, `diagnostic()`
 * on each test case), so the stubs stay tiny.
 *
 * Tests cover:
 *   - JSON shape + markdown delimiters for a 2-file, 3-test run with
 *     one failure (golden path).
 *   - Failure block carries `location` parsed from the first stack
 *     frame.
 *   - Empty run produces a valid report with all-zero rollup.
 */

import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';

// @ts-ignore — .mjs file outside the TS module graph; import for runtime only.
import AgentVitestReporter from '../../../automation/agent-vitest-reporter.mjs';

type TestStatus = 'passed' | 'failed' | 'skipped' | 'pending';

interface StubCase {
    fullName: string;
    result: () => { state: TestStatus; errors?: unknown[] };
    diagnostic: () => { duration: number };
}

interface StubModule {
    moduleId: string;
    children: { allTests: () => Iterable<StubCase> };
    state: () => 'passed' | 'failed' | 'skipped' | 'queued';
    ok: () => boolean;
    diagnostic: () => { duration: number };
}

const tmpFiles: string[] = [];
function tmpPath(): string {
    const p = path.join(os.tmpdir(), `axiomancer-verify-${randomUUID()}.json`);
    tmpFiles.push(p);
    return p;
}

afterEach(() => {
    while (tmpFiles.length > 0) {
        const f = tmpFiles.pop();
        if (f) { try { fs.unlinkSync(f); } catch { /* ignore */ } }
    }
});

interface StubStream {
    written: string;
    write(chunk: string): boolean;
}

function makeStream(): StubStream {
    return {
        written: '',
        write(chunk: string): boolean { this.written += chunk; return true; },
    };
}

function passingCase(name: string, durationMs: number): StubCase {
    return {
        fullName: name,
        result: () => ({ state: 'passed', errors: [] }),
        diagnostic: () => ({ duration: durationMs }),
    };
}

function failingCase(name: string, message: string, location?: { file: string; line: number; column: number }): StubCase {
    const stacks = location ? [{ method: '', ...location }] : undefined;
    return {
        fullName: name,
        result: () => ({ state: 'failed', errors: [{ message, stacks }] }),
        diagnostic: () => ({ duration: 5 }),
    };
}

function makeModule(opts: { absPath: string; cases: StubCase[]; durationMs: number; ok: boolean; state: 'passed' | 'failed' | 'skipped' }): StubModule {
    return {
        moduleId: opts.absPath,
        children: { allTests: () => opts.cases.values() },
        state: () => opts.state,
        ok: () => opts.ok,
        diagnostic: () => ({ duration: opts.durationMs }),
    };
}

describe('AgentVitestReporter — golden path', () => {
    it('writes the documented JSON shape and a delimited markdown block', async () => {
        const rootDir = process.cwd();
        const jsonPath = tmpPath();
        const stream = makeStream();

        const fileA = path.join(rootDir, 'src/A/e2e/a.engine.test.ts');
        const fileB = path.join(rootDir, 'src/B/e2e/b.engine.test.ts');

        const modules: StubModule[] = [
            makeModule({
                absPath: fileA,
                durationMs: 12,
                ok: true,
                state: 'passed',
                cases: [
                    passingCase('Alpha > does the thing', 7),
                    passingCase('Alpha > does the slow thing', 42),
                ],
            }),
            makeModule({
                absPath: fileB,
                durationMs: 18,
                ok: false,
                state: 'failed',
                cases: [
                    failingCase('Beta > fails as expected', 'expected 1 to be 2', {
                        file: fileB,
                        line: 17,
                        column: 9,
                    }),
                ],
            }),
        ];

        const reporter = new AgentVitestReporter({
            jsonOutputPath: jsonPath,
            markdownStream: stream,
            rootDir,
        });
        await reporter.onTestRunEnd(modules, [], 'failed');

        const raw = fs.readFileSync(jsonPath, 'utf-8');
        const parsed = JSON.parse(raw);

        expect(parsed.rollup.total).toBe(3);
        expect(parsed.rollup.passed).toBe(2);
        expect(parsed.rollup.failed).toBe(1);
        expect(parsed.rollup.skipped).toBe(0);
        expect(parsed.rollup.reason).toBe('failed');
        expect(parsed.rollup.unhandledErrors).toBe(0);
        expect(parsed.rollup.slowest5.length).toBe(2);
        expect(parsed.rollup.slowest5[0].name).toBe('Alpha > does the slow thing');
        expect(parsed.rollup.slowest5[0].durationMs).toBe(42);

        expect(parsed.files.length).toBe(2);
        expect(parsed.files[0].path).toBe('src/A/e2e/a.engine.test.ts');
        expect(parsed.files[0].status).toBe('passed');
        expect(parsed.files[0].tests).toHaveLength(2);
        expect(parsed.files[1].path).toBe('src/B/e2e/b.engine.test.ts');
        expect(parsed.files[1].status).toBe('failed');
        expect(parsed.files[1].tests[0].failure.message).toBe('expected 1 to be 2');
        expect(parsed.files[1].tests[0].failure.location).toBe(`${fileB}:17:9`);

        expect(stream.written).toContain('## Verify summary');
        expect(stream.written).toContain('- total: 3');
        expect(stream.written).toContain('- passed: 2');
        expect(stream.written).toContain('- failed: 1');
        expect(stream.written).toContain('- reason: failed');
        expect(stream.written).toContain('### Failed tests');
        expect(stream.written).toContain(`${fileB}:17:9 — Beta > fails as expected: expected 1 to be 2`);
        expect(stream.written).toContain('### Slowest 5 (passed)');
        expect(stream.written).toContain('42ms — src/A/e2e/a.engine.test.ts: Alpha > does the slow thing');
        expect(stream.written).toContain('## End summary');

        const start = stream.written.indexOf('## Verify summary');
        const end = stream.written.indexOf('## End summary');
        expect(start).toBeGreaterThan(-1);
        expect(end).toBeGreaterThan(start);
    });
});

describe('AgentVitestReporter — failure block details', () => {
    it('omits the location field when the error has no stack', async () => {
        const rootDir = process.cwd();
        const jsonPath = tmpPath();
        const stream = makeStream();

        const fileC = path.join(rootDir, 'src/C/e2e/c.engine.test.ts');
        const modules: StubModule[] = [
            makeModule({
                absPath: fileC,
                durationMs: 5,
                ok: false,
                state: 'failed',
                cases: [failingCase('Gamma > stackless fail', 'boom')],
            }),
        ];

        const reporter = new AgentVitestReporter({
            jsonOutputPath: jsonPath,
            markdownStream: stream,
            rootDir,
        });
        await reporter.onTestRunEnd(modules, [], 'failed');

        const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        expect(parsed.files[0].tests[0].failure.message).toBe('boom');
        expect(parsed.files[0].tests[0].failure.location).toBeUndefined();
        expect(stream.written).toContain('- src/C/e2e/c.engine.test.ts — Gamma > stackless fail: boom');
    });
});

describe('AgentVitestReporter — empty run', () => {
    it('writes a valid report with all-zero rollup and no failure block', async () => {
        const rootDir = process.cwd();
        const jsonPath = tmpPath();
        const stream = makeStream();

        const reporter = new AgentVitestReporter({
            jsonOutputPath: jsonPath,
            markdownStream: stream,
            rootDir,
        });
        await reporter.onTestRunEnd([], [], 'passed');

        const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        expect(parsed.rollup).toEqual({
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            reason: 'passed',
            unhandledErrors: 0,
            slowest5: [],
        });
        expect(parsed.files).toEqual([]);

        expect(stream.written).toContain('## Verify summary');
        expect(stream.written).toContain('- total: 0');
        expect(stream.written).not.toContain('### Failed tests');
        expect(stream.written).not.toContain('### Slowest 5 (passed)');
        expect(stream.written).toContain('## End summary');
    });
});
