/**
 * Experiment ledger — the loop's memory.
 *
 * Without it the heuristic re-proposes the same rejected nudge every tick
 * forever (the balance-analyst doc forbids re-proposing rejected changes, but
 * nothing enforced it). The ledger persists every A/B outcome so candidate
 * generation can skip a (param, direction) the loop recently tried and the
 * matrix rejected — until new evidence justifies revisiting it.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ExperimentLedger, ExperimentResult, LedgerEntry } from './types';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
// Sibling of strategist-knowledge.json (machine state lives directly under
// automation/playtest/; reports/ git-ignores *.json, so the ledger can't live
// there). Committed each tick so the loop's memory survives across runs.
export const DEFAULT_LEDGER_PATH = path.join(
    REPO_ROOT, 'automation', 'playtest', 'tuning-ledger.json',
);

/** How many most-recent ticks a rejected direction stays on cooldown. */
export const DEFAULT_COOLDOWN = 2;

export function emptyLedger(): ExperimentLedger {
    return { entries: [], updatedAt: new Date(0).toISOString() };
}

export function loadLedger(filePath: string = DEFAULT_LEDGER_PATH): ExperimentLedger {
    try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ExperimentLedger;
        if (parsed && Array.isArray(parsed.entries)) return parsed;
    } catch {
        /* missing / unreadable → fresh */
    }
    return emptyLedger();
}

export function saveLedger(ledger: ExperimentLedger, filePath: string = DEFAULT_LEDGER_PATH): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
}

function directionOf(oldValue: number, newValue: number): 'up' | 'down' {
    return newValue >= oldValue ? 'up' : 'down';
}

/** Append this tick's experiments to the ledger (mutates + returns it). */
export function recordExperiments(
    ledger: ExperimentLedger,
    experiments: ExperimentResult[],
    meta: { timestamp: string; focus?: string },
): ExperimentLedger {
    for (const e of experiments) {
        if (!Number.isFinite(e.oldValue) || !Number.isFinite(e.newValue)) continue;
        const entry: LedgerEntry = {
            timestamp: meta.timestamp,
            paramId: e.paramId,
            oldValue: e.oldValue,
            newValue: e.newValue,
            direction: directionOf(e.oldValue, e.newValue),
            deltaHealth: e.comparison.delta,
            kept: e.kept,
            significant: e.comparison.significant,
            confidence: e.comparison.confidence,
            focus: meta.focus,
        };
        ledger.entries.push(entry);
    }
    ledger.updatedAt = new Date().toISOString();
    return ledger;
}

/**
 * The set of `${paramId}:${direction}` that were tried and REJECTED within the
 * last `cooldown` distinct ticks (keyed by timestamp). A direction that was
 * later kept clears its own cooldown.
 */
export function cooldownDirections(
    ledger: ExperimentLedger,
    cooldown: number = DEFAULT_COOLDOWN,
): Set<string> {
    const ticks = [...new Set(ledger.entries.map(e => e.timestamp))].sort();
    const recent = new Set(ticks.slice(-cooldown));
    const rejected = new Set<string>();
    const kept = new Set<string>();
    for (const e of ledger.entries) {
        if (!recent.has(e.timestamp)) continue;
        const key = `${e.paramId}:${e.direction}`;
        if (e.kept) kept.add(key);
        else rejected.add(key);
    }
    for (const k of kept) rejected.delete(k);
    return rejected;
}
