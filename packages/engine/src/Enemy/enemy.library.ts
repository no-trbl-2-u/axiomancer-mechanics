import { createEnemy } from './index';

export const Disatree_01 = createEnemy({
    id: 'ent-enemy-01',
    name: 'Disatree',
    description: 'A tree who disagrees with you',
    level: 1,
    baseStats: { body: 1, mind: 1, heart: 1 },
    mapLocation: { name: 'northern-forest' },
    enemyTier: 'normal',
    logic: 'random',
    tier1Effects: {
        body:  { attack: 'tier1_body_attack',  defend: 'tier1_body_defend' },
        mind:  { attack: 'tier1_mind_attack',  defend: 'tier1_mind_defend' },
        heart: { attack: 'tier1_heart_attack', defend: 'tier1_heart_defend' },
    },
});

export const EnemyLibrary = {
    northernForest: [Disatree_01],
};
