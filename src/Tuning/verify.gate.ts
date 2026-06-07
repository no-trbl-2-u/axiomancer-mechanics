/**
 * Verify gate — shells out to `npm run verify` (type-check + lint + test +
 * build) and reports pass/fail. Used by the A/B experiment runner before a
 * winning numeric change is allowed to stay on disk.
 */

import { spawnSync } from 'child_process';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

export interface VerifyResult {
    passed: boolean;
    failingStep?: 'type-check' | 'lint' | 'test' | 'build' | 'unknown';
    output: string;
}

/** Infer which verify sub-step failed from combined output (best-effort). */
function inferFailingStep(output: string): VerifyResult['failingStep'] {
    if (/error TS\d+/.test(output)) return 'type-check';
    if (/\b\d+ problems?\b|eslint/i.test(output) && /error/i.test(output)) return 'lint';
    if (/FAIL |Tests?\s+\d+ failed|AssertionError/i.test(output)) return 'test';
    if (/tsc-alias|build/i.test(output)) return 'build';
    return 'unknown';
}

export interface RunVerifyOptions {
    /** Override the command (tests inject a fast stub). */
    command?: string;
    args?: string[];
    cwd?: string;
    timeoutMs?: number;
}

export function runVerify(opts: RunVerifyOptions = {}): VerifyResult {
    const command = opts.command ?? 'npm';
    const args = opts.args ?? ['run', 'verify'];
    const result = spawnSync(command, args, {
        cwd: opts.cwd ?? REPO_ROOT,
        encoding: 'utf8',
        timeout: opts.timeoutMs ?? 10 * 60 * 1000,
        maxBuffer: 64 * 1024 * 1024,
    });
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
    const passed = result.status === 0;
    return passed
        ? { passed: true, output }
        : { passed: false, failingStep: inferFailingStep(output), output };
}
