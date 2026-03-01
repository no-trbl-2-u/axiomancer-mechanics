import { Enemy } from './types';


export const Disatree_01: Enemy = {
    name: 'Disatree',
    id: 'ent-enemy-01',
    level: 1,
    health: 10,
    mana: 10,
    baseStats: {
        body: 1,
        mind: 1,
        heart: 1,
    },
    derivedStats: {
        maxHealth: 10,
        maxMana: 10,
        physicalAttack: 1,
        physicalSkill: 1,
        physicalDefense: 1,
        mentalAttack: 1,
        mentalSkill: 1,
        mentalDefense: 1,
        emotionalAttack: 1,
        emotionalSkill: 1,
        emotionalDefense: 1,
        luck: 0,
    },
    mapLocation: {
        name: 'northern-forest',
    },
    enemyTier: 'normal',
    description: 'A tree who disagrees with you',
    logic: 'random',
    currentActiveEffects: [],
    tier1Effects: {
        body:  { attack: 'tier1_body_attack',  defend: 'tier1_body_defend'  },
        mind:  { attack: 'tier1_mind_attack',  defend: 'tier1_mind_defend'  },
        heart: { attack: 'tier1_heart_attack', defend: 'tier1_heart_defend' },
    },
}

export const EnemyLibrary = {
  northernForest: [
    Disatree_01
  ]
}