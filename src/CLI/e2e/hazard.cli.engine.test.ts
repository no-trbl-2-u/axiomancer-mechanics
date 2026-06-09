/**
 * Hermetic e2e — Hazard mini-game CLI (`src/CLI/hazard.cli.ts`).
 *
 * Unlike game.cli.ts (which trips over inquirer/ESM under child_process), the
 * hazard driver is plain async functions over the deterministic hazard engine,
 * so we can drive it in-process:
 *   - flag parsing is pure;
 *   - `--auto --seed` produces a reproducible playthrough (asserted via the
 *     `--state-log` JSONL trace);
 *   - `--script` manual play exercises the warn-and-skip illegal-action path,
 *     which must log an `illegalHazardAction` record with a state snapshot.
 */

import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';

import { parseHazardArgv, runHazardCli } from '../hazard.cli';

const tmpFiles: string[] = [];
function tmpPath(suffix: string, ext = 'jsonl'): string {
    const p = path.join(os.tmpdir(), `axiomancer-${suffix}-${randomUUID()}.${ext}`);
    tmpFiles.push(p);
    return p;
}

function readLog(p: string): Array<Record<string, any>> {
    return fs.readFileSync(p, 'utf-8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
}

afterEach(() => {
    tmpFiles.forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
    tmpFiles.length = 0;
});

describe('Hazard CLI — flag parsing', () => {
    it('parses hazard-specific and shared io flags', () => {
        const flags = parseHazardArgv([
            '--hazard', 'H03', '--route', 'bottom', '--auto',
            '--seed', '99', '--runs', '4',
            '--json-events', '--state-log', 'log.jsonl',
        ]);
        expect(flags).toMatchObject({
            hazardId: 'H03', route: 'bottom', auto: true,
            seed: '99', runs: 4, jsonEvents: true, stateLogPath: 'log.jsonl',
        });
    });

    it('supports --flag=value form and sensible defaults', () => {
        const flags = parseHazardArgv(['--hazard=H01']);
        expect(flags.hazardId).toBe('H01');
        expect(flags.runs).toBe(5);          // default
        expect(flags.auto).toBe(false);      // default
        expect(flags.route).toBeUndefined(); // prompts when omitted
    });

    it('rejects a bad --route value', () => {
        expect(() => parseHazardArgv(['--route', 'sideways'])).toThrow(/--route/);
    });

    it('rejects a non-positive --runs value', () => {
        expect(() => parseHazardArgv(['--runs', '0'])).toThrow(/--runs/);
    });

    it('rejects unknown flags', () => {
        expect(() => parseHazardArgv(['--nope'])).toThrow(/Unknown hazard CLI flag/);
    });
});

describe('Hazard CLI — deterministic auto playthrough', () => {
    it('produces a reproducible final score for a fixed seed', async () => {
        const runOnce = async () => {
            const logPath = tmpPath('auto');
            await runHazardCli([
                '--auto', '--seed', '42', '--runs', '1',
                '--hazard', 'H01', '--route', 'top',
                '--json-events', '--state-log', logPath,
            ]);
            const final = readLog(logPath).find(r => r.action === 'computeFinalScore');
            expect(final).toBeDefined();
            return final!.event as { finalScore: number; marks: string; route: string };
        };

        const a = await runOnce();
        const b = await runOnce();

        // Same seed → identical outcome.
        expect(a.finalScore).toBe(b.finalScore);
        expect(a.marks).toBe(b.marks);
        // Locked expected value for H01/top under seed 42.
        expect(a.route).toBe('top');
        expect(a.marks).toBe('OOX');
        expect(a.finalScore).toBe(1);
    });

    it('plays --runs N encounters back-to-back', async () => {
        const logPath = tmpPath('runs');
        await runHazardCli([
            '--auto', '--seed', '5', '--runs', '3',
            '--hazard', 'H02', '--route', 'bottom',
            '--json-events', '--state-log', logPath,
        ]);
        const finals = readLog(logPath).filter(r => r.action === 'computeFinalScore');
        expect(finals).toHaveLength(3);
    });
});

describe('Hazard CLI — illegal action handling', () => {
    it('warns, skips, and logs an unaffordable bottom-action play', async () => {
        // Seed 1 / H01 deals dice [blue,blue,blue,yellow] with A02 (Quick
        // Sprint) in hand. A02's bottom action costs green — unaffordable —
        // so choosing it is a deterministic illegal action.
        const scriptPath = tmpPath('script', 'json');
        fs.writeFileSync(scriptPath, JSON.stringify([
            { pick: '4' },        // A02 (index 4 in the round-1 hand)
            { side: 'bottom' },   // its green-costed bottom action — unaffordable
            { pick: 'resolve' },  // stop round 1
            { pick: 'resolve' },  // round 2
            { pick: 'resolve' },  // round 3
        ]));

        const logPath = tmpPath('illegal');
        await runHazardCli([
            '--seed', '1', '--runs', '1',
            '--hazard', 'H01', '--route', 'top',
            '--script', scriptPath, '--json-events', '--state-log', logPath,
        ]);

        const illegal = readLog(logPath).filter(r => r.action === 'illegalHazardAction');
        expect(illegal).toHaveLength(1);
        const record = illegal[0]!;
        // The attempted action is captured for tuning…
        expect(record.event.attempted).toMatchObject({ kind: 'playCard', cardId: 'A02', useBottom: true });
        expect(record.event.error).toMatch(/afford/i);
        // …along with a full hazard-state snapshot.
        expect(record.event.hazardState.phase).toBe('round-play');
        expect(Array.isArray(record.event.hazardState.mana)).toBe(true);
        // The run still completes despite the skipped illegal play.
        const final = readLog(logPath).find(r => r.action === 'computeFinalScore');
        expect(final).toBeDefined();
    });
});
