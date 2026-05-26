import type { PlaytestReport } from './types';

export function renderPlaytestMarkdown(report: PlaytestReport): string {
    return [
        `# Playtest Report — ${report.scenarioId}`,
        '',
        report.description ? `> ${report.description}` : '',
        '',
        '## Scenario',
        '',
        `- Preset: ${report.preset}`,
        `- Enemy: ${report.enemy}`,
        `- Seed: ${report.seed}`,
        `- Max rounds: ${report.maxRounds}`,
        `- Policies: ${report.policies.join(', ')}`,
        `- Runs: ${report.metrics.totalRuns}`,
        '',
        '## Aggregate Metrics',
        '',
        `- Win rate: ${formatPercent(report.metrics.winRate)}`,
        `- Defeat rate: ${formatPercent(report.metrics.defeatRate)}`,
        `- Friendship rate: ${formatPercent(report.metrics.friendshipRate)}`,
        `- Timeout rate: ${formatPercent(report.metrics.timeoutRate)}`,
        `- Average rounds: ${formatNumber(report.metrics.averageRounds)}`,
        `- Median rounds: ${formatNumber(report.metrics.medianRounds)}`,
        `- Average final player HP: ${formatNumber(report.metrics.averageFinalPlayerHp)}`,
        `- Average final enemy HP: ${formatNumber(report.metrics.averageFinalEnemyHp)}`,
        `- Average damage to player: ${formatNumber(report.metrics.averageDamageToPlayer)}`,
        `- Average damage to enemy: ${formatNumber(report.metrics.averageDamageToEnemy)}`,
        `- Max friendship counter: ${report.metrics.maxFriendshipCounter}`,
        '',
        '## Outcome Counts',
        '',
        ...Object.entries(report.metrics.outcomes).map(([outcome, count]) => `- ${outcome}: ${count}`),
        '',
        '## Player Action Use',
        '',
        ...renderCounts(report.metrics.actionUse),
        '',
        '## Stance Use',
        '',
        ...renderCounts(report.metrics.stanceUse),
        '',
        '## Skill Use',
        '',
        ...renderCounts(report.metrics.skillUse),
        '',
        '## Enemy Action Use',
        '',
        ...renderCounts(report.metrics.enemyActionUse),
        '',
        '## Policy Summaries',
        '',
        ...report.metrics.policySummaries.flatMap(summary => [
            `### ${summary.policy}`,
            '',
            `- Runs: ${summary.runs}`,
            `- Win rate: ${formatPercent(summary.winRate)}`,
            `- Defeat rate: ${formatPercent(summary.defeatRate)}`,
            `- Friendship rate: ${formatPercent(summary.friendshipRate)}`,
            `- Timeout rate: ${formatPercent(summary.timeoutRate)}`,
            `- Average rounds: ${formatNumber(summary.averageRounds)}`,
            `- Average final player HP: ${formatNumber(summary.averageFinalPlayerHp)}`,
            `- Average final enemy HP: ${formatNumber(summary.averageFinalEnemyHp)}`,
            `- Average damage to player: ${formatNumber(summary.averageDamageToPlayer)}`,
            `- Average damage to enemy: ${formatNumber(summary.averageDamageToEnemy)}`,
            `- Max friendship counter: ${summary.maxFriendshipCounter}`,
            '',
        ]),
        '## Findings for Tobin',
        '',
        ...report.findings.map(finding => `- ${finding}`),
        '',
        '## Replay Seeds Worth Inspecting',
        '',
        ...(report.replaySeeds.length > 0 ? report.replaySeeds.map(seed => `- ${seed}`) : ['- None.']),
        '',
        '## Run Summaries',
        '',
        ...report.runs.map(run => (
            `- Run ${run.run}: outcome=${run.outcome}, policy=${run.policy}, seed=${run.seed}, ` +
            `rounds=${run.rounds}, playerHp=${run.playerHp}, enemyHp=${run.enemyHp}, ` +
            `damageToPlayer=${run.damageToPlayer}, damageToEnemy=${run.damageToEnemy}, ` +
            `friendshipCounter=${run.friendshipCounter}`
        )),
        '',
    ].filter(line => line !== undefined).join('\n');
}

function renderCounts(counts: Record<string, number>): string[] {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return ['- None.'];
    return entries.map(([key, count]) => `- ${key}: ${count}`);
}

function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
