/**
 * Focus parser — turns a free-text `--focus` directive into a structured
 * `FocusFilter` that weights matrix cells and narrows the tunable registry.
 *
 * Deterministic: date resolution ("since April") takes an injectable clock so
 * tests are hermetic. No LLM here — keyword + light date parsing only.
 */

import type { PlaytestPolicy } from '../Playtest/types';
import { TUNING_CATEGORIES, type Difficulty, type FocusFilter, type LevelBand, type TuningCategory } from './types';

const CATEGORY_KEYWORDS: [RegExp, TuningCategory][] = [
    [/\b(effects?|status[\s-]?effects?|buffs?|debuffs?)\b/, 'effect'],
    [/\b(enem(y|ies)|monsters?|foes?|encounters?)\b/, 'enemy'],
    [/\b(items?|gear|equipment|weapons?|armou?r|affix(es)?|modifiers?)\b/, 'item'],
    [/\b(skills?|abilit(y|ies)|fallac(y|ies)|paradox(es)?)\b/, 'skill'],
    [/\b(loot|drops?|drop[\s-]?rates?)\b/, 'loot'],
    [/\b(fundamentals?|core[\s-]?mechanics?|multipliers?|formula)\b/, 'fundamental'],
];

/** Playstyle focus — weights matching matrix cells (e.g. `--focus="strategist"`). */
const PLAYSTYLE_KEYWORDS: [RegExp, PlaytestPolicy][] = [
    [/\baggressive\b/, 'aggressive'],
    [/\bdefensive\b/, 'defensive'],
    [/\bmixed\b/, 'mixed'],
    [/\bstrategist\b/, 'strategist'],
];

/** Difficulty focus — weights matching matrix cells (e.g. `--focus="hard fights"`). */
const DIFFICULTY_KEYWORDS: [RegExp, Difficulty][] = [
    [/\beasy\b/, 'easy'],
    [/\bnormal\b/, 'normal'],
    [/\bhard\b/, 'hard'],
];

const LEVEL_BAND_KEYWORDS: [RegExp, LevelBand][] = [
    [/\bearly([\s-]?game)?\b/, 'early'],
    [/\bmid([\s-]?game)?\b/, 'mid'],
    [/\blate([\s-]?game)?\b/, 'late'],
    [/\b(end([\s-]?game)?|endgame)\b/, 'end'],
];

const MONTHS: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function uniq<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
}

/**
 * Resolve a "since <month>[ <year>]" clause to an ISO `YYYY-MM-01` date.
 * Without an explicit year, picks the most recent past occurrence relative to
 * `now` (so on 2026-06-07, "since April" → 2026-04-01; "since December" →
 * 2025-12-01).
 */
function resolveSinceDate(raw: string, now: Date): string | undefined {
    const m = raw.match(/\bsince\s+([a-z]+)(?:\s+(\d{4}))?/i);
    if (!m) return undefined;
    const monthName = m[1]!.toLowerCase();
    const month = MONTHS[monthName];
    if (!month) return undefined;
    let year = m[2] ? Number(m[2]) : now.getUTCFullYear();
    if (!m[2] && month > now.getUTCMonth() + 1) year -= 1;
    return `${year}-${String(month).padStart(2, '0')}-01`;
}

/**
 * Parse a `--focus` string. Returns an empty filter (test-everything) for
 * undefined / blank input.
 */
export function parseFocus(raw: string | undefined, now: Date = new Date()): FocusFilter {
    if (!raw || !raw.trim()) return {};
    const text = raw.toLowerCase();
    const filter: FocusFilter = { raw };

    const categories: (TuningCategory | PlaytestPolicy)[] = [
        ...CATEGORY_KEYWORDS.filter(([re]) => re.test(text)).map(([, c]) => c),
        ...PLAYSTYLE_KEYWORDS.filter(([re]) => re.test(text)).map(([, p]) => p),
    ];
    if (categories.length) filter.categories = uniq(categories);

    const difficulties = DIFFICULTY_KEYWORDS.filter(([re]) => re.test(text)).map(([, d]) => d);
    if (difficulties.length) filter.difficulties = uniq(difficulties);

    const bands = LEVEL_BAND_KEYWORDS.filter(([re]) => re.test(text)).map(([, b]) => b);
    if (bands.length) filter.levelBands = uniq(bands);

    const addedAfter = resolveSinceDate(text, now);
    if (addedAfter) filter.addedAfter = addedAfter;

    if (/\b(thorough|deep|exhaustive|rigorous)\b/.test(text)) filter.sampleScale = 2;
    else if (/\b(quick|smoke|fast|shallow)\b/.test(text)) filter.sampleScale = 0.5;

    return filter;
}

/** Map a player level to its coarse band — used by the matrix builder. */
export function levelToBand(level: number): LevelBand {
    if (level <= 15) return 'early';
    if (level <= 35) return 'mid';
    if (level <= 49) return 'late';
    return 'end';
}

/**
 * Does a content entry's provenance satisfy the focus? Used to weight matrix
 * cells and to filter content lists. An empty focus matches everything.
 */
export function contentMatchesFocus(
    meta: { addedIn?: string; tags?: string[]; category?: TuningCategory },
    focus: FocusFilter,
): boolean {
    // Playstyle entries in `categories` weight MATRIX cells, not registry
    // content — only registry categories narrow the tunable list, so a
    // `--focus="strategist"` run doesn't empty the registry.
    const registryCategories = (focus.categories ?? []).filter(
        (c): c is TuningCategory => (TUNING_CATEGORIES as readonly string[]).includes(c),
    );
    if (registryCategories.length && meta.category && !registryCategories.includes(meta.category)) {
        return false;
    }
    if (focus.tags?.length && !(meta.tags ?? []).some(t => focus.tags!.includes(t))) {
        return false;
    }
    if (focus.addedAfter) {
        if (!meta.addedIn || meta.addedIn < focus.addedAfter) return false;
    }
    return true;
}
