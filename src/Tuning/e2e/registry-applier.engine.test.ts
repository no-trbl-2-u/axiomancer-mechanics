/**
 * Hermetic e2e — tunable registry + safe numeric applier.
 *
 * The registry test reads the REAL repo files (read-only) to prove every
 * locator resolves to a live numeric value. The applier tests mutate isolated
 * temp fixtures so the repo tree is never touched.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
    TUNABLE_REGISTRY, getTunable, listTunables, filterTunablesByFocus, clampCandidate,
} from '../tunable.registry';
import { readTunableValue, applyTunableValue, restoreBackup } from '../tunable.applier';
import { ENEMY_STAT_PER_LEVEL, ENEMY_GEAR_TIER_PER_LEVEL, SKILL_STAT_MULTIPLIER } from '../../Game/game-mechanics.constants';
import type { TunableParam } from '../types';

describe('tunable registry', () => {
    it('every locator resolves to a finite numeric value in its file', () => {
        for (const param of listTunables()) {
            const value = readTunableValue(param);
            expect(Number.isFinite(value), `${param.id} → ${value}`).toBe(true);
        }
    });

    it('resolved values match the live imported constants', () => {
        expect(readTunableValue(getTunable('enemy.statPerLevel')!)).toBe(ENEMY_STAT_PER_LEVEL);
        expect(readTunableValue(getTunable('enemy.gearTierPerLevel')!)).toBe(ENEMY_GEAR_TIER_PER_LEVEL);
        expect(readTunableValue(getTunable('combat.skillStatMultiplier')!)).toBe(SKILL_STAT_MULTIPLIER);
    });

    it('resolves a nested object-literal key path', () => {
        expect(readTunableValue(getTunable('combat.defense.advantage')!)).toBeGreaterThan(0);
    });

    it('resolves a JSON-data locator', () => {
        expect(readTunableValue(getTunable('effect.buff_regeneration.duration')!)).toBeGreaterThan(0);
    });

    it('resolves Phase 124 effect tunables', () => {
        // New tunables added in Phase 124
        expect(readTunableValue(getTunable('effect.tier1_heart_defend.healthPerRound')!)).toBe(2);
        expect(readTunableValue(getTunable('effect.tier1_body_attack.duration')!)).toBe(3);
        expect(readTunableValue(getTunable('effect.debuff_confusion.rollModifier')!)).toBe(-5);
        expect(readTunableValue(getTunable('effect.debuff_fear.rollModifier')!)).toBe(-4);
    });

    it('clampCandidate enforces bounds, magnitude cap, and step', () => {
        const param = getTunable('enemy.statPerLevel')!; // min 2 max 6 step .5 cap .25
        // Magnitude cap relative to current=3 is ±0.75.
        expect(clampCandidate(param, 100, 3)).toBeLessThanOrEqual(3.75);
        expect(clampCandidate(param, 0, 3)).toBeGreaterThanOrEqual(2.25);
        // Hard bounds dominate when current is near an edge.
        expect(clampCandidate(param, 100, 6)).toBeLessThanOrEqual(6);
        // Step snapping to 0.5.
        const v = clampCandidate(param, 3.3, 3);
        expect(Math.round(v * 2) / 2).toBe(v);
    });

    it('focus filtering narrows by category and date', () => {
        const onlyEffects = filterTunablesByFocus({ categories: ['effect'] });
        expect(onlyEffects.length).toBeGreaterThan(0);
        expect(onlyEffects.every(t => t.category === 'effect')).toBe(true);
        // Registry entries have no addedIn, so a date filter excludes all.
        expect(filterTunablesByFocus({ addedAfter: '2026-04-01' }).length).toBe(0);
    });
});

describe('tunable applier (isolated fixtures)', () => {
    const tmpFiles: string[] = [];
    const tmp = (name: string, content: string): string => {
        const p = path.join(os.tmpdir(), `tune-${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`);
        fs.writeFileSync(p, content, 'utf8');
        tmpFiles.push(p);
        return p;
    };
    afterEach(() => { for (const f of tmpFiles.splice(0)) fs.rmSync(f, { force: true }); });

    const makeParam = (file: string, over: Partial<TunableParam> = {}): TunableParam => ({
        id: 'fixture.value', kind: 'constant', category: 'fundamental', file,
        locator: { exportName: 'FIXTURE', keyPath: ['VALUE'] },
        min: 0, max: 100, step: 1, magnitudeCapPct: 0.5, tags: [], rationale: 'test',
        ...over,
    });

    it('mutates exactly the targeted TS numeric leaf and reads it back', () => {
        const file = tmp('consts.ts', 'export const FIXTURE = { VALUE: 10, OTHER: 10 } as const;\n');
        const param = makeParam(file);
        const res = applyTunableValue(param, 14);
        expect(res.ok).toBe(true);
        expect(res.newValue).toBe(14);
        const text = fs.readFileSync(file, 'utf8');
        expect(text).toContain('VALUE: 14');
        expect(text).toContain('OTHER: 10'); // sibling untouched
        expect(readTunableValue(param)).toBe(14);
    });

    it('clamps an out-of-cap proposal before writing', () => {
        const file = tmp('consts.ts', 'export const FIXTURE = { VALUE: 10 } as const;\n');
        const param = makeParam(file); // cap 0.5 of 10 = ±5
        const res = applyTunableValue(param, 999);
        expect(res.ok).toBe(true);
        expect(res.newValue).toBeLessThanOrEqual(15);
    });

    it('restoreBackup returns the file byte-for-byte', () => {
        const original = 'export const FIXTURE = { VALUE: 7 } as const;\n';
        const file = tmp('consts.ts', original);
        const res = applyTunableValue(makeParam(file), 9);
        expect(res.ok).toBe(true);
        restoreBackup(res.backup!);
        expect(fs.readFileSync(file, 'utf8')).toBe(original);
    });

    it('mutates a JSON record field and restores it', () => {
        const original = JSON.stringify({ buffs: [{ id: 'x', duration: 3 }] }, null, 2) + '\n';
        const file = tmp('lib.json', original);
        const param = makeParam(file, {
            kind: 'effect-duration',
            locator: { idField: 'id', id: 'x', field: ['duration'] },
            min: 1, max: 8, step: 1, magnitudeCapPct: 1,
        });
        const res = applyTunableValue(param, 5);
        expect(res.ok).toBe(true);
        expect(JSON.parse(fs.readFileSync(file, 'utf8')).buffs[0].duration).toBe(5);
        restoreBackup(res.backup!);
        expect(fs.readFileSync(file, 'utf8')).toBe(original);
    });

    it('refuses denylisted files (types.ts) and unresolvable locators', () => {
        const denied = tmp('types.ts', 'export const FIXTURE = { VALUE: 1 } as const;\n');
        expect(applyTunableValue(makeParam(denied), 2).ok).toBe(false);

        const file = tmp('consts.ts', 'export const FIXTURE = { VALUE: 1 } as const;\n');
        const badLocator = makeParam(file, { locator: { exportName: 'NOPE', keyPath: ['VALUE'] } });
        expect(applyTunableValue(badLocator, 2).ok).toBe(false);
    });

    it('never leaves the real registry files dirty (round-trip a real tunable)', () => {
        const param = getTunable('effect.buff_regeneration.duration')!;
        const before = readTunableValue(param);
        const res = applyTunableValue(param, before + 1);
        try {
            expect(res.ok).toBe(true);
        } finally {
            if (res.backup) restoreBackup(res.backup);
        }
        expect(readTunableValue(param)).toBe(before);
    });
});

// Registry sanity: every entry has sane bounds.
describe('registry invariants', () => {
    it('min < max and magnitudeCapPct in (0,1] for every entry', () => {
        for (const p of TUNABLE_REGISTRY) {
            expect(p.min).toBeLessThan(p.max);
            expect(p.magnitudeCapPct).toBeGreaterThan(0);
            expect(p.magnitudeCapPct).toBeLessThanOrEqual(1);
        }
    });
});
