/**
 * Matrix builder — enumerates the (level × playstyle × difficulty) test cells
 * and assigns a level-appropriate enemy to each. Run counts are scaled by the
 * focus directive (focused cells get more runs / weight), enemy assignment is
 * seed-dependent (same seed ⇒ same matrix; new seed ⇒ fresh opponents), and
 * every cell carries its per-difficulty target band.
 */

import { ENEMY_REGISTRY, type EnemySlug } from '../Enemy/enemy.library';
import type { PlaytestPolicy } from '../Playtest/types';
import type { Difficulty, FocusFilter, MatrixCell, MatrixPlan } from './types';
import { bandFor } from './difficulty.bands';
import { levelToBand } from './focus.parser';

/**
 * Default matrix levels — early + mid game (≤ L30). End-game (L50) is omitted
 * by default while base mechanics are still being built, so the loop spends its
 * signal on the band the game is actually being shaped in rather than against
 * placeholder late-game content. Re-include it explicitly with `--levels=…,50`
 * once end-game content solidifies.
 */
export const DEFAULT_LEVELS = [1, 15, 30];
export const DEFAULT_PLAYSTYLES: PlaytestPolicy[] = ['aggressive', 'defensive', 'mixed', 'strategist'];
export const DEFAULT_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
export const DEFAULT_BASE_RUNS = 50;

interface BuildMatrixOptions {
    levels?: readonly number[];
    playstyles?: readonly PlaytestPolicy[];
    difficulties?: readonly Difficulty[];
    baseRuns?: number;
    focus: FocusFilter;
    seed: string;
}

/** Deterministic small hash for stable enemy selection per cell. */
function hash(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

const ALL_SLUGS = Object.keys(ENEMY_REGISTRY) as EnemySlug[];

const BAND_TAG: Record<string, string> = {
    early: 'early-game',
    mid: 'mid-game',
    late: 'late-game',
    end: 'late-game',
};

/**
 * Pick a deterministic, level-appropriate enemy slug for a cell. Prefers
 * enemies tagged for the level band whose `level` is within range of the
 * player level; falls back to the nearest-level enemy overall. The `key`
 * carries the plan seed, so a new seed reshuffles opponents while the same
 * seed reproduces the matrix exactly.
 */
export function pickEnemyForCell(level: number, difficulty: Difficulty, key: string): EnemySlug {
    const band = levelToBand(level);
    const bandTag = BAND_TAG[band];
    const tagged = ALL_SLUGS.filter(slug => ENEMY_REGISTRY[slug].tags?.includes(bandTag));
    const pool = tagged.length > 0 ? tagged : ALL_SLUGS;

    // Difficulty preference: easy → lower-threat (simple/normal), hard → elite/boss.
    const diffPref: Record<Difficulty, string[]> = {
        easy: ['simple', 'normal'],
        normal: ['normal', 'elite'],
        hard: ['elite', 'boss'],
    };
    const preferred = pool.filter(slug =>
        diffPref[difficulty].includes(ENEMY_REGISTRY[slug].difficulty ?? 'normal'),
    );
    const finalPool = preferred.length > 0 ? preferred : pool;
    const sorted = [...finalPool].sort((a, b) => a.localeCompare(b));
    return sorted[hash(key) % sorted.length]!;
}

/**
 * Multiplicative cell weight from the focus directive. Each matching axis
 * doubles the weight, so a cell matching playstyle AND difficulty weighs 4×.
 * An empty focus leaves every cell at exactly 1.
 */
function cellWeight(
    playstyle: PlaytestPolicy,
    difficulty: Difficulty,
    level: number,
    focus: FocusFilter,
): number {
    let weight = 1;
    if (focus.categories?.some(c => c === playstyle)) weight *= 2;
    if (focus.difficulties?.includes(difficulty)) weight *= 2;
    if (focus.levelBands?.length && focus.levelBands.includes(levelToBand(level))) weight *= 2;
    return weight;
}

export function buildMatrix(opts: BuildMatrixOptions): MatrixPlan {
    const levels = opts.levels ?? DEFAULT_LEVELS;
    const playstyles = opts.playstyles ?? DEFAULT_PLAYSTYLES;
    const difficulties = opts.difficulties ?? DEFAULT_DIFFICULTIES;
    const baseRuns = opts.baseRuns ?? DEFAULT_BASE_RUNS;
    if (levels.length === 0) throw new Error('buildMatrix: levels must be non-empty');
    if (playstyles.length === 0) throw new Error('buildMatrix: playstyles must be non-empty');
    if (difficulties.length === 0) throw new Error('buildMatrix: difficulties must be non-empty');
    const focus = opts.focus;
    const sampleScale = focus.sampleScale ?? 1;

    const cells: MatrixCell[] = [];
    for (const level of levels) {
        for (const playstyle of playstyles) {
            for (const difficulty of difficulties) {
                const cellId = `L${level}-${playstyle}-${difficulty}`;
                const weight = cellWeight(playstyle, difficulty, level, focus);
                // Focused cells get proportionally more runs; an empty focus
                // leaves every cell at baseRuns × sampleScale.
                const runs = Math.max(1, Math.round(baseRuns * sampleScale * weight));
                cells.push({
                    cellId,
                    level,
                    playstyle,
                    difficulty,
                    enemySlug: pickEnemyForCell(level, difficulty, `${opts.seed}|${cellId}`),
                    runs,
                    weight,
                    band: bandFor(difficulty),
                });
            }
        }
    }

    return {
        cells,
        baseSeed: opts.seed,
        focus,
        metadata: {
            levels: [...levels],
            playstyles: [...playstyles],
            difficulties: [...difficulties],
            baseRuns,
            seed: opts.seed,
        },
    };
}
