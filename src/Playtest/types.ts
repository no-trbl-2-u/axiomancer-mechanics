import type { CombatAction, Stance } from '../Combat';
import type { RoundEvent } from '../Combat/combat.resolver';
import type { CombatEndReport } from '../Game/store';

export type PlaytestPolicy =
    | 'aggressive'
    | 'defensive'
    | 'friendship'
    | 'resource-optimal'
    | 'random'
    | 'mixed';

export type PlaytestOutcome = CombatEndReport['outcome'] | 'timeout';

export interface PlaytestScenario {
    id: string;
    description?: string;
    preset: string;
    enemy: string;
    runs: number;
    maxRounds: number;
    seed: string;
    policies: PlaytestPolicy[];
}

export interface PlaytestRoundSummary {
    round: number;
    playerAction: CombatAction;
    enemyAction: CombatAction;
    playerHp: number;
    enemyHp: number;
    combatEvents: RoundEvent[];
}

export interface PlaytestRunSummary {
    run: number;
    seed: string;
    policy: PlaytestPolicy;
    preset: string;
    enemy: string;
    outcome: PlaytestOutcome;
    rounds: number;
    playerHp: number;
    enemyHp: number;
    friendshipCounter: number;
    actions: Record<string, number>;
    stances: Record<Stance, number>;
    skillsUsed: Record<string, number>;
    itemsUsed: Record<string, number>;
    enemyActions: Record<string, number>;
    endReport?: CombatEndReport;
    transcript: PlaytestRoundSummary[];
}

export interface PlaytestPolicySummary {
    policy: PlaytestPolicy;
    runs: number;
    winRate: number;
    defeatRate: number;
    friendshipRate: number;
    timeoutRate: number;
    averageRounds: number;
}

export interface PlaytestMetrics {
    totalRuns: number;
    outcomes: Record<PlaytestOutcome, number>;
    winRate: number;
    defeatRate: number;
    friendshipRate: number;
    timeoutRate: number;
    averageRounds: number;
    medianRounds: number;
    stanceUse: Record<Stance, number>;
    actionUse: Record<string, number>;
    skillUse: Record<string, number>;
    itemUse: Record<string, number>;
    enemyActionUse: Record<string, number>;
    policySummaries: PlaytestPolicySummary[];
}

export interface PlaytestReport {
    scenarioId: string;
    description?: string;
    preset: string;
    enemy: string;
    seed: string;
    maxRounds: number;
    policies: PlaytestPolicy[];
    metrics: PlaytestMetrics;
    findings: string[];
    replaySeeds: string[];
    runs: PlaytestRunSummary[];
}
