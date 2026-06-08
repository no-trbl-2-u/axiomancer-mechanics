/**
 * Status-effect engagement metric — the doctrine made measurable.
 *
 * VISION / CLAUDE.md: status effects are the MAIN fun; combat collapsing into
 * basic-attack trades is a balance FAILURE even when win rates look healthy.
 *
 * There are TWO things worth measuring, and conflating them is the trap the
 * first version fell into:
 *
 *   1. ACTIVITY — the share of action rounds in which the player applied or
 *      exploited a status effect. This measures *whether status was used*, not
 *      whether it accomplished anything. A player who spams a DoT 1700 times
 *      and still times out scores ~1.0 activity — degenerate, but "engaged".
 *
 *   2. LEVERAGE — activity weighted by whether the fight actually RESOLVED.
 *      Status play that converts to a victory/friendship earns full credit;
 *      status sprayed into a fight that times out (the inert-spam pathology we
 *      keep finding at L15+) is heavily discounted; a loss is partial. This is
 *      the number the health objective optimises toward, so the loop is pushed
 *      to make status effects DECISIVE, not merely present.
 *
 * Both read only from the playtest transcript / run summary — no combat logic
 * is reimplemented here.
 */

import type { PlaytestOutcome, PlaytestReport, PlaytestRunSummary } from '../Playtest/types';

/** Player actions that count as "the player took a turn" (not skip/none). */
const ACTION_ROUNDS = new Set(['attack', 'skill', 'item', 'defend']);

/**
 * Leverage weight applied to a run's raw status activity, by outcome. Status
 * that helped resolve a fight earns full credit; status sprayed into a timeout
 * (the inert-spam pathology) is heavily discounted; a loss is partial. An
 * unknown/missing outcome ⇒ 1 (no discount), so synthetic transcripts keep
 * measuring pure activity and callers treat "unknown" as "no penalty".
 */
export const OUTCOME_LEVERAGE: Partial<Record<PlaytestOutcome, number>> = {
    victory: 1,
    friendship: 1,
    flee: 0.5,
    defeat: 0.5,
    timeout: 0.25,
};

function outcomeLeverage(outcome: PlaytestOutcome | undefined): number {
    if (!outcome) return 1;
    return OUTCOME_LEVERAGE[outcome] ?? 1;
}

/** Did this round's events include a player-driven status apply/exploit? */
function roundHasStatusPlay(
    events: PlaytestRunSummary['transcript'][number]['combatEvents'],
): boolean {
    return events.some(event => {
        // Skill landed a status effect (buff on self or debuff on the enemy).
        if (event.phase === 'skill' && event.kind === 'effect-applied') return true;
        // Skill exploited existing effects for a synergy payoff.
        if (event.phase === 'skill' && event.kind === 'synergy-fired') return true;
        // A player proc landed an effect on the opponent.
        if (event.phase === 'scenario' && event.kind === 'proc-applied'
            && event.actor === 'player' && event.appliedTo === 'opponent') return true;
        return false;
    });
}

/**
 * Raw status-effect ACTIVITY share for a single run (rounds with status play /
 * action rounds), or undefined when the player never acted. This is the "was
 * status used" signal — see `runEngagementShare` for the leverage-weighted one.
 */
export function runActivityShare(run: PlaytestRunSummary): number | undefined {
    const transcript = run.transcript;
    if (!Array.isArray(transcript) || transcript.length === 0) return undefined;
    let actionRounds = 0;
    let statusRounds = 0;
    for (const round of transcript) {
        const action = round.playerAction?.action;
        if (!action || !ACTION_ROUNDS.has(action)) continue;
        actionRounds += 1;
        if (roundHasStatusPlay(round.combatEvents ?? [])) statusRounds += 1;
    }
    if (actionRounds === 0) return undefined;
    return statusRounds / actionRounds;
}

/**
 * Status-effect LEVERAGE share for a single run: activity discounted by whether
 * the fight resolved. This is the doctrine-aligned number — status that ends
 * fights counts, status that merely fills rounds before a timeout barely does.
 * Returns undefined when the player never acted (no transcript ⇒ no penalty).
 */
export function runEngagementShare(run: PlaytestRunSummary): number | undefined {
    const activity = runActivityShare(run);
    if (typeof activity !== 'number') return undefined;
    return activity * outcomeLeverage(run.outcome);
}

function meanOverRuns(
    report: PlaytestReport,
    pick: (run: PlaytestRunSummary) => number | undefined,
): number | undefined {
    const runs = report.runs;
    if (!Array.isArray(runs) || runs.length === 0) return undefined;
    const values: number[] = [];
    for (const run of runs) {
        const v = pick(run);
        if (typeof v === 'number') values.push(v);
    }
    if (values.length === 0) return undefined;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Mean status-effect LEVERAGE across a cell's runs, in [0,1]. Returns
 * `undefined` when the report carries no usable transcript (synthetic test
 * reports) so callers can treat engagement as "unknown ⇒ no penalty".
 */
export function cellEngagementShare(report: PlaytestReport): number | undefined {
    return meanOverRuns(report, runEngagementShare);
}

/** Mean raw status-effect ACTIVITY across a cell's runs (diagnostic / report). */
export function cellActivityShare(report: PlaytestReport): number | undefined {
    return meanOverRuns(report, runActivityShare);
}
