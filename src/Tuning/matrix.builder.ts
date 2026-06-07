/**
 * Matrix builder — enumerates the (level × playstyle × difficulty) test cells
 * and assigns a level-appropriate enemy to each. Run counts are scaled by the
 * focus directive (focused cells get more runs / weight).
 */

import { ENEMY_REGISTRY, type EnemySlug } from '../Enemy/enemy.library';
import type { PlaytestPolicy } from '../Playtest/types';
import type { Difficulty, FocusFilter, MatrixCell, MatrixPlan } from './types';
import { levelToBand } from './focus.parser';

export const DEFAULT_LEVELS = [1, 15, 30, 50];
export const DEFAULT_PLAYSTYLES: PlaytestPolicy[] = ['aggressive', 'defensive', 'mixed', 'strategist'];
export const DEFAULT_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
export const DEFAULT_BASE_RUNS = 50;

interface BuildMatrixOptions {
    levels?: number[];
    playstyles?: PlaytestPolicy[];
    difficulties?: Difficulty[];
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
 * player level; falls back to the nearest-level enemy overall.
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

function cellMatchesFocus(level: number, focus: FocusFilter): boolean {
    if (!focus.levelBands?.length) return true;
    return focus.levelBands.includes(levelToBand(level));
}

export function buildMatrix(opts: BuildMatrixOptions): MatrixPlan {
    const levels = opts.levels ?? DEFAULT_LEVELS;
    const playstyles = opts.playstyles ?? DEFAULT_PLAYSTYLES;
    const difficulties = opts.difficulties ?? DEFAULT_DIFFICULTIES;
    const baseRuns = opts.baseRuns ?? DEFAULT_BASE_RUNS;
    const focus = opts.focus;
    const sampleScale = focus.sampleScale ?? 1;

    const cells: MatrixCell[] = [];
    for (const level of levels) {
        for (const playstyle of playstyles) {
            for (const difficulty of difficulties) {
                const cellId = `l${level}-${playstyle}-${difficulty}`;
                const focused = cellMatchesFocus(level, focus);
                // Focused cells get the scaled run count; unfocused cells stay
                // at baseline (when a focus is present) or full (when not).
                const scale = focus.levelBands?.length
                    ? (focused ? sampleScale : 0.5)
                    : sampleScale;
                const runs = Math.max(1, Math.round(baseRuns * scale));
                cells.push({
                    cellId,
                    level,
                    playstyle,
                    difficulty,
                    enemySlug: pickEnemyForCell(level, difficulty, cellId),
                    runs,
                    weight: focused ? 2 : 1,
                });
            }
        }
    }

    return { cells, baseSeed: opts.seed, focus };
}
