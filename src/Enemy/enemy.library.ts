import { Enemy } from './types';


const Disatree_01: Enemy = {
    name: 'Disatree',
    id: 'ent-enemy-01',
    level: 1,
    health: 10,
    mana: 10,
    enemyStats: {
        maxHealth: 10,
        maxMana: 10,
        physicalSkill: 1,
        physicalDefense: 1,
        mentalSkill: 1,
        mentalDefense: 1,
        emotionalSkill: 1,
        emotionalDefense: 1,
    },
    mapLocation: {
        name: 'northern-forest',
    },
    enemyTier: 'normal',
    description: 'A tree who disagrees with you',
}

export const EnemyLibrary = {
    northernForest: [
        Disatree_01
    ]
}