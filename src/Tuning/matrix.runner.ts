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
import type { CellResult, MatrixPlan, StrategistKnowledge } from './types';

/** Round cap per trial — generous enough for late-game attrition to resolve. */
export const MATRIX_MAX_ROUNDS = 80;

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

        results.push({ cell, report });
    }

    return results;
}
