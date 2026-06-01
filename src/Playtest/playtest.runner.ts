import { buildCharacterFromPreset, characterPresets, getPresetById } from '../Character/presets';
import { createCharacter } from '../Character';
import { determineEnemyAction, isCombatOngoing, resolveCombatRound } from '../Combat';
import type { CombatAction, Stance } from '../Combat';
import { ENEMY_REGISTRY, type EnemySlug } from '../Enemy/enemy.library';
import { createGameStore } from '../Game/store';
import { nullAdapter } from '../Game/persistence/null.adapter';
import { getSkillById, skillLibrary } from '../Skills';
import { setSeed } from '../Utils/rng';
import { equipmentTemplates } from '../Items/equipment.templates';
import { dropItem } from '../Items/item.factory';
import { selectPolicyAction } from './policies';
import type {
    PlaytestMetrics,
    PlaytestOutcome,
    PlaytestPolicySummary,
    PlaytestReport,
    PlaytestRunSummary,
    PlaytestScenario,
} from './types';

/**
 * Creates a maxed-out character for endgame testing (Phase 104).
 * Replicates the dev-tools max-out functionality.
 */
function createMaxOutCharacter() {
    const equipment = equipmentTemplates.map(template => 
        dropItem(template.id, 20, 'rare')
    );
    
    return createCharacter({
        name: 'Maxed Test Character',
        level: 20,
        baseStats: { heart: 20, body: 20, mind: 20 },
        currency: 999,
        inventory: [],  // Equipment goes in equipment slots
        equipment: {
            weapon: equipment.find(item => item.slot === 'weapon'),
            armor: equipment.find(item => item.slot === 'armor'),
            accessory: equipment.find(item => item.slot === 'accessory'),
            head: equipment.find(item => item.slot === 'head'),
            body: equipment.find(item => item.slot === 'body'),
            hands: equipment.find(item => item.slot === 'hands'),
            feet: equipment.find(item => item.slot === 'feet'),
        },
        knownSkills: skillLibrary.map(skill => skill.id),
        equippedSkills: skillLibrary.slice(0, 4).map(skill => skill.id),
    });
}

export function runPlaytestScenario(scenario: PlaytestScenario): PlaytestReport {
    validateScenario(scenario);
    const runs = Array.from({ length: scenario.runs }, (_unused, idx) => runSingleScenario(scenario, idx + 1));
    const metrics = aggregateMetrics(runs);
    return {
        scenarioId: scenario.id,
        description: scenario.description,
        preset: scenario.preset,
        enemy: scenario.enemy,
        seed: scenario.seed,
        maxRounds: scenario.maxRounds,
        policies: scenario.policies,
        metrics,
        findings: deriveFindings(metrics),
        replaySeeds: runs
            .filter(run => run.outcome === 'defeat' || run.outcome === 'timeout' || run.rounds >= scenario.maxRounds)
            .slice(0, 10)
            .map(run => run.seed),
        runs,
    };
}

function runSingleScenario(scenario: PlaytestScenario, runNumber: number): PlaytestRunSummary {
    const runSeed = `${scenario.seed}:${runNumber}`;
    setSeed(runSeed);
    
    // Handle special max-out preset for endgame testing (Phase 104)
    let player;
    if (scenario.preset === 'max-out') {
        player = createMaxOutCharacter();
    } else {
        const preset = getPresetById(scenario.preset);
        if (!preset) throw new Error(`Unknown playtest preset: ${scenario.preset}`);
        player = buildCharacterFromPreset(preset);
    }
    
    const enemy = ENEMY_REGISTRY[scenario.enemy as EnemySlug];
    if (!enemy) throw new Error(`Unknown playtest enemy: ${scenario.enemy}`);

    const policy = scenario.policies[(runNumber - 1) % scenario.policies.length]!;
    const store = createGameStore(nullAdapter, { player });
    store.getState().startCombat({ enemies: [enemy] });

    const transcript: PlaytestRunSummary['transcript'] = [];
    const actions: Record<string, number> = {};
    const stances = zeroStanceCounts();
    const skillsUsed: Record<string, number> = {};
    const itemsUsed: Record<string, number> = {};
    const enemyActions: Record<string, number> = {};
    let damageToPlayer = 0;
    let damageToEnemy = 0;

    for (let i = 0; i < scenario.maxRounds; i++) {
        const combat = store.getState().combat;
        if (!combat || !isCombatOngoing(combat)) break;

        const playerAction = selectPolicyAction(policy, combat);
        const enemyAction = determineEnemyAction(combat.enemy, combat);
        const { state: nextCombat, combatEvents } = resolveCombatRound(
            combat,
            playerAction,
            enemyAction,
            getSkillById,
        );
        store.getState().updateCombat(nextCombat, combatEvents);
        increment(actions, playerAction.action);
        increment(stances, playerAction.stance);
        if (playerAction.skillId) increment(skillsUsed, playerAction.skillId);
        if (playerAction.itemId) increment(itemsUsed, playerAction.itemId);
        increment(enemyActions, describeAction(enemyAction));
        damageToPlayer += sumDamageToPlayer(combatEvents);
        damageToEnemy += sumDamageToEnemy(combatEvents);
        transcript.push({
            round: combat.round,
            playerAction,
            enemyAction,
            playerHp: nextCombat.player.health,
            enemyHp: nextCombat.enemy.health,
            combatEvents,
        });
    }

    const finalCombat = store.getState().combat;
    let outcome: PlaytestOutcome = 'timeout';
    let endReport: PlaytestRunSummary['endReport'];
    if (finalCombat && !isCombatOngoing(finalCombat)) {
        endReport = store.getState().endCombat();
        outcome = endReport.outcome;
    }

    return {
        run: runNumber,
        seed: runSeed,
        policy,
        preset: scenario.preset,
        enemy: scenario.enemy,
        outcome,
        rounds: transcript.length,
        playerHp: finalCombat?.player.health ?? store.getState().player.health,
        enemyHp: finalCombat?.enemy.health ?? 0,
        friendshipCounter: finalCombat?.friendshipCounter ?? 0,
        actions,
        stances,
        skillsUsed,
        itemsUsed,
        enemyActions,
        damageToPlayer,
        damageToEnemy,
        ...(endReport ? { endReport } : {}),
        transcript,
    };
}

function validateScenario(scenario: PlaytestScenario): void {
    if (!scenario.id) throw new Error('Playtest scenario requires id.');
    if (!Number.isInteger(scenario.runs) || scenario.runs <= 0) throw new Error('Playtest scenario runs must be a positive integer.');
    if (!Number.isInteger(scenario.maxRounds) || scenario.maxRounds <= 0) throw new Error('Playtest scenario maxRounds must be a positive integer.');
    if (!scenario.seed) throw new Error('Playtest scenario requires seed.');
    if (scenario.policies.length === 0) throw new Error('Playtest scenario requires at least one policy.');
    if (scenario.preset !== 'max-out' && !characterPresets.some(preset => preset.id === scenario.preset)) throw new Error(`Unknown playtest preset: ${scenario.preset}`);
    if (!(scenario.enemy in ENEMY_REGISTRY)) throw new Error(`Unknown playtest enemy: ${scenario.enemy}`);
}

export function aggregateMetrics(runs: PlaytestRunSummary[]): PlaytestMetrics {
    const outcomes = zeroOutcomeCounts();
    const stanceUse = zeroStanceCounts();
    const actionUse: Record<string, number> = {};
    const skillUse: Record<string, number> = {};
    const itemUse: Record<string, number> = {};
    const enemyActionUse: Record<string, number> = {};

    for (const run of runs) {
        outcomes[run.outcome] += 1;
        mergeCounts(stanceUse, run.stances);
        mergeCounts(actionUse, run.actions);
        mergeCounts(skillUse, run.skillsUsed);
        mergeCounts(itemUse, run.itemsUsed);
        mergeCounts(enemyActionUse, run.enemyActions);
    }

    const totalRuns = runs.length;
    const rounds = runs.map(run => run.rounds).sort((a, b) => a - b);
    return {
        totalRuns,
        outcomes,
        winRate: rate(outcomes.victory, totalRuns),
        defeatRate: rate(outcomes.defeat, totalRuns),
        friendshipRate: rate(outcomes.friendship, totalRuns),
        timeoutRate: rate(outcomes.timeout, totalRuns),
        averageRounds: average(rounds),
        medianRounds: median(rounds),
        averageFinalPlayerHp: average(runs.map(run => run.playerHp)),
        averageFinalEnemyHp: average(runs.map(run => run.enemyHp)),
        averageDamageToPlayer: average(runs.map(run => run.damageToPlayer)),
        averageDamageToEnemy: average(runs.map(run => run.damageToEnemy)),
        maxFriendshipCounter: Math.max(0, ...runs.map(run => run.friendshipCounter)),
        stanceUse,
        actionUse,
        skillUse,
        itemUse,
        enemyActionUse,
        policySummaries: summarizePolicies(runs),
        // Phase 104 enhanced metrics
        survivabilityRate: rate(outcomes.victory + outcomes.friendship, totalRuns),
        roundsToResolveDistribution: calculateDistribution(rounds),
        damageRatio: calculateDamageRatios(runs),
    };
}

/**
 * Calculates statistical distribution for rounds to resolve (Phase 104).
 */
function calculateDistribution(rounds: number[]) {
    if (rounds.length === 0) {
        return { min: 0, max: 0, q25: 0, q75: 0, stdDev: 0 };
    }
    
    const sorted = [...rounds].sort((a, b) => a - b);
    const mean = average(sorted);
    const variance = sorted.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / sorted.length;
    
    return {
        min: sorted[0]!,
        max: sorted[sorted.length - 1]!,
        q25: percentile(sorted, 0.25),
        q75: percentile(sorted, 0.75),
        stdDev: Math.sqrt(variance),
    };
}

/**
 * Calculates damage efficiency ratios for balance analysis (Phase 104).
 */
function calculateDamageRatios(runs: PlaytestRunSummary[]) {
    const avgDamageToPlayer = average(runs.map(r => r.damageToPlayer));
    const avgDamageToEnemy = average(runs.map(r => r.damageToEnemy));
    const avgRounds = average(runs.map(r => r.rounds));
    
    return {
        playerToEnemy: avgDamageToPlayer > 0 ? avgDamageToEnemy / avgDamageToPlayer : 0,
        playerEfficiency: avgRounds > 0 ? avgDamageToEnemy / avgRounds : 0,
        enemyEfficiency: avgRounds > 0 ? avgDamageToPlayer / avgRounds : 0,
    };
}

/**
 * Calculates a percentile value from a sorted array.
 */
function percentile(sortedArray: number[], percentile: number): number {
    const index = percentile * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1]!;
    return sortedArray[lower]! * (1 - weight) + sortedArray[upper]! * weight;
}

function summarizePolicies(runs: PlaytestRunSummary[]): PlaytestPolicySummary[] {
    const policies = Array.from(new Set(runs.map(run => run.policy)));
    return policies.map(policy => {
        const matching = runs.filter(run => run.policy === policy);
        const outcomes = zeroOutcomeCounts();
        for (const run of matching) outcomes[run.outcome] += 1;
        return {
            policy,
            runs: matching.length,
            winRate: rate(outcomes.victory, matching.length),
            defeatRate: rate(outcomes.defeat, matching.length),
            friendshipRate: rate(outcomes.friendship, matching.length),
            timeoutRate: rate(outcomes.timeout, matching.length),
            averageRounds: average(matching.map(run => run.rounds)),
            averageFinalPlayerHp: average(matching.map(run => run.playerHp)),
            averageFinalEnemyHp: average(matching.map(run => run.enemyHp)),
            averageDamageToPlayer: average(matching.map(run => run.damageToPlayer)),
            averageDamageToEnemy: average(matching.map(run => run.damageToEnemy)),
            maxFriendshipCounter: Math.max(0, ...matching.map(run => run.friendshipCounter)),
        };
    });
}

function deriveFindings(metrics: PlaytestMetrics): string[] {
    const findings: string[] = [];
    if (metrics.totalRuns === 0) return ['No runs executed.'];
    if (metrics.timeoutRate > 0) findings.push(`${percent(metrics.timeoutRate)} of runs timed out before combat resolved.`);
    if (metrics.defeatRate > 0.5) findings.push(`Defeat rate is high at ${percent(metrics.defeatRate)}.`);
    if (metrics.winRate > 0.85) findings.push(`Win rate is high at ${percent(metrics.winRate)}; encounter may be undertuned for these policies.`);
    if (metrics.friendshipRate === 0) findings.push('No friendship outcomes surfaced; Tobin should judge whether the peaceful route is too hidden or too costly.');
    const stalledFriendshipPolicy = metrics.policySummaries.find(summary =>
        summary.policy === 'friendship'
        && summary.friendshipRate === 0
        && summary.timeoutRate > 0
        && summary.maxFriendshipCounter >= 5);
    if (stalledFriendshipPolicy) {
        findings.push(
            `Friendship policy built enough counter (${stalledFriendshipPolicy.maxFriendshipCounter}) but never resolved; HP gate remains unmet at average final enemy HP ${formatFindingNumber(stalledFriendshipPolicy.averageFinalEnemyHp)}.`,
        );
    }
    const dominantAction = dominant(metrics.actionUse);
    if (dominantAction && dominantAction.share >= 0.7) findings.push(`Dominant player action: ${dominantAction.key} (${percent(dominantAction.share)} of actions).`);
    const dominantStance = dominant(metrics.stanceUse);
    if (dominantStance && dominantStance.share >= 0.7) findings.push(`Dominant stance: ${dominantStance.key} (${percent(dominantStance.share)} of stances).`);
    if (findings.length === 0) findings.push('No obvious aggregate warning tripped; inspect per-run transcripts for feel and readability.');
    return findings;
}

function describeAction(action: CombatAction): string {
    return action.skillId ? `${action.action}:${action.skillId}` : action.action;
}

function sumDamageToPlayer(events: PlaytestRunSummary['transcript'][number]['combatEvents']): number {
    return events.reduce((total, event) => {
        if (event.phase === 'scenario' && event.kind === 'damage-applied' && event.defender === 'player') {
            return total + event.finalDamage;
        }
        if (event.phase === 'skill' && event.kind === 'damage' && event.target === 'self') {
            return total + event.amount;
        }
        return total;
    }, 0);
}

function sumDamageToEnemy(events: PlaytestRunSummary['transcript'][number]['combatEvents']): number {
    return events.reduce((total, event) => {
        if (event.phase === 'scenario' && event.kind === 'damage-applied' && event.defender === 'enemy') {
            return total + event.finalDamage;
        }
        if (event.phase === 'skill' && event.kind === 'damage' && event.target === 'enemy') {
            return total + event.amount;
        }
        return total;
    }, 0);
}

function zeroOutcomeCounts(): Record<PlaytestOutcome, number> {
    return { victory: 0, defeat: 0, friendship: 0, flee: 0, timeout: 0 };
}

function zeroStanceCounts(): Record<Stance, number> {
    return { heart: 0, body: 0, mind: 0 };
}

function increment(record: Record<string, number>, key: string): void {
    record[key] = (record[key] ?? 0) + 1;
}

function mergeCounts(target: Record<string, number>, source: Record<string, number>): void {
    for (const [key, value] of Object.entries(source)) target[key] = (target[key] ?? 0) + value;
}

function rate(count: number, total: number): number {
    return total === 0 ? 0 : count / total;
}

function average(values: number[]): number {
    return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(sortedValues: number[]): number {
    if (sortedValues.length === 0) return 0;
    const middle = Math.floor(sortedValues.length / 2);
    if (sortedValues.length % 2 === 1) return sortedValues[middle]!;
    return (sortedValues[middle - 1]! + sortedValues[middle]!) / 2;
}

function dominant(record: Record<string, number>): { key: string; share: number } | null {
    const entries = Object.entries(record);
    const total = entries.reduce((sum, [_key, value]) => sum + value, 0);
    if (total === 0) return null;
    const [key, value] = entries.sort((a, b) => b[1] - a[1])[0]!;
    return { key, share: value / total };
}

function percent(value: number): string {
    return `${Math.round(value * 100)}%`;
}

function formatFindingNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
