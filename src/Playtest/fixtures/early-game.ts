/**
 * Early-game playtest fixture — Phase 104 Unit 1
 *
 * Tests start-of-game balance with a level-1 character against the
 * weakest fishing-village enemies. Anchors balance decisions for
 * early progression gates.
 */

import type { PlaytestScenario } from '../types';

/**
 * Level-1 character with apprentice preset (5/5/5 base stats) against
 * weakest enemies from the fishing village area.
 * 
 * Target enemies:
 * - tidepool-crab: Simple tier, heart affinity (3 HP, weak attacks)
 * - sea-mist-wisp: Simple tier, mind affinity (5 HP, minimal damage)
 * 
 * Policy coverage includes defensive play (to test healing needs),
 * aggressive play (to test time-to-kill), and friendship (to test
 * early-game mercy mechanics).
 */
export const earlyGameFixture: PlaytestScenario = {
    id: 'early-game-reference',
    description: 'Level-1 apprentice preset vs weakest fishing village enemies',
    preset: 'apprentice',
    enemy: 'tidepool-crab',  // Weakest simple-tier enemy
    runs: 50,
    maxRounds: 20,  // Early fights should resolve quickly
    seed: 'early-game-probe-2026',
    policies: ['aggressive', 'defensive', 'strategist', 'friendship', 'mercy'],
};

/**
 * Alternative early-game fixture against sea-mist-wisp for mind-affinity
 * enemy testing. Can be used for comparison or rotated testing.
 */
export const earlyGameWispFixture: PlaytestScenario = {
    id: 'early-game-wisp',
    description: 'Level-1 apprentice preset vs sea-mist-wisp (mind-affinity simple)',
    preset: 'apprentice', 
    enemy: 'sea-mist-wisp',
    runs: 50,
    maxRounds: 20,
    seed: 'early-game-wisp-2026',
    policies: ['aggressive', 'defensive', 'strategist', 'friendship', 'mercy'],
};