/**
 * Analyst bridge — the single seam where balance recommendations are produced.
 *
 * Hybrid, offline-first:
 *   1. If `useApi` is set AND `ANTHROPIC_API_KEY` is present AND `fetch` exists,
 *      call the Claude Messages API, constrained to legal registry param ids,
 *      and parse a strict JSON response. ANY failure falls through to (2).
 *   2. Offline heuristic computed in Node — corrective nudges to the clearest
 *      difficulty knobs, plus propose-only structural notes. This is also what
 *      the Claude Code `balance-analyst` subagent reads from the written
 *      artifacts when the loop runs inside a Claude session.
 *
 * Either way Node always returns a usable candidate set; the API and the
 * subagent are quality upgrades, never hard dependencies.
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

function meanResolution(cells: CellResult[]): number {
    if (cells.length === 0) return 0;
    return cells.reduce((s, c) => s + c.report.metrics.resolutionSuccessRate, 0) / cells.length;
}

/** Worst (highest deviation) cells, for propose-only structural notes. */
function worstCells(baseline: HealthScore, n: number): typeof baseline.perCell {
    return [...baseline.perCell].sort((a, b) => b.deviation - a.deviation).slice(0, n);
}

/**
 * Offline heuristic candidate generation. Nudges the clearest difficulty knobs
 * in the corrective direction; everything else becomes a propose-only note.
 */
export function heuristicRecommendations(req: AnalystRequest): AnalystResponse {
    const { baseline, cells, tunables, currentValues } = req;
    const mean = meanResolution(cells);
    const { low, high } = baseline.targetBand;
    const candidates: Candidate[] = [];
    const proposeOnly: AnalystResponse['proposeOnly'] = [];

    const tooHard = mean < low;
    const tooEasy = mean > high;
    const dirWord = tooHard ? 'too hard' : tooEasy ? 'too easy' : 'in band';

    const byId = new Map(tunables.map(t => [t.id, t]));
    const nudge = (id: string, makeEasier: boolean, why: string): void => {
        const param = byId.get(id);
        if (!param) return;
        const cur = currentValues[id];
        if (typeof cur !== 'number') return;
        const step = param.step ?? Math.max(1, Math.abs(cur) * 0.1);
        const value = makeEasier ? cur - step : cur + step;
        candidates.push({
            paramId: id,
            proposedValue: value,
            rationale: `${why} (resolution ${(mean * 100).toFixed(0)}% is ${dirWord}; target ${(low * 100).toFixed(0)}–${(high * 100).toFixed(0)}%).`,
            source: 'heuristic',
        });
    };

    if (tooHard || tooEasy) {
        // Headline difficulty knob: enemy power scaling.
        nudge('enemy.statPerLevel', /* makeEasier */ tooHard,
            `${tooHard ? 'Lower' : 'Raise'} enemy stat scaling`);
        // Player survivability knob, opposite sense.
        nudge('combat.healthPerStat', /* makeEasier */ tooHard ? false : true,
            `${tooHard ? 'Raise' : 'Lower'} player health per stat`);
    } else {
        proposeOnly.push({
            summary: 'Aggregate resolution is within the target band.',
            rationale: `Mean resolution ${(mean * 100).toFixed(0)}% sits inside ${(low * 100).toFixed(0)}–${(high * 100).toFixed(0)}%; no numeric change recommended.`,
        });
    }

    // Structural / per-cell observations the loop cannot auto-apply.
    for (const cell of worstCells(baseline, 3)) {
        if (cell.deviation === 0) continue;
        proposeOnly.push({
            summary: `Cell ${cell.cellId} is off-band (resolution ${(cell.resolutionSuccessRate * 100).toFixed(0)}%, defeat ${(cell.defeatRate * 100).toFixed(0)}%).`,
            rationale: 'Inspect this matchup\'s enemy/loadout content; may need a targeted (non-numeric) change.',
        });
    }

    // Focus-targeted tunables with no clear auto-direction → propose-only.
    for (const t of tunables) {
        if (t.id === 'enemy.statPerLevel' || t.id === 'combat.healthPerStat') continue;
        if (candidates.some(c => c.paramId === t.id)) continue;
        proposeOnly.push({
            paramId: t.id,
            summary: `Focus tunable ${t.id} (current ${currentValues[t.id]}).`,
            rationale: `${t.rationale} Direction of improvement is ambiguous from aggregate health; review before tuning.`,
        });
    }

    return {
        candidates: candidates.slice(0, 3),
        proposeOnly,
        reasoning: `Heuristic: mean resolution ${(mean * 100).toFixed(1)}% (${dirWord}); ${candidates.length} numeric candidate(s).`,
        mode: 'heuristic',
    };
}

const API_URL = 'https://api.anthropic.com/v1/messages';

/** Build the constrained prompt for the API path. */
function buildApiPrompt(req: AnalystRequest): string {
    const legalIds = req.tunables.map(t => `${t.id} (current=${req.currentValues[t.id]}, min=${t.min}, max=${t.max})`);
    return [
        'You are a game-balance analyst. Recommend numeric tuning changes.',
        `Target resolution-success band: ${req.baseline.targetBand.low}-${req.baseline.targetBand.high}.`,
        `Current aggregate health: ${req.baseline.summary}.`,
        'You may ONLY propose changes to these parameter ids:',
        ...legalIds.map(s => `  - ${s}`),
        'Respond with STRICT JSON only, shape:',
        '{"candidates":[{"paramId":"...","proposedValue":<number>,"rationale":"..."}],"proposeOnly":[{"summary":"...","rationale":"..."}]}',
    ].join('\n');
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
            const legal = new Set(req.tunables.map(t => t.id));
            const candidates: Candidate[] = (json.candidates ?? [])
                .filter((c: { paramId?: string; proposedValue?: number }) =>
                    typeof c.paramId === 'string' && legal.has(c.paramId) && Number.isFinite(c.proposedValue))
                .map((c: { paramId: string; proposedValue: number; rationale?: string }) => ({
                    paramId: c.paramId,
                    proposedValue: c.proposedValue,
                    rationale: c.rationale ?? 'API recommendation.',
                    source: 'api' as const,
                }));
            return {
                candidates,
                proposeOnly: json.proposeOnly ?? [],
                reasoning: 'Claude API recommendation (registry-constrained).',
                mode: 'api',
            };
        } catch {
            // fall through to heuristic
        }
    }

    return heuristicRecommendations(req);
}
