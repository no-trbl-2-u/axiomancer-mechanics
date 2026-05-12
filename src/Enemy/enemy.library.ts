import { createEnemy } from './index';

export const Disatree_01 = createEnemy({
    id: 'ent-enemy-01',
    name: 'Disatree',
    description: 'A tree who disagrees with you',
    level: 1,
    baseStats: { body: 1, mind: 1, heart: 1 },
    mapName: 'northern-forest',
    difficulty: 'normal',
    logic: 'random',
    tier1Overrides: {
        body:  { attack: 'tier1_body_attack',  defend: 'tier1_body_defend' },
        mind:  { attack: 'tier1_mind_attack',  defend: 'tier1_mind_defend' },
        heart: { attack: 'tier1_heart_attack', defend: 'tier1_heart_defend' },
    },
});

/**
 * Punching-bag enemy used by Spec 04b's e2e suite and the
 * `auto:combat` / manual CLI testers that need a long-lived combat
 * encounter. Stats are floor (1/1/1) so it does negligible damage, but
 * `level: 10` lifts `maxHealth = level × avg(body, heart) × 10` to 100,
 * giving enough rounds to chain Tier 1 → Tier 3 skill use.
 *
 * Open Question 5 (Spec 04b): expanding combat testing. The Sandbag is the
 * canonical "skill-debug" opponent. CLI clients can opt into it via
 * `COMBAT_ENEMY=sandbag` and `npm run auto:combat -- <runs> [reaction] [action] [enemy]`.
 */
export const Sandbag_01 = createEnemy({
    id: 'sandbag-01',
    name: 'Sandbag',
    description:
        'A practice dummy of stitched arguments, hung from a rope. It mumbles, ' +
        'rarely strikes back, and refuses to die quickly.',
    level: 10,
    baseStats: { body: 1, mind: 1, heart: 1 },
    mapName: 'northern-forest',
    difficulty: 'simple',
    logic: 'random',
    tier1Overrides: {
        body:  { attack: 'tier1_body_attack',  defend: 'tier1_body_defend' },
        mind:  { attack: 'tier1_mind_attack',  defend: 'tier1_mind_defend' },
        heart: { attack: 'tier1_heart_attack', defend: 'tier1_heart_defend' },
    },
});

export const EnemyLibrary = {
    northernForest: [Disatree_01, Sandbag_01],
};

/**
 * Map of CLI-friendly slugs to enemy fixtures. Used by `combat.cli.ts` and
 * `auto:combat` to let testers pick the opponent at the command line.
 */
export const ENEMY_REGISTRY = {
    disatree: Disatree_01,
    sandbag:  Sandbag_01,
} as const;

export type EnemySlug = keyof typeof ENEMY_REGISTRY;
