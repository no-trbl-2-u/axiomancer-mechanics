/**
 * Endgame playtest fixture — Phase 104 Unit 1
 * 
 * Tests late-game balance with a maxed-out character against boss-tier
 * enemies. Anchors balance decisions for endgame encounters and boss
 * mercy mechanics.
 */

import type { PlaytestScenario } from '../types';

/**
 * Max-level character (level 20, 20/20/20 stats) against the Coastal Tyrant
 * boss. Tests endgame balance, boss encounter viability, and mercy route
 * accessibility.
 * 
 * This fixture specifically targets the Coastal Tyrant because:
 * - It's the canonical boss enemy from fishing village progression
 * - Phase 101 mercy tuning needs endgame balance data
 * - Current evidence shows 80% timeout rate needs addressing
 * 
 * Policy coverage includes friendship (to test mercy routes), aggressive
 * (to test boss kill viability), and mixed strategies.
 */
export const endgameFixture: PlaytestScenario = {
    id: 'endgame-coastal-tyrant',
    description: 'Max-level character vs Coastal Tyrant (primary endgame probe)',
    preset: 'max-out',  // Will need to create this preset or handle programmatically
    enemy: 'coastal-tyrant',
    runs: 50,
    maxRounds: 50,  // Boss fights can be longer
    seed: 'endgame-tyrant-2026',
    policies: ['strategist', 'mercy', 'mercy-exploit', 'friendship', 'aggressive', 'defensive'],
};

/**
 * Alternative endgame fixture against TheDisagreement boss for variety.
 * Tests boss-tier combat against a different enemy type.
 */
export const endgameDisagreementFixture: PlaytestScenario = {
    id: 'endgame-disagreement',
    description: 'Max-level character vs The Disagreement (secondary endgame probe)',
    preset: 'max-out',
    enemy: 'the-disagreement', 
    runs: 30,
    maxRounds: 50,
    seed: 'endgame-disagreement-2026',
    policies: ['strategist', 'aggressive', 'defensive'],
};

/**
 * Creates a maxed-out character scenario for endgame testing.
 * Since there's no 'max-out' preset, this provides the character config
 * that the playtest runner can use to build the character.
 */
export const maxOutCharacterConfig = {
    level: 20,
    baseStats: { heart: 20, body: 20, mind: 20 },
    // Note: Full item/skill setup should be handled in the playtest runner
    // by leveraging the dev-tools max-out functionality
};