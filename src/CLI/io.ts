/**
 * CLI I/O abstraction.
 *
 * Three input modes (TTY / scripted answers / line-buffered stdin) and
 * two output modes (human-readable / JSON-per-line) so the same demo
 * loop can be driven by an external agent, a replay file, or a person
 * at the keyboard.
 *
 * Switch modes once at startup via `setIoMode(...)` / `setOutputMode(...)`
 * and then call `prompt`, `emit`, and `log` from anywhere in the CLI —
 * the abstraction routes everything to the current mode.
 */

import inquirer from 'inquirer';
import readline from 'readline';

// ─── Flag parsing ─────────────────────────────────────────────────────────────

export interface CliFlags {
    scriptPath?: string;
    stdin: boolean;
    jsonEvents: boolean;
}

export function parseArgv(args: string[]): CliFlags {
    const flags: CliFlags = { stdin: false, jsonEvents: false };
    let i = 0;
    while (i < args.length) {
        const arg = args[i]!;
        if (arg === '--stdin') {
            flags.stdin = true;
            i++;
        } else if (arg === '--json-events') {
            flags.jsonEvents = true;
            i++;
        } else if (arg.startsWith('--script=')) {
            flags.scriptPath = arg.slice('--script='.length);
            i++;
        } else if (arg === '--script') {
            const next = args[i + 1];
            if (!next || next.startsWith('--')) {
                throw new Error('--script requires a file path argument.');
            }
            flags.scriptPath = next;
            i += 2;
        } else {
            throw new Error(
                `Unknown CLI flag: '${arg}'.\n` +
                `Usage: npm run game -- [--script <path>] [--stdin] [--json-events]`,
            );
        }
    }
    return flags;
}

// ─── Input mode ───────────────────────────────────────────────────────────────

export type IoMode =
    | { kind: 'tty' }
    | { kind: 'script'; answers: object[] }
    | { kind: 'stdin' };

let ioMode: IoMode = { kind: 'tty' };
let stdinIter: AsyncIterableIterator<string> | null = null;

export function setIoMode(mode: IoMode): void {
    ioMode = mode;
    if (mode.kind === 'stdin') {
        const rl = readline.createInterface({ input: process.stdin });
        stdinIter = rl[Symbol.asyncIterator]() as AsyncIterableIterator<string>;
    } else {
        stdinIter = null;
    }
}

export function getIoMode(): IoMode {
    return ioMode;
}

// ─── Output mode ──────────────────────────────────────────────────────────────

export type OutputMode = 'human' | 'json';

let outputMode: OutputMode = 'human';

export function setOutputMode(mode: OutputMode): void {
    outputMode = mode;
}

export function getOutputMode(): OutputMode {
    return outputMode;
}

// ─── prompt / emit / log ──────────────────────────────────────────────────────

/**
 * Drop-in replacement for `inquirer.prompt`. Routes to the configured
 * input mode. In script and stdin modes, the next answer object is
 * returned without rendering any UI.
 */
export async function prompt<T extends object>(
    questions: Parameters<typeof inquirer.prompt>[0],
): Promise<T> {
    if (ioMode.kind === 'tty') {
        return inquirer.prompt(questions) as Promise<T>;
    }
    if (ioMode.kind === 'script') {
        const next = ioMode.answers.shift();
        if (next === undefined) {
            throw new Error(
                'CLI script exhausted; pass more answers in the --script JSON.',
            );
        }
        return next as T;
    }
    // stdin
    if (!stdinIter) {
        throw new Error('IO mode is stdin but no stdin iterator is initialised.');
    }
    const { value, done } = await stdinIter.next();
    if (done || value === undefined) {
        throw new Error('CLI stdin closed before all prompts were answered.');
    }
    return JSON.parse(value) as T;
}

/**
 * Emit a GameEvent (or any `{ type, payload? }` envelope) to the
 * configured output channel. Human mode prints a one-line summary;
 * JSON mode prints `JSON.stringify(event)`.
 */
export function emit(event: { type: string; payload?: unknown }): void {
    if (outputMode === 'json') {
        process.stdout.write(JSON.stringify(event) + '\n');
    } else {
        // eslint-disable-next-line no-console
        console.log(`  [event] ${event.type}`);
    }
}

/**
 * Human-prose channel. In JSON mode the output is routed to stderr so
 * stdout stays machine-clean for event consumers.
 */
export function log(...args: unknown[]): void {
    if (outputMode === 'json') {
        const text = args.map(a => typeof a === 'string' ? a : String(a)).join(' ');
        process.stderr.write(text + '\n');
    } else {
        // eslint-disable-next-line no-console
        console.log(...args);
    }
}
