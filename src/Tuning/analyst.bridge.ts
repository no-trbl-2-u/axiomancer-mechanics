/**
 * Analyst bridge — the seam where balance recommendations are produced.
 *
 * Three sources of candidates, in ascending order of intelligence:
 *   1. Heuristic (this file) — generalized, doctrine-aware nudges. Uses each
 *      registry knob's declared direction hint to push EVERY focus-filtered knob
 *      the corrective way (not just the two headline ones), corrects low
 *      status-effect engagement first, and skips (param, direction) pairs the
 *      ledger says were recently rejected.
 *   2. API (optional) — Claude Messages API, given a rich per-cell briefing.
 *   3. File (`validateCandidates`, wired in the CLI via `--candidates`) — the
 *      `balance-analyst` subagent's structured output, so the SMART analyst can
 *      finally move numbers instead of only writing prose.
 *
 * Node always returns a usable candidate set; the API and the subagent are
 * quality upgrades, never hard dependencies.
 */

import type {
    Candidate,
    CellResult,
    FocusFilter,
    HealthScore,
    TunableParam,
} from './types';

export interface AnalystRequest {
    baseline: HealthScore;
    cells: CellResult[];
    focus: FocusFilter;
    /** Focus-filtered registry — the only params eligible for auto-apply. */
    tunables: TunableParam[];
    /** Current on-disk value per tunable id. */
    currentValues: Record<string, number>;
    /** `${paramId}:${'up'|'down'}` pairs on cooldown after recent rejection. */
    cooldown?: Set<string>;
}

export interface AnalystResponse {
    candidates: Candidate[];
    proposeOnly: { paramId?: string; summary: string; rationale: string }[];
    reasoning: string;
    mode: 'api' | 'heuristic';
}

export interface AnalystOptions {
    useApi?: boolean;
    model?: string;
    /** Injectable fetch for testing the API path without real network. */
    fetchImpl?: typeof fetch;
    apiKey?: string;
}

/** Act on difficulty only when the band term carries real signal. */
const BAND_ACTION_THRESHOLD = 0.001;
/** Margin below the floor before the heuristic chases engagement. */
const ENGAGEMENT_ACTION_MARGIN = 0.02;

function stepFor(param: TunableParam, cur: number): number {
    return param.step ?? Math.max(1, Math.abs(cur) * 0.1);
}

/** Signed difficulty signal: >0 ⇒ too hard overall, <0 ⇒ too easy. */
function difficultySignal(baseline: HealthScore): number {
    return baseline.perCell.reduce((sum, c) => {
        if (c.resolutionSuccessRate < c.band.low) return sum + c.weight;
        if (c.resolutionSuccessRate > c.band.high) return sum - c.weight;
        return sum;
    }, 0);
}

/** Worst (highest combined deviation) cells, for propose-only structural notes. */
function worstCells(baseline: HealthScore, n: number): HealthScore['perCell'] {
    return [...baseline.perCell].sort((a, b) => b.deviation - a.deviation).slice(0, n);
}

/**
 * Offline heuristic candidate generation. Engagement is corrected first (the
 * north star), then difficulty; both use declared direction hints so the loop
 * can tune any registered knob, not only enemy scaling and player HP.
 */
export function heuristicRecommendations(req: AnalystRequest): AnalystResponse {
    const { baseline, tunables, currentValues } = req;
    const cooldown = req.cooldown ?? new Set<string>();
    const candidates: Candidate[] = [];
    const proposeOnly: AnalystResponse['proposeOnly'] = [];
    const chosen = new Map<string, Candidate>(); // paramId → candidate (engagement wins ties)
    const onCooldown: string[] = [];

    const propose = (id: string, increase: boolean, why: string, kind: 'engagement' | 'difficulty'): void => {
        const param = tunables.find(t => t.id === id);
        const cur = currentValues[id];
        if (!param || typeof cur !== 'number') return;
        const dir = increase ? 'up' : 'down';
        if (cooldown.has(`${id}:${dir}`)) { onCooldown.push(`${id}:${dir}`); return; }
        const value = increase ? cur + stepFor(param, cur) : cur - stepFor(param, cur);
        if (value === cur) return;
        // Engagement-driven proposals take precedence over difficulty ones.
        const existing = chosen.get(id);
        if (existing && kind !== 'engagement') return;
        chosen.set(id, { paramId: id, proposedValue: value, rationale: why, source: 'heuristic' });
    };

    // ── Engagement correction (doctrine first) ──────────────────────────────
    const eng = baseline.meanEngagement;
    const floor = baseline.engagementFloor;
    const engagementLow = eng < floor - ENGAGEMENT_ACTION_MARGIN;
    if (engagementLow) {
        for (const t of tunables) {
            const hint = t.effect?.engagement;
            if (hint !== 'raises' && hint !== 'lowers') continue;
            propose(t.id, /* increase */ hint === 'raises',
                `Raise status-effect engagement (mean ${(eng * 100).toFixed(0)}% < floor ${(floor * 100).toFixed(0)}%): ${t.rationale}`,
                'engagement');
        }
    }

    // ── Difficulty correction ───────────────────────────────────────────────
    const signal = difficultySignal(baseline);
    const tooHard = signal > 0;
    const tooEasy = signal < 0;
    const actOnDifficulty = baseline.aggregateBand > BAND_ACTION_THRESHOLD && (tooHard || tooEasy);
    if (actOnDifficulty) {
        const makeEasier = tooHard;
        for (const t of tunables) {
            const hint = t.effect?.difficulty;
            if (hint !== 'raises' && hint !== 'lowers') continue;
            // makeEasier: lower knobs that raise difficulty, raise knobs that lower it.
            const increase = makeEasier ? hint === 'lowers' : hint === 'raises';
            propose(t.id, increase,
                `${makeEasier ? 'Reduce' : 'Increase'} difficulty (${tooHard ? 'too hard' : 'too easy'}; band term ${baseline.aggregateBand.toFixed(4)}): ${t.rationale}`,
                'difficulty');
        }
    } else if (!engagementLow) {
        proposeOnly.push({
            summary: 'Matrix is within band and status-effect engagement is healthy.',
            rationale: baseline.summary,
        });
    }

    // Engagement candidates first (north star), then difficulty.
    const engIds = new Set(
        engagementLow
            ? tunables.filter(t => t.effect?.engagement === 'raises' || t.effect?.engagement === 'lowers').map(t => t.id)
            : [],
    );
    for (const [, c] of chosen) {
        if (engIds.has(c.paramId)) candidates.push(c);
    }
    for (const [, c] of chosen) {
        if (!engIds.has(c.paramId)) candidates.push(c);
    }

    // ── Propose-only context ────────────────────────────────────────────────
    for (const key of onCooldown) {
        proposeOnly.push({
            paramId: key.split(':')[0],
            summary: `Skipped ${key} (on cooldown after a recent rejection).`,
            rationale: 'The ledger shows this direction was tried and rejected recently; revisit only with new evidence.',
        });
    }
    for (const cell of worstCells(baseline, 3)) {
        if (cell.deviation === 0) continue;
        const engNote = typeof cell.engagementShare === 'number' && cell.engagementShare < floor
            ? ` · engagement ${(cell.engagementShare * 100).toFixed(0)}% below floor`
            : '';
        proposeOnly.push({
            summary: `Cell ${cell.cellId} is off-band (resolution ${(cell.resolutionSuccessRate * 100).toFixed(0)}%, defeat ${(cell.defeatRate * 100).toFixed(0)}%${engNote}).`,
            rationale: 'Inspect this matchup\'s enemy/loadout/effect content; may need a targeted (non-numeric) change.',
        });
    }
    for (const t of tunables) {
        if (chosen.has(t.id)) continue;
        if (t.effect?.difficulty || t.effect?.engagement) continue; // had a usable hint, just not triggered
        proposeOnly.push({
            paramId: t.id,
            summary: `Focus tunable ${t.id} (current ${currentValues[t.id]}) has no declared direction.`,
            rationale: `${t.rationale} Direction of improvement is ambiguous; probe or review before tuning.`,
        });
    }

    return {
        candidates,
        proposeOnly,
        reasoning: `Heuristic: mean engagement ${(eng * 100).toFixed(1)}% (floor ${(floor * 100).toFixed(0)}%), difficulty signal ${signal} (${tooHard ? 'too hard' : tooEasy ? 'too easy' : 'balanced'}); ${candidates.length} candidate(s).`,
        mode: 'heuristic',
    };
}

const API_URL = 'https://api.anthropic.com/v1/messages';

/** A compact per-cell briefing so the API path isn't blind to the matrix. */
function buildApiPrompt(req: AnalystRequest): string {
    const legalIds = req.tunables.map(t =>
        `${t.id} (current=${req.currentValues[t.id]}, min=${t.min}, max=${t.max}`
        + `${t.effect?.difficulty ? `, raising→difficulty ${t.effect.difficulty}` : ''}`
        + `${t.effect?.engagement ? `, raising→engagement ${t.effect.engagement}` : ''})`);
    const cellLines = req.baseline.perCell.map(c =>
        `  ${c.cellId} [${c.difficulty}]: resolution ${(c.resolutionSuccessRate * 100).toFixed(0)}% `
        + `(band ${(c.band.low * 100).toFixed(0)}-${(c.band.high * 100).toFixed(0)}%), `
        + `defeat ${(c.defeatRate * 100).toFixed(0)}%, `
        + `engagement ${typeof c.engagementShare === 'number' ? `${(c.engagementShare * 100).toFixed(0)}%` : 'n/a'}`);
    return [
        'You are a game-balance analyst for a turn-based RPG whose DOCTRINE is:',
        'status effects are the main fun in combat encounters. Combat collapsing into basic-attack',
        `trades is a failure even if win rates look fine. Engagement floor: ${(req.baseline.engagementFloor * 100).toFixed(0)}%.`,
        '',
        `Aggregate health: ${req.baseline.summary}.`,
        'Per-cell (success bands are difficulty-specific):',
        ...cellLines,
        '',
        'You may ONLY propose changes to these parameter ids:',
        ...legalIds.map(s => `  - ${s}`),
        '',
        'Prefer changes that raise status-effect engagement where it is below the',
        'floor, then changes that pull off-band cells toward their band.',
        'Respond with STRICT JSON only, shape:',
        '{"candidates":[{"paramId":"...","proposedValue":<number>,"rationale":"..."}],"proposeOnly":[{"summary":"...","rationale":"..."}]}',
    ].join('\n');
}

/**
 * Validate raw candidate records (e.g. from the balance-analyst subagent's
 * file) against the legal registry ids. Drops anything not finite or not a
 * registered tunable; the experiment runner applies the magnitude cap/bounds.
 */
export function validateCandidates(raw: unknown, tunables: TunableParam[]): Candidate[] {
    const legal = new Set(tunables.map(t => t.id));
    const list = Array.isArray(raw) ? raw : Array.isArray((raw as { candidates?: unknown[] })?.candidates)
        ? (raw as { candidates: unknown[] }).candidates : [];
    const out: Candidate[] = [];
    for (const item of list) {
        const c = item as { paramId?: unknown; proposedValue?: unknown; rationale?: unknown };
        if (typeof c.paramId === 'string' && legal.has(c.paramId) && Number.isFinite(c.proposedValue)) {
            out.push({
                paramId: c.paramId,
                proposedValue: Number(c.proposedValue),
                rationale: typeof c.rationale === 'string' ? c.rationale : 'Analyst recommendation.',
                source: 'analyst',
            });
        }
    }
    return out;
}

/**
 * Request recommendations. API path when enabled and reachable; otherwise the
 * deterministic offline heuristic. Always resolves (never throws).
 */
export async function requestRecommendations(
    req: AnalystRequest,
    opts: AnalystOptions = {},
): Promise<AnalystResponse> {
    const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
    const fetchImpl = opts.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);

    if (opts.useApi && apiKey && fetchImpl) {
        try {
            const res = await fetchImpl(API_URL, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: opts.model ?? process.env.TUNING_MODEL ?? 'claude-sonnet-4-6',
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: buildApiPrompt(req) }],
                }),
            });
            if (!res.ok) throw new Error(`API ${res.status}`);
            const data = await res.json() as { content?: { text?: string }[] };
            const text = data.content?.map(c => c.text ?? '').join('') ?? '';
            const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
            const candidates = validateCandidates(json.candidates, req.tunables)
                .map(c => ({ ...c, source: 'api' as const }))
                // Honour the cooldown even on the API path.
                .filter(c => !(req.cooldown?.has(`${c.paramId}:${c.proposedValue >= (req.currentValues[c.paramId] ?? 0) ? 'up' : 'down'}`)));
            return {
                candidates,
                proposeOnly: Array.isArray(json.proposeOnly) ? json.proposeOnly : [],
                reasoning: 'Claude API recommendation (registry-constrained, per-cell briefing).',
                mode: 'api',
            };
        } catch {
            // fall through to heuristic
        }
    }

    return heuristicRecommendations(req);
}
