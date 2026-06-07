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

function mean(xs: number[]): number {
    return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

function pct(n: number): string {
    return `${Math.round(n * 100)}%`;
}

/** Share of a cell's player actions that were skills (snapshot, else metrics). */
function skillShareOf(c: CellResult): number {
    if (c.snapshot) return c.snapshot.combat.skillActionShare;
    const a = c.report.metrics.actionUse;
    const total = Object.values(a).reduce((s, n) => s + n, 0) || 1;
    return (a.skill ?? 0) / total;
}

interface PlaystyleEngagement {
    playstyle: string;
    cells: number;
    resolution: number;
    skillShare: number;
}

function engagementByPlaystyle(cells: CellResult[]): PlaystyleEngagement[] {
    const groups = new Map<string, CellResult[]>();
    for (const c of cells) {
        const k = c.cell.playstyle;
        (groups.get(k) ?? groups.set(k, []).get(k)!).push(c);
    }
    return [...groups.entries()].map(([playstyle, g]) => ({
        playstyle,
        cells: g.length,
        resolution: mean(g.map(x => x.report.metrics.resolutionSuccessRate)),
        skillShare: mean(g.map(skillShareOf)),
    }));
}

/** Margin by which aggressive must beat strategist to flag the doctrine. */
const DOCTRINE_RESOLUTION_MARGIN = 0.05;
/** Below this skill-action share, basic actions dominate selection. */
const DOCTRINE_LOW_SKILL_SHARE = 0.5;

/**
 * Status-effect doctrine analysis (VISION.md: status effects are the MAIN fun).
 * Detects when basic-attack play out-weighs skill/status play and emits remedy
 * suggestions — plus a registry-backed candidate to raise skill payoff when one
 * is available. Returns suggestions only; never throws.
 */
export function doctrineSuggestions(req: AnalystRequest): {
    candidates: Candidate[];
    proposeOnly: AnalystResponse['proposeOnly'];
} {
    const byStyle = engagementByPlaystyle(req.cells);
    const aggressive = byStyle.find(s => s.playstyle === 'aggressive');
    const strategist = byStyle.find(s => s.playstyle === 'strategist');
    const overallSkillShare = mean(byStyle.map(s => s.skillShare));
    const candidates: Candidate[] = [];
    const proposeOnly: AnalystResponse['proposeOnly'] = [];

    let flagged = false;

    if (aggressive && strategist && aggressive.resolution > strategist.resolution + DOCTRINE_RESOLUTION_MARGIN) {
        flagged = true;
        const delta = aggressive.resolution - strategist.resolution;
        proposeOnly.push({
            summary: `Basic actions out-weigh skills: AGGRESSIVE resolves ${pct(aggressive.resolution)} vs STRATEGIST ${pct(strategist.resolution)} (Δ${pct(delta)}). Per the status-effect doctrine, skill/status planning should be the STRONGER path, not basic-attack trading.`,
            rationale: 'Remedy: increase skill/status payoff relative to basic attacks — raise `combat.skillStatMultiplier` (skills hit harder) and/or lower `combat.resourceGen.attackHit` (basic attacks build less tempo); strengthen status-effect potency/duration. Re-run and confirm STRATEGIST resolution ≥ AGGRESSIVE.',
        });
    }

    if (overallSkillShare < DOCTRINE_LOW_SKILL_SHARE) {
        flagged = true;
        proposeOnly.push({
            summary: `Skills are a minority of actions: only ${pct(overallSkillShare)} of player actions across the matrix are skills — basic attack / defend / item dominate selection.`,
            rationale: 'Remedy: make status effects the default, not the fallback — raise resource generation (`combat.resourceGen.*`) or lower skill costs so skills are affordable more often, and have enemies punish repeated unmitigated basic attacks (reactive guards / counters).',
        });
    }

    if (flagged) {
        // Registry-backed corrective: tilt damage toward skills, if tunable here.
        const cur = req.currentValues['combat.skillStatMultiplier'];
        const param = req.tunables.find(t => t.id === 'combat.skillStatMultiplier');
        if (param && typeof cur === 'number') {
            const step = param.step ?? 0.05;
            candidates.push({
                paramId: 'combat.skillStatMultiplier',
                proposedValue: cur + step,
                rationale: 'Status-effect doctrine: raise skill damage scaling so skill/status play out-performs basic-attack trading.',
                source: 'heuristic',
            });
        }
        // Meta-remedy: the objective itself can't yet see the problem.
        proposeOnly.push({
            summary: 'The tuning objective scores only win/mercy resolution, not status-effect engagement, so it cannot auto-correct basic-attack dominance on its own.',
            rationale: 'Remedy (structural): add a transcript-derived effects-applied/exploited metric and fold an engagement term into `scoreHealth`; add per-effect (potency / duration / proc-chance) and per-skill payload tunables to the registry so the loop can act on it.',
        });
    }

    return { candidates, proposeOnly };
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

    // Status-effect doctrine: flag and remedy basic-attack dominance.
    const doctrine = doctrineSuggestions(req);
    for (const c of doctrine.candidates) {
        if (!candidates.some(existing => existing.paramId === c.paramId)) candidates.push(c);
    }
    proposeOnly.push(...doctrine.proposeOnly);

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
