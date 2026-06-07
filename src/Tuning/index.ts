/**
 * Tuning module barrel (internal tooling — intentionally NOT re-exported from
 * the package's public `src/index.ts`).
 */

export * from './types';
export {
    TUNABLE_REGISTRY, getTunable, listTunables, filterTunablesByFocus, clampCandidate,
} from './tunable.registry';
export {
    readTunableValue, applyTunableValue, restoreBackup,
} from './tunable.applier';
export type { ApplyResult, SourceBackup } from './tunable.applier';
export { parseFocus, levelToBand, contentMatchesFocus } from './focus.parser';
export {
    buildMatrix, pickEnemyForCell,
    DEFAULT_LEVELS, DEFAULT_PLAYSTYLES, DEFAULT_DIFFICULTIES, DEFAULT_BASE_RUNS,
} from './matrix.builder';
export { buildLoadoutCharacter } from './loadout.builder';
export { scaleEnemyForCell } from './enemy.scaler';
export {
    loadKnowledge, saveKnowledge, emptyKnowledge, cloneKnowledge, updateFromRun,
    recommendStance, recommendSkill, makeAdvisor, DEFAULT_KNOWLEDGE_PATH,
} from './strategist.knowledge';
export { runMatrix, MATRIX_MAX_ROUNDS } from './matrix.runner';
export type { RunMatrixOptions } from './matrix.runner';
export {
    scoreHealth, compareHealth, ENGAGEMENT_FLOOR, BAND_WEIGHT, ENGAGEMENT_WEIGHT,
} from './health.metrics';
export { cellEngagementShare, runEngagementShare } from './engagement.metrics';
export { bandFor, bandDeviation, DIFFICULTY_BANDS, NORMAL_BAND } from './difficulty.bands';
export { runExperiment } from './experiment.runner';
export type { ExperimentDeps } from './experiment.runner';
export { runVerify } from './verify.gate';
export type { VerifyResult } from './verify.gate';
export {
    requestRecommendations, heuristicRecommendations, validateCandidates,
} from './analyst.bridge';
export type { AnalystRequest, AnalystResponse, AnalystOptions } from './analyst.bridge';
export {
    loadLedger, saveLedger, emptyLedger, recordExperiments, cooldownDirections,
    DEFAULT_LEDGER_PATH, DEFAULT_COOLDOWN,
} from './ledger';
export {
    renderDataReport, renderDataReportJson, renderSuggestions,
} from './report.generator';
