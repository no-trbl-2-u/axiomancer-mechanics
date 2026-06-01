/**
 * Playtest module — automated combat simulation and balance testing
 */

export { runPlaytestScenario, aggregateMetrics } from './playtest.runner';
export { selectPolicyAction } from './policies';
export { renderPlaytestMarkdown } from './report';
export * from './types';
// Phase 104: Reference fixtures for balance anchoring
export * from './fixtures';