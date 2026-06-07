/**
 * Hermetic e2e — focus parser, matrix builder, and loadout builder.
 */

import { describe, it, expect } from 'vitest';

import { parseFocus, levelToBand, contentMatchesFocus } from '../focus.parser';
import {
    buildMatrix, DEFAULT_LEVELS, DEFAULT_PLAYSTYLES, DEFAULT_DIFFICULTIES,
} from '../matrix.builder';
import { buildLoadoutCharacter } from '../loadout.builder';

const CLOCK = new Date('2026-06-07T00:00:00Z');

describe('focus parser', () => {
    it('parses "effects since April" into category + date', () => {
        const f = parseFocus('focus on new status effects since April', CLOCK);
        expect(f.categories).toContain('effect');
        expect(f.addedAfter).toBe('2026-04-01');
    });

    it('parses "early-game enemy balance" into band + category', () => {
        const f = parseFocus('make sure the early-game enemies are balanced', CLOCK);
        expect(f.categories).toContain('enemy');
        expect(f.levelBands).toContain('early');
    });

    it('resolves "since December" to the previous year', () => {
        expect(parseFocus('since December', CLOCK).addedAfter).toBe('2025-12-01');
    });

    it('empty / blank focus yields an empty filter', () => {
        expect(parseFocus(undefined)).toEqual({});
        expect(parseFocus('   ')).toEqual({});
    });

    it('maps levels to bands', () => {
        expect(levelToBand(1)).toBe('early');
        expect(levelToBand(15)).toBe('early');
        expect(levelToBand(30)).toBe('mid');
        expect(levelToBand(50)).toBe('end');
    });

    it('contentMatchesFocus honors addedAfter and tags', () => {
        const focus = parseFocus('effects since April', CLOCK);
        expect(contentMatchesFocus({ category: 'effect', addedIn: '2026-05-01' }, focus)).toBe(true);
        expect(contentMatchesFocus({ category: 'effect', addedIn: '2026-01-01' }, focus)).toBe(false);
    });
});

describe('matrix builder', () => {
    it('produces level × playstyle × difficulty cells (48 by default)', () => {
        const plan = buildMatrix({ focus: {}, seed: 's' });
        expect(plan.cells.length).toBe(
            DEFAULT_LEVELS.length * DEFAULT_PLAYSTYLES.length * DEFAULT_DIFFICULTIES.length,
        );
        // Deterministic cell ids and enemy assignment.
        const plan2 = buildMatrix({ focus: {}, seed: 's' });
        expect(plan.cells.map(c => `${c.cellId}:${c.enemySlug}`))
            .toEqual(plan2.cells.map(c => `${c.cellId}:${c.enemySlug}`));
        expect(plan.cells.every(c => c.runs > 0)).toBe(true);
    });

    it('weights focused level bands higher and down-scales the rest', () => {
        const plan = buildMatrix({ focus: parseFocus('early-game enemies', CLOCK), seed: 's' });
        const early = plan.cells.filter(c => c.level <= 15);
        const late = plan.cells.filter(c => c.level > 15);
        expect(early.every(c => c.weight === 2)).toBe(true);
        expect(late.every(c => c.weight === 1)).toBe(true);
        expect(Math.max(...late.map(c => c.runs))).toBeLessThanOrEqual(Math.max(...early.map(c => c.runs)));
    });
});

describe('loadout builder', () => {
    it('builds a character whose base stats sum to level × 5 with gear and skills', () => {
        const plan = buildMatrix({ focus: {}, seed: 's', levels: [30], playstyles: ['strategist'], difficulties: ['normal'] });
        const cell = plan.cells[0]!;
        const ch = buildLoadoutCharacter(cell, () => 0.5);
        const sum = ch.baseStats.heart + ch.baseStats.body + ch.baseStats.mind;
        expect(sum).toBe(30 * 5);
        // Strategist is mind-biased.
        expect(ch.baseStats.mind).toBeGreaterThan(ch.baseStats.body);
        expect(Object.keys(ch.equipment).length).toBeGreaterThan(0);
        expect(ch.knownSkills.length).toBeGreaterThan(0);
    });

    it('is deterministic for a fixed rng', () => {
        const plan = buildMatrix({ focus: {}, seed: 's', levels: [15], playstyles: ['aggressive'], difficulties: ['easy'] });
        const cell = plan.cells[0]!;
        const a = buildLoadoutCharacter(cell, () => 0.5);
        const b = buildLoadoutCharacter(cell, () => 0.5);
        expect(a.baseStats).toEqual(b.baseStats);
        expect(a.knownSkills).toEqual(b.knownSkills);
    });
});
