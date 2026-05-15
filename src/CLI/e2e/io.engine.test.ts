/**
 * Hermetic e2e — CLI I/O abstraction (`src/CLI/io.ts`).
 *
 * Tests cover:
 *   - argv parsing (every flag, missing arg, unknown flag).
 *   - script-mode `prompt` round-trip (shift-from-array, throw on
 *     exhaust).
 *   - json-mode `emit` writes one JSON-stringified line per call.
 *   - human-mode `emit` writes the human bullet.
 *   - json-mode `log` routes to stderr (keeps stdout machine-clean).
 *
 * No TTY interaction; `inquirer` is never invoked.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
    parseArgv, setIoMode, setOutputMode,
    prompt, emit, log,
    type CliFlags,
} from '../io';

afterEach(() => {
    vi.restoreAllMocks();
    setIoMode({ kind: 'tty' });
    setOutputMode('human');
});

describe('parseArgv', () => {
    it('returns sensible defaults for an empty arg list', () => {
        const flags: CliFlags = parseArgv([]);
        expect(flags).toEqual({ stdin: false, jsonEvents: false });
    });

    it('parses --stdin and --json-events independently', () => {
        expect(parseArgv(['--stdin'])).toEqual({ stdin: true, jsonEvents: false });
        expect(parseArgv(['--json-events'])).toEqual({ stdin: false, jsonEvents: true });
    });

    it('parses --script with separate value and = form', () => {
        expect(parseArgv(['--script', 'plan.json'])).toEqual({
            stdin: false, jsonEvents: false, scriptPath: 'plan.json',
        });
        expect(parseArgv(['--script=plan.json'])).toEqual({
            stdin: false, jsonEvents: false, scriptPath: 'plan.json',
        });
    });

    it('parses all flags combined in any order', () => {
        expect(parseArgv(['--json-events', '--stdin', '--script=replay.json'])).toEqual({
            stdin: true, jsonEvents: true, scriptPath: 'replay.json',
        });
    });

    it('throws when --script has no value', () => {
        expect(() => parseArgv(['--script'])).toThrow(/requires a file path/);
        expect(() => parseArgv(['--script', '--stdin'])).toThrow(/requires a file path/);
    });

    it('throws on unknown flags', () => {
        expect(() => parseArgv(['--foo'])).toThrow(/Unknown CLI flag/);
    });
});

describe('prompt in script mode', () => {
    it('returns the next answer from the script array', async () => {
        setIoMode({ kind: 'script', answers: [{ a: 1 }, { b: 2 }] });
        const r1 = await prompt<{ a: number }>([]);
        const r2 = await prompt<{ b: number }>([]);
        expect(r1).toEqual({ a: 1 });
        expect(r2).toEqual({ b: 2 });
    });

    it('throws when the script runs out of answers', async () => {
        setIoMode({ kind: 'script', answers: [{ once: true }] });
        await prompt<{ once: boolean }>([]);
        await expect(prompt<{ never: true }>([])).rejects.toThrow(/script exhausted/);
    });
});

describe('emit', () => {
    it('writes one JSON line per event in json mode', () => {
        setOutputMode('json');
        const writes: string[] = [];
        const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
            writes.push(typeof chunk === 'string' ? chunk : chunk.toString());
            return true;
        });

        emit({ type: 'combat:started', payload: { enemy: 'disatree' } });
        emit({ type: 'world:moved' });

        expect(spy).toHaveBeenCalledTimes(2);
        expect(writes[0]).toBe('{"type":"combat:started","payload":{"enemy":"disatree"}}\n');
        expect(writes[1]).toBe('{"type":"world:moved"}\n');
    });

    it('writes a human one-liner in human mode', () => {
        setOutputMode('human');
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        emit({ type: 'combat:started' });
        expect(consoleSpy).toHaveBeenCalledWith('  [event] combat:started');
    });
});

describe('log', () => {
    it('routes to stderr in json mode so stdout stays machine-clean', () => {
        setOutputMode('json');
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        log('hello', 'world');
        expect(stderrSpy).toHaveBeenCalledWith('hello world\n');
    });

    it('uses console.log in human mode', () => {
        setOutputMode('human');
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        log('hello', 42);
        expect(consoleSpy).toHaveBeenCalledWith('hello', 42);
    });
});
