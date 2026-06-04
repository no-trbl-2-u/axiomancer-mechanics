import type { CombatAction, Stance } from '../Combat';
import type { RoundEvent } from '../Combat/combat.resolver';
import type { CombatEndReport } from '../Game/store';

export type PlaytestPolicy =
    | 'aggressive'
    | 'defensive'
    | 'strategist'
    | 'mixed'
    | 'friendship'
    | 'resource-optimal'
    | 'random'
    | 'mercy'
    | 'mercy-exploit';

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
    damageToPlayer: number;
    damageToEnemy: number;
    endReport?: CombatEndReport;
    transcript: PlaytestRoundSummary[];
    // Phase 101 — HP gate tracking for mercy policy analysis
    hpGateTrace?: {
        hpThreshold: number;           // The HP gate threshold (e.g., 0.4 for 40%)
        roundBelowGate?: number;       // Round when enemy HP first dropped below gate
        finalEnemyHpPct: number;       // Final enemy HP as percentage
    };
    // Phase 108 — Befriend skill metrics
    befriendMetrics?: {
        attempts: number;              // Number of befriend attempts
        successes: number;             // Number of successful befriends (opened mercy choice)
        failures: number;              // Number of failed befriends (HP gate not met)
        spareChoices: number;          // Number of times player chose spare/mercy
        exploitChoices: number;        // Number of times player chose exploit
    };
}

export interface PlaytestPolicySummary {
    policy: PlaytestPolicy;
    runs: number;
    winRate: number;
    defeatRate: number;
    friendshipRate: number;
    timeoutRate: number;
    /** Phase 113 — victory plus spare/friendship resolution, not raw win rate. */
    resolutionSuccessRate: number;
    averageRounds: number;
    averageFinalPlayerHp: number;
    averageFinalEnemyHp: number;
    averageDamageToPlayer: number;
    averageDamageToEnemy: number;
    maxFriendshipCounter: number;
}

export interface PlaytestMetrics {
    totalRuns: number;
    outcomes: Record<PlaytestOutcome, number>;
    winRate: number;
    defeatRate: number;
    friendshipRate: number;
    timeoutRate: number;
    /** Phase 113 — victory plus spare/friendship resolution, not raw win rate. */
    resolutionSuccessRate: number;
    averageRounds: number;
    medianRounds: number;
    averageFinalPlayerHp: number;
    averageFinalEnemyHp: number;
    averageDamageToPlayer: number;
    averageDamageToEnemy: number;
    maxFriendshipCounter: number;
    stanceUse: Record<Stance, number>;
    actionUse: Record<string, number>;
    skillUse: Record<string, number>;
    itemUse: Record<string, number>;
    enemyActionUse: Record<string, number>;
    policySummaries: PlaytestPolicySummary[];
    // Phase 104 enhanced metrics for balance tuning
    survivabilityRate: number;  // (wins + friendships) / totalRuns
    roundsToResolveDistribution: {
        min: number;
        max: number;
        q25: number;  // 25th percentile
        q75: number;  // 75th percentile
        stdDev: number;
    };
    damageRatio: {
        playerToEnemy: number;     // averageDamageToEnemy / averageDamageToPlayer
        playerEfficiency: number;  // damageDealt per round
        enemyEfficiency: number;   // damageDealt per round
    };
    befriendAttempts: number;
    befriendFailures: number;
    befriendSuccesses: number;
    spareChoices: number;
    exploitChoices: number;
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
