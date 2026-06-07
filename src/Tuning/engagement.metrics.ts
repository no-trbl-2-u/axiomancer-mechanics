/**
 * Status-effect engagement metric — the doctrine made measurable.
 *
 * VISION / CLAUDE.md: status effects are the MAIN fun; combat collapsing into
 * basic-attack trades is a balance FAILURE even when win rates look healthy.
 * This module turns that doctrine into a number the health objective can
 * optimise toward, instead of leaving it as prose the optimiser never reads.
 *
 * The engagement share of a run = (rounds in which the PLAYER applied or
 * exploited a status effect) / (rounds in which the player took a real action).
 * "Applied or exploited" = a skill landing an effect, a proc landing an effect
 * on the opponent, or a synergy firing (consuming effects for a payoff). Reads
 * only from the playtest transcript — no combat logic is reimplemented here.
 */

import type { PlaytestReport, PlaytestRunSummary } from '../Playtest/types';

/** Player actions that count as "the player took a turn" (not skip/none). */
const ACTION_ROUNDS = new Set(['attack', 'skill', 'item', 'defend']);

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

/** Engagement share for a single run, or undefined when the player never acted. */
export function runEngagementShare(run: PlaytestRunSummary): number | undefined {
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
 * Mean status-effect engagement share across a cell's runs, in [0,1]. Returns
 * `undefined` when the report carries no usable transcript (synthetic test
 * reports) so callers can treat engagement as "unknown ⇒ no penalty".
 */
export function cellEngagementShare(report: PlaytestReport): number | undefined {
    const runs = report.runs;
    if (!Array.isArray(runs) || runs.length === 0) return undefined;
    const shares: number[] = [];
    for (const run of runs) {
        const s = runEngagementShare(run);
        if (typeof s === 'number') shares.push(s);
    }
    if (shares.length === 0) return undefined;
    return shares.reduce((sum, s) => sum + s, 0) / shares.length;
}
