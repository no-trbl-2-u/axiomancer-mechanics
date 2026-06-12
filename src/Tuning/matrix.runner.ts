/**
 * Matrix runner — runs every cell of a `MatrixPlan` through the existing
 * playtest harness (`runPlaytestScenarioWith`), building a level/playstyle
 * loadout and a difficulty-scaled enemy per cell. Optionally threads the
 * strategist knowledge store so the strategist policy exploits learned
 * weaknesses, and folds each run's transcript back into that store.
 *
 * Reuses the harness wholesale — no combat loop is reimplemented here.
 */

import { runPlaytestScenarioWith } from '../Playtest/playtest.runner';
import type { PlaytestScenario, PolicyContext } from '../Playtest/types';
import { setSeed, getRng } from '../Utils/rng';
import type { EnemySlug } from '../Enemy/enemy.library';
import { buildLoadoutCharacter } from './loadout.builder';
import { scaleEnemyForCell } from './enemy.scaler';
import { makeAdvisor, updateFromRun } from './strategist.knowledge';
import { analyzeResourceEconomy, classifyResourcePattern, resourceHealthShare } from './resource.metrics';
import type { CellResult, CellSnapshot, MatrixPlan, StrategistKnowledge } from './types';
import type { Character } from '../Character/types';
import type { Enemy } from '../Enemy/types';
import type { PlaytestReport } from '../Playtest/types';

/** Round cap per trial — generous enough for late-game attrition to resolve. */
export const MATRIX_MAX_ROUNDS = 80;

/** Build the relevant-game-state snapshot embedded in suggestions evidence. */
function buildSnapshot(
    cell: { enemySlug: string },
    player: Character,
    enemy: Enemy,
    report: PlaytestReport,
): CellSnapshot {
    const m = report.metrics;
    const totalActions = Object.values(m.actionUse).reduce((s, n) => s + n, 0) || 1;
    const totalStances = Object.values(m.stanceUse).reduce((s, n) => s + n, 0) || 1;
    const topStances = (Object.entries(m.stanceUse) as [string, number][])
        .sort((a, b) => b[1] - a[1])
        .filter(([, n]) => n > 0)
        .map(([s, n]) => `${s} ${Math.round((n / totalStances) * 100)}%`)
        .join(' · ');
    const topSkills = (Object.entries(m.skillUse) as [string, number][])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([id, n]) => `${id} (${n})`);
    const skillUseTotal = Object.values(m.skillUse).reduce((s, n) => s + n, 0);

    // Phase 139 — Analyze resource economy patterns from the report
    const resourceMetrics = analyzeResourceEconomy(report);
    const resourcePattern = classifyResourcePattern(resourceMetrics);
    const healthShare = resourceHealthShare(resourceMetrics);

    return {
        player: {
            name: player.name,
            level: player.level,
            baseStats: player.baseStats,
            maxHealth: player.maxHealth,
            derived: pickDerived(player.derivedStats),
            knownSkills: player.knownSkills.length,
            equipment: Object.values(player.equipment ?? {})
                .filter((e): e is NonNullable<typeof e> => !!e)
                .map(e => `${e.slot}:${e.name}`),
        },
        enemy: {
            name: enemy.name,
            level: enemy.level,
            baseStats: enemy.baseStats,
            maxHealth: enemy.maxHealth,
            derived: pickDerived(enemy.derivedStats),
            logic: enemy.logic,
            difficulty: enemy.difficulty,
            slug: cell.enemySlug,
        },
        combat: {
            resolutionSuccessRate: m.resolutionSuccessRate,
            defeatRate: m.defeatRate,
            timeoutRate: m.timeoutRate,
            averageRounds: m.averageRounds,
            damageRatioPlayerToEnemy: m.damageRatio.playerToEnemy,
            topStances,
            topSkills,
            skillUsePerRun: m.totalRuns ? skillUseTotal / m.totalRuns : 0,
            skillActionShare: (m.actionUse.skill ?? 0) / totalActions,
        },
        resources: {
            healthShare,
            averagePool: resourceMetrics.averageResourcePool,
            pattern: resourcePattern,
            starvationRate: resourceMetrics.totalRounds > 0 ? 
                resourceMetrics.starvationRounds / resourceMetrics.totalRounds : 0,
            efficiency: resourceMetrics.efficiency,
        },
    };
}

function pickDerived(d: Enemy['derivedStats']): CellSnapshot['player']['derived'] {
    return {
        physicalAttack: d.physicalAttack, physicalDefense: d.physicalDefense,
        mentalAttack: d.mentalAttack, mentalDefense: d.mentalDefense,
        emotionalAttack: d.emotionalAttack, emotionalDefense: d.emotionalDefense,
    };
}

export interface RunMatrixOptions {
    /** Cross-run strategist memory; consulted by the strategist policy. */
    strategist?: StrategistKnowledge;
    /** When true, fold each run back into `strategist` (learning pass). */
    learn?: boolean;
    /** Override `ENEMY_STAT_PER_LEVEL` (the A/B harness injects candidates). */
    perLevelOverride?: number;
}

export function runMatrix(plan: MatrixPlan, opts: RunMatrixOptions = {}): CellResult[] {
    const advisor = opts.strategist ? makeAdvisor(opts.strategist) : undefined;
    const results: CellResult[] = [];

    for (const cell of plan.cells) {
        // Deterministic, per-cell loadout RNG (independent of the per-run combat
        // seed set inside the harness) so variant A and B build identical kit.
        setSeed(`${plan.baseSeed}:loadout:${cell.cellId}`);
        const rng = () => getRng().random();
        const player = buildLoadoutCharacter(cell, rng);
        const enemy = scaleEnemyForCell(
            cell.enemySlug as EnemySlug,
            cell.difficulty,
            cell.level,
            opts.perLevelOverride,
        );

        const scenario: PlaytestScenario = {
            id: cell.cellId,
            description: `L${cell.level} ${cell.playstyle} vs ${cell.enemySlug} (${cell.difficulty})`,
            preset: `tuning:${cell.cellId}`,
            enemy: cell.enemySlug,
            runs: cell.runs,
            maxRounds: MATRIX_MAX_ROUNDS,
            seed: `${plan.baseSeed}:${cell.cellId}`,
            policies: [cell.playstyle],
        };

        const policyContext: PolicyContext | undefined =
            advisor ? { strategist: advisor, enemyKey: cell.enemySlug } : undefined;

        const report = runPlaytestScenarioWith(scenario, { player, enemy, policyContext });

        if (opts.learn && opts.strategist) {
            for (const run of report.runs) updateFromRun(opts.strategist, cell.enemySlug, run);
        }

        results.push({ cell, report, snapshot: buildSnapshot(cell, player, enemy, report) });
    }

    return results;
}
