/**
 * Engagement metrics hermetic e2e test.
 * Status-effect activity and leverage measurement per VISION.md doctrine.
 */

import { describe, it, expect } from 'vitest';
import {
    OUTCOME_LEVERAGE,
    runActivityShare,
    runEngagementShare,
    cellEngagementShare,
    cellActivityShare,
} from '../engagement.metrics';
import type { PlaytestRunSummary, PlaytestReport } from '../../Playtest/types';

/**
 * Synthetic fixtures carry only the fields the metrics read — the metrics are
 * written defensively for exactly this kind of partial transcript (see the
 * `undefined ⇒ no penalty` notes in engagement.metrics.ts). They are cast at
 * the call boundary, matching the synthetic-transcript fixture pattern in
 * tuning-improvements.engine.test.ts.
 */
type SyntheticRound = {
    playerAction: { action: string };
    combatEvents: Record<string, unknown>[];
};
type SyntheticRun = {
    transcript: SyntheticRound[];
    outcome?: string;
    duration: number;
};
type SyntheticReport = {
    runs: SyntheticRun[];
    metadata: { policy: string; timestamp: string };
};

const asRun = (run: SyntheticRun): PlaytestRunSummary =>
    run as unknown as PlaytestRunSummary;
const asReport = (report: SyntheticReport): PlaytestReport =>
    report as unknown as PlaytestReport;

describe('Engagement metrics (isolated fixtures)', () => {
    it('runActivityShare: returns undefined for empty transcript', () => {
        const run: SyntheticRun = {
            transcript: [],
            outcome: 'victory',
            duration: 10,
        };
        expect(runActivityShare(asRun(run))).toBe(undefined);
    });

    it('runActivityShare: returns undefined for no action rounds', () => {
        const run: SyntheticRun = {
            transcript: [
                {
                    playerAction: { action: 'none' },
                    combatEvents: [],
                },
                {
                    playerAction: { action: 'skip' },
                    combatEvents: [],
                },
            ],
            outcome: 'victory',
            duration: 5,
        };
        expect(runActivityShare(asRun(run))).toBe(undefined);
    });

    it('runActivityShare: calculates correct share for mixed rounds', () => {
        const run: SyntheticRun = {
            transcript: [
                {
                    playerAction: { action: 'attack' },
                    combatEvents: [],
                },
                {
                    playerAction: { action: 'skill' },
                    combatEvents: [
                        {
                            phase: 'skill',
                            kind: 'effect-applied',
                            actor: 'player',
                            appliedTo: 'opponent',
                        },
                    ],
                },
                {
                    playerAction: { action: 'defend' },
                    combatEvents: [],
                },
                {
                    playerAction: { action: 'skill' },
                    combatEvents: [
                        {
                            phase: 'skill',
                            kind: 'synergy-fired',
                        },
                    ],
                },
            ],
            outcome: 'victory',
            duration: 20,
        };
        // 4 action rounds, 2 with status play = 0.5
        expect(runActivityShare(asRun(run))).toBe(0.5);
    });

    it('runActivityShare: recognizes proc-applied status play', () => {
        const run: SyntheticRun = {
            transcript: [
                {
                    playerAction: { action: 'attack' },
                    combatEvents: [
                        {
                            phase: 'scenario',
                            kind: 'proc-applied',
                            actor: 'player',
                            appliedTo: 'opponent',
                        },
                    ],
                },
                {
                    playerAction: { action: 'attack' },
                    combatEvents: [],
                },
            ],
            outcome: 'victory',
            duration: 8,
        };
        // 2 action rounds, 1 with status play = 0.5
        expect(runActivityShare(asRun(run))).toBe(0.5);
    });

    it('runActivityShare: ignores enemy procs', () => {
        const run: SyntheticRun = {
            transcript: [
                {
                    playerAction: { action: 'attack' },
                    combatEvents: [
                        {
                            phase: 'scenario',
                            kind: 'proc-applied',
                            actor: 'opponent',
                            appliedTo: 'player',
                        },
                    ],
                },
            ],
            outcome: 'victory',
            duration: 3,
        };
        // 1 action round, 0 with status play = 0
        expect(runActivityShare(asRun(run))).toBe(0);
    });

    it('runEngagementShare: leverages activity by outcome', () => {
        const baseRun: SyntheticRun = {
            transcript: [
                {
                    playerAction: { action: 'skill' },
                    combatEvents: [
                        {
                            phase: 'skill',
                            kind: 'effect-applied',
                            actor: 'player',
                            appliedTo: 'opponent',
                        },
                    ],
                },
            ],
            duration: 5,
        };

        // Activity = 1.0 for all cases
        expect(runEngagementShare(asRun({ ...baseRun, outcome: 'victory' }))).toBe(1.0);
        expect(runEngagementShare(asRun({ ...baseRun, outcome: 'friendship' }))).toBe(1.0);
        expect(runEngagementShare(asRun({ ...baseRun, outcome: 'flee' }))).toBe(0.5);
        expect(runEngagementShare(asRun({ ...baseRun, outcome: 'defeat' }))).toBe(0.5);
        expect(runEngagementShare(asRun({ ...baseRun, outcome: 'timeout' }))).toBe(0.25);
    });

    it('runEngagementShare: handles undefined outcome', () => {
        const run: SyntheticRun = {
            transcript: [
                {
                    playerAction: { action: 'skill' },
                    combatEvents: [
                        {
                            phase: 'skill',
                            kind: 'effect-applied',
                            actor: 'player',
                            appliedTo: 'opponent',
                        },
                    ],
                },
            ],
            duration: 5,
        };

        // No outcome = leverage 1 (no penalty)
        expect(runEngagementShare(asRun(run))).toBe(1.0);
    });

    it('cellEngagementShare: aggregates across runs', () => {
        const report: SyntheticReport = {
            runs: [
                {
                    transcript: [
                        {
                            playerAction: { action: 'skill' },
                            combatEvents: [{ phase: 'skill', kind: 'effect-applied', actor: 'player', appliedTo: 'opponent' }],
                        },
                    ],
                    outcome: 'victory',
                    duration: 5,
                }, // engagement = 1.0
                {
                    transcript: [
                        {
                            playerAction: { action: 'attack' },
                            combatEvents: [],
                        },
                        {
                            playerAction: { action: 'skill' },
                            combatEvents: [{ phase: 'skill', kind: 'synergy-fired' }],
                        },
                    ],
                    outcome: 'timeout',
                    duration: 10,
                }, // engagement = 0.5 * 0.25 = 0.125
            ],
            metadata: {
                policy: 'aggressive',
                timestamp: new Date().toISOString(),
            },
        };

        // Mean of 1.0 and 0.125 = 0.5625
        expect(cellEngagementShare(asReport(report))).toBeCloseTo(0.5625);
    });

    it('cellActivityShare: aggregates raw activity', () => {
        const report: SyntheticReport = {
            runs: [
                {
                    transcript: [
                        {
                            playerAction: { action: 'skill' },
                            combatEvents: [{ phase: 'skill', kind: 'effect-applied', actor: 'player', appliedTo: 'opponent' }],
                        },
                    ],
                    outcome: 'victory',
                    duration: 5,
                }, // activity = 1.0
                {
                    transcript: [
                        {
                            playerAction: { action: 'attack' },
                            combatEvents: [],
                        },
                        {
                            playerAction: { action: 'skill' },
                            combatEvents: [{ phase: 'skill', kind: 'synergy-fired' }],
                        },
                    ],
                    outcome: 'timeout',
                    duration: 10,
                }, // activity = 0.5 (outcome doesn't affect raw activity)
            ],
            metadata: {
                policy: 'aggressive',
                timestamp: new Date().toISOString(),
            },
        };

        // Mean of 1.0 and 0.5 = 0.75
        expect(cellActivityShare(asReport(report))).toBeCloseTo(0.75);
    });

    it('cellEngagementShare: returns undefined for empty runs', () => {
        const report: SyntheticReport = {
            runs: [],
            metadata: {
                policy: 'defensive',
                timestamp: new Date().toISOString(),
            },
        };
        expect(cellEngagementShare(asReport(report))).toBe(undefined);
    });

    it('cellEngagementShare: ignores runs with undefined activity', () => {
        const report: SyntheticReport = {
            runs: [
                {
                    transcript: [],
                    outcome: 'victory',
                    duration: 0,
                }, // undefined activity
                {
                    transcript: [
                        {
                            playerAction: { action: 'skill' },
                            combatEvents: [{ phase: 'skill', kind: 'effect-applied', actor: 'player', appliedTo: 'opponent' }],
                        },
                    ],
                    outcome: 'victory',
                    duration: 5,
                }, // activity = 1.0, engagement = 1.0
            ],
            metadata: {
                policy: 'balanced',
                timestamp: new Date().toISOString(),
            },
        };

        // Only the valid run is included in the mean
        expect(cellEngagementShare(asReport(report))).toBe(1.0);
    });

    it('OUTCOME_LEVERAGE: contains expected weights', () => {
        expect(OUTCOME_LEVERAGE.victory).toBe(1);
        expect(OUTCOME_LEVERAGE.friendship).toBe(1);
        expect(OUTCOME_LEVERAGE.flee).toBe(0.5);
        expect(OUTCOME_LEVERAGE.defeat).toBe(0.5);
        expect(OUTCOME_LEVERAGE.timeout).toBe(0.25);
    });

    it('runEngagementShare: handles complex transcript with mixed events', () => {
        const run: SyntheticRun = {
            transcript: [
                {
                    playerAction: { action: 'skill' },
                    combatEvents: [
                        {
                            phase: 'skill',
                            kind: 'effect-applied',
                            actor: 'player',
                            appliedTo: 'opponent',
                        },
                        {
                            phase: 'scenario',
                            kind: 'damage-dealt',
                        },
                    ],
                }, // status round
                {
                    playerAction: { action: 'attack' },
                    combatEvents: [
                        {
                            phase: 'scenario',
                            kind: 'proc-applied',
                            actor: 'opponent',
                            appliedTo: 'player',
                        },
                    ],
                }, // not status round (enemy proc)
                {
                    playerAction: { action: 'item' },
                    combatEvents: [],
                }, // not status round
                {
                    playerAction: { action: 'skill' },
                    combatEvents: [
                        {
                            phase: 'skill',
                            kind: 'synergy-fired',
                        },
                    ],
                }, // status round
            ],
            outcome: 'defeat',
            duration: 15,
        };

        // 4 action rounds, 2 status rounds = 0.5 activity
        // defeat leverage = 0.5
        // engagement = 0.5 * 0.5 = 0.25
        expect(runEngagementShare(asRun(run))).toBe(0.25);
    });
});
